/*
 * snowcat-hook.dll —— 观测版
 *
 * 目的：搞清楚 QQ 9.9.37 到底是谁、在什么时机读取 resources\app\package.json，
 * 以及读取走的是 kernel32!CreateFileW 还是 ntdll!NtCreateFile（NT 层）。
 *
 * 只记录，不改内容。结果写到 D:\SnowCat.Portable\hook-trace.txt
 */
#include <windows.h>
#include <winternl.h>
#include <stdio.h>
#include <wchar.h>
#include "MinHook.h"

#define TRACE_PATH L"D:\\SnowCat.Portable\\hook-trace.txt"

static HANDLE (WINAPI *origCreateFileW)(LPCWSTR, DWORD, DWORD, LPSECURITY_ATTRIBUTES, DWORD, DWORD, HANDLE) = NULL;
static NTSTATUS (NTAPI *origNtOpenFile)(PHANDLE, ACCESS_MASK, POBJECT_ATTRIBUTES, PIO_STATUS_BLOCK, ULONG, ULONG) = NULL;
static NTSTATUS (NTAPI *origNtCreateFile)(PHANDLE, ACCESS_MASK, POBJECT_ATTRIBUTES, PIO_STATUS_BLOCK,
                                          PLARGE_INTEGER, ULONG, ULONG, ULONG, ULONG, PVOID, ULONG) = NULL;

static CRITICAL_SECTION g_lock;
static volatile LONG g_subsReady = 0;

static void trace(const wchar_t* api, const wchar_t* path) {
    EnterCriticalSection(&g_lock);
    HANDLE h = CreateFileW(TRACE_PATH, FILE_APPEND_DATA, FILE_SHARE_READ | FILE_SHARE_WRITE,
                           NULL, OPEN_ALWAYS, FILE_ATTRIBUTE_NORMAL, NULL);
    if (h != INVALID_HANDLE_VALUE) {
        char buf[2048];
        int n = WideCharToMultiByte(CP_UTF8, 0, path, -1, buf, sizeof(buf) - 1, NULL, NULL);
        if (n <= 0) { buf[0] = 0; }
        char line[2304];
        int len = snprintf(line, sizeof(line), "%s\t%s\n", (const char*)api, buf);
        DWORD w = 0;
        SetFilePointer(h, 0, NULL, FILE_END);
        WriteFile(h, line, (DWORD)len, &w, NULL);
        CloseHandle(h);
    }
    LeaveCriticalSection(&g_lock);
}

static int interesting(const wchar_t* p) {
    if (!p) return 0;
    if (wcsstr(p, L"package.json")) return 1;
    if (wcsstr(p, L"application.asar")) return 1;
    if (wcsstr(p, L"loadNapCat")) return 1;
    if (wcsstr(p, L"app_launcher")) return 1;
    if (wcsstr(p, L"qqnt")) return 1;
    return 0;
}

static wchar_t g_fakePkg[MAX_PATH];
static wchar_t g_patchedAsar[MAX_PATH];
static wchar_t g_qqDir[MAX_PATH];

static void buildSubstitutes(void) {
    // QQ 目录 = QQ.exe 所在目录（反射注入器是父进程拉起的，模块表里主 exe 可查）
    wchar_t exePath[MAX_PATH];
    GetModuleFileNameW(NULL, exePath, MAX_PATH);
    wchar_t* slash = wcsrchr(exePath, L'\\');
    if (slash) *slash = 0;
    wcscpy(g_qqDir, exePath);

    // 假 package.json：优先 snowcat-fake-pkg.json（真字段+main 覆写合并版）
    wchar_t fakePath[MAX_PATH];
    swprintf(fakePath, MAX_PATH, L"%s\\snowcat-fake-pkg.json", g_qqDir);
    WIN32_FILE_ATTRIBUTE_DATA fa2;
    if (GetFileAttributesExW(fakePath, GetFileExInfoStandard, &fa2)) {
        wcscpy(g_fakePkg, fakePath);
    } else {
        DWORD n = GetEnvironmentVariableW(L"NAPCAT_PATCH_PACKAGE", g_fakePkg, MAX_PATH);
        if (n == 0) {
            swprintf(g_fakePkg, MAX_PATH, L"%s\\qqnt.json", g_qqDir);
        }
    }
    // patched asar：snowcat-patched.asar（若存在）
    swprintf(g_patchedAsar, MAX_PATH, L"%s\\snowcat-patched.asar", g_qqDir);
    WIN32_FILE_ATTRIBUTE_DATA fa;
    if (!GetFileAttributesExW(g_patchedAsar, GetFileExInfoStandard, &fa)) {
        g_patchedAsar[0] = 0; // 无副本则不替换 asar
    }
}

static int isPkg(const wchar_t* p) {
    return p && wcsstr(p, L"resources") && wcsstr(p, L"package.json");
}
static int isAsar(const wchar_t* p) {
    return p && wcsstr(p, L"application.asar");
}

static HANDLE WINAPI detourCreateFileW(LPCWSTR lpFileName, DWORD dwDesiredAccess, DWORD dwShareMode,
                                       LPSECURITY_ATTRIBUTES lpSecurityAttributes, DWORD dwCreationDisposition,
                                       DWORD dwFlagsAndAttributes, HANDLE hTemplateFile) {
    if (interesting(lpFileName)) trace(L"CreateFileW", lpFileName);
    if (g_subsReady) {
        if (isPkg(lpFileName)) return origCreateFileW(g_fakePkg, dwDesiredAccess, dwShareMode, lpSecurityAttributes, dwCreationDisposition, dwFlagsAndAttributes, hTemplateFile);
        if (isAsar(lpFileName) && g_patchedAsar[0]) return origCreateFileW(g_patchedAsar, dwDesiredAccess, dwShareMode, lpSecurityAttributes, dwCreationDisposition, dwFlagsAndAttributes, hTemplateFile);
    }
    return origCreateFileW(lpFileName, dwDesiredAccess, dwShareMode, lpSecurityAttributes,
                           dwCreationDisposition, dwFlagsAndAttributes, hTemplateFile);
}

static NTSTATUS NTAPI detourNtCreateFile(PHANDLE FileHandle, ACCESS_MASK DesiredAccess,
                                         POBJECT_ATTRIBUTES ObjectAttributes, PIO_STATUS_BLOCK IoStatusBlock,
                                         PLARGE_INTEGER AllocationSize, ULONG FileAttributes, ULONG ShareAccess,
                                         ULONG CreateDisposition, ULONG CreateOptions, PVOID EaBuffer, ULONG EaLength) {
    if (g_subsReady && ObjectAttributes && ObjectAttributes->ObjectName && ObjectAttributes->ObjectName->Buffer) {
        wchar_t* bp = ObjectAttributes->ObjectName->Buffer;
        /* NT 路径 \??\C:\... —— 匹配用宽松 wcsstr 即可 */
        if (isPkg(bp)) {
            static UNICODE_STRING us;
            static wchar_t ntpath[MAX_PATH + 8];
            swprintf(ntpath, MAX_PATH + 8, L"\\\\??\\\\%s", g_fakePkg);
            us.Buffer = ntpath;
            us.Length = (USHORT)(wcslen(ntpath) * 2);
            us.MaximumLength = us.Length + 2;
            ObjectAttributes->ObjectName = &us;
            trace(L"NtCreateFile→FAKE-PKG", bp);
            return origNtCreateFile(FileHandle, DesiredAccess, ObjectAttributes, IoStatusBlock, AllocationSize, FileAttributes, ShareAccess, CreateDisposition, CreateOptions, EaBuffer, EaLength);
        }
        if (isAsar(bp) && g_patchedAsar[0]) {
            static UNICODE_STRING us2;
            static wchar_t ntpath2[MAX_PATH + 8];
            swprintf(ntpath2, MAX_PATH + 8, L"\\\\??\\\\%s", g_patchedAsar);
            us2.Buffer = ntpath2;
            us2.Length = (USHORT)(wcslen(ntpath2) * 2);
            us2.MaximumLength = us2.Length + 2;
            ObjectAttributes->ObjectName = &us2;
            trace(L"NtCreateFile→PATCHED-ASAR", bp);
            return origNtCreateFile(FileHandle, DesiredAccess, ObjectAttributes, IoStatusBlock, AllocationSize, FileAttributes, ShareAccess, CreateDisposition, CreateOptions, EaBuffer, EaLength);
        }
    }
    if (ObjectAttributes && ObjectAttributes->ObjectName && ObjectAttributes->ObjectName->Buffer) {
        if (interesting(ObjectAttributes->ObjectName->Buffer)) {
            trace(L"NtCreateFile", ObjectAttributes->ObjectName->Buffer);
        }
    }
    return origNtCreateFile(FileHandle, DesiredAccess, ObjectAttributes, IoStatusBlock, AllocationSize,
                            FileAttributes, ShareAccess, CreateDisposition, CreateOptions, EaBuffer, EaLength);
}

static NTSTATUS NTAPI detourNtOpenFile(PHANDLE FileHandle, ACCESS_MASK DesiredAccess,
                                        POBJECT_ATTRIBUTES ObjectAttributes, PIO_STATUS_BLOCK IoStatusBlock,
                                        ULONG ShareAccess, ULONG OpenOptions) {
    if (ObjectAttributes && ObjectAttributes->ObjectName && ObjectAttributes->ObjectName->Buffer) {
        trace(L"NtOpenFile", ObjectAttributes->ObjectName->Buffer);
    }
    return origNtOpenFile(FileHandle, DesiredAccess, ObjectAttributes, IoStatusBlock, ShareAccess, OpenOptions);
}




static DWORD WINAPI initThread(LPVOID param) {
    (void)param;
    InitializeCriticalSection(&g_lock);
    buildSubstitutes();
    g_subsReady = 1;
    trace(L"===", L"injected");

    if (MH_Initialize() != MH_OK) { trace(L"===ERR", L"MH_Initialize failed"); return 1; }

    HMODULE k32 = GetModuleHandleW(L"kernel32.dll");
    HMODULE nt = GetModuleHandleW(L"ntdll.dll");
    void* pCreateFileW = (void*)GetProcAddress(k32, "CreateFileW");
    void* pNtCreateFile = (void*)GetProcAddress(nt, "NtCreateFile");

    if (pCreateFileW && MH_CreateHook(pCreateFileW, &detourCreateFileW, (LPVOID*)&origCreateFileW) == MH_OK)
        trace(L"===", L"hook CreateFileW ok");
    if (pNtCreateFile && MH_CreateHook(pNtCreateFile, &detourNtCreateFile, (LPVOID*)&origNtCreateFile) == MH_OK)
        trace(L"===", L"hook NtCreateFile ok");

    void* pNtOpenFile = (void*)GetProcAddress(nt, "NtOpenFile");
    if (pNtOpenFile && MH_CreateHook(pNtOpenFile, &detourNtOpenFile, (LPVOID*)&origNtOpenFile) == MH_OK)
        trace(L"===", L"hook NtOpenFile ok");

    MH_EnableHook(MH_ALL_HOOKS);
    trace(L"===", L"hooks enabled");
    return 0;
}

BOOL WINAPI DllMain(HMODULE hModule, DWORD reason, LPVOID reserved) {
    (void)reserved;
    if (reason == DLL_PROCESS_ATTACH) {
        DisableThreadLibraryCalls(hModule);
        HANDLE th = CreateThread(NULL, 0, initThread, NULL, 0, NULL);
        if (th) CloseHandle(th);
    }
    return TRUE;
}

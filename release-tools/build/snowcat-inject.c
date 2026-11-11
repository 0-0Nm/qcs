/*
 * snowcat-inject.exe —— 挂起态注入
 *
 * 用法: snowcat-inject.exe <目标exe> <要注入的dll> [附加命令行]
 * 原理: CreateProcessW(CREATE_SUSPENDED) -> 远程 LoadLibraryW -> ResumeThread
 *       与 NapCatWinBootMain 相同的注入时机（主线程还没跑任何一条指令）
 */
#include <windows.h>
#include <tlhelp32.h>
#include <stdio.h>
#include <wchar.h>

int wmain(int argc, wchar_t** argv) {
    if (argc < 3) {
        wprintf(L"usage: %s <target.exe> <hook.dll> [extra args]\n", argv[0]);
        return 2;
    }

    const wchar_t* exeArg = argv[1];
    const wchar_t* dllArg = argv[2];

    /* 统一成正斜杠/反斜杠都接受：CreateProcessW 对 / 敏感 */
    static wchar_t exeBuf[32768];
    static wchar_t dllBuf[32768];
    wcsncpy(exeBuf, exeArg, 32767); exeBuf[32767] = 0;
    wcsncpy(dllBuf, dllArg, 32767); dllBuf[32767] = 0;
    for (wchar_t* p = exeBuf; *p; ++p) if (*p == L'/') *p = L'\\';
    for (wchar_t* p = dllBuf; *p; ++p) if (*p == L'/') *p = L'\\';
    const wchar_t* exe = exeBuf;
    const wchar_t* dll = dllBuf;

    wchar_t cmd[32768];
    if (argc > 3) {
        _snwprintf(cmd, 32768, L"\"%s\" %s", exe, argv[3]);
    } else {
        _snwprintf(cmd, 32768, L"\"%s\"", exe);
    }

    wchar_t exeDir[MAX_PATH];
    wcsncpy(exeDir, exe, MAX_PATH - 1);
    exeDir[MAX_PATH - 1] = 0;
    wchar_t* slash = wcsrchr(exeDir, L'\\');
    if (slash) *slash = 0; else exeDir[0] = 0;

    wprintf(L"[inject] exe=%s\n[inject] dll=%s\n[inject] cmd=%s\n", exe, dll, cmd);

    STARTUPINFOW si;
    PROCESS_INFORMATION pi;
    ZeroMemory(&si, sizeof(si));
    si.cb = sizeof(si);
    ZeroMemory(&pi, sizeof(pi));

    if (!CreateProcessW(exe, cmd, NULL, NULL, FALSE, CREATE_SUSPENDED,
                        NULL, exeDir[0] ? exeDir : NULL, &si, &pi)) {
        wprintf(L"[inject] CreateProcess failed: %lu\n", GetLastError());
        return 1;
    }
    wprintf(L"[inject] suspended pid=%lu\n", pi.dwProcessId);

    SIZE_T len = (wcslen(dll) + 1) * sizeof(wchar_t);
    LPVOID remote = VirtualAllocEx(pi.hProcess, NULL, len, MEM_COMMIT | MEM_RESERVE, PAGE_READWRITE);
    if (!remote) {
        wprintf(L"[inject] VirtualAllocEx failed: %lu\n", GetLastError());
        TerminateProcess(pi.hProcess, 1);
        return 1;
    }
    if (!WriteProcessMemory(pi.hProcess, remote, dll, len, NULL)) {
        wprintf(L"[inject] WriteProcessMemory failed: %lu\n", GetLastError());
        TerminateProcess(pi.hProcess, 1);
        return 1;
    }

    HMODULE k32 = GetModuleHandleW(L"kernel32.dll");
    LPTHREAD_START_ROUTINE pLoadLibraryW =
        (LPTHREAD_START_ROUTINE)GetProcAddress(k32, "LoadLibraryW");

    wprintf(L"[inject] local kernel32=%p LoadLibraryW=%p\n", (void*)k32, (void*)pLoadLibraryW);

    /* 对比目标进程里 kernel32 的基址：若不同，说明不能用本地地址做远程线程入口 */
    HANDLE snap = CreateToolhelp32Snapshot(TH32CS_SNAPMODULE | TH32CS_SNAPMODULE32, pi.dwProcessId);
    if (snap != INVALID_HANDLE_VALUE) {
        MODULEENTRY32W me;
        ZeroMemory(&me, sizeof(me));
        me.dwSize = sizeof(me);
        if (Module32FirstW(snap, &me)) {
            do {
                if (_wcsicmp(me.szModule, L"kernel32.dll") == 0) {
                    wprintf(L"[inject] remote kernel32=%p (delta=%lld)\n",
                            (void*)me.modBaseAddr, (long long)((char*)me.modBaseAddr - (char*)k32));
                    break;
                }
            } while (Module32NextW(snap, &me));
        }
        CloseHandle(snap);
    }

    HANDLE th = CreateRemoteThread(pi.hProcess, NULL, 0, pLoadLibraryW, remote, 0, NULL);
    if (!th) {
        wprintf(L"[inject] CreateRemoteThread failed: %lu\n", GetLastError());
        TerminateProcess(pi.hProcess, 1);
        return 1;
    }
    WaitForSingleObject(th, 15000);
    DWORD exitCode = 0;
    GetExitCodeThread(th, &exitCode);
    wprintf(L"[inject] LoadLibraryW remote result=0x%lX (0=fail)\n", exitCode);
    CloseHandle(th);

    ResumeThread(pi.hThread);
    wprintf(L"[inject] resumed\n");

    CloseHandle(pi.hThread);
    CloseHandle(pi.hProcess);
    return 0;
}

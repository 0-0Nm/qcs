/*
 * winmm 侧加载 + V8 编译期源码改写
 *
 * 背景：QQ 9.9.37 的 asar 内 JS 全部逐文件加密，静态解不开；
 *      但解密后的内容最终要交给 V8 编译 —— 在 ScriptCompiler::Compile*
 *      入口拿到 v8::ScriptCompiler::Source*，其首字段就是 Local<String>。
 *
 * 能力：
 *   - 抓取：把每个被编译的脚本以明文落到 SC_V8_DIR
 *   - 改写：命中 SC_V8_MATCH 的脚本文本，前面插入 SC_V8_PATCH 的内容
 *           （用 String::NewFromUtf8 造新串，替换 Source::source_string_）
 *
 * ABI 备注：实测 MaybeLocal<T> 走 sret（rcx 为返回槽），故 Source* 在第三参；
 *          NewFromUtf8 同样按 sret 调用，可用 SC_V8_SRET=0 切换回 RAX 变体。
 */
#include <windows.h>
#include <stdio.h>
#include <stdarg.h>
#include <string.h>
#include <stdint.h>
#include "v8syms.h"
#include "MinHook.h"

extern void winmm_stubs_init(HMODULE real);

static HMODULE g_self = NULL;

#define MAX_PATCH (1 << 20)

/* ───────────── 配置 ───────────── */
static CRITICAL_SECTION g_lock;
static wchar_t g_dir[MAX_PATH] = L"D:\\SnowCat.Portable\\v8dump";
static volatile LONG g_seq = 0;
static volatile LONG g_calls = 0;
static int g_on = 0;          /* 抓取开关（默认关，SC_V8_DUMP=1 才开） */
static int g_probe = 0;
static int g_off = 0;         /* Source 内 Local<String> 偏移（实测 0） */
static int g_arg = 3;         /* 哪个入参是 Source*（实测第三参） */
static int g_sret = 1;        /* MaybeLocal 是否走 sret */

static char* g_patch = NULL;  /* 要插入的 JS */
static int   g_patchLen = 0;
static char  g_match[128] = "internal_index";
static volatile LONG g_patched = 0;

/* ───────────── 日志 ───────────── */
static void logLine(const char* fmt, ...) {
    char buf[4096];
    va_list ap; va_start(ap, fmt);
    int n = _vsnprintf(buf, sizeof(buf) - 2, fmt, ap);
    va_end(ap);
    if (n < 0) return;
    buf[n++] = '\n'; buf[n] = 0;
    EnterCriticalSection(&g_lock);
    wchar_t path[MAX_PATH];
    _snwprintf(path, MAX_PATH, L"%s\\_index.txt", g_dir);
    HANDLE h = CreateFileW(path, FILE_APPEND_DATA, FILE_SHARE_READ | FILE_SHARE_WRITE,
                           NULL, OPEN_ALWAYS, FILE_ATTRIBUTE_NORMAL, NULL);
    if (h != INVALID_HANDLE_VALUE) {
        DWORD w = 0;
        SetFilePointer(h, 0, NULL, FILE_END);
        WriteFile(h, buf, (DWORD)n, &w, NULL);
        CloseHandle(h);
    }
    LeaveCriticalSection(&g_lock);
}

/* ───────────── V8 符号 ───────────── */
typedef void*  (*pfn_Isolate_GetCurrent)(void);
typedef void   (*pfn_Utf8Value_ctor)(void* self, void* iso, void* localValue);
typedef const char* (*pfn_Utf8Value_ptr)(void* self);
typedef size_t (*pfn_Utf8Value_len)(void* self);
typedef void   (*pfn_Utf8Value_dtor)(void* self);
typedef unsigned char (*pfn_Value_IsString)(void* self);
typedef void   (*pfn_NewFromUtf8_sret)(void* sret, void* iso, const char* data, int type, int len);
typedef void*  (*pfn_NewFromUtf8_rax)(void* iso, const char* data, int type, int len);

static pfn_Isolate_GetCurrent v8_GetCurrent;
static pfn_Utf8Value_ctor     v8_Utf8Ctor;
static pfn_Utf8Value_ptr      v8_Utf8Ptr;
static pfn_Utf8Value_len      v8_Utf8Len;
static pfn_Utf8Value_dtor     v8_Utf8Dtor;
static pfn_Value_IsString     v8_IsString;
static pfn_NewFromUtf8_sret   v8_NewFromUtf8;

static int readable(const void* p, size_t n) {
    MEMORY_BASIC_INFORMATION mbi;
    if (!p) return 0;
    if (VirtualQuery(p, &mbi, sizeof(mbi)) != sizeof(mbi)) return 0;
    if (mbi.State != MEM_COMMIT) return 0;
    if (mbi.Protect & (PAGE_NOACCESS | PAGE_GUARD)) return 0;
    return ((const BYTE*)p + n) <= ((const BYTE*)mbi.BaseAddress + mbi.RegionSize);
}

static void writeDump(const char* txt, size_t len, const char* tag) {
    LONG idx = InterlockedIncrement(&g_seq);
    wchar_t path[MAX_PATH];
    _snwprintf(path, MAX_PATH, L"%s\\%lu_%05ld.js", g_dir, GetCurrentProcessId(), idx);
    HANDLE h = CreateFileW(path, GENERIC_WRITE, 0, NULL, CREATE_ALWAYS, FILE_ATTRIBUTE_NORMAL, NULL);
    if (h != INVALID_HANDLE_VALUE) {
        DWORD w = 0;
        WriteFile(h, txt, (DWORD)len, &w, NULL);
        CloseHandle(h);
    }
    char head[100];
    size_t i = 0;
    for (; i < sizeof(head) - 1 && i < len; i++) {
        char c = txt[i];
        head[i] = (c >= 32 && c < 127) ? c : '.';
    }
    head[i] = 0;
    logLine("%lu\t%s\tlen=%llu\t%s", GetCurrentProcessId(), tag, (unsigned long long)len, head);
}

/* 造一个 v8::String，返回 Local<String> 的裸指针 */
static void* makeString(void* iso, const char* data, int len) {
    if (!v8_NewFromUtf8) return NULL;
    unsigned char slot[64];
    memset(slot, 0, sizeof(slot));
    if (g_sret) {
        v8_NewFromUtf8(slot, iso, data, 0, len);
        return *(void**)slot;
    } else {
        pfn_NewFromUtf8_rax fn = (pfn_NewFromUtf8_rax)v8_NewFromUtf8;
        return fn(iso, data, 0, len);
    }
}

/* 命中则把源码替换成 patch + 原文 */
static int tryPatch(void* src, const char* txt, size_t len) {
    if (!g_patch || g_patchLen <= 0 || !txt || len == 0) return 0;
    if (len > (4u << 20)) return 0;
    if (!strstr(txt, g_match)) return 0;

    void* iso = v8_GetCurrent ? v8_GetCurrent() : NULL;
    if (!iso) return 0;

    int total = g_patchLen + 1 + (int)len;
    char* merged = (char*)malloc((size_t)total + 1);
    if (!merged) return 0;
    memcpy(merged, g_patch, (size_t)g_patchLen);
    merged[g_patchLen] = '\n';
    memcpy(merged + g_patchLen + 1, txt, len);
    merged[total] = 0;

    void* s = makeString(iso, merged, total);
    free(merged);
    if (!s) { logLine("%lu\tPATCHFAIL\tmakeString null", GetCurrentProcessId()); return 0; }

    *(void**)((char*)src + g_off) = s;
    InterlockedIncrement(&g_patched);
    logLine("%lu\tPATCHED\thit=%s origLen=%llu newLen=%d", GetCurrentProcessId(), g_match,
            (unsigned long long)len, total);
    return 1;
}

static unsigned char* holderPtr(void) {
    static __thread unsigned char holder[128];
    return holder;
}

static void handle(void* a1, void* a2, void* a3, void* a4, void* a5, const char* tag) {
    if (!g_on && !g_patch) return;
    LONG call = InterlockedIncrement(&g_calls);

    if (g_probe) {
        if (call > 12) return;
        logLine("%lu\tPROBE\t%s\tcall=%ld a1=%p a2=%p a3=%p a4=%p a5=%p",
                GetCurrentProcessId(), tag, call, a1, a2, a3, a4, a5);
        return;
    }

    void* bases[5] = { a1, a2, a3, a4, a5 };
    if (g_arg < 1 || g_arg > 5) return;
    void* src = bases[g_arg - 1];
    if (!src) return;

    const char* txt = NULL; size_t len = 0;
    unsigned char* h = holderPtr();
    memset(h, 0, 128);

    void* iso = v8_GetCurrent ? v8_GetCurrent() : NULL;
    if (iso) {
        void* cand = NULL;
        if (readable(src, (size_t)g_off + 8)) cand = *(void**)((char*)src + g_off);
        if (cand && !((uintptr_t)cand & 7) && readable(cand, 16) && v8_IsString && v8_IsString(cand)) {
            v8_Utf8Ctor(h, iso, cand);
            const char* t = v8_Utf8Ptr(h);
            size_t l = v8_Utf8Len(h);
            if (t && l > 0 && l < (8u << 20)) { txt = t; len = l; }
        }
    }

    if (txt) {
        if (g_on) writeDump(txt, len, tag);
        tryPatch(src, txt, len);
    }
    if (iso && v8_Utf8Len) v8_Utf8Dtor(h);
}

/* ───────────── Detour（纯 void* 透传） ───────────── */
typedef uint64_t (*fn5)(void*, void*, void*, void*, void*);
typedef uint64_t (*fn8)(void*, void*, void*, void*, void*, void*, void*, void*);

static fn5 orig_Compile;
static fn5 orig_CompileUnbound;
static fn5 orig_CompileModule;
static fn8 orig_CompileFunction;

static uint64_t det_Compile(void* a1, void* a2, void* a3, void* a4, void* a5) {
    handle(a1, a2, a3, a4, a5, "Compile");
    return orig_Compile(a1, a2, a3, a4, a5);
}
static uint64_t det_CompileUnbound(void* a1, void* a2, void* a3, void* a4, void* a5) {
    handle(a1, a2, a3, a4, a5, "Unbound");
    return orig_CompileUnbound(a1, a2, a3, a4, a5);
}
static uint64_t det_CompileModule(void* a1, void* a2, void* a3, void* a4, void* a5) {
    handle(a1, a2, a3, a4, a5, "Module");
    return orig_CompileModule(a1, a2, a3, a4, a5);
}
static uint64_t det_CompileFunction(void* a1, void* a2, void* a3, void* a4,
                                    void* a5, void* a6, void* a7, void* a8) {
    handle(a1, a2, a3, a4, a5, "Function");
    return orig_CompileFunction(a1, a2, a3, a4, a5, a6, a7, a8);
}

/* ───────────── 初始化 ───────────── */
static int loadPatchFile(const wchar_t* path) {
    HANDLE h = CreateFileW(path, GENERIC_READ, FILE_SHARE_READ, NULL, OPEN_EXISTING,
                           FILE_ATTRIBUTE_NORMAL, NULL);
    if (h == INVALID_HANDLE_VALUE) return 0;
    DWORD sz = GetFileSize(h, NULL);
    if (sz == 0 || sz > MAX_PATCH) { CloseHandle(h); return 0; }
    g_patch = (char*)malloc(sz + 1);
    if (!g_patch) { CloseHandle(h); return 0; }
    DWORD rd = 0;
    ReadFile(h, g_patch, sz, &rd, NULL);
    CloseHandle(h);
    g_patch[rd] = 0;
    g_patchLen = (int)rd;
    return 1;
}

/* ── 进程内 dlopen 自检（排查 wrapper.node 加载失败） ── */
static DWORD WINAPI probeThread(LPVOID param) {
    wchar_t path[MAX_PATH];
    DWORD delay = 8000;
    if (!GetEnvironmentVariableW(L"SC_TEST_LOAD", path, MAX_PATH)) return 0;
    {
        wchar_t d[32];
        if (GetEnvironmentVariableW(L"SC_TEST_DELAY", d, 32) > 0) delay = (DWORD)wcstoul(d, NULL, 10);
    }
    Sleep(delay);

    wchar_t appDir[MAX_PATH];
    wcscpy(appDir, path);
    wchar_t* s1 = wcsrchr(appDir, L'\\');
    if (s1) *s1 = 0;

    /* 时间轴测试：在不同时刻尝试加载，看是否随时间从成功变成 193 */
    if (GetEnvironmentVariableW(L"SC_TEST_SERIES", path, MAX_PATH) > 0) {
        const DWORD marks[] = { 1200, 2500, 4000, 6000, 9000, 13000, 18000 };
        DWORD prev = 0;
        for (int i = 0; i < 7; i++) {
            Sleep(marks[i] - prev); prev = marks[i];
            HMODULE m = LoadLibraryExW(path, NULL, LOAD_WITH_ALTERED_SEARCH_PATH);
            logLine("%lu\tSERIES\tt=%lu ok=%d err=%lu", GetCurrentProcessId(), marks[i], m != NULL, GetLastError());
            if (m) FreeLibrary(m);
        }
        return 0;
    }

    HMODULE pre = GetModuleHandleW(L"wrapper.node");
    logLine("%lu\tLOADTEST\talready=%p", GetCurrentProcessId(), (void*)pre);

    SetDllDirectoryW(appDir);
    HMODULE h = LoadLibraryExW(path, NULL, LOAD_WITH_ALTERED_SEARCH_PATH);
    logLine("%lu\tLOADTEST\tpath=%ls ok=%d err=%lu", GetCurrentProcessId(), path, h != NULL, GetLastError());

    if (!h) {
        HMODULE h2 = LoadLibraryW(path);
        logLine("%lu\tLOADTEST2\tplain ok=%d err=%lu", GetCurrentProcessId(), h2 != NULL, GetLastError());
    }

    /* 依赖扫描：把 app 目录里的 dll/node 逐个加载，暴露 193 的真凶 */
    if (GetEnvironmentVariableW(L"SC_TEST_DEPS", appDir, MAX_PATH) > 0) {
        wchar_t pat[MAX_PATH];
        _snwprintf(pat, MAX_PATH, L"%s\\*.d*", appDir);
        WIN32_FIND_DATAW fd;
        HANDLE ff = FindFirstFileW(pat, &fd);
        int tried = 0, failed = 0;
        if (ff != INVALID_HANDLE_VALUE) {
            do {
                const wchar_t* nm = fd.cFileName;
                size_t L = wcslen(nm);
                if (L < 5) continue;
                if (_wcsicmp(nm, L"wrapper.node") == 0 || _wcsicmp(nm, L"major.node") == 0) continue;
                wchar_t full[MAX_PATH];
                _snwprintf(full, MAX_PATH, L"%s\\%s", appDir, nm);
                HMODULE m = LoadLibraryExW(full, NULL, LOAD_WITH_ALTERED_SEARCH_PATH);
                tried++;
                if (!m) {
                    DWORD e = GetLastError();
                    failed++;
                    logLine("%lu\tDEPFAIL\t%ls\terr=%lu", GetCurrentProcessId(), nm, e);
                }
            } while (FindNextFileW(ff, &fd));
            FindClose(ff);
        }
        logLine("%lu\tDEPSUM\ttried=%d failed=%d", GetCurrentProcessId(), tried, failed);

        /* 依赖预载完，再试一次 wrapper.node */
        HMODULE h3 = LoadLibraryExW(path, NULL, LOAD_WITH_ALTERED_SEARCH_PATH);
        logLine("%lu\tLOADTEST3\tafter-deps ok=%d err=%lu", GetCurrentProcessId(), h3 != NULL, GetLastError());
    }
    return 0;
}

static DWORD WINAPI initThread(LPVOID param) {
    (void)param;
    InitializeCriticalSection(&g_lock);

    wchar_t patchPath[MAX_PATH] = { 0 };
    wchar_t match[128] = { 0 };
    {
        wchar_t v[32];
        if (GetEnvironmentVariableW(L"SC_V8_DUMP", v, 32) > 0 && v[0] == L'1') g_on = 1;
        if (GetEnvironmentVariableW(L"SC_V8_PROBE", v, 32) > 0 && v[0] == L'1') g_probe = 1;
        if (GetEnvironmentVariableW(L"SC_V8_OFF", v, 32) > 0) g_off = (int)wcstol(v, NULL, 0);
        if (GetEnvironmentVariableW(L"SC_V8_ARG", v, 32) > 0) g_arg = (int)wcstol(v, NULL, 0);
        if (GetEnvironmentVariableW(L"SC_V8_SRET", v, 32) > 0) g_sret = (v[0] != L'0');
        GetEnvironmentVariableW(L"SC_V8_DIR", g_dir, MAX_PATH);
        GetEnvironmentVariableW(L"SC_V8_PATCH", patchPath, MAX_PATH);
        if (GetEnvironmentVariableW(L"SC_V8_MATCH", match, 128) > 0) {
            WideCharToMultiByte(CP_UTF8, 0, match, -1, g_match, sizeof(g_match), NULL, NULL);
        }
        CreateDirectoryW(g_dir, NULL);
    }

    wchar_t sys[MAX_PATH];
    GetSystemDirectoryW(sys, MAX_PATH);
    wcscat(sys, L"\\winmm.dll");
    HMODULE real = LoadLibraryW(sys);
    if (!real) { logLine("-1\tERR\tload system winmm failed"); return 1; }
    winmm_stubs_init(real);

    if (!patchPath[0] && g_self) {
        wchar_t dllPath[MAX_PATH];
        if (GetModuleFileNameW(g_self, dllPath, MAX_PATH)) {
            wchar_t* sl = wcsrchr(dllPath, L'\\');
            if (sl) {
                *sl = 0;
                _snwprintf(patchPath, MAX_PATH, L"%s\\snowcat-boot.js", dllPath);
            }
        }
    }

    int havePatch = 0;
    if (patchPath[0]) {
        havePatch = loadPatchFile(patchPath);
        logLine("%lu\tCFG\tpatch=%d bytes=%d match=%s", GetCurrentProcessId(), havePatch, g_patchLen, g_match);
    }

    HMODULE qqnt = NULL;
    for (int i = 0; i < 600; i++) {
        qqnt = GetModuleHandleW(L"QQNT.dll");
        if (qqnt) break;
        Sleep(50);
    }
    if (!qqnt) { logLine("-1\tERR\tQQNT.dll never loaded"); return 1; }

    v8_GetCurrent = (pfn_Isolate_GetCurrent)GetProcAddress(qqnt, SYM_ISOLATE_GET_CURRENT);
    v8_Utf8Ctor   = (pfn_Utf8Value_ctor)GetProcAddress(qqnt, SYM_UTF8VALUE_CTOR);
    v8_Utf8Ptr    = (pfn_Utf8Value_ptr)GetProcAddress(qqnt, SYM_UTF8VALUE_PTR);
    v8_Utf8Len    = (pfn_Utf8Value_len)GetProcAddress(qqnt, SYM_UTF8VALUE_LEN);
    v8_Utf8Dtor   = (pfn_Utf8Value_dtor)GetProcAddress(qqnt, SYM_UTF8VALUE_DTOR);
    v8_IsString   = (pfn_Value_IsString)GetProcAddress(qqnt, "?IsString@Value@v8@@QEBA_NXZ");
    v8_NewFromUtf8 = (pfn_NewFromUtf8_sret)GetProcAddress(qqnt, SYM_STRING_NEWFROMUTF8);

    if (!v8_GetCurrent || !v8_Utf8Ctor || !v8_Utf8Ptr || !v8_Utf8Len || !v8_IsString) {
        logLine("-1\tERR\tv8 symbols missing");
        return 1;
    }

    if (MH_Initialize() != MH_OK) { logLine("-1\tERR\tMH_Initialize failed"); return 1; }

    struct { const char* name; void* det; void** orig; const char* tag; } hooks[] = {
        { SYM_COMPILE,          (void*)det_Compile,         (void**)&orig_Compile,         "Compile"  },
        { SYM_COMPILE_UNBOUND,  (void*)det_CompileUnbound,  (void**)&orig_CompileUnbound,  "Unbound"  },
        { SYM_COMPILE_MODULE,   (void*)det_CompileModule,   (void**)&orig_CompileModule,   "Module"   },
        { SYM_COMPILE_FUNCTION, (void*)det_CompileFunction, (void**)&orig_CompileFunction, "Function" },
    };

    int ok = 0;
    for (int i = 0; i < 4; i++) {
        void* p = (void*)GetProcAddress(qqnt, hooks[i].name);
        if (!p) { logLine("%lu\tMISS\t%s", GetCurrentProcessId(), hooks[i].tag); continue; }
        if (MH_CreateHook(p, hooks[i].det, hooks[i].orig) == MH_OK) ok++;
        else logLine("%lu\tHOOKFAIL\t%s", GetCurrentProcessId(), hooks[i].tag);
    }
    if (!ok) { logLine("-1\tERR\tno hook installed"); return 1; }

    MH_EnableHook(MH_ALL_HOOKS);
    logLine("%lu\tREADY\thooks=%d dump=%d patch=%d off=%d arg=%d sret=%d",
            GetCurrentProcessId(), ok, g_on, havePatch, g_off, g_arg, g_sret);
    return 0;
}

BOOL WINAPI DllMain(HMODULE module, DWORD reason, LPVOID reserved) {
    (void)reserved;
    if (reason == DLL_PROCESS_ATTACH) {
        g_self = module;
        DisableThreadLibraryCalls(module);
        HANDLE th = CreateThread(NULL, 0, initThread, NULL, 0, NULL);
        if (th) CloseHandle(th);
        HANDLE th2 = CreateThread(NULL, 0, probeThread, NULL, 0, NULL);
        if (th2) CloseHandle(th2);
    }
    return TRUE;
}

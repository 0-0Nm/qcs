/* winmm 代理：所有导出转发到系统 winmm.dll，DllMain 执行 SnowCat 逻辑 */
typedef void* HANDLE;
typedef unsigned long DWORD;
typedef int BOOL;
typedef const unsigned short* LPCWSTR;
typedef const char* LPCSTR;

__declspec(dllimport) void* __stdcall LoadLibraryW(LPCWSTR);
__declspec(dllimport) void* __stdcall GetProcAddress(void*, LPCSTR);
__declspec(dllimport) HANDLE __stdcall CreateFileW(LPCWSTR, DWORD, DWORD, void*, DWORD, DWORD, HANDLE);
__declspec(dllimport) BOOL __stdcall WriteFile(HANDLE, const void*, DWORD, DWORD*, void*);
__declspec(dllimport) BOOL __stdcall CloseHandle(HANDLE);
__declspec(dllimport) DWORD __stdcall GetTickCount(void);
__declspec(dllimport) void __stdcall Sleep(DWORD);
__declspec(dllimport) DWORD __stdcall GetCurrentProcessId(void);

/* -nostdlib 需要 */
unsigned int _tls_index = 0;

void* g_timeGetTime = 0;
void* g_timeBeginPeriod = 0;
void* g_timeEndPeriod = 0;
void* g_midiInAddBuffer = 0;
void* g_midiInClose = 0;
void* g_midiInGetDevCapsW = 0;
void* g_midiInGetNumDevs = 0;
void* g_midiInOpen = 0;
void* g_midiInPrepareHeader = 0;
void* g_midiInReset = 0;
void* g_midiInStart = 0;
void* g_midiInUnprepareHeader = 0;
void* g_midiOutClose = 0;
void* g_midiOutGetDevCapsW = 0;
void* g_midiOutGetNumDevs = 0;
void* g_midiOutLongMsg = 0;
void* g_midiOutOpen = 0;
void* g_midiOutPrepareHeader = 0;
void* g_midiOutReset = 0;
void* g_midiOutShortMsg = 0;
void* g_midiOutUnprepareHeader = 0;
void* g_waveInGetNumDevs = 0;
void* g_waveOutClose = 0;
void* g_waveOutGetNumDevs = 0;
void* g_waveOutOpen = 0;
void* g_waveOutPause = 0;
void* g_waveOutPrepareHeader = 0;
void* g_waveOutReset = 0;
void* g_waveOutRestart = 0;
void* g_waveOutUnprepareHeader = 0;
void* g_waveOutWrite = 0;

__attribute__((naked)) void sc_timeGetTime(void) {
    __asm__ __volatile__("jmp *g_timeGetTime(%rip)");
}
__attribute__((naked)) void sc_timeBeginPeriod(void) {
    __asm__ __volatile__("jmp *g_timeBeginPeriod(%rip)");
}
__attribute__((naked)) void sc_timeEndPeriod(void) {
    __asm__ __volatile__("jmp *g_timeEndPeriod(%rip)");
}
__attribute__((naked)) void sc_midiInAddBuffer(void) {
    __asm__ __volatile__("jmp *g_midiInAddBuffer(%rip)");
}
__attribute__((naked)) void sc_midiInClose(void) {
    __asm__ __volatile__("jmp *g_midiInClose(%rip)");
}
__attribute__((naked)) void sc_midiInGetDevCapsW(void) {
    __asm__ __volatile__("jmp *g_midiInGetDevCapsW(%rip)");
}
__attribute__((naked)) void sc_midiInGetNumDevs(void) {
    __asm__ __volatile__("jmp *g_midiInGetNumDevs(%rip)");
}
__attribute__((naked)) void sc_midiInOpen(void) {
    __asm__ __volatile__("jmp *g_midiInOpen(%rip)");
}
__attribute__((naked)) void sc_midiInPrepareHeader(void) {
    __asm__ __volatile__("jmp *g_midiInPrepareHeader(%rip)");
}
__attribute__((naked)) void sc_midiInReset(void) {
    __asm__ __volatile__("jmp *g_midiInReset(%rip)");
}
__attribute__((naked)) void sc_midiInStart(void) {
    __asm__ __volatile__("jmp *g_midiInStart(%rip)");
}
__attribute__((naked)) void sc_midiInUnprepareHeader(void) {
    __asm__ __volatile__("jmp *g_midiInUnprepareHeader(%rip)");
}
__attribute__((naked)) void sc_midiOutClose(void) {
    __asm__ __volatile__("jmp *g_midiOutClose(%rip)");
}
__attribute__((naked)) void sc_midiOutGetDevCapsW(void) {
    __asm__ __volatile__("jmp *g_midiOutGetDevCapsW(%rip)");
}
__attribute__((naked)) void sc_midiOutGetNumDevs(void) {
    __asm__ __volatile__("jmp *g_midiOutGetNumDevs(%rip)");
}
__attribute__((naked)) void sc_midiOutLongMsg(void) {
    __asm__ __volatile__("jmp *g_midiOutLongMsg(%rip)");
}
__attribute__((naked)) void sc_midiOutOpen(void) {
    __asm__ __volatile__("jmp *g_midiOutOpen(%rip)");
}
__attribute__((naked)) void sc_midiOutPrepareHeader(void) {
    __asm__ __volatile__("jmp *g_midiOutPrepareHeader(%rip)");
}
__attribute__((naked)) void sc_midiOutReset(void) {
    __asm__ __volatile__("jmp *g_midiOutReset(%rip)");
}
__attribute__((naked)) void sc_midiOutShortMsg(void) {
    __asm__ __volatile__("jmp *g_midiOutShortMsg(%rip)");
}
__attribute__((naked)) void sc_midiOutUnprepareHeader(void) {
    __asm__ __volatile__("jmp *g_midiOutUnprepareHeader(%rip)");
}
__attribute__((naked)) void sc_waveInGetNumDevs(void) {
    __asm__ __volatile__("jmp *g_waveInGetNumDevs(%rip)");
}
__attribute__((naked)) void sc_waveOutClose(void) {
    __asm__ __volatile__("jmp *g_waveOutClose(%rip)");
}
__attribute__((naked)) void sc_waveOutGetNumDevs(void) {
    __asm__ __volatile__("jmp *g_waveOutGetNumDevs(%rip)");
}
__attribute__((naked)) void sc_waveOutOpen(void) {
    __asm__ __volatile__("jmp *g_waveOutOpen(%rip)");
}
__attribute__((naked)) void sc_waveOutPause(void) {
    __asm__ __volatile__("jmp *g_waveOutPause(%rip)");
}
__attribute__((naked)) void sc_waveOutPrepareHeader(void) {
    __asm__ __volatile__("jmp *g_waveOutPrepareHeader(%rip)");
}
__attribute__((naked)) void sc_waveOutReset(void) {
    __asm__ __volatile__("jmp *g_waveOutReset(%rip)");
}
__attribute__((naked)) void sc_waveOutRestart(void) {
    __asm__ __volatile__("jmp *g_waveOutRestart(%rip)");
}
__attribute__((naked)) void sc_waveOutUnprepareHeader(void) {
    __asm__ __volatile__("jmp *g_waveOutUnprepareHeader(%rip)");
}
__attribute__((naked)) void sc_waveOutWrite(void) {
    __asm__ __volatile__("jmp *g_waveOutWrite(%rip)");
}


static int g_inited = 0;
static void* g_real = 0;

static void appendLog(const char* msg, unsigned long len) {
    HANDLE f = CreateFileW(L"D:\\SnowCat.Portable\\winmm-proxy.txt",
                           (DWORD)0x40000000 /*GENERIC_WRITE*/, 3 /*FILE_SHARE_READ|WRITE*/,
                           0, 4 /*OPEN_ALWAYS*/, 0x80, 0);
    if (f != (HANDLE)-1 && f) {
        DWORD w = 0;
        WriteFile(f, msg, (DWORD)len, &w, 0);
        CloseHandle(f);
    }
}

static void initOnce(void) {
    if (g_inited) return;
    g_inited = 1;
    appendLog("[winmm-proxy] DllMain ATTACH reached\n", 36);
    g_real = LoadLibraryW(L"C:\\Windows\\System32\\winmm.dll");
    if (!g_real) {
        appendLog("[winmm-proxy] LoadLibraryW(system winmm) FAILED\n", 46);
        return;
    }
    appendLog("[winmm-proxy] system winmm loaded, resolving exports\n", 54);

    g_timeGetTime = GetProcAddress(g_real, "timeGetTime");
    g_timeBeginPeriod = GetProcAddress(g_real, "timeBeginPeriod");
    g_timeEndPeriod = GetProcAddress(g_real, "timeEndPeriod");
    g_midiInAddBuffer = GetProcAddress(g_real, "midiInAddBuffer");
    g_midiInClose = GetProcAddress(g_real, "midiInClose");
    g_midiInGetDevCapsW = GetProcAddress(g_real, "midiInGetDevCapsW");
    g_midiInGetNumDevs = GetProcAddress(g_real, "midiInGetNumDevs");
    g_midiInOpen = GetProcAddress(g_real, "midiInOpen");
    g_midiInPrepareHeader = GetProcAddress(g_real, "midiInPrepareHeader");
    g_midiInReset = GetProcAddress(g_real, "midiInReset");
    g_midiInStart = GetProcAddress(g_real, "midiInStart");
    g_midiInUnprepareHeader = GetProcAddress(g_real, "midiInUnprepareHeader");
    g_midiOutClose = GetProcAddress(g_real, "midiOutClose");
    g_midiOutGetDevCapsW = GetProcAddress(g_real, "midiOutGetDevCapsW");
    g_midiOutGetNumDevs = GetProcAddress(g_real, "midiOutGetNumDevs");
    g_midiOutLongMsg = GetProcAddress(g_real, "midiOutLongMsg");
    g_midiOutOpen = GetProcAddress(g_real, "midiOutOpen");
    g_midiOutPrepareHeader = GetProcAddress(g_real, "midiOutPrepareHeader");
    g_midiOutReset = GetProcAddress(g_real, "midiOutReset");
    g_midiOutShortMsg = GetProcAddress(g_real, "midiOutShortMsg");
    g_midiOutUnprepareHeader = GetProcAddress(g_real, "midiOutUnprepareHeader");
    g_waveInGetNumDevs = GetProcAddress(g_real, "waveInGetNumDevs");
    g_waveOutClose = GetProcAddress(g_real, "waveOutClose");
    g_waveOutGetNumDevs = GetProcAddress(g_real, "waveOutGetNumDevs");
    g_waveOutOpen = GetProcAddress(g_real, "waveOutOpen");
    g_waveOutPause = GetProcAddress(g_real, "waveOutPause");
    g_waveOutPrepareHeader = GetProcAddress(g_real, "waveOutPrepareHeader");
    g_waveOutReset = GetProcAddress(g_real, "waveOutReset");
    g_waveOutRestart = GetProcAddress(g_real, "waveOutRestart");
    g_waveOutUnprepareHeader = GetProcAddress(g_real, "waveOutUnprepareHeader");
    g_waveOutWrite = GetProcAddress(g_real, "waveOutWrite");
    appendLog("[winmm-proxy] all exports resolved\n", 36);
}

BOOL __stdcall DllMain(HANDLE module, DWORD reason, void* reserved) {
    (void)module; (void)reserved;
    if (reason == 1) {  /* DLL_PROCESS_ATTACH */
        initOnce();
    }
    return 1;
}
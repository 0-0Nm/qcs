/*
 * snowcat-reflect.exe —— 反射式 DLL 注入（绕过 LdrLoadDll 拦截）
 *
 * 不调用目标进程的 LoadLibrary：自己解析 PE、映射节、修重定位、填 IAT，
 * 最后用一小段 shellcode 调 DllMain(DLL_PROCESS_ATTACH)。
 *
 * 用法: snowcat-reflect.exe <target.exe> <payload.dll> [extra args]
 */
#include <windows.h>
#include <tlhelp32.h>
#include <stdio.h>
#include <wchar.h>
#include <stdlib.h>

static void die(const wchar_t* msg, DWORD err) {
    wprintf(L"[reflect] %s (err=%lu)\n", msg, err);
    ExitProcess(1);
}

/* 本地加载同名 DLL 取函数地址：系统 DLL 在同 session 内与目标进程基址一致 */
static ULONG_PTR localResolve(const char* dllName, const char* funcName) {
    wchar_t wdll[MAX_PATH];
    MultiByteToWideChar(CP_ACP, 0, dllName, -1, wdll, MAX_PATH);
    HMODULE h = LoadLibraryW(wdll);   /* 在我们自己进程里加载，不受 QQ 限制 */
    if (!h) return 0;
    return (ULONG_PTR)GetProcAddress(h, funcName);
}


/* RVA -> file offset（按节表转换） */
static DWORD rva2off(BYTE* dllData, IMAGE_NT_HEADERS64* nt, DWORD rva) {
    IMAGE_SECTION_HEADER* sec = IMAGE_FIRST_SECTION(nt);
    for (WORD i = 0; i < nt->FileHeader.NumberOfSections; i++) {
        if (rva >= sec[i].VirtualAddress &&
            rva < sec[i].VirtualAddress + sec[i].Misc.VirtualSize) {
            return sec[i].PointerToRawData + (rva - sec[i].VirtualAddress);
        }
    }
    return rva; /* fallback */
}

int main(int argc, char** argvA) {
    /* ANSI argv → wchar 转换（mingw 无 wmain） */
    static wchar_t* wargv[16];
    static wchar_t wstore[16][32768];
    if (argc > 16) argc = 16;
    for (int i = 0; i < argc; i++) {
        MultiByteToWideChar(CP_ACP, 0, argvA[i], -1, wstore[i], 32767);
        wargv[i] = wstore[i];
    }
    wchar_t** argv = wargv;
    setvbuf(stdout, NULL, _IONBF, 0);
    setvbuf(stderr, NULL, _IONBF, 0);
    if (argc < 3) {
        wprintf(L"usage: %s <target.exe> <payload.dll> [extra args]\n", argv[0]);
        return 2;
    }

    static wchar_t exeBuf[32768], dllBuf[32768], workBuf[32768];
    wcsncpy(exeBuf, argv[1], 32767); exeBuf[32767] = 0;
    wcsncpy(dllBuf, argv[2], 32767); dllBuf[32767] = 0;
    for (wchar_t* p = exeBuf; *p; ++p) if (*p == L'/') *p = L'\\';
    for (wchar_t* p = dllBuf; *p; ++p) if (*p == L'/') *p = L'\\';

    /* ── 读 payload ── */
    HANDLE hf = CreateFileW(dllBuf, GENERIC_READ, FILE_SHARE_READ, NULL, OPEN_EXISTING, 0, NULL);
    if (hf == INVALID_HANDLE_VALUE) die(L"open payload failed", GetLastError());
    DWORD fsize = GetFileSize(hf, NULL);
    BYTE* dllData = (BYTE*)VirtualAlloc(NULL, fsize, MEM_COMMIT | MEM_RESERVE, PAGE_READWRITE);
    DWORD read = 0;
    ReadFile(hf, dllData, fsize, &read, NULL);
    CloseHandle(hf);

    IMAGE_DOS_HEADER* dos = (IMAGE_DOS_HEADER*)dllData;
    if (dos->e_magic != IMAGE_DOS_SIGNATURE) die(L"bad DOS header", 0);
    IMAGE_NT_HEADERS64* nt = (IMAGE_NT_HEADERS64*)(dllData + dos->e_lfanew);
    if (nt->Signature != IMAGE_NT_SIGNATURE) die(L"bad NT header", 0);
    if (nt->FileHeader.Machine != IMAGE_FILE_MACHINE_AMD64) die(L"payload is not x64", 0);

    DWORD sizeOfImage = nt->OptionalHeader.SizeOfImage;
    ULONG_PTR preferredBase = nt->OptionalHeader.ImageBase;
    wprintf(L"[reflect] image=%lu KB base=%p entry=%lX\n",
            sizeOfImage / 1024, (void*)preferredBase, nt->OptionalHeader.AddressOfEntryPoint);

    /* ── 启动目标（挂起） ── */
    wchar_t cmd[32768];
    if (argc > 3) _snwprintf(cmd, 32768, L"\"%s\" %s", exeBuf, argv[3]);
    else _snwprintf(cmd, 32768, L"\"%s\"", exeBuf);

    wcsncpy(workBuf, exeBuf, 32767);
    wchar_t* slash = wcsrchr(workBuf, L'\\');
    if (slash) *slash = 0; else workBuf[0] = 0;

    STARTUPINFOW si; PROCESS_INFORMATION pi;
    ZeroMemory(&si, sizeof(si)); si.cb = sizeof(si);
    ZeroMemory(&pi, sizeof(pi));
    if (!CreateProcessW(exeBuf, cmd, NULL, NULL, FALSE, CREATE_SUSPENDED,
                        NULL, workBuf[0] ? workBuf : NULL, &si, &pi))
        die(L"CreateProcess failed", GetLastError());
    wprintf(L"[reflect] suspended pid=%lu\n", pi.dwProcessId);

    /* ── 映射映像 ── */
    /* ── 映射映像：优先落在首选基址，避免处理重定位 ── */
    BYTE* remote = (BYTE*)VirtualAllocEx(pi.hProcess, (LPVOID)preferredBase, sizeOfImage,
                                         MEM_COMMIT | MEM_RESERVE, PAGE_EXECUTE_READWRITE);
    if (remote) {
        wprintf(L"[reflect] mapped at preferred base\n");
    } else {
        remote = (BYTE*)VirtualAllocEx(pi.hProcess, NULL, sizeOfImage,
                                       MEM_COMMIT | MEM_RESERVE, PAGE_EXECUTE_READWRITE);
    }
    if (!remote) die(L"VirtualAllocEx failed", GetLastError());
    wprintf(L"[reflect] remote base=%p\n", (void*)remote);

    if (!WriteProcessMemory(pi.hProcess, remote, dllData,
                            nt->OptionalHeader.SizeOfHeaders, NULL))
        die(L"write headers failed", GetLastError());

    IMAGE_SECTION_HEADER* sec = IMAGE_FIRST_SECTION(nt);
    for (WORD i = 0; i < nt->FileHeader.NumberOfSections; i++) {
        if (sec[i].SizeOfRawData == 0) continue;
        if (!WriteProcessMemory(pi.hProcess, remote + sec[i].VirtualAddress,
                                dllData + sec[i].PointerToRawData,
                                sec[i].SizeOfRawData, NULL))
            die(L"write section failed", GetLastError());
    }

    /* ── 重定位 ── */
    LONG_PTR delta = (LONG_PTR)(remote - preferredBase);
    if (delta != 0) {
        DWORD relocRva = nt->OptionalHeader.DataDirectory[IMAGE_DIRECTORY_ENTRY_BASERELOC].VirtualAddress;
        DWORD relocSize = nt->OptionalHeader.DataDirectory[IMAGE_DIRECTORY_ENTRY_BASERELOC].Size;
        if (!relocRva || !relocSize) {
            /* x64 代码默认 RIP 相对寻址，纯位置无关，不需要修正 */
            wprintf(L"[reflect] no reloc table -> treating as position-independent\n");
        } else {
            DWORD off = 0;
            while (off < relocSize) {
                IMAGE_BASE_RELOCATION* blk = (IMAGE_BASE_RELOCATION*)(dllData + rva2off(dllData, nt, relocRva) + off);
                if (!blk->SizeOfBlock) break;
                DWORD count = (blk->SizeOfBlock - sizeof(IMAGE_BASE_RELOCATION)) / sizeof(WORD);
                WORD* entries = (WORD*)((BYTE*)blk + sizeof(IMAGE_BASE_RELOCATION));
                for (DWORD i = 0; i < count; i++) {
                    int type = entries[i] >> 12;
                    DWORD rva = blk->VirtualAddress + (entries[i] & 0x0FFF);
                    if (type == IMAGE_REL_BASED_DIR64) {
                        ULONG_PTR orig = 0;
                        ReadProcessMemory(pi.hProcess, remote + rva, &orig, sizeof(orig), NULL);
                        ULONG_PTR fixed = orig + delta;
                        WriteProcessMemory(pi.hProcess, remote + rva, &fixed, sizeof(fixed), NULL);
                    }
                }
                off += blk->SizeOfBlock;
            }
            wprintf(L"[reflect] relocations applied (delta=%lld)\n", (long long)delta);
        }
    }



    /* ── 导入表 ── */
    DWORD impRva = nt->OptionalHeader.DataDirectory[IMAGE_DIRECTORY_ENTRY_IMPORT].VirtualAddress;
    if (impRva) {
        IMAGE_IMPORT_DESCRIPTOR* imp = (IMAGE_IMPORT_DESCRIPTOR*)(dllData + rva2off(dllData, nt, impRva));
        wprintf(L"[reflect] imp desc off loaded\n", (unsigned long)rva2off(dllData, nt, impRva));
        for (; imp->Name; imp++) {
            wprintf(L"[reflect] imp name rva loaded\n", (unsigned long)imp->Name);
            const char* dllName = (const char*)(dllData + rva2off(dllData, nt, imp->Name));
            int resolved = 0, total = 0;
            DWORD oftOff = rva2off(dllData, nt, imp->OriginalFirstThunk ? imp->OriginalFirstThunk : imp->FirstThunk);
            ULONG_PTR* thunk = (ULONG_PTR*)(dllData + oftOff);
            for (int tIdx = 0; tIdx < 256 && *thunk; thunk++, tIdx++) {
                total++;
                ULONG_PTR fn = 0;
                if (*thunk & IMAGE_ORDINAL_FLAG64) {
                    fn = localResolve(dllName, (const char*)(*thunk & 0xFFFF));
                } else {
                    DWORD ibnOff = rva2off(dllData, nt, (DWORD)*thunk);
                    IMAGE_IMPORT_BY_NAME* ibn = (IMAGE_IMPORT_BY_NAME*)(dllData + ibnOff);
                    fn = localResolve(dllName, (const char*)ibn->Name);
                }
                if (fn) {
                    resolved++;
                    ULONG_PTR slotAddr = (ULONG_PTR)(remote + imp->FirstThunk +
                        ((BYTE*)thunk - (dllData + oftOff)));
                    WriteProcessMemory(pi.hProcess, (void*)slotAddr, &fn, sizeof(fn), NULL);
                } else {
                    wprintf(L"[reflect] !! unresolved %S\n", dllName);
                }
            }
            wprintf(L"[reflect] import %S -> %d/%d\n", dllName, resolved, total);
        }
    }

    /* ── shellcode: DllMain(remoteBase, DLL_PROCESS_ATTACH, NULL) ── */
    BYTE sc[64];
    int n = 0;
    ULONG_PTR entryAddr = (ULONG_PTR)(remote + nt->OptionalHeader.AddressOfEntryPoint);
    sc[n++] = 0x48; sc[n++] = 0xB9;                 /* mov rcx, base */
    memcpy(sc + n, &remote, 8); n += 8;
    sc[n++] = 0x48; sc[n++] = 0xBA;                 /* mov rdx, 1 */
    DWORD one = 1; memcpy(sc + n, &one, 4); n += 8;
    sc[n++] = 0x4D; sc[n++] = 0x31; sc[n++] = 0xC0; /* xor r8, r8 */
    sc[n++] = 0x48; sc[n++] = 0xB8;                 /* mov rax, entry */
    memcpy(sc + n, &entryAddr, 8); n += 8;
    sc[n++] = 0xFF; sc[n++] = 0xD0;                 /* call rax */
    sc[n++] = 0xC3;                                 /* ret */

    BYTE* remoteSc = (BYTE*)VirtualAllocEx(pi.hProcess, NULL, sizeof(sc),
                                           MEM_COMMIT | MEM_RESERVE, PAGE_EXECUTE_READWRITE);
    if (!remoteSc) die(L"alloc shellcode failed", GetLastError());
    WriteProcessMemory(pi.hProcess, remoteSc, sc, n, NULL);

    HANDLE th = CreateRemoteThread(pi.hProcess, NULL, 0,
                                   (LPTHREAD_START_ROUTINE)remoteSc, NULL, 0, NULL);
    if (!th) die(L"CreateRemoteThread failed", GetLastError());
    WaitForSingleObject(th, 15000);
    DWORD code = 0;
    GetExitCodeThread(th, &code);
    wprintf(L"[reflect] DllMain thread exit=0x%lX\n", code);
    CloseHandle(th);

    ResumeThread(pi.hThread);
    wprintf(L"[reflect] resumed\n");
    CloseHandle(pi.hThread);
    CloseHandle(pi.hProcess);
    return 0;
}

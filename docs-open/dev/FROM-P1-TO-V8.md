# SnowCat 雪猫 · 从 P1 到 V8：一条注入通道的完整攻关实录

> 本文是 SnowCat 项目的技术制作文档，完整公开我们如何在一夜之间，从「最新版 QQ 无法注入」走到「V8 编译器通道全功能运行」。所有方法、所有失败、所有工具，全部摊开。

## 0. 背景

QQ NT 客户端（QQNT）持续强化反第三方客户端措施。上游 NapCat 于 2026-11-10 发布最后一次提交「Ending」，SnowLuma 仓库同日 404。SnowCat 接棒立项，第一场硬仗就是：**适配官方最新版 QQ 9.9.37-54395**——一个为封锁第三方客户端而特别强化的版本。

## 1. 敌情侦察：9.9.37 的防护体系

拿到官方安装包解包后，我们逐层实测确认了五道防线：

| # | 防线 | 实测结果 |
|---|------|----------|
| 1 | `package.json` 的 `main` 字段弃用 | launcher 硬编码加载 `asar/app_launcher/index.js`（内存抓拼接串实锤），改 main 无效 |
| 2 | 文件完整性校验 | `application.json` 内 RSA-2048 签名表覆盖 4 个关键文件（application.asar / major.node / package.json / wrapper.node），任何改动触发「文件已损坏」弹窗 |
| 3 | 应用目录 DLL 白名单 | winmm / dbghelp 等系统 DLL 代理（哪怕 PE 手术后完全健康）放进应用目录，QQ 加载即死（1~2 进程闪退） |
| 4 | 运行期代码注入拦截 | 远程线程注入：模块表能挂上，但 DllMain 永不执行；远程直接调导出函数 → QQ 进程自杀（0xC0000229）。无 CIG/ACG 标志位，疑似 VMProtect 类壳内自检 |
| 5 | 环境变量过滤 | `NODE_OPTIONS` / `ELECTRON_RUN_AS_NODE` 等全部被 launcher 吞掉 |

**另有一个环境坑**：`resources/app` 自带的 `dbghelp.dll` / `dbgeng.dll` 是坏的（加载报 193），连锁导致 LightQuic.dll、broadcast_ipc.dll 加载失败，进而 `wrapper.node` 无法 dlopen。禁用它们改走系统版本即可修复。

## 2. 全部死路（失败档案，同样值钱）

### 2.1 hook 文件 API——死
我们在 QQ 运行中 trace 用户态文件 API（CreateFileW / NtCreateFile）：**QQ 读取自身资源根本不走这些路径**。所有基于 hook 文件读取来篡改 asar / package.json 的方案（社区常用的 CreateFileW 重定向到补丁文件）在 9.9.37 全部落空。

### 2.2 纯 forwarder 代理 DLL——死
用 python 做 PE 手术，生成 dbghelp / winmm 的纯 forwarder 代理（`dbghelp-real.FuncName` 全量转发），pefile 校验健康、notepad 远程加载成功——但 QQ 的白名单检测直接杀进程。**DLL 本身没问题，问题是「应用目录里不该有这个 DLL」这件事本身。**

### 2.3 zig 编译的 DLL——死（工具链问题）
zig 0.17 编译的 DLL 入口点是一个 `return -1` 空壳（`55 48 89 e5 b8 01 00 00 00 5d c3`），`std` 的 start 链条断掉，**DllMain 永远不会被调用**。多轮尝试（export fn DllMain、-fentry、DllMainCRTStartup）均告失败。结论：写 Windows 注入 DLL 请用 MSVC 或 `zig cc` 编 C，不要用 zig 原生编译 DLL。

### 2.4 反射式 DLL 注入——半死
自写注入器（修了三个 bug：RVA 误当文件偏移需要 `rva2off()` 节表转换、dllName RVA 误用、thunk 循环无上限）在 dummy.exe 上全部通过；QQ 里反射映射能进、shellcode 能跑、hook 全程生效——但 QQ 进程内还有更深的检测点，最终杀进程。此路文档保留（`tools/build/snowcat-reflect.c`），供研究。

### 2.5 挂起态注入旧 hook——失效
pipe 版 BootHook 在 CREATE_SUSPENDED 挂起态注入、hook CreateFileW 能过完整性校验——但这是给「main 入口」时代的方案，9.9.37 弃用 main 后 hook 点失效。

## 3. 顿悟点：换战场

所有死路共享一个假设：**在 QQ 读文件 / 加载模块的路径上动手**。而 QQ 的读取不走用户态文件 API、模块加载有白名单、运行期注入有自检。

那么——**有没有一条路，是 QQ 自己必须走、且无法白名单化的？**

有。JS 编译。QQNT 的 app_launcher/index.js 是加密存储、运行时解密的，解密后的明文 JS 必须交给 V8 编译执行。**hook 文件，QQ 绕得开；hook V8 编译器，明文必经之路，绕不开。**

## 4. V8 通道（最终方案）

### 4.1 三件套

```
winmm.dll（侧加载代理）
   └─ DllMain 里 MinHook 挂 QQNT.dll 导出的 v8::ScriptCompiler::Compile*
        └─ 每次 JS 编译时检查源码：命中 app_launcher/index.js 特征？
             └─ 把 V8 Source 的 source_string_ 换成「引导脚本 + 原文」
                  └─ 引导脚本 import napcat.mjs → SnowCat 全功能启动
```

- **为什么 winmm 能进**：QQ.exe 静态导入 WINMM.dll，而 WINMM 不在 KnownDLLs 里 → 系统 loader 按搜索顺序找到应用目录的同名代理，**这是 loader 的合法加载，不触发注入检测**。之前失败的 winmm 代理败在 DllMain 植入逻辑有缺陷；V8 版精简了 DllMain，只做 MinHook 安装。
- **为什么 MinHook 可靠**：正确处理指令边界重定位（我们手写 trampoline 的版本会崩在非对齐指令上）。
- **特征码**：QQNT.dll 导出的 `v8::ScriptCompiler::Compile*` 直接按导出名 GetProcAddress，无需特征码扫描（QQNTPatcher 式特征码 `48 89 CE 48 8B 11 ...` 是备选方案）。

### 4.2 引导脚本

```js
// snowcat-boot.js：被注入到 app_launcher/index.js 开头
// 原理：动态 import 同目录 napcat.mjs（SnowCat 单文件 bundle）
import(process.env.NAPCAT_MAIN_PATH ?? new URL('./napcat.mjs', import.meta.url).href);
```

原文完整保留在后面执行，QQ 功能零损伤。

### 4.3 一键启动器（snowcat-run.ps1）

部署三件（winmm 代理 DLL / boot 脚本 / WebUI 静态资源）→ 修坏 DLL → 启动 QQ → 45 秒健康检查（6099 WebUI 200 即成功）→ 输出注入日志。

### 4.4 实测验收

- QQ 4 进程，napcat 在主进程内 `imported ok`
- OneBot 反向 WebSocket 连接大沙盒端 ESTABLISHED
- WebUI 6099 在线，全部页面正常
- 日志内智能体消息收发活跃

## 5. 内核接口适配（9.9.37 差异）

注入成功后发现 6 个内核 listener 回调改名（Proxy 层容错打 `has no method` debug 日志，**事件实际在丢**）：

| 9.9.37 新名 | 映射到 |
|---|---|
| onGroupAllInfoListChange | onGroupAllInfoChange |
| onGroupDetailInfoListChange | onGroupDetailInfoChange |
| onGroupNotifiesUpdatedV2 | onGroupNotifiesUpdated |
| onGroupNotifiesUnreadCountUpdatedV2 | onGroupNotifiesUnreadCountUpdated |
| onGroupAIOSlotInfoChange | （空实现） |
| onNtMsgSyncContactUnread | onNtMsgSyncEnd |

TypeScript 细节坑：旧方法是具名参数签名，`this.oldFn(...args)` 报 TS2556，需 `(this.oldFn as (...a:unknown[]) => unknown)(..._args)`。

PacketBackend 报「不支持当前QQ版本架构」= `napi2native.json` 偏移表缺新版本条目。表格式为 `{ "9.9.37-54395-x64": { "send": "C5927F", "recv": "24CC2B5" } }`——QQNT.dll 内 send/recv 函数的十六进制偏移，可用 IDA / x64dbg 在目标版本 QQNT.dll 中定位 `SSO` 收发函数补表。

## 6. 解包器（snowcat-qq-unpack.ps1）

- `-Installer <path>`：本地官方安装包 → 7z 直解 PE 自解压（Files\ 结构）→ 组装 OneKey 兼容便携目录
- `-FromOfficial`：全自动——抓官网 pcConfig.json 解出 qqdl.gtimg.cn 直链 → 下载 → 解包 → 组装 → 生成配方档案
- 官网直链对脚本流量全 403（curl / UA 伪装 / 无头浏览器都拒），**唯官网页内真实点击可下**——脚本内已内置说明；最省事的路径是用浏览器手动下载后走 `-Installer`。

## 7. 运行时栈（现在的形态）

```
QQ 9.9.37-54395 x64（官方原版，一字节未动）
 └─ winmm.dll（V8 通道代理）
     └─ QQ 主进程内：napcat.mjs（3.25MB 单文件 Vite bundle，inlineDynamicImports）
         ├─ OneBot v11：反向 WS 接大沙盒 / HTTP / MCP(Streamable HTTP /mcp)
         ├─ WebUI：React + Tailwind + HeroUI（6099）
         └─ Packet 发包：napi2native + MoeHoo（offset 表驱动）
```

## 8. 工具清单（tools/ 全部开源）

| 文件 | 用途 |
|---|---|
| snowcat-qq-unpack.ps1 | 官方 QQ 安装包解包器（-Installer / -FromOfficial） |
| snowcat-launch.ps1 | 零硬改启动器（自动发现已装 QQ → 实况版本 → 自动 qqnt → 注入） |
| snowcat-portable-maker.ps1 | 便携制作器（官网直链 / 已装便携化） |
| snowcat-run.ps1 | 9.9.37 V8 通道一键启动器 |
| winmm-v8.c / winmm-v8.dll | V8 通道本体（源码 + 编译成品） |
| snowcat-boot.js | 引导脚本 |
| snowcat-hook.c / snowcat-inject.c / snowcat-reflect.c | 研究物料（观测 hook / 注入器 / 反射注入器） |
| webui-static/ | WebUI 前端成品 |

## 9. 给后来者

1. **hook 编译器，别 hook 文件**。文件层防线只会越来越厚，V8/JS 引擎层是解密明文的必经之路。
2. **失败路同样值钱**。本文第 2 节的每一条死路都花了真金白银的时间，公开它们让后来者不用重付学费。
3. **单一文件 bundle 是刚需**。Electron 内嵌 Node 的模块解析对相对导入分块包不友好，`vite build --inlineDynamicImports` 出单文件是最稳形态。
4. **白盒立身**。所有改动可查、所有失败可考、所有偏移有表。这就是我们敢公开全部技术的原因。

——SnowCat 开发组

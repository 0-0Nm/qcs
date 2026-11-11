# SnowCat 雪猫：融合魔改 QQ 客户端（NapCat + SnowLuma 合体）

> 立档 2026-11-11 · 师父亲定名 SnowCat/雪猫（SnowLuma 的雪 + NapCat 的猫）· 后续随移植进度续写

## 一、在役运行链（现状考古，已实锤）

```
开机
 └─ schtasks \Tongling-Autostart
     └─ powershell C:\dsh\start-tongling.ps1
         └─ Napcat worker:
             NapCatWinBootMain.exe
               "D:\NapCat.Shell.Windows.OneKey\NapCat.44498.Shell\QQ.exe"   ← 便携 QQ（非注册表安装版）
               "C:\dsh\.tmp\napcat-shell\NapCatWinBootHook.dll"             ← 注入 DLL
               -q<REDACTED>                                                 ← 速登账号
             env:
               NAPCAT_PATCH_PACKAGE=C:\dsh\.tmp\napcat-shell\qqnt.json      ← 版本描述符（钉 9.9.22-40990）
               NAPCAT_LOAD_PATH=loadNapCat.js  NAPCAT_INJECT_PATH=BootHook.dll
               NAPCAT_MAIN_PATH=napcat.mjs
 └─ 5min 心跳: schtasks \tongling-heartbeat → heartbeat-tongling.ps1（看 6099 WebUI 端口判活）
```

**进程链**: NapCatWinBootMain.exe (PID 5068) → 启动并注入 QQ.exe ×3 进程 → BootHook.dll 进 QQ 内部 →
Electron 主进程加载 `loadNapCat.js`（内容就一行 `import("file:///...napcat.mjs")`，每次 launcher 启动时由脚本重新生成）→
napcat.mjs（3MB 打包 bundle）跑起来 → **reverse WS 客户端**连 `ws://127.0.0.1:8082`（dsh 侧 server，token 在
onebot11_<REDACTED>.json）→ WebUI 在 6099。

## 二、解包机制（"怎么解包跑通的"答案）

- 便携 QQ 结构：`NapCat.44498.Shell/versions/9.9.35-52892/` = 完整 Electron 运行时
  （QQNT.dll + *.dll + resources/app/）。
- **关键**：`resources/app/` 是**解开的目录形态**（package.json 直接可读），不是 app.asar 打包——
  这就是"解包完成"的形态。来源：OneKey 一键包（下载器解包模式），不是手动解的。
- 目录名 `44498` = OneKey 出厂时带的 QQ build（~9.9.30-44498）；后来 QQ 自更新器原地升到 **9.9.35-52892**。
- `channel.json` 为空；`versions/<ver>/resources/app/package.json` 是 QQ 版本的**权威源**。

## 三、硬改点清单（已实锤 + 待审计）

| # | 位置 | 内容 | 状态 |
|---|---|---|---|
| 1 | `qqnt.json`（NAPCAT_PATCH_PACKAGE） | 钉死 9.9.22-**40990**，实际 QQ=9.9.35-**52892**。**消费者=NapCatWinBootHook.dll**（QQ 进程内，UTF16 字符串实锤；exe 和 mjs 都不认） | ✅ 实锤，DLL 源码在 NapNeko/NapCat-Hook |
| 2 | `napcat.mjs` | **逐字节=官方 v4.18.28**（md5 22ca46f7 双侧一致） | ✅ 无魔改 |
| 3 | 其余 shell 文件 | BootHook.dll/BootMain.exe/conout/全部 bat = 官方 zip 逐字节一致；loadNapCat.js 唯一 DIFF=launcher 每次启动按本机路径重新生成（设计使然，非魔改） | ✅ 无魔改 |
| 4 | 启动路径 | start-tongling.ps1 硬编码 D: 便携 QQ 路径 | 稳定线要改成自动发现 |
| 5 | 注册表劫持 | QQ 卸载项 UninstallString 指到 D:\...\OneKey\...\Uninstall.exe——launcher.bat 的注册表探测被顺带接管 | ✅ 实锤，系统级硬改 |

**终审结论**：在役 shell = **官方 v4.18.28 原封不动**；"硬改"实为三处壳外活：①qqnt.json 手工钉版（BootHook DLL 吃）②注册表劫持 ③启动脚本路径硬编码。**稳定线方案**：魔改 launcher 自动探测已装 QQ→读真实 `versions/*/resources/app/package.json`→自动生成 qqnt.json→注入，全程零手工。

## 四、新规格（师父令，2026-11-11 累加）

14. **稳定性工程线**：QQ 连接稳定线——保活、掉线重连、心跳；发言稳定线——参考本地运行时素材
    （dsh 现役会话节奏/语言学规则/去模板化六条），更像真人、模拟稳定；账号稳定线——防风控节奏、
    掉线自愈。全面写进 SnowCat。
15. **UI 全面改造**：前端后端全面改造，不止名字，排版/样式/主题全按我们审美来（雪青主色系）。

1. **基座**：NapCat v4.18.28 源码（已克隆 `<local-src>`，tag 对齐在役版）
2. **移植**：SnowLuma 独门动作 → NapCat（qzone 全家桶 16 动作、闪照文件管理 5 件、收藏列表、
   资料点赞、单条转发×2、群相册、自定义表情管理、URL 安全检测等， quarry=`<local-src>` v2.2.1）
3. **稳定线（零硬改）**：
   - 自动识别系统已装 QQ（注册表 + 常见路径），有 → 直接注入
   - 无 → 自动检测并下载安装（OneKey 模式内置化）
   - 自动读实际 `versions/*/resources/app/package.json` 取版本号，废掉手工 qqnt.json 钉版本
4. **解包器**：支持解包各版本 QQ 客户端（含最新版）安装包 → 便携结构
5. **命名**：两客户端融合体（NapCat+SnowLuma），要有专属名
6. **持续更新**：fork 结构可跟上游 NapCat 更新线，patch 层清晰可重放
7. **验收**：build:shell → 本地 boot 测试 → 热换在役 → dsh-channel-qq 能力矩阵更新

## 五、SnowLuma 考古结论（移植路线图依据）

**致谢与维护关系**：SnowCat = NapCat（底座，上游 NapNeko/NapCatQQ）+ SnowLuma（能力采石场，上游 SnowLuma/SnowLuma）融合体。**感谢两个上游仓库**；此后 SnowCat 由我们维护——不为跟官方对着干，而为社区真需要（自有 AI 生态接入：dsh/陪伴型等）。维护可自改，及时更新。

**关键发现**：SnowLuma 独门动作分两条线——

**Web 线（cookie 撑腰，HTTP 打腾讯网页接口）** `packages/protocol/src/web/`：
- `qzone.ts` 个人空间说说全家桶（读资料/改资料/发说说/评论/回复/点赞/拉黑/删说/权限/传图）
- `qzone-public.ts` 公共空间（feeds/详情/评论/回复/点赞/跟赞/关注/转发）
- `group-album.ts` 群相册、`group-essence.ts` 精华、`group-honor.ts` 荣誉、`group-notice.ts` 群公告、`group-signin.ts` 打卡
- `collection.ts` 收藏、`friend-dress.rs` 装扮
- 入口：`getCookies('qzone.qq.com')` 拿凭证 → request-util 发 HTTP

**原生线（OIDB 包 + NTQQ 内部）** `packages/protocol/src/`：
- `oidb-service.ts + oidb-services/`（OIDB 协议打包）、`highway`（大文件）、`dataline`、`msg-push`
- `core/bridge/apis/`: flash-transfer（闪照文件管理）、forward（单条转发）、system-face（自定义表情）、interaction（戳/回应）

**事件侧**：`event-bus.ts + events.ts + msg-push/`——"更多事件回调"的 quarry 在这。

**移植含义**：Web 线基本是自包含 TS（cookie + HTTP），NapCat 侧有自己的 cookie 管道（get_cookies/get_credentials/get_csrf_token），移植成本低；原生线要对 NapCat 的 NTAPI 包装层重接线。

## 六、师父令累加（2026-11-11 续）

8. **便携版 QQ 制作器**：官网最新包下载→一键解码→便携化；已装 QQ→一键便携化
9. **全线开源**：融合客户端 + 改造过的便携版 QQ 都开源，用户拉取即用、一键修改
10. **一键化**：无 QQ→检测→自动下载安装；有 QQ→直接注入
11. **事件增强**：解包 QQ 时挖出更多事件回调（SnowLuma event-bus + NapCat 事件层双源合并）
12. **试最新版**：当下就去官网拉最新 QQ 包验解码链路
13. **开源发布文**：全部做完后随开源发一篇回怼文（素材已汇编 `SnowCat_开源发布文_素材.md`）——
    本地运行时零外发全开源可查；官方=工作流路线 vs SnowCat=个人开发者娱乐路线，两赛道不抢生意；
    骂跳脸官方传谣言的小鬼；稳定党分流去官方机器人

## 七、材料清单

- **SnowCat 工作源码（主战场）**: `<local-workdir>`（v4.18.28 tarball 解包+魔改）
- NapCat 上游跟踪线: `<local-src>`（README/Ending 实录/章程文档都在这）
- SnowLuma 采石场: `<local-src>`（v2.2.1）
- **SnowCat 工具件（工作源码根）**:
  - `snowcat-launch.ps1` 零硬改启动器（QQ自动发现→实况版本→自动qqnt→注入）
  - `snowcat-portable-maker.ps1` 便携制作器（官网直链解码/已装便携化）
  - `packages/napcat-onebot/stable-line.ts` 稳定线（连接退避+真人抖动+预算+熔断）
- 在役运行时: `<local-runtime>/`
- 便携 QQ: `<portable-qq-dir>`
- dsh 插件侧: `C:/dsh/dsh-channel-qq/src/client-compat.ts`（已适配 snowcat/雪猫 识别）

## 八、移植战果（2026-11-11 全绿）

| 批 | 内容 | 状态 |
|---|---|---|
| 一 | qzone 个人空间 10 动作（data/qzone-web.ts ≈900行纯数据层 + WebApi 11方法） | ✅ typecheck 绿 |
| 二 | qzone 公共空间（空友）14 动作（apis/qzone-public-web.ts http2rpc 全函数 + 14动作类） | ✅ typecheck 绿 |
| 三 | 群相册2 + 表情回应查询 + 装扮 + sysface 占位（batch3.ts，NT 现役 service 复用；OIDB 编解码级 todo/tags/reaction 留独立批次） | ✅ typecheck 绿 |
| 品牌 | WebUI 37 文件 130 处 SnowCat + 雪青主题 + 后端 2FA + 手绘雪猫 logo + GetVersionInfo 自报 SnowCat.Onebot + dsh 识别适配 | ✅ 全绿 |
| 稳定线 | stable-line.ts：重连指数退避 / 真人抖动（深夜×1.8）/ 小时预算 120 / 连发 8 条熔断 90s，接入 send_group/send_private/send_msg 三入口 | ✅ typecheck 绿 |
| 工具 | snowcat-launch.ps1（QQ发现+实况版本 9.9.35-52892 验证+qqnt 自动生成实弹过）/ snowcat-portable-maker.ps1 | ✅ 干跑绿 |

## 九、9.9.37 解包与未接能力考古（2026-11-12）

**官方最新包实弹**：QQ_9.9.37_261103_x64_01.exe（334442672B，build 54395）。
- 官网直链（pcConfig.json → qqdl.gtimg.cn QQNTV2）对脚本流量全 403（curl/UA 伪装/真 Chrome 直开都拒），**唯官网页内真点击可下**（CDP 触发 Chrome 下载器成功，~15 分钟 319MB）。
- 7z 直解（PE 自解压，Files\ 结构）→ 1975 文件/1.24GB → OneKey 兼容便携 `SnowCat.9.9.37-54395.Shell`。
- **snowcat-qq-unpack.ps1 成件**：-Installer 本地包 / -FromOfficial 全自动（pcConfig 抓链+下载+7z+组装+配方档案）；9.9.37 实弹全绿。
- 启动器发现段对 9.9.37 验证：version=9.9.37-54395 build=54395 正确读出。

**wrapper.node 服务面差集（76 服务 vs 我们已接 62 文件）**：
未接 19 个 = AIService（QQ 内置 AI：subscribeTask 4API/agent 预热/attach 消息 11 API 已挖到名单）、Guild 三件（频道域）、VasGroup/VasClub（装扮会员）、BatchTransfer/BatchUpload、RemoteFile/RemoteStream、ApiSix、BizKit、GroupSchool（群课堂）、PYMK（可能认识）、FileAutoDownload、GProGuildMsg、YellowFaceForManager、TestPerformance。
**事件层**：已接 163 回调 ≈ 上游 NapCat 4.18.28 等量；9.9.37 新 kernel 回调需 runtime 挖（静态符号不带 listener 类前缀）。

**热换**：MCP+UI 全链 bundle（3253540B）+ salt 兼容前端已进 `<local-runtime>/`，现役 QQ 不重启不中断，下次启动生效。token 盐 '.napcat' 保留（前后端一致+现役兼容）。

## 十、9.9.37 植入攻坚终审（2026-11-12 深夜役）

**全注入面封堵实测**（全部实弹）：
1. package.json main 弃用：launcher 硬编码 asar\app_launcher\index.js（内存抓拼接串实锤）
2. 完整性校验：改 package.json main（旧 DLL hook）→「文件已损坏」弹窗
3. 应用目录 DLL 白名单：winmm 代理（纯 forwarder 180 导出，PE 手术健康 pefile 验证+notepad 远程加载成功）→ QQ 加载即死（1-2 进程）
4. 运行期远程线程注入：模块表能挂但 DllMain 不执行（mini DLL 四连测：文件标记/MessageBox 全无），远程调导出函数直接崩 QQ（0xC0000229）——**运行期代码执行被拦**（无 CIG/ACG 位，疑似 VMProtect 类壳内自检）
5. NODE_OPTIONS/ELECTRON_RUN_AS_NODE 环境变量：launcher 吞掉

**唯一实证有效的 hook 窗口**：pipe 版 BootHook 在 CREATE_SUSPENDED 挂起态注入——hook CreateFileW+GetFileInformationByName 能过完整性校验、假 package.json 能进内存；但 9.9.37 弃 main 后 hook 点失效。

**结论**：9.9.37-54395 当前无社区可用注入路径（上游 issue #2163 同病）。可行方向：
- 短期：钉 9.9.35-52892（现役方案，稳定运行）
- 中期：等 TomyJan/SnowLuma 或社区新 hook 点（盯 4.18.42 后续 fork 动态）
- 长期：雪猫自持（dsh 生态接 MCP 服务器线已通，不依赖 QQ 注入方式）

## 十一、9.9.37 攻坚成功定谳（2026-11-12 05:29 · V8 通道）

**突破时刻**：SnowCat napcat 在 QQ 9.9.37-54395 主进程内全功能运行，测试智能体（TongLing，我们生态的在役智能体）经反向 WS 8082 接入 dsh，WebUI 6099 在线，日志『测试智能体（TongLing，我们生态的在役智能体） |』活跃。

**成功路线（另一 Agent 的 V8 通道，<local-portable>/tools/build/）**：
1. **winmm-v8.dll**（zig cc 编 C，MinHook 挂 QQNT.dll 导出的 v8::ScriptCompiler::Compile*）：QQ 静态导入 WINMM → 应用目录侧加载 → 在解密后 JS **编译前一刻**截获明文
2. 命中 app_launcher/index.js → 把 V8 Source::source_string_ 换成 **引导脚本+原文**（snowcat-boot.js 动态 import napcat.mjs）
3. napcat.mjs 在 QQ 主进程内正常 import（"napcat imported ok"）
4. 附带修复：resources\app 里 dbghelp.dll/dbgeng.dll 是坏的（致 LightQuic/broadcast_ipc 加载 193 → wrapper.node 无法 dlopen）→ 禁用改走系统版本
5. snowcat-run.ps1 一键启动器（部署+启动+45s 健康检查+nc-boot.log 注入日志）

**为什么这条路能通而其它全死**：
- 不碰 package.json/main（弃用+校验）
- 不碰 asar 本体（签名表）
- 不 hook 文件 API（QQ 读取走 NT 层）——**直接 hook JS 编译器**，解密后明文必经之路
- winmm 侧加载在 9.9.37 可行（之前失败的 winmm 代理是 DllMain 植入逻辑有缺陷，V8 版精简且 MinHook 正确处理指令边界）

**失败路全档（四大注入面+反射注入）**：见第十节。其中反射注入（snowcat-reflect2.exe，rva2off 修复版）在 dummy.exe 上全通过——QQ 内 LoadLibrary 被拦（0xC000007B）但反射映射可入、DllMain shellcode 可执行（hook-trace.txt 证明 hook 全程生效），只是 QQ 进程内还有更深检测点杀进程。V8 通道不走这些弯路。

**验收数据**：
- QQ 4 进程，主进程 31944
- 8082 ESTABLISHED（napcat→dsh 反向 WS，token <REDACTED>）
- 6099 WebUI 200，SnowCat 雪猫控制台标题
- 日志『测试智能体（TongLing，我们生态的在役智能体） |』活跃（内核回调注册中，onGroupNotifies 系列无方法警告=9.9.37 新内核接口名差异，napcat 已容错）

**发布版物料**（tools/build/）：
- winmm-v8.dll（171KB）+ snowcat-boot.js + snowcat-run.ps1 + static-dist/
- snowcat-qq-unpack.ps1（解包器）+ snowcat-hook.c/inject/reflect（研究物料）

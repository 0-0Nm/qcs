<div align="center">

<img src="logo.png" width="180" alt="SnowCat 雪猫" />

# SnowCat 雪猫

**雪取自 [SnowLuma](https://github.com/SnowLuma/SnowLuma) · 猫取自 [NapCat](https://github.com/NapNeko/NapCatQQ)**

*两个先行者铺下的路，自此由后来者接续。*

**上游在，我们跟；上游没了，我们扛。**

[![QQ](https://img.shields.io/badge/QQ-9.9.37--54395-12B7F5?logo=tencentqq&logoColor=white)](https://im.qq.com)
[![OneBot](https://img.shields.io/badge/OneBot-v11-black)](https://onebot.dev)
[![MCP](https://img.shields.io/badge/MCP-Streamable_HTTP-8A2BE2)](https://modelcontextprotocol.io)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)
[![Release](https://img.shields.io/github/v/release/DandanLLab/SnowCatQQ?color=orange)](https://github.com/DandanLLab/SnowCatQQ/releases)
[![Stars](https://img.shields.io/github/stars/DandanLLab/SnowCatQQ?style=social)](https://github.com/DandanLLab/SnowCatQQ/stargazers)

*社区开发者维护的第三方 QQ 客户端 —— 让开发者自己的智能体，接入开发者自己的生态*

NapCat 4.18.28 底座 × SnowLuma 独门能力融合，**全功能运行于 QQ 9.9.37-54395（官方最新版）主进程内**，QQ 本体一字节未动。

</div>

---

## ✨ 核心特性

| | 特性 | 说明 |
|---|---|---|
| 🔌 | **QQ 9.9.37 全功能在役** | V8 编译器通道注入，官方最新版原生运行，QQ 本体零改动 |
| 🤖 | **OneBot v11 全动作** | 正向 / 反向 WS、HTTP、HTTP SSE 全接入方式 |
| 🧩 | **MCP 接入** | Streamable HTTP `/mcp`，全部动作自动暴露为 MCP 工具 |
| 🎁 | **56 项独门动作** | 采自 SnowLuma：QZone 全家桶、群相册、精华、打卡、装扮、闪照、收藏…… |
| 📦 | **Packet 发包** | offset 表驱动，逐版本维护 |
| 🖥️ | **雪猫 WebUI** | React + Tailwind + HeroUI 全面重制 |
| 🛠️ | **便携环境制作器** | 官方最新包一键解包、一键便携化 |
| 🛡️ | **稳定线** | 连接退避 + 真人节奏抖动 + 预算 + 熔断 |

## 🚀 快速开始

```powershell
# 1️⃣ 解包官方 QQ 安装包为便携结构（也可手动从官网下载安装包）
./release-tools/snowcat-qq-unpack.ps1 -Installer QQ_9.9.37_261103_x64_01.exe

# 2️⃣ 一键启动（部署 V8 通道 + 启动 + 45s 健康检查）
./release-tools/build/snowcat-run.ps1

# 3️⃣ WebUI 就绪
#    → http://127.0.0.1:6099/webui/
```

## 📚 文档

| 文档 | 内容 |
|---|---|
| 📜 [开源公告](docs-open/ANNOUNCEMENT.md) | 立场声明 · 生态主张 · 给官方的四个问题 |
| 🔬 [从 P1 到 V8](docs-open/dev/FROM-P1-TO-V8.md) | 9.9.37 防护体系 · 全部死路档案 · V8 通道原理 · 内核适配 |
| 🏗️ [架构审计](docs-open/dev/ARCHITECTURE-AUDIT.md) | 启动链 · 解包机制 · 逐字节审计结论 |

## 🗂️ 仓库结构

```
SnowCatQQ
├── 📦 packages/              ⭐ 26 包底层全源码（TS）
│   ├── snowcat-core/           NT 内核 API + listener + Packet 发包
│   ├── snowcat-onebot/         OneBot v11 全动作 + MCP 适配器 + 稳定线
│   ├── snowcat-webui-frontend/ 雪猫控制台（React + HeroUI）
│   ├── snowcat-webui-backend/  WebUI 服务端
│   ├── snowcat-shell/          单文件 bundle 出口（napcat.mjs）
│   └── snowcat-native/         napi2native / MoeHoo / ffmpeg / pty
├── 🛠️ release-tools/         成品工具
│   ├── snowcat-qq-unpack.ps1   官方安装包解包器
│   ├── snowcat-launch.ps1      零硬改启动器
│   ├── snowcat-portable-maker  便携制作器
│   └── build/
│       ├── winmm-v8.c/.dll     V8 通道本体（源码 + 成品）
│       ├── snowcat-boot.js     引导脚本
│       └── snowcat-run.ps1     一键启动器
└── 📖 docs-open/              文档（公告 + 制作 + 审计）
```

## ⚙️ 运行时栈

```
QQ 9.9.37-54395 x64（官方原版，一字节未动）
 └─ winmm.dll（V8 通道代理：MinHook 挂 v8::ScriptCompiler）
     └─ QQ 主进程内：napcat.mjs（3.25MB 单文件 bundle）
         ├─ OneBot v11 ── 反向 WS / HTTP / MCP (/mcp)
         ├─ WebUI ──────── React + HeroUI（:6099）
         └─ Packet ─────── napi2native + MoeHoo（offset 表驱动）
```

## 🔐 关于账号安全，说实话

> 第三方客户端无法在绝对意义上保证账号安全——这是事实，我们不回避。

**但不滥用，即是安全；有滥用，责任在使用者，不在工具，更不在社区。**

- 运行时全部在本地，无任何第三方外发
- 代码全量开源，每一行可查
- 来源全部署名，致敬两个上游

> 黑箱要求人「相信」，白盒只要求人「查看」。
> **我们不索取信任，只提供证据。**

## 🤝 致谢

<div align="center">

**感谢 [NapCat](https://github.com/NapNeko/NapCatQQ)（126,400+ ⭐）· 感谢 [SnowLuma](https://github.com/SnowLuma/SnowLuma)（283 ⭐）**

猫谢猫，雪接雪。你们留下的星，我们记下了，也不会让它们落空。

*Ending 不是终点，是 SnowCat 的起点。*

**—— SnowCat 开发组 ——**

</div>

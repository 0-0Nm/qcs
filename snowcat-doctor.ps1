# SnowCat 雪猫 · 注入体检器
#
# 用途：不启动 QQ，只读检查"为什么插件没加载"。
# 用法：.\snowcat-doctor.ps1 -NapcatDir D:\SnowCat.Portable\SnowCat.9.9.37-54395.Shell
#
# 检查项：
#   ① 目录结构（扁平 / versions 分包）
#   ② 真实入口 package.json 的 main 指向
#   ③ loadNapCat.js 是否就位、内容是否有效
#   ④ 历史注入痕迹（LOADMARK）
#   ⑤ 运行时状态（QQ 进程 / 6099 端口）

param(
  [string]$NapcatDir = 'D:\SnowCat.Portable\SnowCat.9.9.37-54395.Shell'
)

$ErrorActionPreference = 'Continue'

function Line($tag, $msg, $color) {
  Write-Host ("[{0}] {1}" -f $tag, $msg) -ForegroundColor $color
}

Write-Host '== SnowCat 注入体检 ==' -ForegroundColor Cyan
Line '..' "目录: $NapcatDir" Gray

if (-not (Test-Path $NapcatDir)) {
  Line 'X' '目录不存在' Red
  exit 1
}

# ── ① 结构 ──
$versionsDir = Join-Path $NapcatDir 'versions'
$layout = if (Test-Path $versionsDir) { 'versions' } else { 'flat' }
Line 'OK' "结构: $layout" Green

# ── ② 真实入口 ──
$pkgPath = $null
if ($layout -eq 'versions') {
  $cfg = Join-Path $versionsDir 'config.json'
  $cur = $null
  if (Test-Path $cfg) {
    try { $cur = (Get-Content $cfg -Raw | ConvertFrom-Json).curVersion } catch {}
  }
  $cands = @()
  if ($cur) { $cands += (Join-Path $versionsDir "$cur\resources\app") }
  Get-ChildItem $versionsDir -Directory -ErrorAction SilentlyContinue |
    Sort-Object Name -Descending |
    ForEach-Object { $cands += (Join-Path $_.FullName 'resources\app') }
  foreach ($c in $cands) {
    if (Test-Path (Join-Path $c 'package.json')) { $pkgPath = Join-Path $c 'package.json'; break }
  }
} else {
  $p = Join-Path $NapcatDir 'package.json'
  if (Test-Path $p) { $pkgPath = $p }
}

if ($pkgPath) {
  Line 'OK' "入口: $pkgPath" Green
  try {
    $pkg = Get-Content $pkgPath -Raw | ConvertFrom-Json
    Line '..' ("  version = {0}" -f $pkg.version) Gray
    if ($pkg.main -match 'loadNapCat') {
      Line 'OK' ("  main    = {0}  ← 已被接管" -f $pkg.main) Green
    } else {
      Line '!!' ("  main    = {0}  ← 仍是官方入口，靠 hook 内存替换" -f $pkg.main) Yellow
    }
  } catch {
    Line 'X' "  package.json 解析失败: $($_.Exception.Message)" Red
  }
  $orig = "$pkgPath.orig"
  if (Test-Path $orig) { Line 'OK' "  原始备份存在: $orig" DarkGray } else { Line '..' '  尚无 .orig 备份（首次接管会生成）' DarkGray }
} else {
  Line 'X' '找不到任何 package.json' Red
}

# ── ③ loadNapCat.js ──
$loadCandidates = @()
if ($pkgPath) { $loadCandidates += (Join-Path (Split-Path $pkgPath -Parent) 'loadNapCat.js') }
$loadCandidates += (Join-Path $NapcatDir 'loadNapCat.js')

$foundLoad = $null
foreach ($l in $loadCandidates) {
  if (Test-Path $l) { $foundLoad = $l; break }
}
if ($foundLoad) {
  $body = Get-Content $foundLoad -Raw
  Line 'OK' "loadNapCat.js: $foundLoad" Green
  if ($body -match 'napcat\.mjs') {
    Line 'OK' '  指向 napcat.mjs' Green
  } else {
    Line '!!' '  内容异常（不含 napcat.mjs 引用）' Yellow
  }
  if ($body -match 'LOADMARK|writeFileSync') {
    Line '..' '  含自检标记写入（便于确认是否被执行）' DarkGray
  }
} else {
  Line 'X' 'loadNapCat.js 不存在 —— QQ 即使被接管也加载不到' Red
}

# ── ④ 注入痕迹 ──
$marks = Get-ChildItem $NapcatDir -Filter 'LOADMARK*.txt' -ErrorAction SilentlyContinue
if ($marks) {
  foreach ($m in $marks) {
    Line 'OK' ("注入痕迹: {0} → {1}" -f $m.Name, (Get-Content $m.FullName -Raw).Trim()) Green
  }
} else {
  Line '!!' '未发现 LOADMARK —— 说明 loadNapCat.js 从未被执行' Yellow
}

# napcat 自身日志
$logDir = Join-Path $NapcatDir 'logs'
if (Test-Path $logDir) {
  $logs = Get-ChildItem $logDir -File -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 3
  if ($logs) {
    foreach ($lg in $logs) { Line '..' ("napcat 日志: {0}  {1:yyyy-MM-dd HH:mm}" -f $lg.Name, $lg.LastWriteTime) Gray }
  } else {
    Line '!!' 'logs 目录为空 —— napcat 未启动过' Yellow
  }
}

# ── ⑤ 运行时 ──
$qq = Get-Process QQ -ErrorAction SilentlyContinue
if ($qq) { Line 'OK' ("QQ 进程: {0} 个（PID {1}）" -f $qq.Count, ($qq.Id -join ',')) Green } else { Line '..' 'QQ 未运行' Gray }

$port = Test-NetConnection -ComputerName 127.0.0.1 -Port 6099 -InformationLevel Quiet -WarningAction SilentlyContinue
if ($port) { Line 'OK' 'WebUI 6099 已监听' Green } else { Line '!!' 'WebUI 6099 未监听 —— napcat 没跑起来' Yellow }

# ── 结论 ──
Write-Host ''
Write-Host '== 判读 ==' -ForegroundColor Cyan
if ($foundLoad -and $marks) {
  Line 'OK' '注入链路通：loadNapCat.js 被执行过。若 6099 仍不通，问题在 napcat.mjs 内部（版本适配/配置）。' Green
} elseif ($foundLoad) {
  Line '!!' 'loadNapCat.js 就位但从未执行：注入目标可能指错了 package.json，或 hook 未被 QQ 采用。' Yellow
  Line '..' '  试：用 snowcat-launch.ps1 重跑（它会自动定位 versions\<ver>\resources\app\package.json）。' Gray
} else {
  Line 'X' '加载器缺失，先补 loadNapCat.js 再谈注入。' Red
}

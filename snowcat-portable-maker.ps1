# SnowCat 雪猫 · 便携 QQ 制作器（Portable Maker）
#
# 两条产线（师父令）：
#   A. 官网最新包 → 一键解码 → 便携结构
#   B. 本机已装 QQ → 一键便携化（拷贝 versions 运行时到目标目录）
# 产物形态对齐 OneKey：SnowCat.Portable\<build>\QQ.exe + versions\<ver>\...
# 2026-11-11 立项

param(
  [Parameter(ParameterSetName = 'Online')]
  [switch]$FromOfficial,
  [Parameter(ParameterSetName = 'Local')]
  [switch]$FromInstalled,
  [Parameter(ParameterSetName = 'Local')]
  [string]$SourceQQ = '',
  [string]$OutDir = 'D:\SnowCat.Portable',
  [string]$Proxy = 'http://127.0.0.1:7890'
)

$ErrorActionPreference = 'Stop'
Write-Host '== SnowCat 雪猫便携 QQ 制作器 ==' -ForegroundColor Cyan

function Get-LatestQQUrl {
  # 官网下载配置（cdn-go pcConfig.json）抓 QQNT x64 直链；备用 dldir1 页面正则
  try {
    $cfg = (Invoke-WebRequest -Uri 'https://qq-web.cdn-go.cn/im.qq.com_new/latest/rainbow/pcConfig.json' -UseBasicParsing -Proxy $Proxy -TimeoutSec 30).Content | ConvertFrom-Json
    if ($cfg.Windows.ntDownloadX64Url) { return $cfg.Windows.ntDownloadX64Url }
    if ($cfg.Windows.ntDownloadUrl) { return $cfg.Windows.ntDownloadUrl }
  } catch {}
  # 备用：官网页面直链正则（老路径，dldir1）
  $urls = @()
  foreach ($page in @('https://im.qq.com/windowsQQ/index.shtml', 'https://im.qq.com/pcqq/index.shtml')) {
    try {
      $html = (Invoke-WebRequest -Uri $page -UseBasicParsing -Proxy $Proxy -TimeoutSec 30).Content
      $urls += [regex]::Matches($html, 'https?://dldir1\.qq\.com/[^\s"''<>]+?\.exe') | ForEach-Object { $_.Value }
    } catch {}
  }
  $urls = $urls | Select-Object -Unique | Where-Object { $_ -match 'QQNT|QQ(?!\d)' }
  return $urls | Select-Object -First 1
}

function Convert-ToPortable {
  param([string]$InstallerExe, [string]$Out)

  $stage = Join-Path $env:TEMP "snowcat-qq-$(Get-Random)"
  New-Item -ItemType Directory -Path $stage -Force | Out-Null
  Write-Host "[1/4] 解码安装包: $InstallerExe" -ForegroundColor Green
  # QQNT 安装包是自解压结构：先试 7z 直接解
  $seven = Get-Command 7z -ErrorAction SilentlyContinue
  $sevenExe = if ($seven) { '7z' } else { 'C:\Program Files\7-Zip\7z.exe' }
  if (-not (Test-Path $sevenExe)) {
    # NapCat OneKey 包里自带 7z
    $fallback = 'C:\dsh\tmp\onekey-unpack\7z.exe'
    if (Test-Path $fallback) { $sevenExe = $fallback } else { throw '需要 7z（装 7-Zip 或跑过 NapCat OneKey 解包）' }
  }
  & $sevenExe x $InstallerExe "-o$stage" -y | Out-Null

  # 找 QQ.exe 与 versions/
  $qqExe = Get-ChildItem $stage -Recurse -Filter 'QQ.exe' | Select-Object -First 1
  if (-not $qqExe) { throw '解包后未找到 QQ.exe' }
  $qqDir = $qqExe.DirectoryName

  Write-Host '[2/4] 组装便携结构' -ForegroundColor Green
  $dest = Join-Path $Out ('SnowCat.' + (Get-Date -Format 'yyyyMMdd'))
  New-Item -ItemType Directory -Path $dest -Force | Out-Null
  # 便携壳 = QQ.exe + dll 们 + versions/
  Copy-Item "$qqDir\*" $dest -Recurse -Force

  $verDir = Get-ChildItem (Join-Path $dest 'versions') -Directory -ErrorAction SilentlyContinue | Select-Object -First 1
  $verName = if ($verDir) { $verDir.Name } else { 'unknown' }

  # 记录配方
  @{
    made = (Get-Date -Format 's')
    source = $InstallerExe
    qq_version = $verName
    structure = 'OneKey-compatible portable'
    note = 'SnowCat 雪猫便携制作器产物；注入用 snowcat-launch.ps1'
  } | ConvertTo-Json | Set-Content (Join-Path $dest 'snowcat-portable.json') -Encoding UTF8

  Write-Host "[3/4] 清理暂存" -ForegroundColor Green
  Remove-Item $stage -Recurse -Force -ErrorAction SilentlyContinue
  Write-Host "[4/4] 完成: $dest  (QQ $verName)" -ForegroundColor Cyan
  Write-Host "注入: powershell -File snowcat-launch.ps1 -QQPath `"$dest\QQ.exe`"" -ForegroundColor Gray
}

if ($FromOfficial) {
  Write-Host '[1/4] 抓取官网最新 QQNT 直链…' -ForegroundColor Green
  $url = Get-LatestQQUrl
  if (-not $url) { throw '官网直链抓取失败，请手动到 im.qq.com 下载后走 Convert-ToPortable' }
  Write-Host "[✓] $url" -ForegroundColor Green
  $pkg = Join-Path $env:TEMP 'snowcat-qq-latest.exe'
  Write-Host '[2/4] 下载（走代理）…' -ForegroundColor Green
  Invoke-WebRequest -Uri $url -OutFile $pkg -Proxy $Proxy -TimeoutSec 1800 -UserAgent 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126'
  Convert-ToPortable -InstallerExe $pkg -Out $OutDir
} elseif ($FromInstalled) {
  $qq = $SourceQQ
  if (-not $qq) {
    # 复用启动器的发现逻辑
    $reg = Get-ItemProperty 'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\QQ' -ErrorAction SilentlyContinue
    if ($reg -and $reg.UninstallString) { $qq = (Split-Path $reg.UninstallString.Trim('"') -Parent) + '\QQ.exe' }
  }
  if (-not $qq -or -not (Test-Path $qq)) { throw '未找到已装 QQ，用 -SourceQQ 指定 QQ.exe' }
  Write-Host "[1/4] 已装 QQ: $qq" -ForegroundColor Green
  $qqDir = Split-Path $qq -Parent
  $dest = Join-Path $Out ('SnowCat.from-installed.' + (Get-Date -Format 'yyyyMMdd'))
  Write-Host "[2/4] 拷贝运行时 → $dest" -ForegroundColor Green
  New-Item -ItemType Directory -Path $dest -Force | Out-Null
  Copy-Item "$qqDir\*" $dest -Recurse -Force
  $verDir = Get-ChildItem (Join-Path $dest 'versions') -Directory -ErrorAction SilentlyContinue | Select-Object -First 1
  $verName = if ($verDir) { $verDir.Name } else { 'unknown' }
  @{ made = (Get-Date -Format 's'); source = $qq; qq_version = $verName } |
    ConvertTo-Json | Set-Content (Join-Path $dest 'snowcat-portable.json') -Encoding UTF8
  Write-Host "[3/4] 完成: $dest  (QQ $verName)" -ForegroundColor Cyan
  Write-Host "[4/4] 注入: powershell -File snowcat-launch.ps1 -QQPath `"$dest\QQ.exe`"" -ForegroundColor Gray
} else {
  Write-Host '用法:'
  Write-Host '  官网最新包→便携:  .\snowcat-portable-maker.ps1 -FromOfficial'
  Write-Host '  已装QQ→便携:      .\snowcat-portable-maker.ps1 -FromInstalled [-SourceQQ C:\...\QQ.exe]'
  Write-Host '  输出目录:          -OutDir D:\SnowCat.Portable'
}

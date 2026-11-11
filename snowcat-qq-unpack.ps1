# SnowCat 雪猫 · QQ 官方安装包解包器（QQ Unpacker）
#
# 把官方最新 QQNT 安装包（QQ_9.9.37_261103_x64_01.exe 形态）一键解码成 OneKey 兼容便携结构。
# 支持：本地安装包路径 / 官网直链自动下载（走 pcConfig.json 抓最新 x64 包）。
# 产物：<OutDir>\SnowCat.<ver>.Shell\ = QQ.exe + dll + versions\<ver>\ 完整运行时。
# 用法:
#   .\snowcat-qq-unpack.ps1 -Installer "D:\Downloads\QQ_9.9.37_261103_x64_01.exe"
#   .\snowcat-qq-unpack.ps1 -FromOfficial                    # 自动抓最新直链下载+解包
#   .\snowcat-qq-unpack.ps1 -Installer xxx.exe -OutDir D:\SnowCat.Portable
# 2026-11-12 成件（9.9.37-54395 实弹验证）

param(
  [string]$Installer = '',
  [switch]$FromOfficial,
  [string]$OutDir = 'D:\SnowCat.Portable',
  [string]$Proxy = 'http://127.0.0.1:7890'
)

$ErrorActionPreference = 'Stop'
Write-Host '== SnowCat 雪猫 QQ 解包器 ==' -ForegroundColor Cyan

function Get-SevenZip {
  $candidates = @('7z', 'C:\Program Files\7-Zip\7z.exe', 'C:\dsh\tmp\onekey-unpack\7z.exe')
  foreach ($c in $candidates) {
    $cmd = Get-Command $c -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    if (Test-Path $c) { return $c }
  }
  throw '需要 7z（装 7-Zip 或跑过 NapCat OneKey 解包）'
}

function Get-OfficialUrl {
  # 官网下载配置（cdn-go pcConfig.json）→ Windows x64 直链
  try {
    $cfg = (Invoke-WebRequest -Uri 'https://qq-web.cdn-go.cn/im.qq.com_new/latest/rainbow/pcConfig.json' -UseBasicParsing -Proxy $Proxy -TimeoutSec 30).Content | ConvertFrom-Json
    if ($cfg.Windows.ntDownloadX64Url) { return $cfg.Windows.ntDownloadX64Url }
    if ($cfg.Windows.ntDownloadUrl) { return $cfg.Windows.ntDownloadUrl }
  } catch {}
  throw '官网 pcConfig.json 抓取失败（可手动下载后用 -Installer 指定）'
}

function Convert-ToPortable {
  param([string]$InstallerExe, [string]$Out)

  $seven = Get-SevenZip
  $stage = Join-Path $env:TEMP "snowcat-unpack-$(Get-Random)"
  New-Item -ItemType Directory -Path $stage -Force | Out-Null

  Write-Host "[1/5] 7z 解码: $InstallerExe" -ForegroundColor Green
  & $seven x $InstallerExe "-o$stage" -y | Out-Null

  # 找 QQ.exe（新包在 Files\ 下）
  $qqExe = Get-ChildItem $stage -Recurse -Filter 'QQ.exe' | Where-Object { $_.DirectoryName -notmatch 'QQKit|ScreenShot' } | Select-Object -First 1
  if (-not $qqExe) { throw '解包后未找到 QQ.exe' }
  $root = $qqExe.DirectoryName

  # 读实况版本（versions/*/resources/app/package.json）
  Write-Host '[2/5] 读实况版本' -ForegroundColor Green
  $verName = 'unknown'
  $pkgJson = Get-ChildItem $root -Recurse -Filter 'package.json' -Depth 4 | Where-Object { $_.FullName -match 'versions.*resources.app' } | Select-Object -First 1
  if ($pkgJson) {
    try { $verName = ($pkgJson | Get-Content -Raw | ConvertFrom-Json).version } catch {}
  }
  if ($verName -eq 'unknown') { $verName = (Get-Item $qqExe).VersionInfo.ProductVersion }

  Write-Host "[3/5] 组装便携结构（QQ $verName）" -ForegroundColor Green
  $dest = Join-Path $Out ("SnowCat." + $verName + ".Shell")
  New-Item -ItemType Directory -Path $dest -Force | Out-Null
  Copy-Item "$root\*" $dest -Recurse -Force

  Write-Host '[4/5] 写配方档案' -ForegroundColor Green
  $meta = @{
    made = (Get-Date -Format 's')
    source = $InstallerExe
    qq_version = $verName
    structure = 'OneKey-compatible portable'
    note = 'SnowCat 雪猫解包器产物；注入用 snowcat-launch.ps1'
  }
  $metaJson = $meta | ConvertTo-Json
  [IO.File]::WriteAllText((Join-Path $dest 'snowcat-portable.json'), $metaJson, (New-Object System.Text.UTF8Encoding($false)))

  Write-Host '[5/5] 清理暂存' -ForegroundColor Green
  Remove-Item $stage -Recurse -Force -ErrorAction SilentlyContinue

  Write-Host "[✓] 完成: $dest (QQ $verName)" -ForegroundColor Cyan
  Write-Host "注入: powershell -File snowcat-launch.ps1 -QQPath `"$dest\QQ.exe`"" -ForegroundColor Gray
}

if ($FromOfficial) {
  Write-Host '[0/5] 抓官网最新直链…' -ForegroundColor Green
  $url = Get-OfficialUrl
  Write-Host "[✓] $url" -ForegroundColor Green
  $pkg = Join-Path $env:TEMP 'snowcat-qq-latest.exe'
  Write-Host '[下载] 走浏览器线或代理（qqdl CDN 可能拒脚本 UA，失败时用真浏览器下载后 -Installer 指定）…' -ForegroundColor Yellow
  try {
    Invoke-WebRequest -Uri $url -OutFile $pkg -Proxy $Proxy -TimeoutSec 1800 -UserAgent 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126'
  } catch {
    Write-Host "[X] 代理下载失败: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host '    官网 CDN 对脚本流量 403 时：用真浏览器打开 https://im.qq.com/index/#/windows 点「Windows 64位 版下载」，完成后 -Installer 指定文件' -ForegroundColor Yellow
    exit 1
  }
  Convert-ToPortable -InstallerExe $pkg -Out $OutDir
} elseif ($Installer) {
  if (-not (Test-Path $Installer)) { throw "安装包不存在: $Installer" }
  Convert-ToPortable -InstallerExe $Installer -Out $OutDir
} else {
  Write-Host '用法:'
  Write-Host '  本地包解包:  .\snowcat-qq-unpack.ps1 -Installer "D:\...\QQ_9.9.37_261103_x64_01.exe"'
  Write-Host '  官网全自动:  .\snowcat-qq-unpack.ps1 -FromOfficial'
  Write-Host '  输出目录:    -OutDir D:\SnowCat.Portable'
}

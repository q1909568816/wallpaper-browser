$logFile = [System.IO.Path]::GetTempPath() + "wpb-handler.log"

function log($msg) {
    $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "$ts | $msg" | Out-File $logFile -Append -Encoding UTF8
}

log "=== START ==="
log "raw args[0]: $($args[0])"

$protocolUrl = $args[0]
$uri = [System.Uri]$protocolUrl
$action = $uri.Host
$workshopId = $null
if ($uri.Query -match '[&?]id=([^&]+)') { $workshopId = [System.Uri]::UnescapeDataString($matches[1]) }
log "action=$action workshopId=$workshopId"

if ([string]::IsNullOrWhiteSpace($workshopId)) { log "empty workshopId"; exit }

try {
    $steamPath = (Get-ItemProperty "HKCU:\Software\Valve\Steam").SteamPath
    $steamPath = [System.IO.Path]::GetFullPath($steamPath)
    log "steamPath=$steamPath"
} catch { log "steamPath read error: $_"; exit }

$libraryVdf = Join-Path $steamPath "config\libraryfolders.vdf"
log "libraryVdf=$libraryVdf exists=$(Test-Path $libraryVdf)"
$libraryPaths = @()
if (Test-Path $libraryVdf) {
    Get-Content $libraryVdf -Encoding UTF8 | ForEach-Object {
        if ($_ -match '"path"\s+"([^"]+)"') {
            $libraryPaths += $matches[1].Replace("\\", "\")
        }
    }
}
$libraryPaths += $steamPath
$libraryPaths = $libraryPaths | Select-Object -Unique
log "libraryPaths count=$($libraryPaths.Count)"

$wallpaperDir = $null
foreach ($lib in $libraryPaths) {
    $dirPath = Join-Path $lib "steamapps\workshop\content\431960\$workshopId"
    $exists = Test-Path $dirPath
    log "check: $dirPath => $exists"
    if ($exists) {
        $wallpaperDir = $dirPath
        break
    }
}
log "wallpaperDir=$wallpaperDir"

if (-not $wallpaperDir) {
    [System.Reflection.Assembly]::LoadWithPartialName("System.Windows.Forms") | Out-Null
    [System.Windows.Forms.MessageBox]::Show("未找到本地壁纸 ID: $workshopId", "错误", "OK", "Error")
    log "EXIT: not found"
    exit
}

if ($action -eq "open") {
    $subPath = $null
    if ($uri.Query -match '[&?]path=([^&]+)') {
        $subPath = [System.Uri]::UnescapeDataString($matches[1]).Replace('/', '\')
    }
    if ($subPath) {
        $targetDir = Join-Path $wallpaperDir $subPath
    } else {
        $targetDir = $wallpaperDir
    }
    if (-not (Test-Path $targetDir)) { $targetDir = $wallpaperDir }
    Start-Process explorer.exe $targetDir
    log "open done target=$targetDir"
    exit
}

$wallpaperProject = Join-Path $wallpaperDir "project.json"
log "wallpaperProject=$wallpaperProject exists=$(Test-Path $wallpaperProject)"
if (-not (Test-Path $wallpaperProject)) {
    [System.Reflection.Assembly]::LoadWithPartialName("System.Windows.Forms") | Out-Null
    [System.Windows.Forms.MessageBox]::Show("壁纸缺少 project.json: $workshopId", "错误", "OK", "Error")
    log "EXIT: no project.json"
    exit
}
# 6. 定位 Wallpaper Engine 主程序（搜索所有库目录 + 大小写不敏感）
$weExe = $null
foreach ($lib in $libraryPaths) {
    $commonDir = Join-Path $lib 'steamapps\common'
    if (-not (Test-Path $commonDir)) { continue }
    $weDirs = Get-ChildItem $commonDir -Directory -Filter '*wallpaper*engine*' -ErrorAction SilentlyContinue
    foreach ($weDir in $weDirs) {
        $test64 = Join-Path $weDir.FullName 'wallpaper64.exe'
        $test32 = Join-Path $weDir.FullName 'wallpaper32.exe'
        if (Test-Path $test64) { $weExe = $test64; break }
        if (Test-Path $test32) { $weExe = $test32; break }
    }
    if ($weExe) { break }
}
log "weExe=$weExe"

if (-not $weExe) { log "EXIT: no weExe"; exit }

$processName = [System.IO.Path]::GetFileNameWithoutExtension($weExe)
$running = Get-Process -Name $processName -ErrorAction SilentlyContinue
log "WE running=$($running -ne $null)"

if (-not $running) {
    Start-Process -FilePath $weExe -WindowStyle Hidden
    Start-Sleep -Seconds 5
    log "WE started"
}

$argsStr = "-control openWallpaper -file `"$wallpaperProject`""
$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = $weExe
$psi.Arguments = $argsStr
$psi.UseShellExecute = $false
$psi.CreateNoWindow = $true
[System.Diagnostics.Process]::Start($psi) | Out-Null
log "=== DONE ==="

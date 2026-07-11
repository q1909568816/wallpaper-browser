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

if ($action -eq "addplaylist") {
    $weDir = Split-Path -Parent $weExe
    $configPath = Join-Path $weDir 'config.json'
    if (-not (Test-Path $configPath)) { log "EXIT: no config.json"; exit }
    $mediaExtensions = @('.mp4', '.avi', '.mkv', '.webm', '.mov', '.wmv', '.pkg')
    $mediaFile = Get-ChildItem $wallpaperDir -File | Where-Object { $mediaExtensions -contains $_.Extension } | Select-Object -First 1
    if (-not $mediaFile) { log "EXIT: no media/scene file in wallpaper dir"; exit }
    $mediaPath = $mediaFile.FullName.Replace('\', '/')
    log "mediaPath=$mediaPath"
    if ($running) {
        log "WARN: WE is running; please fully exit Wallpaper Engine before adding, or the change will be overwritten on exit"
    }
    try {
        $enc = New-Object System.Text.UTF8Encoding($false)
        $raw = [System.IO.File]::ReadAllText($configPath, $enc)
        $m = [regex]::Match($raw, '"playlist"\s*:\s*\{\s*"items"\s*:\s*(?<nl>\r?\n)(?<open>\t*)\[(?<body>[^\]]*?)(?<close>\t*)\]')
        if (-not $m.Success) { log "EXIT: active playlist not found in selectedwallpapers"; exit }
        $body = $m.Groups['body'].Value
        if ($body.Contains($mediaPath)) { log "already in active playlist"; log "=== DONE addplaylist ==="; exit }
        $nl = $m.Groups['nl'].Value
        $itemLines = $body -split "`n" | Where-Object { $_.Trim().StartsWith('"') }
        if ($itemLines.Count -gt 0) {
            $itemIndent = ([regex]::Match($itemLines[-1], '^\s*')).Value.Trim("`r", "`n")
        } else {
            $itemIndent = $m.Groups['open'].Value + "`t"
        }
        if ($body.Trim().Length -eq 0) {
            $newBody = $nl + $itemIndent + '"' + $mediaPath + '"' + $nl
        } else {
            $newBody = $body.TrimEnd() + ',' + $nl + $itemIndent + '"' + $mediaPath + '"' + $nl
        }
        $bracketPos = $m.Value.IndexOf('[')
        $replacement = $m.Value.Substring(0, $bracketPos + 1) + $newBody + $m.Groups['close'].Value + ']'
        $raw = $raw.Substring(0, $m.Index) + $replacement + $raw.Substring($m.Index + $m.Length)
        [System.IO.File]::WriteAllText($configPath, $raw, $enc)
        log "added to active playlist: $mediaPath"
    } catch { log "config write error: $_" }
    log "=== DONE addplaylist ==="
    exit
}

$argsStr = "-control openWallpaper -file `"$wallpaperProject`""

if ($running) {
    # WE 已运行：通过 IPC 静默切换，不创建窗口
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = $weExe
    $psi.Arguments = $argsStr
    $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $true
    [System.Diagnostics.Process]::Start($psi) | Out-Null
} else {
    # WE 未运行：一步启动+应用壁纸，不弹主界面
    Start-Process -FilePath $weExe -ArgumentList $argsStr -WindowStyle Hidden
    Start-Sleep -Seconds 2
}
log "=== DONE ==="

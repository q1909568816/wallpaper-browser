@echo off
chcp 65001 >nul
title Wallpaper Engine 静默协议安装

:: 创建工作目录
set "WORK_DIR=%APPDATA%\WallpaperBrowser"
if not exist "%WORK_DIR%" md "%WORK_DIR%"

:: 生成 PowerShell 静默处理脚本
(
echo # 接收协议参数
echo $protocolUrl = $args[0]
echo $uri = [System.Uri]$protocolUrl
echo $action = $uri.Host
echo $workshopId = $null
echo if ($uri.Query -match 'id=(.+)$') { $workshopId = [System.Uri]::UnescapeDataString($matches[1]) }
echo.
echo if ([string]::IsNullOrWhiteSpace($workshopId)) { exit }
echo.
echo # 1. 读取 Steam 安装路径
echo try {
echo     $steamPath = (Get-ItemProperty "HKCU:\Software\Valve\Steam").SteamPath
echo     $steamPath = [System.IO.Path]::GetFullPath($steamPath)
echo } catch { exit }
echo.
echo # 2. 解析所有 Steam 库目录
echo $libraryVdf = Join-Path $steamPath "config\libraryfolders.vdf"
echo $libraryPaths = @()
echo if (Test-Path $libraryVdf) {
echo     Get-Content $libraryVdf -Encoding UTF8 ^| ForEach-Object {
echo         if ($_ -match '"path"\s+"(.+)"') {
echo             $libraryPaths += $matches[1].Replace("\\", "\")
echo         }
echo     }
echo }
echo $libraryPaths += $steamPath
echo $libraryPaths = $libraryPaths ^| Select-Object -Unique
echo.
echo # 3. 定位本地壁纸目录
echo $wallpaperDir = $null
echo foreach ($lib in $libraryPaths) {
echo     $dirPath = Join-Path $lib "steamapps\workshop\content\431960\$workshopId"
echo     if (Test-Path $dirPath) {
echo         $wallpaperDir = $dirPath
echo         break
echo     }
echo }
echo if (-not $wallpaperDir) {
echo     [System.Reflection.Assembly]::LoadWithPartialName("System.Windows.Forms") ^| Out-Null
echo     [System.Windows.Forms.MessageBox]::Show("未找到本地壁纸 ID: $workshopId", "错误", "OK", "Error")
echo     exit
echo }
echo.
echo # 4. action = open：直接打开本地目录，无需 Wallpaper Engine
echo if ($action -eq "open") {
echo     Start-Process explorer.exe $wallpaperDir
echo     exit
echo }
echo.
echo # 5. action = apply：查找项目文件
echo $wallpaperProject = Join-Path $wallpaperDir "project.json"
echo if (-not (Test-Path $wallpaperProject)) {
echo     [System.Reflection.Assembly]::LoadWithPartialName("System.Windows.Forms") ^| Out-Null
echo     [System.Windows.Forms.MessageBox]::Show("壁纸缺少 project.json: $workshopId", "错误", "OK", "Error")
echo     exit
echo }
echo.
echo # 6. 定位 Wallpaper Engine 主程序（优先64位）
echo $weExe = $null
echo foreach ($lib in $libraryPaths) {
echo     $test64 = Join-Path $lib "steamapps\common\Wallpaper Engine\wallpaper64.exe"
echo     if (Test-Path $test64) { $weExe = $test64; break }
echo     $test32 = Join-Path $lib "steamapps\common\Wallpaper Engine\wallpaper32.exe"
echo     if (Test-Path $test32) { $weExe = $test32; break }
echo }
echo if (-not $weExe) { exit }
echo.
echo # 7. 检测 WE 是否运行，未运行则静默启动
echo $processName = [System.IO.Path]::GetFileNameWithoutExtension($weExe)
echo $running = Get-Process -Name $processName -ErrorAction SilentlyContinue
echo.
echo if (-not $running) {
echo     # 静默启动 WE，不显示主界面
echo     Start-Process -FilePath $weExe -ArgumentList "-silent" -WindowStyle Hidden
echo     # 等待初始化完成（根据机器性能可调整时长）
echo     Start-Sleep -Seconds 3
echo }
echo.
echo # 8. 发送控制命令，静默切换壁纸（官方原生支持，无界面弹出）
echo Start-Process -FilePath $weExe -ArgumentList "-control openWallpaper -file `"$wallpaperProject`"" -WindowStyle Hidden
) > "%WORK_DIR%\handler.ps1"

:: 注册自定义协议
reg add "HKEY_CLASSES_ROOT\wallpaper-browser" /ve /d "URL:Wallpaper Browser Protocol" /f >nul
reg add "HKEY_CLASSES_ROOT\wallpaper-browser" /v "URL Protocol" /d "" /f >nul
reg add "HKEY_CLASSES_ROOT\wallpaper-browser\shell\open\command" /ve /d "powershell.exe -WindowStyle Hidden -ExecutionPolicy Bypass -File \"%WORK_DIR%\handler.ps1\" \"%%1\"" /f >nul

:: 生成并执行标记脚本，往各 Steam 库的 steamapps 目录写入检测标记（供网页判断协议是否已安装）
(
echo try {
echo     $steamPath = (Get-ItemProperty "HKCU:\Software\Valve\Steam").SteamPath
echo } catch { exit }
echo $libraryVdf = Join-Path $steamPath "config\libraryfolders.vdf"
echo $libraryPaths = @($steamPath^)
echo if (Test-Path $libraryVdf) {
echo     Get-Content $libraryVdf -Encoding UTF8 ^| ForEach-Object {
echo         if ($_ -match '"path"\s+"(.+)"') {
echo             $libraryPaths += $matches[1].Replace("\\", "\")
echo         }
echo     }
echo }
echo $libraryPaths = $libraryPaths ^| Select-Object -Unique
echo foreach ($lib in $libraryPaths) {
echo     $sa = Join-Path $lib "steamapps"
echo     if (Test-Path $sa) {
echo         Set-Content -Path (Join-Path $sa ".wpb-protocol") -Value "installed" -Force -Encoding UTF8
echo     }
echo     $content431960 = Join-Path $lib "steamapps\workshop\content\431960"
echo     if (Test-Path $content431960) {
echo         Set-Content -Path (Join-Path $content431960 ".wpb-protocol") -Value "installed" -Force -Encoding UTF8
echo     }
echo }
) > "%WORK_DIR%\marker.ps1"
powershell.exe -WindowStyle Hidden -ExecutionPolicy Bypass -File "%WORK_DIR%\marker.ps1"

echo ========================================
echo  静默协议安装完成！
echo  设置壁纸：wallpaper-browser://apply?id=壁纸ID
echo  打开目录：wallpaper-browser://open?id=壁纸ID
echo  特性：无黑框、无WE主界面、后台静默切换
echo ========================================
echo.
echo 按任意键退出...
pause >nul

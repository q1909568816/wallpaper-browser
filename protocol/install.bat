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
echo $query = [System.Web.HttpUtility]::ParseQueryString($uri.Query)
echo $workshopId = $query.Get("id")
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
echo # 3. 定位 Wallpaper Engine 主程序（优先64位）
echo $weExe = $null
echo foreach ($lib in $libraryPaths) {
echo     $test64 = Join-Path $lib "steamapps\common\Wallpaper Engine\wallpaper64.exe"
echo     if (Test-Path $test64) { $weExe = $test64; break }
echo     $test32 = Join-Path $lib "steamapps\common\Wallpaper Engine\wallpaper32.exe"
echo     if (Test-Path $test32) { $weExe = $test32; break }
echo }
echo if (-not $weExe) { exit }
echo.
echo # 4. 查找本地壁纸项目文件
echo $wallpaperProject = $null
echo foreach ($lib in $libraryPaths) {
echo     $projectPath = Join-Path $lib "steamapps\workshop\content\431960\$workshopId\project.json"
echo     if (Test-Path $projectPath) {
echo         $wallpaperProject = $projectPath
echo         break
echo     }
echo }
echo if (-not $wallpaperProject) {
echo     # 如需错误提示，取消下面两行注释
echo     [System.Reflection.Assembly]::LoadWithPartialName("System.Windows.Forms") ^| Out-Null
echo     [System.Windows.Forms.MessageBox]::Show("未找到本地壁纸 ID: $workshopId", "错误", "OK", "Error")
echo     exit
echo }
echo.
echo # 5. 检测 WE 是否运行，未运行则静默启动
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
echo # 6. 发送控制命令，静默切换壁纸（官方原生支持，无界面弹出）
echo Start-Process -FilePath $weExe -ArgumentList "-control openWallpaper -file `"$wallpaperProject`"" -WindowStyle Hidden
) > "%WORK_DIR%\handler.ps1"

:: 注册自定义协议
reg add "HKEY_CLASSES_ROOT\wallpaper-browser" /ve /d "URL:Wallpaper Browser Protocol" /f >nul
reg add "HKEY_CLASSES_ROOT\wallpaper-browser" /v "URL Protocol" /d "" /f >nul
reg add "HKEY_CLASSES_ROOT\wallpaper-browser\shell\open\command" /ve /d "powershell.exe -WindowStyle Hidden -ExecutionPolicy Bypass -File \"%WORK_DIR%\handler.ps1\" \"%%1\"" /f >nul

echo ========================================
echo  静默协议安装完成！
echo  调用格式：wallpaper-browser://apply?id=壁纸ID
echo  特性：无黑框、无WE主界面、后台静默切换
echo ========================================
echo.
echo 按任意键退出...
pause >nul

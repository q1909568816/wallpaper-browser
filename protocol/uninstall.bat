@echo off
chcp 65001 >nul
title Wallpaper Engine 协议卸载

:: 删除注册表自定义协议
reg delete "HKEY_CLASSES_ROOT\wallpaper-browser" /f >nul 2>&1

:: 删除各 Steam 库 steamapps 目录下的检测标记文件
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
echo     Remove-Item (Join-Path $lib "steamapps\.wpb-protocol") -Force -ErrorAction SilentlyContinue
echo     Remove-Item (Join-Path $lib "steamapps\workshop\content\431960\.wpb-protocol") -Force -ErrorAction SilentlyContinue
echo }
) > "%TEMP%\wpb-unmark.ps1"
powershell.exe -WindowStyle Hidden -ExecutionPolicy Bypass -File "%TEMP%\wpb-unmark.ps1"
del "%TEMP%\wpb-unmark.ps1" >nul 2>&1

:: 删除本地处理脚本目录
rd /s /q "%APPDATA%\WallpaperBrowser" 2>nul

echo ========================================
echo  卸载完成
echo  已清理自定义协议、检测标记与本地脚本文件
echo ========================================
echo.
echo 按任意键退出...
pause >nul

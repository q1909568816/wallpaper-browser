@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
title Wallpaper Browser 协议卸载

echo [1/3] 删除注册表协议...
reg delete "HKCU\Software\Classes\wallpaper-browser" /f >nul 2>&1

echo [2/3] 清理检测标记...
powershell.exe -WindowStyle Hidden -ExecutionPolicy Bypass -Command ^
 "try{$sp=(Get-ItemProperty 'HKCU:\Software\Valve\Steam').SteamPath}catch{exit};$paths=@($sp);$vf=Join-Path $sp 'config\libraryfolders.vdf';if(Test-Path $vf){Get-Content $vf -Enc UTF8 | ForEach-Object{if($_ -match '\"path\"\s+\"(.+)\"'){$paths+=$matches[1]}}};$paths=$paths|Select -Unique;foreach($p in $paths){Remove-Item (Join-Path $p 'steamapps\.wpb-protocol') -Force -EA 0;Remove-Item (Join-Path $p 'steamapps\workshop\content\431960\.wpb-protocol') -Force -EA 0}"

echo [3/3] 删除本地脚本...
rd /s /q "%APPDATA%\WallpaperBrowser" 2>nul

echo.
echo ========================================
echo  卸载完成！
echo ========================================
echo.
pause

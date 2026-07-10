@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
title Wallpaper Browser 协议安装

set "WORK_DIR=%APPDATA%\WallpaperBrowser"
if not exist "%WORK_DIR%" mkdir "%WORK_DIR%"
if errorlevel 1 (
    echo 创建目录失败: %WORK_DIR%
    pause
    exit /b 1
)

echo [1/3] 复制脚本文件...
copy /y "%~dp0handler.ps1" "%WORK_DIR%\" >nul 2>&1
if errorlevel 1 (
    echo 错误：复制 handler.ps1 失败
    echo 源路径=%~dp0handler.ps1
    echo 目标路径=%WORK_DIR%\
    pause
    exit /b 1
)
copy /y "%~dp0marker.ps1" "%WORK_DIR%\" >nul 2>&1

echo [2/3] 注册自定义协议 HKCU...
set "CMD=powershell.exe -WindowStyle Hidden -ExecutionPolicy Bypass -File \"%WORK_DIR%\handler.ps1\" \"%%1\""
reg add "HKCU\Software\Classes\wallpaper-browser" /ve /d "URL:Wallpaper Browser Protocol" /f >nul 2>&1
reg add "HKCU\Software\Classes\wallpaper-browser" /v "URL Protocol" /d "" /f >nul 2>&1
reg add "HKCU\Software\Classes\wallpaper-browser\shell\open\command" /ve /d "!CMD!" /f >nul 2>&1

echo [3/3] 写入安装标记...
powershell.exe -WindowStyle Hidden -ExecutionPolicy Bypass -File "%WORK_DIR%\marker.ps1"
del "%WORK_DIR%\marker.ps1" >nul 2>&1

echo.
echo   安装完成
echo   wallpaper-browser://open?id=ID  打开目录
echo   wallpaper-browser://apply?id=ID 设置壁纸
echo.
pause

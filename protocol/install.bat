@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
title Wallpaper Browser Install

set "WORK_DIR=%APPDATA%\WallpaperBrowser"
if not exist "%WORK_DIR%" mkdir "%WORK_DIR%"
if errorlevel 1 (
    echo Error: cannot create %WORK_DIR%
    pause
    exit /b 1
)

echo [1/3] Copying script files...
copy /y "%~dp0handler.ps1" "%WORK_DIR%\" >nul 2>&1
if errorlevel 1 (
    echo Error: copy handler.ps1 failed
    pause
    exit /b 1
)
copy /y "%~dp0marker.ps1" "%WORK_DIR%\" >nul 2>&1

echo [2/3] Registering protocol...
set "CMD=powershell.exe -WindowStyle Hidden -ExecutionPolicy Bypass -File \"%WORK_DIR%\handler.ps1\" \"%%1\""
reg add "HKCU\Software\Classes\wallpaper-browser" /ve /d "URL:Wallpaper Browser Protocol" /f >nul 2>&1
reg add "HKCU\Software\Classes\wallpaper-browser" /v "URL Protocol" /d "" /f >nul 2>&1
reg add "HKCU\Software\Classes\wallpaper-browser\shell\open\command" /ve /d "!CMD!" /f >nul 2>&1

echo [3/3] Writing markers...
powershell.exe -WindowStyle Hidden -ExecutionPolicy Bypass -File "%WORK_DIR%\marker.ps1"
del "%WORK_DIR%\marker.ps1" >nul 2>&1

echo.
echo   Install complete
echo   wallpaper-browser://open?id=ID  open folder
echo   wallpaper-browser://apply?id=ID apply wallpaper
echo.
pause

@echo off
setlocal
chcp 65001 >nul
title Wallpaper Browser Uninstall

echo [1/3] Cleaning registry...
reg delete "HKCU\Software\Classes\wallpaper-browser" /f >nul 2>&1
if errorlevel 1 (echo   Not registered) else (echo   Removed)

echo [2/3] Cleaning marker files...
powershell.exe -ExecutionPolicy Bypass -File "%~dp0cleanup.ps1"
echo   Done

echo [3/3] Removing scripts...
rd /s /q "%APPDATA%\WallpaperBrowser" 2>nul
if errorlevel 1 (echo   Already removed) else (echo   Removed)

echo.
echo   Uninstall complete
echo.
pause

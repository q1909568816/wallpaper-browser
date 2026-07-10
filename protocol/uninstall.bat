@echo off
chcp 65001 >nul
title Wallpaper Engine 协议卸载

:: 删除注册表自定义协议
reg delete "HKEY_CLASSES_ROOT\wallpaper-browser" /f >nul 2>&1

:: 删除本地处理脚本目录
rd /s /q "%APPDATA%\WallpaperBrowser" 2>nul

echo ========================================
echo  卸载完成
echo  已清理自定义协议与本地脚本文件
echo ========================================
echo.
echo 按任意键退出...
pause >nul

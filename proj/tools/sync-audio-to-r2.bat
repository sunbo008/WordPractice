@echo off
REM 音频同步到 R2 自动化脚本（Windows 批处理版本）
REM
REM 功能：
REM 1. 自动下载缺失的单词音频（通过有道 API）
REM 2. 自动上传音频文件到 Cloudflare R2
REM
REM 使用方法：
REM   双击运行或在命令行中执行：sync-audio-to-r2.bat

setlocal enabledelayedexpansion

cd /d "%~dp0"

echo ========================================================
echo        音频同步到 R2 自动化工具
echo ========================================================
echo.

REM ============================================
REM 步骤 1：检查依赖
REM ============================================

echo [检查] 检查环境依赖...

REM 检查 Python
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [错误] 未找到 Python，请先安装 Python 3
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('python --version') do set PYTHON_VERSION=%%i
echo [成功] Python: %PYTHON_VERSION%

REM 检查 Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [错误] 未找到 Node.js，请先安装 Node.js
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo [成功] Node.js: %NODE_VERSION%

REM 检查 npm 依赖
if not exist "node_modules" (
    echo [警告] 未找到 node_modules，正在安装依赖...
    call npm install
    if !errorlevel! neq 0 (
        echo [错误] npm 依赖安装失败
        pause
        exit /b 1
    )
    echo [成功] npm 依赖安装成功
)

echo.

REM ============================================
REM 步骤 2：下载单词音频
REM ============================================

echo ========================================================
echo 步骤 1/2: 下载单词音频（通过有道 API）
echo ========================================================
echo.

python download_word_audio.py

if %errorlevel% neq 0 (
    echo.
    echo [错误] 音频下载失败，终止执行
    pause
    exit /b 1
)

echo.
echo [成功] 音频下载完成！
echo.

REM ============================================
REM 步骤 3：上传到 R2
REM ============================================

echo ========================================================
echo 步骤 2/2: 上传音频文件到 Cloudflare R2
echo ========================================================
echo.

REM 检查 .env 文件
if not exist "..\..\\.env" (
    echo [错误] 未找到 .env 文件
    echo.
    echo 请在项目根目录创建 .env 文件并配置 R2 凭证：
    echo.
    echo   cd ..\..
    echo   copy .env.example .env
    echo   notepad .env
    echo.
    echo 添加以下内容：
    echo   R2_ACCOUNT_ID=your_account_id
    echo   R2_ACCESS_KEY_ID=your_access_key_id
    echo   R2_SECRET_ACCESS_KEY=your_secret_access_key
    echo   R2_BUCKET_NAME=wordpractice-assets
    echo.
    pause
    exit /b 1
)

node upload-to-r2.js

if %errorlevel% neq 0 (
    echo.
    echo [错误] R2 上传失败
    pause
    exit /b 1
)

echo.

REM ============================================
REM 完成
REM ============================================

echo ========================================================
echo   所有任务完成！
echo --------------------------------------------------------
echo   [成功] 音频已下载
echo   [成功] 音频已上传到 R2
echo ========================================================
echo.

pause


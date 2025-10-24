#!/bin/bash
#
# 音频同步到 R2 自动化脚本
# 
# 功能：
# 1. 自动下载缺失的单词音频（通过有道 API）
# 2. 自动上传音频文件到 Cloudflare R2
# 
# 使用方法：
#   bash sync-audio-to-r2.sh
#   或者在 Git Bash 中：
#   ./sync-audio-to-r2.sh

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 获取脚本所在目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       音频同步到 R2 自动化工具                        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# ============================================
# 步骤 1：检查依赖
# ============================================

echo -e "${YELLOW}[检查] 检查环境依赖...${NC}"

# 检查 Python
if ! command -v python &> /dev/null && ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ 错误: 未找到 Python，请先安装 Python 3${NC}"
    exit 1
fi

# 优先使用 python（而不是 python3），因为 Windows 上 python 通常更完整
if command -v python &> /dev/null; then
    PYTHON_CMD="python"
else
    PYTHON_CMD="python3"
fi

echo -e "${GREEN}✅ Python: $($PYTHON_CMD --version)${NC}"

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ 错误: 未找到 Node.js，请先安装 Node.js${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js: $(node --version)${NC}"

# 检查 npm 依赖
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}⚠️  未找到 node_modules，正在安装依赖...${NC}"
    npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ npm 依赖安装失败${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ npm 依赖安装成功${NC}"
fi

echo ""

# ============================================
# 步骤 2：下载单词音频
# ============================================

echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}步骤 1/2: 下载单词音频（通过有道 API）${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""

$PYTHON_CMD download_word_audio.py

if [ $? -ne 0 ]; then
    echo ""
    echo -e "${RED}❌ 音频下载失败，终止执行${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ 音频下载完成！${NC}"
echo ""

# ============================================
# 步骤 3：上传到 R2
# ============================================

echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}步骤 2/2: 上传音频文件到 Cloudflare R2${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""

# 检查 .env 文件是否存在
if [ ! -f "../../.env" ]; then
    echo -e "${RED}❌ 错误: 未找到 .env 文件${NC}"
    echo -e "${YELLOW}请在项目根目录创建 .env 文件并配置 R2 凭证：${NC}"
    echo ""
    echo "  cd ../.."
    echo "  nano .env"
    echo ""
    echo "添加以下内容："
    echo "  R2_ACCOUNT_ID=your_account_id"
    echo "  R2_ACCESS_KEY_ID=your_access_key_id"
    echo "  R2_SECRET_ACCESS_KEY=your_secret_access_key"
    echo "  R2_BUCKET_NAME=wordpractice-assets"
    echo ""
    exit 1
fi

node upload-to-r2.js

if [ $? -ne 0 ]; then
    echo ""
    echo -e "${RED}❌ R2 上传失败${NC}"
    exit 1
fi

echo ""

# ============================================
# 完成
# ============================================

echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  🎉 所有任务完成！                                     ║${NC}"
echo -e "${GREEN}╠════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║  ✅ 音频已下载                                         ║${NC}"
echo -e "${GREEN}║  ✅ 音频已上传到 R2                                    ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""


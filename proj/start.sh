#!/bin/bash
# 快捷启动脚本

cd "$(dirname "$0")"

echo "🚀 启动高性能开发服务器..."
echo ""

# 检查是否要启用缓存
if [ "$1" = "cache" ]; then
    echo "⚡ 启用文件缓存模式"
    CACHE=1 node dev-server.js
elif [ "$1" = "80" ]; then
    echo "📡 使用端口 80 (标准HTTP端口)"
    echo "⚠️  注意：如果80端口被占用，会自动停止占用进程"
    # 停止可能占用80端口的进程
    sudo lsof -ti:80 | xargs -r sudo kill 2>/dev/null
    sleep 1
    PORT=80 node dev-server.js
elif [ "$1" = "port" ] && [ -n "$2" ]; then
    echo "📡 使用自定义端口: $2"
    PORT=$2 node dev-server.js
else
    node dev-server.js
fi


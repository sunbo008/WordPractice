#!/bin/bash
# Web 服务管理脚本
# 用于启动、停止、重启和监控 monkeysoft.cn 的 Web 服务

PROJECT_DIR="/root/workspace/WordPractice/proj"
LOG_FILE="/tmp/dev-server.log"
PID_FILE="/tmp/dev-server.pid"

# 检测是否支持颜色输出
if [ -t 1 ] && [ -n "$TERM" ] && [ "$TERM" != "dumb" ]; then
    # 颜色输出
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    BLUE='\033[0;34m'
    NC='\033[0m' # No Color
else
    # 无颜色输出
    RED=''
    GREEN=''
    YELLOW=''
    BLUE=''
    NC=''
fi

function start_services() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}启动 Web 服务...${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    # 检查 Node.js 是否已在运行
    if pgrep -f "node dev-server" > /dev/null; then
        echo -e "${YELLOW}⚠ Node.js 服务器已在运行${NC}"
        ps aux | grep "node dev-server" | grep -v grep | awk '{print "   PID: "$2", CPU: "$3"%, MEM: "$4"%"}'
    else
        echo -e "启动 Node.js 服务器..."
        cd "$PROJECT_DIR"
        nohup node dev-server.js > "$LOG_FILE" 2>&1 &
        NODE_PID=$!
        echo $NODE_PID > "$PID_FILE"
        sleep 1
        if ps -p $NODE_PID > /dev/null; then
            echo -e "${GREEN}✓ Node.js 服务器已启动 (PID: $NODE_PID)${NC}"
        else
            echo -e "${RED}✗ Node.js 服务器启动失败${NC}"
            echo -e "${YELLOW}查看日志: tail -f $LOG_FILE${NC}"
            return 1
        fi
    fi
    
    # 检查 Caddy 是否已在运行
    if systemctl is-active caddy > /dev/null 2>&1; then
        echo -e "${YELLOW}⚠ Caddy 已在运行${NC}"
    else
        echo -e "启动 Caddy..."
        systemctl start caddy
        sleep 2
        if systemctl is-active caddy > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Caddy 已启动${NC}"
        else
            echo -e "${RED}✗ Caddy 启动失败${NC}"
            echo -e "${YELLOW}查看日志: journalctl -u caddy -n 20${NC}"
            return 1
        fi
    fi
    
    echo ""
    sleep 2
    check_status
}

function stop_services() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}停止 Web 服务...${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    # 停止 Caddy（先停止接收新请求）
    if systemctl is-active caddy > /dev/null 2>&1; then
        echo -e "停止 Caddy..."
        systemctl stop caddy
        sleep 1
        if ! systemctl is-active caddy > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Caddy 已停止${NC}"
        else
            echo -e "${RED}✗ Caddy 停止失败${NC}"
        fi
    else
        echo -e "${YELLOW}⚠ Caddy 未运行${NC}"
    fi
    
    # 等待现有请求处理完成
    sleep 1
    
    # 停止 Node.js
    if [ -f "$PID_FILE" ]; then
        NODE_PID=$(cat "$PID_FILE")
        echo -e "停止 Node.js 服务器 (PID: $NODE_PID)..."
        if ps -p $NODE_PID > /dev/null 2>&1; then
            kill $NODE_PID 2>/dev/null
            sleep 1
            if ! ps -p $NODE_PID > /dev/null 2>&1; then
                echo -e "${GREEN}✓ Node.js 服务器已停止${NC}"
                rm "$PID_FILE"
            else
                echo -e "${YELLOW}⚠ 强制停止 Node.js...${NC}"
                kill -9 $NODE_PID 2>/dev/null
                rm "$PID_FILE"
                echo -e "${GREEN}✓ Node.js 服务器已强制停止${NC}"
            fi
        else
            echo -e "${YELLOW}⚠ PID 文件存在但进程不存在${NC}"
            rm "$PID_FILE"
        fi
    elif pgrep -f "node dev-server" > /dev/null; then
        echo -e "停止 Node.js 服务器..."
        pkill -f "node dev-server"
        sleep 1
        if ! pgrep -f "node dev-server" > /dev/null; then
            echo -e "${GREEN}✓ Node.js 服务器已停止${NC}"
        else
            echo -e "${YELLOW}⚠ 强制停止 Node.js...${NC}"
            pkill -9 -f "node dev-server"
            echo -e "${GREEN}✓ Node.js 服务器已强制停止${NC}"
        fi
    else
        echo -e "${YELLOW}⚠ Node.js 服务器未运行${NC}"
    fi
    
    echo -e "${GREEN}✓ 所有服务已停止${NC}"
}

function restart_services() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}重启 Web 服务...${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    stop_services
    echo ""
    sleep 2
    start_services
}

function check_status() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC}           ${YELLOW}Web 服务状态检查${NC}                           ${BLUE}║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
    
    # Caddy 状态
    echo ""
    echo -e "${YELLOW}[Caddy 服务]${NC}"
    if systemctl is-active caddy > /dev/null 2>&1; then
        echo -e "  状态: ${GREEN}✓ 运行中${NC}"
        CADDY_PID=$(systemctl show -p MainPID caddy | cut -d= -f2)
        if [ "$CADDY_PID" != "0" ]; then
            CADDY_MEM=$(ps -p $CADDY_PID -o %mem --no-headers 2>/dev/null | xargs)
            CADDY_CPU=$(ps -p $CADDY_PID -o %cpu --no-headers 2>/dev/null | xargs)
            echo -e "  PID: $CADDY_PID"
            echo -e "  CPU: ${CADDY_CPU}%"
            echo -e "  内存: ${CADDY_MEM}%"
        fi
    else
        echo -e "  状态: ${RED}✗ 未运行${NC}"
    fi
    
    # Node.js 状态
    echo ""
    echo -e "${YELLOW}[Node.js 服务器]${NC}"
    if pgrep -f "node dev-server" > /dev/null; then
        echo -e "  状态: ${GREEN}✓ 运行中${NC}"
        NODE_INFO=$(ps aux | grep "node dev-server" | grep -v grep | awk '{print $2, $3, $4}')
        if [ -n "$NODE_INFO" ]; then
            NODE_PID=$(echo $NODE_INFO | cut -d' ' -f1)
            NODE_CPU=$(echo $NODE_INFO | cut -d' ' -f2)
            NODE_MEM=$(echo $NODE_INFO | cut -d' ' -f3)
            echo -e "  PID: $NODE_PID"
            echo -e "  CPU: ${NODE_CPU}%"
            echo -e "  内存: ${NODE_MEM}%"
        fi
    else
        echo -e "  状态: ${RED}✗ 未运行${NC}"
    fi
    
    # 端口监听状态
    echo ""
    echo -e "${YELLOW}[端口监听]${NC}"
    lsof -i :443 > /dev/null 2>&1 && echo -e "  443 (HTTPS): ${GREEN}✓ 已监听${NC}" || echo -e "  443 (HTTPS): ${RED}✗ 未监听${NC}"
    lsof -i :80 > /dev/null 2>&1 && echo -e "  80  (HTTP):  ${GREEN}✓ 已监听${NC}" || echo -e "  80  (HTTP):  ${RED}✗ 未监听${NC}"
    lsof -i :3000 > /dev/null 2>&1 && echo -e "  3000 (Node): ${GREEN}✓ 已监听${NC}" || echo -e "  3000 (Node): ${RED}✗ 未监听${NC}"
    
    # 访问测试
    echo ""
    echo -e "${YELLOW}[访问测试]${NC}"
    
    # 测试 HTTPS
    if timeout 3 curl -k -I https://monkeysoft.cn/ 2>&1 | grep -q "200\|301\|302"; then
        echo -e "  HTTPS: ${GREEN}✓ 访问正常${NC}"
    else
        echo -e "  HTTPS: ${RED}✗ 访问失败${NC}"
    fi
    
    # 测试 HTTP 重定向
    if timeout 3 curl -I http://monkeysoft.cn/ 2>&1 | grep -q "301\|302\|308"; then
        echo -e "  HTTP:  ${GREEN}✓ 重定向正常${NC}"
    else
        echo -e "  HTTP:  ${YELLOW}⚠ 未配置重定向${NC}"
    fi
    
    # 测试本地 Node.js
    if timeout 3 curl -I http://localhost:3000/ 2>&1 | grep -q "200"; then
        echo -e "  Node:  ${GREEN}✓ 本地访问正常${NC}"
    else
        echo -e "  Node:  ${RED}✗ 本地访问失败${NC}"
    fi
    
    echo ""
    echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
}

function show_logs() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}服务日志${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    echo ""
    echo -e "${YELLOW}=== Caddy 日志（最近 20 行）===${NC}"
    journalctl -u caddy -n 20 --no-pager
    
    echo ""
    echo -e "${YELLOW}=== Node.js 日志（最近 20 行）===${NC}"
    if [ -f "$LOG_FILE" ]; then
        tail -20 "$LOG_FILE"
    else
        echo -e "${RED}日志文件不存在: $LOG_FILE${NC}"
    fi
}

function show_help() {
    echo ""
    echo "======================================================"
    echo "           Web 服务管理脚本"
    echo "======================================================"
    echo ""
    echo "用法: $0 [命令]"
    echo ""
    echo "命令:"
    echo "  start    - 启动所有服务 (Caddy + Node.js)"
    echo "  stop     - 停止所有服务"
    echo "  restart  - 重启所有服务"
    echo "  status   - 查看服务状态"
    echo "  logs     - 查看服务日志"
    echo "  help     - 显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 start     # 启动服务"
    echo "  $0 status    # 查看状态"
    echo "  $0 restart   # 重启服务"
    echo "  $0 logs      # 查看日志"
    echo ""
    echo "服务信息:"
    echo "  • Caddy:  HTTPS 反向代理 (端口 80, 443)"
    echo "  • Node.js: 静态文件服务器 (端口 3000)"
    echo "  • 网站:   https://monkeysoft.cn/"
    echo ""
    echo "日志文件:"
    echo "  • Caddy:  journalctl -u caddy -f"
    echo "  • Node.js: tail -f $LOG_FILE"
    echo ""
}

# 检查是否为 root 用户
if [ "$EUID" -ne 0 ] && [ "$1" != "help" ] && [ "$1" != "--help" ] && [ "$1" != "-h" ]; then
    echo -e "${RED}错误: 需要 root 权限运行此脚本${NC}"
    echo -e "${YELLOW}提示: 使用 sudo $0 $1${NC}"
    exit 1
fi

# 主逻辑
case "$1" in
    start)
        start_services
        ;;
    stop)
        stop_services
        ;;
    restart)
        restart_services
        ;;
    status)
        check_status
        ;;
    logs)
        show_logs
        ;;
    help|--help|-h|"")
        show_help
        ;;
    *)
        echo -e "${RED}错误: 未知命令 '$1'${NC}"
        echo ""
        show_help
        exit 1
        ;;
esac

exit 0


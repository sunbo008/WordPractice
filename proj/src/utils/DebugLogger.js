// 调试日志系统
export class DebugLogger {
    constructor() {
        this.console = null;
        this.maxLines = 500; // 增加最大行数
        this.enabled = true;
        this.logHistory = []; // 完整日志历史
    }
    
    init() {
        this.console = document.getElementById('debugConsole');
        
        // 绑定控制按钮
        const toggleBtn = document.getElementById('toggleDebugBtn');
        const clearBtn = document.getElementById('clearDebugBtn');
        const exportBtn = document.getElementById('exportDebugBtn');
        const panel = document.getElementById('debugPanel');
        
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                panel.classList.toggle('hidden');
                toggleBtn.textContent = panel.classList.contains('hidden') ? '显示' : '隐藏';
            });
        }
        
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clear());
        }
        
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.export());
        }
        
        // 捕获全局错误
        window.addEventListener('error', (event) => {
            this.error(`❌ 全局错误: ${event.message}`);
            this.error(`   文件: ${event.filename}:${event.lineno}:${event.colno}`);
        });
        
        // 捕获Promise错误
        window.addEventListener('unhandledrejection', (event) => {
            this.error(`❌ Promise错误: ${event.reason}`);
        });
        
        this.info('🔍 调试日志系统已启动');
    }
    
    log(message, type = 'info') {
        if (!this.enabled) return;
        
        const timestamp = new Date().toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 });
        const logEntry = {
            timestamp,
            message,
            type,
            fullMessage: `[${timestamp}] ${message}`
        };
        
        // 保存到历史记录
        this.logHistory.push(logEntry);
        
        // 显示到调试面板
        if (this.console) {
            const line = document.createElement('div');
            line.className = `debug-line ${type}`;
            line.textContent = logEntry.fullMessage;
            
            this.console.appendChild(line);
            
            // 限制行数（只限制显示，不限制历史记录）
            while (this.console.children.length > this.maxLines) {
                this.console.removeChild(this.console.firstChild);
            }
            
            // 自动滚动到底部
            this.console.scrollTop = this.console.scrollHeight;
        }
        
        // 同时输出到浏览器控制台
        const consoleMethod = type === 'error' ? 'error' : type === 'warning' ? 'warn' : 'log';
        console[consoleMethod](message);
    }
    
    info(message) {
        this.log(message, 'info');
    }
    
    success(message) {
        this.log(message, 'success');
    }
    
    warning(message) {
        this.log(message, 'warning');
    }
    
    error(message) {
        this.log(message, 'error');
    }
    
    clear() {
        if (this.console) {
            this.console.innerHTML = '';
        }
        this.logHistory = [];
        this.info('📝 日志已清空');
    }
    
    export() {
        if (this.logHistory.length === 0) {
            alert('没有日志可以导出');
            return;
        }
        
        // 生成日志文本
        const logText = this.logHistory.map(entry => entry.fullMessage).join('\n');
        
        // 创建下载链接
        const blob = new Blob([logText], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        // 文件名包含时间戳
        const now = new Date();
        const dateStr = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
        link.download = `word-tetris-debug-${dateStr}.txt`;
        
        // 触发下载
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // 释放URL对象
        URL.revokeObjectURL(url);
        
        this.success(`✅ 日志已导出 (${this.logHistory.length} 条记录)`);
    }
}

// 创建全局调试日志实例
export const debugLog = new DebugLogger();


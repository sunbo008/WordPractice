// 调试日志系统（独立版本，支持跨页面日志共享）
class DebugLogger {
    constructor() {
        this.console = null;
        this.maxLines = 500;
        this.enabled = true;
        this.logHistory = [];
        this.storageKey = 'wordTetris_debugLogs';
        this.maxStoredLogs = 1000; // localStorage 中最多保存1000条日志
        
        // 从 localStorage 加载历史日志
        this.loadHistoryFromStorage();
    }
    
    init() {
        this.console = document.getElementById('debugConsole');
        
        // 如果有 DOM 元素，绑定控制按钮
        const toggleBtn = document.getElementById('toggleDebugBtn');
        const clearBtn = document.getElementById('clearDebugBtn');
        const exportBtn = document.getElementById('exportDebugBtn');
        const panel = document.getElementById('debugPanel');
        
        if (toggleBtn && panel) {
            toggleBtn.addEventListener('click', () => {
                panel.classList.toggle('hidden');
                const btnText = toggleBtn.querySelector('.btn-text');
                if (btnText) {
                    btnText.textContent = panel.classList.contains('hidden') ? '显示' : '隐藏';
                }
            });
        }
        
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clear());
        }
        
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.export());
        }
        
        // 如果有 console 元素，显示历史日志
        if (this.console && this.logHistory.length > 0) {
            this.renderHistoryLogs();
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
        
        const pageType = window.location.pathname.includes('settings') ? 'Settings' : 'Game';
        this.info(`🔍 调试日志系统已启动 [${pageType}]`);
    }
    
    /**
     * 从 localStorage 加载历史日志
     */
    loadHistoryFromStorage() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                this.logHistory = JSON.parse(stored);
                console.log(`📚 加载了 ${this.logHistory.length} 条历史日志`);
            }
        } catch (error) {
            console.error('❌ 加载历史日志失败:', error);
            this.logHistory = [];
        }
    }
    
    /**
     * 保存日志到 localStorage
     */
    saveHistoryToStorage() {
        try {
            // 只保存最近的 maxStoredLogs 条日志
            const logsToSave = this.logHistory.slice(-this.maxStoredLogs);
            localStorage.setItem(this.storageKey, JSON.stringify(logsToSave));
        } catch (error) {
            console.error('❌ 保存历史日志失败:', error);
        }
    }
    
    /**
     * 渲染历史日志到界面
     */
    renderHistoryLogs() {
        if (!this.console) return;
        
        this.logHistory.forEach(entry => {
            const line = document.createElement('div');
            line.className = `debug-line ${entry.type}`;
            line.textContent = entry.fullMessage;
            this.console.appendChild(line);
        });
        
        // 限制显示行数
        while (this.console.children.length > this.maxLines) {
            this.console.removeChild(this.console.firstChild);
        }
        
        // 自动滚动到底部
        this.console.scrollTop = this.console.scrollHeight;
    }
    
    log(message, type = 'info') {
        if (!this.enabled) return;
        
        const timestamp = new Date().toLocaleTimeString('zh-CN', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit', 
            fractionalSecondDigits: 3 
        });
        
        const logEntry = {
            timestamp,
            message,
            type,
            fullMessage: `[${timestamp}] ${message}`
        };
        
        // 保存到历史记录
        this.logHistory.push(logEntry);
        
        // 保存到 localStorage（异步，不阻塞）
        setTimeout(() => this.saveHistoryToStorage(), 0);
        
        // 显示到调试面板（如果存在）
        if (this.console) {
            const line = document.createElement('div');
            line.className = `debug-line ${type}`;
            line.textContent = logEntry.fullMessage;
            
            this.console.appendChild(line);
            
            // 限制行数
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
        
        // 清除 localStorage 中的日志
        try {
            localStorage.removeItem(this.storageKey);
        } catch (error) {
            console.error('❌ 清除历史日志失败:', error);
        }
        
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
        link.download = `word-tetris-settings-debug-${dateStr}.txt`;
        
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
const debugLog = new DebugLogger();


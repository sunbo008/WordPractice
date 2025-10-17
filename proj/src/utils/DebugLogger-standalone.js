// 调试日志系统（独立版本，支持跨页面日志共享）
class DebugLogger {
    constructor() {
        this.console = null;
        this.maxLines = 500;
        this.enabled = true;
        this.logHistory = [];
        this.storageKey = 'wordTetris_debugLogs';
        this.maxStoredLogs = 1000; // localStorage 中最多保存1000条日志
        this.passwordHash = 'ff313b13fc7bfbfc9427ed13a085020a'; // 3轮MD5后的哈希值
        this.isAuthenticated = false; // 是否已通过验证
        
        // 从 localStorage 加载历史日志（页面刷新时保留）
        this.loadHistoryFromStorage();
    }
    
    init() {
        this.console = document.getElementById('debugConsole');
        
        // 如果有 DOM 元素，绑定控制按钮
        const toggleBtn = document.getElementById('toggleDebugBtn');
        const copyBtn = document.getElementById('copyDebugBtn');
        const clearBtn = document.getElementById('clearDebugBtn');
        const exportBtn = document.getElementById('exportDebugBtn');
        const panel = document.getElementById('debugPanel');
        
        if (toggleBtn && panel) {
            // 确保初始按钮文本与面板状态一致
            const btnText = toggleBtn.querySelector('.btn-text');
            if (btnText) {
                btnText.textContent = panel.classList.contains('hidden') ? '显示' : '隐藏';
            }
            
            toggleBtn.addEventListener('click', async () => {
                // 如果面板当前是显示状态，直接隐藏
                if (!panel.classList.contains('hidden')) {
                    panel.classList.toggle('hidden');
                    if (btnText) {
                        btnText.textContent = '显示';
                    }
                    return;
                }
                
                // 如果已通过验证，直接显示
                if (this.isAuthenticated) {
                    panel.classList.toggle('hidden');
                    if (btnText) {
                        btnText.textContent = '隐藏';
                    }
                    return;
                }
                
                // 否则需要验证
                const verified = await this.verifyAccess();
                if (verified) {
                    this.isAuthenticated = true;
                    panel.classList.remove('hidden');
                    if (btnText) {
                        btnText.textContent = '隐藏';
                    }
                }
            });
        }
        
        if (copyBtn) {
            copyBtn.addEventListener('click', () => this.copy());
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
    
    copy() {
        if (this.logHistory.length === 0) {
            alert('没有日志可以复制');
            return;
        }
        
        // 生成日志文本
        const logText = this.logHistory.map(entry => entry.fullMessage).join('\n');
        
        // 复制到剪贴板
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(logText).then(() => {
                this.success(`✅ 日志已复制到剪贴板 (${this.logHistory.length} 条记录)`);
            }).catch(err => {
                this.error('❌ 复制失败: ' + err.message);
                // 降级方案：使用旧的复制方法
                this.fallbackCopy(logText);
            });
        } else {
            // 直接使用降级方法
            this.fallbackCopy(logText);
        }
    }
    
    fallbackCopy(text) {
        // 创建临时文本区域
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        
        try {
            const success = document.execCommand('copy');
            if (success) {
                this.success(`✅ 日志已复制到剪贴板 (${this.logHistory.length} 条记录)`);
            } else {
                this.error('❌ 复制失败');
            }
        } catch (err) {
            this.error('❌ 复制失败: ' + err.message);
        }
        
        document.body.removeChild(textarea);
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
    
    /**
     * 验证访问权限
     * @returns {Promise<boolean>} 是否验证通过
     */
    async verifyAccess() {
        // 1. 先尝试检查 log.txt 文件
        try {
            const response = await fetch('./log.txt');
            if (response.ok) {
                const content = await response.text();
                const trimmedContent = content.trim();
                if (trimmedContent) {
                    const hash = this.multiRoundMD5(trimmedContent, 3);
                    if (hash === this.passwordHash) {
                        return true;
                    }
                }
                // 文件存在但验证失败，继续弹出密码输入框
            }
        } catch (error) {
            // log.txt 文件不存在或读取失败，继续尝试密码输入
        }
        
        // 2. log.txt 不存在或校验失败，提示输入密码
        const password = prompt('请输入密码以查看日志：');
        if (password === null || password === '') {
            // 用户取消或输入为空
            return false;
        }
        
        const hash = this.multiRoundMD5(password, 3);
        if (hash === this.passwordHash) {
            return true;
        }
        
        // 密码错误，不做任何提示
        return false;
    }
    
    /**
     * 执行多轮MD5加密
     * @param {string} text - 要加密的文本
     * @param {number} rounds - 加密轮数
     * @returns {string} MD5加密结果
     */
    multiRoundMD5(text, rounds) {
        let result = text;
        for (let i = 0; i < rounds; i++) {
            result = this.md5(result);
        }
        return result;
    }
    
    /**
     * MD5加密函数
     * @param {string} string - 要加密的字符串
     * @returns {string} MD5哈希值
     */
    md5(string) {
        function rotateLeft(value, shift) {
            return (value << shift) | (value >>> (32 - shift));
        }

        function addUnsigned(x, y) {
            const lsw = (x & 0xFFFF) + (y & 0xFFFF);
            const msw = (x >> 16) + (y >> 16) + (lsw >> 16);
            return (msw << 16) | (lsw & 0xFFFF);
        }

        function f(x, y, z) {
            return (x & y) | ((~x) & z);
        }

        function g(x, y, z) {
            return (x & z) | (y & (~z));
        }

        function h(x, y, z) {
            return x ^ y ^ z;
        }

        function i(x, y, z) {
            return y ^ (x | (~z));
        }

        function ff(a, b, c, d, x, s, ac) {
            a = addUnsigned(a, addUnsigned(addUnsigned(f(b, c, d), x), ac));
            return addUnsigned(rotateLeft(a, s), b);
        }

        function gg(a, b, c, d, x, s, ac) {
            a = addUnsigned(a, addUnsigned(addUnsigned(g(b, c, d), x), ac));
            return addUnsigned(rotateLeft(a, s), b);
        }

        function hh(a, b, c, d, x, s, ac) {
            a = addUnsigned(a, addUnsigned(addUnsigned(h(b, c, d), x), ac));
            return addUnsigned(rotateLeft(a, s), b);
        }

        function ii(a, b, c, d, x, s, ac) {
            a = addUnsigned(a, addUnsigned(addUnsigned(i(b, c, d), x), ac));
            return addUnsigned(rotateLeft(a, s), b);
        }

        function convertToWordArray(string) {
            let lWordCount;
            const lMessageLength = string.length;
            const lNumberOfWords_temp1 = lMessageLength + 8;
            const lNumberOfWords_temp2 = (lNumberOfWords_temp1 - (lNumberOfWords_temp1 % 64)) / 64;
            const lNumberOfWords = (lNumberOfWords_temp2 + 1) * 16;
            const lWordArray = new Array(lNumberOfWords - 1);
            let lBytePosition = 0;
            let lByteCount = 0;
            
            while (lByteCount < lMessageLength) {
                lWordCount = (lByteCount - (lByteCount % 4)) / 4;
                lBytePosition = (lByteCount % 4) * 8;
                lWordArray[lWordCount] = (lWordArray[lWordCount] | (string.charCodeAt(lByteCount) << lBytePosition));
                lByteCount++;
            }
            
            lWordCount = (lByteCount - (lByteCount % 4)) / 4;
            lBytePosition = (lByteCount % 4) * 8;
            lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80 << lBytePosition);
            lWordArray[lNumberOfWords - 2] = lMessageLength << 3;
            lWordArray[lNumberOfWords - 1] = lMessageLength >>> 29;
            
            return lWordArray;
        }

        function wordToHex(lValue) {
            let wordToHexValue = "", wordToHexValue_temp = "", lByte, lCount;
            for (lCount = 0; lCount <= 3; lCount++) {
                lByte = (lValue >>> (lCount * 8)) & 255;
                wordToHexValue_temp = "0" + lByte.toString(16);
                wordToHexValue = wordToHexValue + wordToHexValue_temp.substr(wordToHexValue_temp.length - 2, 2);
            }
            return wordToHexValue;
        }

        function utf8Encode(string) {
            string = string.replace(/\r\n/g, "\n");
            let utftext = "";
            for (let n = 0; n < string.length; n++) {
                const c = string.charCodeAt(n);
                if (c < 128) {
                    utftext += String.fromCharCode(c);
                } else if ((c > 127) && (c < 2048)) {
                    utftext += String.fromCharCode((c >> 6) | 192);
                    utftext += String.fromCharCode((c & 63) | 128);
                } else {
                    utftext += String.fromCharCode((c >> 12) | 224);
                    utftext += String.fromCharCode(((c >> 6) & 63) | 128);
                    utftext += String.fromCharCode((c & 63) | 128);
                }
            }
            return utftext;
        }

        let x = [];
        let k, AA, BB, CC, DD, a, b, c, d;
        const S11 = 7, S12 = 12, S13 = 17, S14 = 22;
        const S21 = 5, S22 = 9, S23 = 14, S24 = 20;
        const S31 = 4, S32 = 11, S33 = 16, S34 = 23;
        const S41 = 6, S42 = 10, S43 = 15, S44 = 21;

        string = utf8Encode(string);
        x = convertToWordArray(string);
        a = 0x67452301; b = 0xEFCDAB89; c = 0x98BADCFE; d = 0x10325476;

        for (k = 0; k < x.length; k += 16) {
            AA = a; BB = b; CC = c; DD = d;
            a = ff(a, b, c, d, x[k + 0], S11, 0xD76AA478);
            d = ff(d, a, b, c, x[k + 1], S12, 0xE8C7B756);
            c = ff(c, d, a, b, x[k + 2], S13, 0x242070DB);
            b = ff(b, c, d, a, x[k + 3], S14, 0xC1BDCEEE);
            a = ff(a, b, c, d, x[k + 4], S11, 0xF57C0FAF);
            d = ff(d, a, b, c, x[k + 5], S12, 0x4787C62A);
            c = ff(c, d, a, b, x[k + 6], S13, 0xA8304613);
            b = ff(b, c, d, a, x[k + 7], S14, 0xFD469501);
            a = ff(a, b, c, d, x[k + 8], S11, 0x698098D8);
            d = ff(d, a, b, c, x[k + 9], S12, 0x8B44F7AF);
            c = ff(c, d, a, b, x[k + 10], S13, 0xFFFF5BB1);
            b = ff(b, c, d, a, x[k + 11], S14, 0x895CD7BE);
            a = ff(a, b, c, d, x[k + 12], S11, 0x6B901122);
            d = ff(d, a, b, c, x[k + 13], S12, 0xFD987193);
            c = ff(c, d, a, b, x[k + 14], S13, 0xA679438E);
            b = ff(b, c, d, a, x[k + 15], S14, 0x49B40821);
            a = gg(a, b, c, d, x[k + 1], S21, 0xF61E2562);
            d = gg(d, a, b, c, x[k + 6], S22, 0xC040B340);
            c = gg(c, d, a, b, x[k + 11], S23, 0x265E5A51);
            b = gg(b, c, d, a, x[k + 0], S24, 0xE9B6C7AA);
            a = gg(a, b, c, d, x[k + 5], S21, 0xD62F105D);
            d = gg(d, a, b, c, x[k + 10], S22, 0x2441453);
            c = gg(c, d, a, b, x[k + 15], S23, 0xD8A1E681);
            b = gg(b, c, d, a, x[k + 4], S24, 0xE7D3FBC8);
            a = gg(a, b, c, d, x[k + 9], S21, 0x21E1CDE6);
            d = gg(d, a, b, c, x[k + 14], S22, 0xC33707D6);
            c = gg(c, d, a, b, x[k + 3], S23, 0xF4D50D87);
            b = gg(b, c, d, a, x[k + 8], S24, 0x455A14ED);
            a = gg(a, b, c, d, x[k + 13], S21, 0xA9E3E905);
            d = gg(d, a, b, c, x[k + 2], S22, 0xFCEFA3F8);
            c = gg(c, d, a, b, x[k + 7], S23, 0x676F02D9);
            b = gg(b, c, d, a, x[k + 12], S24, 0x8D2A4C8A);
            a = hh(a, b, c, d, x[k + 5], S31, 0xFFFA3942);
            d = hh(d, a, b, c, x[k + 8], S32, 0x8771F681);
            c = hh(c, d, a, b, x[k + 11], S33, 0x6D9D6122);
            b = hh(b, c, d, a, x[k + 14], S34, 0xFDE5380C);
            a = hh(a, b, c, d, x[k + 1], S31, 0xA4BEEA44);
            d = hh(d, a, b, c, x[k + 4], S32, 0x4BDECFA9);
            c = hh(c, d, a, b, x[k + 7], S33, 0xF6BB4B60);
            b = hh(b, c, d, a, x[k + 10], S34, 0xBEBFBC70);
            a = hh(a, b, c, d, x[k + 13], S31, 0x289B7EC6);
            d = hh(d, a, b, c, x[k + 0], S32, 0xEAA127FA);
            c = hh(c, d, a, b, x[k + 3], S33, 0xD4EF3085);
            b = hh(b, c, d, a, x[k + 6], S34, 0x4881D05);
            a = hh(a, b, c, d, x[k + 9], S31, 0xD9D4D039);
            d = hh(d, a, b, c, x[k + 12], S32, 0xE6DB99E5);
            c = hh(c, d, a, b, x[k + 15], S33, 0x1FA27CF8);
            b = hh(b, c, d, a, x[k + 2], S34, 0xC4AC5665);
            a = ii(a, b, c, d, x[k + 0], S41, 0xF4292244);
            d = ii(d, a, b, c, x[k + 7], S42, 0x432AFF97);
            c = ii(c, d, a, b, x[k + 14], S43, 0xAB9423A7);
            b = ii(b, c, d, a, x[k + 5], S44, 0xFC93A039);
            a = ii(a, b, c, d, x[k + 12], S41, 0x655B59C3);
            d = ii(d, a, b, c, x[k + 3], S42, 0x8F0CCC92);
            c = ii(c, d, a, b, x[k + 10], S43, 0xFFEFF47D);
            b = ii(b, c, d, a, x[k + 1], S44, 0x85845DD1);
            a = ii(a, b, c, d, x[k + 8], S41, 0x6FA87E4F);
            d = ii(d, a, b, c, x[k + 15], S42, 0xFE2CE6E0);
            c = ii(c, d, a, b, x[k + 6], S43, 0xA3014314);
            b = ii(b, c, d, a, x[k + 13], S44, 0x4E0811A1);
            a = ii(a, b, c, d, x[k + 4], S41, 0xF7537E82);
            d = ii(d, a, b, c, x[k + 11], S42, 0xBD3AF235);
            c = ii(c, d, a, b, x[k + 2], S43, 0x2AD7D2BB);
            b = ii(b, c, d, a, x[k + 9], S44, 0xEB86D391);
            a = addUnsigned(a, AA);
            b = addUnsigned(b, BB);
            c = addUnsigned(c, CC);
            d = addUnsigned(d, DD);
        }

        return (wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d)).toLowerCase();
    }
}

// 创建全局调试日志实例
const debugLog = new DebugLogger();


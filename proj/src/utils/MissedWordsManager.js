// 错词管理工具类 - 用于游戏和设置页面之间的错词数据共享
class MissedWordsManager {
    constructor() {
        this.userIP = null;
        this.storageKey = 'wordTetris_missedWords';
    }

    /**
     * 获取用户IP地址
     */
    async getUserIP() {
        if (this.userIP) {
            return this.userIP;
        }

        try {
            // 先检查是否有保存的IP标识（避免每次都生成新的）
            const savedIP = localStorage.getItem('wordTetris_userIP');
            if (savedIP && savedIP !== 'null' && !savedIP.startsWith('unknown-')) {
                this.userIP = savedIP;
                console.log('🌐 使用保存的IP标识:', this.userIP);
                // 仍然尝试更新IP，但不阻塞
                this.updateIPInBackground();
                return this.userIP;
            }

            // 尝试从多个免费API获取IP
            const apis = [
                'https://api.ipify.org?format=json',
                'https://api.ip.sb/ip',
                'https://ipapi.co/json/'
            ];

            for (const api of apis) {
                try {
                    // 使用 AbortController 实现超时
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 3000);

                    const response = await fetch(api, { signal: controller.signal });
                    clearTimeout(timeoutId);

                    if (response.ok) {
                        const data = await response.json();
                        this.userIP = data.ip || data;
                        // 保存IP标识
                        localStorage.setItem('wordTetris_userIP', this.userIP);
                        console.log('🌐 用户IP:', this.userIP);
                        return this.userIP;
                    }
                } catch (err) {
                    if (err.name === 'AbortError') {
                        console.log(`⏱️ ${api} 请求超时`);
                    }
                    continue;
                }
            }

            // 所有API都失败，使用降级方案
            throw new Error('IP获取失败');

        } catch (error) {
            // 降级方案：根据环境生成标识（使用稳定的标识）
            if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
                this.userIP = 'localhost';
            } else {
                // 使用基于hostname的稳定标识，而不是时间戳
                const hostname = location.hostname || 'unknown';
                this.userIP = `browser-${hostname}`;
            }

            // 保存降级标识
            localStorage.setItem('wordTetris_userIP', this.userIP);
            console.warn('⚠️ IP获取失败，使用降级标识:', this.userIP);
            return this.userIP;
        }
    }

    /**
     * 在后台更新IP（不阻塞主流程）
     */
    async updateIPInBackground() {
        try {
            const apis = [
                'https://api.ipify.org?format=json',
                'https://api.ip.sb/ip',
                'https://ipapi.co/json/'
            ];

            for (const api of apis) {
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 3000);

                    const response = await fetch(api, { signal: controller.signal });
                    clearTimeout(timeoutId);

                    if (response.ok) {
                        const data = await response.json();
                        const newIP = data.ip || data;
                        if (newIP && newIP !== this.userIP) {
                            console.log('🔄 检测到IP变化，从', this.userIP, '变为', newIP);
                        }
                        // 更新保存的IP
                        localStorage.setItem('wordTetris_userIP', newIP);
                        break;
                    }
                } catch (err) {
                    continue;
                }
            }
        } catch (error) {
            // 静默失败，不影响主流程
        }
    }

    /**
     * 生成错词主键（不使用IP）
     */
    generateKey(word) {
        return (word || '').toLowerCase();
    }

    /**
     * 保存单个错词（不使用IP）
     */
    async saveMissedWord(wordData) {
        try {
            // 检测存储空间（简单检测）
            try {
                const testKey = '__storage_test__';
                localStorage.setItem(testKey, 'test');
                localStorage.removeItem(testKey);
            } catch (e) {
                if (e.name === 'QuotaExceededError') {
                    console.error('❌ 存储空间不足，无法保存错词');
                    return false;
                }
            }

            const allMissedWords = JSON.parse(
                localStorage.getItem(this.storageKey) || '{}'
            );

            const word = (wordData.word || wordData.original || '').toLowerCase();
            const key = this.generateKey(word);
            const now = Date.now();

            if (allMissedWords[key]) {
                allMissedWords[key].count++;
                allMissedWords[key].lastUpdate = now;
                if (!allMissedWords[key].createTime) {
                    allMissedWords[key].createTime = allMissedWords[key].lastUpdate || now;
                }
            } else {
                allMissedWords[key] = {
                    word: word,
                    phonetic: wordData.phonetic || '',
                    meaning: wordData.meaning || '',
                    count: 1,
                    createTime: now,
                    lastUpdate: now
                };
            }

            localStorage.setItem(this.storageKey, JSON.stringify(allMissedWords));
            console.log(`💾 保存错词: ${word}`);
            return true;
        } catch (error) {
            if (error.name === 'QuotaExceededError') {
                console.error('❌ 存储空间不足，无法保存错词');
            } else {
                console.error('❌ 错词保存失败:', error);
            }
            return false;
        }
    }

    /**
     * 批量保存错词
     */
    async saveMissedWords(wordsArray) {
        try {
            let successCount = 0;
            for (const wordData of wordsArray) {
                const success = await this.saveMissedWord(wordData);
                if (success) successCount++;
            }

            console.log(`💾 批量保存错词: ${successCount}/${wordsArray.length}`);
            return successCount;
        } catch (error) {
            console.error('❌ 批量保存错词失败:', error);
            return 0;
        }
    }

    /**
     * 获取所有错词数量（不限制IP）
     */
    async getMissedWordsCount() {
        try {
            const allMissedWords = JSON.parse(
                localStorage.getItem(this.storageKey) || '{}'
            );

            // 计算所有错词（包括旧格式）
            let count = 0;
            const processedWords = new Set();

            Object.keys(allMissedWords).forEach(key => {
                let wordKey = key;
                if (key.includes('::')) {
                    // 旧格式：提取单词部分
                    wordKey = key.split('::')[1].toLowerCase();
                } else {
                    wordKey = key.toLowerCase();
                }

                // 避免重复计数
                if (!processedWords.has(wordKey)) {
                    processedWords.add(wordKey);
                    count++;
                }
            });

            return count;
        } catch (error) {
            console.error('❌ 获取错词数量失败:', error);
            return 0;
        }
    }

    /**
     * 获取所有错词（不限制IP）
     */
    async getMissedWords() {
        try {
            const allMissedWords = JSON.parse(
                localStorage.getItem(this.storageKey) || '{}'
            );

            // 合并所有错词（包括旧格式）
            const wordMap = new Map();

            Object.entries(allMissedWords).forEach(([key, data]) => {
                let wordKey = key;
                if (key.includes('::')) {
                    // 旧格式：提取单词
                    wordKey = key.split('::')[1];
                }
                wordKey = wordKey.toLowerCase();

                if (wordMap.has(wordKey)) {
                    // 合并计数
                    const existing = wordMap.get(wordKey);
                    existing.count += (data.count || 1);
                    existing.lastUpdate = Math.max(existing.lastUpdate || 0, data.lastUpdate || 0);
                    // 保留最早的创建时间
                    if (data.createTime && (!existing.createTime || data.createTime < existing.createTime)) {
                        existing.createTime = data.createTime;
                    }
                } else {
                    wordMap.set(wordKey, {
                        word: data.word || wordKey,
                        phonetic: data.phonetic || '',
                        meaning: data.meaning || '',
                        count: data.count || 1,
                        createTime: data.createTime || data.lastUpdate || Date.now(),
                        lastUpdate: data.lastUpdate || Date.now()
                    });
                }
            });

            const words = Array.from(wordMap.values())
                .sort((a, b) => b.lastUpdate - a.lastUpdate);

            return words;
        } catch (error) {
            console.error('❌ 获取错词列表失败:', error);
            return [];
        }
    }
}

// 创建全局实例
window.missedWordsManager = window.missedWordsManager || new MissedWordsManager();


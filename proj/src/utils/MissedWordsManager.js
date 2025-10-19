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
            // 尝试从多个免费API获取IP
            const apis = [
                'https://api.ipify.org?format=json',
                'https://api.ip.sb/ip',
                'https://ipapi.co/json/'
            ];
            
            for (const api of apis) {
                try {
                    const response = await fetch(api, { timeout: 3000 });
                    if (response.ok) {
                        const data = await response.json();
                        this.userIP = data.ip || data;
                        console.log('🌐 用户IP:', this.userIP);
                        return this.userIP;
                    }
                } catch (err) {
                    continue;
                }
            }
            
            // 所有API都失败，使用降级方案
            throw new Error('IP获取失败');
            
        } catch (error) {
            // 降级方案：根据环境生成标识
            if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
                this.userIP = 'localhost';
            } else {
                this.userIP = `unknown-${Date.now()}`;
            }
            console.warn('⚠️ IP获取失败，使用降级标识:', this.userIP);
            return this.userIP;
        }
    }
    
    /**
     * 生成错词主键
     */
    generateKey(word) {
        return `${this.userIP}::${word.toLowerCase()}`;
    }
    
    /**
     * 保存单个错词
     */
    async saveMissedWord(wordData) {
        try {
            // 确保IP已获取
            if (!this.userIP) {
                await this.getUserIP();
            }
            
            const allMissedWords = JSON.parse(
                localStorage.getItem(this.storageKey) || '{}'
            );
            
            const key = this.generateKey(wordData.word || wordData.original);
            const now = Date.now();
            
            if (allMissedWords[key]) {
                // 已存在，更新计数和时间
                allMissedWords[key].count++;
                allMissedWords[key].lastUpdate = now;
                // 确保旧数据有 createTime（兼容性处理）
                if (!allMissedWords[key].createTime) {
                    allMissedWords[key].createTime = allMissedWords[key].lastUpdate || now;
                }
            } else {
                // 新增
                allMissedWords[key] = {
                    ip: this.userIP,
                    word: (wordData.word || wordData.original).toLowerCase(),
                    phonetic: wordData.phonetic || '',
                    meaning: wordData.meaning || '',
                    count: 1,
                    createTime: now,      // 创建时间（永不改变）
                    lastUpdate: now       // 最后更新时间
                };
            }
            
            localStorage.setItem(this.storageKey, JSON.stringify(allMissedWords));
            console.log(`💾 保存错词: ${wordData.word || wordData.original}`);
            return true;
        } catch (error) {
            console.error('❌ 错词保存失败:', error);
            return false;
        }
    }
    
    /**
     * 批量保存错词
     */
    async saveMissedWords(wordsArray) {
        try {
            // 确保IP已获取
            if (!this.userIP) {
                await this.getUserIP();
            }
            
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
     * 获取当前IP的错词数量
     */
    async getMissedWordsCount() {
        try {
            if (!this.userIP) {
                await this.getUserIP();
            }
            
            const allMissedWords = JSON.parse(
                localStorage.getItem(this.storageKey) || '{}'
            );
            
            const count = Object.keys(allMissedWords)
                .filter(key => key.startsWith(`${this.userIP}::`))
                .length;
            
            return count;
        } catch (error) {
            console.error('❌ 获取错词数量失败:', error);
            return 0;
        }
    }
    
    /**
     * 获取当前IP的所有错词
     */
    async getMissedWords() {
        try {
            if (!this.userIP) {
                await this.getUserIP();
            }
            
            const allMissedWords = JSON.parse(
                localStorage.getItem(this.storageKey) || '{}'
            );
            
            const words = Object.entries(allMissedWords)
                .filter(([key]) => key.startsWith(`${this.userIP}::`))
                .map(([key, data]) => ({
                    word: data.word,
                    phonetic: data.phonetic || '',
                    meaning: data.meaning || '',
                    count: data.count || 1,
                    createTime: data.createTime || data.lastUpdate || Date.now(),  // 创建时间（兼容旧数据）
                    lastUpdate: data.lastUpdate || Date.now()
                }))
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


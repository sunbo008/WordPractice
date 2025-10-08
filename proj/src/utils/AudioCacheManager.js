/**
 * 音频缓存管理器
 * 双模式存储：本地开发使用文件系统，Vercel部署使用IndexedDB
 * 
 * 使用示例：
 * const cacheManager = new AudioCacheManager();
 * await cacheManager.initialize();
 * 
 * // 检查缓存
 * if (await cacheManager.hasCache('hello', 'baidu')) {
 *   const audioUrl = await cacheManager.getCache('hello', 'baidu');
 *   // 播放音频...
 * }
 * 
 * // 保存缓存
 * const audioBlob = await cacheManager.downloadAudio(url);
 * await cacheManager.saveCache('hello', 'baidu', audioBlob);
 */

// 日志辅助函数（兼容 debugLog 和 console）
const audioCacheLog = {
    info: (msg) => {
        if (typeof debugLog !== 'undefined' && debugLog.info) {
            debugLog.info(msg);
        } else {
            console.log(msg);
        }
    },
    success: (msg) => {
        if (typeof debugLog !== 'undefined' && debugLog.success) {
            debugLog.success(msg);
        } else {
            console.log(msg);
        }
    },
    warning: (msg) => {
        if (typeof debugLog !== 'undefined' && debugLog.warning) {
            debugLog.warning(msg);
        } else {
            console.warn(msg);
        }
    },
    error: (msg) => {
        if (typeof debugLog !== 'undefined' && debugLog.error) {
            debugLog.error(msg);
        } else {
            console.error(msg);
        }
    }
};

class AudioCacheManager {
    constructor() {
        // 单例模式
        if (AudioCacheManager.instance) {
            return AudioCacheManager.instance;
        }
        AudioCacheManager.instance = this;
        
        this.dbName = 'WordTetrisAudioCache';
        this.dbVersion = 1;
        this.storeName = 'audios';
        this.db = null;
        this.initialized = false;
        
        // 环境检测
        this.isLocal = this.isLocalDevelopment();
        
        // IndexedDB 相关
        this.db = null;
        this.initialized = false;
        
        // 本地文件路径前缀
        this.localAudioPath = 'audio/';
        
        // Blob URL 缓存（用于内存管理）
        this.blobUrlCache = new Map(); // key: "word_provider", value: blobUrl
        
        audioCacheLog.info(`🗄️ AudioCacheManager: 检测到${this.isLocal ? '本地开发' : 'Vercel部署'}环境`);
    }
    
    /**
     * 获取单例实例
     */
    static getInstance() {
        if (!AudioCacheManager.instance) {
            AudioCacheManager.instance = new AudioCacheManager();
        }
        return AudioCacheManager.instance;
    }
    
    /**
     * 环境检测：是否是本地开发环境
     */
    isLocalDevelopment() {
        const hostname = location.hostname;
        return hostname === 'localhost' ||
               hostname === '127.0.0.1' ||
               hostname === '' ||
               hostname.startsWith('192.168.') || // 局域网IP
               hostname.startsWith('10.'); // 局域网IP
    }
    
    /**
     * 初始化 IndexedDB
     * @returns {Promise<boolean>} 是否初始化成功
     */
    async initialize() {
        if (this.initialized) {
            return true;
        }
        
        // 检查浏览器是否支持 IndexedDB
        if (!window.indexedDB) {
            audioCacheLog.warning('⚠️ AudioCacheManager: 浏览器不支持 IndexedDB，将仅使用在线模式');
            this.initialized = false;
            return false;
        }
        
        try {
            audioCacheLog.info('🔧 AudioCacheManager: 开始初始化 IndexedDB...');
            
            return new Promise((resolve, reject) => {
                const request = indexedDB.open(this.dbName, this.dbVersion);
                
                // 数据库升级/创建时触发
                request.onupgradeneeded = (event) => {
                    const db = event.target.result;
                    
                    // 如果对象存储不存在，则创建
                    if (!db.objectStoreNames.contains(this.storeName)) {
                        // 创建对象存储，使用自增主键
                        const objectStore = db.createObjectStore(this.storeName, { 
                            keyPath: 'id', 
                            autoIncrement: true 
                        });
                        
                        // 创建复合索引（单词+提供商）
                        objectStore.createIndex('word_provider', ['word', 'provider'], { unique: true });
                        
                        // 创建时间戳索引（可用于清理旧缓存）
                        objectStore.createIndex('timestamp', 'timestamp', { unique: false });
                        
                        audioCacheLog.info('✅ AudioCacheManager: 对象存储已创建');
                    }
                };
                
                // 打开成功
                request.onsuccess = (event) => {
                    this.db = event.target.result;
                    this.initialized = true;
                    audioCacheLog.success(`✅ AudioCacheManager: IndexedDB 初始化成功 (${this.dbName})`);
                    resolve(true);
                };
                
                // 打开失败
                request.onerror = (event) => {
                    audioCacheLog.error(`❌ AudioCacheManager: IndexedDB 初始化失败: ${event.target.error}`);
                    this.initialized = false;
                    reject(event.target.error);
                };
                
                // 数据库被阻止（通常是因为在其他标签页打开了旧版本）
                request.onblocked = () => {
                    audioCacheLog.warning('⚠️ AudioCacheManager: IndexedDB 被阻止（可能有其他标签页正在使用）');
                };
            });
            
        } catch (error) {
            audioCacheLog.error(`❌ AudioCacheManager: 初始化异常: ${error.message || error}`);
            this.initialized = false;
            return false;
        }
    }
    
    /**
     * 生成缓存键
     */
    _getCacheKey(word, provider) {
        return `${word.toLowerCase()}_${provider.toLowerCase()}`;
    }
    
    /**
     * 获取本地文件路径
     */
    getLocalFilePath(word, provider) {
        return `${this.localAudioPath}${word.toLowerCase()}_${provider.toLowerCase()}.mp3`;
    }
    
    /**
     * 检查本地文件是否存在
     * @param {string} word - 单词
     * @param {string} provider - 提供商 (baidu/youdao/bing)
     * @returns {Promise<boolean>} 是否存在
     */
    async checkLocalFile(word, provider) {
        if (!this.isLocal) {
            return false;
        }
        
        try {
            const filePath = this.getLocalFilePath(word, provider);
            const response = await fetch(filePath, { method: 'HEAD' });
            return response.ok;
        } catch {
            return false;
        }
    }
    
    /**
     * 检查缓存是否存在
     * @param {string} word - 单词
     * @param {string} provider - 提供商 (baidu/youdao/bing)
     * @returns {Promise<boolean>} 是否存在缓存
     */
    async hasCache(word, provider) {
        const cacheKey = this._getCacheKey(word, provider);
        
        // 1. 检查本地文件
        const hasLocalFile = await this.checkLocalFile(word, provider);
        if (hasLocalFile) {
            audioCacheLog.info(`✅ AudioCacheManager: 找到本地文件: ${word}_${provider}.mp3`);
            return true;
        }
        
        // 2. 检查 IndexedDB
        if (!this.initialized) {
            return false;
        }
        
        try {
            return new Promise((resolve) => {
                const transaction = this.db.transaction([this.storeName], 'readonly');
                const objectStore = transaction.objectStore(this.storeName);
                const index = objectStore.index('word_provider');
                
                const request = index.get([word.toLowerCase(), provider.toLowerCase()]);
                
                request.onsuccess = () => {
                    const exists = !!request.result;
                    if (exists) {
                        audioCacheLog.info(`✅ AudioCacheManager: 找到 IndexedDB 缓存: ${word}_${provider}`);
                    }
                    resolve(exists);
                };
                
                request.onerror = () => {
                    audioCacheLog.warning(`⚠️ AudioCacheManager: 检查缓存失败: ${request.error}`);
                    resolve(false);
                };
            });
            
        } catch (error) {
            audioCacheLog.error(`❌ AudioCacheManager: hasCache 异常: ${error.message || error}`);
            return false;
        }
    }
    
    /**
     * 获取缓存音频（返回 Blob URL）
     * @param {string} word - 单词
     * @param {string} provider - 提供商 (baidu/youdao/bing)
     * @returns {Promise<string|null>} Blob URL 或 null
     */
    async getCache(word, provider) {
        const cacheKey = this._getCacheKey(word, provider);
        
        // 1. 检查内存缓存
        if (this.blobUrlCache.has(cacheKey)) {
            audioCacheLog.info(`💾 AudioCacheManager: 使用内存缓存: ${cacheKey}`);
            return this.blobUrlCache.get(cacheKey);
        }
        
        // 2. 检查本地文件
        const hasLocalFile = await this.checkLocalFile(word, provider);
        if (hasLocalFile) {
            const filePath = this.getLocalFilePath(word, provider);
            audioCacheLog.success(`📂 AudioCacheManager: 使用本地文件: ${filePath}`);
            
            // 本地文件可以直接返回路径，不需要 Blob URL
            // 但为了统一接口，我们也可以转换为 Blob URL
            // 这里选择直接返回路径（更高效）
            return filePath;
        }
        
        // 3. 从 IndexedDB 获取
        if (!this.initialized) {
            return null;
        }
        
        try {
            return new Promise((resolve) => {
                const transaction = this.db.transaction([this.storeName], 'readonly');
                const objectStore = transaction.objectStore(this.storeName);
                const index = objectStore.index('word_provider');
                
                const request = index.get([word.toLowerCase(), provider.toLowerCase()]);
                
                request.onsuccess = () => {
                    const result = request.result;
                    if (result && result.blob) {
                        const blobUrl = URL.createObjectURL(result.blob);
                        
                        // 缓存到内存
                        this.blobUrlCache.set(cacheKey, blobUrl);
                        
                        audioCacheLog.success(`🗄️ AudioCacheManager: 从 IndexedDB 读取: ${cacheKey}`);
                        resolve(blobUrl);
                    } else {
                        resolve(null);
                    }
                };
                
                request.onerror = () => {
                    audioCacheLog.error(`❌ AudioCacheManager: 读取缓存失败: ${request.error}`);
                    resolve(null);
                };
            });
            
        } catch (error) {
            audioCacheLog.error(`❌ AudioCacheManager: getCache 异常: ${error.message || error}`);
            return null;
        }
    }
    
    /**
     * 保存缓存
     * @param {string} word - 单词
     * @param {string} provider - 提供商 (baidu/youdao/bing)
     * @param {Blob} audioBlob - 音频 Blob 对象
     * @returns {Promise<boolean>} 是否保存成功
     */
    async saveCache(word, provider, audioBlob) {
        // 本地开发环境：提示下载到本地文件
        if (this.isLocal) {
            this._promptDownloadFile(word, provider, audioBlob);
        }
        
        // 保存到 IndexedDB
        if (!this.initialized) {
            audioCacheLog.warning('⚠️ AudioCacheManager: IndexedDB 未初始化，跳过保存');
            return false;
        }
        
        const cacheKey = this._getCacheKey(word, provider);
        
        try {
            return new Promise((resolve) => {
                const transaction = this.db.transaction([this.storeName], 'readwrite');
                const objectStore = transaction.objectStore(this.storeName);
                const index = objectStore.index('word_provider');
                
                // 先检查是否已存在
                const getRequest = index.get([word.toLowerCase(), provider.toLowerCase()]);
                
                getRequest.onsuccess = () => {
                    const existingKey = getRequest.result ? getRequest.result.id : null;
                    
                    const data = {
                        word: word.toLowerCase(),
                        provider: provider.toLowerCase(),
                        blob: audioBlob,
                        timestamp: Date.now()
                    };
                    
                    if (existingKey) {
                        // 删除旧记录
                        const deleteRequest = objectStore.delete(existingKey);
                        
                        deleteRequest.onsuccess = () => {
                            // 添加新记录
                            const addRequest = objectStore.add(data);
                            
                            addRequest.onsuccess = () => {
                                audioCacheLog.success(`💾 AudioCacheManager: 已保存到 IndexedDB (更新): ${cacheKey}`);
                                
                                // 同时缓存 Blob URL 到内存
                                const blobUrl = URL.createObjectURL(audioBlob);
                                this.blobUrlCache.set(cacheKey, blobUrl);
                                
                                resolve(true);
                            };
                            
                            addRequest.onerror = () => {
                                audioCacheLog.error(`❌ AudioCacheManager: 添加记录失败: ${addRequest.error}`);
                                resolve(false);
                            };
                        };
                        
                        deleteRequest.onerror = () => {
                            audioCacheLog.error(`❌ AudioCacheManager: 删除旧记录失败: ${deleteRequest.error}`);
                            resolve(false);
                        };
                    } else {
                        // 直接添加新记录
                        const addRequest = objectStore.add(data);
                        
                        addRequest.onsuccess = () => {
                            audioCacheLog.success(`💾 AudioCacheManager: 已保存到 IndexedDB (新建): ${cacheKey}`);
                            
                            // 同时缓存 Blob URL 到内存
                            const blobUrl = URL.createObjectURL(audioBlob);
                            this.blobUrlCache.set(cacheKey, blobUrl);
                            
                            resolve(true);
                        };
                        
                        addRequest.onerror = () => {
                            audioCacheLog.error(`❌ AudioCacheManager: 保存失败: ${addRequest.error}`);
                            resolve(false);
                        };
                    }
                };
                
                getRequest.onerror = () => {
                    audioCacheLog.error(`❌ AudioCacheManager: 查询旧记录失败: ${getRequest.error}`);
                    resolve(false);
                };
            });
            
        } catch (error) {
            audioCacheLog.error(`❌ AudioCacheManager: saveCache 异常: ${error.message || error}`);
            return false;
        }
    }
    
    /**
     * 提示下载文件（仅本地开发环境）
     * @param {string} word - 单词
     * @param {string} provider - 提供商
     * @param {Blob} audioBlob - 音频 Blob
     */
    _promptDownloadFile(word, provider, audioBlob) {
        const fileName = `${word.toLowerCase()}_${provider.toLowerCase()}.mp3`;
        
        audioCacheLog.info(`💡 AudioCacheManager: [本地开发] 建议下载文件: ${fileName}`);
        audioCacheLog.info(`   保存到: proj/audio/${fileName}`);
        audioCacheLog.info(`   然后通过 git 提交到代码库`);
        
        // 创建下载链接（但不自动触发，避免骚扰用户）
        // 用户可以手动在控制台调用 downloadLocalAudio() 方法
        if (!window._audioCacheDownloadQueue) {
            window._audioCacheDownloadQueue = [];
            
            // 创建全局下载函数
            window.downloadLocalAudio = () => {
                const queue = window._audioCacheDownloadQueue || [];
                if (queue.length === 0) {
                    audioCacheLog.warning('⚠️ 没有待下载的音频文件');
                    return;
                }
                
                audioCacheLog.info(`📥 开始下载 ${queue.length} 个音频文件...`);
                
                queue.forEach((item, index) => {
                    setTimeout(() => {
                        const a = document.createElement('a');
                        const url = URL.createObjectURL(item.blob);
                        a.href = url;
                        a.download = item.fileName;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                        
                        audioCacheLog.success(`✅ 已下载: ${item.fileName}`);
                    }, index * 500); // 每个文件间隔 500ms，避免浏览器阻止
                });
                
                // 清空队列
                window._audioCacheDownloadQueue = [];
            };
            
            audioCacheLog.info('💡 提示: 在控制台执行 downloadLocalAudio() 可批量下载音频文件');
        }
        
        window._audioCacheDownloadQueue.push({ fileName, blob: audioBlob });
    }
    
    /**
     * 下载在线音频为 Blob
     * @param {string} url - 音频 URL
     * @returns {Promise<Blob>} 音频 Blob
     */
    async downloadAudio(url) {
        try {
            audioCacheLog.info(`📥 AudioCacheManager: 开始下载音频: ${url.substring(0, 60)}...`);
            
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const blob = await response.blob();
            
            audioCacheLog.success(`✅ AudioCacheManager: 下载完成 (${(blob.size / 1024).toFixed(2)} KB)`);
            
            return blob;
            
        } catch (error) {
            // 根据错误类型提供更友好的提示
            const errorMsg = error.message || error;
            if (errorMsg.includes('Failed to fetch') || errorMsg.includes('CORS')) {
                audioCacheLog.info(`ℹ️ AudioCacheManager: 无法下载（CORS跨域限制），将直接播放在线音频`);
            } else {
                audioCacheLog.error(`❌ AudioCacheManager: 下载失败: ${errorMsg}`);
            }
            throw error;
        }
    }
    
    /**
     * 清理 Blob URL 缓存（释放内存）
     */
    clearBlobUrlCache() {
        audioCacheLog.info(`🧹 AudioCacheManager: 清理 Blob URL 缓存 (${this.blobUrlCache.size} 个)`);
        
        this.blobUrlCache.forEach((blobUrl) => {
            URL.revokeObjectURL(blobUrl);
        });
        
        this.blobUrlCache.clear();
    }
    
    /**
     * 获取缓存统计信息
     */
    async getStats() {
        if (!this.initialized) {
            return { total: 0, totalSize: 0, items: [] };
        }
        
        try {
            return new Promise((resolve) => {
                const transaction = this.db.transaction([this.storeName], 'readonly');
                const objectStore = transaction.objectStore(this.storeName);
                const request = objectStore.getAll();
                
                request.onsuccess = () => {
                    const items = request.result || [];
                    const totalSize = items.reduce((sum, item) => sum + (item.blob?.size || 0), 0);
                    
                    resolve({
                        total: items.length,
                        totalSize,
                        items: items.map(item => ({
                            word: item.word,
                            provider: item.provider,
                            size: item.blob?.size || 0,
                            timestamp: item.timestamp
                        }))
                    });
                };
                
                request.onerror = () => {
                    audioCacheLog.error(`❌ AudioCacheManager: 获取统计信息失败: ${request.error}`);
                    resolve({ total: 0, totalSize: 0, items: [] });
                };
            });
            
        } catch (error) {
            audioCacheLog.error(`❌ AudioCacheManager: getStats 异常: ${error.message || error}`);
            return { total: 0, totalSize: 0, items: [] };
        }
    }
    
    /**
     * 清空所有缓存
     * @returns {Promise<boolean>} 是否清空成功
     */
    async clearAllCache() {
        if (!this.initialized) {
            return false;
        }
        
        try {
            return new Promise((resolve) => {
                const transaction = this.db.transaction([this.storeName], 'readwrite');
                const objectStore = transaction.objectStore(this.storeName);
                const request = objectStore.clear();
                
                request.onsuccess = () => {
                    audioCacheLog.success('✅ AudioCacheManager: 已清空所有缓存');
                    this.clearBlobUrlCache();
                    resolve(true);
                };
                
                request.onerror = () => {
                    audioCacheLog.error(`❌ AudioCacheManager: 清空缓存失败: ${request.error}`);
                    resolve(false);
                };
            });
            
        } catch (error) {
            audioCacheLog.error(`❌ AudioCacheManager: clearAllCache 异常: ${error.message || error}`);
            return false;
        }
    }
}

// 导出到 window 对象，供全局使用
if (typeof window !== 'undefined') {
    window.AudioCacheManager = AudioCacheManager;
    console.log('✅ [AudioCacheManager.js] 已导出到 window.AudioCacheManager');
}

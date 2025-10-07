/**
 * TTS (Text-to-Speech) 服务
 * 多提供商降级机制，确保在各种网络环境下都能正常使用
 * 
 * 使用示例：
 * import { TTSService } from './TTSService.js';
 * const tts = TTSService.getInstance();
 * await tts.speak('hello');
 */

class TTSService {
    constructor() {
        // 单例模式
        if (TTSService.instance) {
            return TTSService.instance;
        }
        TTSService.instance = this;
        
        // 初始化状态
        this.speechInitialized = false;
        this.britishVoice = null;
        this.currentProviderIndex = 0;
        this.isSpeaking = false;
        this.providerTested = false; // 标记是否已测试过提供商
        this.availableProviders = []; // 缓存所有可用的提供商（数组）
        this.currentAvailableIndex = 0; // 当前使用的可用提供商索引（用于轮换）
        
        // 定义 TTS 提供商列表（按优先级排序）
        this.providers = [
            {
                name: 'Web Speech API',
                description: '浏览器原生语音合成（需要 Google 服务）',
                test: () => {
                    if (!('speechSynthesis' in window)) return false;
                    const voices = speechSynthesis.getVoices();
                    return voices.length > 0;
                },
                speak: (word) => this._speakWithWebSpeechAPI(word)
            },
            {
                name: '百度翻译 TTS',
                description: '百度翻译语音合成（国内稳定可用）',
                test: () => true,
                speak: (word) => this._speakWithAudioURL(
                    `https://fanyi.baidu.com/gettts?lan=en&text=${encodeURIComponent(word)}&spd=5&source=web`,
                    '百度翻译 TTS'
                )
            },
            {
                name: '有道智云 TTS',
                description: '有道词典语音合成（国内稳定可用）',
                test: () => true,
                speak: (word) => this._speakWithAudioURL(
                    `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=1`,
                    '有道智云 TTS'
                )
            },
            {
                name: '微软 Bing TTS',
                description: '微软 Bing 语音合成（备用方案）',
                test: () => true,
                speak: (word) => this._speakWithAudioURL(
                    `https://www.bing.com/tts?text=${encodeURIComponent(word)}&lang=en-US&format=audio/mp3`,
                    '微软 Bing TTS'
                )
            }
        ];
        
        // 初始化 Web Speech API
        this._initWebSpeechAPI();
    }
    
    /**
     * 获取单例实例
     */
    static getInstance() {
        if (!TTSService.instance) {
            TTSService.instance = new TTSService();
        }
        return TTSService.instance;
    }
    
    /**
     * 初始化并测试 TTS 提供商（异步）
     * 在第一次使用前调用，找到所有可用的提供商
     */
    async initialize() {
        if (this.providerTested) {
            return; // 已经测试过了
        }
        
        console.log('🔍 TTSService: 开始测试所有 TTS 提供商...');
        
        // 测试每个提供商，收集所有可用的
        for (let i = 0; i < this.providers.length; i++) {
            const provider = this.providers[i];
            
            try {
                // 测试提供商是否可用
                if (!provider.test()) {
                    console.log(`⏭️ TTSService: ${provider.name} 不可用（测试失败）`);
                    continue;
                }
                
                // 对于 Web Speech API，特殊处理
                if (provider.name === 'Web Speech API') {
                    this._initWebSpeechAPI();
                }
                
                // 添加到可用列表
                this.availableProviders.push({
                    ...provider,
                    index: i // 记录原始索引
                });
                
                console.log(`✅ TTSService: ${provider.name} 可用`);
                
            } catch (error) {
                console.warn(`❌ TTSService: ${provider.name} 测试失败:`, error.message);
            }
        }
        
        this.providerTested = true;
        
        // 输出测试结果
        if (this.availableProviders.length > 0) {
            console.log(`🎯 TTSService: 找到 ${this.availableProviders.length} 个可用的 TTS 提供商:`);
            this.availableProviders.forEach((provider, idx) => {
                console.log(`   ${idx + 1}. ${provider.name} (${provider.description})`);
            });
            console.log(`📌 TTSService: 将在这些提供商之间轮换使用，提高稳定性`);
        } else {
            console.error('❌ TTSService: 没有找到可用的 TTS 提供商');
        }
    }
    
    /**
     * 初始化 Web Speech API
     */
    _initWebSpeechAPI() {
        if ('speechSynthesis' in window) {
            // 监听语音列表加载完成
            speechSynthesis.onvoiceschanged = () => {
                this._selectBritishVoice();
            };
            
            // 尝试立即选择语音
            this._selectBritishVoice();
        }
    }
    
    /**
     * 选择英式发音
     */
    _selectBritishVoice() {
        if (!('speechSynthesis' in window)) return;
        
        const voices = speechSynthesis.getVoices();
        
        // 优先级：英国英语 > 英式英语相关
        this.britishVoice = voices.find(voice => 
            voice.lang === 'en-GB' && voice.name.includes('UK')
        ) || voices.find(voice => 
            voice.lang === 'en-GB' && voice.name.includes('British')
        ) || voices.find(voice => 
            voice.lang === 'en-GB'
        ) || voices.find(voice => 
            voice.lang.startsWith('en-') && voice.name.includes('UK')
        ) || voices.find(voice => 
            voice.lang.startsWith('en-') && voice.name.includes('British')
        );
        
        if (this.britishVoice) {
            console.log('✅ TTSService: 已选择英式语音:', this.britishVoice.name, this.britishVoice.lang);
        }
    }
    
    /**
     * 激活 Web Speech API（需要用户交互）
     */
    activateWebSpeechAPI() {
        if (!this.speechInitialized && 'speechSynthesis' in window) {
            // 选择英式语音
            this._selectBritishVoice();
            
            // 创建一个静音的 utterance 来激活语音合成
            const utterance = new SpeechSynthesisUtterance('');
            utterance.volume = 0;
            speechSynthesis.speak(utterance);
            this.speechInitialized = true;
            console.log('✅ TTSService: Web Speech API 已激活');
        }
    }
    
    /**
     * 使用 Web Speech API 朗读
     */
    _speakWithWebSpeechAPI(word) {
        return new Promise((resolve, reject) => {
            if (!('speechSynthesis' in window)) {
                reject(new Error('浏览器不支持 Web Speech API'));
                return;
            }
            
            // 如果还没初始化，先激活
            if (!this.speechInitialized) {
                this.activateWebSpeechAPI();
            }
            
            // 如果还没有选择语音，尝试选择
            if (!this.britishVoice) {
                this._selectBritishVoice();
            }
            
            // 停止之前的朗读
            speechSynthesis.cancel();
            
            const utterance = new SpeechSynthesisUtterance(word);
            
            // 优先使用选中的英式语音
            if (this.britishVoice) {
                utterance.voice = this.britishVoice;
            }
            
            // 设置语言为英式英语
            utterance.lang = 'en-GB';
            utterance.rate = 0.8;  // 语速
            utterance.pitch = 1.0; // 音调
            utterance.volume = 1.0; // 音量
            
            utterance.onend = () => resolve();
            utterance.onerror = (e) => reject(e);
            
            speechSynthesis.speak(utterance);
        });
    }
    
    /**
     * 使用音频 URL 朗读
     */
    _speakWithAudioURL(url, providerName) {
        return new Promise((resolve, reject) => {
            const audio = new Audio(url);
            
            audio.onended = () => resolve();
            audio.onerror = (e) => {
                reject(new Error(`${providerName} 音频加载失败`));
            };
            
            audio.play().catch(reject);
        });
    }
    
    /**
     * 朗读单词（带自动降级）
     * @param {string} word - 要朗读的单词
     * @param {Object} options - 配置选项
     * @param {boolean} options.showError - 是否显示错误提示（默认 true）
     * @param {Function} options.onSuccess - 成功回调
     * @param {Function} options.onError - 失败回调
     * @returns {Promise<void>}
     */
    async speak(word, options = {}) {
        const {
            showError = true,
            onSuccess = null,
            onError = null
        } = options;
        
        // 防止重复朗读 - 但允许强制停止旧的朗读
        if (this.isSpeaking) {
            console.warn('⚠️ TTSService: 上一次朗读还未完成，先停止旧的朗读');
            this.stop(); // 停止旧的朗读
        }
        
        // 如果还没有测试过提供商，先初始化
        if (!this.providerTested) {
            await this.initialize();
        }
        
        // 如果有可用的提供商，轮换使用
        if (this.availableProviders.length > 0) {
            this.isSpeaking = true;
            
            // 尝试当前提供商和后续的所有提供商
            const startIndex = this.currentAvailableIndex;
            let attemptCount = 0;
            
            while (attemptCount < this.availableProviders.length) {
                const provider = this.availableProviders[this.currentAvailableIndex];
                
                try {
                    await provider.speak(word);
                    console.log(`✅ TTSService: 使用 ${provider.name} 朗读: ${word} [${this.currentAvailableIndex + 1}/${this.availableProviders.length}]`);
                    
                    if (onSuccess) {
                        onSuccess(provider.name);
                    }
                    
                    // 成功后，轮换到下一个提供商（为下次调用准备）
                    this.currentAvailableIndex = (this.currentAvailableIndex + 1) % this.availableProviders.length;
                    
                    this.isSpeaking = false;
                    return;
                    
                } catch (error) {
                    console.warn(`❌ TTSService: ${provider.name} 失败 [${this.currentAvailableIndex + 1}/${this.availableProviders.length}]:`, error.message);
                    
                    // 尝试下一个提供商
                    this.currentAvailableIndex = (this.currentAvailableIndex + 1) % this.availableProviders.length;
                    attemptCount++;
                    
                    // 如果还有其他提供商可尝试
                    if (attemptCount < this.availableProviders.length) {
                        console.log(`🔄 TTSService: 切换到下一个提供商: ${this.availableProviders[this.currentAvailableIndex].name}`);
                    }
                }
            }
            
            // 所有可用提供商都失败了
            this.isSpeaking = false;
            const errorMsg = '所有可用的 TTS 服务均失败';
            console.error(`❌ TTSService: ${errorMsg}`);
            
            if (showError) {
                this._showErrorNotification(errorMsg);
            }
            
            if (onError) {
                onError(new Error(errorMsg));
            }
            
            return;
        }
        
        // 没有可用的提供商
        const errorMsg = '所有 TTS 服务均不可用';
        console.error(`❌ TTSService: ${errorMsg}`);
        
        if (showError) {
            this._showErrorNotification(errorMsg);
        }
        
        if (onError) {
            onError(new Error(errorMsg));
        }
    }
    
    /**
     * 显示错误通知
     */
    _showErrorNotification(message) {
        // 避免重复显示
        if (document.getElementById('tts-error-notification')) {
            return;
        }
        
        const notification = document.createElement('div');
        notification.id = 'tts-error-notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(231, 76, 60, 0.95);
            color: white;
            padding: 15px 25px;
            border-radius: 10px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            z-index: 10000;
            animation: tts-slideIn 0.5s ease;
            font-size: 14px;
        `;
        notification.textContent = `⚠️ ${message}`;
        
        // 添加动画
        if (!document.querySelector('style#tts-animations')) {
            const style = document.createElement('style');
            style.id = 'tts-animations';
            style.textContent = `
                @keyframes tts-slideIn {
                    from { transform: translateX(400px); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes tts-fadeOut {
                    to { opacity: 0; transform: translateX(400px); }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(notification);
        
        // 3秒后自动消失
        setTimeout(() => {
            notification.style.animation = 'tts-fadeOut 0.5s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 500);
        }, 3000);
    }
    
    /**
     * 获取可用的 TTS 提供商列表
     * @returns {Array} 可用提供商的名称数组
     */
    getAvailableProviders() {
        return this.availableProviders.map(p => p.name);
    }
    
    /**
     * 获取当前使用的 TTS 提供商
     * @returns {string|null} 当前提供商名称
     */
    getCurrentProvider() {
        if (this.availableProviders.length > 0) {
            return this.availableProviders[this.currentAvailableIndex].name;
        }
        return null;
    }
    
    /**
     * 停止当前朗读
     */
    stop() {
        if ('speechSynthesis' in window) {
            speechSynthesis.cancel();
        }
        this.isSpeaking = false;
        console.log('⏹️ TTSService: 已停止朗读');
    }
    
    /**
     * 获取可用的 TTS 提供商列表
     */
    getAvailableProviders() {
        return this.providers.filter(provider => provider.test());
    }
    
    /**
     * 获取当前使用的提供商
     */
    getCurrentProvider() {
        return this.providers[this.currentProviderIndex];
    }
    
    /**
     * 手动切换到指定的提供商
     */
    switchProvider(providerIndex) {
        if (providerIndex >= 0 && providerIndex < this.providers.length) {
            this.currentProviderIndex = providerIndex;
            console.log(`🔄 TTSService: 切换到 ${this.providers[providerIndex].name}`);
        }
    }
}

// 导出到 window 对象，供全局使用
if (typeof window !== 'undefined') {
    window.TTSService = TTSService;
}

// 如果使用 ES6 模块，也提供 export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TTSService };
}


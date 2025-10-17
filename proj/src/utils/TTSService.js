/**
 * TTS (Text-to-Speech) 服务
 * 多提供商降级机制，确保在各种网络环境下都能正常使用
 * 
 * 使用示例：
 * import { TTSService } from './TTSService.js';
 * const tts = TTSService.getInstance();
 * await tts.speak('hello');
 */

// 标记文件开始执行
window._TTSServiceLoadStart = true;
console.log('🔧 [TTSService.js] 文件开始执行...');

// 日志辅助函数（兼容 debugLog 和 console）
const ttsLog = {
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
        this.currentSpeakId = 0; // 当前 speak() 调用的 ID（用于取消令牌）
        this.activeSpeakIds = new Set(); // 当前活跃的 speak() 调用 ID 集合
        this.cancelledSpeakIds = new Set(); // 已取消的 speak() 调用 ID 集合
        this.currentWord = null; // 当前正在播放的单词
        this.providerTested = false; // 标记是否已测试过提供商
        this.availableProviders = []; // 缓存所有可用的提供商（数组）
        this.currentAvailableIndex = 0; // 当前使用的可用提供商索引（用于轮换）
        this.activeAudios = []; // 所有正在播放的 Audio 对象（用于停止播放）
        this.providerFailureCount = new Map(); // 记录每个提供商的连续失败次数
        this.audioContextUnlocked = false; // 标记 iOS 音频上下文是否已解锁
        this.preloadedAudio = null; // 预加载的 Audio 对象（用于 iOS 兼容）
        
        // 音频缓存管理器
        this.cacheManager = null; // 延迟初始化（在 initialize() 中）
        this.cacheEnabled = true; // 是否启用缓存
        
        // 检测是否是 iOS 设备
        this.isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        
        // 定义 TTS 提供商列表（按优先级排序）
        // iOS 设备优先使用 Web Speech API（避免 Audio 对象的 autoplay 限制）
        if (this.isIOS) {
            ttsLog.info('🍎 检测到 iOS 设备，优先使用 Web Speech API（避免音频播放限制）');
            this.providers = [
                {
                    name: 'Web Speech API',
                    description: '浏览器原生语音合成（iOS 推荐）',
                    test: () => {
                        // 只检查浏览器是否支持，不检查语音列表
                        // 因为语音列表可能异步加载，初始为空是正常的
                        return ('speechSynthesis' in window);
                    },
                    speak: (word, volume = 1.0) => this._speakWithWebSpeechAPI(word, volume)
                },
                // iOS 上保留 Audio URL 方案作为备选（虽然可能受限）
                {
                    name: '有道智云 TTS',
                    description: '有道词典语音合成（备用方案）',
                    test: () => true,
                    speak: (word, volume = 1.0) => this._speakWithAudioURL(
                        `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=1`,
                        '有道智云 TTS',
                        volume,
                        word // 传递单词用于缓存
                    )
                },
                {
                    name: '百度翻译 TTS',
                    description: '百度翻译语音合成（备用方案）',
                    test: () => true,
                    speak: (word, volume = 1.0) => this._speakWithAudioURL(
                        `https://fanyi.baidu.com/gettts?lan=en&text=${encodeURIComponent(word)}&spd=5&source=web`,
                        '百度翻译 TTS',
                        volume,
                        word // 传递单词用于缓存
                    )
                }
            ];
        } else {
            // 非 iOS 设备：优先使用音频 URL 方案（音质更好）
            this.providers = [
                {
                    name: '百度翻译 TTS',
                    description: '百度翻译语音合成（国内稳定可用）',
                    test: () => true,
                    speak: (word, volume = 1.0) => this._speakWithAudioURL(
                        `https://fanyi.baidu.com/gettts?lan=en&text=${encodeURIComponent(word)}&spd=5&source=web`,
                        '百度翻译 TTS',
                        volume,
                        word // 传递单词用于缓存
                    )
                },
                {
                    name: '有道智云 TTS',
                    description: '有道词典语音合成（国内稳定可用）',
                    test: () => true,
                    speak: (word, volume = 1.0) => this._speakWithAudioURL(
                        `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=1`,
                        '有道智云 TTS',
                        volume,
                        word // 传递单词用于缓存
                    )
                },
                {
                    name: 'Google Translate TTS',
                    description: 'Google 翻译语音合成（备用方案）',
                    test: () => true,
                    speak: (word, volume = 1.0) => this._speakWithAudioURL(
                        `https://translate.google.com/translate_tts?ie=UTF-8&tl=en&client=tw-ob&q=${encodeURIComponent(word)}`,
                        'Google Translate TTS',
                        volume,
                        word // 传递单词用于缓存
                    )
                },
                {
                    name: 'Web Speech API',
                    description: '浏览器原生语音合成（备用方案）',
                    test: () => {
                        return ('speechSynthesis' in window);
                    },
                    speak: (word, volume = 1.0) => this._speakWithWebSpeechAPI(word, volume)
                }
            ];
        }
        
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
     * 真正测试每个提供商是否能成功朗读，并按响应速度排序
     */
    async initialize() {
        if (this.providerTested) {
            return; // 已经测试过了
        }
        
        // 初始化音频缓存管理器
        if (!this.cacheManager && this.cacheEnabled) {
            try {
                if (typeof AudioCacheManager !== 'undefined') {
                    this.cacheManager = AudioCacheManager.getInstance();
                    await this.cacheManager.initialize();
                    ttsLog.success('✅ TTSService: 音频缓存管理器初始化成功');
                } else {
                    ttsLog.warning('⚠️ TTSService: AudioCacheManager 未加载，缓存功能将不可用');
                    this.cacheEnabled = false;
                }
            } catch (error) {
                ttsLog.error(`❌ TTSService: 缓存管理器初始化失败: ${error.message || error}`);
                this.cacheEnabled = false;
            }
        }
        
        ttsLog.info('🔍 TTSService: 开始并行测试所有 TTS 提供商（使用测试单词 "see"）...');
        ttsLog.info('⏱️ TTSService: 将并行测试真实播放能力并按响应速度排序');
        
        // 创建所有测试任务
        const testPromises = this.providers.map((provider, i) => {
            return this._testSingleProvider(provider, i, 'see');
        });
        
        // 并行执行所有测试
        const testResults = await Promise.all(testPromises);
        
        // 收集成功的候选者
        const candidates = testResults.filter(result => result !== null);
        
        // 按响应速度排序（快的在前）
        candidates.sort((a, b) => a.responseTime - b.responseTime);
        
        // 将排序后的结果赋值给 availableProviders
        this.availableProviders = candidates;

        // 调整优先级：若有道 TTS 可用，则提升优先级
        // - 非 iOS：将有道放到首位（最高优先级）
        // - iOS：保持 Web Speech API 为首位，如有道可用则放在其后
        try {
            const youdaoIndex = this.availableProviders.findIndex(p => (p.name || '').includes('有道'));
            if (youdaoIndex !== -1) {
                const youdaoProvider = this.availableProviders.splice(youdaoIndex, 1)[0];
                if (this.isIOS) {
                    const webIndex = this.availableProviders.findIndex(p => p.name === 'Web Speech API');
                    if (webIndex > -1) {
                        // 确保 Web Speech API 在首位
                        if (webIndex !== 0) {
                            const webProvider = this.availableProviders.splice(webIndex, 1)[0];
                            this.availableProviders.unshift(webProvider);
                        }
                        // 将有道插入到 Web Speech API 之后
                        this.availableProviders.splice(1, 0, youdaoProvider);
                    } else {
                        // iOS 但未检测到 Web Speech（极少见），将有道放到首位
                        this.availableProviders.unshift(youdaoProvider);
                    }
                } else {
                    // 非 iOS：有道置顶
                    this.availableProviders.unshift(youdaoProvider);
                }
            }
        } catch (e) {
            // 安全降级：若重排失败则忽略，保持按速度排序
        }
        
        this.providerTested = true;
        
        // 输出测试结果
        if (this.availableProviders.length > 0) {
            ttsLog.success(`✅ TTS 服务初始化完成，找到 ${this.availableProviders.length} 个可用提供商（已按速度排序）:`);
            this.availableProviders.forEach((provider, idx) => {
                const speedBadge = idx === 0 ? '⚡' : '  ';
                ttsLog.info(`${speedBadge} ${idx + 1}. ${provider.name} - ${provider.responseTime.toFixed(0)}ms`);
            });
        } else {
            ttsLog.error('❌ TTSService: 没有找到可用的 TTS 提供商');
        }
    }
    
    /**
     * 测试单个提供商（异步独立测试）
     * @param {Object} provider - 提供商对象
     * @param {number} index - 提供商索引
     * @param {string} testWord - 测试单词
     * @returns {Promise<Object|null>} 测试结果或 null
     */
    async _testSingleProvider(provider, index, testWord) {
        try {
            // 第一步：基础测试
            if (!provider.test()) {
                // 测试失败不输出日志，避免刷屏
                return null;
            }
            
            // 测试中也不输出日志，避免刷屏
            const startTime = performance.now();
            
            // 对于 Web Speech API，特殊处理
            if (provider.name === 'Web Speech API') {
                this._initWebSpeechAPI();
                
                // 等待语音列表加载（最多等待 2 秒）
                const voices = await this._waitForVoices(2000);
                
                if (voices.length === 0) {
                    return null;
                }
                
                // 语音信息不输出，避免刷屏
            }
            
            // 初始化时使用静音测试（因为没有用户交互，真实发声会被浏览器阻止）
            // 对于 Web Speech API，使用静音测试
            if (provider.name === 'Web Speech API') {
                // 测试过程不输出日志，避免刷屏
                
                const canSpeak = await this._testProviderWithTimeout(provider, testWord, 1000);
                const responseTime = performance.now() - startTime;
                
                if (canSpeak) {
                    // 如果是在线语音，标记为需要进一步验证
                    const needsVerification = this.britishVoice && !this.britishVoice.localService;
                    return {
                        ...provider,
                        index: index,
                        responseTime: responseTime,
                        needsVerification: needsVerification  // 标记需要验证
                    };
                } else {
                    return null;
                }
            }
            
            // 对于基于 URL 的提供商，使用音频加载测试
            const canSpeak = await this._testAudioProvider(provider, testWord);
            const responseTime = performance.now() - startTime;
            
            if (canSpeak) {
                return {
                    ...provider,
                    index: index,
                    responseTime: responseTime
                };
            } else {
                return null;
            }
            
        } catch (error) {
            return null;
        }
    }
    
    /**
     * 真实发声测试（公共方法）
     * 用于初始化和测试页面的真实发声测试
     * @param {Object} provider - 提供商对象
     * @param {string} testWord - 测试单词
     * @param {number} timeout - 超时时间（毫秒）
     * @param {number} volume - 音量（0.0-1.0）
     * @returns {Promise<boolean>} 是否可用
     */
    async _testProviderWithRealSpeak(provider, testWord, timeout = 2000, volume = 0.1) {
        return new Promise(async (resolve) => {
            let timeoutId;
            let resolved = false;
            
            // 设置超时
            timeoutId = setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    // 停止可能的播放
                    if (provider.name === 'Web Speech API' && 'speechSynthesis' in window) {
                        speechSynthesis.cancel();
                    }
                    resolve(false);
                }
            }, timeout);
            
            try {
                // 调用提供商的真实 speak 方法（使用小音量）
                await provider.speak(testWord, volume);
                
                if (!resolved) {
                    resolved = true;
                    clearTimeout(timeoutId);
                    resolve(true);
                }
            } catch (error) {
                if (!resolved) {
                    resolved = true;
                    clearTimeout(timeoutId);
                    resolve(false);
                }
            }
        });
    }
    
    /**
     * 统一的提供商测试方法（带超时控制）
     * @param {Object} provider - 提供商对象
     * @param {string} testWord - 测试单词
     * @param {number} timeout - 超时时间（毫秒）
     * @returns {Promise<boolean>} 是否可用
     */
    async _testProviderWithTimeout(provider, testWord, timeout = 1000) {
        return new Promise(async (resolve) => {
            let timeoutId;
            let resolved = false;
            
            // 设置超时
            timeoutId = setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    // 停止可能的播放
                    if (provider.name === 'Web Speech API' && 'speechSynthesis' in window) {
                        speechSynthesis.cancel();
                    }
                    resolve(false);
                }
            }, timeout);
            
            try {
                // 调用提供商的 speak 方法（静音测试）
                if (provider.name === 'Web Speech API') {
                    // Web Speech API 特殊处理（极低音量、极快速度）
                    await this._testWebSpeechAPI(testWord);
                } else {
                    // 基于 URL 的提供商
                    await this._testAudioProvider(provider, testWord);
                }
                
                if (!resolved) {
                    resolved = true;
                    clearTimeout(timeoutId);
                    resolve(true);
                }
            } catch (error) {
                if (!resolved) {
                    resolved = true;
                    clearTimeout(timeoutId);
                    resolve(false);
                }
            }
        });
    }
    
    /**
     * 测试基于音频 URL 的提供商是否可用
     * @param {Object} provider - 提供商对象
     * @param {string} testWord - 测试单词
     * @returns {Promise<boolean>} 是否可用
     */
    async _testAudioProvider(provider, testWord) {
        return new Promise((resolve) => {
            try {
                // 提取 URL 生成逻辑
                let url;
                if (provider.name === '百度翻译 TTS') {
                    url = `https://fanyi.baidu.com/gettts?lan=en&text=${encodeURIComponent(testWord)}&spd=5&source=web`;
                } else if (provider.name === '有道智云 TTS') {
                    url = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(testWord)}&type=1`;
                } else if (provider.name === 'Google Translate TTS') {
                    url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=en&client=tw-ob&q=${encodeURIComponent(testWord)}`;
                } else {
                    resolve(false);
                    return;
                }
                
                const audio = new Audio();
                const timeout = setTimeout(() => {
                    audio.src = '';
                    resolve(false); // 超时认为失败
                }, 3000); // 3秒超时
                
                audio.addEventListener('canplaythrough', () => {
                    clearTimeout(timeout);
                    audio.src = ''; // 清理
                    resolve(true);
                }, { once: true });
                
                audio.addEventListener('error', () => {
                    clearTimeout(timeout);
                    resolve(false);
                }, { once: true });
                
                audio.volume = 0; // 静音测试
                audio.src = url;
                audio.load();
                
            } catch (error) {
                resolve(false);
            }
        });
    }
    
    /**
     * 等待 Web Speech API 语音列表加载完成
     * @param {number} timeout - 超时时间（毫秒）
     * @returns {Promise<Array>} 语音列表
     */
    _waitForVoices(timeout = 2000) {
        return new Promise((resolve) => {
            if ('speechSynthesis' in window) {
                const voices = speechSynthesis.getVoices();
                
                // 如果已经有语音列表，直接返回
                if (voices.length > 0) {
                    resolve(voices);
                    return;
                }
                
                // 设置超时
                const timer = setTimeout(() => {
                    resolve(speechSynthesis.getVoices());
                }, timeout);
                
                // 监听语音列表加载完成
                speechSynthesis.onvoiceschanged = () => {
                    clearTimeout(timer);
                    resolve(speechSynthesis.getVoices());
                };
            } else {
                resolve([]);
            }
        });
    }
    
    /**
     * 测试 Web Speech API 是否真正能播放
     * @param {string} testWord - 测试单词
     * @returns {Promise<boolean>} 是否可用
     */
    _testWebSpeechAPI(testWord) {
        return new Promise((resolve) => {
            if (!('speechSynthesis' in window)) {
                resolve(false);
                return;
            }
            
            try {
                // 先检查是否有可用的语音
                const voices = speechSynthesis.getVoices();
                if (voices.length === 0) {
                    resolve(false);
                    return;
                }
                
                const utterance = new SpeechSynthesisUtterance(testWord);
                utterance.volume = 0; // 完全静音测试
                utterance.rate = 10; // 极快速度
                utterance.pitch = 1;
                
                let resolved = false;
                
                utterance.onstart = () => {
                    if (!resolved) {
                        resolved = true;
                        speechSynthesis.cancel();
                        resolve(true);
                    }
                };
                
                utterance.onerror = (event) => {
                    if (!resolved) {
                        resolved = true;
                        speechSynthesis.cancel();
                        resolve(false);
                    }
                };
                
                utterance.onend = () => {
                    if (!resolved) {
                        resolved = true;
                        resolve(true);
                    }
                };
                
                // 开始播放
                speechSynthesis.speak(utterance);
                
                // 额外检查：50ms 后检查是否在播放队列中
                setTimeout(() => {
                    if (!resolved && speechSynthesis.speaking) {
                        resolved = true;
                        speechSynthesis.cancel();
                        resolve(true);
                    }
                }, 50);
                
            } catch (error) {
                resolve(false);
            }
        });
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
        
        // 强制使用在线语音（用于测试网络能力）
        // 1. 优先：在线英式语音
        this.britishVoice = voices.find(voice => 
            !voice.localService && voice.lang === 'en-GB' && voice.name.includes('UK')
        ) || voices.find(voice => 
            !voice.localService && voice.lang === 'en-GB' && voice.name.includes('British')
        ) || voices.find(voice => 
            !voice.localService && voice.lang === 'en-GB'
        ) || voices.find(voice => 
            !voice.localService && voice.lang.startsWith('en-') && voice.name.includes('UK')
        ) || voices.find(voice => 
            !voice.localService && voice.lang.startsWith('en-') && voice.name.includes('British')
        ) || voices.find(voice => 
            !voice.localService && voice.lang.startsWith('en-')
        );
        
        // 2. 如果没有在线语音，才使用本地语音（降级方案）
        if (!this.britishVoice) {
            this.britishVoice = voices.find(voice => 
                voice.localService && voice.lang === 'en-GB'
            ) || voices.find(voice => 
                voice.localService && voice.lang.startsWith('en-')
            );
        }
        
        // 语音选择不输出日志，避免刷屏
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
        }
    }
    
    /**
     * 解锁 iOS 音频上下文（需要用户交互）
     * 必须在用户点击、触摸等交互事件中调用
     * @param {boolean} silent - 是否静默模式（不输出日志，用于频繁调用场景）
     * @returns {Promise<boolean>} 是否解锁成功
     */
    async unlockAudioContext(silent = false) {
        // 确保此方法永远不会抛出异常，避免影响主程序
        try {
            // iOS 设备优先激活 Web Speech API（主要方案）
            if (this.isIOS) {
                if (!silent) {
                    ttsLog.info('🔓 TTSService: iOS 设备，激活 Web Speech API...');
                }
                
                try {
                    this.activateWebSpeechAPI();
                    this.audioContextUnlocked = true;
                    if (!silent) {
                        ttsLog.success('✅ TTSService: Web Speech API 已激活（iOS 推荐方案）');
                    }
                    return true;
                } catch (e) {
                    if (!silent) {
                        ttsLog.warning(`⚠️ TTSService: Web Speech API 激活失败: ${e.message}`);
                    }
                    return false;
                }
            }
            
            // 非 iOS 设备：尝试解锁 Audio 对象
            if (this.audioContextUnlocked && !silent) {
                ttsLog.warning('⚠️ TTSService: 音频上下文已解锁，无需重复解锁');
                return true;
            }
            
            if (!silent) {
                ttsLog.info('🔓 TTSService: 开始尝试解锁音频上下文...');
            }
            
            // 创建并播放一个静音的 Audio 对象
            const silentAudio = new Audio();
            silentAudio.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAAABmYWN0BAAAAAAAAABkYXRhAAAAAA==';
            silentAudio.volume = 0;
            
            const playPromise = silentAudio.play();
            
            if (playPromise !== undefined) {
                try {
                    await playPromise;
                    
                    if (!silent) {
                        ttsLog.success('✅ TTSService: 音频上下文已解锁');
                    }
                    this.audioContextUnlocked = true;
                    
                    // 清理
                    try {
                        silentAudio.pause();
                        silentAudio.src = '';
                    } catch (e) {}
                    
                    return true;
                } catch (error) {
                    if (!silent) {
                        ttsLog.warning(`⚠️ TTSService: 音频解锁失败: ${error.message}`);
                    }
                    return false;
                }
            } else {
                this.audioContextUnlocked = true;
                return true;
            }
            
        } catch (error) {
            if (!silent) {
                ttsLog.error(`❌ TTSService: 解锁音频上下文失败: ${error.message || error}`);
            }
            return false;
        }
    }
    
    /**
     * 使用 Web Speech API 朗读
     */
    _speakWithWebSpeechAPI(word, volume = 1.0) {
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
            utterance.volume = volume; // 音量（支持外部传入）
            
            let resolved = false;
            
            utterance.onstart = () => {
                // 开始播放，不输出日志
            };
            
            utterance.onend = () => {
                if (!resolved) {
                    resolved = true;
                    resolve();
                }
            };
            
            utterance.onerror = (e) => {
                if (!resolved) {
                    resolved = true;
                    // 特殊处理 not-allowed 错误
                    if (e.error === 'not-allowed') {
                        reject(new Error('Web Speech API 需要用户交互激活'));
                    } else if (e.error === 'network') {
                        reject(new Error('Web Speech API 网络错误，可能需要 VPN'));
                    } else {
                        reject(new Error(`Web Speech API 错误: ${e.error}`));
                    }
                }
            };
            
            try {
                speechSynthesis.speak(utterance);
            } catch (error) {
                if (!resolved) {
                    resolved = true;
                    reject(error);
                }
            }
        });
    }
    
    /**
     * 使用音频 URL 朗读（集成缓存功能）
     * @param {string} url - TTS 音频 URL
     * @param {string} providerName - 提供商名称
     * @param {number} volume - 音量 (0.0-1.0)
     * @param {string} word - 单词（用于缓存，可选）
     */
    async _speakWithAudioURL(url, providerName, volume = 1.0, word = null) {
        // iOS 设备提示：Audio URL 方案可能受限
        if (this.isIOS && !this.audioContextUnlocked) {
            ttsLog.warning(`⚠️ TTSService: iOS 设备上 ${providerName} 可能无法播放（建议使用 Web Speech API）`);
        }
        
        // 如果启用了缓存且提供了单词，尝试使用 R2 CDN 音频
        if (this.cacheEnabled && this.cacheManager && word) {
            try {
                const providerKey = this._getProviderKey(providerName);
                
                // 获取 R2 CDN URL（不检查是否存在，直接尝试播放）
                const r2Url = this.cacheManager.getLocalFilePath(word, providerKey);
                
                // 判断是否是 R2 CDN URL（以 https:// 开头且包含 r2.dev）
                if (r2Url.startsWith('https://') && r2Url.includes('.r2.dev/')) {
                    ttsLog.info(`🎵 TTSService: 尝试使用 R2 CDN 音频: ${word} (${providerKey})`);
                    ttsLog.info(`   URL: ${r2Url}`);
                    
                    const executingSpeakId = this._currentExecutingSpeakId;
                    try {
                        // 直接尝试播放，让浏览器处理 404
                        return await this._playAudio(r2Url, volume, providerName, executingSpeakId);
                    } catch (playError) {
                        // R2 播放失败，降级到在线 API
                        ttsLog.warning(`⚠️ TTSService: R2 CDN 播放失败，降级到在线 API: ${playError.message || playError}`);
                        return await this._playAudio(url, volume, providerName, executingSpeakId);
                    }
                } else {
                    // 不是 R2 CDN，检查本地文件
                    const hasCache = await this.cacheManager.hasCache(word, providerKey);
                    
                    // ⚠️ 异步操作后检查是否已被取消
                    const executingSpeakId = this._currentExecutingSpeakId;
                    if (executingSpeakId && this.cancelledSpeakIds.has(executingSpeakId)) {
                        ttsLog.info(`⏹️ 朗读已被取消: "${word}" (ID: ${executingSpeakId})`);
                        return;
                    }
                    
                    if (hasCache) {
                        // skipCheck=true 避免重复 HEAD 请求（hasCache 已经检查过了）
                        const cachedUrl = await this.cacheManager.getCache(word, providerKey, true);
                        
                        // ⚠️ 再次检查是否已被取消
                        if (executingSpeakId && this.cancelledSpeakIds.has(executingSpeakId)) {
                            ttsLog.info(`⏹️ 朗读已被取消: "${word}" (ID: ${executingSpeakId})`);
                            return;
                        }
                        
                        if (cachedUrl) {
                            ttsLog.info(`🎵 TTSService: 使用本地音频: ${word} (${providerKey})`);
                            return await this._playAudio(cachedUrl, volume, providerName, executingSpeakId);
                        }
                    }
                    
                    // 没有缓存，使用在线 API
                    return await this._playAudio(url, volume, providerName, executingSpeakId);
                }
                
            } catch (error) {
                // 检查失败，降级到直接播放
                ttsLog.warning(`⚠️ TTSService: 音频处理失败，降级到在线 API: ${error.message || error}`);
                const executingSpeakId = this._currentExecutingSpeakId;
                return await this._playAudio(url, volume, providerName, executingSpeakId);
            }
        } else {
            // 未启用缓存或未提供单词，直接播放
            const executingSpeakId = this._currentExecutingSpeakId;
            return await this._playAudio(url, volume, providerName, executingSpeakId);
        }
    }
    
    /**
     * 提取提供商简称（用于缓存文件命名）
     * @param {string} providerName - 提供商完整名称
     * @returns {string} 提供商简称 (baidu/youdao/google/unknown)
     */
    _getProviderKey(providerName) {
        if (providerName.includes('百度')) return 'baidu';
        if (providerName.includes('有道')) return 'youdao';
        if (providerName.includes('Google') || providerName.includes('谷歌')) return 'google';
        return 'unknown';
    }
    
    /**
     * 播放音频（统一的播放逻辑）
     * @param {string} audioUrl - 音频 URL（可以是在线 URL 或 Blob URL）
     * @param {number} volume - 音量 (0.0-1.0)
     * @param {string} providerName - 提供商名称（用于错误日志）
     * @param {number|null} speakId - speak调用的ID（用于取消检查）
     * @returns {Promise<void>}
     */
    _playAudio(audioUrl, volume, providerName, speakId = null) {
        return new Promise((resolve, reject) => {
            // 播放前检查是否已被取消
            if (speakId && this.cancelledSpeakIds.has(speakId)) {
                ttsLog.info(`⏹️ 音频播放已被取消 (ID: ${speakId})`);
                resolve();
                return;
            }
            
            const audio = new Audio();
            audio.volume = volume; // 设置音量
            audio.preload = 'auto'; // 预加载音频
            
            // 添加到活动音频列表（用于 stop()）
            this.activeAudios.push(audio);
            
            // 清理函数
            const cleanup = () => {
                const index = this.activeAudios.indexOf(audio);
                if (index > -1) {
                    this.activeAudios.splice(index, 1);
                }
                if (audioUrl.startsWith('blob:')) {
                    URL.revokeObjectURL(audioUrl);
                }
            };
            
            audio.onended = () => {
                cleanup();
                resolve();
            };
            
            audio.onerror = (e) => {
                cleanup();
                reject(new Error(`${providerName} 音频加载失败`));
            };
            
            // 当有足够数据可以播放时立即开始播放
            audio.oncanplaythrough = () => {
                // 准备播放前再次检查是否已被取消
                if (speakId && this.cancelledSpeakIds.has(speakId)) {
                    ttsLog.info(`⏹️ 音频播放已被取消 (ID: ${speakId})`);
                    cleanup();
                    resolve();
                    return;
                }
                
                audio.play().catch((error) => {
                    cleanup();
                    
                    // iOS 特殊处理：如果是 NotAllowedError
                    if (error.name === 'NotAllowedError') {
                        if (this.isIOS) {
                            reject(new Error(`iOS 设备限制了 Audio 播放，请使用 Web Speech API`));
                        } else {
                            reject(new Error(`NotAllowedError: 浏览器阻止了音频播放`));
                        }
                    } else {
                        reject(error);
                    }
                });
            };
            
            // 设置音频源（这会触发加载）
            audio.src = audioUrl;
            audio.load(); // 显式开始加载
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
            onError = null,
            volume = 1.0, // 音量：0.0 到 1.0
            timeout = 3000, // 超时时间（毫秒），默认3秒
            _isRetry = false // 内部参数：是否是重试调用
        } = options;
        
        // 为当前 speak() 调用分配唯一 ID（提前分配，用于整个播放流程）
        if (this.currentSpeakId >= Number.MAX_SAFE_INTEGER - 1) {
            ttsLog.warning('⚠️ TTSService: speak ID 接近最大值，重置计数器');
            this.currentSpeakId = 0;
            this.cancelledSpeakIds.clear();
        }
        const speakId = ++this.currentSpeakId;
        this.activeSpeakIds.add(speakId);
        ttsLog.info(`🆔 TTSService.speak() 分配 ID: ${speakId} (单词: "${word}")`);
        
        // 记录当前 speakId 到实例变量（供子方法使用）
        this._currentExecutingSpeakId = speakId;
        
        // 如果还没有测试过提供商，先初始化
        if (!this.providerTested) {
            await this.initialize();
        }
        
        // 优先命中本地缓存（例如你已下载的 {word}_youdao.mp3），避免走在线/语音合成
        let localCacheChecked = false;
        let hasLocalCache = false;
        
        try {
            if (this.cacheEnabled && this.cacheManager) {
                // 先检查有道本地缓存（与下载命名规则一致）
                localCacheChecked = true;
                hasLocalCache = await this.cacheManager.hasCache(word, 'youdao');
                
                // ⚠️ hasCache 异步操作后检查是否已被取消
                if (this.cancelledSpeakIds.has(speakId)) {
                    this.activeSpeakIds.delete(speakId);
                    this.cancelledSpeakIds.delete(speakId);
                    return;
                }
                
                if (hasLocalCache) {
                    this.isSpeaking = true; // 标记正在播放
                    this.currentWord = word; // 记录当前单词
                    
                    try {
                        // skipCheck=true 避免重复 HEAD 请求
                        const localUrl = await this.cacheManager.getCache(word, 'youdao', true);
                        await this._playAudio(localUrl, volume, '有道智云 TTS(本地)', speakId);
                        
                        if (onSuccess) {
                            onSuccess('有道智云 TTS(本地)', 0, speakId);
                        }
                    } finally {
                        // 无论成功、失败还是取消，都要清理状态
                        this.activeSpeakIds.delete(speakId);
                        this.isSpeaking = false;
                    }
                    return;
                }
            }
        } catch (e) {
            // 本地检查异常则忽略，继续走正常提供商流程
            ttsLog.warning(`⚠️ TTSService: 本地缓存检查失败: ${e.message || e}`);
        }

        // 如果本地缓存检查完成但没有缓存，进入正常流程
        // 如果有可用的提供商，轮换使用
        if (this.availableProviders.length > 0) {
            this.isSpeaking = true;
            this.currentWord = word; // 记录当前正在播放的单词
            
            // 记录播放开始时间（用于错误日志）
            const speakStartTime = Date.now();
            const speakStartTimeStr = new Date(speakStartTime).toLocaleTimeString('zh-CN', { 
                hour12: false, 
                hour: '2-digit', 
                minute: '2-digit', 
                second: '2-digit',
                fractionalSecondDigits: 3
            });
            
            // 尝试当前提供商和后续的所有提供商
            const startIndex = this.currentAvailableIndex;
            let attemptCount = 0;
            
            while (attemptCount < this.availableProviders.length) {
                // 检查当前 speak() 调用是否已被取消
                if (this.cancelledSpeakIds.has(speakId)) {
                    ttsLog.info(`🚫 TTSService: "${word}" (ID: ${speakId}) - 播放已被取消，停止尝试`);
                    this.cancelledSpeakIds.delete(speakId); // 清理已取消的 ID
                    this.activeSpeakIds.delete(speakId); // 从活跃集合移除
                    this.isSpeaking = false;
                    return;
                }
                
                const provider = this.availableProviders[this.currentAvailableIndex];
                
                // 记录当前提供商的开始时间
                const providerStartTime = performance.now();
                
                try {
                    // 创建超时Promise（使用配置的超时时间）
                    const timeoutPromise = new Promise((_, reject) => {
                        setTimeout(() => reject(new Error(`超时（${timeout}毫秒）`)), timeout);
                    });
                    
                    // 竞速：朗读 vs 超时
                    await Promise.race([
                        provider.speak(word, volume),
                        timeoutPromise
                    ]);
                    
                    // 计算实际用时
                    const providerDuration = Math.round(performance.now() - providerStartTime);
                    
                    // 成功后，重置该提供商的失败计数
                    this.providerFailureCount.set(provider.name, 0);
                    
                    if (onSuccess) {
                        onSuccess(provider.name, providerDuration, speakId);
                    }
                    
                    // 成功后，保持使用当前提供商，不轮换
                    this.activeSpeakIds.delete(speakId); // 从活跃集合移除
                    this.isSpeaking = false;
                    return;
                    
                } catch (error) {
                    // 首先检查当前 speak() 调用是否已被取消
                    if (this.cancelledSpeakIds.has(speakId)) {
                        ttsLog.info(`🚫 TTSService: "${word}" (ID: ${speakId}) - 播放已被取消（在等待中）`);
                        this.cancelledSpeakIds.delete(speakId); // 清理已取消的 ID
                        this.activeSpeakIds.delete(speakId); // 从活跃集合移除
                        this.isSpeaking = false;
                        return;
                    }
                    
                    // 分析错误原因并输出详细信息
                    const errorDetail = error.message || error.toString();
                    const errorName = error.name || 'Error';
                    
                    // 判断错误类型
                    let errorCategory = '未知错误';
                    let errorCause = '';
                    let solution = '';
                    
                    if (errorName === 'NotAllowedError' || errorDetail.includes('NotAllowedError') || errorDetail.includes('not-allowed') || errorDetail.includes('阻止了音频播放') || errorDetail.includes('限制了 Audio 播放')) {
                        if (this.isIOS) {
                            errorCategory = '🍎 iOS 设备限制';
                            errorCause = 'iOS 设备限制了 Audio 对象播放';
                            solution = '已自动切换到 Web Speech API（浏览器原生语音）';
                        } else {
                            errorCategory = '🚫 浏览器限制';
                            errorCause = '浏览器阻止了音频自动播放';
                            solution = '需要用户交互才能播放音频';
                        }
                    } else if (errorDetail.includes('音频上下文未解锁')) {
                        errorCategory = '🚫 浏览器限制';
                        errorCause = '音频上下文未激活';
                        solution = '需要在用户点击时解锁音频上下文';
                    } else if (errorName === 'AbortError' || errorDetail.includes('interrupted') || errorDetail.includes('中断')) {
                        errorCategory = '⚠️ 播放被中断';
                        errorCause = '音频播放被新的播放请求中断';
                        solution = '这是正常现象，系统会自动重试';
                    } else if (errorDetail.includes('超时') || errorDetail.includes('timeout')) {
                        errorCategory = '⏱️ TTS 服务超时';
                        errorCause = `${provider.name} 响应超时（${timeout}毫秒限制）`;
                        solution = '可能是网络延迟或服务商负载过高';
                    } else if (errorDetail.includes('加载失败') || errorDetail.includes('load') || errorName === 'NetworkError') {
                        errorCategory = '🌐 TTS 服务请求失败';
                        errorCause = `${provider.name} 音频资源加载失败`;
                        solution = '可能是服务商拒绝请求、限流或网络问题';
                    } else if (errorDetail.includes('network') || errorDetail.includes('网络')) {
                        errorCategory = '🌐 网络问题';
                        errorCause = '网络连接异常';
                        solution = '检查网络连接或切换网络';
                    } else if (errorDetail.includes('403') || errorDetail.includes('forbidden')) {
                        errorCategory = '🚫 TTS 服务拒绝';
                        errorCause = `${provider.name} 拒绝请求（403 Forbidden）`;
                        solution = '可能是服务商限流或访问限制';
                    } else if (errorDetail.includes('404') || errorDetail.includes('not found')) {
                        errorCategory = '❓ TTS 资源不存在';
                        errorCause = `${provider.name} 资源未找到（404）`;
                        solution = '可能是服务商 API 变更';
                    } else if (errorDetail.includes('429') || errorDetail.includes('rate limit')) {
                        errorCategory = '🚫 TTS 服务限流';
                        errorCause = `${provider.name} 请求频率超限（429 Too Many Requests）`;
                        solution = '服务商限流，请稍后重试';
                    } else {
                        errorCategory = '❌ 其他错误';
                        errorCause = errorDetail;
                        solution = '请查看详细错误信息';
                    }
                    
                    // 停止当前提供商的播放（清理资源，但不设置取消标志）
                    this.stop(false); // false = 仅清理资源，允许继续尝试其他提供商
                    
                    // 判断是否是"播放被中断"错误
                    const isInterrupted = errorCategory === '⚠️ 播放被中断';
                    
                    if (isInterrupted) {
                        // 播放被中断是正常现象（如快速连续播放），使用 info 级别
                        ttsLog.info(`ℹ️ TTSService: "${word}" - ${provider.name} 播放被新请求中断（正常现象）`);
                        this.isSpeaking = false;
                        // 不继续尝试其他提供商，因为是主动中断
                        return;
                    }
                    
                    // 输出详细的错误分析（仅对真正的错误使用 warning）
                    ttsLog.warning(`⚠️ TTSService: "${word}" - ${provider.name} 失败 [${this.currentAvailableIndex + 1}/${this.availableProviders.length}] (播放开始于: ${speakStartTimeStr})`);
                    ttsLog.warning(`   📋 错误类型: ${errorCategory}`);
                    ttsLog.warning(`   💬 错误原因: ${errorCause}`);
                    if (solution) {
                        ttsLog.warning(`   💡 解决建议: ${solution}`);
                    }
                    
                    // 记录失败次数（非中断错误）
                    const failCount = (this.providerFailureCount.get(provider.name) || 0) + 1;
                    this.providerFailureCount.set(provider.name, failCount);
                    
                    // 如果连续失败3次，从可用列表移除
                    if (failCount >= 3) {
                        ttsLog.error(`❌ ${provider.name} 连续失败3次，已从可用列表移除`);
                        this.availableProviders.splice(this.currentAvailableIndex, 1);
                        
                        // 调整索引
                        if (this.availableProviders.length === 0) {
                            this.isSpeaking = false;
                            if (onError) {
                                onError(new Error('所有 TTS 提供商都不可用'));
                            }
                            return;
                        }
                        
                        // 保持当前索引（因为删除了一个元素，索引自动指向下一个）
                        if (this.currentAvailableIndex >= this.availableProviders.length) {
                            this.currentAvailableIndex = 0;
                        }
                    } else {
                        // 失败次数小于3次，移到队列尾部
                        this.availableProviders.splice(this.currentAvailableIndex, 1);
                        this.availableProviders.push(provider);
                        
                        // 索引不变（因为删除了当前元素，索引自动指向下一个）
                        if (this.currentAvailableIndex >= this.availableProviders.length) {
                            this.currentAvailableIndex = 0;
                        }
                    }
                    
                    attemptCount++;
                }
            }
            
            // 所有可用提供商都失败了，尝试重新初始化（仅第一次失败时）
            this.isSpeaking = false;
            
            if (!_isRetry) {
                // 清空当前的可用提供商列表
                this.availableProviders = [];
                this.providerTested = false;
                this.currentAvailableIndex = 0;
                
                // 重新初始化
                await this.initialize();
                
                // 如果重新初始化后找到了可用的提供商，再次尝试朗读
                if (this.availableProviders.length > 0) {
                    // 标记为重试，避免无限递归
                    return await this.speak(word, {
                        ...options,
                        _isRetry: true
                    });
                }
            }
            
            // 重新初始化后仍然没有可用的提供商
            const errorMsg = '所有 TTS 服务均不可用（重新初始化后仍失败）';
            ttsLog.error(`❌ TTSService: "${word}" - ${errorMsg}`);
            ttsLog.error(`💡 建议: 检查网络连接，或在 iOS 设备上确保音频上下文已解锁`);
            
            this.activeSpeakIds.delete(speakId); // 从活跃集合移除
            
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
        ttsLog.error(`❌ TTSService: "${word}" - ${errorMsg}`);
        ttsLog.error(`💡 可能原因: 1) 网络问题 2) iOS 音频上下文未解锁 3) 所有提供商都不可用`);
        
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
     * 获取可用的 TTS 提供商详细信息（包含响应时间）
     * @returns {Array} 可用提供商的详细信息数组
     */
    getAvailableProvidersDetails() {
        return this.availableProviders.map(p => ({
            name: p.name,
            description: p.description,
            responseTime: p.responseTime
        }));
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
     * @param {boolean} setCancelled - 是否设置取消标志（默认 true）
     *                                  true: 外部主动取消（如单词失败），阻止后续尝试
     *                                  false: 内部清理资源（如提供商失败），允许继续尝试其他提供商
     */
    stop(setCancelled = true) {
        const stoppedWord = this.currentWord; // 记录被停止的单词
        
        // 获取调用堆栈（用于调试重复调用）
        const stack = new Error().stack;
        const callerLine = stack ? stack.split('\n')[2] : 'unknown';
        
        // 收集ID信息用于日志
        const activeIds = Array.from(this.activeSpeakIds);
        const cancelledIds = Array.from(this.cancelledSpeakIds);
        const currentId = this.currentSpeakId;
        
        ttsLog.info(`⏹️ TTSService.stop() 被调用${stoppedWord ? ` (停止单词: "${stoppedWord}")` : ''} [setCancelled=${setCancelled}] [当前ID=${currentId}] [调用自: ${callerLine.trim()}]`);
        
        // 设置取消标志，阻止正在进行中的 speak() 继续执行
        if (setCancelled) {
            // 将所有活跃的 speak() 调用标记为已取消
            const activeCount = this.activeSpeakIds.size;
            if (activeCount > 0) {
                ttsLog.info(`   🚫 取消 ${activeCount} 个活跃的 speak() 调用: [${activeIds.join(', ')}]`);
                this.activeSpeakIds.forEach(id => {
                    this.cancelledSpeakIds.add(id);
                });
                // ✅ 修复：清空活跃 ID 列表，避免内存泄漏
                this.activeSpeakIds.clear();
            } else {
                ttsLog.info(`   ℹ️ 没有活跃的 speak() 调用需要取消 [已取消ID: ${cancelledIds.length > 0 ? cancelledIds.join(', ') : '无'}]`);
            }
            
            // 🔧 定期清理过期的已取消 ID（保留最近 20 个，避免内存泄漏）
            // 不能立即清空，因为异步 speak() 可能还在检查 cancelledSpeakIds
            if (this.cancelledSpeakIds.size > 20) {
                // 找出最小的 20 个 ID 并删除
                const sortedIds = Array.from(this.cancelledSpeakIds).sort((a, b) => a - b);
                const idsToRemove = sortedIds.slice(0, sortedIds.length - 20);
                idsToRemove.forEach(id => this.cancelledSpeakIds.delete(id));
                ttsLog.info(`   🧹 清理 ${idsToRemove.length} 个过期的已取消 ID`);
            }
        } else {
            ttsLog.info(`   🔧 仅清理资源，不设置取消标志 [活跃ID: ${activeIds.length > 0 ? activeIds.join(', ') : '无'}]`);
        }
        
        // 停止 Web Speech API
        if ('speechSynthesis' in window) {
            speechSynthesis.cancel();
        }
        
        // 停止所有正在播放的 Audio 对象
        if (this.activeAudios.length > 0) {
            ttsLog.info(`⏹️ 停止 ${this.activeAudios.length} 个音频对象`);
            // 复制数组以避免在迭代时修改
            const audiosToStop = [...this.activeAudios];
            this.activeAudios = [];
            
            audiosToStop.forEach((audio) => {
                try {
                    // 先移除所有事件监听器，避免触发错误回调
                    audio.onended = null;
                    audio.onerror = null;
                    audio.onpause = null;
                    
                    // 然后停止播放
                    audio.pause();
                    audio.currentTime = 0;
                    audio.src = ''; // 清空源以释放资源
                } catch (error) {
                    // 忽略停止错误
                }
            });
        }
        
        this.isSpeaking = false;
        // 不立即清空 currentWord，保留用于日志追踪
        // this.currentWord = null; 
        ttsLog.info(`⏹️ TTSService 停止完成${stoppedWord ? ` ("${stoppedWord}")` : ''}`);
    }
    
    
    /**
     * 手动切换到指定的提供商
     */
    switchProvider(providerIndex) {
        if (providerIndex >= 0 && providerIndex < this.providers.length) {
            this.currentProviderIndex = providerIndex;
        }
    }
}

// 立即检查类是否定义成功
if (typeof TTSService === 'undefined') {
    console.error('❌ [TTSService.js] TTSService 类定义失败！');
} else {
    console.log('✅ [TTSService.js] TTSService 类定义成功');
}

// 导出到 window 对象，供全局使用
if (typeof window !== 'undefined') {
    window.TTSService = TTSService;
    console.log('✅ [TTSService.js] 已导出到 window.TTSService');
    console.log('   检查: typeof window.TTSService =', typeof window.TTSService);
} else {
    console.error('❌ [TTSService.js] window 对象不存在！');
}

// 如果使用 ES6 模块，也提供 export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TTSService };
}


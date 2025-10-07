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
        this.activeAudios = []; // 所有正在播放的 Audio 对象（用于停止播放）
        this.providerFailureCount = new Map(); // 记录每个提供商的连续失败次数
        
        // 定义 TTS 提供商列表（按优先级排序）
        this.providers = [
            {
                name: 'Web Speech API',
                description: '浏览器原生语音合成（需要 Google 服务）',
                test: () => {
                    // 只检查浏览器是否支持，不检查语音列表
                    // 因为语音列表可能异步加载，初始为空是正常的
                    return ('speechSynthesis' in window);
                },
                speak: (word, volume = 1.0) => this._speakWithWebSpeechAPI(word, volume)
            },
            {
                name: '百度翻译 TTS',
                description: '百度翻译语音合成（国内稳定可用）',
                test: () => true,
                speak: (word, volume = 1.0) => this._speakWithAudioURL(
                    `https://fanyi.baidu.com/gettts?lan=en&text=${encodeURIComponent(word)}&spd=5&source=web`,
                    '百度翻译 TTS',
                    volume
                )
            },
            {
                name: '有道智云 TTS',
                description: '有道词典语音合成（国内稳定可用）',
                test: () => true,
                speak: (word, volume = 1.0) => this._speakWithAudioURL(
                    `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=1`,
                    '有道智云 TTS',
                    volume
                )
            },
            {
                name: '微软 Bing TTS',
                description: '微软 Bing 语音合成（备用方案）',
                test: () => true,
                speak: (word, volume = 1.0) => this._speakWithAudioURL(
                    `https://www.bing.com/tts?text=${encodeURIComponent(word)}&lang=en-US&format=audio/mp3`,
                    '微软 Bing TTS',
                    volume
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
     * 真正测试每个提供商是否能成功朗读，并按响应速度排序
     */
    async initialize() {
        if (this.providerTested) {
            return; // 已经测试过了
        }
        
        console.log('🔍 TTSService: 开始并行测试所有 TTS 提供商（使用测试单词 "see"）...');
        console.log('⏱️ TTSService: 将并行测试真实播放能力并按响应速度排序');
        
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
        
        this.providerTested = true;
        
        // 输出测试结果
        if (this.availableProviders.length > 0) {
            console.log(`🎯 TTSService: 找到 ${this.availableProviders.length} 个可用的 TTS 提供商（已按响应速度排序）:`);
            this.availableProviders.forEach((provider, idx) => {
                const speedBadge = idx === 0 ? '⚡' : '  ';
                console.log(`${speedBadge} ${idx + 1}. ${provider.name} - ${provider.responseTime.toFixed(0)}ms`);
            });
            console.log(`📌 TTSService: 优先使用速度最快的提供商`);
        } else {
            console.error('❌ TTSService: 没有找到可用的 TTS 提供商');
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
                console.log(`⏭️ TTSService: ${provider.name} 不可用（基础测试失败）`);
                return null;
            }
            
            console.log(`🔬 TTSService: 测试 ${provider.name}...`);
            const startTime = performance.now();
            
            // 对于 Web Speech API，特殊处理
            if (provider.name === 'Web Speech API') {
                this._initWebSpeechAPI();
                
                // 等待语音列表加载（最多等待 2 秒）
                const voices = await this._waitForVoices(2000);
                
                if (voices.length === 0) {
                    console.log(`⏭️ TTSService: ${provider.name} 不可用（未找到语音）`);
                    return null;
                }
                
                // 输出语音信息
                const localVoices = voices.filter(v => v.localService);
                const remoteVoices = voices.filter(v => !v.localService);
                console.log(`   📊 ${provider.name}: 本地语音 ${localVoices.length} 个, 在线语音 ${remoteVoices.length} 个`);
            }
            
            // 初始化时使用静音测试（因为没有用户交互，真实发声会被浏览器阻止）
            // 对于 Web Speech API，使用静音测试
            if (provider.name === 'Web Speech API') {
                console.log(`🔇 TTSService: 使用静音测试 ${provider.name}...`);
                
                // 检查选中的语音类型
                if (this.britishVoice) {
                    if (this.britishVoice.localService) {
                        console.log(`   ✅ 使用本地语音，无需网络`);
                    } else {
                        console.log(`   ⚠️ 使用在线语音，需要 VPN（初始化时无法真实测试）`);
                    }
                }
                
                const canSpeak = await this._testProviderWithTimeout(provider, testWord, 1000);
                const responseTime = performance.now() - startTime;
                
                if (canSpeak) {
                    // 如果是在线语音，标记为需要进一步验证
                    const needsVerification = this.britishVoice && !this.britishVoice.localService;
                    if (needsVerification) {
                        console.log(`⚠️ TTSService: ${provider.name} 静音测试通过，但使用在线语音，实际使用时可能需要 VPN（响应时间: ${responseTime.toFixed(0)}ms）`);
                    } else {
                        console.log(`✅ TTSService: ${provider.name} 可用（静音测试通过，响应时间: ${responseTime.toFixed(0)}ms）`);
                    }
                    return {
                        ...provider,
                        index: index,
                        responseTime: responseTime,
                        needsVerification: needsVerification  // 标记需要验证
                    };
                } else {
                    console.log(`⏭️ TTSService: ${provider.name} 不可用（静音测试失败或超时）`);
                    return null;
                }
            }
            
            // 对于基于 URL 的提供商，使用音频加载测试
            console.log(`🔇 TTSService: 使用音频加载测试 ${provider.name}...`);
            const canSpeak = await this._testAudioProvider(provider, testWord);
            const responseTime = performance.now() - startTime;
            
            if (canSpeak) {
                console.log(`✅ TTSService: ${provider.name} 可用（音频加载测试通过，响应时间: ${responseTime.toFixed(0)}ms）`);
                return {
                    ...provider,
                    index: index,
                    responseTime: responseTime
                };
            } else {
                console.log(`⏭️ TTSService: ${provider.name} 不可用（音频加载测试失败或超时）`);
                return null;
            }
            
        } catch (error) {
            console.warn(`❌ TTSService: ${provider.name} 测试异常:`, error.message);
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
                console.log(`   🎯 调用 ${provider.name}.speak("${testWord}", ${volume})...`);
                await provider.speak(testWord, volume);
                
                if (!resolved) {
                    resolved = true;
                    clearTimeout(timeoutId);
                    console.log(`   ✅ ${provider.name} speak() 完成`);
                    resolve(true);
                }
            } catch (error) {
                if (!resolved) {
                    resolved = true;
                    clearTimeout(timeoutId);
                    console.log(`   ❌ ${provider.name} speak() 异常: ${error.message}`);
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
                } else if (provider.name === '微软 Bing TTS') {
                    url = `https://www.bing.com/tts?text=${encodeURIComponent(testWord)}&lang=en-US&format=audio/mp3`;
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
        
        if (this.britishVoice) {
            const voiceType = this.britishVoice.localService ? '本地语音' : '在线语音';
            console.log(`✅ TTSService: 已选择英式语音 (${voiceType}): ${this.britishVoice.name} ${this.britishVoice.lang}`);
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
                console.log(`   🎤 使用语音: ${this.britishVoice.name} (${this.britishVoice.localService ? '本地' : '在线'})`);
            }
            
            // 设置语言为英式英语
            utterance.lang = 'en-GB';
            utterance.rate = 0.8;  // 语速
            utterance.pitch = 1.0; // 音调
            utterance.volume = volume; // 音量（支持外部传入）
            
            let resolved = false;
            
            utterance.onstart = () => {
                console.log(`   🔊 Web Speech API 开始播放...`);
            };
            
            utterance.onend = () => {
                if (!resolved) {
                    resolved = true;
                    console.log(`   ✅ Web Speech API 播放完成`);
                    resolve();
                }
            };
            
            utterance.onerror = (e) => {
                if (!resolved) {
                    resolved = true;
                    console.log(`   ❌ Web Speech API 错误: ${e.error}`);
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
                console.log(`   📤 Web Speech API speak() 已调用`);
            } catch (error) {
                if (!resolved) {
                    resolved = true;
                    reject(error);
                }
            }
        });
    }
    
    /**
     * 使用音频 URL 朗读
     */
    _speakWithAudioURL(url, providerName, volume = 1.0) {
        return new Promise((resolve, reject) => {
            const audio = new Audio(url);
            audio.volume = volume; // 设置音量
            
            // 添加到活动音频列表（用于 stop()）
            this.activeAudios.push(audio);
            console.log(`🎵 创建音频对象: ${providerName}, 活动音频数: ${this.activeAudios.length}`);
            
            audio.onended = () => {
                // 播放完成后从列表移除
                const index = this.activeAudios.indexOf(audio);
                if (index > -1) {
                    this.activeAudios.splice(index, 1);
                    console.log(`✅ 音频播放完成，移除: ${providerName}, 活动音频数: ${this.activeAudios.length}`);
                }
                resolve();
            };
            
            audio.onerror = (e) => {
                // 出错时从列表移除
                const index = this.activeAudios.indexOf(audio);
                if (index > -1) {
                    this.activeAudios.splice(index, 1);
                    console.log(`❌ 音频出错，移除: ${providerName}, 活动音频数: ${this.activeAudios.length}`);
                }
                reject(new Error(`${providerName} 音频加载失败`));
            };
            
            audio.play().catch((error) => {
                // 播放失败时从列表移除
                const index = this.activeAudios.indexOf(audio);
                if (index > -1) {
                    this.activeAudios.splice(index, 1);
                    console.log(`❌ 音频播放失败，移除: ${providerName}, 活动音频数: ${this.activeAudios.length}`);
                }
                reject(error);
            });
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
            _isRetry = false // 内部参数：是否是重试调用
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
                    // 创建3秒超时Promise
                    const timeoutPromise = new Promise((_, reject) => {
                        setTimeout(() => reject(new Error('超时（3秒）')), 3000);
                    });
                    
                    // 竞速：朗读 vs 超时
                    await Promise.race([
                        provider.speak(word, volume),
                        timeoutPromise
                    ]);
                    
                    console.log(`✅ TTSService: 使用 ${provider.name} 朗读: ${word} [${this.currentAvailableIndex + 1}/${this.availableProviders.length}]`);
                    
                    // 成功后，重置该提供商的失败计数
                    this.providerFailureCount.set(provider.name, 0);
                    
                    if (onSuccess) {
                        onSuccess(provider.name);
                    }
                    
                    // 成功后，保持使用当前提供商，不轮换
                    this.isSpeaking = false;
                    return;
                    
                } catch (error) {
                    console.warn(`❌ TTSService: ${provider.name} 失败 [${this.currentAvailableIndex + 1}/${this.availableProviders.length}]:`, error.message);
                    
                    // 停止当前提供商的播放（清理资源）
                    this.stop();
                    
                    // 记录失败次数
                    const failCount = (this.providerFailureCount.get(provider.name) || 0) + 1;
                    this.providerFailureCount.set(provider.name, failCount);
                    console.log(`   📊 ${provider.name} 连续失败 ${failCount} 次`);
                    
                    // 如果连续失败3次，从可用列表移除
                    if (failCount >= 3) {
                        console.warn(`⚠️ TTSService: ${provider.name} 连续失败3次，从可用列表移除`);
                        this.availableProviders.splice(this.currentAvailableIndex, 1);
                        
                        // 调整索引
                        if (this.availableProviders.length === 0) {
                            console.error(`❌ TTSService: 所有提供商都已被移除`);
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
                        console.log(`   🔄 将 ${provider.name} 移到队列尾部`);
                        this.availableProviders.splice(this.currentAvailableIndex, 1);
                        this.availableProviders.push(provider);
                        
                        // 索引不变（因为删除了当前元素，索引自动指向下一个）
                        if (this.currentAvailableIndex >= this.availableProviders.length) {
                            this.currentAvailableIndex = 0;
                        }
                    }
                    
                    attemptCount++;
                    
                    // 如果还有其他提供商可尝试
                    if (attemptCount < this.availableProviders.length) {
                        console.log(`🔄 TTSService: 切换到: ${this.availableProviders[this.currentAvailableIndex].name}`);
                    }
                }
            }
            
            // 所有可用提供商都失败了，尝试重新初始化（仅第一次失败时）
            this.isSpeaking = false;
            
            if (!_isRetry) {
                console.warn('⚠️ TTSService: 所有可用提供商都失败，尝试重新初始化...');
                
                // 清空当前的可用提供商列表
                this.availableProviders = [];
                this.providerTested = false;
                this.currentAvailableIndex = 0;
                
                // 重新初始化
                await this.initialize();
                
                // 如果重新初始化后找到了可用的提供商，再次尝试朗读
                if (this.availableProviders.length > 0) {
                    console.log('🔄 TTSService: 重新初始化成功，再次尝试朗读...');
                    // 标记为重试，避免无限递归
                    return await this.speak(word, {
                        ...options,
                        _isRetry: true
                    });
                }
            } else {
                console.error('❌ TTSService: 重新初始化后仍然失败');
            }
            
            // 重新初始化后仍然没有可用的提供商
            const errorMsg = '所有 TTS 服务均不可用';
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
     */
    stop() {
        // 停止 Web Speech API
        if ('speechSynthesis' in window) {
            speechSynthesis.cancel();
            console.log('⏹️ TTSService: 已停止 Web Speech API');
        }
        
        // 停止所有正在播放的 Audio 对象
        if (this.activeAudios.length > 0) {
            console.log(`⏹️ TTSService: 正在停止 ${this.activeAudios.length} 个活动音频...`);
            
            // 复制数组以避免在迭代时修改
            const audiosToStop = [...this.activeAudios];
            this.activeAudios = [];
            
            audiosToStop.forEach((audio, index) => {
                try {
                    audio.pause();
                    audio.currentTime = 0;
                    audio.src = ''; // 清空源以释放资源
                    console.log(`  ⏹️ 已停止音频 ${index + 1}/${audiosToStop.length}`);
                } catch (error) {
                    console.warn(`  ⚠️ 停止音频 ${index + 1} 时出错:`, error);
                }
            });
            
            console.log(`✅ TTSService: 已停止所有音频，活动音频数: ${this.activeAudios.length}`);
        }
        
        this.isSpeaking = false;
        console.log('⏹️ TTSService: 已停止朗读');
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


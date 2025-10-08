// 调试日志系统
class DebugLogger {
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
        const copyBtn = document.getElementById('copyDebugBtn');
        const clearBtn = document.getElementById('clearDebugBtn');
        const exportBtn = document.getElementById('exportDebugBtn');
        const panel = document.getElementById('debugPanel');
        
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                panel.classList.toggle('hidden');
                const btnText = toggleBtn.querySelector('.btn-text');
                if (btnText) {
                    btnText.textContent = panel.classList.contains('hidden') ? '显示' : '隐藏';
                }
            });
        }
        
        if (copyBtn) {
            copyBtn.addEventListener('click', () => this.copyToClipboard());
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
    
    async copyToClipboard() {
        if (this.logHistory.length === 0) {
            alert('没有日志可以复制');
            return;
        }
        
        // 生成日志文本
        const logText = this.logHistory.map(entry => entry.fullMessage).join('\n');
        
        try {
            // 使用现代 Clipboard API
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(logText);
                this.success(`✅ 已复制 ${this.logHistory.length} 条日志到剪贴板`);
            } else {
                // 降级方案：使用传统方法
                const textarea = document.createElement('textarea');
                textarea.value = logText;
                textarea.style.position = 'fixed';
                textarea.style.left = '-9999px';
                document.body.appendChild(textarea);
                textarea.select();
                
                const successful = document.execCommand('copy');
                document.body.removeChild(textarea);
                
                if (successful) {
                    this.success(`✅ 已复制 ${this.logHistory.length} 条日志到剪贴板`);
                } else {
                    this.error('❌ 复制失败，请手动复制日志');
                }
            }
        } catch (error) {
            this.error(`❌ 复制失败: ${error.message}`);
            console.error('复制到剪贴板失败:', error);
        }
    }
}

// 创建全局调试日志实例
const debugLog = new DebugLogger();

// 游戏主类
class WordTetrisGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.vocabularyManager = new VocabularyManagerV2();
        
        // 高清屏适配并根据左栏高度设置画布显示高度
        this.setupHighDPICanvas();
        
        // 游戏状态
        this.gameState = 'stopped'; // stopped, playing, paused, gameOver
        this.score = 0;
        this.level = 1;
        this.targetScore = 100;
        this.startTime = null;
        this.gameTime = 0;
        
        // 游戏对象
        this.fallingWords = [];
        this.stackedWords = [];
        this.currentWord = null;
        this.nextWord = null;
        
        // 堆叠区渲染日志优化
        this._lastStackedWordsCount = 0;
        
        // 评分系统
        this.combo = 0; // 连击数
        this.perfectLevel = true; // 当前等级是否完美
        this.lastHitTime = 0; // 上次击中时间
        this.levelWordCount = 0; // 当前等级单词数
        
        // 考试统计系统
        this.hitWords = new Set(); // 正确命中的单词集合（去重）
        this.fallenWords = new Set(); // 下落的单词集合（去重，包括命中和未命中）
        this.totalWords = 135; // 考试总单词量（从单词库获取）
        this.gameCompletionTriggered = false; // 【修复】防止重复触发游戏完成
        
        // 缓冲区状态
        this.bufferState = 'idle'; // idle, countdown, ready
        this.bufferTimer = 0;
        this.bufferLights = { red: false, yellow: false, green: false };
        
        // 游戏设置
        this.baseSpeed = 1 / 3; // 基础速度：3帧1像素 = 0.333像素/帧
        this.wordSpeed = this.baseSpeed;
        this.spawnRate = 180; // 帧数（3秒）
        this.spawnTimer = 0;
        this.speedMultiplier = 1.0; // 速度倍数
        
        // 画布设置（逻辑尺寸） - 在setupHighDPICanvas中会根据显示尺寸同步
        this.canvasWidth = 600;
        this.canvasHeight = 500;
        this.bufferHeight = 80;
        this.gameAreaTop = this.bufferHeight;
        this.gameAreaHeight = this.canvasHeight - this.bufferHeight;
        
        // 炮管系统
        this.cannon = {
            x: this.canvasWidth / 2,
            y: this.canvasHeight - 20, // 从-30调整到-20，下降10像素
            width: 40,
            height: 60,
            angle: -Math.PI / 2, // 初始向上
            targetAngle: -Math.PI / 2,
            recoil: 0, // 后坐力偏移量
            recoilDecay: 0.12 // 后坐力衰减速度（降低以延长后坐力效果）
        };
        
        // 炮弹系统
        this.bullets = [];
        
        // 爆炸效果系统
        this.explosions = [];
        
        // 炮口火花系统
        this.muzzleFlashes = [];
        
        // 中文翻译爆炸动画系统
        this.meaningExplosions = [];
        
        // 引信燃烧系统
        this.fuseParticles = [];
        
        // 引信摆动物理系统
        this.fuse = {
            length: 12, // 引信长度
            angle: 0, // 引信相对炮管的角度（初始垂直向下）
            angleVelocity: 0, // 角速度
            damping: 0.95, // 阻尼系数
            gravity: 0.3, // 重力影响
            attachX: 18, // 附着点X（相对炮管）
            attachY: -60 // 附着点Y（相对炮管）
        };
        
        // 错误标记系统
        this.errorMarks = []; // 存储错误红叉标记
        
        // 语音朗读系统
        this.speechEnabled = true;
        this.currentSpeech = null;
        this.speechTimer = null;
        this.ttsService = null; // TTS 服务实例
        
        // 检测是否是 iOS 设备
        this.isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        if (this.isIOS) {
            debugLog.info('🍎 检测到 iOS 设备');
        }
        
        // 游戏模式（从 localStorage 读取）
        const savedMode = localStorage.getItem('wordTetris_gameMode');
        this.gameMode = savedMode === 'challenge' ? 'challenge' : 'casual';
        debugLog.info(`🎮 游戏模式: ${this.gameMode === 'challenge' ? '挑战模式' : '休闲模式'}`);
        
        this.setupSpeechSynthesis();
        
        // 炮塔基座纹理缓存（静态生成，避免每帧重新计算）
        this.baseTexture = this.generateBaseTexture();
        
        this.init();
    }
    
    // 初始化考试统计
    async initExamStats() {
        console.log('🔍 开始初始化考试统计...');
        
        // 等待单词库加载完成
        let waitCount = 0;
        while (!this.vocabularyManager.isLoaded) {
            await new Promise(resolve => setTimeout(resolve, 100));
            waitCount++;
            if (waitCount > 100) { // 最多等待10秒
                console.error('❌ 单词库加载超时');
                break;
            }
        }
        
        if (this.vocabularyManager.isLoaded) {
            // 使用去重后的实际单词数
            this.totalWords = this.vocabularyManager.allWords.length;
            const stats = this.vocabularyManager.getVocabularyStats();
            
            console.log(`📊 单词库统计: 总单词数 = ${this.totalWords} (去重后)`);
            console.log(`📊 单词池大小: ${this.vocabularyManager.wordPool.length}`);
            console.log(`📊 生词本数量: ${stats.missedWords}`);
            
            // 更新显示
            this.updateExamStats();
        } else {
            console.error('❌ 单词库未能成功加载，使用默认值');
            this.totalWords = 135; // 使用默认值
            this.updateExamStats();
        }
    }
    
    // 更新考试统计显示
    updateExamStats() {
        const hitWordsCount = this.hitWords.size;
        const fallenWordsCount = this.fallenWords.size;
        
        // 剩余待测单词数 = 总单词数 - 已经下落的单词数（去重）
        // 注意：已下落的单词包括命中的、放弃的、失败的，都在 fallenWords 集合中
        const remainingWords = this.totalWords > fallenWordsCount ? this.totalWords - fallenWordsCount : 0;
        
        // 命中率：命中单词数 / 下落单词数（去重）
        const hitPercentage = fallenWordsCount > 0 ? Math.round((hitWordsCount / fallenWordsCount) * 100) : 0;
        
        // 覆盖率：命中单词数 / 总单词库数量
        const coveragePercentage = this.totalWords > 0 ? Math.round((hitWordsCount / this.totalWords) * 100) : 0;
        
        // 只在统计数据变化时输出日志（避免每帧都输出）
        const statsKey = `${remainingWords}-${fallenWordsCount}-${hitWordsCount}`;
        if (this._lastStatsKey !== statsKey) {
            debugLog.info(`📊 更新考试统计: 剩余=${remainingWords}, 下落=${fallenWordsCount}, 命中=${hitWordsCount}, 命中率=${hitPercentage}%, 覆盖率=${coveragePercentage}%`);
            this._lastStatsKey = statsKey;
        }
        
        const totalWordsElement = document.getElementById('total-words');
        const hitWordsElement = document.getElementById('hit-words');
        const hitPercentageElement = document.getElementById('hit-percentage');
        const coveragePercentageElement = document.getElementById('coverage-percentage');
        
        if (totalWordsElement) totalWordsElement.textContent = remainingWords;
        if (hitWordsElement) hitWordsElement.textContent = hitWordsCount;
        if (hitPercentageElement) hitPercentageElement.textContent = `${hitPercentage}%`;
        if (coveragePercentageElement) coveragePercentageElement.textContent = `${coveragePercentage}%`;
    }

    setupSpeechSynthesis() {
        debugLog.info('🎤 初始化语音合成系统...');
        
        // 详细检查 TTSService
        debugLog.info(`   🔍 检查 window.TTSService: ${typeof window.TTSService}`);
        debugLog.info(`   🔍 检查 TTSService: ${typeof TTSService}`);
        debugLog.info(`   🔍 检查 AudioCacheManager: ${typeof AudioCacheManager}`);
        
        // 使用 TTSService
        if (typeof TTSService !== 'undefined') {
            debugLog.info('   ✅ TTSService 已加载，开始获取实例...');
            
            try {
                this.ttsService = TTSService.getInstance();
                debugLog.info('   ✅ TTSService 实例获取成功');
                
                // 异步初始化 TTS 服务（提前测试找到可用的提供商）
                debugLog.info('   🔄 开始初始化 TTSService...');
                this.ttsService.initialize().then(() => {
                    debugLog.success('   ✅ TTSService 初始化完成');
                    
                    // 检查初始化结果
                    const providersDetails = this.ttsService.getAvailableProvidersDetails();
                    debugLog.info(`   📊 可用提供商数量: ${providersDetails.length}`);
                    
                    if (providersDetails.length === 0) {
                        debugLog.warning('   ⚠️ 没有找到可用的 TTS 提供商');
                        this.speechEnabled = false;
                    } else {
                        debugLog.success('   ✅ 语音系统初始化成功');
                        this.speechEnabled = true;
                    }
                }).catch((error) => {
                    debugLog.error('   ❌ TTS 服务初始化失败:', error);
                    debugLog.error('   📋 错误详情:', error.message || error);
                    this.speechEnabled = false;
                });
            } catch (error) {
                debugLog.error('   ❌ TTSService 实例获取失败:', error);
                debugLog.error('   📋 错误详情:', error.message || error);
                this.speechEnabled = false;
            }
        } else if (typeof window.TTSService !== 'undefined') {
            debugLog.warning('   ⚠️ TTSService 在 window 对象中，尝试使用 window.TTSService');
            
            try {
                this.ttsService = window.TTSService.getInstance();
                debugLog.info('   ✅ window.TTSService 实例获取成功');
                
                // 异步初始化
                this.ttsService.initialize().then(() => {
                    debugLog.success('   ✅ TTSService 初始化完成');
                    const providersDetails = this.ttsService.getAvailableProvidersDetails();
                    if (providersDetails.length === 0) {
                        debugLog.warning('   ⚠️ 没有找到可用的 TTS 提供商');
                        this.speechEnabled = false;
                    } else {
                        this.speechEnabled = true;
                    }
                }).catch((error) => {
                    debugLog.error('   ❌ TTS 服务初始化失败:', error);
                    this.speechEnabled = false;
                });
            } catch (error) {
                debugLog.error('   ❌ window.TTSService 实例获取失败:', error);
                this.speechEnabled = false;
            }
        } else {
            debugLog.error('   ❌ TTSService 未加载（检查脚本加载顺序）');
            debugLog.error('   📋 请确认以下脚本已正确加载:');
            debugLog.error('      1. src/utils/AudioCacheManager.js');
            debugLog.error('      2. src/utils/TTSService.js');
            this.speechEnabled = false;
        }
    }

    async speakWord(word) {
        // 检查是否启用语音
        if (!this.speechEnabled || !this.ttsService) {
            debugLog.warning('⚠️ 语音未启用或 TTS 服务未加载');
            return;
        }

        // 检查游戏状态，如果游戏未在进行中则不播放
        if (this.gameState !== 'playing') {
            debugLog.info(`⏸️ 游戏未在进行中 (状态: ${this.gameState})，跳过朗读: "${word}"`);
            return;
        }

        // 根据游戏模式设置超时时间
        // 挑战模式和休闲模式都使用3秒超时
        const timeout = 3000;
        
        // 记录调用来源（用于调试）
        debugLog.info(`🎤 准备朗读: "${word}"`);

        // 使用 TTSService 朗读
        try {
            await this.ttsService.speak(word, {
                timeout: timeout, // 根据游戏模式设置超时
                showError: false, // 不显示错误通知，避免干扰游戏
                onSuccess: (providerName, duration, speakId) => {
                    // duration 是 TTS 服务内部计算的单个提供商的实际用时
                    debugLog.info(`🔊 朗读成功: "${word}" (ID: ${speakId}, ${providerName}, 用时: ${duration}ms, 超时: ${timeout}ms)`);
                },
                onError: (error) => {
                    // 显示详细的错误信息
                    debugLog.error(`❌ 朗读失败: "${word}" - ${error.message || error}`);
                    
                    // 如果是 iOS 音频上下文未解锁的错误，给出具体提示
                    if (error.message && error.message.includes('音频上下文未解锁')) {
                        debugLog.warning('💡 iOS 设备需要在用户交互时解锁音频上下文');
                        debugLog.warning('💡 请确保在点击"开始游戏"时正确调用了 unlockAudioContext()');
                    }
                }
            });
        } catch (error) {
            debugLog.error(`❌ 朗读异常: "${word}" - ${error.message || error}`, error);
        }
    }

    startRepeatedSpeech(word) {
        debugLog.info(`🔁 开始重复朗读: "${word}" (模式: ${this.gameMode})`);
        
        // 根据游戏模式决定播放策略
        if (this.gameMode === 'challenge') {
            // 挑战模式：单词已在缓冲区倒数时开始播放
            // 不停止当前播放，只设置5秒重复播放定时器
            debugLog.info(`🔥 挑战模式 - 设置5秒重复播放定时器（不中断缓冲区播放）: "${word}"`);
            
            // 先清理旧的定时器（如果存在）
            if (this.speechTimer) {
                clearInterval(this.speechTimer);
                this.speechTimer = null;
            }
            
            // 设置定时器每5秒重复播放
            this.speechTimer = setInterval(async () => {
                debugLog.info(`⏰ 定时重复朗读: "${word}"`);
                await this.speakWord(word);
            }, 5000); // 5秒 = 5000毫秒
        } else {
            // 休闲模式：先停止之前的朗读，然后2秒后播放第一次
            this.stopSpeaking();
            
            debugLog.info(`😊 休闲模式 - 2秒后播放: "${word}"`);
            this.firstSpeechTimer = setTimeout(async () => {
                debugLog.info(`⏰ 首次朗读（2秒延迟后）: "${word}"`);
                await this.speakWord(word);
                
                // 首次播放后，设置定时器每5秒重复播放
                this.speechTimer = setInterval(async () => {
                    debugLog.info(`⏰ 定时重复朗读: "${word}"`);
                    await this.speakWord(word);
                }, 5000); // 5秒 = 5000毫秒
            }, 2000); // 2秒后首次播放
        }
    }

    stopSpeaking() {
        // 收集ID信息用于调试
        const ttsInfo = this.ttsService ? {
            currentId: this.ttsService.currentSpeakId,
            activeIds: Array.from(this.ttsService.activeSpeakIds || []),
            currentWord: this.ttsService.currentWord
        } : null;
        
        debugLog.info(`⏹️ stopSpeaking() 被调用 [TTS当前ID=${ttsInfo?.currentId || 'N/A'}, 活跃ID=[${ttsInfo?.activeIds.join(', ') || '无'}], 单词="${ttsInfo?.currentWord || '无'}"]`);
        
        // 取消首次朗读定时器
        if (this.firstSpeechTimer) {
            clearTimeout(this.firstSpeechTimer);
            this.firstSpeechTimer = null;
            debugLog.info('   ⏹️ 停止首次朗读定时器');
        }
        
        // 取消重复朗读定时器
        if (this.speechTimer) {
            clearInterval(this.speechTimer);
            this.speechTimer = null;
            debugLog.info('   ⏹️ 停止重复朗读定时器');
        }

        // 停止当前语音（使用 TTSService）
        if (this.ttsService) {
            debugLog.info('   ⏹️ 停止当前音频播放（调用 TTSService.stop）');
            this.ttsService.stop();
        }

        this.currentSpeech = null;
        debugLog.info('⏹️ stopSpeaking() 完成');
    }

    toggleSpeech() {
        this.speechEnabled = !this.speechEnabled;
        
        const btn = document.getElementById('toggleSpeechBtn');
        if (this.speechEnabled) {
            btn.textContent = '🔊 语音开';
            btn.classList.remove('disabled');
            debugLog.success('✅ 语音已开启');
            
            // 如果有单词在下降且游戏正在进行，重新开始朗读
            if (this.gameState === 'playing' && this.fallingWords.length > 0) {
                const word = this.fallingWords[0].original;
                debugLog.info(`🔄 恢复朗读当前单词: "${word}"`);
                this.startRepeatedSpeech(word);
            }
        } else {
            btn.textContent = '🔇 语音关';
            btn.classList.add('disabled');
            debugLog.warning('⚠️ 语音已关闭');
            this.stopSpeaking();
        }
    }

    setupHighDPICanvas() {
        // 获取设备像素比
        const dpr = window.devicePixelRatio || 1;
        
        // 以左侧面板实际内容高度为目标高度（图片展示区 + 控制区 + 间距），至少500px
        const targetDisplayHeight = Math.max(500, this.computeLeftPanelContentHeight());
        const displayWidth = 600;
        const displayHeight = targetDisplayHeight;
        
        // 设置Canvas的实际像素尺寸（同时会重置变换矩阵）
        this.canvas.width = displayWidth * dpr;
        this.canvas.height = displayHeight * dpr;
        
        // 设置Canvas的CSS显示尺寸
        this.canvas.style.width = displayWidth + 'px';
        this.canvas.style.height = displayHeight + 'px';
        
        // 缩放绘图上下文以匹配设备像素比
        this.ctx.scale(dpr, dpr);
        
        // 启用更好的图像平滑
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';
        
        // 同步逻辑尺寸和依赖值
        this.syncCanvasLogicalSize(displayWidth, displayHeight);
        
        // 在窗口尺寸或左栏布局变化后同步画布，并重算与尺寸相关的参数
        const resizeHandler = () => {
            const h = Math.max(500, this.computeLeftPanelContentHeight());
            this.setupHighDPICanvasWith(displayWidth, h);
        };
        window.addEventListener('resize', resizeHandler);
        // 监听左栏尺寸变化（网格切换/字重变化等也能触发）
        const lpEl = document.querySelector('.left-panel');
        if (lpEl && window.ResizeObserver) {
            const ro = new ResizeObserver(() => resizeHandler());
            ro.observe(lpEl);
            this._leftPanelRO = ro;
        }
    }

    setupHighDPICanvasWith(displayWidth, displayHeight) {
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = displayWidth * dpr;
        this.canvas.height = displayHeight * dpr;
        this.canvas.style.width = displayWidth + 'px';
        this.canvas.style.height = displayHeight + 'px';
        // 重置scale（设置width/height已重置变换，这里再次设置）
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.scale(dpr, dpr);
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';
        this.syncCanvasLogicalSize(displayWidth, displayHeight);
    }

    syncCanvasLogicalSize(displayWidth, displayHeight) {
        this.canvasWidth = displayWidth;
        this.canvasHeight = displayHeight;
        this.bufferHeight = 80;
        this.gameAreaTop = this.bufferHeight;
        this.gameAreaHeight = this.canvasHeight - this.bufferHeight;
        // 更新炮管位置
        if (this.cannon) {
            this.cannon.x = this.canvasWidth / 2;
            this.cannon.y = this.canvasHeight - 30;
        }
    }

    // 计算左侧面板实际内容高度（避免被右侧列撑高）
    computeLeftPanelContentHeight() {
        const lp = document.querySelector('.left-panel');
        if (!lp) return 500;
        const img = lp.querySelector('.image-showcase');
        const ctrl = lp.querySelector('.game-controls');
        const styles = window.getComputedStyle(lp);
        const gap = parseFloat(styles.gap || '0') || 0;
        const imgH = img ? img.offsetHeight : 0;
        const ctrlH = ctrl ? ctrl.offsetHeight : 0;
        const paddingTop = parseFloat(styles.paddingTop || '0') || 0;
        const paddingBottom = parseFloat(styles.paddingBottom || '0') || 0;
        return imgH + ctrlH + gap + paddingTop + paddingBottom;
    }

    init() {
        // 初始化调试日志系统
        debugLog.init();
        debugLog.info('🎮 游戏初始化开始...');
        
        this.loadGameData();
        this.bindEvents();
        this.updateUI();
        // 【修复】不在 init 中生成单词，让 startGame() 统一处理
        // this.generateNextWord(); 
        this.initExamStats(); // 初始化考试统计
        this.gameLoop();
        
        debugLog.success('✅ 游戏初始化完成');
    }

    // 数据存储系统
    saveGameData() {
        const gameData = {
            score: this.score,
            level: this.level,
            totalPlayTime: this.getTotalPlayTime(),
            vocabularyBook: this.vocabularyManager.getVocabularyBook(),
            gameStats: {
                totalWordsHit: this.totalWordsHit || 0,
                totalWordsGivenUp: this.totalWordsGivenUp || 0,
                totalWordsFailed: this.totalWordsFailed || 0,
                maxCombo: this.maxCombo || 0,
                perfectLevels: this.perfectLevels || 0
            },
            lastPlayed: Date.now()
        };
        
        try {
            localStorage.setItem('wordTetrisGame', JSON.stringify(gameData));
        } catch (error) {
            console.warn('无法保存游戏数据:', error);
        }
    }

    loadGameData() {
        try {
            const savedData = localStorage.getItem('wordTetrisGame');
            if (savedData) {
                const gameData = JSON.parse(savedData);
                
                // 恢复生词本数据
                if (gameData.vocabularyBook) {
                    gameData.vocabularyBook.forEach(word => {
                        this.vocabularyManager.missedWords.set(word.word, word);
                    });
                }
                
                // 恢复游戏统计
                if (gameData.gameStats) {
                    this.totalWordsHit = gameData.gameStats.totalWordsHit || 0;
                    this.totalWordsGivenUp = gameData.gameStats.totalWordsGivenUp || 0;
                    this.totalWordsFailed = gameData.gameStats.totalWordsFailed || 0;
                    this.maxCombo = gameData.gameStats.maxCombo || 0;
                    this.perfectLevels = gameData.gameStats.perfectLevels || 0;
                }
            }
        } catch (error) {
            console.warn('无法加载游戏数据:', error);
        }
    }

    getTotalPlayTime() {
        if (this.startTime) {
            return (this.gameTime || 0) + Math.floor((Date.now() - this.startTime) / 1000);
        }
        return this.gameTime || 0;
    }

    bindEvents() {
        // 按钮事件
        document.getElementById('startBtn').addEventListener('click', () => this.startGame());
        document.getElementById('pauseBtn').addEventListener('click', () => this.pauseGame());
        document.getElementById('resetBtn').addEventListener('click', () => this.resetGame(true));
        // 提交按钮已移除，使用实时输入自动射击机制
        document.getElementById('giveUpBtn').addEventListener('click', () => this.giveUpCurrentWord());
        document.getElementById('exportBtn').addEventListener('click', () => this.exportVocabulary());
        document.getElementById('toggleSpeechBtn').addEventListener('click', () => this.toggleSpeech());
        
        // 弹窗事件
        document.getElementById('restartBtn').addEventListener('click', () => this.restartGame());
        document.getElementById('continueBtn').addEventListener('click', () => this.continueGame());
        document.getElementById('reviewVocabBtn').addEventListener('click', () => this.showVocabularyBook());
        document.getElementById('viewVocabBtn').addEventListener('click', () => this.showVocabularyBook());
        
        // 输入框事件
        const letterInput = document.getElementById('letterInput');
        letterInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.submitAnswer();
            }
        });
        
        // 全局键盘事件
        document.addEventListener('keydown', (e) => {
            // 任何按键都尝试重新激活 iOS 音频上下文（静默模式，不刷屏）
            // 只在 iOS 设备上执行
            if (this.isIOS && this.ttsService && typeof this.ttsService.unlockAudioContext === 'function') {
                this.ttsService.unlockAudioContext(true).catch(() => {}); // silent = true
            }
            
            // 空格键放弃单词
            if (e.code === 'Space' && this.gameState === 'playing') {
                e.preventDefault(); // 防止页面滚动
                this.giveUpCurrentWord();
                return;
            }
            
            // 等级提升弹窗现在自动进入下一级，不需要键盘快捷键
            // if (this.gameState === 'levelup' && (e.code === 'Enter' || e.code === 'Space')) {
            //     e.preventDefault();
            //     this.continueGame();
            //     return;
            // }
            
            // 字母输入处理（游戏进行中）
            if (this.gameState === 'playing' && e.key.match(/^[a-zA-Z]$/)) {
                e.preventDefault();
                this.handleLetterInput(e.key.toLowerCase());
                return;
            }
            
            // Enter键提交答案
            if (e.code === 'Enter' && this.gameState === 'playing') {
                e.preventDefault();
                this.submitAnswer();
                return;
            }
            
            // Backspace键删除字符
            if (e.code === 'Backspace' && this.gameState === 'playing') {
                e.preventDefault();
                this.handleBackspace();
                return;
            }
        });
        
        // 只允许输入字母，并实时更新显示
        letterInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^a-zA-Z]/g, '').toLowerCase();
            this.updateRealTimeDisplay();
        });
    }
    
    // 处理全局字母输入
    handleLetterInput(letter) {
        const letterInput = document.getElementById('letterInput');
        const currentValue = letterInput.value;
        
        // 动态限制：按当前单词缺失字母数限制输入长度
        let maxLen = 3;
        if (this.fallingWords.length > 0 && this.fallingWords[0].missingLetters) {
            maxLen = this.fallingWords[0].missingLetters.length;
        }
        if (currentValue.length < maxLen) {
            letterInput.value = currentValue + letter;
            this.updateRealTimeDisplay();
        }
    }
    
    // 处理退格键
    handleBackspace() {
        const letterInput = document.getElementById('letterInput');
        const currentValue = letterInput.value;
        
        if (currentValue.length > 0) {
            letterInput.value = currentValue.slice(0, -1);
            this.updateRealTimeDisplay();
        }
    }

    startGame() {
        // ✅ iOS 兼容性：解锁音频上下文（必须在用户交互事件中调用）
        // 重要：不使用 await，避免阻塞游戏启动流程
        debugLog.info('🎬 startGame() 被调用');
        debugLog.info(`📊 this.ttsService 状态: ${this.ttsService ? '已初始化' : '未初始化'}`);
        
        // 只在 iOS 设备上执行音频解锁
        if (this.isIOS && this.ttsService && typeof this.ttsService.unlockAudioContext === 'function') {
            debugLog.info('🔓 iOS 设备：开始异步解锁音频上下文（不阻塞游戏启动）...');
            
            // 异步执行，不阻塞主流程
            this.ttsService.unlockAudioContext()
                .then((unlocked) => {
                    if (unlocked) {
                        debugLog.success('✅ iOS 音频上下文解锁成功');
                    } else {
                        debugLog.warning('⚠️ iOS 音频上下文解锁失败（但不影响游戏运行）');
                    }
                })
                .catch((error) => {
                    debugLog.warning(`⚠️ 解锁音频上下文出错（但不影响游戏运行）: ${error.message}`);
                });
        } else if (!this.isIOS) {
            debugLog.info('💻 非 iOS 设备，跳过音频解锁');
        } else if (!this.ttsService) {
            debugLog.warning('⚠️ ttsService 未初始化，跳过音频解锁');
        }
        
        // 智能检测起始等级
        const availableDifficulties = this.vocabularyManager.getAvailableDifficulties();
        if (availableDifficulties && availableDifficulties.length > 0) {
            const minDifficulty = Math.min(...availableDifficulties);
            if (minDifficulty > 1) {
                console.log(`⚠️ 词库中没有难度1的单词，自动从等级${minDifficulty}开始`);
                console.log(`📊 可用难度: ${availableDifficulties.join(', ')}`);
                this.level = minDifficulty;
                this.targetScore = minDifficulty * 100; // 调整目标分数
                
                // 更新显示
                document.getElementById('level').textContent = this.level;
                document.getElementById('target').textContent = this.targetScore;
                
                // 显示提示信息
                alert(`当前词库没有难度1的单词\n自动从等级${minDifficulty}开始游戏`);
            }
        }
        
        this.gameState = 'playing';
        this.startTime = Date.now();
        this.updateButtons();
        
        // 【修复】确保单词库加载完成后再启动游戏流程
        this.waitForVocabularyAndStart();
        
        // 确保输入框可以接收键盘输入（但不需要焦点）
        const letterInput = document.getElementById('letterInput');
        letterInput.blur(); // 移除焦点，让全局键盘事件生效
    }
    
    // 等待单词库加载完成后启动游戏流程
    waitForVocabularyAndStart() {
        if (!this.vocabularyManager.isLoaded) {
            if (this.vocabularyManager.loadError) {
                debugLog.error('❌ 单词库加载失败，无法开始游戏');
                alert('单词库加载失败，请刷新页面重试');
                this.gameState = 'stopped';
                return;
            }
            debugLog.info('⏳ 等待单词库加载...');
            setTimeout(() => this.waitForVocabularyAndStart(), 50);
            return;
        }
        
        debugLog.success('✅ 单词库已加载，开始游戏流程');
        // 先生成第一个单词
        this.generateNextWord();
        
        // 确保单词生成成功后再启动缓冲区
        if (this.nextWord) {
            debugLog.success(`✅ 第一个单词已生成: ${this.nextWord.original}`);
            this.startBufferCountdown();
        } else {
            debugLog.error('❌ 第一个单词生成失败');
            alert('单词生成失败，请刷新页面重试');
            this.gameState = 'stopped';
        }
    }

    pauseGame() {
        if (this.gameState === 'playing') {
            this.gameState = 'paused';
            this.stopSpeaking(); // 暂停时停止朗读
        } else if (this.gameState === 'paused') {
            this.gameState = 'playing';
            // 恢复游戏时，如果有单词在下降，重新开始朗读
            if (this.fallingWords.length > 0) {
                this.startRepeatedSpeech(this.fallingWords[0].original);
            }
        }
        this.updateButtons();
    }

    resetGame(autoStart = false) {
        this.stopSpeaking(); // 重置时停止朗读
        
        this.gameState = 'stopped';
        this.score = 0;
        this.level = 1;
        this.targetScore = 100;
        this.startTime = null;
        this.gameTime = 0;
        this.fallingWords = [];
        this.stackedWords = [];
        this.currentWord = null;
        this.nextWord = null; // 【修复】重置时清空 nextWord
        this.bufferState = 'idle';
        this.bufferTimer = 0;
        this.spawnTimer = 0;
        this.speedMultiplier = 1.0;
        this.wordSpeed = this.baseSpeed;
        this._lastStackedWordsCount = 0;
        
        // 重置游戏时清空生词本和统计数据
        this.vocabularyManager.clearCurrentLevelVocabulary();
        this.vocabularyManager.resetWordPool(); // 重置单词池
        this.totalWordsHit = 0;
        this.totalWordsGivenUp = 0;
        this.totalWordsFailed = 0;
        this.maxCombo = 0;
        this.perfectLevels = 0;
        this.hitWords = new Set(); // 重置命中单词集合（去重用）
        this.fallenWords = new Set(); // 重置下落单词集合（去重用）
        this.gameCompletionTriggered = false; // 【修复】重置完成标志
        
        // 【修复】重置炮管角度
        this.cannon.angle = -Math.PI / 2;
        this.cannon.targetAngle = -Math.PI / 2;
        this._cannonLogCounter = 0; // 重置炮管日志计数器
        
        // 重置炮弹和爆炸效果
        this.bullets = [];
        this.explosions = [];
        this.muzzleFlashes = [];
        this.meaningExplosions = [];
        this.errorMarks = [];
        
        console.log('🔄 游戏重置，生词本已清空，统计数据已重置，单词池已重置');
        
        this.resetBufferLights();
        // 【修复】不在这里生成 nextWord，让 startGame() 来生成
        this.updateUI();
        this.updateButtons();
        this.clearInput();
        this.hideModals();
        this.updateExamStats(); // 更新考试统计显示
        
        // 如果指定自动开始，则在重置完成后自动开始游戏
        if (autoStart) {
            setTimeout(() => {
                this.startGame();
                console.log('🎮 重置完成，自动开始游戏');
            }, 200); // 稍微延迟确保重置完成
        }
    }

    restartGame() {
        this.hideModals();
        this.resetGame();
        this.startGame();
    }

    continueGame() {
        // 清除自动关闭定时器
        if (this.levelUpAutoCloseTimer) {
            clearTimeout(this.levelUpAutoCloseTimer);
            this.levelUpAutoCloseTimer = null;
        }
        
        // 清除倒计时定时器
        if (this.levelUpCountdownTimer) {
            clearInterval(this.levelUpCountdownTimer);
            this.levelUpCountdownTimer = null;
        }
        
        // 注意：升级时不清空生词本，生词本会一直累积
        // 只有重置游戏时才清空生词本
        console.log('✅ 升级完成，生词本保留，开始新等级');
        
        // 恢复继续游戏按钮的显示（为其他功能保留）
        const continueBtn = document.getElementById('continueBtn');
        if (continueBtn) {
            continueBtn.style.display = '';
        }
        
        this.hideModals();
        this.gameState = 'playing';
    }

    submitAnswer() {
        if (this.gameState !== 'playing') return;
        
        const input = document.getElementById('letterInput').value.trim();
        if (!input) return;
        
        // 检查是否有可以击落的单词
        let hitWord = null;
        for (let i = 0; i < this.fallingWords.length; i++) {
            const word = this.fallingWords[i];
            if (this.vocabularyManager.checkAnswer(word, input)) {
                hitWord = word;
                this.fallingWords.splice(i, 1);
                break;
            }
        }
        
        if (hitWord) {
            // 停止语音朗读（单词已被成功击落）
            this.stopSpeaking();
            
            // 击落成功 - 计算分数
            let points = this.calculateScore(hitWord);
            this.score += points;
            this.combo++;
            this.lastHitTime = Date.now();
            
            // 更新命中统计（去重）
            this.hitWords.add(hitWord.original.toLowerCase());
            
            this.showHitEffect(hitWord, points);
            this.clearInput();
            
            // 检查是否升级
            if (this.score >= this.targetScore) {
                this.levelUp();
            }
            
            // 检查游戏是否完成
            this.checkGameCompletion();
        } else {
            // 击落失败
            this.combo = 0;
            this.perfectLevel = false;
            this.showMissEffect();
        }
        
        this.updateUI();
    }

    calculateScore(word) {
        // 基础分数：每个字母1分
        let baseScore = word.missingLetters.length;
        
        // 速度奖励：快速击落额外+50%分数
        const currentTime = Date.now();
        const timeSinceSpawn = currentTime - (word.spawnTime || currentTime);
        if (timeSinceSpawn < 2000) { // 2秒内击落
            baseScore = Math.floor(baseScore * 1.5);
        }
        
        // 连击奖励：连续击落3个以上单词，每个额外+1分
        if (this.combo >= 3) {
            baseScore += 1;
        }
        
        return baseScore;
    }

    levelUp() {
        // 完美奖励：一个等级内零失误，额外+20分
        if (this.perfectLevel) {
            this.score += 20;
            this.perfectLevels = (this.perfectLevels || 0) + 1;
        }
        
        console.log('🎉 升级前堆叠区单词数:', this.stackedWords.length);
        
        // 收集当前堆叠的单词到生词本
        this.stackedWords.forEach(word => {
            this.vocabularyManager.addMissedWord(word);
        });
        
        const vocabularyStats = this.vocabularyManager.getVocabularyStats();
        console.log('📚 错词本统计:', vocabularyStats);
        
        // 清空堆叠区
        this.stackedWords = [];
        console.log('🧹 升级后清空堆叠区');
        
        // 升级
        this.level++;
        this.targetScore = this.level * 100;
        
        // 按设计方案调整速度：每级增加5%
        this.speedMultiplier += 0.05;
        this.wordSpeed = this.baseSpeed * this.speedMultiplier;
        
        this.spawnRate = Math.max(120, this.spawnRate - 10); // 最快2秒一个
        
        // 重置等级状态
        this.perfectLevel = true;
        this.combo = 0;
        this.levelWordCount = 0;
        
        // 通知单词管理器升级（不重置单词池）
        this.vocabularyManager.onLevelUp();
        
        // 暂停游戏并显示升级弹窗
        this.gameState = 'levelup';
        this.showLevelUpModal(vocabularyStats.totalWords);
        
        // 注意：生词本将在用户点击"继续游戏"时清空
        // 这样用户可以在升级弹窗中看到当前等级的生词本统计
        
        // 保存游戏数据
        this.saveGameData();
    }

    generateNextWord() {
        // 检查单词库是否已加载
        if (!this.vocabularyManager.isLoaded) {
            debugLog.error('❌ generateNextWord: 单词库未加载');
            return;
        }
        
        // 【调试】输出单词池当前状态
        debugLog.info(`📝 生成新单词前，单词池剩余: ${this.vocabularyManager.wordPool.length} 个`);
        
        // 检查是否为等级末尾挑战（最后10个单词）
        const wordsUntilNextLevel = Math.ceil((this.targetScore - this.score) / 2); // 假设平均2分/单词
        const isEndChallenge = wordsUntilNextLevel <= 10;
        
        // 取消难度限制：从所有难度中随机选择单词
        this.nextWord = this.vocabularyManager.getRandomWordFromAll(isEndChallenge);
        
        // 如果获取单词失败，检查是否所有单词都已用完
        if (!this.nextWord) {
            // 检查是否所有单词都已掉落完毕
            if (this.checkAllWordsCompleted()) {
                debugLog.success('🎉 所有单词已完成，等待最后一个单词处理...');
                // 不立即结束游戏，等待当前单词被处理
                return;
            }
            debugLog.error('❌ 获取单词失败，单词池可能已空');
            return;
        }
        
        debugLog.success(`✅ 生成新单词: ${this.nextWord.original}，单词池剩余: ${this.vocabularyManager.wordPool.length} 个`);
        this.levelWordCount++;
        this.updateNextWordDisplay();
    }
    
    // 检查是否所有单词都已掉落完毕
    checkAllWordsCompleted() {
        if (!this.vocabularyManager.isLoaded) {
            return false;
        }
        
        // 【修复】单词池为空 + nextWord也为空 才表示所有单词都已生成并处理完毕
        // 因为最后一个单词从单词池抽取后，单词池变空，但这个单词还在 nextWord 中等待释放
        const wordPoolEmpty = this.vocabularyManager.wordPool.length === 0;
        const noNextWord = this.nextWord === null;
        
        if (wordPoolEmpty && noNextWord) {
            console.log(`📊 单词池已空且无待释放单词，游戏即将完成`);
            console.log(`📊 统计: 总单词=${this.totalWords}, 已下落=${this.fallenWords.size}, 命中=${this.hitWords.size}`);
            return true;
        }
        
        return false;
    }
    
    // 检查游戏是否完成（所有单词已下落且没有正在下落的单词）
    checkGameCompletion() {
        // 【修复】防止重复触发
        if (this.gameCompletionTriggered) {
            return;
        }
        
        // 检查是否所有单词都已下落
        const allCompleted = this.checkAllWordsCompleted();
        
        if (!allCompleted) {
            return; // 单词池还有单词，继续游戏
        }
        
        // ===== 已修复：此逻辑不再需要 =====
        // checkAllWordsCompleted() 现在会正确判断单词池为空 + nextWord为空
        // 所以不会在还有 nextWord 时错误地认为游戏完成
        // 保留此注释以便理解逻辑
        
        // 检查是否还有单词在处理中（包括缓冲区和下落中的单词）
        const hasWordsInProgress = this.fallingWords.length > 0 || 
                                   this.bufferState !== 'idle' || 
                                   this.nextWord !== null;
        
        if (!hasWordsInProgress) {
            // 【修复】设置标志，防止重复触发
            this.gameCompletionTriggered = true;
            
            debugLog.success('🎉 所有单词已处理完毕，游戏完成！');
            debugLog.info(`📊 最终统计: 总单词=${this.totalWords}, 已下落=${this.fallenWords.size}, 命中=${this.hitWords.size}`);
            
            // 延迟500ms让动画完成后显示完成弹窗
            setTimeout(() => {
                if (this.gameState === 'playing') {
                    this.showGameCompletionModal();
                }
            }, 500);
        }
    }
    
    // 显示游戏完成弹窗
    showGameCompletionModal() {
        this.gameState = 'gameOver';
        
        // 计算最终统计
        const hitWordsCount = this.hitWords.size;
        const fallenWordsCount = this.fallenWords.size;
        const hitPercentage = fallenWordsCount > 0 ? Math.round((hitWordsCount / fallenWordsCount) * 100) : 0;
        const coveragePercentage = this.totalWords > 0 ? Math.round((hitWordsCount / this.totalWords) * 100) : 0;
        
        // 【修复】使用HTML中实际存在的ID（没有中划线）
        const finalScoreEl = document.getElementById('finalScore');
        const finalLevelEl = document.getElementById('finalLevel');
        const finalVocabularyEl = document.getElementById('finalVocabulary');
        
        if (finalScoreEl) finalScoreEl.textContent = this.score;
        if (finalLevelEl) finalLevelEl.textContent = this.level;
        if (finalVocabularyEl) finalVocabularyEl.textContent = this.vocabularyManager.getVocabularyStats().totalWords;
        
        // 显示完成统计
        const gameOverModal = document.getElementById('gameOverModal');
        const modalTitle = gameOverModal.querySelector('h2');
        if (modalTitle) {
            modalTitle.textContent = '🎉 恭喜完成！';
        }
        
        // 添加完成信息
        const modalContent = gameOverModal.querySelector('.modal-content');
        let completionInfo = modalContent.querySelector('.completion-info');
        if (!completionInfo) {
            completionInfo = document.createElement('div');
            completionInfo.className = 'completion-info';
            completionInfo.style.cssText = 'background: #e8f5e9; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #4caf50;';
            const modalBody = modalContent.querySelector('.modal-body');
            if (modalBody && modalBody.firstChild) {
                modalBody.insertBefore(completionInfo, modalBody.firstChild.nextSibling);
            }
        }
        completionInfo.innerHTML = `
            <p style="margin: 0; font-size: 1.1em; color: #2e7d32;">
                ✅ 已完成所有 ${this.totalWords} 个单词的测试！<br>
                📊 命中率: ${hitPercentage}% (${hitWordsCount}/${fallenWordsCount})<br>
                🎯 覆盖率: ${coveragePercentage}% (${hitWordsCount}/${this.totalWords})
            </p>
        `;
        
        gameOverModal.style.display = 'flex';
        debugLog.success('📊 游戏完成弹窗已显示');
    }

    startBufferCountdown() {
        if (this.bufferState !== 'idle') return;
        
        this.bufferState = 'countdown';
        this.bufferTimer = 0;
        this.resetBufferLights();
        
        // 挑战模式：在缓冲区倒数开始时就播放音频
        if (this.gameMode === 'challenge' && this.nextWord) {
            debugLog.info(`🔥 挑战模式 - 缓冲区倒数开始，立即播放音频: "${this.nextWord.original}"`);
            this.speakWord(this.nextWord.original);
        }
    }

    updateBufferCountdown() {
        if (this.bufferState !== 'countdown') return;
        
        this.bufferTimer++;
        
        if (this.bufferTimer === 60) { // 1秒 - 只亮红灯
            this.bufferLights.red = true;
            this.bufferLights.yellow = false;
            this.bufferLights.green = false;
            // debugLog.info(`⏱️ 缓冲区倒计时: 红灯 (1秒)`);
        } else if (this.bufferTimer === 120) { // 2秒 - 只亮黄灯
            this.bufferLights.red = false;
            this.bufferLights.yellow = true;
            this.bufferLights.green = false;
            // debugLog.info(`⏱️ 缓冲区倒计时: 黄灯 (2秒)`);
        } else if (this.bufferTimer === 180) { // 3秒 - 只亮绿灯
            this.bufferLights.red = false;
            this.bufferLights.yellow = false;
            this.bufferLights.green = true;
            // debugLog.info(`⏱️ 缓冲区倒计时: 绿灯 (3秒)`);
        } else if (this.bufferTimer === 240) { // 4秒 - 绿灯亮满1秒后释放单词
            debugLog.success(`🚀 缓冲区倒计时完成，准备释放单词`);
            this.releaseWord();
        }
        
        this.updateBufferLights();
    }

    releaseWord() {
        if (!this.nextWord) {
            debugLog.warning('⚠️ releaseWord: nextWord 为空，无法释放');
            return;
        }
        
        debugLog.success(`📤 释放单词到游戏区域: ${this.nextWord.original}`);
        
        // 计算单词宽度
        const wordWidth = this.nextWord.display.length * 30;
        
        // 计算随机 x 位置（确保单词完全在画布内）
        const minX = wordWidth / 2 + 20; // 左边界留20像素边距
        const maxX = this.canvasWidth - wordWidth / 2 - 20; // 右边界留20像素边距
        const randomX = minX + Math.random() * (maxX - minX);
        
        // 创建下降单词
        const fallingWord = {
            ...this.nextWord,
            x: randomX,
            y: this.gameAreaTop,
            width: wordWidth,
            height: 40,
            spawnTime: Date.now() // 添加生成时间戳
        };
        
        this.fallingWords.push(fallingWord);
        debugLog.info(`✅ 单词已添加到 fallingWords，当前下落单词数: ${this.fallingWords.length}`);
        
        // 同步展示当前单词的图片，确保与下落单词一致
        this.updateImageShowcase(fallingWord.original);
        
        // 记录下落的单词（用于统计命中率）
        this.fallenWords.add(this.nextWord.original.toLowerCase());
        
        // 开始语音朗读（立即播放，并每5秒重复）
        this.startRepeatedSpeech(this.nextWord.original);
        
        // 清空用户输入（新单词开始，清空之前的输入）
        this.clearInput();
        
        // 重置缓冲区
        this.bufferState = 'idle';
        this.bufferTimer = 0;
        this.resetBufferLights();
        this.updateBufferLights();
        
        // 清空 nextWord（因为已经释放到 fallingWords）
        this.nextWord = null;
        
        // 只有当单词池不为空时才生成下一个单词
        if (!this.checkAllWordsCompleted()) {
            this.generateNextWord();
        } else {
            debugLog.warning('🎯 单词池已空，不再生成新单词，等待最后一个单词完成');
        }
        
        // 检查是否所有单词都已下落（在生成下一个单词后检查）
        this.checkGameCompletion();
    }

    updateGame() {
        if (this.gameState !== 'playing') return;
        
        // 更新游戏时间
        if (this.startTime) {
            this.gameTime = Math.floor((Date.now() - this.startTime) / 1000);
        }
        
        // 更新缓冲区倒计时
        this.updateBufferCountdown();
        
        // 更新生成计时器 - 只有当没有下降单词且单词池不为空时才生成新单词
        this.spawnTimer++;
        if (this.spawnTimer >= this.spawnRate && 
            this.bufferState === 'idle' && 
            this.fallingWords.length === 0 &&
            !this.checkAllWordsCompleted()) { // 新增：检查单词池是否还有单词
            this.startBufferCountdown();
            this.spawnTimer = 0;
        }
        
        // 更新炮管瞄准角度
        this.updateCannonAngle();
        
        // 更新下降单词
        this.updateFallingWords();
        
        // 更新炮弹
        this.updateBullets();
        
        // 更新爆炸效果
        this.updateExplosions();
        
        // 更新炮口火花
        this.updateMuzzleFlashes();
        
        // 更新中文翻译爆炸动画
        this.updateMeaningExplosions();
        
        // 更新错误标记
        this.updateErrorMarks();
        
        // 检查游戏结束条件
        this.checkGameOver();
        
        // 检查游戏是否完成（所有单词都已处理）
        this.checkGameCompletion();
    }

    updateFallingWords() {
        for (let i = this.fallingWords.length - 1; i >= 0; i--) {
            const word = this.fallingWords[i];
            word.y += this.wordSpeed;
            
            // 计算堆叠区顶部位置
            const stackTopY = this.getStackTopY();
            
            // 检查是否接触到堆叠区（失败判定）
            if (word.y + word.height >= stackTopY) {
                debugLog.warning(`💥 单词失败: ${word.original}`);
                debugLog.info(`   单词底部Y: ${word.y + word.height}, 堆叠区顶部Y: ${stackTopY}`);
                debugLog.info(`   堆叠区当前单词数: ${this.stackedWords.length}`);
                
                // 停止语音朗读
                this.stopSpeaking();
                
                // 移到堆叠区 - 标记为失败（非放弃）
                this.fallingWords.splice(i, 1);
                debugLog.info('✅ 已从下降列表移除');
                
                word.giveUp = false; // 确保标记为失败而非放弃
                debugLog.info('✅ 已标记为失败（giveUp=false）');
                
                debugLog.info('➡️ 准备调用 addToStack...');
                this.addToStack(word);
                debugLog.success('✅ addToStack 调用完成');
                
                // 失败也会重置连击和完美状态
                this.combo = 0;
                this.perfectLevel = false;
                
                // 更新统计
                this.totalWordsFailed = (this.totalWordsFailed || 0) + 1;
                debugLog.info(`📊 失败统计已更新，总失败数: ${this.totalWordsFailed}`);
                
                // 检查游戏是否完成
                this.checkGameCompletion();
            }
        }
    }
    
    // 获取堆叠区顶部位置
    getStackTopY() {
        if (this.stackedWords.length === 0) {
            // 如果堆叠区为空，返回画布底部
            return this.canvasHeight;
        }
        
        // 计算堆叠区最顶部单词的Y坐标
        const wordsPerRow = 5;
        const wordHeight = 50;  // 与drawStackedWords中的wordHeight保持一致
        const topRow = Math.floor((this.stackedWords.length - 1) / wordsPerRow);
        const stackTopY = this.canvasHeight - wordHeight - topRow * (wordHeight + 2);
        
        return stackTopY;
    }

    addToStack(word) {
        debugLog.info(`📦 addToStack: ${word?.original || 'undefined'}`);
        debugLog.info(`   当前堆叠数: ${this.stackedWords.length}`);
        
        // 验证单词对象
        if (!word) {
            debugLog.error('❌ 单词对象为空或undefined');
            return;
        }
        
        if (!word.original) {
            debugLog.error('❌ 单词对象缺少original属性');
            debugLog.error(`   完整对象: ${JSON.stringify(word, null, 2)}`);
            return;
        }
        
        // 添加到生词本（只在这里添加一次，避免重复）
        debugLog.info(`📚 添加到错词本: ${word.original}`);
        this.vocabularyManager.addMissedWord(word);
        debugLog.success('✅ 已添加到错词本');
        
        // 计算堆叠位置（按新的布局）
        const wordsPerRow = 5;
        const row = Math.floor(this.stackedWords.length / wordsPerRow);
        const col = this.stackedWords.length % wordsPerRow;
        
        word.stackRow = row;
        word.stackCol = col;
        
        // 添加到堆叠数组
        debugLog.info('📦 添加到堆叠数组...');
        this.stackedWords.push(word);
        debugLog.success(`✅ 已添加到堆叠数组 (位置: row${row}, col${col})`);
        
        debugLog.success(`✅ 堆叠总数: ${this.stackedWords.length}`);
        debugLog.info(`   堆叠列表: ${this.stackedWords.map(w => w.original).join(', ')}`);
        
        // 验证添加是否成功
        if (this.stackedWords.includes(word)) {
            debugLog.success('✅ 验证成功：单词已在堆叠数组中');
        } else {
            debugLog.error('❌ 验证失败：单词未在堆叠数组中！');
        }
    }

    checkGameOver() {
        // 检查堆叠是否到达顶部（接近缓冲区）
        const stackTopY = this.getStackTopY();
        
        // 如果堆叠区顶部接近或到达缓冲区底部，游戏结束
        // 留出一个单词的高度作为缓冲（50像素）
        if (stackTopY <= this.gameAreaTop + 50) {
            console.log('💀 堆叠区到达顶部，游戏结束！');
            console.log(`   堆叠区顶部Y: ${stackTopY}, 缓冲区底部Y: ${this.gameAreaTop}`);
            this.gameOver();
        }
    }

    gameOver() {
        this.stopSpeaking(); // 游戏结束时停止朗读
        this.gameState = 'gameOver';
        
        console.log('💀 游戏结束，堆叠区单词数:', this.stackedWords.length);
        
        // 确保堆叠区的单词都已添加到错词本
        // 注意：正常情况下单词在addToStack时已添加，这里是双重保险
        this.stackedWords.forEach(word => {
            this.vocabularyManager.addMissedWord(word);
        });
        
        console.log('📚 游戏结束后错词本统计:', this.vocabularyManager.getVocabularyStats());
        
        this.saveGameData(); // 保存最终数据
        this.showGameOverModal();
    }

    render() {
        // 清空画布
        this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
        
        // 绘制背景（统一深蓝底色）
        this.drawBackground();
        
        // 绘制缓冲区
        this.drawBufferZone();
        
        // 绘制堆叠单词
        this.drawStackedWords();
        
        // 绘制炮管（在单词之前，这样单词在上层）
        this.drawCannon();
        
        // 绘制下降单词
        this.drawFallingWords();
        
        // 绘制炮弹
        this.drawBullets();
        
        // 绘制爆炸效果
        this.drawExplosions();
        
        // 绘制炮口火花
        this.drawMuzzleFlashes();
        
        // 绘制中文翻译爆炸动画（在粒子之上）
        this.drawMeaningExplosions();
        
        // 绘制错误标记
        this.drawErrorMarks();
        
        // 绘制UI元素
        this.drawGameInfo();

        // 最顶层：半圆形基座覆盖层（确保遮挡炮管与基座相交处）
        this.drawBaseOverlay();
    }

    drawBackground() {
        // 主区域统一深蓝底色，避免上下色差
        this.ctx.fillStyle = '#0e1f3d';
        this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
        
        // 缓冲区背景
        this.ctx.fillStyle = 'rgba(255, 215, 0, 0.1)';
        this.ctx.fillRect(0, 0, this.canvasWidth, this.bufferHeight);
        
        // 分界线
        this.ctx.strokeStyle = '#ffd700';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.bufferHeight);
        this.ctx.lineTo(this.canvasWidth, this.bufferHeight);
        this.ctx.stroke();
    }

    drawBufferZone() {
        // 绘制缓冲区标题
        this.ctx.fillStyle = '#ffd700';
        this.ctx.font = '16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('单词准备区', this.canvasWidth / 2, 25);
        
        // 绘制下一个单词
        if (this.nextWord && this.bufferState === 'countdown') {
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '28px Arial';  // 从24px增加到28px
            this.ctx.fillText(this.nextWord.display, this.canvasWidth / 2, 55);
        }
    }

    drawFallingWords() {
        this.fallingWords.forEach(word => {
            // 单词背景
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            this.ctx.fillRect(word.x - word.width/2, word.y, word.width, word.height);
            
            // 单词边框 - 根据输入正确性改变颜色
            if (word.inputCorrect === false) {
                this.ctx.strokeStyle = '#ff4444'; // 错误输入红色
            } else if (word.inputCorrect === true) {
                this.ctx.strokeStyle = '#44ff44'; // 正确输入绿色
            } else {
                this.ctx.strokeStyle = '#ffd700'; // 默认金色
            }
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(word.x - word.width/2, word.y, word.width, word.height);
            
            // 显示单词文本 - 使用实时显示或原始显示
            const displayText = word.realTimeDisplay || word.display;
            this.drawWordWithHighlight(displayText, word.x, word.y + 25, word);
        });
    }

    drawWordWithHighlight(text, x, y, word) {
        this.ctx.font = '32px Arial';  // 从20px增加到32px，更醒目
        this.ctx.textAlign = 'center';
        
        // 获取重音音节位置
        const stressPositions = word.stressPositions || [];
        
        // 如果有实时显示，需要特殊处理高亮
        if (word.realTimeDisplay) {
            // 解析带有[]的文本
            const parts = text.split(/(\[[^\]]*\])/);
            let currentX = x - (this.ctx.measureText(text.replace(/[\[\]]/g, '')).width / 2);
            let charIndex = 0; // 跟踪原始单词中的字符位置
            
            parts.forEach(part => {
                if (part.startsWith('[') && part.endsWith(']')) {
                    // 输入的字母，绿色或红色高亮
                    const letter = part.slice(1, -1);
                    this.ctx.fillStyle = word.inputCorrect ? '#44ff44' : '#ff4444';
                    this.ctx.fillText(letter, currentX + this.ctx.measureText(letter).width/2, y);
                    currentX += this.ctx.measureText(letter).width;
                    charIndex++;
                } else {
                    // 普通字母或下划线 - 需要考虑重音音节
                    this.drawTextWithStress(part, currentX, y, charIndex, stressPositions, false);
                    currentX += this.ctx.measureText(part).width;
                    charIndex += part.length;
                }
            });
        } else {
            // 普通显示 - 处理下划线和重音
            this.drawTextWithStress(text, x, y, 0, stressPositions, true);
        }
    }
    
    // 绘制带有重音高亮和自定义下划线的文本
    drawTextWithStress(text, x, y, startCharIndex, stressPositions, centered = false) {
        if (centered) {
            // 居中显示
            const totalWidth = this.measureTextWithCustomUnderlines(text);
            let currentX = x - totalWidth / 2;
            
            for (let i = 0; i < text.length; i++) {
                const char = text[i];
                const charIndex = startCharIndex + i;
                
                if (char === '_') {
                    this.drawCustomUnderscore(currentX, y);
                    currentX += this.getCustomUnderscoreWidth();
                } else {
                    // 检查是否是重音音节的字母
                    if (stressPositions.includes(charIndex)) {
                        this.ctx.fillStyle = '#ff4444'; // 重音音节用红色
                    } else {
                        this.ctx.fillStyle = '#ffffff'; // 普通字母用白色
                    }
                    this.ctx.fillText(char, currentX + this.ctx.measureText(char).width/2, y);
                    currentX += this.ctx.measureText(char).width;
                }
            }
        } else {
            // 左对齐显示
            let currentX = x;
            
            for (let i = 0; i < text.length; i++) {
                const char = text[i];
                const charIndex = startCharIndex + i;
                
                if (char === '_') {
                    this.drawCustomUnderscore(currentX, y);
                    currentX += this.getCustomUnderscoreWidth();
                } else {
                    // 检查是否是重音音节的字母
                    if (stressPositions.includes(charIndex)) {
                        this.ctx.fillStyle = '#ff4444'; // 重音音节用红色
                    } else {
                        this.ctx.fillStyle = '#ffffff'; // 普通字母用白色
                    }
                    this.ctx.fillText(char, currentX + this.ctx.measureText(char).width/2, y);
                    currentX += this.ctx.measureText(char).width;
                }
            }
        }
    }
    
    // 绘制带有自定义下划线的文本（保留向后兼容）
    drawTextWithCustomUnderlines(text, x, y, centered = false) {
        // 调用新的带重音的方法，但不传递重音位置
        this.drawTextWithStress(text, x, y, 0, [], centered);
    }
    
    // 绘制自定义下划线（缩短4像素）
    drawCustomUnderscore(x, y) {
        const underscoreWidth = this.ctx.measureText('_').width;
        const customWidth = underscoreWidth - 4; // 缩短4像素
        const startX = x + 2; // 左右各缩短2像素
        
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(startX, y + 5); // 下划线位置
        this.ctx.lineTo(startX + customWidth, y + 5);
        this.ctx.stroke();
    }
    
    // 获取自定义下划线的宽度
    getCustomUnderscoreWidth() {
        return this.ctx.measureText('_').width; // 保持原始字符宽度，只是绘制时缩短
    }
    
    // 测量包含自定义下划线的文本宽度
    measureTextWithCustomUnderlines(text) {
        let totalWidth = 0;
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            if (char === '_') {
                totalWidth += this.getCustomUnderscoreWidth();
            } else {
                totalWidth += this.ctx.measureText(char).width;
            }
        }
        return totalWidth;
    }


    drawStackedWords() {
        // 按设计方案显示堆叠单词：每行多个单词，从底部向上堆叠
        const wordsPerRow = 5; // 每行5个单词
        const wordWidth = 110;  // 调整为110px，确保5个单词能放下
        const wordHeight = 50;  // 保持50px高度
        const padding = 5;      // 减小边距
        
        // 添加调试信息：只在堆叠区数量变化时输出
        if (this.stackedWords.length > 0 && this._lastStackedWordsCount !== this.stackedWords.length) {
            this._lastStackedWordsCount = this.stackedWords.length;
            debugLog.info(`🎨 渲染堆叠区: ${this.stackedWords.length}个单词 [${this.stackedWords.map(w => w.original).join(', ')}]`);
        }
        
        this.stackedWords.forEach((word, index) => {
            // 验证单词对象
            if (!word) {
                debugLog.error(`❌ 堆叠区发现空对象，索引: ${index}`);
                return;
            }
            
            if (!word.original) {
                debugLog.error(`❌ 堆叠区单词缺少original属性，索引: ${index}`);
                debugLog.error(`   完整对象: ${JSON.stringify(word, null, 2)}`);
                return;
            }
            
            const row = Math.floor(index / wordsPerRow);
            const col = index % wordsPerRow;
            const x = padding + col * (wordWidth + 5);
            const y = this.canvasHeight - wordHeight - row * (wordHeight + 2);
            
            // 单词背景 - 根据类型显示不同颜色
            if (word.giveUp) {
                // 放弃的单词 - 深灰色
                this.ctx.fillStyle = 'rgba(96, 96, 96, 0.9)';
                this.ctx.strokeStyle = '#555555';
            } else {
                // 失败的单词 - 浅灰色
                this.ctx.fillStyle = 'rgba(128, 128, 128, 0.9)';
                this.ctx.strokeStyle = '#666666';
            }
            this.ctx.fillRect(x, y, wordWidth, wordHeight);
            
            // 单词边框
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(x, y, wordWidth, wordHeight);
            
            // 单词文本 - 字体放大一倍
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '28px Arial';  // 放大一倍：14px -> 28px
            this.ctx.textAlign = 'center';
            this.ctx.fillText(word.original, x + wordWidth/2, y + wordHeight/2 + 10);
            
            // 显示中文意思（小字）- 字体放大一倍
            this.ctx.fillStyle = '#87CEEB';  // 淡蓝色 (Sky Blue)
            this.ctx.font = '20px Arial';  // 放大一倍：10px -> 20px
            this.ctx.fillText(word.meaning || '', x + wordWidth/2, y + wordHeight - 6);
        });
    }

    drawCannon() {
        // 炮管在游戏进行时始终显示
        if (this.gameState !== 'playing' && this.gameState !== 'review') return;
        
        // 更新后坐力（逐渐衰减）
        if (this.cannon.recoil > 0) {
            this.cannon.recoil *= (1 - this.cannon.recoilDecay);
            if (this.cannon.recoil < 0.1) {
                this.cannon.recoil = 0;
            }
        }
        
        this.ctx.save();
        this.ctx.translate(this.cannon.x, this.cannon.y);
        
        // === 卡通风格木质大炮（堡垒基座设计） ===
        
        // 1. 绘制半圆形堡垒基座（保持水平，不受后坐力影响）
        this.ctx.save();
        
        // 基座阴影
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        this.ctx.beginPath();
        this.ctx.arc(0, 25, 62, Math.PI, 0);
        this.ctx.closePath();
        this.ctx.fill();
        
        // 半圆主体（石质渐变）
        const baseGradient = this.ctx.createRadialGradient(0, 25, 0, 0, 25, 60);
        baseGradient.addColorStop(0, '#8B8D8F');
        baseGradient.addColorStop(0.3, '#7F8C8D');
        baseGradient.addColorStop(0.6, '#6C7A7E');
        baseGradient.addColorStop(1, '#5D6D7E');
        this.ctx.fillStyle = baseGradient;
        this.ctx.beginPath();
        this.ctx.arc(0, 25, 60, Math.PI, 0);
        this.ctx.closePath();
        this.ctx.fill();
        
        // 石头不规则质感
        this.ctx.save();
        this.ctx.globalAlpha = 0.3;
        const stonePatterns = [
            { x: -40, y: 8, size: 12, darkness: 0.2 },
            { x: -25, y: 5, size: 10, darkness: 0.15 },
            { x: -10, y: 7, size: 14, darkness: 0.25 },
            { x: 8, y: 10, size: 11, darkness: 0.18 },
            { x: 28, y: 6, size: 13, darkness: 0.22 },
            { x: 45, y: 12, size: 10, darkness: 0.2 },
            { x: -30, y: 15, size: 8, darkness: 0.15 },
            { x: 18, y: 17, size: 9, darkness: 0.17 },
            { x: -48, y: 18, size: 10, darkness: 0.19 },
            { x: 38, y: 20, size: 11, darkness: 0.21 }
        ];
        stonePatterns.forEach(s => {
            const d = Math.sqrt(s.x * s.x + (s.y - 25) * (s.y - 25));
            if (d < 55 && s.y < 25) {
                this.ctx.fillStyle = `rgba(0,0,0,${s.darkness})`;
                this.ctx.beginPath();
                this.ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.fillStyle = `rgba(255,255,255,${s.darkness * 0.5})`;
                this.ctx.beginPath();
                this.ctx.arc(s.x - s.size * 0.3, s.y - s.size * 0.3, s.size * 0.4, 0, Math.PI * 2);
                this.ctx.fill();
            }
        });
        this.ctx.restore();

        // 12. 顶层基座覆盖层（使用半圆剪裁 + 实心重绘，强制覆盖相交处）
        this.ctx.save();
        this.ctx.translate(this.cannon.x, this.cannon.y);
        // 12.1 半圆剪裁区域
        this.ctx.beginPath();
        this.ctx.arc(0, 23, 61, Math.PI, 0);
        this.ctx.lineTo(61, 23);
        this.ctx.lineTo(-61, 23);
        this.ctx.closePath();
        this.ctx.clip();
        // 12.2 在剪裁内进行完全不透明的重绘（确保覆盖）
        this.ctx.globalAlpha = 1;
        // 阴影
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        this.ctx.beginPath();
        this.ctx.arc(0, 23, 63, Math.PI, 0);
        this.ctx.closePath();
        this.ctx.fill();
        // 主体
        const coverGrad = this.ctx.createRadialGradient(0, 23, 0, 0, 23, 61);
        coverGrad.addColorStop(0, '#8B8D8F');
        coverGrad.addColorStop(0.3, '#7F8C8D');
        coverGrad.addColorStop(0.6, '#6C7A7E');
        coverGrad.addColorStop(1, '#5D6D7E');
        this.ctx.fillStyle = coverGrad;
        this.ctx.beginPath();
        this.ctx.arc(0, 23, 61, Math.PI, 0);
        this.ctx.closePath();
        this.ctx.fill();
        // 石块纹理
        this.ctx.save();
        this.ctx.globalAlpha = 0.3;
        const stonesTop = [
            { x: -40, y: 8, size: 12, darkness: 0.2 },
            { x: -25, y: 5, size: 10, darkness: 0.15 },
            { x: -10, y: 7, size: 14, darkness: 0.25 },
            { x: 8, y: 10, size: 11, darkness: 0.18 },
            { x: 28, y: 6, size: 13, darkness: 0.22 },
            { x: 45, y: 12, size: 10, darkness: 0.2 }
        ];
        stonesTop.forEach(s => {
            const d = Math.sqrt(s.x * s.x + (s.y - 23) * (s.y - 23));
            if (d < 56 && s.y < 23) {
                this.ctx.fillStyle = `rgba(0,0,0,${s.darkness})`;
                this.ctx.beginPath();
                this.ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.fillStyle = `rgba(255,255,255,${s.darkness * 0.5})`;
                this.ctx.beginPath();
                this.ctx.arc(s.x - s.size * 0.3, s.y - s.size * 0.3, s.size * 0.4, 0, Math.PI * 2);
                this.ctx.fill();
            }
        });
        this.ctx.restore();
        // 裂纹
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
        this.ctx.lineWidth = 1.5;
        this.ctx.lineCap = 'round';
        const cracksTop = [
            [{ x: -48, y: 10 }, { x: -35, y: 8 }, { x: -22, y: 9 }],
            [{ x: 3, y: 6 }, { x: 15, y: 8 }, { x: 25, y: 7 }]
        ];
        cracksTop.forEach(c => {
            this.ctx.beginPath();
            this.ctx.moveTo(c[0].x, c[0].y);
            for (let i = 1; i < c.length; i++) this.ctx.lineTo(c[i].x, c[i].y);
            this.ctx.stroke();
        });
        // 顶缘描边（在剪裁内绘制）
        this.ctx.strokeStyle = '#2C3E50';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.arc(0, 23, 61, Math.PI, 0);
        this.ctx.stroke();
        this.ctx.restore();
        
        // 裂纹
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
        this.ctx.lineWidth = 1.5;
        this.ctx.lineCap = 'round';
        const cracks = [
            [{ x: -48, y: 12 }, { x: -35, y: 10 }, { x: -22, y: 11 }],
            [{ x: -28, y: 6 }, { x: -18, y: 8 }, { x: -8, y: 7 }],
            [{ x: 3, y: 8 }, { x: 15, y: 10 }, { x: 25, y: 9 }],
            [{ x: 32, y: 13 }, { x: 42, y: 11 }, { x: 52, y: 15 }],
            [{ x: -38, y: 18 }, { x: -28, y: 20 }, { x: -18, y: 19 }],
            [{ x: 12, y: 16 }, { x: 22, y: 18 }, { x: 32, y: 20 }]
        ];
        cracks.forEach(c => {
            this.ctx.beginPath();
            this.ctx.moveTo(c[0].x, c[0].y);
            for (let i = 1; i < c.length; i++) this.ctx.lineTo(c[i].x, c[i].y);
            this.ctx.stroke();
        });
        
        // 底部平面 + 阴影 + 顶缘描边
        this.ctx.fillStyle = '#4A5A5E';
        this.ctx.fillRect(-60, 25, 120, 6);
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.fillRect(-60, 25, 120, 2);
        this.ctx.strokeStyle = '#2C3E50';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.arc(0, 25, 60, Math.PI, 0);
        this.ctx.stroke();
        this.ctx.restore();
        
        // 应用炮管旋转和后坐力（基座不受影响）
        this.ctx.rotate(this.cannon.angle);
        if (this.cannon.recoil > 0) {
            this.ctx.translate(0, this.cannon.recoil);
        }
        
        // 2. 绘制木质支架（V形支撑）
        this.ctx.fillStyle = '#A0522D';
        // 左支架
        this.ctx.beginPath();
        this.ctx.moveTo(-20, -5);
        this.ctx.lineTo(-15, -25);
        this.ctx.lineTo(-10, -25);
        this.ctx.lineTo(-15, -5);
        this.ctx.closePath();
        this.ctx.fill();
        
        // 右支架
        this.ctx.beginPath();
        this.ctx.moveTo(20, -5);
        this.ctx.lineTo(15, -25);
        this.ctx.lineTo(10, -25);
        this.ctx.lineTo(15, -5);
        this.ctx.closePath();
        this.ctx.fill();
        
        // 支架高光
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        this.ctx.beginPath();
        this.ctx.moveTo(-20, -5);
        this.ctx.lineTo(-17, -25);
        this.ctx.lineTo(-15, -25);
        this.ctx.lineTo(-18, -5);
        this.ctx.closePath();
        this.ctx.fill();
        
        // 3. 绘制金属炮管（深灰色，分段设计）
        // 炮管后段（粗）
        const barrelGradient1 = this.ctx.createLinearGradient(-15, 0, 15, 0);
        barrelGradient1.addColorStop(0, '#2C3E50');
        barrelGradient1.addColorStop(0.3, '#34495E');
        barrelGradient1.addColorStop(0.5, '#4A5F7F');
        barrelGradient1.addColorStop(0.7, '#34495E');
        barrelGradient1.addColorStop(1, '#2C3E50');
        this.ctx.fillStyle = barrelGradient1;
        this.drawRoundedRect(-15, -50, 30, 30, 4);
        this.ctx.fill();
        
        // 炮管中段（略细）
        const barrelGradient2 = this.ctx.createLinearGradient(-13, 0, 13, 0);
        barrelGradient2.addColorStop(0, '#34495E');
        barrelGradient2.addColorStop(0.5, '#4A5F7F');
        barrelGradient2.addColorStop(1, '#34495E');
        this.ctx.fillStyle = barrelGradient2;
        this.drawRoundedRect(-13, -75, 26, 30, 3);
        this.ctx.fill();
        
        // 炮管前段（细长）
        const barrelGradient3 = this.ctx.createLinearGradient(-11, 0, 11, 0);
        barrelGradient3.addColorStop(0, '#2C3E50');
        barrelGradient3.addColorStop(0.5, '#34495E');
        barrelGradient3.addColorStop(1, '#2C3E50');
        this.ctx.fillStyle = barrelGradient3;
        this.drawRoundedRect(-11, -105, 22, 35, 3);
        this.ctx.fill();
        
        // 炮管高光（左侧）
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        this.drawRoundedRect(-15, -50, 5, 30, 2);
        this.ctx.fill();
        this.drawRoundedRect(-13, -75, 5, 30, 2);
        this.ctx.fill();
        this.drawRoundedRect(-11, -105, 4, 35, 2);
        this.ctx.fill();
        
        // 炮管阴影（右侧）
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.drawRoundedRect(10, -50, 5, 30, 2);
        this.ctx.fill();
        this.drawRoundedRect(8, -75, 5, 30, 2);
        this.ctx.fill();
        this.drawRoundedRect(7, -105, 4, 35, 2);
        this.ctx.fill();
        
        // 5. 绘制炮管分段装饰环
        this.ctx.strokeStyle = '#1A252F';
        this.ctx.lineWidth = 3;
        [-48, -73, -98].forEach(y => {
            this.ctx.beginPath();
            this.ctx.moveTo(-15, y);
            this.ctx.lineTo(15, y);
            this.ctx.stroke();
        });
        
        // 6. 绘制炮口（粗圆柱体设计）
        // 炮口圆柱体（比炮身粗）
        const muzzleCylinderGradient = this.ctx.createLinearGradient(-18, 0, 18, 0);
        muzzleCylinderGradient.addColorStop(0, '#1A252F');
        muzzleCylinderGradient.addColorStop(0.3, '#2C3E50');
        muzzleCylinderGradient.addColorStop(0.5, '#4A5F7F');
        muzzleCylinderGradient.addColorStop(0.7, '#2C3E50');
        muzzleCylinderGradient.addColorStop(1, '#1A252F');
        this.ctx.fillStyle = muzzleCylinderGradient;
        this.drawRoundedRect(-18, -118, 36, 13, 2);
        this.ctx.fill();
        
        // 炮口圆柱体边缘环（蓝色装饰）
        this.ctx.strokeStyle = '#3498DB';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(-18, -106);
        this.ctx.lineTo(18, -106);
        this.ctx.stroke();
        
        // 炮口圆柱体高光
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        this.drawRoundedRect(-18, -118, 6, 13, 2);
        this.ctx.fill();
        
        // 7. 绘制金属铆钉装饰
        this.ctx.fillStyle = '#1A252F';
        [-45, -35, -70, -60, -95, -85].forEach(y => {
            // 左侧铆钉
            this.ctx.beginPath();
            this.ctx.arc(-12, y, 2.5, 0, Math.PI * 2);
            this.ctx.fill();
            // 右侧铆钉
            this.ctx.beginPath();
            this.ctx.arc(12, y, 2.5, 0, Math.PI * 2);
            this.ctx.fill();
        });
        
        // 铆钉高光
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        [-45, -35, -70, -60, -95, -85].forEach(y => {
            this.ctx.beginPath();
            this.ctx.arc(-13, y - 1, 1, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.beginPath();
            this.ctx.arc(11, y - 1, 1, 0, Math.PI * 2);
            this.ctx.fill();
        });
        
        // 8. 绘制底座装饰（金属扣件）
        this.ctx.fillStyle = '#34495E';
        this.ctx.fillRect(-8, -12, 16, 8);
        this.ctx.strokeStyle = '#1A252F';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(-8, -12, 16, 8);
        
        // 9. 燃烧引信效果（绳子摆动版）
        if (this.fallingWords.length > 0) {
            // 更新引信摆动物理
            // 计算重力对引信的影响（总是向下）
            const cannonAngle = this.cannon.angle;
            const worldDownAngle = Math.PI / 2; // 世界坐标系向下 = 90度
            
            // 引信在炮管坐标系中的目标角度（受重力影响）
            // 当炮管向上时，引信应该垂直向下
            // 需要将世界坐标的重力转换到炮管坐标系
            const targetAngle = worldDownAngle - cannonAngle;
            
            // 角加速度 = 重力扭矩
            const angleAccel = Math.sin(targetAngle - this.fuse.angle) * this.fuse.gravity;
            this.fuse.angleVelocity += angleAccel;
            this.fuse.angleVelocity *= this.fuse.damping; // 阻尼
            this.fuse.angle += this.fuse.angleVelocity;
            
            // 计算引信末端位置（在炮管坐标系中）
            const fuseAttachX = this.fuse.attachX;
            const fuseAttachY = this.fuse.attachY;
            const fuseEndX = fuseAttachX + Math.sin(this.fuse.angle) * this.fuse.length;
            const fuseEndY = fuseAttachY + Math.cos(this.fuse.angle) * this.fuse.length;
            
            // 绘制引信绳子（深棕色线条）
            this.ctx.strokeStyle = '#3E2723';
            this.ctx.lineWidth = 2;
            this.ctx.lineCap = 'round';
            this.ctx.beginPath();
            this.ctx.moveTo(fuseAttachX, fuseAttachY);
            this.ctx.lineTo(fuseEndX, fuseEndY);
            this.ctx.stroke();
            
            // 引信末端燃烧点（橙色发光）
            const glowGradient = this.ctx.createRadialGradient(fuseEndX, fuseEndY, 0, fuseEndX, fuseEndY, 6);
            glowGradient.addColorStop(0, '#FFC800');
            glowGradient.addColorStop(0.4, '#FF6400');
            glowGradient.addColorStop(1, 'rgba(255, 100, 0, 0)');
            this.ctx.fillStyle = glowGradient;
            this.ctx.beginPath();
            this.ctx.arc(fuseEndX, fuseEndY, 5, 0, Math.PI * 2);
            this.ctx.fill();
            
            // 引信末端亮核（闪烁效果）
            const time = Date.now();
            const flicker = 0.7 + Math.sin(time * 0.01) * 0.3;
            this.ctx.fillStyle = `rgba(255, 255, 200, ${flicker})`;
            this.ctx.beginPath();
            this.ctx.arc(fuseEndX, fuseEndY, 2, 0, Math.PI * 2);
            this.ctx.fill();
            
            // 计算火焰方向（沿引信延伸方向）
            const fuseDirection = this.fuse.angle;
            const flameVx = Math.sin(fuseDirection);
            const flameVy = Math.cos(fuseDirection);
            
            // 生成燃烧粒子（沿引信方向）
            if (Math.random() < 0.4) {
                const spreadAngle = (Math.random() - 0.5) * 0.5; // ±15度扩散
                const vx = flameVx * (1.5 + Math.random() * 1) * Math.cos(spreadAngle);
                const vy = flameVy * (1.5 + Math.random() * 1) * Math.sin(spreadAngle);
                
                this.fuseParticles.push({
                    x: fuseEndX + (Math.random() - 0.5) * 2,
                    y: fuseEndY + (Math.random() - 0.5) * 2,
                    vx: vx,
                    vy: vy,
                    life: 1.0,
                    size: 1.5 + Math.random() * 1.5,
                    color: Math.random() > 0.5 ? '#FFC800' : '#FF6400'
                });
            }
            
            // 偶尔生成火花（沿引信方向飞溅）
            if (Math.random() < 0.05) {
                const sparkAngle = fuseDirection + (Math.random() - 0.5) * 1;
                const sparkSpeed = 2 + Math.random() * 2;
                
                this.fuseParticles.push({
                    x: fuseEndX,
                    y: fuseEndY,
                    vx: Math.sin(sparkAngle) * sparkSpeed,
                    vy: Math.cos(sparkAngle) * sparkSpeed,
                    life: 1.0,
                    size: 1 + Math.random(),
                    color: '#FFFFC8',
                    isSpark: true
                });
            }
            
            // 绘制燃烧粒子
            this.fuseParticles.forEach(particle => {
                this.ctx.save();
                this.ctx.globalAlpha = particle.life;
                
                if (particle.isSpark) {
                    // 火花：亮黄色点
                    this.ctx.fillStyle = particle.color;
                    this.ctx.beginPath();
                    this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                    this.ctx.fill();
                } else {
                    // 火焰：发光圆点
                    const pGradient = this.ctx.createRadialGradient(
                        particle.x, particle.y, 0,
                        particle.x, particle.y, particle.size
                    );
                    pGradient.addColorStop(0, particle.color);
                    pGradient.addColorStop(1, 'rgba(255, 100, 0, 0)');
                    this.ctx.fillStyle = pGradient;
                    this.ctx.beginPath();
                    this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                    this.ctx.fill();
                }
                
                this.ctx.restore();
            });
            
            // 更新粒子状态
            this.fuseParticles = this.fuseParticles.filter(particle => {
                particle.x += particle.vx;
                particle.y += particle.vy;
                particle.vy += 0.05; // 轻微重力
                particle.life -= 0.02;
                return particle.life > 0;
            });
        }
        
        // 10. 绘制炮台基座（最后绘制，遮挡相交部分）
        // 在绘制前，先用“擦除合成”清理相交区域内的炮管像素，避免任何锯齿边缘渗透
        (function () {
            const prevOp = this.ctx.globalCompositeOperation;
            this.ctx.globalCompositeOperation = 'destination-out';
            this.ctx.beginPath();
            // 擦除区域：略大于平台顶部的椭圆，确保覆盖交界的所有角度
            this.ctx.ellipse(0, -20, 27, 10, 0, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.globalCompositeOperation = prevOp;
        }).call(this);

        // 炮台底部（圆柱形，向上移动覆盖炮管底部）
        const platformGradient = this.ctx.createLinearGradient(-25, 0, 25, 0);
        platformGradient.addColorStop(0, '#5D6D7E');
        platformGradient.addColorStop(0.5, '#7F8C8D');
        platformGradient.addColorStop(1, '#5D6D7E');
        this.ctx.fillStyle = platformGradient;
        this.ctx.fillRect(-25, -20, 50, 20); // 从-20到0，高度20px
        
        // 炮台顶部椭圆（上移到-20位置）
        const topGradient = this.ctx.createRadialGradient(0, -20, 0, 0, -20, 25);
        topGradient.addColorStop(0, '#95A5A6');
        topGradient.addColorStop(1, '#7F8C8D');
        this.ctx.fillStyle = topGradient;
        // 确保使用普通覆盖模式，完全遮挡下面的炮管
        const prevOp = this.ctx.globalCompositeOperation;
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.beginPath();
        this.ctx.ellipse(0, -20, 25, 8, 0, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.globalCompositeOperation = prevOp;
        
        // 炮台装饰环（覆盖式描边）
        const prevOp2 = this.ctx.globalCompositeOperation;
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.strokeStyle = '#34495E';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.ellipse(0, -20, 23, 7, 0, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.globalCompositeOperation = prevOp2;
        
        // 炮台高光
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        this.ctx.fillRect(-25, -20, 8, 20);
        this.ctx.beginPath();
        this.ctx.ellipse(-8, -20, 10, 4, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // 11. （移除移动半圆基座）不再在末尾绘制半圆基座，避免跟随炮管移动
        /* this.ctx.save();
        
        // 基座阴影
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        this.ctx.beginPath();
        this.ctx.arc(0, 25, 62, Math.PI, 0);
        this.ctx.closePath();
        this.ctx.fill();
        
        // 半圆主体（石质渐变）
        const baseGradient2 = this.ctx.createRadialGradient(0, 25, 0, 0, 25, 60);
        baseGradient2.addColorStop(0, '#8B8D8F');
        baseGradient2.addColorStop(0.3, '#7F8C8D');
        baseGradient2.addColorStop(0.6, '#6C7A7E');
        baseGradient2.addColorStop(1, '#5D6D7E');
        this.ctx.fillStyle = baseGradient2;
        this.ctx.beginPath();
        this.ctx.arc(0, 25, 60, Math.PI, 0);
        this.ctx.closePath();
        this.ctx.fill();
        
        // 石块纹理
        this.ctx.save();
        this.ctx.globalAlpha = 0.3;
        const stones = [
            { x: -40, y: 8, size: 12, darkness: 0.2 },
            { x: -25, y: 5, size: 10, darkness: 0.15 },
            { x: -10, y: 7, size: 14, darkness: 0.25 },
            { x: 8, y: 10, size: 11, darkness: 0.18 },
            { x: 28, y: 6, size: 13, darkness: 0.22 },
            { x: 45, y: 12, size: 10, darkness: 0.2 },
            { x: -30, y: 15, size: 8, darkness: 0.15 },
            { x: 18, y: 17, size: 9, darkness: 0.17 },
            { x: -48, y: 18, size: 10, darkness: 0.19 },
            { x: 38, y: 20, size: 11, darkness: 0.21 }
        ];
        stones.forEach(s => {
            const d = Math.sqrt(s.x * s.x + (s.y - 25) * (s.y - 25));
            if (d < 55 && s.y < 25) {
                this.ctx.fillStyle = `rgba(0,0,0,${s.darkness})`;
                this.ctx.beginPath();
                this.ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.fillStyle = `rgba(255,255,255,${s.darkness * 0.5})`;
                this.ctx.beginPath();
                this.ctx.arc(s.x - s.size * 0.3, s.y - s.size * 0.3, s.size * 0.4, 0, Math.PI * 2);
                this.ctx.fill();
            }
        });
        this.ctx.restore();
        
        // 裂纹
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
        this.ctx.lineWidth = 1.5;
        this.ctx.lineCap = 'round';
        const cracks2 = [
            [{ x: -48, y: 12 }, { x: -35, y: 10 }, { x: -22, y: 11 }],
            [{ x: -28, y: 6 }, { x: -18, y: 8 }, { x: -8, y: 7 }],
            [{ x: 3, y: 8 }, { x: 15, y: 10 }, { x: 25, y: 9 }],
            [{ x: 32, y: 13 }, { x: 42, y: 11 }, { x: 52, y: 15 }],
            [{ x: -38, y: 18 }, { x: -28, y: 20 }, { x: -18, y: 19 }],
            [{ x: 12, y: 16 }, { x: 22, y: 18 }, { x: 32, y: 20 }]
        ];
        cracks2.forEach(c => {
            this.ctx.beginPath();
            this.ctx.moveTo(c[0].x, c[0].y);
            for (let i = 1; i < c.length; i++) this.ctx.lineTo(c[i].x, c[i].y);
            this.ctx.stroke();
        });
        
        // 底部平面 + 阴影 + 顶缘描边
        this.ctx.fillStyle = '#4A5A5E';
        this.ctx.fillRect(-60, 25, 120, 6);
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.fillRect(-60, 25, 120, 2);
        this.ctx.strokeStyle = '#2C3E50';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.arc(0, 25, 60, Math.PI, 0);
        this.ctx.stroke();
        this.ctx.restore(); */
        
        this.ctx.restore();
    }
    
    // 辅助方法：绘制圆角矩形
    drawRoundedRect(x, y, width, height, radius) {
        this.ctx.beginPath();
        this.ctx.moveTo(x + radius, y);
        this.ctx.lineTo(x + width - radius, y);
        this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        this.ctx.lineTo(x + width, y + height - radius);
        this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        this.ctx.lineTo(x + radius, y + height);
        this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        this.ctx.lineTo(x, y + radius);
        this.ctx.quadraticCurveTo(x, y, x + radius, y);
        this.ctx.closePath();
    }

    // 生成炮塔基座纹理（静态，只在初始化时生成一次）
    generateBaseTexture() {
        const texture = {
            scratches: [], // 划痕数据
            rustSpots: [], // 锈迹数据
            rivets: [      // 铆钉位置
                { angle: Math.PI * 0.3, radius: 50 },
                { angle: Math.PI * 0.5, radius: 50 },
                { angle: Math.PI * 0.7, radius: 50 },
                { angle: Math.PI * 0.2, radius: 35 },
                { angle: Math.PI * 0.8, radius: 35 }
            ],
            shineStripes: [] // 光泽条纹数据
        };
        
        // 生成50条随机划痕
        for (let i = 0; i < 50; i++) {
            const angle = Math.PI + Math.random() * Math.PI;
            const radius = 10 + Math.random() * 50;
            const x = Math.cos(angle) * radius;
            const y = 23 + Math.sin(angle) * radius;
            
            const scratchLength = 5 + Math.random() * 15;
            const scratchAngle = Math.random() * Math.PI * 2;
            const scratchEndX = x + Math.cos(scratchAngle) * scratchLength;
            const scratchEndY = y + Math.sin(scratchAngle) * scratchLength;
            
            texture.scratches.push({
                startX: x,
                startY: y,
                endX: scratchEndX,
                endY: scratchEndY,
                color: Math.random() > 0.5 ? '#9BA5A8' : '#3A3C3E',
                width: 0.5 + Math.random() * 1
            });
        }
        
        // 生成15个锈迹斑点
        for (let i = 0; i < 15; i++) {
            const angle = Math.PI + Math.random() * Math.PI;
            const radius = 15 + Math.random() * 45;
            const x = Math.cos(angle) * radius;
            const y = 23 + Math.sin(angle) * radius;
            
            texture.rustSpots.push({
                x: x,
                y: y,
                radius: 1 + Math.random() * 3
            });
        }
        
        // 生成3条光泽条纹数据
        for (let i = 0; i < 3; i++) {
            const angle = Math.PI * (0.3 + i * 0.2);
            const radius1 = 20;
            const radius2 = 55;
            
            texture.shineStripes.push({
                x1: Math.cos(angle) * radius1,
                y1: 23 + Math.sin(angle) * radius1,
                x2: Math.cos(angle) * radius2,
                y2: 23 + Math.sin(angle) * radius2
            });
        }
        
        return texture;
    }

    // 顶层半圆基座覆盖：统一在render()末尾调用，避免被后续内容再覆盖
    drawBaseOverlay() {
        // 仅在playing/review时显示
        if (this.gameState !== 'playing' && this.gameState !== 'review') return;
        this.ctx.save();
        // 不要继承任何旋转/后坐力：仅定位
        this.ctx.translate(this.cannon.x, this.cannon.y);

        // 剪裁半圆区域
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.arc(0, 23, 61, Math.PI, 0);
        this.ctx.lineTo(61, 23);
        this.ctx.lineTo(-61, 23);
        this.ctx.closePath();
        this.ctx.clip();

        // 在剪裁内完全重绘半圆（不透明）
        // 阴影
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        this.ctx.beginPath();
        this.ctx.arc(0, 23, 63, Math.PI, 0);
        this.ctx.closePath();
        this.ctx.fill();
        
        // 主体渐变（深色金属底色）
        const grad = this.ctx.createRadialGradient(0, 23, 0, 0, 23, 61);
        grad.addColorStop(0, '#6B6D6F');
        grad.addColorStop(0.3, '#5F6C6D');
        grad.addColorStop(0.6, '#4C5A5E');
        grad.addColorStop(1, '#3D4D5E');
        this.ctx.fillStyle = grad;
        this.ctx.beginPath();
        this.ctx.arc(0, 23, 61, Math.PI, 0);
        this.ctx.closePath();
        this.ctx.fill();
        
        // === 铁皮纹理效果（使用预生成的静态纹理）===
        // 1. 绘制不规则铁皮划痕
        this.ctx.globalAlpha = 0.15;
        this.baseTexture.scratches.forEach(scratch => {
            this.ctx.strokeStyle = scratch.color;
            this.ctx.lineWidth = scratch.width;
            this.ctx.beginPath();
            this.ctx.moveTo(scratch.startX, scratch.startY);
            this.ctx.lineTo(scratch.endX, scratch.endY);
            this.ctx.stroke();
        });
        this.ctx.globalAlpha = 1;
        
        // 2. 绘制金属锈迹斑点
        this.ctx.globalAlpha = 0.2;
        this.ctx.fillStyle = '#8B4513';
        this.baseTexture.rustSpots.forEach(spot => {
            this.ctx.beginPath();
            this.ctx.arc(spot.x, spot.y, spot.radius, 0, Math.PI * 2);
            this.ctx.fill();
        });
        this.ctx.globalAlpha = 1;
        
        // 3. 绘制铆钉效果
        this.baseTexture.rivets.forEach(rivet => {
            const x = Math.cos(rivet.angle) * rivet.radius;
            const y = 23 + Math.sin(rivet.angle) * rivet.radius;
            
            // 铆钉阴影
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            this.ctx.beginPath();
            this.ctx.arc(x + 1, y + 1, 4, 0, Math.PI * 2);
            this.ctx.fill();
            
            // 铆钉主体
            const rivetGrad = this.ctx.createRadialGradient(x - 1, y - 1, 0, x, y, 4);
            rivetGrad.addColorStop(0, '#A8B0B3');
            rivetGrad.addColorStop(0.5, '#7A8288');
            rivetGrad.addColorStop(1, '#5A6268');
            this.ctx.fillStyle = rivetGrad;
            this.ctx.beginPath();
            this.ctx.arc(x, y, 4, 0, Math.PI * 2);
            this.ctx.fill();
            
            // 铆钉高光
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            this.ctx.beginPath();
            this.ctx.arc(x - 1.5, y - 1.5, 1.5, 0, Math.PI * 2);
            this.ctx.fill();
        });
        
        // 4. 绘制金属光泽条纹
        this.ctx.globalAlpha = 0.1;
        this.baseTexture.shineStripes.forEach(stripe => {
            const shineGrad = this.ctx.createLinearGradient(stripe.x1, stripe.y1, stripe.x2, stripe.y2);
            shineGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
            shineGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.6)');
            shineGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
            
            this.ctx.strokeStyle = shineGrad;
            this.ctx.lineWidth = 8;
            this.ctx.beginPath();
            this.ctx.moveTo(stripe.x1, stripe.y1);
            this.ctx.lineTo(stripe.x2, stripe.y2);
            this.ctx.stroke();
        });
        this.ctx.globalAlpha = 1;
        
        // 顶缘描边（加强深色边缘）
        this.ctx.strokeStyle = '#1C2C3E';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.arc(0, 23, 61, Math.PI, 0);
        this.ctx.stroke();
        
        this.ctx.restore();
        
        this.ctx.restore();
    }
    
    // 更新炮管瞄准角度（在updateGame中调用）
    updateCannonAngle() {
        if (this.gameState !== 'playing' && this.gameState !== 'review') {
            // debugLog.info(`⚠️ 炮管更新跳过: gameState=${this.gameState}`);
            return;
        }
        
        // 更新炮管瞄准角度
        if (this.fallingWords.length > 0) {
            const targetWord = this.fallingWords[0];
            const dx = targetWord.x - this.cannon.x;
            const dy = targetWord.y - this.cannon.y;
            
            // 【最终修复】正确计算目标角度
            // Canvas 坐标系：Y轴向下为正，rotate() 逆时针为正
            // 炮管默认指向上方（-Y方向），对应 rotate(0)
            // 
            // 目标：让炮管指向目标单词
            // - 炮管在底部 (cannon.y 大，例如 700)
            // - 目标在上方 (targetWord.y 小，例如 100)
            // - dy = targetWord.y - cannon.y = 100 - 700 = -600（负数，向上）
            // 
            // Math.atan2(y, x) 返回从+X轴逆时针到(x,y)的角度
            // 我们需要从-Y轴（向上）开始计算角度
            // 
            // 技巧：将坐标系旋转90度
            // - 原来的(dx, dy)在新坐标系中变成(dy, -dx)
            // - 但我们希望从-Y开始，所以使用(-dy, dx)
            // 
            // 正确公式：angle = atan2(dx, -dy)
            // 验证：
            // - 目标在正上方：dx=0, dy=-600, angle=atan2(0, 600)=0（向上）✓
            // - 目标在左上方：dx=-100, dy=-600, angle=atan2(-100, 600)≈-0.17（逆时针偏右，应该是顺时针偏左）✗
            // 
            // 再次修正！atan2(y,x) 不是 atan2(x,y)
            // 正确公式：angle = atan2(dx, -dy)
            // 其中 atan2 的第一个参数是"新Y轴"，第二个是"新X轴"
            const newTargetAngle = Math.atan2(dx, -dy);
            
            // 只在角度变化较大时更新（避免过度计算）
            if (Math.abs(newTargetAngle - this.cannon.targetAngle) > 0.01) {
                const oldAngle = this.cannon.targetAngle;
                this.cannon.targetAngle = newTargetAngle;
                // debugLog.info(`🎯 炮管目标角度更新: ${(oldAngle * 180 / Math.PI).toFixed(1)}° → ${(newTargetAngle * 180 / Math.PI).toFixed(1)}° (目标: ${targetWord.original} at x=${targetWord.x.toFixed(0)}, y=${targetWord.y.toFixed(0)})`);
            }
        } else {
            // debugLog.info(`⚠️ 无下落单词，炮管保持当前角度`);
        }
        
        // 平滑过渡炮管角度
        const angleDiff = this.cannon.targetAngle - this.cannon.angle;
        
        // 只有当角度差异足够大时才更新
        if (Math.abs(angleDiff) > 0.001) {
            // 处理角度跨越 -PI/PI 边界的情况
            let normalizedDiff = angleDiff;
            if (angleDiff > Math.PI) {
                normalizedDiff = angleDiff - 2 * Math.PI;
            } else if (angleDiff < -Math.PI) {
                normalizedDiff = angleDiff + 2 * Math.PI;
            }
            
            const oldAngle = this.cannon.angle;
            this.cannon.angle += normalizedDiff * 0.2; // 提高响应速度到0.2
            
            // 每60帧（约1秒）输出一次调试信息
            if (!this._cannonLogCounter) this._cannonLogCounter = 0;
            this._cannonLogCounter++;
            // if (this._cannonLogCounter % 60 === 0) {
            //     debugLog.info(`🔄 炮管旋转中: ${(oldAngle * 180 / Math.PI).toFixed(1)}° → ${(this.cannon.angle * 180 / Math.PI).toFixed(1)}° (差值: ${(normalizedDiff * 180 / Math.PI).toFixed(1)}°)`);
            // }
        }
    }

    drawBullets() {
        this.bullets.forEach(bullet => {
            // 1. 绘制火焰尾迹
            bullet.trail.forEach((point, index) => {
                const size = (index / bullet.trail.length) * 12;
                const alpha = point.alpha * 0.6;
                
                // 橙红色尾迹
                const trailGradient = this.ctx.createRadialGradient(
                    point.x, point.y, 0,
                    point.x, point.y, size
                );
                trailGradient.addColorStop(0, `rgba(255, 200, 0, ${alpha})`);
                trailGradient.addColorStop(0.5, `rgba(255, 100, 0, ${alpha * 0.7})`);
                trailGradient.addColorStop(1, `rgba(255, 50, 0, 0)`);
                
                this.ctx.fillStyle = trailGradient;
                this.ctx.beginPath();
                this.ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
                this.ctx.fill();
            });
            
            // 2. 绘制火球主体
            this.ctx.save();
            this.ctx.translate(bullet.x, bullet.y);
            this.ctx.rotate(bullet.rotation);
            
            // 外层光晕（红色）
            const outerGlow = this.ctx.createRadialGradient(0, 0, 0, 0, 0, 16);
            outerGlow.addColorStop(0, 'rgba(255, 100, 0, 0.8)');
            outerGlow.addColorStop(0.5, 'rgba(255, 50, 0, 0.4)');
            outerGlow.addColorStop(1, 'rgba(255, 0, 0, 0)');
            this.ctx.fillStyle = outerGlow;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, 16, 0, Math.PI * 2);
            this.ctx.fill();
            
            // 中层火球（橙色）
            const middleGlow = this.ctx.createRadialGradient(0, 0, 0, 0, 0, 10);
            middleGlow.addColorStop(0, 'rgba(255, 200, 0, 1)');
            middleGlow.addColorStop(0.6, 'rgba(255, 150, 0, 1)');
            middleGlow.addColorStop(1, 'rgba(255, 100, 0, 0.8)');
            this.ctx.fillStyle = middleGlow;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, 10, 0, Math.PI * 2);
            this.ctx.fill();
            
            // 内核（亮黄色）
            const core = this.ctx.createRadialGradient(0, 0, 0, 0, 0, 5);
            core.addColorStop(0, 'rgba(255, 255, 200, 1)');
            core.addColorStop(0.5, 'rgba(255, 255, 100, 1)');
            core.addColorStop(1, 'rgba(255, 200, 0, 1)');
            this.ctx.fillStyle = core;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, 5, 0, Math.PI * 2);
            this.ctx.fill();
            
            // 火焰纹理（旋转的火苗）
            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI * 2 / 6) * i;
                const flameX = Math.cos(angle) * 8;
                const flameY = Math.sin(angle) * 8;
                
                const flameGradient = this.ctx.createRadialGradient(
                    flameX, flameY, 0,
                    flameX, flameY, 4
                );
                flameGradient.addColorStop(0, 'rgba(255, 255, 150, 0.6)');
                flameGradient.addColorStop(1, 'rgba(255, 150, 0, 0)');
                
                this.ctx.fillStyle = flameGradient;
            this.ctx.beginPath();
                this.ctx.arc(flameX, flameY, 4, 0, Math.PI * 2);
            this.ctx.fill();
            }
            
            this.ctx.restore();
        });
    }

    drawExplosions() {
        this.explosions.forEach(explosion => {
            explosion.particles.forEach(particle => {
                if (particle.life > 0) {
                    const alpha = particle.life / particle.maxLife;
                    this.ctx.fillStyle = `rgba(${particle.color.r}, ${particle.color.g}, ${particle.color.b}, ${alpha})`;
                    this.ctx.beginPath();
                    this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                    this.ctx.fill();
                }
            });
        });
    }

    drawMuzzleFlashes() {
        this.muzzleFlashes.forEach(flash => {
            flash.particles.forEach(particle => {
                if (particle.life > 0) {
                    const alpha = particle.life / particle.maxLife;
                    // 火花带光晕效果
                    this.ctx.save();
                    
                    // 外层光晕
                    const gradient = this.ctx.createRadialGradient(
                        particle.x, particle.y, 0,
                        particle.x, particle.y, particle.size * 2
                    );
                    gradient.addColorStop(0, `rgba(${particle.color.r}, ${particle.color.g}, ${particle.color.b}, ${alpha})`);
                    gradient.addColorStop(0.5, `rgba(${particle.color.r}, ${particle.color.g}, ${particle.color.b}, ${alpha * 0.5})`);
                    gradient.addColorStop(1, `rgba(${particle.color.r}, ${particle.color.g}, ${particle.color.b}, 0)`);
                    
                    this.ctx.fillStyle = gradient;
                    this.ctx.beginPath();
                    this.ctx.arc(particle.x, particle.y, particle.size * 2, 0, Math.PI * 2);
                    this.ctx.fill();
                    
                    // 核心亮点
                    this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
                    this.ctx.beginPath();
                    this.ctx.arc(particle.x, particle.y, particle.size * 0.5, 0, Math.PI * 2);
                    this.ctx.fill();
                    
                    this.ctx.restore();
                }
            });
        });
    }

    drawGameInfo() {
        // 绘制游戏状态信息
        if (this.gameState === 'paused') {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
            
            this.ctx.fillStyle = '#ffd700';
            this.ctx.font = '48px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('游戏暂停', this.canvasWidth / 2, this.canvasHeight / 2);
        }
    }

    showHitEffect(word, points) {
        // 击中效果和分数显示
        console.log(`击中单词: ${word.original}, 获得分数: ${points}`);
        
        // 显示分数飞行效果（简单实现）
        const scoreElement = document.createElement('div');
        scoreElement.textContent = `+${points}`;
        scoreElement.style.position = 'fixed';
        scoreElement.style.color = '#ffd700';
        scoreElement.style.fontSize = '24px';
        scoreElement.style.fontWeight = 'bold';
        scoreElement.style.zIndex = '1000';
        scoreElement.style.pointerEvents = 'none';
        scoreElement.style.left = '50%';
        scoreElement.style.top = '50%';
        scoreElement.style.transform = 'translate(-50%, -50%)';
        scoreElement.style.animation = 'scoreFloat 1s ease-out forwards';
        
        document.body.appendChild(scoreElement);
        
        // 1秒后移除元素
        setTimeout(() => {
            if (scoreElement.parentNode) {
                scoreElement.parentNode.removeChild(scoreElement);
            }
        }, 1000);
    }

    showMissEffect() {
        // 简单的失误效果
        const input = document.getElementById('letterInput');
        input.style.backgroundColor = '#ffcccc';
        setTimeout(() => {
            input.style.backgroundColor = '';
        }, 300);
    }

    showGiveUpEffect(word) {
        // 放弃效果显示
        console.log(`放弃单词: ${word.original}`);
        
        // 显示-1分效果
        const scoreElement = document.createElement('div');
        scoreElement.textContent = '-1';
        scoreElement.style.position = 'fixed';
        scoreElement.style.color = '#ff4444';
        scoreElement.style.fontSize = '24px';
        scoreElement.style.fontWeight = 'bold';
        scoreElement.style.zIndex = '1000';
        scoreElement.style.pointerEvents = 'none';
        scoreElement.style.left = '50%';
        scoreElement.style.top = '50%';
        scoreElement.style.transform = 'translate(-50%, -50%)';
        scoreElement.style.animation = 'scoreFloat 1s ease-out forwards';
        
        document.body.appendChild(scoreElement);
        
        // 1秒后移除元素
        setTimeout(() => {
            if (scoreElement.parentNode) {
                scoreElement.parentNode.removeChild(scoreElement);
            }
        }, 1000);
    }

    // UI更新方法
    updateUI() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('level').textContent = this.level;
        document.getElementById('target').textContent = this.targetScore;
        document.getElementById('vocabulary-count').textContent = this.vocabularyManager.getVocabularyStats().totalWords;
        document.getElementById('time').textContent = this.formatTime(this.gameTime);
        document.getElementById('combo').textContent = this.combo;
        
        this.updateVocabularyList();
        this.updateExamStats(); // 更新考试统计
    }

    updateButtons() {
        const startBtn = document.getElementById('startBtn');
        const pauseBtn = document.getElementById('pauseBtn');
        
        switch (this.gameState) {
            case 'stopped':
                startBtn.textContent = '开始游戏';
                startBtn.disabled = false;
                pauseBtn.disabled = true;
                break;
            case 'playing':
                startBtn.textContent = '游戏中';
                startBtn.disabled = true;
                pauseBtn.textContent = '暂停';
                pauseBtn.disabled = false;
                break;
            case 'paused':
                pauseBtn.textContent = '继续';
                pauseBtn.disabled = false;
                break;
        }
        
        const hasVocabulary = this.vocabularyManager.getVocabularyStats().missedWords > 0;
        document.getElementById('exportBtn').disabled = !hasVocabulary;
    }

    updateNextWordDisplay() {
        const nextWordElement = document.getElementById('nextWord');
        if (this.nextWord) {
            nextWordElement.textContent = `下一个: ${this.nextWord.display}`;
        } else {
            nextWordElement.textContent = '准备中...';
        }
    }

    // 更新图片展示区
    updateImageShowcase(wordStr) {
        try {
            const img = document.getElementById('wordImage');
            if (!img) return;
            const word = (wordStr || (this.nextWord && this.nextWord.original) || '').toLowerCase();
            if (!word) { img.src = ''; return; }
            debugLog.info(`🖼️ 更新图片展示，目标单词: ${word}`);
            // 先使用本地缓存（jpg → jpeg → png）
            const localJpg = `./images/cache/${word}.jpeg`;
            this.tryLoadImage(img, localJpg, '本地JPEG', () => {
                const localJpeg = `./images/cache/${word}.jpg`;
                this.tryLoadImage(img, localJpeg, '本地JPG', () => {
                    const localPng = `./images/cache/${word}.png`;
                    this.tryLoadImage(img, localPng, '本地PNG', () => {
                        // 在线兜底（多源级联，避免单一服务报错）
                        const sig = Math.floor(Math.random() * 1e6);
                        const candidates = [
                            `https://loremflickr.com/300/300/${encodeURIComponent(word)}?random=${sig}`,
                            `https://picsum.photos/seed/${encodeURIComponent(word)}-${sig}/300/300`
                        ];
                        this.loadImageFromCandidates(img, candidates, 0, word);
                    });
                });
            });
        } catch (e) {
            console.error('更新图片展示失败:', e);
            debugLog.error(`🖼️ 图片展示异常: ${e?.message || e}`);
        }
    }

    tryLoadImage(img, url, label = '未知来源', onError) {
        // debugLog.info(`➡️ 开始加载图片 [${label}]: ${url}`);
        const test = new Image();
        // 不跨域读取像素，仅展示即可
        test.onload = () => {
            // debugLog.success(`✅ 图片加载成功 [${label}]: ${url}`);
            img.src = url;
        };
        test.onerror = (ev) => {
            // debugLog.error(`❌ 图片加载失败 [${label}]: ${url}`);
            if (onError) onError(ev);
        };
        test.src = url;
    }

    loadImageFromCandidates(img, list, index, word) {
        if (!list || index >= list.length) {
            debugLog.error(`❌ 所有在线图片源均失败: ${word}`);
            // 设置一个友好占位图
            img.src = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
                `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300">
                    <rect width="100%" height="100%" fill="#2c3e50"/>
                    <text x="50%" y="50%" fill="#bdc3c7" font-size="20" text-anchor="middle" dy=".3em">No Image</text>
                </svg>`
            );
            return;
        }
        const url = list[index];
        this.tryLoadImage(img, url, `在线兜底#${index+1}`, () => this.loadImageFromCandidates(img, list, index + 1, word));
    }

    updateRealTimeDisplay() {
        if ((this.gameState !== 'playing' && this.gameState !== 'review') || this.fallingWords.length === 0) return;
        
        const currentInput = document.getElementById('letterInput').value; // 保持小写
        const currentWord = this.fallingWords[0]; // 假设只有一个下降单词
        
        if (currentWord && currentInput.length > 0) {
            // 创建实时显示的单词
            const expectedLetters = currentWord.missingLetters.toUpperCase();
            
            // 使用显示单词（包含下划线）作为基础
            let displayChars = currentWord.display.split('');
            let inputIndex = 0;
            
            // 只替换已输入字母对应的缺失位置
            for (let i = 0; i < currentWord.missing.length && inputIndex < currentInput.length; i++) {
                const missingIndex = currentWord.missing[i];
                // 替换下划线为带括号的输入字母（显示小写）
                displayChars[missingIndex] = `[${currentInput[inputIndex]}]`;
                inputIndex++;
            }
            
            // 将字符数组重新组合成字符串
            const displayWord = displayChars.join('');
            
            // 检查输入是否正确（比较时转为大写）
            const isCorrect = currentInput.toUpperCase() === expectedLetters.substring(0, currentInput.length);
            currentWord.realTimeDisplay = displayWord;
            currentWord.inputCorrect = isCorrect;
            
            // 检测错误输入
            if (!isCorrect && currentInput.length > 0) {
                // 显示血色红叉并清空输入
                this.showErrorMark(currentWord, currentInput.length - 1);
                this.clearInputWithAnimation();
                return;
            }
            
            // 自动射击：当输入完成且正确时自动击落
            if (currentInput.length === expectedLetters.length && isCorrect) {
                setTimeout(() => {
                    this.autoShoot(currentWord);
                }, 100); // 短暂延迟以显示完成效果
            }
            
            // 更新HTML实时预览
            this.updateHtmlPreview(displayWord, isCorrect);
        } else if (currentWord) {
            // 清除实时显示
            currentWord.realTimeDisplay = null;
            currentWord.inputCorrect = null;
            this.updateHtmlPreview('等待输入...', null);
        }
    }

    showErrorMark(word, errorIndex) {
        // 计算错误字母的位置
        const missingIndex = word.missing[errorIndex];
        const letterWidth = this.ctx.measureText('A').width;
        const wordX = word.x;
        const wordY = word.y;
        
        // 计算错误字母在单词中的x位置
        let xOffset = 0;
        for (let i = 0; i < missingIndex; i++) {
            xOffset += this.ctx.measureText(word.original[i]).width;
        }
        
        // 创建错误标记
        const errorMark = {
            x: wordX + xOffset,
            y: wordY + word.height / 2,
            life: 1,
            maxLife: 1,
            decay: 0.05,
            size: 20
        };
        
        this.errorMarks.push(errorMark);
        
        // 重置连击和完美等级
        this.combo = 0;
        this.perfectLevel = false;
    }

    clearInputWithAnimation() {
        const inputElement = document.getElementById('letterInput');
        
        // 添加淡出动画
        inputElement.style.transition = 'opacity 0.3s';
        inputElement.style.opacity = '0.3';
        
        setTimeout(() => {
            inputElement.value = '';
            inputElement.style.opacity = '1';
            
            // 清除当前单词的实时显示
            if (this.fallingWords.length > 0) {
                this.fallingWords[0].realTimeDisplay = null;
                this.fallingWords[0].inputCorrect = null;
            }
            this.updateHtmlPreview('等待输入...', null);
        }, 300);
    }

    updateErrorMarks() {
        for (let i = this.errorMarks.length - 1; i >= 0; i--) {
            const mark = this.errorMarks[i];
            mark.life -= mark.decay;
            
            if (mark.life <= 0) {
                this.errorMarks.splice(i, 1);
            }
        }
    }

    drawErrorMarks() {
        this.errorMarks.forEach(mark => {
            if (mark.life > 0) {
                const alpha = mark.life;
                
                // 绘制血色红叉
                this.ctx.save();
                this.ctx.strokeStyle = `rgba(255, 0, 0, ${alpha})`;
                this.ctx.lineWidth = 3;
                this.ctx.lineCap = 'round';
                
                const halfSize = mark.size / 2;
                
                // X形状
                this.ctx.beginPath();
                this.ctx.moveTo(mark.x - halfSize, mark.y - halfSize);
                this.ctx.lineTo(mark.x + halfSize, mark.y + halfSize);
                this.ctx.stroke();
                
                this.ctx.beginPath();
                this.ctx.moveTo(mark.x + halfSize, mark.y - halfSize);
                this.ctx.lineTo(mark.x - halfSize, mark.y + halfSize);
                this.ctx.stroke();
                
                // 闪烁效果
                if (Math.floor(mark.life * 10) % 2 === 0) {
                    this.ctx.strokeStyle = `rgba(139, 0, 0, ${alpha})`;
                    this.ctx.lineWidth = 5;
                    
                    this.ctx.beginPath();
                    this.ctx.moveTo(mark.x - halfSize, mark.y - halfSize);
                    this.ctx.lineTo(mark.x + halfSize, mark.y + halfSize);
                    this.ctx.stroke();
                    
                    this.ctx.beginPath();
                    this.ctx.moveTo(mark.x + halfSize, mark.y - halfSize);
                    this.ctx.lineTo(mark.x - halfSize, mark.y + halfSize);
                    this.ctx.stroke();
                }
                
                this.ctx.restore();
            }
        });
    }

    updateHtmlPreview(displayText, isCorrect) {
        const previewElement = document.getElementById('realTimePreview');
        if (previewElement) {
            if (displayText === '等待输入...') {
                previewElement.textContent = '实时预览: 等待输入...';
                previewElement.style.color = '#ffd700';
            } else {
                previewElement.textContent = `实时预览: ${displayText.replace(/[\[\]]/g, '')}`;
                if (isCorrect === true) {
                    previewElement.style.color = '#44ff44';
                } else if (isCorrect === false) {
                    previewElement.style.color = '#ff4444';
                } else {
                    previewElement.style.color = '#ffd700';
                }
            }
        }
    }

    autoShoot(word) {
        if (this.gameState !== 'playing' && this.gameState !== 'review') return;
        
        // 检查单词是否仍在下降列表中
        const wordIndex = this.fallingWords.indexOf(word);
        if (wordIndex === -1) return;
        
        // 发射炮弹
        this.shootBullet(word);
    }

    shootBullet(targetWord) {
        // 触发后坐力效果（向后推20像素，增强视觉冲击）
        this.cannon.recoil = 30;
        
        // 计算炮口位置（炮管前端，考虑旋转角度）
        const muzzleDistance = 118; // 炮口距离炮管中心的距离
        const muzzleX = this.cannon.x + Math.sin(this.cannon.angle) * muzzleDistance;
        const muzzleY = this.cannon.y - Math.cos(this.cannon.angle) * muzzleDistance;
        
        // 创建炮口火花效果
        this.createMuzzleFlash(muzzleX, muzzleY, this.cannon.angle);
        
        // 创建火球炮弹对象
        const bullet = {
            x: muzzleX,
            y: muzzleY,
            targetX: targetWord.x,
            targetY: targetWord.y + targetWord.height / 2,
            speed: 15,
            targetWord: targetWord,
            rotation: 0, // 火球旋转角度
            trail: [] // 火焰尾迹
        };
        
        // 计算炮弹方向
        const dx = bullet.targetX - bullet.x;
        const dy = bullet.targetY - bullet.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        bullet.vx = (dx / distance) * bullet.speed;
        bullet.vy = (dy / distance) * bullet.speed;
        
        this.bullets.push(bullet);
    }

    updateBullets() {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            
            // 保存当前位置作为尾迹（加大一倍长度：10 → 20）
            bullet.trail.push({ x: bullet.x, y: bullet.y, alpha: 1 });
            if (bullet.trail.length > 20) {
                bullet.trail.shift();
            }
            
            // 更新尾迹透明度
            bullet.trail.forEach((point, index) => {
                point.alpha = index / bullet.trail.length;
            });
            
            // 更新炮弹位置
            bullet.x += bullet.vx;
            bullet.y += bullet.vy;
            
            // 更新火球旋转
            bullet.rotation += 0.3;
            
            // 检查是否击中目标
            const dx = bullet.x - bullet.targetX;
            const dy = bullet.y - bullet.targetY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 20) {
                // 击中目标
                this.bullets.splice(i, 1);
                this.onBulletHit(bullet.targetWord);
            } else if (bullet.y < 0 || bullet.y > this.canvasHeight || 
                       bullet.x < 0 || bullet.x > this.canvasWidth) {
                // 炮弹飞出屏幕
                this.bullets.splice(i, 1);
            }
        }
    }

    onBulletHit(word) {
        // 停止语音朗读
        this.stopSpeaking();
        
        // 移除单词
        const wordIndex = this.fallingWords.indexOf(word);
        if (wordIndex !== -1) {
            this.fallingWords.splice(wordIndex, 1);
        }
        
        // 创建爆炸效果
        this.createExplosion(word.x, word.y + word.height / 2, word.original.length);
        
        // 创建中文翻译爆炸动画
        this.createMeaningExplosion(word.x, word.y + word.height / 2, word.meaning, word.original);
        
        // 计算分数（包含射击奖励+2分）
        let points = this.calculateScore(word);
        points += 2; // 射击奖励
        this.score += points;
        this.combo++;
        this.lastHitTime = Date.now();
        
        // 更新统计
        this.totalWordsHit = (this.totalWordsHit || 0) + 1;
        this.maxCombo = Math.max(this.maxCombo || 0, this.combo);
        
        // 更新考试统计（去重）
        this.hitWords.add(word.original.toLowerCase());
        this.updateExamStats();
        
        // 显示击中效果
        this.showHitEffect(word, points);
        this.clearInput();
        
        // 检查是否升级（非复习模式）
        if (this.gameState === 'playing' && this.score >= this.targetScore) {
            this.levelUp();
        }
        
        // 检查游戏是否完成
        this.checkGameCompletion();
        
        this.updateUI();
    }

    createExplosion(x, y, wordLength) {
        // 创建多彩粒子爆炸
        const particleCount = Math.min(50, wordLength * 8);
        const particles = [];
        
        const colors = [
            { r: 255, g: 69, b: 0 },   // 橙红色
            { r: 255, g: 215, b: 0 },  // 金色
            { r: 255, g: 0, b: 0 },    // 红色
            { r: 255, g: 165, b: 0 },  // 橙色
            { r: 255, g: 255, b: 0 },  // 黄色
            { r: 0, g: 255, b: 127 }   // 绿色
        ];
        
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount;
            const speed = 2 + Math.random() * 4;
            const color = colors[Math.floor(Math.random() * colors.length)];
            
            particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 2 + Math.random() * 3,
                life: 1,
                maxLife: 1,
                decay: 0.02 + Math.random() * 0.02,
                color: color
            });
        }
        
        this.explosions.push({
            particles: particles,
            life: 1
        });
    }

    createMuzzleFlash(x, y, angle) {
        // 创建炮口火花粒子（沿着炮管方向喷射）
        const particleCount = 20; // 火花数量
        const particles = [];
        
        // 火花颜色：橙色、黄色、白色
        const colors = [
            { r: 255, g: 140, b: 0 },   // 橙色
            { r: 255, g: 215, b: 0 },   // 金色
            { r: 255, g: 255, b: 200 }, // 淡黄白色
            { r: 255, g: 69, b: 0 },    // 橙红色
            { r: 255, g: 255, b: 255 }  // 白色
        ];
        
        for (let i = 0; i < particleCount; i++) {
            // 在炮管方向的锥形范围内随机发射（扩散角度±30度）
            const spreadAngle = (Math.random() - 0.5) * Math.PI / 3; // ±30度
            const particleAngle = angle + spreadAngle;
            
            const speed = 3 + Math.random() * 5; // 速度3-8
            const color = colors[Math.floor(Math.random() * colors.length)];
            
            particles.push({
                x: x,
                y: y,
                vx: Math.sin(particleAngle) * speed,
                vy: -Math.cos(particleAngle) * speed,
                size: 2 + Math.random() * 3,
                life: 1,
                maxLife: 1,
                decay: 0.05 + Math.random() * 0.05, // 快速衰减（0.05-0.1）
                color: color
            });
        }
        
        this.muzzleFlashes.push({
            particles: particles,
            life: 1
        });
    }

    updateExplosions() {
        for (let i = this.explosions.length - 1; i >= 0; i--) {
            const explosion = this.explosions[i];
            let allDead = true;
            
            explosion.particles.forEach(particle => {
                if (particle.life > 0) {
                    allDead = false;
                    particle.x += particle.vx;
                    particle.y += particle.vy;
                    particle.vy += 0.1; // 重力
                    particle.life -= particle.decay;
                }
            });
            
            if (allDead) {
                this.explosions.splice(i, 1);
            }
        }
    }

    updateMuzzleFlashes() {
        for (let i = this.muzzleFlashes.length - 1; i >= 0; i--) {
            const flash = this.muzzleFlashes[i];
            let allDead = true;
            
            flash.particles.forEach(particle => {
                if (particle.life > 0) {
                    allDead = false;
                    particle.x += particle.vx;
                    particle.y += particle.vy;
                    particle.vy += 0.2; // 轻微重力
                    particle.life -= particle.decay;
                }
            });
            
            if (allDead) {
                this.muzzleFlashes.splice(i, 1);
            }
        }
    }

    createMeaningExplosion(x, y, meaning, englishWord) {
        // 创建中文翻译爆炸动画
        const meaningExplosion = {
            x: x,
            y: y,
            meaning: meaning || '未知',
            englishWord: englishWord || '',
            scale: 0.5,        // 从0.5倍开始
            targetScale: 2.5,  // 放大到2.5倍
            life: 1,           // 生命周期（1秒）
            maxLife: 1,
            phase: 'growing',  // growing（放大阶段）-> showing（显示阶段）-> fading（淡出阶段）
            displayTime: 0,    // 显示时间计数
            alpha: 0           // 透明度
        };
        
        this.meaningExplosions.push(meaningExplosion);
    }

    updateMeaningExplosions() {
        for (let i = this.meaningExplosions.length - 1; i >= 0; i--) {
            const explosion = this.meaningExplosions[i];
            
            if (explosion.phase === 'growing') {
                // 放大阶段（0.3秒）
                explosion.scale += (explosion.targetScale - 0.5) * 0.15;
                explosion.alpha += 0.1;
                
                if (explosion.scale >= explosion.targetScale * 0.95) {
                    explosion.phase = 'showing';
                    explosion.alpha = 1;
                }
            } else if (explosion.phase === 'showing') {
                // 显示阶段（1秒）
                explosion.displayTime += 1/60; // 假设60fps
                
                if (explosion.displayTime >= 1.0) {
                    explosion.phase = 'fading';
                }
            } else if (explosion.phase === 'fading') {
                // 淡出阶段（0.5秒）
                explosion.alpha -= 0.04;
                explosion.scale += 0.05; // 继续轻微放大
                
                if (explosion.alpha <= 0) {
                    this.meaningExplosions.splice(i, 1);
                }
            }
        }
    }

    drawMeaningExplosions() {
        this.meaningExplosions.forEach(explosion => {
            if (explosion.alpha > 0) {
                this.ctx.save();
                
                // 移动到爆炸位置
                this.ctx.translate(explosion.x, explosion.y);
                
                // 设置字体和样式
                const fontSize = 24 * explosion.scale;
                this.ctx.font = `bold ${fontSize}px "Microsoft YaHei", "PingFang SC", "Hiragino Sans GB", sans-serif`;
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                
                // 绘制中文翻译（带描边和发光效果）
                // 外层发光
                this.ctx.shadowColor = 'rgba(255, 215, 0, 0.8)';
                this.ctx.shadowBlur = 20 * explosion.scale;
                
                // 描边
                this.ctx.strokeStyle = `rgba(255, 165, 0, ${explosion.alpha})`;
                this.ctx.lineWidth = 3 * explosion.scale;
                this.ctx.strokeText(explosion.meaning, 0, 0);
                
                // 填充
                const gradient = this.ctx.createLinearGradient(0, -fontSize/2, 0, fontSize/2);
                gradient.addColorStop(0, `rgba(255, 255, 100, ${explosion.alpha})`);
                gradient.addColorStop(0.5, `rgba(255, 215, 0, ${explosion.alpha})`);
                gradient.addColorStop(1, `rgba(255, 165, 0, ${explosion.alpha})`);
                this.ctx.fillStyle = gradient;
                this.ctx.fillText(explosion.meaning, 0, 0);
                
                // 绘制英文单词（小字，在中文下方）
                if (explosion.scale >= 1.5) {
                    const englishFontSize = 12 * explosion.scale * 0.6;
                    this.ctx.font = `${englishFontSize}px Arial`;
                    this.ctx.fillStyle = `rgba(200, 200, 200, ${explosion.alpha * 0.8})`;
                    this.ctx.shadowBlur = 5;
                    this.ctx.fillText(explosion.englishWord, 0, fontSize * 0.6);
                }
                
                this.ctx.restore();
            }
        });
    }

    giveUpCurrentWord() {
        debugLog.warning('🚫 用户放弃单词');
        
        if (this.gameState !== 'playing') {
            debugLog.warning(`⚠️ 游戏状态不是playing: ${this.gameState}`);
            return;
        }
        
        if (this.fallingWords.length === 0) {
            debugLog.warning('⚠️ 没有下降的单词');
            return;
        }
        
        // 停止语音朗读
        this.stopSpeaking();
        
        const currentWord = this.fallingWords[0];
        debugLog.info(`🚫 放弃单词: ${currentWord.original}`);
        debugLog.info(`   堆叠区当前数量: ${this.stackedWords.length}`);
        
        // 确保单词对象有完整信息
        if (!currentWord.original) {
            debugLog.error('❌ 放弃的单词缺少original属性');
            return;
        }
        
        // 标记为放弃的单词（在移除之前标记）
        currentWord.giveUp = true;
        
        // 移除下降单词
        this.fallingWords.splice(0, 1);
        
        // 放弃惩罚：-1分
        this.score = Math.max(0, this.score - 1);
        
        // 重置连击
        this.combo = 0;
        this.perfectLevel = false;
        
        // 更新统计
        this.totalWordsGivenUp = (this.totalWordsGivenUp || 0) + 1;
        
        // 添加到堆叠区
        debugLog.info('➡️ 准备调用 addToStack');
        this.addToStack(currentWord);
        debugLog.success(`✅ 放弃处理完成，堆叠区数量: ${this.stackedWords.length}`);
        
        // 清空输入
        this.clearInput();
        
        // 显示放弃效果
        this.showGiveUpEffect(currentWord);
        
        // 检查游戏是否完成
        this.checkGameCompletion();
        
        this.updateUI();
    }

    updateBufferLights() {
        document.getElementById('redLight').classList.toggle('active', this.bufferLights.red);
        document.getElementById('yellowLight').classList.toggle('active', this.bufferLights.yellow);
        document.getElementById('greenLight').classList.toggle('active', this.bufferLights.green);
    }

    resetBufferLights() {
        this.bufferLights = { red: false, yellow: false, green: false };
    }

    updateVocabularyList() {
        const vocabularyList = document.getElementById('vocabularyList');
        const vocabularyBook = this.vocabularyManager.getVocabularyBook();
        
        // 更新生词本总数显示
        const vocabTotalCount = document.getElementById('vocab-total-count');
        if (vocabTotalCount) {
            vocabTotalCount.textContent = vocabularyBook.length;
        }
        
        if (vocabularyBook.length === 0) {
            vocabularyList.innerHTML = '<p>暂无生词</p>';
        } else {
            vocabularyList.innerHTML = vocabularyBook.map(word => 
                `<div class="vocab-item">
                    <span class="vocab-word">${word.word}</span>
                    <span class="vocab-count">
                        总计×${word.count} 
                        (放弃×${word.giveUpCount || 0} 失败×${word.failCount || 0})
                    </span>
                </div>`
            ).join('');
        }
    }

    clearInput() {
        document.getElementById('letterInput').value = '';
    }

    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    // 弹窗控制
    showGameOverModal() {
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('finalLevel').textContent = this.level;
        document.getElementById('finalVocabulary').textContent = this.vocabularyManager.getVocabularyStats().missedWords;
        document.getElementById('gameOverModal').style.display = 'block';
    }

    showLevelUpModal(vocabularyCount) {
        document.getElementById('newLevel').textContent = this.level;
        document.getElementById('levelVocabulary').textContent = vocabularyCount;
        document.getElementById('levelUpModal').style.display = 'block';
        
        // 3秒后自动关闭弹窗
        this.levelUpAutoCloseTimer = setTimeout(() => {
            this.continueGame();
        }, 3000);
        
        // 隐藏继续游戏按钮，因为现在是自动进入下一级
        const continueBtn = document.getElementById('continueBtn');
        if (continueBtn) {
            continueBtn.style.display = 'none';
        }
        
        // 添加倒计时提示（应插入到 .modal-body 内，位于 .modal-buttons 之前）
        const modalBody = document.querySelector('#levelUpModal .modal-body');
        let keyboardHint = modalBody ? modalBody.querySelector('.keyboard-hint') : null;
        if (!keyboardHint) {
            keyboardHint = document.createElement('p');
            keyboardHint.className = 'keyboard-hint';
            keyboardHint.style.fontSize = '16px';
            keyboardHint.style.color = '#2c3e50';
            keyboardHint.style.marginTop = '15px';
            keyboardHint.style.fontWeight = 'bold';
            keyboardHint.style.textAlign = 'center';
            const buttonsInBody = modalBody ? modalBody.querySelector('.modal-buttons') : null;
            if (modalBody && buttonsInBody && buttonsInBody.parentNode === modalBody) {
                modalBody.insertBefore(keyboardHint, buttonsInBody);
            } else if (modalBody) {
                modalBody.appendChild(keyboardHint);
            }
        }
        keyboardHint.textContent = '3秒后自动开始下一级...';
        
        // 开始倒计时显示
        this.startLevelUpCountdown();
    }
    
    startLevelUpCountdown() {
        let countdown = 3;
        const keyboardHint = document.querySelector('#levelUpModal .keyboard-hint');
        
        this.levelUpCountdownTimer = setInterval(() => {
            countdown--;
            if (countdown > 0) {
                keyboardHint.textContent = `${countdown}秒后自动开始下一级...`;
            } else {
                keyboardHint.textContent = '开始下一级...';
                clearInterval(this.levelUpCountdownTimer);
                this.levelUpCountdownTimer = null;
            }
        }, 1000);
    }

    showVocabularyBook() {
        // 这里可以实现一个详细的生词本查看界面
        alert('生词本功能开发中...');
    }

    hideModals() {
        document.getElementById('gameOverModal').style.display = 'none';
        document.getElementById('levelUpModal').style.display = 'none';
    }


    exportVocabulary() {
        const vocabularyBook = this.vocabularyManager.getVocabularyBook();
        if (vocabularyBook.length === 0) {
            alert('生词本为空，无法导出！');
            return;
        }
        
        // 创建简化的文本格式
        let textContent = "";
        
        vocabularyBook.forEach((word, index) => {
            const phonetic = word.phonetic || '[音标缺失]';
            textContent += `${word.word}, ${phonetic}, ${word.meaning}\n`;
        });
        
        // 创建下载链接
        const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `生词本_${new Date().toISOString().split('T')[0]}.txt`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        alert(`成功导出 ${vocabularyBook.length} 个生词到文本文件！`);
    }

    // 游戏主循环
    gameLoop() {
        this.updateGame();
        this.render();
        this.updateUI();
        
        requestAnimationFrame(() => this.gameLoop());
    }
}

// 游戏初始化
document.addEventListener('DOMContentLoaded', () => {
    const game = new WordTetrisGame();
    
    // 页面加载时自动重置游戏
    setTimeout(() => {
        game.resetGame();
        console.log('🔄 页面刷新，自动重置游戏');
    }, 100); // 稍微延迟确保初始化完成
});

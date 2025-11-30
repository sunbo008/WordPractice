// 游戏主类
// 注意：DebugLogger 已通过独立文件引入 (DebugLogger-standalone.js)
class WordTetrisGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.vocabularyManager = new VocabularyManagerV2();
        
        // 画布设置（逻辑尺寸） - 必须在 setupHighDPICanvas 之前初始化
        this.canvasWidth = 600;
        this.canvasHeight = 500;
        this.bufferHeight = 80;
        this.gameAreaTop = this.bufferHeight;
        this.gameAreaHeight = this.canvasHeight - this.bufferHeight;
        
        // 高清屏适配并根据左栏高度设置画布显示高度
        this.setupHighDPICanvas();
        
        // 初始化渲染引擎（在画布尺寸设置后）
        this.renderer = new GameRenderer(this.ctx, this);
        
        // 游戏状态
        this.gameState = 'stopped'; // stopped, playing, paused, gameOver
        this.score = 0;
        this.level = 1;
        this.targetScore = 100;
        this.startTime = null;
        this.gameTime = 0;
        
        // 错词卡管理
        this.lastSavedCardName = null; // 最近保存的错词卡名称
        
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
        this.totalWords = 0; // 考试总单词量（从单词库获取，初始为0）
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
        
        // 初始化炮管系统（在画布尺寸设置后）
        this.cannonSystem = new CannonSystem(this.ctx, this);
        
        // 初始化爆炸特效系统（在画布尺寸设置后）
        this.explosionSystem = new ExplosionSystem(this.ctx, this);
        
        // 语音朗读系统
        this.speechEnabled = true;
        this.currentSpeech = null;
        this.currentSpeechWord = null; // 当前朗读的单词（用于防止竞态条件）
        this.speechTimer = null; // 重复朗读定时器
        this.firstSpeechTimer = null; // 首次朗读定时器
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
        
        this.init();
    }
    
    // 初始化考试统计
    async initExamStats() {
        console.log('🔍 开始初始化考试统计...');
        
        // 等待单词库加载完成
        let waitCount = 0;
        let hasLoggedWait = false;
        while (!this.vocabularyManager.isLoaded) {
            if (!hasLoggedWait) {
                console.log('⏳ 等待单词库加载完成...');
                hasLoggedWait = true;
            }
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
            this.totalWords = 0; // 单词库加载失败，保持为0
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
            
            // 记录当前朗读的单词（用于防止竞态条件）
            this.currentSpeechWord = word;
            
            // 先清理旧的定时器（如果存在）
            if (this.speechTimer) {
                clearInterval(this.speechTimer);
                this.speechTimer = null;
            }
            
            // 设置定时器每5秒重复播放
            this.speechTimer = setInterval(async () => {
                // 检查是否还是当前单词（防止竞态条件）
                if (this.currentSpeechWord !== word) {
                    debugLog.info(`⚠️ 定时器触发但单词已改变 (期望: "${word}", 当前: "${this.currentSpeechWord}")，取消朗读`);
                    return;
                }
                debugLog.info(`⏰ 定时重复朗读: "${word}"`);
                await this.speakWord(word);
            }, 5000); // 5秒 = 5000毫秒
        } else {
            // 休闲模式：先停止之前的朗读，然后立即播放第一次
            this.stopSpeaking();
            
            // 在 stopSpeaking() 之后再设置新的 currentSpeechWord（避免被清除）
            this.currentSpeechWord = word;
            
            debugLog.info(`😊 休闲模式 - 立即播放: "${word}"`);
            
            // 立即播放第一次（使用异步函数包装）
            (async () => {
                // 检查是否还是当前单词（防止竞态条件）
                if (this.currentSpeechWord !== word) {
                    debugLog.info(`⚠️ 首次朗读前单词已改变 (期望: "${word}", 当前: "${this.currentSpeechWord}")，取消朗读`);
                    return;
                }
                debugLog.info(`⏰ 首次朗读（立即播放）: "${word}"`);
                await this.speakWord(word);
                
                // 再次检查是否还是当前单词（防止在 await 期间单词改变）
                if (this.currentSpeechWord !== word) {
                    debugLog.info(`⚠️ 首次朗读完成但单词已改变 (期望: "${word}", 当前: "${this.currentSpeechWord}")，不设置重复定时器`);
                    return;
                }
                
                // 首次播放后，设置定时器每5秒重复播放
                this.speechTimer = setInterval(async () => {
                    // 检查是否还是当前单词（防止竞态条件）
                    if (this.currentSpeechWord !== word) {
                        debugLog.info(`⚠️ 定时器触发但单词已改变 (期望: "${word}", 当前: "${this.currentSpeechWord}")，取消朗读`);
                        return;
                    }
                    debugLog.info(`⏰ 定时重复朗读: "${word}"`);
                    await this.speakWord(word);
                }, 5000); // 5秒 = 5000毫秒
            })();
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
        
        // 清除当前朗读单词标记（用于防止竞态条件）
        this.currentSpeechWord = null;
        
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
        if (this.cannonSystem && this.cannonSystem.cannon) {
            this.cannonSystem.cannon.x = this.canvasWidth / 2;
            this.cannonSystem.cannon.y = this.canvasHeight - 30;
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

    async init() {
        // 初始化调试日志系统
        debugLog.init();
        debugLog.info('🎮 游戏初始化开始...');
        
        this.loadGameData();
        this.bindEvents();
        // 【修复】不在这里调用 initExamStats()
        // 考试模式下，需要等考试词库加载完成后再初始化统计
        // initExamStats() 会在 DOMContentLoaded 中，考试集成初始化完成后调用
        this.updateUI();
        // 【修复】不在 init 中生成单词，让 startGame() 统一处理
        // this.generateNextWord(); 
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
        const startBtn = document.getElementById('startBtn');
        startBtn.addEventListener('click', () => this.handleStartBtnClick());
        
        // 开始按钮 hover 效果：游戏中或暂停时显示"结束游戏"
        startBtn.addEventListener('mouseenter', () => {
            if (this.gameState === 'playing' || this.gameState === 'paused') {
                startBtn.textContent = '结束游戏';
                startBtn.classList.add('end-game-hover');
            }
        });
        startBtn.addEventListener('mouseleave', () => {
            if (this.gameState === 'playing') {
                startBtn.textContent = '游戏中';
                startBtn.classList.remove('end-game-hover');
            } else if (this.gameState === 'paused') {
                startBtn.textContent = '已暂停';
                startBtn.classList.remove('end-game-hover');
            }
        });
        
        document.getElementById('pauseBtn').addEventListener('click', () => this.pauseGame());
        document.getElementById('resetBtn').addEventListener('click', () => this.resetGame(true));
        // 提交按钮已移除，使用实时输入自动射击机制
        document.getElementById('giveUpBtn').addEventListener('click', () => this.giveUpCurrentWord());
        document.getElementById('exportBtn').addEventListener('click', () => this.exportVocabulary());
        document.getElementById('toggleSpeechBtn').addEventListener('click', () => this.toggleSpeech());
        
        // 弹窗事件
        document.getElementById('restartBtn').addEventListener('click', () => this.restartGame());
        document.getElementById('continueBtn').addEventListener('click', () => this.continueGame());
        document.getElementById('reviewVocabBtn').addEventListener('click', () => this.handleReviewVocabBtn());
        document.getElementById('viewVocabBtn').addEventListener('click', () => this.showVocabularyBook());
        
        // 弹窗关闭按钮事件
        const gameOverModal = document.getElementById('gameOverModal');
        const gameOverCloseBtn = gameOverModal.querySelector('.close-btn');
        if (gameOverCloseBtn) {
            gameOverCloseBtn.addEventListener('click', () => {
                this.closeGameOverModal();
            });
        }
        
        const levelUpModal = document.getElementById('levelUpModal');
        const levelUpCloseBtn = levelUpModal.querySelector('.close-btn');
        if (levelUpCloseBtn) {
            levelUpCloseBtn.addEventListener('click', () => {
                this.closeLevelUpModal();
            });
        }
        
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
            
            // 阻止空格键的默认页面滚动行为
            if (e.code === 'Space') {
                e.preventDefault();
            }
            
            // ESC键放弃单词（原来是空格键）
            if (e.code === 'Escape' && this.gameState === 'playing') {
                e.preventDefault();
                this.giveUpCurrentWord();
                return;
            }
            
            // 等级提升弹窗现在自动进入下一级，不需要键盘快捷键
            // if (this.gameState === 'levelup' && (e.code === 'Enter' || e.code === 'Space')) {
            //     e.preventDefault();
            //     this.continueGame();
            //     return;
            // }
            
            // 字母、连字符和句点输入处理（游戏进行中）
            if (this.gameState === 'playing' && e.key.match(/^[a-zA-Z.\-]$/)) {
                e.preventDefault();
                this.handleCharacterInput(e.key.toLowerCase());
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
        
        // 只允许输入字母、连字符和句点，并实时更新显示
        letterInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^a-zA-Z.\-]/g, '').toLowerCase();
            this.updateRealTimeDisplay();
        });
    }
    
    // 处理全局字符输入（字母和连字符）
    handleCharacterInput(char) {
        const letterInput = document.getElementById('letterInput');
        const currentValue = letterInput.value;
        
        // 动态限制：按当前单词缺失字母数限制输入长度
        let maxLen = 3;
        if (this.fallingWords.length > 0 && this.fallingWords[0].missingLetters) {
            maxLen = this.fallingWords[0].missingLetters.length;
        }
        if (currentValue.length < maxLen) {
            letterInput.value = currentValue + char;
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

    // 处理开始按钮点击：根据游戏状态决定开始或结束游戏
    handleStartBtnClick() {
        if (this.gameState === 'playing' || this.gameState === 'paused') {
            // 游戏进行中或暂停时，结束游戏
            console.log('🛑 用户点击结束游戏');
            this.closeAndResetGame();
        } else {
            // 游戏未开始，开始游戏
            this.startGame();
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
        
        // 【已移除】智能检测起始等级
        // 考试/测试模式不应该有难度等级限制
        // 所有单词都从全部词库中随机选择，不受难度限制
        
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
            // 只在第一次等待时打印日志，避免日志刷屏
            if (!this._waitingForVocabulary) {
                this._waitingForVocabulary = true;
                debugLog.info('⏳ 等待单词库加载...');
            }
            setTimeout(() => this.waitForVocabularyAndStart(), 50);
            return;
        }
        
        // 重置等待标志
        this._waitingForVocabulary = false;
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
        console.log('🎯 pauseGame() 被调用，当前状态:', this.gameState);
        if (this.gameState === 'playing') {
            this.gameState = 'paused';
            this.stopSpeaking(); // 暂停时停止朗读
            // 暂停时保存当前错词
            console.log('⏸️ 暂停游戏，准备保存错词...');
            const vocabularyBook = this.vocabularyManager.getVocabularyBook();
            console.log('📚 当前错词本包含:', vocabularyBook.length, '个单词');
            this.saveMissedWordsToGlobal().catch(error => {
                console.error('❌ 保存错词失败:', error);
            });
        } else if (this.gameState === 'paused') {
            console.log('▶️ 恢复游戏...');
            this.gameState = 'playing';
            // 恢复游戏时，如果有单词在下降，重新开始朗读
            if (this.fallingWords.length > 0) {
                this.startRepeatedSpeech(this.fallingWords[0].original);
            }
        } else {
            console.warn('⚠️ 无法暂停，当前状态不是 playing 或 paused:', this.gameState);
        }
        this.updateButtons();
    }

    resetGame(autoStart = false) {
        this.stopSpeaking(); // 重置时停止朗读
        
        // 不再自动清空日志，让用户可以查看历史调试信息
        // 日志会在超过存储限制时自动清理旧记录
        if (typeof debugLog !== 'undefined') {
            debugLog.info('🔄 游戏重置');
        }
        
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
        
        // 重置错词卡名称
        this.lastSavedCardName = null;
        
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
        if (this.cannonSystem && this.cannonSystem.cannon) {
            this.cannonSystem.cannon.angle = -Math.PI / 2;
            this.cannonSystem.cannon.targetAngle = -Math.PI / 2;
        }
        
        // 重置炮弹和爆炸效果
        if (this.cannonSystem) {
            this.cannonSystem.bullets = [];
        }
        if (this.explosionSystem) {
            this.explosionSystem.explosions = [];
            this.explosionSystem.muzzleFlashes = [];
            this.explosionSystem.meaningExplosions = [];
            this.explosionSystem.errorMarks = [];
        }
        
        console.log('🔄 游戏重置，生词本已清空，统计数据已重置，单词池已重置');
        
        this.resetBufferLights();
        // 【修复】不在这里生成 nextWord，让 startGame() 来生成
        this.updateUI();
        this.updateButtons();
        this.clearInput();
        this.hideModals();
        this.updateExamStats(); // 更新考试统计显示
        
        // 🆕 清空图片展示区
        const img = document.getElementById('wordImage');
        if (img) {
            img.src = '';
        }
        
        // 如果指定自动开始，则在重置完成后自动开始游戏
        if (autoStart) {
            setTimeout(() => {
                this.startGame();
                console.log('🎮 重置完成，自动开始游戏');
            }, 200); // 稍微延迟确保重置完成
        }
    }

    restartGame() {
        this.closeAndResetGame();
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
    
    // 显示游戏完成弹窗（正常完成流程）
    async showGameCompletionModal() {
        this.gameState = 'gameOver';

        // 在正常完成时也保存错词卡（与 gameOver 流程保持一致）
        try {
            console.log('💾 正常完成，开始保存错词卡...');
            await this.saveMissedWordsToGlobal();
            console.log('✅ 正常完成错词卡保存完成');
        } catch (e) {
            console.error('❌ 正常完成保存错词卡失败:', e);
        }
        
        // 计算最终统计
        const hitWordsCount = this.hitWords.size;
        const fallenWordsCount = this.fallenWords.size;
        const hitPercentage = fallenWordsCount > 0 ? Math.round((hitWordsCount / fallenWordsCount) * 100) : 0;
        const coveragePercentage = this.totalWords > 0 ? Math.round((hitWordsCount / this.totalWords) * 100) : 0;
        
        // 【修复】使用HTML中实际存在的ID（没有中划线）
        const finalScoreEl = document.getElementById('finalScore');
        const finalLevelEl = document.getElementById('finalLevel');
        const finalVocabularyEl = document.getElementById('finalVocabulary');
        const missedWordsCount = this.vocabularyManager.getVocabularyStats().missedWords;
        
        if (finalScoreEl) finalScoreEl.textContent = this.score;
        if (finalLevelEl) finalLevelEl.textContent = this.level;
        if (finalVocabularyEl) finalVocabularyEl.textContent = missedWordsCount;
        
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
        
        // 根据是否有错词，更新按钮文本
        const reviewVocabBtn = document.getElementById('reviewVocabBtn');
        if (reviewVocabBtn) {
            if (missedWordsCount === 0) {
                reviewVocabBtn.textContent = '结束游戏';
            } else {
                reviewVocabBtn.textContent = '查看错词本';
            }
        }
        
        // 更新错词本显示
        this.updateVocabularyList();
        
        // 检查是否在考试模式
        if (window.examIntegration && window.examIntegration.isInExamMode()) {
            debugLog.info('📝 考试模式完成，提交考试结果');
            window.examIntegration.onExamComplete(hitPercentage);
            return; // 考试模式不显示普通完成弹窗
        }
        
        gameOverModal.style.display = 'block';
        debugLog.success('📊 游戏完成弹窗已显示');
    }

    startBufferCountdown() {
        if (this.bufferState !== 'idle') return;
        
        this.bufferState = 'countdown';
        this.bufferTimer = 0;
        this.resetBufferLights();
        
        // 🆕 红灯开始闪烁时显示图片
        if (this.nextWord) {
            this.updateImageShowcase(this.nextWord.original);
        }
        
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
        
        // 图片已在红灯开始时显示，此处不再需要更新
        
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
        
        // 更新炮管系统
        this.cannonSystem.update();
        
        // 更新下降单词
        this.updateFallingWords();
        
        // 更新所有爆炸特效
        this.explosionSystem.update();
        
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

    async gameOver() {
        this.stopSpeaking(); // 游戏结束时停止朗读
        this.gameState = 'gameOver';
        
        console.log('💀 游戏结束，堆叠区单词数:', this.stackedWords.length);
        
        // 确保堆叠区的单词都已添加到错词本
        // 注意：正常情况下单词在addToStack时已添加，这里是双重保险
        this.stackedWords.forEach(word => {
            this.vocabularyManager.addMissedWord(word);
        });
        
        console.log('📚 游戏结束后错词本统计:', this.vocabularyManager.getVocabularyStats());
        
        // 保存错词到全局错词管理器（用于设置页面显示）
        try {
            console.log('💾 游戏结束，开始保存错词卡...');
            await this.saveMissedWordsToGlobal();
            console.log('✅ 游戏结束错词卡保存完成');
        } catch (e) {
            console.error('❌ 游戏结束保存错词卡失败:', e);
        }
        
        this.saveGameData(); // 保存最终数据
        this.showGameOverModal();
    }

    render() {
        // 委托给渲染引擎
        this.renderer.render();
    }

    // ===== 以下渲染和炮管方法已迁移至 GameRenderer 和 CannonSystem =====
    // 已迁移方法不再保留在主文件中，避免代码冗余
    // ================================================================

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
        
        console.log('🔘 updateButtons() 被调用，gameState:', this.gameState);
        
        switch (this.gameState) {
            case 'stopped':
                startBtn.textContent = '开始游戏';
                startBtn.disabled = false;
                pauseBtn.disabled = true;
                console.log('  ➡️ 暂停按钮已禁用 (stopped 状态)');
                break;
            case 'playing':
                startBtn.textContent = '游戏中';
                startBtn.disabled = false;  // 游戏中可点击，hover 时变为"结束游戏"
                startBtn.classList.remove('end-game-hover');
                pauseBtn.textContent = '暂停';
                pauseBtn.disabled = false;
                console.log('  ➡️ 暂停按钮已启用 (playing 状态)，disabled=', pauseBtn.disabled);
                break;
            case 'paused':
                startBtn.textContent = '已暂停';
                startBtn.disabled = false;  // 暂停时可点击，hover 时变为"结束游戏"
                startBtn.classList.remove('end-game-hover');
                pauseBtn.textContent = '继续';
                pauseBtn.disabled = false;
                console.log('  ➡️ 暂停按钮已启用 (paused 状态)，文本="继续"');
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
            
            // 获取图片 URL（支持 R2 CDN）
            const getImageUrl = (fileName) => {
                if (typeof R2Config !== 'undefined' && R2Config.shouldUseR2()) {
                    return R2Config.getImageUrl(`cache/${fileName}`);
                }
                return `./images/cache/${fileName}`;
            };
            
            // 先使用本地缓存（jpg → jpeg → png）
            const localJpg = getImageUrl(`${word}.jpeg`);
            this.tryLoadImage(img, localJpg, '本地JPEG', () => {
                const localJpeg = getImageUrl(`${word}.jpg`);
                this.tryLoadImage(img, localJpeg, '本地JPG', () => {
                    const localPng = getImageUrl(`${word}.png`);
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
                // 找出错误的位置（最后一个字母）
                const errorIndex = currentInput.length - 1;
                
                // 显示血色红叉
                this.explosionSystem.showErrorMark(currentWord, errorIndex);
                
                // 只删除最后一个错误字母，保留正确的前缀
                const letterInput = document.getElementById('letterInput');
                letterInput.value = currentInput.slice(0, -1);
                
                // 延迟后清除红叉并更新显示
                setTimeout(() => {
                    this.updateRealTimeDisplay();
                }, 300);
                
                return;
            }
            
            // 自动射击：当输入完成且正确时自动击落
            if (currentInput.length === expectedLetters.length && isCorrect) {
                setTimeout(() => {
                    this.cannonSystem.autoShoot(currentWord);
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
        
        // 更新错词本显示
        this.updateVocabularyList();
        
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

    // 处理"查看错词本/结束游戏"按钮点击
    handleReviewVocabBtn() {
        const missedWordsCount = this.vocabularyManager.getVocabularyStats().missedWords;
        
        if (missedWordsCount === 0) {
            // 没有错词，结束游戏并重置
            console.log('✅ 没有错词，结束游戏并重置到初始状态');
            this.closeAndResetGame();
        } else {
            // 有错词，打开错词本
            console.log('📖 有错词，打开错词本');
            this.showVocabularyBook();
        }
    }

    showVocabularyBook() {
        // 检查是否有保存的错词卡
        if (!this.lastSavedCardName) {
            alert('暂无错词卡，请先完成游戏！');
            return;
        }
        
        // 跳转到错词学习页面
        console.log(`📖 打开错词卡学习页面: ${this.lastSavedCardName}`);
        window.location.href = `./study/missed-words-lesson.html?file=${encodeURIComponent(this.lastSavedCardName)}`;
    }

    hideModals() {
        document.getElementById('gameOverModal').style.display = 'none';
        document.getElementById('levelUpModal').style.display = 'none';
    }
    
    /**
     * 关闭弹窗并重置游戏（通用方法）
     * 用于游戏结束后需要重置的场景
     */
    closeAndResetGame() {
        this.hideModals();
        this.resetGame();
    }
    
    /**
     * 关闭游戏结束弹窗（× 按钮）
     */
    closeGameOverModal() {
        this.closeAndResetGame();
    }
    
    /**
     * 关闭等级提升弹窗并恢复游戏
     */
    closeLevelUpModal() {
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
        
        document.getElementById('levelUpModal').style.display = 'none';
        // 恢复游戏状态
        this.gameState = 'playing';
        this.updateButtons();
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
    
    /**
     * 保存错词到全局错词管理器（用于设置页面展示）
     * 将游戏中的所有错词保存为一个错词卡
     */
    async saveMissedWordsToGlobal() {
        console.log('💾 saveMissedWordsToGlobal 开始执行...');
        try {
            // 获取当前错词本中的所有单词
            const vocabularyBook = this.vocabularyManager.getVocabularyBook();
            console.log(`📚 获取到错词本，包含 ${vocabularyBook.length} 个单词:`, vocabularyBook);
            
            if (vocabularyBook.length === 0) {
                console.log('📝 暂无错词需要保存');
                return;
            }
            
            // 确保错词管理器已加载
            if (!window.missedWordsManager) {
                console.warn('⚠️ 错词管理器未加载');
                return;
            }
            
            // 生成错词卡名称（日期 + 时分秒），避免同名冲突且可读
            const now = new Date();
            const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            const timeStr = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
            const cardName = `游戏错词_${dateStr}_${timeStr}`;
            console.log('🏷️ 错词卡名称:', cardName);
            
            // 保存错词卡名称，供 showVocabularyBook() 使用
            this.lastSavedCardName = cardName;
            
            // 获取现有的错词卡（仅用于日志/兼容旧逻辑）
            const allMissedCards = await window.missedWordsManager.getMissedWords();
            console.log('📋 所有错词卡:', allMissedCards.map(c => c.word));
            
            // 由于 cardName 已包含随机后缀，通常不存在同名卡
            let existingCard = allMissedCards.find(card => card.word === cardName);
            console.log('🔍 查找结果:', existingCard ? `找到现有错词卡: ${existingCard.word}` : '未找到现有错词卡');
            
            // 如果存在同名错词卡，获取其中的单词
            let existingWords = [];
            if (existingCard) {
                try {
                    existingWords = JSON.parse(existingCard.meaning);
                } catch (e) {
                    existingWords = [];
                }
            }
            
            // 合并单词，去重（以单词为key）
            const wordMap = new Map();
            
            // 先添加已存在的单词
            existingWords.forEach(w => {
                if (w.word) {
                    wordMap.set(w.word.toLowerCase(), w);
                }
            });
            
            // 添加新的错词，如果已存在则更新（增加错误次数）
            vocabularyBook.forEach(word => {
                const key = (word.word || word.original).toLowerCase();
                const existing = wordMap.get(key);
                
                if (existing) {
                    // 如果已存在，增加错误次数
                    existing.errorCount = (existing.errorCount || 1) + 1;
                } else {
                    // 新单词
                    wordMap.set(key, {
                        word: word.word || word.original,
                        phonetic: word.phonetic || '',
                        meaning: word.meaning || '',
                        errorCount: 1
                    });
                }
            });
            
            // 转换为数组
            const mergedWords = Array.from(wordMap.values());
            
            // 保存为错词卡（不使用IP）
            const allMissedWordsData = JSON.parse(
                localStorage.getItem('wordTetris_missedWords') || '{}'
            );
            console.log('📦 当前 localStorage 中的所有错词卡 keys:', Object.keys(allMissedWordsData));
            
            // 检测存储空间（不阻止保存，仅警告）
            try {
                const testKey = '__storage_test__';
                localStorage.setItem(testKey, 'test');
                localStorage.removeItem(testKey);
            } catch (e) {
                if (e.name === 'QuotaExceededError') {
                    console.warn('⚠️ 存储空间可能不足，但继续尝试保存错词卡');
                    // 不阻止保存，避免游戏数据丢失
                }
            }
            
            // 生成key：直接使用错词卡名称（小写），不使用IP
            const key = cardName.toLowerCase();
            console.log('🔑 生成的 key:', key);
            console.log('🔍 检查 key 是否存在:', allMissedWordsData[key] ? '存在' : '不存在');
            
            const now2 = Date.now();
            
            if (allMissedWordsData[key]) {
                // 更新现有错词卡
                console.log('♻️ 更新现有错词卡...');
                allMissedWordsData[key].meaning = JSON.stringify(mergedWords);
                allMissedWordsData[key].lastUpdate = now2;
                allMissedWordsData[key].count++;
                console.log('✅ 更新完成，新的 count:', allMissedWordsData[key].count);
            } else {
                // 创建新错词卡（不使用IP）
                console.log('➕ 创建新错词卡...');
                allMissedWordsData[key] = {
                    word: cardName,
                    phonetic: `包含 ${mergedWords.length} 个单词`,
                    meaning: JSON.stringify(mergedWords),
                    count: 1,
                    createTime: now2,
                    lastUpdate: now2
                };
            }
            
            localStorage.setItem('wordTetris_missedWords', JSON.stringify(allMissedWordsData));
            console.log('💾 已写入 localStorage');
            
            console.log(`✅ 已保存错词卡"${cardName}"，包含 ${mergedWords.length} 个单词（去重后）`);
        } catch (error) {
            if (error.name === 'QuotaExceededError') {
                console.error('❌ 存储空间不足，无法保存错词卡');
                alert('⚠️ 存储空间不足，错词卡保存失败。请前往设置页面清理或导出错词数据。');
            } else {
                console.error('❌ 保存错词到全局管理器失败:', error);
            }
        }
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
document.addEventListener('DOMContentLoaded', async () => {
    const game = new WordTetrisGame();
    
    // 初始化考试集成模块
    let isExamMode = false;
    if (typeof ExamIntegration !== 'undefined') {
        window.examIntegration = new ExamIntegration();
        // 🔧 修复：await 考试集成初始化，确保考试词库加载完成后再初始化统计
        isExamMode = await window.examIntegration.init(game);
        console.log('📝 考试集成模块已初始化', isExamMode ? '(考试模式)' : '(普通模式)');
    }
    
    // 🔧 修复：考试词库加载完成后，再初始化统计
    // 这样可以确保 totalWords 使用的是正确的词库数量
    await game.initExamStats();
    console.log('📊 考试统计已初始化');
    
    // 页面加载时自动重置游戏（只在非考试模式下）
    // 考试模式下，startExamMode 已经调用了 startGame()
    if (!isExamMode) {
        setTimeout(() => {
            game.resetGame();
            console.log('🔄 页面刷新，自动重置游戏');
        }, 100); // 稍微延迟确保初始化完成
    }
    
    // 页面卸载时清除临时练习单词
    window.addEventListener('beforeunload', () => {
        if (localStorage.getItem('wordTetris_tempPracticeWords')) {
            localStorage.removeItem('wordTetris_tempPracticeWords');
            console.log('🗑️ 页面卸载，已清除临时练习单词');
        }
    });
});

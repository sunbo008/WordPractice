// 游戏主类
class WordTetrisGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.vocabularyManager = new VocabularyManager();
        
        // 高清屏适配
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
        
        // 评分系统
        this.combo = 0; // 连击数
        this.perfectLevel = true; // 当前等级是否完美
        this.lastHitTime = 0; // 上次击中时间
        this.levelWordCount = 0; // 当前等级单词数
        
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
        
        // 画布设置（逻辑尺寸）
        this.canvasWidth = 600;
        this.canvasHeight = 500;
        this.bufferHeight = 80;
        this.gameAreaTop = this.bufferHeight;
        this.gameAreaHeight = this.canvasHeight - this.bufferHeight;
        
        // 炮管系统
        this.cannon = {
            x: this.canvasWidth / 2,
            y: this.canvasHeight - 30,
            width: 40,
            height: 60,
            angle: -Math.PI / 2, // 初始向上
            targetAngle: -Math.PI / 2
        };
        
        // 炮弹系统
        this.bullets = [];
        
        // 爆炸效果系统
        this.explosions = [];
        
        // 中文翻译爆炸动画系统
        this.meaningExplosions = [];
        
        // 错误标记系统
        this.errorMarks = []; // 存储错误红叉标记
        
        // 语音朗读系统
        this.speechEnabled = true;
        this.currentSpeech = null;
        this.speechTimer = null;
        this.setupSpeechSynthesis();
        
        this.init();
    }

    setupSpeechSynthesis() {
        console.log('初始化语音合成系统...');
        
        // 检查浏览器是否支持语音合成
        if ('speechSynthesis' in window) {
            this.speechSynthesis = window.speechSynthesis;
            console.log('✅ 浏览器支持 Web Speech API');
            
            // 等待语音列表加载
            const voices = this.speechSynthesis.getVoices();
            console.log('当前可用语音数量:', voices.length);
            
            if (voices.length === 0) {
                console.log('⏳ 语音列表未加载，等待 voiceschanged 事件...');
                this.speechSynthesis.addEventListener('voiceschanged', () => {
                    console.log('📢 voiceschanged 事件触发');
                    this.selectBritishVoice();
                });
            } else {
                this.selectBritishVoice();
            }
        } else {
            console.error('❌ 浏览器不支持语音合成功能');
            this.speechEnabled = false;
        }
    }

    selectBritishVoice() {
        // 获取所有可用的语音
        const voices = this.speechSynthesis.getVoices();
        console.log('正在选择语音，可用数量:', voices.length);
        
        // 打印前几个语音供调试
        if (voices.length > 0) {
            console.log('可用语音示例:', voices.slice(0, 5).map(v => `${v.name} (${v.lang})`));
        }
        
        // 尝试找到英式英语语音
        this.britishVoice = voices.find(voice => 
            voice.lang === 'en-GB' || 
            voice.name.includes('British') || 
            voice.name.includes('UK') ||
            voice.name.includes('Daniel') ||
            voice.name.includes('Kate')
        );
        
        // 如果没有英式语音，使用任何英语语音
        if (!this.britishVoice) {
            this.britishVoice = voices.find(voice => 
                voice.lang.startsWith('en-')
            );
        }
        
        if (this.britishVoice) {
            console.log('✅ 已选择语音:', this.britishVoice.name, '(', this.britishVoice.lang, ')');
        } else {
            console.warn('⚠️ 未找到合适的英语语音，将使用默认语音');
        }
    }

    speakWord(word) {
        // 检查是否启用语音
        if (!this.speechEnabled || !this.speechSynthesis) {
            console.log('语音未启用或不支持');
            return;
        }

        // 如果没有语音，尝试重新获取
        if (!this.britishVoice) {
            this.selectBritishVoice();
        }

        // 创建新的语音合成实例
        const utterance = new SpeechSynthesisUtterance(word);
        
        // 设置语音（如果有的话）
        if (this.britishVoice) {
            utterance.voice = this.britishVoice;
        }
        
        utterance.lang = 'en-GB';
        utterance.rate = 0.9; // 稍微慢一点，便于听清
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        // 添加错误处理
        utterance.onerror = (event) => {
            console.error('语音朗读错误:', event.error, event);
        };

        utterance.onstart = () => {
            console.log('开始朗读:', word);
        };

        utterance.onend = () => {
            console.log('朗读完成:', word);
        };

        // 播放语音
        this.currentSpeech = utterance;
        this.speechSynthesis.speak(utterance);

        console.log('已发送朗读请求:', word, '语音:', this.britishVoice ? this.britishVoice.name : '默认');
    }

    startRepeatedSpeech(word) {
        console.log('开始重复朗读:', word);
        
        // 先停止之前的朗读
        this.stopSpeaking();
        
        // 立即播放第一次
        this.speakWord(word);

        // 设置定时器，每5秒重复播放
        this.speechTimer = setInterval(() => {
            console.log('定时重复朗读:', word);
            this.speakWord(word);
        }, 5000); // 5秒 = 5000毫秒
    }

    stopSpeaking() {
        // 取消定时器
        if (this.speechTimer) {
            clearInterval(this.speechTimer);
            this.speechTimer = null;
        }

        // 停止当前语音
        if (this.speechSynthesis) {
            this.speechSynthesis.cancel();
        }

        this.currentSpeech = null;
    }

    toggleSpeech() {
        this.speechEnabled = !this.speechEnabled;
        
        const btn = document.getElementById('toggleSpeechBtn');
        if (this.speechEnabled) {
            btn.textContent = '🔊 语音开';
            btn.classList.remove('disabled');
            
            // 如果有单词在下降且游戏正在进行，重新开始朗读
            if (this.gameState === 'playing' && this.fallingWords.length > 0) {
                this.startRepeatedSpeech(this.fallingWords[0].original);
            }
        } else {
            btn.textContent = '🔇 语音关';
            btn.classList.add('disabled');
            this.stopSpeaking();
        }
        
        console.log('语音', this.speechEnabled ? '开启' : '关闭');
    }

    setupHighDPICanvas() {
        // 获取设备像素比
        const dpr = window.devicePixelRatio || 1;
        
        // 获取Canvas的显示尺寸（CSS尺寸）
        const displayWidth = 600;
        const displayHeight = 500;
        
        // 设置Canvas的实际像素尺寸
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
    }

    init() {
        this.loadGameData();
        this.bindEvents();
        this.updateUI();
        this.generateNextWord();
        this.gameLoop();
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
        document.getElementById('resetBtn').addEventListener('click', () => this.resetGame());
        // 提交按钮已移除，使用实时输入自动射击机制
        document.getElementById('giveUpBtn').addEventListener('click', () => this.giveUpCurrentWord());
        document.getElementById('reviewBtn').addEventListener('click', () => this.startReviewMode());
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
            if (e.code === 'Space' && this.gameState === 'playing') {
                e.preventDefault(); // 防止页面滚动
                this.giveUpCurrentWord();
            }
        });
        
        // 只允许输入字母，并实时更新显示
        letterInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^a-zA-Z]/g, '').toUpperCase();
            this.updateRealTimeDisplay();
        });
    }

    startGame() {
        this.gameState = 'playing';
        this.startTime = Date.now();
        this.updateButtons();
        this.startBufferCountdown();
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

    resetGame() {
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
        this.bufferState = 'idle';
        this.bufferTimer = 0;
        this.spawnTimer = 0;
        this.speedMultiplier = 1.0;
        this.wordSpeed = this.baseSpeed;
        this.resetBufferLights();
        this.generateNextWord();
        this.updateUI();
        this.updateButtons();
        this.clearInput();
        this.hideModals();
    }

    restartGame() {
        this.hideModals();
        this.resetGame();
        this.startGame();
    }

    continueGame() {
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
            // 击落成功 - 计算分数
            let points = this.calculateScore(hitWord);
            this.score += points;
            this.combo++;
            this.lastHitTime = Date.now();
            
            this.showHitEffect(hitWord, points);
            this.clearInput();
            
            // 检查是否升级
            if (this.score >= this.targetScore) {
                this.levelUp();
            }
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
        
        // 收集当前堆叠的单词到生词本
        this.stackedWords.forEach(word => {
            this.vocabularyManager.addMissedWord(word);
        });
        
        const vocabularyStats = this.vocabularyManager.getVocabularyStats();
        
        // 清空堆叠区
        this.stackedWords = [];
        
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
        
        // 显示升级弹窗
        this.showLevelUpModal(vocabularyStats.totalWords);
        
        // 清空当前等级生词本
        this.vocabularyManager.clearCurrentLevelVocabulary();
        
        // 保存游戏数据
        this.saveGameData();
    }

    generateNextWord() {
        // 检查是否为等级末尾挑战（最后10个单词）
        const wordsUntilNextLevel = Math.ceil((this.targetScore - this.score) / 2); // 假设平均2分/单词
        const isEndChallenge = wordsUntilNextLevel <= 10;
        
        this.nextWord = this.vocabularyManager.getRandomWord(this.level, isEndChallenge);
        this.levelWordCount++;
        this.updateNextWordDisplay();
    }

    startBufferCountdown() {
        if (this.bufferState !== 'idle') return;
        
        this.bufferState = 'countdown';
        this.bufferTimer = 0;
        this.resetBufferLights();
    }

    updateBufferCountdown() {
        if (this.bufferState !== 'countdown') return;
        
        this.bufferTimer++;
        
        if (this.bufferTimer === 60) { // 1秒
            this.bufferLights.red = true;
        } else if (this.bufferTimer === 120) { // 2秒
            this.bufferLights.yellow = true;
        } else if (this.bufferTimer === 180) { // 3秒
            this.bufferLights.green = true;
            this.releaseWord();
        }
        
        this.updateBufferLights();
    }

    releaseWord() {
        if (!this.nextWord) return;
        
        // 创建下降单词
        const fallingWord = {
            ...this.nextWord,
            x: this.canvasWidth / 2,
            y: this.gameAreaTop,
            width: this.nextWord.display.length * 30,
            height: 40,
            spawnTime: Date.now() // 添加生成时间戳
        };
        
        this.fallingWords.push(fallingWord);
        
        // 开始语音朗读（立即播放，并每5秒重复）
        this.startRepeatedSpeech(this.nextWord.original);
        
        // 重置缓冲区
        this.bufferState = 'idle';
        this.bufferTimer = 0;
        this.resetBufferLights();
        this.updateBufferLights();
        
        // 生成下一个单词
        this.generateNextWord();
    }

    updateGame() {
        if (this.gameState !== 'playing') return;
        
        // 更新游戏时间
        if (this.startTime) {
            this.gameTime = Math.floor((Date.now() - this.startTime) / 1000);
        }
        
        // 更新缓冲区倒计时
        this.updateBufferCountdown();
        
        // 更新生成计时器 - 只有当没有下降单词时才生成新单词
        this.spawnTimer++;
        if (this.spawnTimer >= this.spawnRate && this.bufferState === 'idle' && this.fallingWords.length === 0) {
            this.startBufferCountdown();
            this.spawnTimer = 0;
        }
        
        // 更新下降单词
        this.updateFallingWords();
        
        // 更新炮弹
        this.updateBullets();
        
        // 更新爆炸效果
        this.updateExplosions();
        
        // 更新中文翻译爆炸动画
        this.updateMeaningExplosions();
        
        // 更新错误标记
        this.updateErrorMarks();
        
        // 检查游戏结束条件
        this.checkGameOver();
    }

    updateFallingWords() {
        for (let i = this.fallingWords.length - 1; i >= 0; i--) {
            const word = this.fallingWords[i];
            word.y += this.wordSpeed;
            
            // 检查是否到达底部
            if (word.y + word.height >= this.canvasHeight) {
                // 停止语音朗读
                this.stopSpeaking();
                
                // 移到堆叠区 - 标记为失败（非放弃）
                this.fallingWords.splice(i, 1);
                word.giveUp = false; // 确保标记为失败而非放弃
                this.addToStack(word);
                
                // 失败也会重置连击和完美状态
                this.combo = 0;
                this.perfectLevel = false;
                
                // 更新统计
                this.totalWordsFailed = (this.totalWordsFailed || 0) + 1;
            }
        }
    }

    addToStack(word) {
        // 添加到生词本
        this.vocabularyManager.addMissedWord(word);
        
        // 计算堆叠位置（按新的布局）
        const wordsPerRow = 5;
        const row = Math.floor(this.stackedWords.length / wordsPerRow);
        const col = this.stackedWords.length % wordsPerRow;
        
        word.stackRow = row;
        word.stackCol = col;
        
        this.stackedWords.push(word);
    }

    checkGameOver() {
        // 检查堆叠是否到达顶部（接近缓冲区）
        const wordsPerRow = 5;
        const wordHeight = 27; // 25 + 2 padding
        const maxRows = Math.floor((this.gameAreaHeight - 50) / wordHeight);
        const currentRows = Math.ceil(this.stackedWords.length / wordsPerRow);
        
        if (currentRows >= maxRows) {
            this.gameOver();
        }
    }

    gameOver() {
        this.stopSpeaking(); // 游戏结束时停止朗读
        this.gameState = 'gameOver';
        this.saveGameData(); // 保存最终数据
        this.showGameOverModal();
    }

    render() {
        // 清空画布
        this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
        
        // 绘制背景
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
        
        // 绘制中文翻译爆炸动画（在粒子之上）
        this.drawMeaningExplosions();
        
        // 绘制错误标记
        this.drawErrorMarks();
        
        // 绘制UI元素
        this.drawGameInfo();
    }

    drawBackground() {
        // 游戏区域背景
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.fillRect(0, this.gameAreaTop, this.canvasWidth, this.gameAreaHeight);
        
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
            this.ctx.font = '24px Arial';
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
        this.ctx.font = '20px Arial';
        this.ctx.textAlign = 'center';
        
        // 如果有实时显示，需要特殊处理高亮
        if (word.realTimeDisplay) {
            // 解析带有[]的文本
            const parts = text.split(/(\[[^\]]*\])/);
            let currentX = x - (this.ctx.measureText(text.replace(/[\[\]]/g, '')).width / 2);
            
            parts.forEach(part => {
                if (part.startsWith('[') && part.endsWith(']')) {
                    // 输入的字母，绿色高亮
                    const letter = part.slice(1, -1);
                    this.ctx.fillStyle = word.inputCorrect ? '#44ff44' : '#ff4444';
                    this.ctx.fillText(letter, currentX + this.ctx.measureText(letter).width/2, y);
                    currentX += this.ctx.measureText(letter).width;
                } else {
                    // 普通字母
                    this.ctx.fillStyle = '#ffffff';
                    this.ctx.fillText(part, currentX + this.ctx.measureText(part).width/2, y);
                    currentX += this.ctx.measureText(part).width;
                }
            });
        } else {
            // 普通显示
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fillText(text, x, y);
            
            // 为缺失字母添加红色下划线
            if (word.missing && word.missing.length > 0) {
                this.drawMissingLetterUnderlines(word, x, y);
            }
        }
    }

    drawMissingLetterUnderlines(word, centerX, textY) {
        const text = word.original;
        const charWidth = this.ctx.measureText('M').width; // 估算字符宽度
        const totalWidth = this.ctx.measureText(text).width;
        const startX = centerX - totalWidth / 2;
        
        this.ctx.strokeStyle = '#ff4444';
        this.ctx.lineWidth = 2;
        
        word.missing.forEach(index => {
            const charX = startX + (charWidth * index);
            this.ctx.beginPath();
            this.ctx.moveTo(charX, textY + 5);
            this.ctx.lineTo(charX + charWidth, textY + 5);
            this.ctx.stroke();
        });
    }

    drawStackedWords() {
        // 按设计方案显示堆叠单词：每行多个单词，从底部向上堆叠
        const wordsPerRow = 5; // 每行5个单词
        const wordWidth = 100;
        const wordHeight = 25;
        const padding = 10;
        
        this.stackedWords.forEach((word, index) => {
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
            
            // 单词文本
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '14px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(word.original, x + wordWidth/2, y + wordHeight/2 + 5);
            
            // 显示中文意思（小字）
            this.ctx.fillStyle = '#cccccc';
            this.ctx.font = '10px Arial';
            this.ctx.fillText(word.meaning || '', x + wordWidth/2, y + wordHeight - 3);
        });
    }

    drawCannon() {
        if (this.gameState !== 'playing' && this.gameState !== 'review') return;
        
        // 更新炮管瞄准角度
        if (this.fallingWords.length > 0) {
            const targetWord = this.fallingWords[0];
            const dx = targetWord.x - this.cannon.x;
            const dy = targetWord.y - this.cannon.y;
            this.cannon.targetAngle = Math.atan2(dy, dx) - Math.PI / 2;
        }
        
        // 平滑过渡炮管角度
        const angleDiff = this.cannon.targetAngle - this.cannon.angle;
        this.cannon.angle += angleDiff * 0.1;
        
        this.ctx.save();
        this.ctx.translate(this.cannon.x, this.cannon.y);
        this.ctx.rotate(this.cannon.angle + Math.PI / 2);
        
        // 绘制炮管底座
        this.ctx.fillStyle = '#555555';
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 20, 0, Math.PI * 2);
        this.ctx.fill();
        
        // 绘制炮管
        this.ctx.fillStyle = '#888888';
        this.ctx.fillRect(-8, -40, 16, 40);
        
        // 炮管边缘高光
        this.ctx.fillStyle = '#aaaaaa';
        this.ctx.fillRect(-8, -40, 4, 40);
        
        // 炮口
        this.ctx.fillStyle = '#333333';
        this.ctx.fillRect(-10, -42, 20, 4);
        
        this.ctx.restore();
    }

    drawBullets() {
        this.bullets.forEach(bullet => {
            // 绘制炮弹轨迹（橙色/黄色光束）
            const gradient = this.ctx.createLinearGradient(
                bullet.startX, bullet.startY,
                bullet.x, bullet.y
            );
            gradient.addColorStop(0, 'rgba(255, 165, 0, 0.8)');
            gradient.addColorStop(0.5, 'rgba(255, 215, 0, 1)');
            gradient.addColorStop(1, 'rgba(255, 255, 0, 0.6)');
            
            this.ctx.strokeStyle = gradient;
            this.ctx.lineWidth = 4;
            this.ctx.lineCap = 'round';
            
            this.ctx.beginPath();
            this.ctx.moveTo(bullet.startX, bullet.startY);
            this.ctx.lineTo(bullet.x, bullet.y);
            this.ctx.stroke();
            
            // 绘制炮弹头部（发光效果）
            const glowGradient = this.ctx.createRadialGradient(
                bullet.x, bullet.y, 0,
                bullet.x, bullet.y, 8
            );
            glowGradient.addColorStop(0, 'rgba(255, 255, 0, 1)');
            glowGradient.addColorStop(1, 'rgba(255, 165, 0, 0)');
            
            this.ctx.fillStyle = glowGradient;
            this.ctx.beginPath();
            this.ctx.arc(bullet.x, bullet.y, 8, 0, Math.PI * 2);
            this.ctx.fill();
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
    }

    updateButtons() {
        const startBtn = document.getElementById('startBtn');
        const pauseBtn = document.getElementById('pauseBtn');
        const reviewBtn = document.getElementById('reviewBtn');
        
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
        
        const hasVocabulary = this.vocabularyManager.getVocabularyStats().totalWords > 0;
        reviewBtn.disabled = !hasVocabulary;
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

    updateRealTimeDisplay() {
        if ((this.gameState !== 'playing' && this.gameState !== 'review') || this.fallingWords.length === 0) return;
        
        const currentInput = document.getElementById('letterInput').value.toUpperCase();
        const currentWord = this.fallingWords[0]; // 假设只有一个下降单词
        
        if (currentWord && currentInput.length > 0) {
            // 创建实时显示的单词
            const expectedLetters = currentWord.missingLetters.toUpperCase();
            let displayWord = currentWord.original;
            let inputIndex = 0;
            
            // 替换缺失的字母为输入的字母
            for (let i = 0; i < currentWord.missing.length && inputIndex < currentInput.length; i++) {
                const missingIndex = currentWord.missing[i];
                displayWord = displayWord.substring(0, missingIndex) + 
                             `[${currentInput[inputIndex]}]` + 
                             displayWord.substring(missingIndex + 1);
                inputIndex++;
            }
            
            // 检查输入是否正确
            const isCorrect = currentInput === expectedLetters.substring(0, currentInput.length);
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
        // 创建炮弹对象
        const bullet = {
            startX: this.cannon.x,
            startY: this.cannon.y - 40,
            x: this.cannon.x,
            y: this.cannon.y - 40,
            targetX: targetWord.x,
            targetY: targetWord.y + targetWord.height / 2,
            speed: 15,
            targetWord: targetWord
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
            
            // 更新炮弹位置
            bullet.x += bullet.vx;
            bullet.y += bullet.vy;
            
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
        
        // 显示击中效果
        this.showHitEffect(word, points);
        this.clearInput();
        
        // 检查是否升级（非复习模式）
        if (this.gameState === 'playing' && this.score >= this.targetScore) {
            this.levelUp();
        }
        
        // 复习模式处理
        if (this.reviewMode && this.reviewMode.isActive) {
            this.reviewMode.correctCount++;
            this.reviewMode.currentIndex++;
            setTimeout(() => this.startReviewWord(), 1000); // 1秒后下一个单词
        }
        
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
        if (this.gameState !== 'playing' || this.fallingWords.length === 0) return;
        
        // 停止语音朗读
        this.stopSpeaking();
        
        const currentWord = this.fallingWords[0];
        
        // 移除下降单词
        this.fallingWords.splice(0, 1);
        
        // 放弃惩罚：-1分
        this.score = Math.max(0, this.score - 1);
        
        // 重置连击
        this.combo = 0;
        this.perfectLevel = false;
        
        // 标记为放弃的单词
        currentWord.giveUp = true;
        
        // 更新统计
        this.totalWordsGivenUp = (this.totalWordsGivenUp || 0) + 1;
        
        // 添加到堆叠区
        this.addToStack(currentWord);
        
        // 清空输入
        this.clearInput();
        
        // 显示放弃效果
        this.showGiveUpEffect(currentWord);
        
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
        document.getElementById('finalVocabulary').textContent = this.vocabularyManager.getVocabularyStats().totalWords;
        document.getElementById('gameOverModal').style.display = 'block';
    }

    showLevelUpModal(vocabularyCount) {
        document.getElementById('newLevel').textContent = this.level;
        document.getElementById('levelVocabulary').textContent = vocabularyCount;
        document.getElementById('levelUpModal').style.display = 'block';
    }

    showVocabularyBook() {
        // 这里可以实现一个详细的生词本查看界面
        alert('生词本功能开发中...');
    }

    hideModals() {
        document.getElementById('gameOverModal').style.display = 'none';
        document.getElementById('levelUpModal').style.display = 'none';
    }

    startReviewMode() {
        const vocabularyBook = this.vocabularyManager.getVocabularyBook();
        if (vocabularyBook.length === 0) {
            alert('生词本为空，无法开始复习模式！');
            return;
        }
        
        // 切换到复习模式
        this.gameState = 'review';
        this.reviewMode = {
            isActive: true,
            currentIndex: 0,
            reviewWords: [...vocabularyBook],
            correctCount: 0,
            totalCount: vocabularyBook.length
        };
        
        this.startReviewWord();
        this.updateButtons();
    }

    startReviewWord() {
        if (!this.reviewMode || this.reviewMode.currentIndex >= this.reviewMode.reviewWords.length) {
            this.endReviewMode();
            return;
        }
        
        const currentReviewWord = this.reviewMode.reviewWords[this.reviewMode.currentIndex];
        this.nextWord = this.vocabularyManager.getReviewWord(currentReviewWord);
        
        // 清空游戏区域
        this.fallingWords = [];
        this.clearInput();
        
        // 立即开始缓冲区倒计时
        this.startBufferCountdown();
        
        this.updateNextWordDisplay();
    }

    endReviewMode() {
        const correctRate = (this.reviewMode.correctCount / this.reviewMode.totalCount * 100).toFixed(1);
        
        alert(`复习完成！\n正确率: ${correctRate}%\n复习单词: ${this.reviewMode.totalCount}个\n正确: ${this.reviewMode.correctCount}个`);
        
        // 退出复习模式
        this.reviewMode = null;
        this.gameState = 'stopped';
        this.updateButtons();
    }

    exportVocabulary() {
        const vocabularyBook = this.vocabularyManager.getVocabularyBook();
        if (vocabularyBook.length === 0) {
            alert('生词本为空，无法导出！');
            return;
        }
        
        // 创建CSV格式的数据
        let csvContent = "单词,中文意思,总错误次数,放弃次数,失败次数,等级\n";
        
        vocabularyBook.forEach(word => {
            csvContent += `${word.word},${word.meaning},${word.count},${word.giveUpCount || 0},${word.failCount || 0},${word.level}\n`;
        });
        
        // 创建下载链接
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `生词本_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        alert(`成功导出 ${vocabularyBook.length} 个生词到CSV文件！`);
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
});

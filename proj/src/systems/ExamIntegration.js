/**
 * 考试模式集成模块
 * 负责将考级系统与游戏核心逻辑对接
 */

class ExamIntegration {
    constructor() {
        this.certSystem = null;
        this.certStorage = null;
        this.badgeArea = null;
        this.isExamMode = false;
        this.examConfig = null;
        this.game = null;
        this.previousGameMode = null; // 保存考试前的游戏模式
        this.testMode = false; // 测试模式：跳过解锁和冷却检查
    }

    /**
     * 初始化考试集成
     * @returns {Promise<boolean>} 返回是否进入了考试模式
     */
    async init(game) {
        this.game = game;
        
        if (typeof CertificationStorage !== 'undefined' && typeof CertificationSystem !== 'undefined') {
            this.certStorage = new CertificationStorage();
            this.certSystem = new CertificationSystem();
        }
        
        if (typeof BadgeArea !== 'undefined' && window.badgeArea) {
            this.badgeArea = window.badgeArea;
        }
        
        // 🔧 修复：需要 await 考试模式初始化，确保词库加载完成后再继续
        // 检查 URL 参数是否有考试模式
        const urlExamStarted = await this.checkExamModeFromUrl();
        
        // 检查 sessionStorage 是否有待进行的考试
        const pendingExamStarted = await this.checkPendingExam();
        
        return urlExamStarted || pendingExamStarted;
    }

    /**
     * 从 URL 参数检查考试模式
     * @returns {Promise<boolean>} 返回是否启动了考试模式
     */
    async checkExamModeFromUrl() {
        const params = new URLSearchParams(window.location.search);
        
        // 检查测试模式
        this.testMode = params.get('test') === '1';
        if (this.testMode) {
            console.log('🧪 考试测试模式已启用 - 跳过解锁和冷却检查');
        }
        
        if (params.get('mode') === 'exam') {
            const series = params.get('series');
            const major = params.get('major');
            const minor = params.get('minor');
            
            if (series) {
                // 🔧 修复：await 考试模式启动，确保词库加载完成
                await this.startExamMode(series, major, minor);
                return true;
            }
        }
        return false;
    }

    /**
     * 检查待进行的考试
     * @returns {Promise<boolean>} 返回是否启动了考试模式
     */
    async checkPendingExam() {
        const pending = sessionStorage.getItem('currentExam');
        if (pending) {
            try {
                const examInfo = JSON.parse(pending);
                // 清除待处理状态
                sessionStorage.removeItem('currentExam');
                // 🔧 修复：await 考试模式启动，确保词库加载完成
                await this.startExamMode(examInfo.series, examInfo.majorLevel, examInfo.minorLevel);
                return true;
            } catch (e) {
                console.error('解析考试信息失败:', e);
            }
        }
        return false;
    }

    /**
     * 开始考试模式
     */
    async startExamMode(series, majorLevel, minorLevel) {
        if (!this.certSystem) {
            alert('考级系统未加载，无法开始考试');
            return false;
        }

        // 检查是否可以开始考试（测试模式下跳过）
        if (!this.testMode) {
            const canStart = this.certSystem.canStartExam(series, majorLevel, minorLevel);
            if (!canStart.allowed) {
                alert(canStart.reason);
                return false;
            }
        } else {
            console.log('🧪 测试模式：跳过考试解锁和冷却检查');
        }

        // 🔥 考试必须使用挑战模式
        this.previousGameMode = localStorage.getItem('wordTetris_gameMode') || 'casual';
        localStorage.setItem('wordTetris_gameMode', 'challenge');
        console.log(`🔥 考试模式：强制切换到挑战模式（原模式: ${this.previousGameMode}）`);
        
        // 同步更新游戏对象的模式
        if (this.game) {
            this.game.gameMode = 'challenge';
        }

        this.isExamMode = true;
        this.examConfig = {
            series,
            majorLevel,
            minorLevel,
            startTime: Date.now()
        };

        // 更新 UI 显示考试模式
        this.showExamModeUI();

        // 加载对应的词库（等待完成）
        await this.loadExamVocabulary(series, majorLevel, minorLevel);

        console.log(`📝 考试模式已启动: ${this.certSystem.getLevelDisplayName(series, majorLevel, minorLevel)}`);
        
        // 🎮 自动开始游戏
        if (this.game) {
            console.log('🎮 考试模式：自动开始游戏');
            this.game.startGame();
        }
        
        return true;
    }

    /**
     * 显示考试模式 UI
     */
    showExamModeUI() {
        // 创建考试模式指示器
        let examIndicator = document.getElementById('examModeIndicator');
        if (!examIndicator) {
            examIndicator = document.createElement('div');
            examIndicator.id = 'examModeIndicator';
            examIndicator.style.cssText = `
                position: fixed;
                top: 10px;
                right: 10px;
                padding: 10px 20px;
                background: linear-gradient(135deg, #ff6b6b, #cc4444);
                border: 2px solid #ffd700;
                border-radius: 8px;
                color: white;
                font-weight: bold;
                font-size: 14px;
                z-index: 1000;
                box-shadow: 0 4px 15px rgba(255, 107, 107, 0.4);
                animation: pulse-exam 2s ease-in-out infinite;
            `;
            document.body.appendChild(examIndicator);
            
            // 添加动画样式
            const style = document.createElement('style');
            style.textContent = `
                @keyframes pulse-exam {
                    0%, 100% { box-shadow: 0 4px 15px rgba(255, 107, 107, 0.4); }
                    50% { box-shadow: 0 4px 25px rgba(255, 107, 107, 0.7); }
                }
            `;
            document.head.appendChild(style);
        }

        const levelName = this.certSystem.getLevelDisplayName(
            this.examConfig.series,
            this.examConfig.majorLevel,
            this.examConfig.minorLevel
        );
        examIndicator.innerHTML = `📝 考试中: ${levelName} <span style="font-size: 12px; opacity: 0.8;">🔥挑战模式</span>`;
        examIndicator.style.display = 'block';
    }

    /**
     * 隐藏考试模式 UI
     */
    hideExamModeUI() {
        const examIndicator = document.getElementById('examModeIndicator');
        if (examIndicator) {
            examIndicator.style.display = 'none';
        }
    }

    /**
     * 加载考试对应的词库
     * 🔧 修复：根据考试类型从对应的词库文件加载单词，而非使用当前启用的词库
     */
    async loadExamVocabulary(series, majorLevel, minorLevel) {
        console.log(`📚 准备加载考试词库: ${series}/${majorLevel}/${minorLevel}`);
        
        // 获取考试配置（范围和单词数量）
        const examInfo = this.certSystem.getExamInfo(series, majorLevel, minorLevel);
        const targetWordCount = examInfo.wordCount;
        
        // wordCount=0 表示加载全部单词
        const loadAllWords = targetWordCount === 0;
        console.log(`📊 考试配置: ${examInfo.scope}, 目标单词数: ${loadAllWords ? '全部' : targetWordCount}`);
        
        // 获取词库管理器（从 game 实例获取）
        const vm = this.game?.vocabularyManager;
        
        if (!vm) {
            console.warn('⚠️ 词库管理器未找到');
            return;
        }
        
        // 保存原始单词池
        if (!this._originalAllWords) {
            this._originalAllWords = [...vm.allWords];
            console.log(`💾 已备份原始词库: ${this._originalAllWords.length} 个单词`);
        }
        
        // 🔧 根据考试类型获取对应的词库文件列表
        const examFiles = await this.getExamVocabularyFiles(series, majorLevel, minorLevel);
        
        if (!examFiles || examFiles.length === 0) {
            console.warn('⚠️ 未找到对应的考试词库文件，使用当前词库');
            // 回退到旧逻辑：从当前词库随机选取
            if (!loadAllWords) {
                this._applyWordCountLimit(vm, targetWordCount);
            }
            return;
        }
        
        console.log(`📂 考试词库文件列表: ${examFiles.join(', ')}`);
        
        // 🔧 从指定文件加载单词
        const examWords = await this.loadWordsFromFiles(examFiles);
        
        if (examWords.length === 0) {
            console.warn('⚠️ 从考试词库文件加载单词失败，使用当前词库');
            this._applyWordCountLimit(vm, targetWordCount);
            return;
        }
        
        console.log(`📖 从考试词库文件加载了 ${examWords.length} 个单词`);
        
        // 去重
        const uniqueWords = this._deduplicateWords(examWords);
        console.log(`🔄 去重后: ${uniqueWords.length} 个单词`);
        
        // 打乱单词顺序
        const shuffled = [...uniqueWords].sort(() => Math.random() - 0.5);
        
        // wordCount=0 时加载全部，否则限制数量
        if (loadAllWords || targetWordCount >= shuffled.length) {
            vm.allWords = shuffled;
            console.log(`📚 考试单词: 全部 ${vm.allWords.length} 个`);
        } else {
            vm.allWords = shuffled.slice(0, targetWordCount);
            console.log(`✂️ 考试单词数量: ${vm.allWords.length}/${uniqueWords.length}`);
        }
        
        // 重新初始化单词池
        vm.initializeWordPool();
        
        // 更新游戏中的 totalWords
        if (this.game) {
            this.game.totalWords = vm.allWords.length;
            this.game.updateExamStats();
        }
        
        console.log(`✅ 考试词库已加载: ${vm.allWords.length} 个单词`);
    }
    
    /**
     * 根据考试类型获取对应的词库文件列表
     */
    async getExamVocabularyFiles(series, majorLevel, minorLevel) {
        const files = [];
        
        if (series === 'phonics') {
            // 音标考试：从 phonics-categories.json 获取对应的 daily-phonics 文件
            return await this._getPhonicsExamFiles(majorLevel, minorLevel);
        }
        
        if (series === 'primaryGrades') {
            // 年级考试：根据年级和学期获取对应文件
            return this._getGradeExamFiles(majorLevel, minorLevel);
        }
        
        if (series === 'extracurricular') {
            // 课外阅读考试：根据书籍系列和范围获取对应文件
            return this._getExtracurricularExamFiles(majorLevel, minorLevel);
        }
        
        return files;
    }
    
    /**
     * 获取音标考试的词库文件
     */
    async _getPhonicsExamFiles(majorLevel, minorLevel) {
        try {
            // 加载 phonics-categories.json
            const response = await fetch('./words/phonics-categories.json');
            const config = await response.json();
            
            if (minorLevel === 'finalExam') {
                // 总考：加载所有音标分类的单词（包含测试日）
                const allFiles = [];
                const addedDays = new Set();
                
                for (const category of Object.values(config.categories)) {
                    // 添加学习日
                    if (category.dailyPhonics) {
                        category.dailyPhonics.forEach(day => {
                            if (!addedDays.has(day)) {
                                allFiles.push(`./words/daily-phonics/${day}.json`);
                                addedDays.add(day);
                            }
                        });
                    }
                    // 添加测试日
                    if (category.testDays) {
                        category.testDays.forEach(day => {
                            if (!addedDays.has(day)) {
                                allFiles.push(`./words/daily-phonics/${day}.json`);
                                addedDays.add(day);
                            }
                        });
                    }
                }
                console.log(`📚 音标总考: 加载全部 ${allFiles.length} 个文件`);
                return allFiles;
            }
            
            // 单项考试：加载对应分类的单词
            const category = config.categories[majorLevel];
            if (category && category.dailyPhonics) {
                const files = category.dailyPhonics.map(day => `./words/daily-phonics/${day}.json`);
                // 可选：包含测试日的单词（测试日通常是复习，包含重复单词）
                // if (category.testDays) {
                //     category.testDays.forEach(day => files.push(`./words/daily-phonics/${day}.json`));
                // }
                console.log(`📚 音标考试 [${category.name}]: 加载 ${files.length} 个文件`);
                return files;
            }
            
            console.warn(`⚠️ 未找到音标分类: ${majorLevel}`);
            return [];
        } catch (e) {
            console.error('❌ 加载 phonics-categories.json 失败:', e);
            return [];
        }
    }
    
    /**
     * 获取年级考试的词库文件
     */
    _getGradeExamFiles(majorLevel, minorLevel) {
        // majorLevel: grade3, grade4, grade5, grade6
        // minorLevel: term1, term2, finalExam
        
        const files = [];
        const gradeNum = majorLevel.replace('grade', '');
        
        if (minorLevel === 'finalExam') {
            // 年级总考：加载该年级所有单元
            for (const term of ['term1', 'term2']) {
                for (let unit = 1; unit <= 6; unit++) {
                    files.push(`./words/grade-based/primary/grade${gradeNum}-${term}-unit${unit}.json`);
                }
            }
            console.log(`📚 ${majorLevel} 总考: 加载全部 ${files.length} 个文件`);
        } else {
            // 学期考试：加载该学期所有单元
            const unitCount = (majorLevel === 'grade6' && minorLevel === 'term2') ? 4 : 6;
            for (let unit = 1; unit <= unitCount; unit++) {
                files.push(`./words/grade-based/primary/grade${gradeNum}-${minorLevel}-unit${unit}.json`);
            }
            console.log(`📚 ${majorLevel} ${minorLevel}: 加载 ${files.length} 个文件`);
        }
        
        return files;
    }
    
    /**
     * 获取课外阅读考试的词库文件
     */
    _getExtracurricularExamFiles(majorLevel, minorLevel) {
        // majorLevel: flyGuy, magicTreeHouse, etc.
        // minorLevel: book1to5, book6to10, book11to15, finalExam
        
        const files = [];
        
        if (majorLevel === 'flyGuy') {
            const bookRanges = {
                'book1to5': [1, 5],
                'book6to10': [6, 10],
                'book11to15': [11, 15],
                'finalExam': [1, 15]
            };
            
            const range = bookRanges[minorLevel];
            if (range) {
                for (let i = range[0]; i <= range[1]; i++) {
                    const bookNum = i.toString().padStart(2, '0');
                    files.push(`./words/extracurricular-books/fly-guy/fg-book${bookNum}.json`);
                }
                console.log(`📚 Fly Guy ${minorLevel}: 加载 ${files.length} 个文件`);
            }
        }
        
        // TODO: 添加其他课外书系列的文件映射
        // if (majorLevel === 'magicTreeHouse') { ... }
        
        return files;
    }
    
    /**
     * 从指定文件列表加载单词
     */
    async loadWordsFromFiles(files) {
        const allWords = [];
        
        const loadPromises = files.map(async (filePath) => {
            try {
                const response = await fetch(filePath);
                if (!response.ok) {
                    console.warn(`⚠️ 无法加载文件: ${filePath}`);
                    return [];
                }
                const data = await response.json();
                
                // 从 JSON 中提取单词
                if (data.words && Array.isArray(data.words)) {
                    return data.words.map(w => ({
                        word: w.word,
                        phonetic: w.phonetic || '',
                        meaning: w.meaning || '',
                        difficulty: w.difficulty || 1,
                        source: filePath
                    }));
                }
                return [];
            } catch (e) {
                console.warn(`⚠️ 加载文件失败: ${filePath}`, e);
                return [];
            }
        });
        
        const results = await Promise.all(loadPromises);
        results.forEach(words => allWords.push(...words));
        
        return allWords;
    }
    
    /**
     * 单词去重（按 word 字段）
     */
    _deduplicateWords(words) {
        const seen = new Set();
        return words.filter(w => {
            const key = w.word.toLowerCase();
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }
    
    /**
     * 应用单词数量限制（旧逻辑的回退方案）
     */
    _applyWordCountLimit(vm, targetWordCount) {
        if (vm.allWords.length > targetWordCount) {
            const shuffled = [...vm.allWords].sort(() => Math.random() - 0.5);
            vm.allWords = shuffled.slice(0, targetWordCount);
            console.log(`✂️ 单词数量已限制: ${vm.allWords.length}`);
        }
        vm.initializeWordPool();
        if (this.game) {
            this.game.totalWords = vm.allWords.length;
            this.game.updateExamStats();
        }
    }
    
    /**
     * 恢复原始词库（考试结束后调用）
     */
    restoreOriginalVocabulary() {
        const vm = this.game?.vocabularyManager;
        if (this._originalAllWords && vm) {
            vm.allWords = this._originalAllWords;
            vm.initializeWordPool();
            this._originalAllWords = null;
            console.log('🔄 已恢复原始词库');
        }
    }

    /**
     * 考试结束处理
     * @param {number} correctRate - 正确率 (0-100)
     */
    onExamComplete(correctRate) {
        if (!this.isExamMode || !this.examConfig) return;

        const { series, majorLevel, minorLevel } = this.examConfig;
        
        // 提交考试结果
        const result = this.certSystem.submitExamResult(
            series,
            majorLevel,
            minorLevel,
            correctRate
        );

        console.log('📊 考试结果:', result);

        // 显示结果
        this.showExamResult(result, correctRate);

        // 如果获得徽章，显示徽章动画
        if (result.badgeEarned && this.badgeArea) {
            setTimeout(() => {
                this.badgeArea.showBadgeEarnedAnimation(result.badgeEarned);
            }, 1500);
        }

        // 清理考试状态
        this.isExamMode = false;
        this.examConfig = null;
        this.hideExamModeUI();
        
        // 🔄 恢复原始词库
        this.restoreOriginalVocabulary();
        
        // 🔄 恢复考试前的游戏模式
        if (this.previousGameMode) {
            localStorage.setItem('wordTetris_gameMode', this.previousGameMode);
            if (this.game) {
                this.game.gameMode = this.previousGameMode;
            }
            console.log(`🔄 已恢复游戏模式: ${this.previousGameMode}`);
            this.previousGameMode = null;
        }
    }

    /**
     * 显示考试结果
     */
    showExamResult(result, correctRate) {
        const overlay = document.createElement('div');
        overlay.id = 'examResultOverlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.85);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            animation: fadeIn 0.3s ease;
        `;

        const passed = result.passed;
        const icon = passed ? '🎉' : '😢';
        const title = passed ? '恭喜通过！' : '未能通过';
        const titleColor = passed ? '#4ade80' : '#ff6b6b';
        const message = passed 
            ? `正确率 ${correctRate}% 已达标！`
            : `正确率 ${correctRate}%，需要 90% 以上才能通过`;

        const cooldownMsg = result.cooldownUntil 
            ? `<p style="color: #ff9800; margin-top: 15px;">⏰ 30分钟后可重新挑战</p>`
            : '';

        const badgeMsg = result.badgeEarned
            ? `<p style="color: #ffd700; margin-top: 15px; font-size: 18px;">🏅 获得徽章：${result.badgeEarned.name}</p>`
            : '';

        overlay.innerHTML = `
            <div style="text-align: center; padding: 40px; background: linear-gradient(135deg, #1a1a2e, #0f0f20); 
                        border: 3px solid ${titleColor}; border-radius: 20px; max-width: 400px;">
                <div style="font-size: 64px; margin-bottom: 20px;">${icon}</div>
                <h2 style="color: ${titleColor}; font-size: 28px; margin-bottom: 15px;">${title}</h2>
                <p style="color: #e0e0e0; font-size: 16px;">${message}</p>
                ${badgeMsg}
                ${cooldownMsg}
                <div style="margin-top: 30px; display: flex; gap: 15px; justify-content: center;">
                    <button id="backToCertBtn" style="
                        padding: 12px 25px;
                        font-size: 14px;
                        background: linear-gradient(135deg, #4a4a6a, #3a3a5a);
                        border: 2px solid #c9a227;
                        border-radius: 8px;
                        color: #c9a227;
                        cursor: pointer;
                        transition: all 0.3s ease;
                    ">返回考级页</button>
                    ${passed ? '' : `
                    <button id="retryExamBtn" style="
                        padding: 12px 25px;
                        font-size: 14px;
                        background: linear-gradient(135deg, #4a9ecc, #2a6a99);
                        border: none;
                        border-radius: 8px;
                        color: white;
                        cursor: pointer;
                        transition: all 0.3s ease;
                    " ${result.cooldownUntil ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
                        ${result.cooldownUntil ? '冷却中' : '再试一次'}
                    </button>
                    `}
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // 绑定按钮事件
        document.getElementById('backToCertBtn').addEventListener('click', () => {
            window.location.href = 'certification.html';
        });

        const retryBtn = document.getElementById('retryExamBtn');
        if (retryBtn && !result.cooldownUntil) {
            retryBtn.addEventListener('click', () => {
                overlay.remove();
                // 重新开始考试
                this.startExamMode(
                    this.examConfig?.series || 'phonics',
                    this.examConfig?.majorLevel,
                    this.examConfig?.minorLevel
                );
                if (this.game) {
                    this.game.resetGame(true);
                }
            });
        }
    }

    /**
     * 获取考试模式下的正确率
     */
    getExamCorrectRate() {
        if (!this.game) return 0;
        
        const hitCount = this.game.hitWords?.size || 0;
        const fallenCount = this.game.fallenWords?.size || 0;
        
        if (fallenCount === 0) return 0;
        return Math.round((hitCount / fallenCount) * 100);
    }

    /**
     * 检查是否在考试模式
     */
    isInExamMode() {
        return this.isExamMode;
    }

    /**
     * 取消考试
     */
    cancelExam() {
        if (this.isExamMode) {
            this.isExamMode = false;
            this.examConfig = null;
            this.hideExamModeUI();
            
            // 🔄 恢复考试前的游戏模式
            if (this.previousGameMode) {
                localStorage.setItem('wordTetris_gameMode', this.previousGameMode);
                if (this.game) {
                    this.game.gameMode = this.previousGameMode;
                }
                console.log(`🔄 考试取消，已恢复游戏模式: ${this.previousGameMode}`);
                this.previousGameMode = null;
            }
            
            console.log('❌ 考试已取消');
        }
    }
}

// 导出单例
window.ExamIntegration = ExamIntegration;


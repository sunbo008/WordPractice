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
    }

    /**
     * 初始化考试集成
     */
    init(game) {
        this.game = game;
        
        if (typeof CertificationStorage !== 'undefined' && typeof CertificationSystem !== 'undefined') {
            this.certStorage = new CertificationStorage();
            this.certSystem = new CertificationSystem();
        }
        
        if (typeof BadgeArea !== 'undefined' && window.badgeArea) {
            this.badgeArea = window.badgeArea;
        }
        
        // 检查 URL 参数是否有考试模式
        this.checkExamModeFromUrl();
        
        // 检查 sessionStorage 是否有待进行的考试
        this.checkPendingExam();
    }

    /**
     * 从 URL 参数检查考试模式
     */
    checkExamModeFromUrl() {
        const params = new URLSearchParams(window.location.search);
        if (params.get('mode') === 'exam') {
            const series = params.get('series');
            const major = params.get('major');
            const minor = params.get('minor');
            
            if (series) {
                this.startExamMode(series, major, minor);
            }
        }
    }

    /**
     * 检查待进行的考试
     */
    checkPendingExam() {
        const pending = sessionStorage.getItem('currentExam');
        if (pending) {
            try {
                const examInfo = JSON.parse(pending);
                // 清除待处理状态
                sessionStorage.removeItem('currentExam');
                // 启动考试模式
                this.startExamMode(examInfo.series, examInfo.majorLevel, examInfo.minorLevel);
            } catch (e) {
                console.error('解析考试信息失败:', e);
            }
        }
    }

    /**
     * 开始考试模式
     */
    async startExamMode(series, majorLevel, minorLevel) {
        if (!this.certSystem) {
            alert('考级系统未加载，无法开始考试');
            return false;
        }

        // 检查是否可以开始考试
        const canStart = this.certSystem.canStartExam(series, majorLevel, minorLevel);
        if (!canStart.allowed) {
            alert(canStart.reason);
            return false;
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
     * 注意：这是一个异步操作，需要等待词库加载完成
     */
    async loadExamVocabulary(series, majorLevel, minorLevel) {
        console.log(`📚 准备加载考试词库: ${series}/${majorLevel}/${minorLevel}`);
        
        // 获取考试配置（范围和单词数量）
        const examInfo = this.certSystem.getExamInfo(series, majorLevel, minorLevel);
        const targetWordCount = examInfo.wordCount;
        
        console.log(`📊 考试配置: ${examInfo.scope}, 目标单词数: ${targetWordCount}`);
        
        // 保存考试配置，稍后在词库加载完成后使用
        this._pendingExamWordCount = targetWordCount;
        
        // 获取词库管理器（从 game 实例获取）
        const vm = this.game?.vocabularyManager;
        
        if (!vm) {
            console.warn('⚠️ 词库管理器未找到');
            return;
        }
        
        if (targetWordCount === 0) {
            console.warn('⚠️ 考试词库尚未配置 (wordCount = 0)');
            return;
        }
        
        // 等待词库加载完成
        let waitCount = 0;
        while (!vm.isLoaded) {
            if (waitCount === 0) {
                console.log('⏳ 等待词库加载完成后再限制单词数量...');
            }
            await new Promise(resolve => setTimeout(resolve, 100));
            waitCount++;
            if (waitCount > 100) { // 最多等待10秒
                console.error('❌ 等待词库加载超时');
                return;
            }
        }
        
        console.log(`📚 词库已加载完成，当前单词数: ${vm.allWords.length}`);
        
        // 保存原始单词池
        if (!this._originalAllWords) {
            this._originalAllWords = [...vm.allWords];
            console.log(`💾 已备份原始词库: ${this._originalAllWords.length} 个单词`);
        }
        
        // 限制单词数量：随机选取指定数量的单词
        if (vm.allWords.length > targetWordCount) {
            // 打乱并截取
            const shuffled = [...vm.allWords].sort(() => Math.random() - 0.5);
            vm.allWords = shuffled.slice(0, targetWordCount);
            console.log(`✂️ 单词数量已限制: ${vm.allWords.length}/${this._originalAllWords.length}`);
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


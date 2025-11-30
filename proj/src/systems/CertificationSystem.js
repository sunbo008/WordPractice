/**
 * 考级系统核心逻辑模块
 * 负责考级流程控制、解锁逻辑、徽章授予等
 */

class CertificationSystem {
    constructor() {
        this.storage = new CertificationStorage();
        this.progress = this.storage.load();
        this.PASS_THRESHOLD = 90; // 通过阈值 90%
        
        // 级别配置
        this.levelConfig = this._initLevelConfig();
    }

    /**
     * 初始化级别配置
     */
    _initLevelConfig() {
        return {
            // 音标系列
            phonics: {
                name: '音标系列',
                order: ['shortVowels', 'longVowels', 'diphthongs', 'consonants', 'complexSounds'],
                levelNames: {
                    shortVowels: '短元音',
                    longVowels: '长元音',
                    diphthongs: '双元音',
                    consonants: '辅音',
                    complexSounds: '复合音'
                },
                // 考试信息配置
                // 词库统计: 短元音60 + 长元音45 + 双元音60 + 辅音45 + 复合音15 ≈ 225个单词（去重后）
                // wordCount 设为 0 表示加载全部单词，不做数量限制
                examInfo: {
                    shortVowels: { scope: '/æ/, /e/, /ɪ/, /ɒ/, /ʌ/, /ʊ/ 相关单词（约60个）', wordCount: 0 },
                    longVowels: { scope: '/iː/, /uː/, /ɜː/, /ə/ 相关单词（约45个）', wordCount: 0 },
                    diphthongs: { scope: '/eɪ/, /aɪ/, /ɔɪ/, /əʊ/, /aʊ/, /ɪə/, /eə/, /ʊə/ 等双元音单词（约60个）', wordCount: 0 },
                    consonants: { scope: '/p/, /b/, /t/, /d/, /k/, /g/, /f/, /v/ 等辅音单词（约45个）', wordCount: 0 },
                    complexSounds: { scope: '/tʃ/, /dʒ/, /ʃ/, /ʒ/, /θ/, /ð/ 等复合音单词（约15个）', wordCount: 0 },
                    finalExam: { scope: '全部音标综合测试（约225个）', wordCount: 0 }
                }
            },
            
            // 小学年级系列
            primaryGrades: {
                name: '小学年级系列',
                order: ['grade3', 'grade4', 'grade5', 'grade6'],
                subOrder: ['term1', 'term2'],
                levelNames: {
                    grade3: { name: '三年级', term1: '上学期', term2: '下学期' },
                    grade4: { name: '四年级', term1: '上学期', term2: '下学期' },
                    grade5: { name: '五年级', term1: '上学期', term2: '下学期' },
                    grade6: { name: '六年级', term1: '上学期', term2: '下学期' }
                },
                // 考试信息配置 - wordCount=0 表示加载全部单词
                examInfo: {
                    grade3: {
                        term1: { scope: '三年级上学期 Unit 1-6（约71个）', wordCount: 0 },
                        term2: { scope: '三年级下学期 Unit 1-6（约69个）', wordCount: 0 },
                        finalExam: { scope: '三年级全册综合测试（约140个）', wordCount: 0 }
                    },
                    grade4: {
                        term1: { scope: '四年级上学期 Unit 1-6（约143个）', wordCount: 0 },
                        term2: { scope: '四年级下学期 Unit 1-6（约83个）', wordCount: 0 },
                        finalExam: { scope: '四年级全册综合测试（约226个）', wordCount: 0 }
                    },
                    grade5: {
                        term1: { scope: '五年级上学期 Unit 1-6（约83个）', wordCount: 0 },
                        term2: { scope: '五年级下学期 Unit 1-6（约82个）', wordCount: 0 },
                        finalExam: { scope: '五年级全册综合测试（约165个）', wordCount: 0 }
                    },
                    grade6: {
                        term1: { scope: '六年级上学期 Unit 1-6（约70个）', wordCount: 0 },
                        term2: { scope: '六年级下学期 Unit 1-4（约52个）', wordCount: 0 },
                        finalExam: { scope: '六年级全册综合测试（约122个）', wordCount: 0 }
                    }
                }
            },
            
            // 课外阅读系列
            extracurricular: {
                name: '课外阅读系列',
                order: ['flyGuy', 'magicTreeHouse', 'dragonBall', 'harryPotter'],
                levelNames: {
                    flyGuy: { name: 'Fly Guy', subLevels: ['book1to5', 'book6to10', 'book11to15'] },
                    magicTreeHouse: { name: '神奇树屋', subLevels: [] },
                    dragonBall: { name: '七龙珠', subLevels: [] },
                    harryPotter: { name: '哈利波特', subLevels: [] }
                },
                // 考试信息配置
                // 考试信息配置 - wordCount=0 表示加载全部单词
                examInfo: {
                    flyGuy: {
                        book1to5: { scope: 'Fly Guy 第1-5册词汇（约125个）', wordCount: 0 },
                        book6to10: { scope: 'Fly Guy 第6-10册词汇（约106个）', wordCount: 0 },
                        book11to15: { scope: 'Fly Guy 第11-15册词汇（约95个）', wordCount: 0 },
                        finalExam: { scope: 'Fly Guy 全系列综合测试（约326个）', wordCount: 0 }
                    },
                    magicTreeHouse: { finalExam: { scope: '神奇树屋词汇（待配置）', wordCount: 0 } },
                    dragonBall: { finalExam: { scope: '七龙珠词汇（待配置）', wordCount: 0 } },
                    harryPotter: { finalExam: { scope: '哈利波特词汇（待配置）', wordCount: 0 } }
                }
            },
            
            // 升学系列
            academic: {
                name: '升学系列',
                order: ['middleSchool', 'highSchool', 'cet4'],
                levelNames: {
                    middleSchool: { 
                        name: '初中', 
                        subLevels: ['grade7Term1', 'grade7Term2', 'grade8Term1', 'grade8Term2', 'grade9Term1', 'grade9Term2'],
                        subNames: {
                            grade7Term1: '7年级上', grade7Term2: '7年级下',
                            grade8Term1: '8年级上', grade8Term2: '8年级下',
                            grade9Term1: '9年级上', grade9Term2: '9年级下'
                        }
                    },
                    highSchool: { 
                        name: '高中', 
                        subLevels: ['senior1Term1', 'senior1Term2', 'senior2Term1', 'senior2Term2', 'senior3Term1', 'senior3Term2'],
                        subNames: {
                            senior1Term1: '高一上', senior1Term2: '高一下',
                            senior2Term1: '高二上', senior2Term2: '高二下',
                            senior3Term1: '高三上', senior3Term2: '高三下'
                        }
                    },
                    cet4: { 
                        name: '四级', 
                        subLevels: ['coreVocab', 'highFreqVocab', 'advancedVocab'],
                        subNames: {
                            coreVocab: '核心词汇',
                            highFreqVocab: '高频词汇',
                            advancedVocab: '进阶词汇'
                        }
                    }
                },
                // 考试信息配置
                examInfo: {
                    middleSchool: {
                        grade7Term1: { scope: '7年级上学期词汇（待配置）', wordCount: 0 },
                        grade7Term2: { scope: '7年级下学期词汇（待配置）', wordCount: 0 },
                        grade8Term1: { scope: '8年级上学期词汇（待配置）', wordCount: 0 },
                        grade8Term2: { scope: '8年级下学期词汇（待配置）', wordCount: 0 },
                        grade9Term1: { scope: '9年级上学期词汇（待配置）', wordCount: 0 },
                        grade9Term2: { scope: '9年级下学期词汇（待配置）', wordCount: 0 },
                        finalExam: { scope: '初中全册综合测试（待配置）', wordCount: 0 }
                    },
                    highSchool: {
                        senior1Term1: { scope: '高一上学期词汇（待配置）', wordCount: 0 },
                        senior1Term2: { scope: '高一下学期词汇（待配置）', wordCount: 0 },
                        senior2Term1: { scope: '高二上学期词汇（待配置）', wordCount: 0 },
                        senior2Term2: { scope: '高二下学期词汇（待配置）', wordCount: 0 },
                        senior3Term1: { scope: '高三上学期词汇（待配置）', wordCount: 0 },
                        senior3Term2: { scope: '高三下学期词汇（待配置）', wordCount: 0 },
                        finalExam: { scope: '高中全册综合测试（待配置）', wordCount: 0 }
                    },
                    cet4: {
                        coreVocab: { scope: '四级核心词汇（待配置）', wordCount: 0 },
                        highFreqVocab: { scope: '四级高频词汇（待配置）', wordCount: 0 },
                        advancedVocab: { scope: '四级进阶词汇（待配置）', wordCount: 0 },
                        finalExam: { scope: '四级综合测试（待配置）', wordCount: 0 }
                    }
                }
            }
        };
    }
    
    /**
     * 获取考试信息（范围和单词数量）
     * @param {string} series - 系列名称
     * @param {string} majorLevel - 大级别
     * @param {string} minorLevel - 小级别
     * @returns {object} { scope: string, wordCount: number }
     */
    getExamInfo(series, majorLevel, minorLevel) {
        const config = this.levelConfig[series];
        if (!config?.examInfo) {
            return { scope: '待配置', wordCount: 0 };
        }
        
        if (series === 'phonics') {
            // 音标系列：majorLevel 就是小级别，minorLevel 可能是 'finalExam'
            const level = minorLevel === 'finalExam' ? 'finalExam' : majorLevel;
            return config.examInfo[level] || { scope: '待配置', wordCount: 0 };
        }
        
        if (series === 'primaryGrades') {
            const gradeInfo = config.examInfo[majorLevel];
            if (!gradeInfo) return { scope: '待配置', wordCount: 0 };
            return gradeInfo[minorLevel] || { scope: '待配置', wordCount: 0 };
        }
        
        if (series === 'extracurricular' || series === 'academic') {
            const majorInfo = config.examInfo[majorLevel];
            if (!majorInfo) return { scope: '待配置', wordCount: 0 };
            return majorInfo[minorLevel] || majorInfo.finalExam || { scope: '待配置', wordCount: 0 };
        }
        
        return { scope: '待配置', wordCount: 0 };
    }

    /**
     * 获取当前进度
     */
    getProgress() {
        return this.progress;
    }

    /**
     * 保存进度
     */
    saveProgress() {
        this.storage.save(this.progress);
    }

    /**
     * 检查级别是否解锁
     * @param {string} series - 系列名称
     * @param {string} majorLevel - 大级别
     * @param {string} minorLevel - 小级别，'finalExam' 表示总考
     */
    isLevelUnlocked(series, majorLevel, minorLevel = null) {
        // 音标系列
        if (series === 'phonics') {
            // 总考解锁条件：所有小级别都通过
            if (minorLevel === 'finalExam') {
                return this.allSubLevelsPassed('phonics');
            }
            
            const order = this.levelConfig.phonics.order;
            const idx = order.indexOf(majorLevel);
            if (idx === 0) return true;
            // 检查前一个级别是否通过
            const prevLevel = order[idx - 1];
            return this.progress.phonics.levels[prevLevel]?.passed || false;
        }
        
        // 小学年级系列
        if (series === 'primaryGrades') {
            // 需要音标徽章
            if (!this.progress.phonics.badge.earned) return false;
            
            // 总考解锁条件：上下学期都通过
            if (minorLevel === 'finalExam') {
                return this.allSubLevelsPassed('primaryGrades', majorLevel);
            }
            
            const gradeOrder = this.levelConfig.primaryGrades.order;
            const gradeIdx = gradeOrder.indexOf(majorLevel);
            
            if (gradeIdx === 0 && minorLevel === 'term1') return true;
            
            if (minorLevel === 'term2') {
                return this.progress.primaryGrades[majorLevel]?.term1?.passed || false;
            }
            
            if (minorLevel === 'term1' && gradeIdx > 0) {
                const prevGrade = gradeOrder[gradeIdx - 1];
                return this.progress.primaryGrades[prevGrade]?.badge.earned || false;
            }
            
            return false;
        }
        
        // 课外阅读系列
        if (series === 'extracurricular') {
            // 需要6年级徽章
            if (!this.progress.primaryGrades.grade6?.badge.earned) return false;
            
            const order = this.levelConfig.extracurricular.order;
            const idx = order.indexOf(majorLevel);
            
            // 总考解锁条件：所有小级别都通过
            if (minorLevel === 'finalExam') {
                // 检查系列内前一个大级别是否获得徽章
                if (idx > 0) {
                    const prevMajor = order[idx - 1];
                    if (!this.progress.extracurricular[prevMajor]?.badge.earned) return false;
                }
                return this.allSubLevelsPassed('extracurricular', majorLevel);
            }
            
            if (idx === 0 && !minorLevel) return true;
            
            // 检查系列内前一个大级别是否获得徽章
            if (idx > 0) {
                const prevMajor = order[idx - 1];
                if (!this.progress.extracurricular[prevMajor]?.badge.earned) return false;
            }
            
            // 检查小级别解锁
            if (minorLevel) {
                const subLevels = this.levelConfig.extracurricular.levelNames[majorLevel]?.subLevels || [];
                const subIdx = subLevels.indexOf(minorLevel);
                if (subIdx === 0) return true;
                if (subIdx > 0) {
                    const prevSub = subLevels[subIdx - 1];
                    return this.progress.extracurricular[majorLevel]?.levels[prevSub]?.passed || false;
                }
            }
            
            return true;
        }
        
        // 升学系列
        if (series === 'academic') {
            // 需要6年级徽章
            if (!this.progress.primaryGrades.grade6?.badge.earned) return false;
            
            const order = this.levelConfig.academic.order;
            const idx = order.indexOf(majorLevel);
            
            // 总考解锁条件：所有小级别都通过
            if (minorLevel === 'finalExam') {
                // 检查系列内前一个大级别是否获得徽章
                if (idx > 0) {
                    const prevMajor = order[idx - 1];
                    if (!this.progress.academic[prevMajor]?.badge.earned) return false;
                }
                return this.allSubLevelsPassed('academic', majorLevel);
            }
            
            // 检查系列内前一个大级别是否获得徽章
            if (idx > 0) {
                const prevMajor = order[idx - 1];
                if (!this.progress.academic[prevMajor]?.badge.earned) return false;
            }
            
            // 检查小级别解锁
            if (minorLevel) {
                const subLevels = this.levelConfig.academic.levelNames[majorLevel]?.subLevels || [];
                const subIdx = subLevels.indexOf(minorLevel);
                if (subIdx === 0) return idx === 0 || this.progress.academic[order[idx - 1]]?.badge.earned;
                if (subIdx > 0) {
                    const prevSub = subLevels[subIdx - 1];
                    return this.progress.academic[majorLevel]?.levels[prevSub]?.passed || false;
                }
            }
            
            return idx === 0;
        }
        
        return false;
    }

    /**
     * 检查是否可以开始考试（非冷却期）
     */
    canStartExam(series, majorLevel, minorLevel = null) {
        if (!this.isLevelUnlocked(series, majorLevel, minorLevel)) {
            return { allowed: false, reason: '该级别尚未解锁' };
        }
        
        const levelData = this._getLevelData(series, majorLevel, minorLevel);
        if (!levelData) {
            return { allowed: false, reason: '级别数据不存在' };
        }
        
        if (this.storage.isInCooldown(levelData)) {
            const remaining = this.storage.formatCooldownTime(levelData);
            return { allowed: false, reason: `冷却中，请等待 ${remaining}` };
        }
        
        return { allowed: true };
    }

    /**
     * 获取级别数据
     * @param {string} series - 系列名称
     * @param {string} majorLevel - 大级别
     * @param {string} minorLevel - 小级别，'finalExam' 表示总考
     */
    _getLevelData(series, majorLevel, minorLevel = null) {
        if (series === 'phonics') {
            if (minorLevel === 'finalExam') {
                return this.progress.phonics.finalExam;
            }
            return this.progress.phonics.levels[majorLevel];
        }
        
        if (series === 'primaryGrades') {
            if (minorLevel === 'finalExam') {
                return this.progress.primaryGrades[majorLevel]?.finalExam;
            }
            return this.progress.primaryGrades[majorLevel]?.[minorLevel];
        }
        
        if (series === 'extracurricular') {
            if (minorLevel === 'finalExam') {
                return this.progress.extracurricular[majorLevel]?.finalExam;
            }
            if (minorLevel) {
                return this.progress.extracurricular[majorLevel]?.levels[minorLevel];
            }
            return null;
        }
        
        if (series === 'academic') {
            if (minorLevel === 'finalExam') {
                return this.progress.academic[majorLevel]?.finalExam;
            }
            if (minorLevel) {
                return this.progress.academic[majorLevel]?.levels[minorLevel];
            }
            return null;
        }
        
        return null;
    }
    
    /**
     * 检查所有小级别是否都通过
     * @param {string} series - 系列名称
     * @param {string} majorLevel - 大级别（仅年级/课外阅读/升学系列需要）
     * @returns {boolean}
     */
    allSubLevelsPassed(series, majorLevel = null) {
        if (series === 'phonics') {
            return this.levelConfig.phonics.order.every(
                level => this.progress.phonics.levels[level]?.passed
            );
        }
        
        if (series === 'primaryGrades') {
            const gradeData = this.progress.primaryGrades[majorLevel];
            return gradeData?.term1?.passed && gradeData?.term2?.passed;
        }
        
        if (series === 'extracurricular') {
            const bookData = this.progress.extracurricular[majorLevel];
            const subLevels = this.levelConfig.extracurricular.levelNames[majorLevel]?.subLevels || [];
            if (subLevels.length === 0) return true; // 没有小级别，直接可以总考
            return subLevels.every(sub => bookData?.levels[sub]?.passed);
        }
        
        if (series === 'academic') {
            const levelData = this.progress.academic[majorLevel];
            const subLevels = this.levelConfig.academic.levelNames[majorLevel]?.subLevels || [];
            return subLevels.every(sub => levelData?.levels[sub]?.passed);
        }
        
        return false;
    }
    
    /**
     * 检查总考是否解锁
     * @param {string} series - 系列名称
     * @param {string} majorLevel - 大级别
     * @returns {boolean}
     */
    isFinalExamUnlocked(series, majorLevel = null) {
        // 总考解锁条件：所有小级别都通过
        return this.allSubLevelsPassed(series, majorLevel);
    }
    
    /**
     * 检查是否应该显示亮星（所有小级别+总考都是100%）
     * @param {string} series - 系列名称
     * @param {string} majorLevel - 大级别
     * @returns {boolean}
     */
    shouldShowStar(series, majorLevel = null) {
        if (series === 'phonics') {
            // 检查所有小级别是否都是100%
            const allSubLevels100 = this.levelConfig.phonics.order.every(
                level => this.progress.phonics.levels[level]?.score === 100
            );
            // 检查总考是否100%
            const finalExam100 = this.progress.phonics.finalExam?.score === 100;
            return allSubLevels100 && finalExam100;
        }
        
        if (series === 'primaryGrades') {
            const gradeData = this.progress.primaryGrades[majorLevel];
            const allSubLevels100 = gradeData?.term1?.score === 100 && gradeData?.term2?.score === 100;
            const finalExam100 = gradeData?.finalExam?.score === 100;
            return allSubLevels100 && finalExam100;
        }
        
        if (series === 'extracurricular') {
            const bookData = this.progress.extracurricular[majorLevel];
            const subLevels = this.levelConfig.extracurricular.levelNames[majorLevel]?.subLevels || [];
            const allSubLevels100 = subLevels.length === 0 || 
                subLevels.every(sub => bookData?.levels[sub]?.score === 100);
            const finalExam100 = bookData?.finalExam?.score === 100;
            return allSubLevels100 && finalExam100;
        }
        
        if (series === 'academic') {
            const levelData = this.progress.academic[majorLevel];
            const subLevels = this.levelConfig.academic.levelNames[majorLevel]?.subLevels || [];
            const allSubLevels100 = subLevels.every(sub => levelData?.levels[sub]?.score === 100);
            const finalExam100 = levelData?.finalExam?.score === 100;
            return allSubLevels100 && finalExam100;
        }
        
        return false;
    }

    /**
     * 提交考试结果
     * @param {string} series - 系列名称
     * @param {string} majorLevel - 大级别
     * @param {string} minorLevel - 小级别
     * @param {number} correctRate - 正确率 (0-100)
     * @param {number} duration - 考试用时（秒）
     * @returns {object} 考试结果
     */
    submitExamResult(series, majorLevel, minorLevel, correctRate, duration = null) {
        const levelData = this._getLevelData(series, majorLevel, minorLevel);
        if (!levelData) {
            return { success: false, error: '级别数据不存在' };
        }
        
        const passed = correctRate >= this.PASS_THRESHOLD;
        
        // 更新级别数据
        levelData.attempts++;
        levelData.lastAttempt = Date.now();
        
        if (passed) {
            levelData.passed = true;
            // 更新最佳成绩和用时
            const isNewBest = correctRate > levelData.score || 
                (correctRate === levelData.score && duration !== null && 
                 (levelData.bestDuration === null || duration < levelData.bestDuration));
            
            if (correctRate > levelData.score) {
                levelData.score = correctRate;
            }
            // 记录最佳用时（仅当通过时记录）
            if (duration !== null && (levelData.bestDuration === null || duration < levelData.bestDuration)) {
                levelData.bestDuration = duration;
            }
            this.storage.clearCooldown(levelData);
        } else {
            // 未通过，设置冷却期
            this.storage.setCooldown(levelData);
            if (correctRate > levelData.score) {
                levelData.score = correctRate;
            }
        }
        
        // 检查是否获得徽章（只有总考通过才能获得徽章）
        let badgeEarned = null;
        if (passed) {
            badgeEarned = this._checkAndAwardBadge(series, majorLevel, minorLevel);
        }
        
        this.saveProgress();
        
        return {
            success: true,
            passed,
            score: correctRate,
            bestScore: levelData.score,
            bestDuration: levelData.bestDuration,
            badgeEarned,
            cooldownUntil: passed ? null : levelData.cooldownUntil
        };
    }

    /**
     * 检查并授予徽章（需要总考通过才授予）
     * @param {string} series - 系列名称
     * @param {string} majorLevel - 大级别
     * @param {string} minorLevel - 小级别，'finalExam' 表示总考
     */
    _checkAndAwardBadge(series, majorLevel, minorLevel = null) {
        // 只有总考通过时才检查徽章授予
        if (minorLevel !== 'finalExam') {
            return null;
        }
        
        if (series === 'phonics') {
            // 检查总考是否通过
            if (this.progress.phonics.finalExam?.passed && !this.progress.phonics.badge.earned) {
                this.progress.phonics.badge.earned = true;
                this.progress.phonics.badge.earnedAt = Date.now();
                // 解锁小学年级系列
                this.progress.primaryGrades.unlocked = true;
                return { id: 'phonics', name: '音标大师' };
            }
        }
        
        if (series === 'primaryGrades') {
            const grade = this.progress.primaryGrades[majorLevel];
            // 检查总考是否通过
            if (grade.finalExam?.passed && !grade.badge.earned) {
                grade.badge.earned = true;
                grade.badge.earnedAt = Date.now();
                
                // 如果是6年级，解锁双分支
                if (majorLevel === 'grade6') {
                    this.progress.extracurricular.unlocked = true;
                    this.progress.academic.unlocked = true;
                }
                
                const gradeNum = majorLevel.replace('grade', '');
                return { id: majorLevel, name: `${gradeNum}年级` };
            }
        }
        
        if (series === 'extracurricular') {
            const bookData = this.progress.extracurricular[majorLevel];
            // 检查总考是否通过
            if (bookData.finalExam?.passed && !bookData.badge.earned) {
                bookData.badge.earned = true;
                bookData.badge.earnedAt = Date.now();
                const names = { flyGuy: 'Fly Guy', magicTreeHouse: '神奇树屋', dragonBall: '七龙珠', harryPotter: '哈利波特' };
                return { id: majorLevel, name: names[majorLevel] };
            }
        }
        
        if (series === 'academic') {
            const levelData = this.progress.academic[majorLevel];
            // 检查总考是否通过
            if (levelData.finalExam?.passed && !levelData.badge.earned) {
                levelData.badge.earned = true;
                levelData.badge.earnedAt = Date.now();
                const names = { middleSchool: '初中', highSchool: '高中', cet4: '四级' };
                return { id: majorLevel, name: names[majorLevel] };
            }
        }
        
        return null;
    }

    /**
     * 获取已获得的徽章列表
     */
    getEarnedBadges() {
        return this.storage.getEarnedBadges(this.progress);
    }

    /**
     * 获取下一个可考级别
     */
    getNextAvailableLevel() {
        // 音标系列
        for (const level of this.levelConfig.phonics.order) {
            if (!this.progress.phonics.levels[level]?.passed) {
                return { series: 'phonics', majorLevel: level, minorLevel: null };
            }
        }
        
        // 小学年级系列
        if (this.progress.primaryGrades.unlocked) {
            for (const grade of this.levelConfig.primaryGrades.order) {
                for (const term of this.levelConfig.primaryGrades.subOrder) {
                    if (!this.progress.primaryGrades[grade]?.[term]?.passed) {
                        if (this.isLevelUnlocked('primaryGrades', grade, term)) {
                            return { series: 'primaryGrades', majorLevel: grade, minorLevel: term };
                        }
                    }
                }
            }
        }
        
        // 双分支检查（已完成6年级后）
        // ...（后续扩展）
        
        return null;
    }

    /**
     * 获取级别显示名称
     */
    getLevelDisplayName(series, majorLevel, minorLevel = null) {
        // 总考特殊处理
        if (minorLevel === 'finalExam') {
            if (series === 'phonics') {
                return '音标 - 级别总考';
            }
            if (series === 'primaryGrades') {
                const gradeConfig = this.levelConfig.primaryGrades.levelNames[majorLevel];
                return `${gradeConfig?.name || majorLevel} - 级别总考`;
            }
            if (series === 'extracurricular') {
                const name = this.levelConfig.extracurricular.levelNames[majorLevel]?.name || majorLevel;
                return `${name} - 级别总考`;
            }
            if (series === 'academic') {
                const name = this.levelConfig.academic.levelNames[majorLevel]?.name || majorLevel;
                return `${name} - 级别总考`;
            }
        }
        
        if (series === 'phonics') {
            return this.levelConfig.phonics.levelNames[majorLevel] || majorLevel;
        }
        
        if (series === 'primaryGrades') {
            const gradeConfig = this.levelConfig.primaryGrades.levelNames[majorLevel];
            if (minorLevel) {
                return `${gradeConfig.name}${gradeConfig[minorLevel]}`;
            }
            return gradeConfig?.name || majorLevel;
        }
        
        if (series === 'extracurricular') {
            return this.levelConfig.extracurricular.levelNames[majorLevel]?.name || majorLevel;
        }
        
        if (series === 'academic') {
            const config = this.levelConfig.academic.levelNames[majorLevel];
            if (minorLevel && config?.subNames) {
                return `${config.name} - ${config.subNames[minorLevel]}`;
            }
            return config?.name || majorLevel;
        }
        
        return majorLevel;
    }

    /**
     * 重置所有进度
     */
    resetAll() {
        this.progress = this.storage.reset();
    }
}

// 导出单例
window.CertificationSystem = CertificationSystem;


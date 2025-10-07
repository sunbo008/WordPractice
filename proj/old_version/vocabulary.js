// 词汇库管理
class VocabularyManager {
    constructor() {
        this.wordsData = null;
        this.allWords = [];
        this.currentVocabulary = [];
        this.missedWords = new Map(); // 存储错过的单词及其次数
        this.isLoaded = false; // 添加加载状态标志
        
        // 最近使用单词跟踪
        this.recentWords = []; // 存储最近使用的单词
        this.maxRecentWords = 15; // 最大跟踪数量（可根据单词库大小调整）
        
        // 加载单词数据
        this.loadWordsData();
    }
    
    // 加载JSON单词数据
    async loadWordsData() {
        try {
            const response = await fetch('./words.json');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            this.wordsData = await response.json();
            this.processWordsData();
            this.isLoaded = true;
            console.log('✅ 单词库加载成功:', this.wordsData.metadata);
        } catch (error) {
            console.error('❌ 单词库加载失败:', error);
            this.loadError = error;
            this.isLoaded = false;
            this.showLoadError(error);
        }
    }
    
    // 处理单词数据，创建统一的单词数组
    processWordsData() {
        this.allWords = [];
        const wordMap = new Map(); // 用于检测重复单词
        const duplicates = [];
        
        if (!this.wordsData || !this.wordsData.phonicsLessons) {
            console.warn('单词数据格式错误');
            return;
        }
        
        // 遍历所有课程，收集单词
        Object.entries(this.wordsData.phonicsLessons).forEach(([lessonKey, lesson]) => {
            if (lesson.words && Array.isArray(lesson.words)) {
                lesson.words.forEach(wordData => {
                    const wordKey = wordData.word.toLowerCase();
                    
                    // 检查重复
                    if (wordMap.has(wordKey)) {
                        const existing = wordMap.get(wordKey);
                        duplicates.push({
                            word: wordData.word,
                            existing: existing,
                            current: {
                                lesson: lessonKey,
                                difficulty: wordData.difficulty,
                                meaning: wordData.meaning
                            }
                        });
                        console.warn(`⚠️ 发现重复单词: "${wordData.word}" 在 ${lessonKey} 和 ${existing.lesson} 中都存在`);
                        return; // 跳过重复单词
                    }
                    
                    const processedWord = {
                        word: wordData.word.toLowerCase(),
                        meaning: wordData.meaning,
                        phonetic: wordData.phonetic,
                        difficulty: wordData.difficulty,
                        phoneme: lesson.phoneme,
                        description: lesson.description,
                        lesson: lessonKey // 添加来源课程信息
                    };
                    
                    this.allWords.push(processedWord);
                    wordMap.set(wordKey, {
                        lesson: lessonKey,
                        difficulty: wordData.difficulty,
                        meaning: wordData.meaning
                    });
                });
            }
        });
        
        // 报告重复情况
        if (duplicates.length > 0) {
            console.error(`❌ 发现 ${duplicates.length} 个重复单词，已自动跳过重复项`);
            duplicates.forEach(dup => {
                console.error(`   - "${dup.word}": ${dup.existing.lesson}(难度${dup.existing.difficulty}) vs ${dup.current.lesson}(难度${dup.current.difficulty})`);
            });
        }
        
        // 验证难度级别分布
        this.validateDifficultyDistribution();
        
        console.log(`📚 已加载 ${this.allWords.length} 个唯一单词`);
    }
    
    // 验证难度级别分布
    validateDifficultyDistribution() {
        const difficultyStats = { 1: 0, 2: 0, 3: 0 };
        
        this.allWords.forEach(word => {
            if (difficultyStats[word.difficulty] !== undefined) {
                difficultyStats[word.difficulty]++;
            }
        });
        
        console.log('📊 难度级别分布:');
        console.log(`   - 难度1 (Level 1-2): ${difficultyStats[1]} 个单词`);
        console.log(`   - 难度2 (Level 3-4): ${difficultyStats[2]} 个单词`);
        console.log(`   - 难度3 (Level 5+): ${difficultyStats[3]} 个单词`);
        
        // 检查是否有足够的单词
        Object.entries(difficultyStats).forEach(([difficulty, count]) => {
            if (count < 10) {
                console.warn(`⚠️ 难度${difficulty}只有${count}个单词，可能影响游戏体验`);
            }
        });
    }
    
    // 显示加载错误信息
    showLoadError(error) {
        // 创建错误信息元素
        const errorContainer = document.createElement('div');
        errorContainer.id = 'wordLoadError';
        errorContainer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            font-family: Arial, sans-serif;
        `;
        
        const errorBox = document.createElement('div');
        errorBox.style.cssText = `
            background: white;
            padding: 30px;
            border-radius: 10px;
            max-width: 500px;
            text-align: center;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        `;
        
        errorBox.innerHTML = `
            <h2 style="color: #e74c3c; margin-top: 0;">❌ 单词库加载失败</h2>
            <p style="color: #333; margin: 20px 0;">
                无法加载游戏所需的单词库文件 (words.json)
            </p>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <strong>错误详情：</strong><br>
                <code style="color: #e74c3c;">${error.message}</code>
            </div>
            <p style="color: #666; font-size: 14px;">
                请检查：<br>
                • 网络连接是否正常<br>
                • words.json 文件是否存在<br>
                • 服务器是否正常运行
            </p>
            <button onclick="location.reload()" style="
                background: #3498db;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 5px;
                cursor: pointer;
                font-size: 16px;
                margin-top: 20px;
            ">重新加载页面</button>
        `;
        
        errorContainer.appendChild(errorBox);
        document.body.appendChild(errorContainer);
        
        // 同时在控制台输出详细错误信息
        console.error('单词库加载失败详情:', {
            error: error,
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
    }

    // 获取指定等级的词汇（确保级别互斥）
    getVocabularyForLevel(level) {
        if (!this.allWords || this.allWords.length === 0) {
            console.warn('单词库未加载或为空');
            return [];
        }
        
        // 根据等级筛选单词 - 每个级别使用独立的难度单词
        let targetDifficulty;
        if (level <= 2) {
            targetDifficulty = 1; // 1-2级：仅使用难度1的单词
        } else if (level <= 4) {
            targetDifficulty = 2; // 3-4级：仅使用难度2的单词
        } else {
            targetDifficulty = 3; // 5级以上：仅使用难度3的单词
        }
        
        // 严格筛选：只选择指定难度的单词，确保级别互斥
        const filteredWords = this.allWords.filter(word => 
            word.difficulty === targetDifficulty
        );
        
        // 如果指定难度没有单词，记录警告但不降级
        if (filteredWords.length === 0) {
            console.warn(`难度${targetDifficulty}没有可用单词，等级${level}可能无法正常游戏`);
            // 紧急情况下使用所有单词，但这违反了互斥原则
            return this.allWords;
        }
        
        return filteredWords;
    }

    // 智能选择单词（避免短期重复）
    getRandomWord(level, isEndChallenge = false) {
        // 检查单词库是否已加载或加载失败
        if (!this.isLoaded) {
            if (this.loadError) {
                console.error('单词库加载失败，无法生成单词');
                return null;
            }
            console.warn('单词库尚未加载完成，请稍候...');
            return null;
        }
        
        const vocabulary = this.getVocabularyForLevel(level);
        
        if (vocabulary.length === 0) {
            console.error('没有可用的单词');
            return null;
        }
        
        // 动态调整最大跟踪数量（不超过词汇表的70%）
        this.maxRecentWords = Math.min(15, Math.floor(vocabulary.length * 0.7));
        
        let selectedWord = null;
        let attempts = 0;
        const maxAttempts = 50; // 防止无限循环
        
        // 尝试选择一个不在最近使用列表中的单词
        while (attempts < maxAttempts) {
            const randomIndex = Math.floor(Math.random() * vocabulary.length);
            const wordData = vocabulary[randomIndex];
            
            // 检查是否在最近使用列表中
            if (!this.isWordRecent(wordData.word)) {
                selectedWord = wordData;
                break;
            }
            
            attempts++;
        }
        
        // 如果尝试多次仍未找到，选择最不常用的单词
        if (!selectedWord) {
            selectedWord = this.selectLeastRecentWord(vocabulary);
        }
        
        // 将选中的单词添加到最近使用列表
        this.addToRecentWords(selectedWord.word);
        
        // 根据等级确定缺失字母数
        let missingCount = this.getMissingCountForLevel(level, isEndChallenge);
        let missingIndices = this.generateMissingIndices(selectedWord.word, missingCount);
        
        return {
            original: selectedWord.word,
            meaning: selectedWord.meaning,
            phonetic: selectedWord.phonetic || '',
            phoneme: selectedWord.phoneme || '',
            description: selectedWord.description || '',
            missing: missingIndices,
            display: this.createDisplayWord(selectedWord.word, missingIndices),
            missingLetters: this.getMissingLetters(selectedWord.word, missingIndices),
            level: level,
            difficulty: selectedWord.difficulty
        };
    }
    
    // 检查单词是否在最近使用列表中
    isWordRecent(word) {
        return this.recentWords.includes(word);
    }
    
    // 添加单词到最近使用列表
    addToRecentWords(word) {
        // 如果单词已存在，先移除
        const existingIndex = this.recentWords.indexOf(word);
        if (existingIndex !== -1) {
            this.recentWords.splice(existingIndex, 1);
        }
        
        // 添加到列表开头
        this.recentWords.unshift(word);
        
        // 保持列表大小不超过最大值
        if (this.recentWords.length > this.maxRecentWords) {
            this.recentWords = this.recentWords.slice(0, this.maxRecentWords);
        }
        
        console.log(`📝 最近使用单词: [${this.recentWords.slice(0, 5).join(', ')}...] (共${this.recentWords.length}个)`);
    }
    
    // 选择最不常用的单词（当所有单词都在最近使用列表中时）
    selectLeastRecentWord(vocabulary) {
        // 找到不在最近使用列表中的单词
        const availableWords = vocabulary.filter(word => !this.isWordRecent(word.word));
        
        if (availableWords.length > 0) {
            // 如果有可用单词，随机选择一个
            const randomIndex = Math.floor(Math.random() * availableWords.length);
            return availableWords[randomIndex];
        } else {
            // 如果所有单词都在最近使用列表中，选择最早使用的单词
            const oldestWord = this.recentWords[this.recentWords.length - 1];
            return vocabulary.find(word => word.word === oldestWord) || vocabulary[0];
        }
    }

    // 根据等级确定缺失字母数（按设计文档要求）
    getMissingCountForLevel(level, isEndChallenge = false) {
        let baseCount;
        
        if (level === 1) {
            baseCount = 1; // 1个字母
        } else if (level === 2) {
            baseCount = Math.random() < 0.5 ? 1 : 2; // 1-2个字母
        } else if (level === 3) {
            baseCount = Math.random() < 0.5 ? 1 : 2; // 1-2个字母  
        } else if (level === 4) {
            baseCount = 2; // 2个字母
        } else {
            baseCount = Math.random() < 0.3 ? 2 : 3; // 2-3个字母
        }
        
        // 等级末尾挑战：缺失字母数量+1
        if (isEndChallenge) {
            baseCount += 1;
        }
        
        return Math.max(1, baseCount); // 至少1个字母
    }

    // 生成缺失字母的位置
    generateMissingIndices(word, count) {
        const indices = [];
        const maxCount = Math.min(count, word.length - 1); // 至少保留一个字母
        
        while (indices.length < maxCount) {
            const randomIndex = Math.floor(Math.random() * word.length);
            if (!indices.includes(randomIndex)) {
                indices.push(randomIndex);
            }
        }
        
        return indices.sort((a, b) => a - b);
    }

    // 创建显示用的单词（带下划线）
    createDisplayWord(word, missingIndices) {
        let display = word.split('');
        missingIndices.forEach(index => {
            if (index < display.length) {
                display[index] = '_';
            }
        });
        return display.join('');
    }

    // 获取缺失的字母
    getMissingLetters(word, missingIndices) {
        return missingIndices.map(index => word[index]).join('');
    }

    // 添加错过的单词到生词本
    addMissedWord(wordData) {
        const word = wordData.original;
        const isGiveUp = wordData.giveUp || false;
        
        if (this.missedWords.has(word)) {
            const existing = this.missedWords.get(word);
            this.missedWords.set(word, {
                ...existing,
                count: existing.count + 1,
                giveUpCount: existing.giveUpCount + (isGiveUp ? 1 : 0),
                failCount: existing.failCount + (isGiveUp ? 0 : 1)
            });
        } else {
            this.missedWords.set(word, {
                word: word,
                meaning: wordData.meaning,
                phonetic: wordData.phonetic || '',
                count: 1,
                giveUpCount: isGiveUp ? 1 : 0,
                failCount: isGiveUp ? 0 : 1,
                level: wordData.level || 1
            });
        }
    }

    // 获取生词本
    getVocabularyBook() {
        return Array.from(this.missedWords.values());
    }

    // 清空当前等级的生词本（升级时调用）
    clearCurrentLevelVocabulary() {
        const currentVocab = Array.from(this.missedWords.values());
        this.missedWords.clear();
        return currentVocab;
    }

    // 获取生词本统计
    getVocabularyStats() {
        return {
            totalWords: this.allWords ? this.allWords.length : 0, // 单词库总数
            missedWords: this.missedWords.size, // 生词本数量
            words: this.getVocabularyBook()
        };
    }

    // 检查答案是否正确
    checkAnswer(wordData, userInput) {
        const correctAnswer = wordData.missingLetters.toUpperCase();
        const userAnswer = userInput.toUpperCase().trim();
        return correctAnswer === userAnswer;
    }

    // 获取重复率统计信息
    getRepetitionStats() {
        return {
            recentWordsCount: this.recentWords.length,
            maxRecentWords: this.maxRecentWords,
            recentWords: [...this.recentWords], // 返回副本
            totalWords: this.allWords.length
        };
    }
    
    // 重置最近使用单词列表
    resetRecentWords() {
        this.recentWords = [];
        console.log('🔄 已重置最近使用单词列表');
    }
    
}

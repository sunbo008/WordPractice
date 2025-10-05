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
            this.wordsData = await response.json();
            this.processWordsData();
            this.isLoaded = true;
            console.log('✅ 单词库加载成功:', this.wordsData.metadata);
        } catch (error) {
            console.error('❌ 单词库加载失败:', error);
            // 使用备用单词库
            this.loadFallbackWords();
            this.isLoaded = true;
        }
    }
    
    // 处理单词数据，创建统一的单词数组
    processWordsData() {
        this.allWords = [];
        
        if (!this.wordsData || !this.wordsData.phonicsLessons) {
            console.warn('单词数据格式错误');
            return;
        }
        
        // 遍历所有课程，收集单词
        Object.values(this.wordsData.phonicsLessons).forEach(lesson => {
            if (lesson.words && Array.isArray(lesson.words)) {
                lesson.words.forEach(wordData => {
                    this.allWords.push({
                        word: wordData.word.toUpperCase(),
                        meaning: wordData.meaning,
                        phonetic: wordData.phonetic,
                        difficulty: wordData.difficulty,
                        phoneme: lesson.phoneme,
                        description: lesson.description
                    });
                });
            }
        });
        
        console.log(`📚 已加载 ${this.allWords.length} 个单词`);
    }
    
    // 备用单词库（如果JSON加载失败）
    loadFallbackWords() {
        console.log('🔄 使用备用单词库');
        this.allWords = [
            { word: "CAT", meaning: "猫", difficulty: 1 },
            { word: "DOG", meaning: "狗", difficulty: 1 },
            { word: "SUN", meaning: "太阳", difficulty: 1 },
            { word: "RUN", meaning: "跑", difficulty: 1 },
            { word: "FUN", meaning: "有趣", difficulty: 1 },
            { word: "BIG", meaning: "大的", difficulty: 1 },
            { word: "RED", meaning: "红色", difficulty: 1 },
            { word: "BOX", meaning: "盒子", difficulty: 1 },
            { word: "BOOK", meaning: "书", difficulty: 2 },
            { word: "TREE", meaning: "树", difficulty: 2 },
            { word: "FISH", meaning: "鱼", difficulty: 2 },
            { word: "BIRD", meaning: "鸟", difficulty: 2 },
            { word: "WATER", meaning: "水", difficulty: 3 },
            { word: "SCHOOL", meaning: "学校", difficulty: 3 },
            { word: "TEACHER", meaning: "老师", difficulty: 3 }
        ];
    }

    // 获取指定等级的词汇
    getVocabularyForLevel(level) {
        if (!this.allWords || this.allWords.length === 0) {
            console.warn('单词库未加载或为空');
            return [];
        }
        
        // 根据等级筛选单词
        let targetDifficulty;
        if (level <= 2) {
            targetDifficulty = 1; // 1-2级使用难度1的单词
        } else if (level <= 4) {
            targetDifficulty = 2; // 3-4级使用难度2的单词
        } else {
            targetDifficulty = 3; // 5级以上使用难度3的单词
        }
        
        const filteredWords = this.allWords.filter(word => 
            word.difficulty <= targetDifficulty
        );
        
        return filteredWords.length > 0 ? filteredWords : this.allWords;
    }

    // 智能选择单词（避免短期重复）
    getRandomWord(level, isEndChallenge = false) {
        // 检查单词库是否已加载
        if (!this.isLoaded) {
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
            totalWords: this.missedWords.size,
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
    
    // 获取复习单词（从生词本中选择或随机选择）
    getReviewWord(specificWord = null) {
        let wordData;
        
        if (specificWord) {
            // 复习特定单词
            wordData = specificWord;
        } else {
            // 随机选择生词本中的单词
            const vocabularyBook = this.getVocabularyBook();
            if (vocabularyBook.length === 0) return null;
            
            const randomIndex = Math.floor(Math.random() * vocabularyBook.length);
            wordData = vocabularyBook[randomIndex];
        }
        
        // 随机选择1-2个字母作为缺失字母
        const word = wordData.word;
        const missingCount = Math.random() < 0.5 ? 1 : 2;
        const missingIndices = [];
        
        while (missingIndices.length < missingCount && missingIndices.length < word.length) {
            const randomIndex = Math.floor(Math.random() * word.length);
            if (!missingIndices.includes(randomIndex)) {
                missingIndices.push(randomIndex);
            }
        }
        
        return {
            original: word,
            meaning: wordData.meaning,
            missing: missingIndices,
            display: this.createDisplayWord(word, missingIndices),
            missingLetters: this.getMissingLetters(word, missingIndices),
            isReview: true,
            reviewData: wordData
        };
    }
}

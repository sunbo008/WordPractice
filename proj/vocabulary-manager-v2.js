// 分布式词汇库管理器 v2.0
class VocabularyManagerV2 {
    constructor() {
        this.wordsConfig = null;
        this.loadedLibraries = new Map(); // 存储已加载的词库
        this.allWords = [];
        this.currentVocabulary = [];
        this.missedWords = new Map(); // 存储错过的单词及其次数
        this.isLoaded = false;
        this.loadError = null;
        
        // 最近使用单词跟踪
        this.recentWords = [];
        this.maxRecentWords = 15;
        
        // 当前配置 (初始占位，会从配置加载器获取实际默认值)
        this.currentConfig = {
            enabledLibraries: [], // 会从配置加载器的defaultConfig获取
            maxWords: 200,
            difficultyRange: [1, 3],
            categories: ['all']
        };
        
        // 开始加载
        this.loadVocabularySystem();
    }
    
    // 加载词汇系统
    async loadVocabularySystem() {
        try {
            // 1. 加载配置文件
            await this.loadConfig();
            
            // 2. 加载用户设置
            this.loadUserSettings();
            
            // 3. 加载启用的词库
            await this.loadEnabledLibraries();
            
            // 4. 处理单词数据
            this.processAllWords();
            
            this.isLoaded = true;
            console.log('✅ 分布式词汇系统加载成功');
            console.log(`📊 总词库: ${this.loadedLibraries.size}个, 总单词: ${this.allWords.length}个`);
            
        } catch (error) {
            console.error('❌ 词汇系统加载失败:', error);
            this.loadError = error;
            this.isLoaded = false;
            this.showLoadError(error);
        }
    }
    
    // 加载配置文件
    async loadConfig() {
        console.log('📋 使用运行时动态配置加载...');
        
        // 使用动态配置加载器
        const configLoader = new VocabularyConfigLoader();
        this.wordsConfig = await configLoader.loadConfig();
        
        console.log('✅ 词库配置加载成功:', this.wordsConfig.metadata);
    }
    
    // 加载用户设置
    loadUserSettings() {
        try {
            const savedLibraries = localStorage.getItem('wordTetris_selectedLibraries');
            if (savedLibraries) {
                const libraries = JSON.parse(savedLibraries);
                this.currentConfig.enabledLibraries = libraries;
                console.log('⚙️ 用户词库选择加载成功:', libraries);
            } else {
                // 使用默认配置
                this.currentConfig.enabledLibraries = [...this.wordsConfig.defaultConfig.enabledLibraries];
                console.log('⚙️ 使用默认配置:', this.currentConfig.enabledLibraries);
            }
        } catch (error) {
            console.warn('⚠️ 用户设置加载失败，使用默认配置:', error);
            this.currentConfig.enabledLibraries = [...this.wordsConfig.defaultConfig.enabledLibraries];
        }
    }
    
    // 保存用户设置
    saveUserSettings() {
        try {
            localStorage.setItem('wordTetris_vocabularySettings', JSON.stringify(this.currentConfig));
            console.log('💾 用户设置已保存');
        } catch (error) {
            console.error('❌ 用户设置保存失败:', error);
        }
    }
    
    // 加载启用的词库
    async loadEnabledLibraries() {
        const enabledIds = this.currentConfig.enabledLibraries;
        const loadPromises = [];
        
        for (const libraryId of enabledIds) {
            const libraryInfo = this.findLibraryInfo(libraryId);
            if (libraryInfo) {
                loadPromises.push(this.loadSingleLibrary(libraryInfo));
            } else {
                console.warn(`⚠️ 未找到词库: ${libraryId}`);
            }
        }
        
        await Promise.all(loadPromises);
    }
    
    // 在层级结构中查找词库信息
    findLibraryInfo(libraryId) {
        // 遍历所有分类
        for (const category of this.wordsConfig.categories) {
            if (category.subcategories) {
                for (const sub of category.subcategories) {
                    // 检查二层结构（如：按天学习）
                    if (sub.id === libraryId) {
                        return sub;
                    }
                    // 检查三层结构（如：按年级分类）
                    if (sub.items) {
                        for (const item of sub.items) {
                            if (item.id === libraryId) {
                                return item;
                            }
                        }
                    }
                }
            }
        }
        return null;
    }
    
    // 加载单个词库
    async loadSingleLibrary(libraryInfo) {
        try {
            const response = await fetch(`./words/${libraryInfo.filename}`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const libraryData = await response.json();
            this.loadedLibraries.set(libraryInfo.id, {
                info: libraryInfo,
                data: libraryData
            });
            
            console.log(`📚 词库加载成功: ${libraryInfo.name} (${libraryData.metadata.totalWords}个单词)`);
            
        } catch (error) {
            console.error(`❌ 词库加载失败: ${libraryInfo.name}`, error);
            throw error;
        }
    }
    
    // 处理所有单词数据
    processAllWords() {
        this.allWords = [];
        const wordMap = new Map(); // 用于检测重复单词
        const duplicates = [];
        
        // 遍历所有已加载的词库
        for (const [libraryId, library] of this.loadedLibraries) {
            const { info, data } = library;
            
            // 处理不同格式的词库
            if (data.phonicsLessons) {
                // 音标课程格式
                this.processPhonicsLessons(data.phonicsLessons, libraryId, wordMap, duplicates);
            } else if (data.words) {
                // 直接单词列表格式
                this.processWordsList(data.words, libraryId, wordMap, duplicates);
            }
        }
        
        // 报告重复单词
        if (duplicates.length > 0) {
            console.warn(`⚠️ 发现 ${duplicates.length} 个重复单词:`, duplicates);
        }
        
        // 验证难度分布
        this.validateDifficultyDistribution();
        
        console.log(`📊 单词处理完成: 总计 ${this.allWords.length} 个单词`);
    }
    
    // 处理音标课程格式
    processPhonicsLessons(phonicsLessons, libraryId, wordMap, duplicates) {
        Object.entries(phonicsLessons).forEach(([lessonKey, lesson]) => {
            if (lesson.words && Array.isArray(lesson.words)) {
                lesson.words.forEach(wordData => {
                    this.addWordToCollection(wordData, libraryId, lessonKey, wordMap, duplicates);
                });
            }
        });
    }
    
    // 处理单词列表格式
    processWordsList(words, libraryId, wordMap, duplicates) {
        words.forEach(wordData => {
            this.addWordToCollection(wordData, libraryId, 'words', wordMap, duplicates);
        });
    }
    
    // 添加单词到集合
    addWordToCollection(wordData, libraryId, lessonKey, wordMap, duplicates) {
        const word = wordData.word.toLowerCase();
        
        if (wordMap.has(word)) {
            duplicates.push({
                word: word,
                libraries: [wordMap.get(word).libraryId, libraryId],
                lessons: [wordMap.get(word).lessonKey, lessonKey]
            });
            return; // 跳过重复单词
        }
        
        const processedWord = {
            ...wordData,
            word: word,
            libraryId: libraryId,
            lessonKey: lessonKey,
            phoneme: wordData.phoneme || '',
            description: wordData.description || ''
        };
        
        this.allWords.push(processedWord);
        wordMap.set(word, { libraryId, lessonKey });
    }
    
    // 验证难度分布
    validateDifficultyDistribution() {
        const difficultyCount = {};
        this.allWords.forEach(word => {
            const diff = word.difficulty || 1;
            difficultyCount[diff] = (difficultyCount[diff] || 0) + 1;
        });
        
        console.log('📊 难度分布:', difficultyCount);
        
        Object.entries(difficultyCount).forEach(([difficulty, count]) => {
            if (count < 10) {
                console.warn(`⚠️ 难度 ${difficulty} 单词数量较少: ${count}个`);
            }
        });
    }
    
    // 获取可用词库列表
    getAvailableLibraries() {
        return this.wordsConfig ? this.wordsConfig.availableLibraries : [];
    }
    
    // 获取当前配置
    getCurrentConfig() {
        return { ...this.currentConfig };
    }
    
    // 更新配置
    async updateConfig(newConfig) {
        const oldConfig = { ...this.currentConfig };
        this.currentConfig = { ...this.currentConfig, ...newConfig };
        
        // 如果启用的词库发生变化，重新加载
        if (JSON.stringify(oldConfig.enabledLibraries) !== JSON.stringify(this.currentConfig.enabledLibraries)) {
            console.log('🔄 词库配置已更改，重新加载...');
            
            // 清空当前数据
            this.loadedLibraries.clear();
            this.allWords = [];
            
            // 重新加载
            await this.loadEnabledLibraries();
            this.processAllWords();
        }
        
        // 保存设置
        this.saveUserSettings();
        
        console.log('⚙️ 配置已更新:', this.currentConfig);
    }
    
    // 获取词库统计信息
    getLibraryStats() {
        const stats = {
            totalLibraries: this.loadedLibraries.size,
            totalWords: this.allWords.length,
            libraries: []
        };
        
        for (const [libraryId, library] of this.loadedLibraries) {
            const libraryWords = this.allWords.filter(word => word.libraryId === libraryId);
            stats.libraries.push({
                id: libraryId,
                name: library.info.name,
                wordCount: libraryWords.length,
                difficulty: library.info.difficulty,
                category: library.info.category
            });
        }
        
        return stats;
    }
    
    // 显示加载错误
    showLoadError(error) {
        // 创建错误提示模态框
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.8); z-index: 10000;
            display: flex; align-items: center; justify-content: center;
        `;
        
        modal.innerHTML = `
            <div style="background: white; padding: 30px; border-radius: 10px; max-width: 500px; text-align: center;">
                <h2 style="color: #e74c3c; margin-bottom: 20px;">❌ 词库加载失败</h2>
                <p style="margin-bottom: 15px; color: #2c3e50;">无法加载词汇库文件，请检查以下问题：</p>
                <ul style="text-align: left; color: #7f8c8d; margin-bottom: 20px;">
                    <li>确保 words/ 目录存在</li>
                    <li>检查词库文件是否完整</li>
                    <li>验证网络连接是否正常</li>
                    <li>查看浏览器控制台获取详细错误信息</li>
                </ul>
                <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                    <strong>错误详情：</strong><br>
                    <code style="color: #e74c3c;">${error.message}</code>
                </div>
                <button onclick="location.reload()" style="
                    background: #3498db; color: white; border: none; padding: 10px 20px;
                    border-radius: 5px; cursor: pointer; font-size: 16px;
                ">重新加载页面</button>
            </div>
        `;
        
        document.body.appendChild(modal);
    }
    
    // 以下方法保持与原版本兼容
    getRandomWord(level, isEndChallenge = false) {
        return this.getVocabularyForLevel(level, isEndChallenge);
    }
    
    getVocabularyForLevel(targetDifficulty, isEndChallenge = false) {
        if (!this.isLoaded || this.allWords.length === 0) {
            return null;
        }
        
        // 严格筛选：只选择指定难度的单词，确保级别互斥
        const filteredWords = this.allWords.filter(word => 
            word.difficulty === targetDifficulty
        );
        
        if (filteredWords.length === 0) {
            console.warn(`没有找到难度为 ${targetDifficulty} 的单词`);
            return null;
        }
        
        // 优先选择非最近使用的单词
        const nonRecentWords = filteredWords.filter(word => !this.isWordRecent(word.word));
        const availableWords = nonRecentWords.length > 0 ? nonRecentWords : filteredWords;
        
        // 随机选择单词
        const selectedWord = availableWords[Math.floor(Math.random() * availableWords.length)];
        
        // 添加到最近使用列表
        this.addToRecentWords(selectedWord.word);
        
        // 随机选择1-2个字母作为缺失字母
        const missingCount = Math.random() < 0.5 ? 1 : 2;
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
            level: targetDifficulty,
            difficulty: selectedWord.difficulty
        };
    }
    
    // 其他兼容方法...
    generateMissingIndices(word, missingCount) {
        const indices = [];
        const wordLength = word.length;
        
        if (missingCount >= wordLength) {
            return Array.from({length: wordLength}, (_, i) => i);
        }
        
        while (indices.length < missingCount) {
            const randomIndex = Math.floor(Math.random() * wordLength);
            if (!indices.includes(randomIndex)) {
                indices.push(randomIndex);
            }
        }
        
        return indices.sort((a, b) => a - b);
    }
    
    createDisplayWord(word, missingIndices) {
        let display = word.split('');
        missingIndices.forEach(index => {
            if (index < display.length) {
                display[index] = '_';
            }
        });
        return display.join('');
    }
    
    getMissingLetters(word, missingIndices) {
        return missingIndices.map(index => word[index]).join('');
    }
    
    isWordRecent(word) {
        return this.recentWords.includes(word);
    }
    
    addToRecentWords(word) {
        if (this.recentWords.includes(word)) {
            this.recentWords = this.recentWords.filter(w => w !== word);
        }
        
        this.recentWords.unshift(word);
        
        if (this.recentWords.length > this.maxRecentWords) {
            this.recentWords = this.recentWords.slice(0, this.maxRecentWords);
        }
    }
    
    resetRecentWords() {
        this.recentWords = [];
        console.log('🔄 已重置最近使用单词列表');
    }
    
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
    
    getVocabularyBook() {
        return Array.from(this.missedWords.values());
    }
    
    clearCurrentLevelVocabulary() {
        const currentVocab = Array.from(this.missedWords.values());
        this.missedWords.clear();
        return currentVocab;
    }
    
    getVocabularyStats() {
        return {
            totalWords: this.allWords ? this.allWords.length : 0,
            missedWords: this.missedWords.size,
            words: this.getVocabularyBook()
        };
    }
    
    // 获取当前词库中可用的难度等级
    getAvailableDifficulties() {
        if (!this.isLoaded || !this.allWords || this.allWords.length === 0) {
            return [];
        }
        
        const difficulties = new Set();
        this.allWords.forEach(word => {
            if (word.difficulty) {
                difficulties.add(word.difficulty);
            }
        });
        
        const result = Array.from(difficulties).sort((a, b) => a - b);
        console.log('📊 可用难度等级:', result);
        return result;
    }
    
    checkAnswer(wordData, userInput) {
        const correctAnswer = wordData.missingLetters.toUpperCase();
        const userAnswer = userInput.toUpperCase().trim();
        return correctAnswer === userAnswer;
    }
    
    getRepetitionStats() {
        return {
            recentWordsCount: this.recentWords.length,
            maxRecentWords: this.maxRecentWords,
            recentWords: [...this.recentWords]
        };
    }
}

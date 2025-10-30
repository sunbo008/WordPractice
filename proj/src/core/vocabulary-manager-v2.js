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

        // 单词池系统（新）
        this.wordPool = []; // 当前可用的单词池
        this.usedWordsInGame = new Set(); // 本次游戏中已使用的单词
        this.levelWordsCount = 0; // 当前等级已使用的单词数

        // 已使用单词跟踪（用于确保所有单词都被使用）
        this.usedWords = new Set();

        // 去重与分级视图
        this.duplicateWords = [];
        this.wordsByDifficulty = new Map();

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
            // 优先检查是否有临时练习单词（来自错词复习页面）
            const tempPracticeWords = localStorage.getItem('wordTetris_tempPracticeWords');
            if (tempPracticeWords) {
                console.log('🎯 检测到临时练习单词，加载错词复习模式...');
                await this.loadTempPracticeWords(tempPracticeWords);
                this.isLoaded = true;
                console.log('✅ 临时练习单词加载成功');
                console.log(`📊 总单词: ${this.allWords.length}个`);
                return;
            }

            // 1. 加载配置文件
            await this.loadConfig();

            // 2. 加载用户设置
            this.loadUserSettings();

            // 3. 加载启用的词库
            await this.loadEnabledLibraries();

            // 4. 处理单词数据
            await this.processAllWords();

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

    /**
     * 加载临时练习单词（来自错词复习页面）
     */
    async loadTempPracticeWords(tempWordsJson) {
        try {
            const words = JSON.parse(tempWordsJson);
            console.log(`📝 加载临时练习单词: ${words.length} 个`);

            // 转换为游戏单词格式
            this.allWords = words.map(w => ({
                word: w.word || '',
                phonetic: w.phonetic || '',
                meaning: w.meaning || '',
                difficulty: 1, // 默认难度
                category: 'missed-words',
                libraryId: 'temp-practice'
            }));

            // 初始化单词池
            this.initializeWordPool();

            console.log(`✅ 临时练习单词加载完成: ${this.allWords.length} 个单词`);
        } catch (error) {
            console.error('❌ 加载临时练习单词失败:', error);
            throw error;
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

            // 检查是否选择了错词本
            const savedMissedWords = localStorage.getItem('wordTetris_selectedMissedWords');
            const hasMissedWords = savedMissedWords && JSON.parse(savedMissedWords).length > 0;

            if (savedLibraries) {
                const libraries = JSON.parse(savedLibraries);
                // 如果保存的配置为空数组
                if (Array.isArray(libraries) && libraries.length === 0) {
                    // 检查是否选择了错词本
                    if (hasMissedWords) {
                        // 只选择了错词本，不加载普通课程
                        this.currentConfig.enabledLibraries = [];
                        console.log('⚙️ 用户只选择了错词本，不加载普通课程');
                    } else {
                        // 既没有普通课程也没有错词本，使用默认配置
                        console.warn('⚠️ 保存的配置为空，使用默认配置');
                        this.currentConfig.enabledLibraries = [...this.wordsConfig.defaultConfig.enabledLibraries];
                    }
                } else {
                    this.currentConfig.enabledLibraries = libraries;
                    console.log('⚙️ 用户词库选择加载成功:', libraries);
                }
            } else {
                // 没有保存的配置
                if (hasMissedWords) {
                    // 只选择了错词本
                    this.currentConfig.enabledLibraries = [];
                    console.log('⚙️ 用户只选择了错词本，不加载普通课程');
                } else {
                    // 使用默认配置
                    this.currentConfig.enabledLibraries = [...this.wordsConfig.defaultConfig.enabledLibraries];
                    console.log('⚙️ 使用默认配置:', this.currentConfig.enabledLibraries);
                }
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

        // 检查是否选择了错词本
        const savedMissedWords = localStorage.getItem('wordTetris_selectedMissedWords');
        const hasMissedWords = savedMissedWords && JSON.parse(savedMissedWords).length > 0;

        // 如果没有启用的词库
        if (!enabledIds || enabledIds.length === 0) {
            // 如果选择了错词本，允许继续（只使用错词本）
            if (hasMissedWords) {
                console.log('⚙️ 没有启用普通词库，将只使用错词本');
                return;
            }
            // 如果也没有错词本，抛出错误
            throw new Error('未选择任何词库！请前往设置页面选择学习内容。');
        }

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

        // 如果没有成功加载任何词库
        if (this.loadedLibraries.size === 0) {
            // 如果选择了错词本，允许继续
            if (hasMissedWords) {
                console.log('⚙️ 普通词库加载失败，将只使用错词本');
                return;
            }
            // 如果也没有错词本，抛出错误
            throw new Error('未能成功加载任何词库！请检查词库文件是否存在。');
        }
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

    // 加载单个词库（延迟加载优化：只加载元数据）
    async loadSingleLibrary(libraryInfo) {
        try {
            const response = await fetch(`./words/${libraryInfo.filename}`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const libraryData = await response.json();

            // 延迟加载：只保存元数据和文件路径
            this.loadedLibraries.set(libraryInfo.id, {
                info: libraryInfo,
                metadata: libraryData.metadata,
                filename: libraryInfo.filename,
                wordsLoaded: false,  // 标记单词数据未加载
                data: null  // 暂时不保存完整数据
            });

            console.log(`📚 元数据加载: ${libraryInfo.name} (${libraryInfo.wordCount || 0}个单词)`);

        } catch (error) {
            console.error(`❌ 词库加载失败: ${libraryInfo.name}`, error);
            throw error;
        }
    }

    /**
     * 按需加载词库的完整单词数据
     */
    async loadLibraryWords(libraryId) {
        const library = this.loadedLibraries.get(libraryId);
        if (!library) {
            console.warn(`⚠️ 词库不存在: ${libraryId}`);
            return;
        }

        if (library.wordsLoaded) {
            console.log(`  ✓ 词库已加载: ${library.info.name}`);
            return;
        }

        try {
            const response = await fetch(`./words/${library.filename}`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const libraryData = await response.json();

            library.data = libraryData;
            library.wordsLoaded = true;

            console.log(`  📖 单词数据加载: ${library.info.name}`);

            // 处理这个词库的单词数据
            this.processLibraryWords(libraryId, libraryData);

        } catch (error) {
            console.error(`❌ 单词数据加载失败: ${library.info.name}`, error);
            throw error;
        }
    }

    /**
     * 处理单个词库的单词数据
     */
    processLibraryWords(libraryId, libraryData) {
        const wordMap = new Map(this.allWords.map(w => [w.word, w]));
        const duplicates = [];

        if (libraryData.phonicsLessons) {
            this.processPhonicsLessons(libraryData.phonicsLessons, libraryId, wordMap, duplicates);
        } else if (libraryData.words) {
            this.processWordsList(libraryData.words, libraryId, wordMap, duplicates);
        }

        if (duplicates.length > 0) {
            console.warn(`  ⚠️ 发现 ${duplicates.length} 个重复单词`);
            this.duplicateWords.push(...duplicates);
        }

        // 更新按难度分组的视图
        this.updateWordsByDifficulty();
    }

    /**
     * 加载选中的错词
     */
    async loadSelectedMissedWords() {
        try {
            // 获取选中的错词列表（错词卡名称）
            const selectedMissedWords = localStorage.getItem('wordTetris_selectedMissedWords');
            console.log('🔍 检查选中的错词:', selectedMissedWords);

            if (!selectedMissedWords) {
                console.log('📝 没有选中的错词');
                return;
            }

            const selectedCardNames = JSON.parse(selectedMissedWords);
            console.log('🔍 解析后的错词卡名称:', selectedCardNames);

            if (!Array.isArray(selectedCardNames) || selectedCardNames.length === 0) {
                console.log('📝 选中的错词卡列表为空');
                return;
            }

            // 获取所有错词数据
            if (!window.missedWordsManager) {
                console.error('❌ MissedWordsManager 未初始化');
                return;
            }

            console.log('🔍 开始获取错词数据...');
            const allMissedCards = await window.missedWordsManager.getMissedWords();
            console.log('🔍 所有错词卡:', allMissedCards);

            // 过滤出选中的错词卡
            const selectedCards = allMissedCards.filter(card =>
                selectedCardNames.includes(card.word)
            );

            if (selectedCards.length === 0) {
                console.log('📝 没有选中的错词需要加载');
                return;
            }

            console.log(`📝 开始加载 ${selectedCards.length} 个选中的错词卡`);

            // 将错词卡中的单词转换为游戏单词格式并添加到 allWords
            const wordMap = new Map(this.allWords.map(w => [w.word.toLowerCase(), w]));
            let addedCount = 0;

            selectedCards.forEach(card => {
                try {
                    // 解析错词卡中的单词数据
                    let wordsInCard = [];
                    try {
                        // 尝试解析 JSON 格式
                        wordsInCard = JSON.parse(card.meaning);
                    } catch (e) {
                        // 兼容旧格式：逗号分隔的单词列表
                        const wordList = card.meaning.split(',').map(w => w.trim()).filter(w => w);
                        wordsInCard = wordList.map(word => ({
                            word: word,
                            phonetic: '',
                            meaning: ''
                        }));
                    }

                    // 将每个单词添加到词汇表
                    wordsInCard.forEach(wordData => {
                        const wordLower = wordData.word.toLowerCase();
                        if (!wordMap.has(wordLower)) {
                            const wordObj = {
                                word: wordData.word,
                                phonetic: wordData.phonetic || '',
                                meaning: wordData.meaning || '',
                                difficulty: 2, // 错词默认难度为2
                                source: 'missed-words',
                                libraryId: `missed-words-${card.word}`
                            };
                            this.allWords.push(wordObj);
                            wordMap.set(wordLower, wordObj);
                            addedCount++;
                        }
                    });
                } catch (error) {
                    console.warn(`⚠️ 解析错词卡 "${card.word}" 失败:`, error);
                }
            });

            console.log(`✅ 成功加载 ${addedCount} 个单词（来自 ${selectedCards.length} 个错词卡）`);

        } catch (error) {
            console.error('❌ 错词加载失败:', error);
        }
    }

    /**
     * 更新按难度分组的词表
     */
    updateWordsByDifficulty() {
        this.wordsByDifficulty.clear();
        this.allWords.forEach(item => {
            const diff = item.difficulty || 1;
            if (!this.wordsByDifficulty.has(diff)) {
                this.wordsByDifficulty.set(diff, []);
            }
            this.wordsByDifficulty.get(diff).push(item);
        });
    }

    // 处理所有单词数据（延迟加载优化版）
    async processAllWords() {
        this.allWords = [];

        console.log('🔄 开始加载单词数据...');
        console.log(`📋 需要加载 ${this.currentConfig.enabledLibraries.length} 个词库`);

        // 并行加载所有启用的词库
        const loadPromises = [];
        for (const libraryId of this.currentConfig.enabledLibraries) {
            if (this.loadedLibraries.has(libraryId)) {
                loadPromises.push(this.loadLibraryWords(libraryId));
            } else {
                console.warn(`⚠️ 词库未找到: ${libraryId}`);
            }
        }

        await Promise.all(loadPromises);

        // 加载选中的错词
        await this.loadSelectedMissedWords();

        // 验证难度分布
        this.validateDifficultyDistribution();

        // 构建按难度分组的快速视图
        this.updateWordsByDifficulty();

        console.log(`📊 单词处理完成: 总计 ${this.allWords.length} 个单词`);

        // 初始化单词池
        this.initializeWordPool();
    }

    // 初始化单词池
    initializeWordPool() {
        // 将所有单词复制到单词池中（去重后的）
        this.wordPool = [...this.allWords];
        this.usedWordsInGame.clear();
        this.levelWordsCount = 0;

        // 打乱单词池顺序
        this.shuffleWordPool();

        console.log(`🎲 单词池已初始化: ${this.wordPool.length} 个单词`);
    }

    // 打乱单词池
    shuffleWordPool() {
        for (let i = this.wordPool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.wordPool[i], this.wordPool[j]] = [this.wordPool[j], this.wordPool[i]];
        }
    }

    // 重置单词池（游戏重置时调用）
    resetWordPool() {
        this.initializeWordPool();
        console.log('🔄 单词池已重置');
    }

    // 升级时的处理（不重置单词池，继续使用）
    onLevelUp() {
        this.levelWordsCount = 0;
        console.log(`📈 升级！剩余单词池: ${this.wordPool.length} 个`);
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
            await this.processAllWords();
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

        // 判断错误类型
        const isNoLibraryError = error.message.includes('未选择任何词库') || error.message.includes('未能成功加载任何词库');

        const errorContent = isNoLibraryError ? `
            <div style="background: white; padding: 30px; border-radius: 10px; max-width: 500px; text-align: center;">
                <h2 style="color: #f39c12; margin-bottom: 20px;">⚠️ 未选择学习内容</h2>
                <p style="margin-bottom: 15px; color: #2c3e50; font-size: 18px;">请先选择要学习的词库课程</p>
                <p style="margin-bottom: 20px; color: #7f8c8d;">首次使用需要在设置页面选择学习内容，<br>推荐选择"按天学习音标"分类</p>
                <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin-bottom: 20px; border-left: 4px solid #f39c12;">
                    <strong>提示：</strong> 可以使用"全选"按钮快速选择所有课程
                </div>
                <button onclick="location.href='./settings.html'" style="
                    background: #27ae60; color: white; border: none; padding: 12px 30px;
                    border-radius: 5px; cursor: pointer; font-size: 18px; margin-right: 10px;
                ">前往设置页面</button>
            </div>
        ` : `
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
                <button onclick="location.href='./settings.html'" style="
                    background: #27ae60; color: white; border: none; padding: 10px 20px;
                    border-radius: 5px; cursor: pointer; font-size: 16px; margin-right: 10px;
                ">前往设置页面</button>
                <button onclick="location.reload()" style="
                    background: #3498db; color: white; border: none; padding: 10px 20px;
                    border-radius: 5px; cursor: pointer; font-size: 16px;
                ">重新加载页面</button>
            </div>
        `;

        modal.innerHTML = errorContent;
        document.body.appendChild(modal);
    }

    // 以下方法保持与原版本兼容
    getRandomWord(level, isEndChallenge = false) {
        return this.getVocabularyForLevel(level, isEndChallenge);
    }

    // 从单词池中抽取单词（新的抽取式逻辑）
    getRandomWordFromAll(isEndChallenge = false) {
        if (!this.isLoaded || this.allWords.length === 0) {
            return null;
        }

        // 检查单词池是否为空
        if (this.wordPool.length === 0) {
            console.log('🎉 单词池已空，所有单词已完成！');
            return null;
        }

        // 从单词池中抽取第一个单词（已打乱顺序）
        const selectedWord = this.wordPool.shift();

        // 添加到本次游戏已使用列表
        this.usedWordsInGame.add(selectedWord.word);
        this.levelWordsCount++;

        // 添加到最近使用列表（用于避免连续重复）
        this.addToRecentWords(selectedWord.word);

        console.log(`📝 抽取单词: ${selectedWord.word} (剩余: ${this.wordPool.length})`);

        // 模式控制：挑战模式去掉全部字母，否则随机1-2个
        const mode = (localStorage.getItem('wordTetris_gameMode') === 'challenge') ? 'challenge' : 'casual';
        const missingCount = mode === 'challenge' ? selectedWord.word.length : (Math.random() < 0.5 ? 1 : 2);
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
            level: selectedWord.difficulty,
            difficulty: selectedWord.difficulty,
            stressPositions: this.getStressPositions(selectedWord.word, selectedWord.phonetic || '')
        };
    }

    getVocabularyForLevel(targetDifficulty, isEndChallenge = false) {
        if (!this.isLoaded || this.allWords.length === 0) {
            return null;
        }

        // 筛选指定难度的单词
        const filteredWords = this.allWords.filter(word =>
            word.difficulty === targetDifficulty
        );

        if (filteredWords.length === 0) {
            console.warn(`没有找到难度为 ${targetDifficulty} 的单词`);
            return null;
        }

        // 优先选择未使用过的单词
        const unusedWords = filteredWords.filter(word => !this.usedWords.has(word.word));

        // 如果所有单词都用过了，重置已使用列表（开始新一轮）
        if (unusedWords.length === 0) {
            console.log(`🔄 难度${targetDifficulty}的所有单词已使用完毕，开始新一轮`);
            // 清空该难度的已使用单词
            filteredWords.forEach(word => this.usedWords.delete(word.word));
            // 重新筛选未使用的单词
            const newUnusedWords = filteredWords.filter(word => !this.usedWords.has(word.word));
            var availableWords = newUnusedWords.length > 0 ? newUnusedWords : filteredWords;
        } else {
            var availableWords = unusedWords;
        }

        // 在可用单词中，优先选择非最近使用的单词
        const nonRecentWords = availableWords.filter(word => !this.isWordRecent(word.word));
        const finalWords = nonRecentWords.length > 0 ? nonRecentWords : availableWords;

        // 随机选择单词
        const selectedWord = finalWords[Math.floor(Math.random() * finalWords.length)];

        // 添加到已使用列表和最近使用列表
        this.usedWords.add(selectedWord.word);
        this.addToRecentWords(selectedWord.word);

        // 模式控制：挑战模式去掉全部字母，否则随机1-2个
        const mode = (localStorage.getItem('wordTetris_gameMode') === 'challenge') ? 'challenge' : 'casual';
        const missingCount = mode === 'challenge' ? selectedWord.word.length : (Math.random() < 0.5 ? 1 : 2);
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
            difficulty: selectedWord.difficulty,
            stressPositions: this.getStressPositions(selectedWord.word, selectedWord.phonetic || '')
        };
    }

    // 其他兼容方法...
    generateMissingIndices(word, missingCount) {
        const indices = [];
        const wordLength = word.length;

        if (missingCount >= wordLength) {
            return Array.from({ length: wordLength }, (_, i) => i);
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

    /**
     * 获取单词中重音音节的字母位置（整个音节）
     * @param {string} word - 英文单词
     * @param {string} phonetic - 音标 (如 "[ˈhæpi]", "[bəˈnɑːnə]")
     * @returns {Array<number>} - 重音音节所有字母的索引数组
     */
    getStressPositions(word, phonetic) {
        if (!word || !phonetic) {
            return [];
        }

        const lowerWord = word.toLowerCase();

        // 从音标中提取重音位置
        // 音标格式如: [ˈhæpi] 或 [həˈləʊ] 
        // ˈ 表示主重音，ˌ 表示次重音

        // 1. 找到音标中的重音符号位置
        // 注意：重音符号后可能跟辅音，不一定紧跟元音
        const stressIndices = [];
        for (let i = 0; i < phonetic.length; i++) {
            if (phonetic[i] === 'ˈ' || phonetic[i] === 'ˌ') {
                stressIndices.push({
                    index: i,
                    type: phonetic[i]
                });
            }
        }

        const matches = stressIndices;

        if (matches.length === 0) {
            // 如果没有重音符号，不高亮任何字母（单音节词通常没有重音标记）
            return [];
        }

        // 2. 根据重音音标映射到单词中的元音位置，然后扩展为整个音节
        const result = [];
        const vowels = 'aeiou';

        // 优先处理主重音（ˈ），如果没有主重音才处理次重音（ˌ）
        const primaryStress = matches.filter(m => m.type === 'ˈ');
        const stressesToProcess = primaryStress.length > 0 ? primaryStress : matches;

        stressesToProcess.forEach(stressMatch => {
            // 计算这个重音在音标中是第几个音节
            const beforeStress = phonetic.substring(0, stressMatch.index);
            const syllablesBefore = (beforeStress.match(/[əæɑɒɔɪiːɜɛeʊuːʌɔːaʊ]+/g) || []).length;

            // 找到单词中对应的第N个元音字母
            let vowelCount = 0;
            for (let i = 0; i < lowerWord.length; i++) {
                if (vowels.includes(lowerWord[i])) {
                    if (vowelCount === syllablesBefore) {
                        // 找到了对应的重音元音，扩展为整个音节
                        const syllablePositions = this.getWholeSyllable(lowerWord, i);
                        syllablePositions.forEach(pos => {
                            if (!result.includes(pos)) {
                                result.push(pos);
                            }
                        });
                        break;
                    }
                    vowelCount++;
                }
            }
        });

        // 如果还是没找到，返回空数组（不高亮）
        if (result.length === 0) {
            return [];
        }

        return result.sort((a, b) => a - b);
    }

    /**
     * 获取包含指定元音的整个音节的字母位置
     * @param {string} word - 单词
     * @param {number} vowelIndex - 元音字母的索引
     * @returns {Array<number>} - 音节所有字母的索引数组
     */
    getWholeSyllable(word, vowelIndex) {
        const vowels = 'aeiou';
        const result = [];

        // 如果vowelIndex不是元音，先找到最近的元音
        let centerVowel = vowelIndex;
        if (!vowels.includes(word[centerVowel])) {
            centerVowel = this.findNearestVowel(word, centerVowel);
            if (centerVowel === -1) {
                // 没有元音，返回整个单词
                return Array.from({ length: word.length }, (_, i) => i);
            }
        }

        // 向左扩展：包含前面的辅音
        let left = centerVowel;

        // 计算前面有多少个连续辅音
        let consonantsBeforeCount = 0;
        let tempLeft = left - 1;
        while (tempLeft >= 0 && !vowels.includes(word[tempLeft])) {
            consonantsBeforeCount++;
            tempLeft--;
        }

        // 辅音分配策略（向左）：
        if (tempLeft >= 0) {
            // 前面还有元音
            if (consonantsBeforeCount === 1) {
                // 单个辅音：归属于当前音节（如 about 的 b 归 bout）
                left = left - 1;
            } else if (consonantsBeforeCount >= 2) {
                // 多个辅音：取后一半归当前音节
                left = left - Math.ceil(consonantsBeforeCount / 2);
            }
            // consonantsBeforeCount === 0 时，left 保持不变
        } else {
            // 前面没有元音了（单词开头），取所有辅音
            left = 0;
        }

        // 向右扩展
        let right = centerVowel;

        // 1. 先包含连续的元音（如 ea, oo, ou 等）
        while (right < word.length - 1 && vowels.includes(word[right + 1])) {
            right++;
        }

        // 2. 然后包含后面的辅音
        let consonantsAfterCount = 0;
        let tempRight = right;
        while (tempRight < word.length - 1 && !vowels.includes(word[tempRight + 1])) {
            consonantsAfterCount++;
            tempRight++;
        }

        // 辅音分配策略（向右）：
        if (tempRight < word.length - 1) {
            // 后面还有元音，需要分配辅音
            // 规则：所有辅音都归属于下一个音节（更符合英语发音）
            // father = fa-ther (不是 fat-her)
            // about = a-bout (不是 ab-out)
            // right 保持不变（不包含后面的辅音）
        } else {
            // 后面没有元音了（单词结尾），取所有辅音
            right = tempRight;
        }

        // 收集范围内的所有索引
        for (let i = left; i <= right && i < word.length; i++) {
            result.push(i);
        }

        return result;
    }

    /**
     * 找到距离指定位置最近的元音字母
     */
    findNearestVowel(word, startPos) {
        const vowels = 'aeiouAEIOU';

        // 先向右找
        for (let i = startPos; i < word.length; i++) {
            if (vowels.includes(word[i])) {
                return i;
            }
        }

        // 再向左找
        for (let i = startPos - 1; i >= 0; i--) {
            if (vowels.includes(word[i])) {
                return i;
            }
        }

        return -1;
    }

    /**
     * 找到单词中第一个音节的所有字母位置（默认重音规则）
     * 注意：此方法已废弃，现在没有重音符号的单词不高亮
     */
    findFirstVowelPositions(word) {
        // 没有重音符号的单词（通常是单音节词）不需要高亮
        return [];
    }

    getRepetitionStats() {
        return {
            recentWordsCount: this.recentWords.length,
            maxRecentWords: this.maxRecentWords,
            recentWords: [...this.recentWords]
        };
    }

    // ====== 新增：分级视图与去重校验辅助 API ======
    /**
     * 获取按难度分组后的词表（已全局去重）
     * 返回对象：{ [difficulty: number]: Array<{word, meaning, ...}> }
     */
    getWordsGroupedByDifficulty() {
        const result = {};
        for (const [diff, list] of this.wordsByDifficulty.entries()) {
            result[diff] = list.map(w => ({
                word: w.word,
                meaning: w.meaning,
                phonetic: w.phonetic || '',
                libraryId: w.libraryId,
                lessonKey: w.lessonKey,
                difficulty: w.difficulty || 1
            }));
        }
        return result;
    }

    /**
     * 返回等级规划摘要（按难度排序）
     */
    getLevelPlanSummary() {
        const entries = Array.from(this.wordsByDifficulty.entries())
            .sort((a, b) => (a[0] - b[0]));
        return entries.map(([diff, list]) => ({
            difficulty: diff,
            count: list.length,
            examples: list.slice(0, 10).map(w => w.word)
        }));
    }

    /**
     * 获取被判定为重复且被过滤掉的词（来源与位置）
     */
    getFilteredDuplicateWords() {
        return [...this.duplicateWords];
    }
}

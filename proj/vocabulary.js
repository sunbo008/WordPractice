// 词汇库管理
class VocabularyManager {
    constructor() {
        this.vocabularyBank = {
            level1: [
                { word: "CAT", missing: [0], meaning: "猫" },
                { word: "DOG", missing: [1], meaning: "狗" },
                { word: "SUN", missing: [1], meaning: "太阳" },
                { word: "RUN", missing: [0], meaning: "跑" },
                { word: "FUN", missing: [2], meaning: "有趣" },
                { word: "BIG", missing: [1], meaning: "大的" },
                { word: "RED", missing: [1], meaning: "红色" },
                { word: "BOX", missing: [2], meaning: "盒子" },
                { word: "HAT", missing: [0], meaning: "帽子" },
                { word: "BAT", missing: [2], meaning: "蝙蝠" },
                { word: "CUP", missing: [1], meaning: "杯子" },
                { word: "PEN", missing: [0], meaning: "钢笔" },
                { word: "BED", missing: [2], meaning: "床" },
                { word: "EGG", missing: [0], meaning: "鸡蛋" },
                { word: "BAG", missing: [1], meaning: "包" },
                { word: "LEG", missing: [0], meaning: "腿" },
                { word: "NET", missing: [2], meaning: "网" },
                { word: "WET", missing: [1], meaning: "湿的" },
                { word: "HOT", missing: [1], meaning: "热的" },
                { word: "TOP", missing: [0], meaning: "顶部" }
            ],
            level2: [
                { word: "BOOK", missing: [1], meaning: "书" },
                { word: "TREE", missing: [1], meaning: "树" },
                { word: "FISH", missing: [0], meaning: "鱼" },
                { word: "BIRD", missing: [1], meaning: "鸟" },
                { word: "HAND", missing: [1], meaning: "手" },
                { word: "FOOT", missing: [1], meaning: "脚" },
                { word: "HEAD", missing: [1], meaning: "头" },
                { word: "FACE", missing: [1], meaning: "脸" },
                { word: "DOOR", missing: [1], meaning: "门" },
                { word: "WALL", missing: [1], meaning: "墙" },
                { word: "DESK", missing: [1], meaning: "桌子" },
                { word: "CAKE", missing: [1], meaning: "蛋糕" },
                { word: "MILK", missing: [1], meaning: "牛奶" },
                { word: "BALL", missing: [1], meaning: "球" },
                { word: "GAME", missing: [1], meaning: "游戏" },
                { word: "PLAY", missing: [1], meaning: "玩" },
                { word: "WORK", missing: [1], meaning: "工作" },
                { word: "HOME", missing: [1], meaning: "家" },
                { word: "LOVE", missing: [1], meaning: "爱" },
                { word: "HELP", missing: [1], meaning: "帮助" }
            ],
            level3: [
                { word: "HOUSE", missing: [1], meaning: "房子" },
                { word: "WATER", missing: [1, 3], meaning: "水" },
                { word: "HAPPY", missing: [1], meaning: "快乐的" },
                { word: "SMILE", missing: [1], meaning: "微笑" },
                { word: "FRIEND", missing: [1, 4], meaning: "朋友" },
                { word: "FAMILY", missing: [1, 4], meaning: "家庭" },
                { word: "SCHOOL", missing: [1, 4], meaning: "学校" },
                { word: "TEACHER", missing: [1, 5], meaning: "老师" },
                { word: "STUDENT", missing: [1, 5], meaning: "学生" },
                { word: "MOTHER", missing: [1, 4], meaning: "妈妈" },
                { word: "FATHER", missing: [1, 4], meaning: "爸爸" },
                { word: "SISTER", missing: [1, 4], meaning: "姐妹" },
                { word: "BROTHER", missing: [1, 5], meaning: "兄弟" },
                { word: "FLOWER", missing: [1, 4], meaning: "花" },
                { word: "GARDEN", missing: [1, 4], meaning: "花园" },
                { word: "ANIMAL", missing: [1, 4], meaning: "动物" },
                { word: "RABBIT", missing: [1, 4], meaning: "兔子" },
                { word: "MONKEY", missing: [1, 4], meaning: "猴子" },
                { word: "ELEPHANT", missing: [1, 6], meaning: "大象" },
                { word: "BUTTERFLY", missing: [1, 6], meaning: "蝴蝶" }
            ]
        };
        
        this.currentVocabulary = [];
        this.missedWords = new Map(); // 存储错过的单词及其次数
    }

    // 获取指定等级的词汇
    getVocabularyForLevel(level) {
        const levelKey = `level${Math.min(level, 3)}`;
        return this.vocabularyBank[levelKey] || this.vocabularyBank.level1;
    }

    // 随机选择一个单词
    getRandomWord(level, isEndChallenge = false) {
        const vocabulary = this.getVocabularyForLevel(level);
        const randomIndex = Math.floor(Math.random() * vocabulary.length);
        const wordData = vocabulary[randomIndex];
        
        // 根据等级确定缺失字母数
        let missingCount = this.getMissingCountForLevel(level, isEndChallenge);
        let missingIndices = this.generateMissingIndices(wordData.word, missingCount);
        
        return {
            original: wordData.word,
            meaning: wordData.meaning,
            missing: missingIndices,
            display: this.createDisplayWord(wordData.word, missingIndices),
            missingLetters: this.getMissingLetters(wordData.word, missingIndices),
            level: level
        };
    }

    // 根据等级确定缺失字母数
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
        
        return baseCount;
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

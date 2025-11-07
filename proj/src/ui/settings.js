// 艾宾浩斯遗忘曲线复习时间点（天数）
const EBBINGHAUS_INTERVALS = [1, 2, 4, 8, 16, 31];

/**
 * 计算艾宾浩斯复习状态
 * @param {number} createTime - 创建时间戳
 * @param {number} lastUpdate - 最后更新时间戳（用于判断是否重新学习）
 * @returns {Object} { needReview: boolean, daysElapsed: number, nextReviewDay: number, completed: boolean }
 */
function calculateEbbinghausStatus(createTime, lastUpdate) {
    const now = Date.now();

    // 始终使用创建时间来计算复习天数
    // 从创建日期（忽略具体时间）到当前日期的天数
    const createDate = new Date(createTime);
    createDate.setHours(0, 0, 0, 0); // 重置到当天0点

    const today = new Date(now);
    today.setHours(0, 0, 0, 0); // 重置到今天0点

    // 计算天数差（使用日期差而不是时间戳差，更准确）
    const baseDays = Math.floor((today - createDate) / (1000 * 60 * 60 * 24));
    const daysElapsed = baseDays; // 从创建到现在过了多少天

    // 判断当前天数是否是复习日
    let needReview = false;
    let nextReviewDay = null;
    let completed = false;

    // 检查当前天数是否正好是某个复习时间点
    if (EBBINGHAUS_INTERVALS.includes(baseDays)) {
        needReview = true;
    }

    // 找到下一个复习时间点
    for (let interval of EBBINGHAUS_INTERVALS) {
        if (baseDays < interval) {
            nextReviewDay = interval;
            break;
        }
    }

    // 如果已经超过所有复习时间点，标记为已完成
    if (nextReviewDay === null && baseDays > EBBINGHAUS_INTERVALS[EBBINGHAUS_INTERVALS.length - 1]) {
        completed = true;
    }

    return {
        needReview,      // 是否需要复习（感叹号）
        daysElapsed,     // 从创建到现在过了多少天
        baseDays,        // 从基准时间（创建或最后更新）到现在过了多少天
        nextReviewDay,   // 下一个复习时间点（第几天）
        completed        // 是否完成所有复习周期
    };
}

/**
 * 获取艾宾浩斯状态的显示文本和图标
 */
function getEbbinghausDisplay(status) {
    if (status.completed) {
        return {
            icon: '✅',
            text: '已掌握',
            cssClass: 'ebb-completed',
            title: '已完成所有复习周期，掌握良好！'
        };
    }

    if (status.needReview) {
        return {
            icon: '❗',  // 感叹号 - 需要复习
            text: `${status.baseDays}天`,
            cssClass: 'ebb-need-review',
            title: `⚠️ 需要复习！已过 ${status.baseDays} 天，建议立即复习`
        };
    }

    return {
        icon: '⭕',  // 空圈 - 暂不需要
        text: `${status.baseDays}天`,
        cssClass: 'ebb-waiting',
        title: `下次复习时间：第 ${status.nextReviewDay} 天（当前第 ${status.baseDays} 天）`
    };
}

// 层级化设置页面管理器 v2.0
class SettingsManagerV2 {
    constructor() {
        this.config = null;
        this.selectedLibraries = new Set();
        // 新增：难度模式（休闲/挑战）
        this.gameMode = 'casual';
        this._modeBound = false;
        // 记录展开状态
        this.expandedCategories = new Set();
        this.expandedGradeGroups = new Set();
        // 错词管理
        this.userIP = null;
        this.missedWords = [];
        this.selectedMissedWords = new Set();

        // 初始化调试日志
        if (typeof debugLog !== 'undefined') {
            debugLog.init();
        }

        this.init();
    }

    async init() {
        try {
            const startTime = performance.now();
            debugLog.info('⏱️ [Settings] 开始初始化...');

            this.showStatus('正在加载配置...', 'info');

            // 加载配置文件
            const configStart = performance.now();
            await this.loadConfig();
            debugLog.info(`⏱️ [Settings] 加载配置文件耗时: ${(performance.now() - configStart).toFixed(2)}ms`);

            // 加载用户设置
            const settingsStart = performance.now();
            this.loadUserSettings();
            debugLog.info(`⏱️ [Settings] 加载用户设置耗时: ${(performance.now() - settingsStart).toFixed(2)}ms`);

            // 加载错词数据
            const missedWordsStart = performance.now();
            this.loadMissedWords();
            debugLog.info(`⏱️ [Settings] 加载错词数据耗时: ${(performance.now() - missedWordsStart).toFixed(2)}ms`);

            // 渲染界面
            const renderStart = performance.now();
            this.renderInterface();
            debugLog.info(`⏱️ [Settings] 渲染界面耗时: ${(performance.now() - renderStart).toFixed(2)}ms`);

            const totalTime = performance.now() - startTime;
            debugLog.success(`⏱️ [Settings] 总初始化耗时: ${totalTime.toFixed(2)}ms`);

            this.showStatus('配置加载完成！', 'success');

        } catch (error) {
            debugLog.error('初始化失败: ' + error);
            this.showStatus('配置加载失败: ' + error.message, 'error');
        }
    }

    async loadConfig() {
        console.log('📋 使用运行时动态配置加载...');

        // 使用动态配置加载器
        const configLoader = new VocabularyConfigLoader();
        this.config = await configLoader.loadConfig();

        console.log('✅ 词库配置加载成功:', this.config.metadata);
    }

    loadUserSettings() {
        try {
            const saved = localStorage.getItem('wordTetris_selectedLibraries');

            // 检查是否选择了错词本
            const savedMissedWords = localStorage.getItem('wordTetris_selectedMissedWords');
            const hasMissedWords = savedMissedWords && JSON.parse(savedMissedWords).length > 0;

            if (saved) {
                const parsed = JSON.parse(saved);
                // 如果保存的配置为空数组
                if (Array.isArray(parsed) && parsed.length === 0) {
                    // 检查是否选择了错词本
                    if (hasMissedWords) {
                        // 只选择了错词本，不加载默认配置
                        this.selectedLibraries = new Set();
                        console.log('⚙️ 用户只选择了错词本，不加载默认课程');
                    } else {
                        // 既没有普通课程也没有错词本，使用默认配置
                        console.warn('⚠️ 保存的配置为空，使用默认配置');
                        this.selectedLibraries = new Set(this.config.defaultConfig.enabledLibraries);
                    }
                } else {
                    this.selectedLibraries = new Set(parsed);
                    console.log('⚙️ 用户设置加载成功:', Array.from(this.selectedLibraries));
                }
            } else {
                // 没有保存的配置
                if (hasMissedWords) {
                    // 只选择了错词本
                    this.selectedLibraries = new Set();
                    console.log('⚙️ 用户只选择了错词本，不加载默认课程');
                } else {
                    // 使用默认配置
                    this.selectedLibraries = new Set(this.config.defaultConfig.enabledLibraries);
                    console.log('⚙️ 使用默认配置:', Array.from(this.selectedLibraries));
                }
            }

            // 新增：加载难度模式
            const savedMode = localStorage.getItem('wordTetris_gameMode');
            this.gameMode = savedMode === 'challenge' ? 'challenge' : 'casual';

            // 加载展开状态
            const savedCat = localStorage.getItem('wordTetris_expandedCategories');
            const savedGrade = localStorage.getItem('wordTetris_expandedGradeGroups');
            this.expandedCategories = new Set(Array.isArray(JSON.parse(savedCat || '[]')) ? JSON.parse(savedCat || '[]') : []);
            this.expandedGradeGroups = new Set(Array.isArray(JSON.parse(savedGrade || '[]')) ? JSON.parse(savedGrade || '[]') : []);

            // 加载选中的错词
            if (hasMissedWords) {
                this.selectedMissedWords = new Set(JSON.parse(savedMissedWords));
                console.log('⚙️ 已加载选中的错词:', Array.from(this.selectedMissedWords));
            }
        } catch (error) {
            console.warn('⚠️ 用户设置加载失败，使用默认配置:', error);
            this.selectedLibraries = new Set(this.config.defaultConfig.enabledLibraries);
            this.gameMode = 'casual';
            this.expandedCategories = new Set();
            this.expandedGradeGroups = new Set();
            this.selectedMissedWords = new Set();
        }
    }

    saveUserSettings() {
        try {
            localStorage.setItem('wordTetris_selectedLibraries',
                JSON.stringify(Array.from(this.selectedLibraries)));
            // 新增：保存难度模式
            localStorage.setItem('wordTetris_gameMode', this.gameMode);
            // 保存展开状态
            localStorage.setItem('wordTetris_expandedCategories', JSON.stringify(Array.from(this.expandedCategories)));
            localStorage.setItem('wordTetris_expandedGradeGroups', JSON.stringify(Array.from(this.expandedGradeGroups)));
            // 保存选中的错词
            localStorage.setItem('wordTetris_selectedMissedWords', JSON.stringify(Array.from(this.selectedMissedWords)));
            console.log('💾 用户设置已保存');
        } catch (error) {
            console.error('❌ 用户设置保存失败:', error);
        }
    }

    renderInterface() {
        debugLog.info('🎨 [Settings] 开始渲染界面...');

        const overviewStart = performance.now();
        this.renderOverview();
        debugLog.info(`⏱️ [Settings] 渲染概览耗时: ${(performance.now() - overviewStart).toFixed(2)}ms`);

        const categoriesStart = performance.now();
        this.renderCategories();
        debugLog.info(`⏱️ [Settings] 渲染分类耗时: ${(performance.now() - categoriesStart).toFixed(2)}ms`);

        // 新增：渲染模式开关
        const modeStart = performance.now();
        this.renderMode();
        debugLog.info(`⏱️ [Settings] 渲染模式开关耗时: ${(performance.now() - modeStart).toFixed(2)}ms`);

        // 新增：渲染错词分类
        const missedWordsStart = performance.now();
        this.renderMissedWords();
        debugLog.info(`⏱️ [Settings] 渲染错词分类耗时: ${(performance.now() - missedWordsStart).toFixed(2)}ms`);

        // 确保存储信息显示已更新（延迟确保DOM已渲染）
        setTimeout(() => {
            this.updateStorageInfo();
        }, 100);
    }

    renderOverview() {
        // 计算已选课程数（包括普通课程和错词本）
        const totalSelectedCount = this.selectedLibraries.size + this.selectedMissedWords.size;
        document.getElementById('enabled-count').textContent = totalSelectedCount;

        // 计算总单词数
        let totalWords = 0;

        // 1. 计算普通课程的单词数
        this.config.categories.forEach(category => {
            if (category.subcategories) {
                category.subcategories.forEach(sub => {
                    // 检查是否是三层结构（年级分类）
                    if (sub.items) {
                        // 处理年级分类的三层结构（如：按年级分类 -> 小学词汇 -> 三年级上学期）
                        sub.items.forEach(item => {
                            if (this.selectedLibraries.has(item.id)) {
                                totalWords += item.wordCount || 0;
                            }
                        });
                    } else {
                        // 处理二层结构（如：按天学习 -> Day 1）
                        if (this.selectedLibraries.has(sub.id)) {
                            totalWords += sub.wordCount || 0;
                        }
                    }
                });
            }
        });

        // 2. 计算选中的错词本中的单词数
        if (this.selectedMissedWords.size > 0) {
            console.log('🔍 计算错词本单词数:');
            console.log('  - 选中的错词卡:', Array.from(this.selectedMissedWords));
            console.log('  - 所有错词卡数量:', this.missedWords.length);
            console.log('  - 所有错词卡:', this.missedWords.map(c => c.word));

            this.missedWords.forEach(card => {
                if (this.selectedMissedWords.has(card.word)) {
                    console.log(`  ✓ 匹配到错词卡: ${card.word}`);
                    // 解析错词卡中的单词数量
                    try {
                        const wordsInCard = JSON.parse(card.meaning);
                        console.log(`    - 包含 ${wordsInCard.length} 个单词`);
                        totalWords += wordsInCard.length;
                    } catch (e) {
                        console.log(`    - 解析失败，使用旧格式`);
                        // 兼容旧格式：逗号分隔的单词列表
                        const wordList = card.meaning.split(',').map(w => w.trim()).filter(w => w);
                        console.log(`    - 包含 ${wordList.length} 个单词`);
                        totalWords += wordList.length;
                    }
                }
            });
        }

        document.getElementById('total-words-count').textContent = totalWords;
    }

    // 新增：模式渲染与绑定
    renderMode() {
        const casual = document.getElementById('mode-casual');
        const challenge = document.getElementById('mode-challenge');

        // 设置初始状态
        if (casual && challenge) {
            if (this.gameMode === 'challenge') {
                challenge.checked = true;
            } else {
                casual.checked = true;
            }

            // 绑定事件监听器
            if (!this._modeBound) {
                casual.addEventListener('change', () => {
                    if (casual.checked) {
                        this.gameMode = 'casual';
                        this.saveUserSettings();
                        this.showStatus('😊 已切换为休闲模式', 'success');
                    }
                });

                challenge.addEventListener('change', () => {
                    if (challenge.checked) {
                        this.gameMode = 'challenge';
                        this.saveUserSettings();
                        this.showStatus('🔥 已切换为挑战模式', 'success');
                    }
                });

                this._modeBound = true;
            }
        }
    }

    renderCategories() {
        this.config.categories.forEach(category => {
            if (category.id === 'daily-phonics') {
                this.renderDailyPhonics(category);
            } else if (category.id === 'special-practice') {
                this.renderSpecialPractice(category);
            } else if (category.id === 'grade-based') {
                this.renderGradeBased(category);
            } else if (category.id === 'extracurricular-books') {
                // 使用专门的课外书渲染逻辑
                this.renderExtracurricularBooks(category);
            }
        });

        // 应用展开状态
        this.applyExpandState();
    }

    applyExpandState() {
        // 顶层分类
        ['daily-phonics', 'special-practice', 'grade-based', 'extracurricular-books'].forEach(id => {
            const content = document.getElementById(`${id}-content`);
            if (!content) return;
            const header = content.previousElementSibling;
            const icon = header.querySelector('.expand-icon');
            const shouldExpand = this.expandedCategories.has(id);
            if (shouldExpand) {
                content.classList.remove('collapsed');
                icon && icon.classList.add('expanded');
                content.style.maxHeight = 'none';
            } else {
                content.classList.add('collapsed');
                icon && icon.classList.remove('expanded');
                content.style.maxHeight = '0px';
            }
        });
        // 年级组
        ['primary-school', 'middle-school', 'high-school'].forEach(id => {
            const content = document.getElementById(`${id}-grid`);
            if (!content) return;
            const header = content.previousElementSibling;
            const icon = header.querySelector('.expand-icon');
            const shouldExpand = this.expandedGradeGroups.has(id);
            if (shouldExpand) {
                content.classList.remove('collapsed');
                icon && icon.classList.add('expanded');
                content.style.maxHeight = 'none';
            } else {
                content.classList.add('collapsed');
                icon && icon.classList.remove('expanded');
                content.style.maxHeight = '0px';
            }
        });
    }

    async renderDailyPhonics(category) {
        const grid = document.getElementById('daily-phonics-grid');
        grid.innerHTML = '';

        let selectedCount = 0;

        for (const day of category.subcategories) {
            const isSelected = this.selectedLibraries.has(day.id);
            if (isSelected) selectedCount++;

            // 检查文件是否存在
            const fileExists = await this.checkFileExists(`./words/${day.filename}`);

            const item = document.createElement('div');
            item.className = `subcategory-item ${isSelected ? 'selected' : ''} ${!fileExists ? 'file-missing' : ''}`;
            item.dataset.id = day.id;

            item.innerHTML = `
                <div class="subcategory-header">
                    <span class="subcategory-title">${day.name}</span>
                    <span class="subcategory-phoneme">${day.phoneme}</span>
                    ${!fileExists ? '<span class="file-status missing">❌ 未实现</span>' : ''}
                </div>
                <div class="subcategory-description">${day.description}</div>
                <div class="subcategory-meta">
                    <span class="word-count">${day.wordCount} 个单词</span>
                    <span class="difficulty-badge difficulty-${day.difficulty}">
                        ${this.getDifficultyName(day.difficulty)}
                    </span>
                </div>
                <div class="subcategory-actions">
                    <button class="action-btn learn-btn" ${!fileExists ? 'disabled' : ''} onclick="openLesson(event, '${day.id}')">📖 学习</button>
                    <button class="action-btn select-btn" ${!fileExists ? 'disabled' : ''} onclick="event.stopPropagation(); window.settingsManager.toggleSelection('${day.id}', 'daily-phonics')">
                        ${isSelected ? '✓ 已选' : '选择'}
                    </button>
                </div>
            `;

            grid.appendChild(item);
        }

        document.getElementById('daily-phonics-count').textContent =
            `${selectedCount}/${category.subcategories.length}`;
    }

    async checkFileExists(filepath) {
        try {
            const response = await fetch(filepath, { method: 'HEAD' });
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    async renderSpecialPractice(category) {
        const grid = document.getElementById('special-practice-grid');
        grid.innerHTML = '';

        let selectedCount = 0;

        for (const special of category.subcategories) {
            const isSelected = this.selectedLibraries.has(special.id);
            if (isSelected) selectedCount++;

            // 检查文件是否存在
            const fileExists = await this.checkFileExists(`./words/${special.filename}`);

            const item = document.createElement('div');
            item.className = `subcategory-item ${isSelected ? 'selected' : ''} ${!fileExists ? 'file-missing' : ''}`;
            item.dataset.id = special.id;

            item.innerHTML = `
                <div class="subcategory-header">
                    <span class="subcategory-title">${special.name}</span>
                    <span class="subcategory-phoneme">${special.phoneme}</span>
                    ${!fileExists ? '<span class="file-status missing">❌ 未实现</span>' : ''}
                </div>
                <div class="subcategory-description">${special.description}</div>
                <div class="subcategory-meta">
                    <span class="word-count">${special.wordCount} 个单词</span>
                    <span class="difficulty-badge difficulty-${special.difficulty}">
                        ${this.getDifficultyName(special.difficulty)}
                    </span>
                </div>
                <div class="subcategory-actions">
                    <button class="action-btn learn-btn" ${!fileExists ? 'disabled' : ''} onclick="openLesson(event, '${special.id}')">📖 学习</button>
                    <button class="action-btn select-btn" ${!fileExists ? 'disabled' : ''} onclick="event.stopPropagation(); window.settingsManager.toggleSelection('${special.id}', 'special-practice')">
                        ${isSelected ? '✓ 已选' : '选择'}
                    </button>
                </div>
            `;

            grid.appendChild(item);
        }

        document.getElementById('special-practice-count').textContent =
            `${selectedCount}/${category.subcategories.length}`;
    }

    async renderGradeBased(category) {
        for (const gradeLevel of category.subcategories) {
            const grid = document.getElementById(`${gradeLevel.id}-grid`);
            if (!grid) {
                console.warn(`⚠️ 找不到元素: ${gradeLevel.id}-grid，跳过渲染`);
                continue;
            }
            grid.innerHTML = '';

            let selectedCount = 0;

            for (const term of gradeLevel.items) {
                const isSelected = this.selectedLibraries.has(term.id);
                if (isSelected) selectedCount++;

                // 检查文件是否存在
                const fileExists = await this.checkFileExists(`./words/${term.filename}`);

                const item = document.createElement('div');
                item.className = `subcategory-item ${isSelected ? 'selected' : ''} ${!fileExists ? 'file-missing' : ''}`;
                item.dataset.id = term.id;

                item.innerHTML = `
                    <div class="subcategory-header">
                        <span class="subcategory-title">${term.name}</span>
                        ${!fileExists ? '<span class="file-status missing">❌ 未实现</span>' : ''}
                    </div>
                    <div class="subcategory-description">${term.description}</div>
                    <div class="subcategory-meta">
                        <span class="word-count">${term.wordCount} 个单词</span>
                        <span class="difficulty-badge difficulty-${term.difficulty}">
                            ${this.getDifficultyName(term.difficulty)}
                        </span>
                    </div>
                    <div class="subcategory-actions">
                        <button class="action-btn learn-btn" ${!fileExists ? 'disabled' : ''} onclick="openLesson(event, '${term.id}')">📖 学习</button>
                        <button class="action-btn select-btn" ${!fileExists ? 'disabled' : ''} onclick="event.stopPropagation(); window.settingsManager.toggleSelection('${term.id}', 'grade-based')">
                            ${isSelected ? '✓ 已选' : '选择'}
                        </button>
                    </div>
                `;

                grid.appendChild(item);
            }

            document.getElementById(`${gradeLevel.id}-count`).textContent =
                `${selectedCount}/${gradeLevel.items.length}`;
        }

        // 更新年级分类总计数
        this.updateGradeBasedCount();
    }

    async renderExtracurricularBooks(category) {
        console.log('🎨 开始渲染课外书分类:', category);
        if (typeof debugLog !== 'undefined') {
            debugLog.info(`🎨 开始渲染课外书: ${category.subcategories.length} 个系列`);
        }
        
        const container = document.getElementById('extracurricular-books-content');
        if (!container) {
            console.warn('⚠️ 找不到 extracurricular-books-content 容器');
            if (typeof debugLog !== 'undefined') {
                debugLog.error('⚠️ 找不到 extracurricular-books-content 容器');
            }
            return;
        }

        // 清空容器
        container.innerHTML = '';
        console.log('📦 课外书容器已清空，开始生成内容');

        // 为每个书籍系列生成 HTML 结构
        for (const bookSeries of category.subcategories) {
            // 创建书籍系列分组
            const groupDiv = document.createElement('div');
            groupDiv.className = 'grade-group extracurricular-books-group';
            
            let selectedCount = 0;
            for (const chapter of bookSeries.items) {
                if (this.selectedLibraries.has(chapter.id)) selectedCount++;
            }

            groupDiv.innerHTML = `
                <div class="grade-group-header" onclick="toggleGradeGroup('${bookSeries.id}')">
                    <span class="grade-icon">📚</span>
                    <span class="grade-name">${bookSeries.name}</span>
                    <span class="grade-count" id="${bookSeries.id}-count">${selectedCount}/${bookSeries.items.length}</span>
                    <button class="select-all-btn" onclick="selectAllInGrade(event, '${bookSeries.id}')">全选</button>
                    <span class="expand-icon">▶</span>
                </div>
                <div class="grade-group-content collapsed" id="${bookSeries.id}-grid">
                    <!-- 章节将动态生成 -->
                </div>
            `;

            container.appendChild(groupDiv);

            // 渲染章节
            const grid = document.getElementById(`${bookSeries.id}-grid`);
            for (const chapter of bookSeries.items) {
                const isSelected = this.selectedLibraries.has(chapter.id);
                const fileExists = await this.checkFileExists(`./words/${chapter.filename}`);

                const item = document.createElement('div');
                item.className = `subcategory-item extracurricular-item ${isSelected ? 'selected' : ''} ${!fileExists ? 'file-missing' : ''}`;
                item.dataset.id = chapter.id;

                item.innerHTML = `
                    <div class="subcategory-header">
                        <span class="subcategory-title extracurricular-title">${chapter.name}</span>
                        ${!fileExists ? '<span class="file-status missing">❌ 未实现</span>' : ''}
                    </div>
                    <div class="subcategory-description extracurricular-description">${chapter.description}</div>
                    <div class="subcategory-meta">
                        <span class="word-count">${chapter.wordCount} 个单词</span>
                        <span class="difficulty-badge difficulty-${chapter.difficulty}">
                            ${this.getDifficultyName(chapter.difficulty)}
                        </span>
                    </div>
                    <div class="subcategory-actions">
                        <button class="action-btn learn-btn" ${!fileExists ? 'disabled' : ''} onclick="openLesson(event, '${chapter.id}')">📖 学习</button>
                        <button class="action-btn select-btn" ${!fileExists ? 'disabled' : ''} onclick="event.stopPropagation(); window.settingsManager.toggleSelection('${chapter.id}', 'extracurricular-books')">
                            ${isSelected ? '✓ 已选' : '选择'}
                        </button>
                    </div>
                `;

                grid.appendChild(item);
            }
        }

        // 更新总计数
        this.updateGradeBasedCount();
        
        console.log('✅ 课外书渲染完成');
        if (typeof debugLog !== 'undefined') {
            debugLog.success('✅ 课外书渲染完成');
        }
    }

    updateGradeBasedCount() {
        const gradeCategory = this.config.categories.find(c => c.id === 'grade-based');
        if (gradeCategory) {
            let totalSelected = 0;
            let totalItems = 0;

            gradeCategory.subcategories.forEach(gradeLevel => {
                gradeLevel.items.forEach(term => {
                    totalItems++;
                    if (this.selectedLibraries.has(term.id)) {
                        totalSelected++;
                    }
                });
            });

            document.getElementById('grade-based-count').textContent =
                `${totalSelected}/${totalItems}`;
        }
        
        // 也更新课外书分类的计数
        const booksCategory = this.config.categories.find(c => c.id === 'extracurricular-books');
        if (booksCategory) {
            let totalSelected = 0;
            let totalItems = 0;

            booksCategory.subcategories.forEach(bookSeries => {
                bookSeries.items.forEach(chapter => {
                    totalItems++;
                    if (this.selectedLibraries.has(chapter.id)) {
                        totalSelected++;
                    }
                });
            });

            const countElement = document.getElementById('extracurricular-books-count');
            if (countElement) {
                countElement.textContent = `${totalSelected}/${totalItems}`;
            }
        }
    }

    toggleSelection(id, categoryId) {
        if (this.selectedLibraries.has(id)) {
            this.selectedLibraries.delete(id);
        } else {
            this.selectedLibraries.add(id);
        }

        // 更新界面
        const element = document.querySelector(`[data-id="${id}"]`);
        if (element) {
            const isSelected = this.selectedLibraries.has(id);

            // 更新 selected 类
            if (isSelected) {
                element.classList.add('selected');
            } else {
                element.classList.remove('selected');
            }

            // 更新按钮文本
            const selectBtn = element.querySelector('.select-btn');
            if (selectBtn) {
                selectBtn.textContent = isSelected ? '✓ 已选' : '选择';
            }
        }

        // 更新统计
        this.updateCategoryCount(categoryId);
        this.renderOverview();
    }

    updateCategoryCount(categoryId) {
        const category = this.config.categories.find(c => c.id === categoryId);
        if (!category) return;

        if (categoryId === 'grade-based' || categoryId === 'extracurricular-books') {
            this.updateGradeBasedCount();
            // 更新每个年级组的计数
            category.subcategories.forEach(gradeLevel => {
                let count = 0;
                gradeLevel.items.forEach(term => {
                    if (this.selectedLibraries.has(term.id)) count++;
                });
                document.getElementById(`${gradeLevel.id}-count`).textContent =
                    `${count}/${gradeLevel.items.length}`;
            });
        } else {
            let count = 0;
            category.subcategories.forEach(sub => {
                if (this.selectedLibraries.has(sub.id)) count++;
            });
            document.getElementById(`${categoryId}-count`).textContent =
                `${count}/${category.subcategories.length}`;
        }
    }

    getDifficultyName(difficulty) {
        const map = {
            'beginner': '初级',
            'intermediate': '中级',
            'advanced': '高级'
        };
        return map[difficulty] || difficulty;
    }

    saveSettings() {
        // 检查是否至少选择了一个课程或错词本
        if (this.selectedLibraries.size === 0 && this.selectedMissedWords.size === 0) {
            this.showStatus('请至少选择一个课程或错词本！', 'error');
            return;
        }

        this.saveUserSettings();
        this.showStatus('设置保存成功！', 'success');
    }

    resetToDefault() {
        this.selectedLibraries = new Set(this.config.defaultConfig.enabledLibraries);
        this.selectedMissedWords = new Set();
        this.gameMode = 'casual';
        this.renderInterface();
        this.showStatus('已恢复默认设置！', 'success');
    }

    applyAndStart() {
        // 检查是否至少选择了一个课程或错词本
        if (this.selectedLibraries.size === 0 && this.selectedMissedWords.size === 0) {
            this.showStatus('请至少选择一个课程或错词本！', 'error');
            return;
        }

        this.saveUserSettings();
        window.location.href = './index.html';
    }

    showStatus(message, type) {
        const statusElement = document.getElementById('status-message');
        statusElement.textContent = message;
        statusElement.className = `status-message ${type} show`;

        setTimeout(() => {
            statusElement.classList.remove('show');
        }, 3000);
    }

    // ========== 存储空间检测功能 ==========

    /**
     * 格式化字节数显示
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    /**
     * 获取存储使用详情
     */
    getStorageUsage() {
        let total = 0;
        let missedWordsSize = 0;

        // 计算所有 localStorage 数据大小（使用 Object.keys 更安全）
        try {
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                try {
                    const value = localStorage.getItem(key);
                    if (value !== null) {
                        const size = (value.length + key.length) * 2; // UTF-16 编码，每个字符2字节
                        total += size;
                        if (key === 'wordTetris_missedWords') {
                            missedWordsSize = size;
                        }
                    }
                } catch (e) {
                    // 跳过无法访问的项
                    console.warn(`跳过无法访问的 localStorage key: ${key}`);
                }
            });
        } catch (error) {
            console.error('❌ 计算存储使用量失败:', error);
            // 返回默认值
            return {
                total: 0,
                missedWordsSize: 0,
                remaining: 5 * 1024 * 1024,
                percentage: 0,
                estimatedTotal: 5 * 1024 * 1024
            };
        }

        // 估算总容量（通常浏览器限制为5-10MB，这里使用5MB作为基准）
        const estimatedTotal = 5 * 1024 * 1024; // 5MB
        const remaining = Math.max(0, estimatedTotal - total);
        const percentage = (total / estimatedTotal) * 100;

        return {
            total: total,
            missedWordsSize: missedWordsSize,
            remaining: remaining,
            percentage: percentage,
            estimatedTotal: estimatedTotal
        };
    }

    /**
     * 检测存储空间是否充足
     */
    checkStorageSpace() {
        const usage = this.getStorageUsage();
        const isLowSpace = usage.percentage >= 80;
        const isCriticalSpace = usage.percentage >= 90;

        return {
            ...usage,
            isLowSpace: isLowSpace,
            isCriticalSpace: isCriticalSpace
        };
    }

    /**
     * 测试可用存储空间
     */
    testStorageCapacity() {
        try {
            const testKey = '__storage_test__';
            const testData = 'x'.repeat(1024); // 1KB测试数据

            // 尝试写入
            localStorage.setItem(testKey, testData);
            localStorage.removeItem(testKey);

            return { success: true, message: '存储空间充足' };
        } catch (e) {
            if (e.name === 'QuotaExceededError') {
                return { success: false, message: '存储空间已满' };
            }
            return { success: false, message: '存储检测失败: ' + e.message };
        }
    }

    /**
     * 更新存储空间显示
     */
    updateStorageInfo() {
        const storageElement = document.getElementById('missed-words-storage-info');
        if (!storageElement) {
            console.warn('⚠️ 存储信息元素不存在，稍后重试');
            // 如果元素不存在，延迟重试
            setTimeout(() => {
                const retryElement = document.getElementById('missed-words-storage-info');
                if (retryElement) {
                    this.updateStorageInfo();
                }
            }, 200);
            return;
        }

        try {
            const storageInfo = this.checkStorageSpace();
            const used = this.formatBytes(storageInfo.missedWordsSize);
            const total = this.formatBytes(storageInfo.estimatedTotal);
            const remaining = this.formatBytes(storageInfo.remaining);
            const percentage = Math.round(storageInfo.percentage);

            // 移除之前的警告类
            storageElement.classList.remove('low-space', 'critical-space');

            let displayText = '';
            if (storageInfo.isCriticalSpace) {
                displayText = `🚨 已用: ${used} / 总计: ${total} / 剩余: ${remaining}`;
                storageElement.classList.add('critical-space');
            } else if (storageInfo.isLowSpace) {
                displayText = `⚠️ 已用: ${used} / 总计: ${total} / 剩余: ${remaining}`;
                storageElement.classList.add('low-space');
            } else {
                displayText = `💾 已用: ${used} / 总计: ${total} / 剩余: ${remaining}`;
            }

            storageElement.textContent = displayText;
            storageElement.title = `存储使用率: ${percentage}%`;
        } catch (error) {
            console.error('❌ 更新存储信息失败:', error);
            const storageElement = document.getElementById('missed-words-storage-info');
            if (storageElement) {
                storageElement.textContent = '💾 存储: 检测失败';
            }
        }
    }

    // ========== 错词管理功能 ==========

    /**
     * 获取用户IP地址
     */
    async getUserIP() {
        try {
            // 先检查是否有保存的IP标识（避免每次都生成新的）
            const savedIP = localStorage.getItem('wordTetris_userIP');
            if (savedIP && savedIP !== 'null' && !savedIP.startsWith('unknown-')) {
                this.userIP = savedIP;
                console.log('🌐 使用保存的IP标识:', this.userIP);
                // 仍然尝试更新IP，但不阻塞渲染
                this.updateIPInBackground();
                return;
            }

            // 尝试从多个免费API获取IP
            const apis = [
                'https://api.ipify.org?format=json',
                'https://api.ip.sb/ip',
                'https://ipapi.co/json/'
            ];

            for (const api of apis) {
                try {
                    // 使用 AbortController 实现超时
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 3000);

                    const response = await fetch(api, { signal: controller.signal });
                    clearTimeout(timeoutId);

                    if (response.ok) {
                        const data = await response.json();
                        this.userIP = data.ip || data;
                        // 保存IP标识
                        localStorage.setItem('wordTetris_userIP', this.userIP);
                        console.log('🌐 用户IP:', this.userIP);
                        return;
                    }
                } catch (err) {
                    if (err.name === 'AbortError') {
                        console.log(`⏱️ ${api} 请求超时`);
                    }
                    continue;
                }
            }

            // 所有API都失败，使用降级方案
            throw new Error('IP获取失败');

        } catch (error) {
            // 降级方案：根据环境生成标识（使用稳定的标识）
            if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
                this.userIP = 'localhost';
            } else {
                // 使用基于hostname的稳定标识，而不是时间戳
                const hostname = location.hostname || 'unknown';
                this.userIP = `browser-${hostname}`;
            }

            // 保存降级标识
            localStorage.setItem('wordTetris_userIP', this.userIP);
            console.warn('⚠️ IP获取失败，使用降级标识:', this.userIP);
        }
    }

    /**
     * 在后台更新IP（不阻塞渲染）
     */
    async updateIPInBackground() {
        try {
            const apis = [
                'https://api.ipify.org?format=json',
                'https://api.ip.sb/ip',
                'https://ipapi.co/json/'
            ];

            for (const api of apis) {
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 3000);

                    const response = await fetch(api, { signal: controller.signal });
                    clearTimeout(timeoutId);

                    if (response.ok) {
                        const data = await response.json();
                        const newIP = data.ip || data;
                        if (newIP && newIP !== this.userIP) {
                            console.log('🔄 检测到IP变化，从', this.userIP, '变为', newIP);
                            // 注意：这里不自动迁移，用户需要手动使用诊断工具修复
                        }
                        // 更新保存的IP
                        localStorage.setItem('wordTetris_userIP', newIP);
                        break;
                    }
                } catch (err) {
                    continue;
                }
            }
        } catch (error) {
            // 静默失败，不影响主流程
        }
    }

    /**
     * 生成错词主键（不使用IP，直接使用单词）
     */
    generateMissedWordKey(word) {
        return word.toLowerCase();
    }

    /**
     * 加载所有本地错词数据（不限制IP）
     */
    loadMissedWords() {
        try {
            const allMissedWords = JSON.parse(
                localStorage.getItem('wordTetris_missedWords') || '{}'
            );

            // 数据迁移：为旧数据添加时间戳，并兼容旧格式的key
            let needsSave = false;
            const now = Date.now();
            const migratedData = {};

            Object.entries(allMissedWords).forEach(([key, data]) => {
                // 兼容旧格式：IP::word 或新格式：word
                let wordKey = key;
                if (key.includes('::')) {
                    // 旧格式：提取单词部分
                    wordKey = key.split('::')[1];
                    needsSave = true;
                }

                // 确保使用小写作为key
                wordKey = wordKey.toLowerCase();

                if (!data.createTime || !data.lastUpdate) {
                    needsSave = true;
                    if (!data.lastUpdate) {
                        data.lastUpdate = now;
                    }
                    if (!data.createTime) {
                        data.createTime = data.lastUpdate;
                    }
                }

                // 如果已存在相同单词的数据，合并计数
                if (migratedData[wordKey]) {
                    migratedData[wordKey].count += (data.count || 1);
                    migratedData[wordKey].lastUpdate = Math.max(
                        migratedData[wordKey].lastUpdate || 0,
                        data.lastUpdate || now
                    );
                    // 保留最早的创建时间
                    if (data.createTime && (!migratedData[wordKey].createTime || data.createTime < migratedData[wordKey].createTime)) {
                        migratedData[wordKey].createTime = data.createTime;
                    }
                } else {
                    migratedData[wordKey] = {
                        ...data,
                        word: data.word ? data.word.toLowerCase() : wordKey
                    };
                }
            });

            // 如果有数据需要迁移，保存回 localStorage
            if (needsSave) {
                localStorage.setItem('wordTetris_missedWords', JSON.stringify(migratedData));
                console.log('✨ 已迁移错词数据到新格式（移除IP限制）');
            }

            // 显示所有本地错词（不再按IP筛选）
            const finalData = needsSave ? migratedData : allMissedWords;
            this.missedWords = Object.entries(finalData)
                .map(([key, data]) => ({
                    word: data.word || key,
                    phonetic: data.phonetic || '',
                    meaning: data.meaning || '',
                    count: data.count || 1,
                    createTime: data.createTime || data.lastUpdate || Date.now(),
                    lastUpdate: data.lastUpdate || Date.now()
                }))
                .sort((a, b) => {
                    // 按生成时间倒序排序（最新的在前）
                    return b.createTime - a.createTime;
                }); // 按生成时间倒序排序

            console.log(`📝 加载了 ${this.missedWords.length} 个错词（所有本地错词）`);
        } catch (error) {
            console.error('❌ 错词加载失败:', error);
            this.missedWords = [];
        }
    }

    /**
     * 保存单个错词（不使用IP）
     */
    saveMissedWord(word, phonetic, meaning) {
        try {
            // 检测存储空间
            const storageInfo = this.checkStorageSpace();
            const newDataSize = JSON.stringify({ word, phonetic, meaning }).length * 2; // UTF-16编码

            // 如果空间不足，显示警告
            if (storageInfo.isCriticalSpace) {
                this.showStatus('🚨 存储空间不足！请先导出或清理错词数据', 'error');
                return false;
            }

            if (storageInfo.remaining < newDataSize * 2) {
                this.showStatus('⚠️ 存储空间可能不足，建议先清理旧数据', 'error');
                // 仍然尝试保存，但不阻止
            }

            const allMissedWords = JSON.parse(
                localStorage.getItem('wordTetris_missedWords') || '{}'
            );

            const key = this.generateMissedWordKey(word);
            const now = Date.now();

            if (allMissedWords[key]) {
                // 已存在，更新计数和时间
                allMissedWords[key].count++;
                allMissedWords[key].lastUpdate = now;
                if (!allMissedWords[key].createTime) {
                    allMissedWords[key].createTime = allMissedWords[key].lastUpdate || now;
                }
            } else {
                // 新增（不再保存IP字段）
                allMissedWords[key] = {
                    word: word.toLowerCase(),
                    phonetic: phonetic || '',
                    meaning: meaning || '',
                    count: 1,
                    createTime: now,
                    lastUpdate: now
                };
            }

            localStorage.setItem('wordTetris_missedWords', JSON.stringify(allMissedWords));
            this.loadMissedWords(); // 重新加载
            this.updateStorageInfo(); // 更新存储空间显示
            console.log(`💾 保存错词: ${word}`);
            return true;
        } catch (error) {
            if (error.name === 'QuotaExceededError') {
                this.showStatus('❌ 存储空间已满！请先导出或清理错词数据', 'error');
                console.error('❌ 存储空间不足，无法保存错词');
            } else {
                console.error('❌ 错词保存失败:', error);
                this.showStatus('保存失败: ' + error.message, 'error');
            }
            return false;
        }
    }

    /**
     * 删除指定错词（不使用IP）
     */
    deleteMissedWord(word) {
        try {
            const allMissedWords = JSON.parse(
                localStorage.getItem('wordTetris_missedWords') || '{}'
            );

            // 兼容旧格式：查找 IP::word 和 word 两种格式
            const key = word.toLowerCase();
            let deleted = false;

            // 先尝试新格式
            if (allMissedWords[key]) {
                delete allMissedWords[key];
                deleted = true;
            } else {
                // 尝试旧格式：查找所有 IP::word 格式的
                Object.keys(allMissedWords).forEach(oldKey => {
                    if (oldKey.endsWith(`::${key}`)) {
                        delete allMissedWords[oldKey];
                        deleted = true;
                    }
                });
            }

            if (deleted) {
                localStorage.setItem('wordTetris_missedWords', JSON.stringify(allMissedWords));
                this.loadMissedWords(); // 重新加载
                this.updateStorageInfo(); // 更新存储空间显示
                console.log(`🗑️ 删除错词: ${word}`);
                return true;
            }
            return false;
        } catch (error) {
            console.error('❌ 错词删除失败:', error);
            return false;
        }
    }

    /**
     * 清空所有错词（不限制IP）
     */
    clearAllMissedWords() {
        if (!confirm(`确定要清空所有错词吗？此操作不可恢复！`)) {
            return false;
        }

        try {
            localStorage.removeItem('wordTetris_missedWords');
            this.missedWords = [];
            this.loadMissedWords(); // 重新加载（会得到空数组）
            this.updateStorageInfo(); // 更新存储空间显示
            console.log('🗑️ 已清空所有错词');
            return true;
        } catch (error) {
            console.error('❌ 清空错词失败:', error);
            return false;
        }
    }

    /**
     * 解析导入文件内容
     */
    parseImportFile(content, format) {
        const words = [];

        try {
            if (format === 'json') {
                // JSON格式
                const data = JSON.parse(content);

                // 支持两种格式：
                // 1. 直接数组: [{word, phonetic, meaning}, ...]
                // 2. 包装格式: {words: [{word, phonetic, meaning}, ...]}
                let wordArray = Array.isArray(data) ? data : (data.words || []);

                wordArray.forEach(item => {
                    if (item.word) {
                        // 清理音标：去除方括号 []
                        let phonetic = item.phonetic || '';
                        phonetic = phonetic.replace(/[\[\]]/g, '').trim();

                        words.push({
                            word: item.word.trim(),
                            phonetic: phonetic,
                            meaning: item.meaning || ''
                        });
                    }
                });
            } else if (format === 'csv') {
                // CSV格式（首行可能是标题）
                const lines = content.split('\n').filter(line => line.trim());
                const firstLine = lines[0].toLowerCase();
                const startIndex = firstLine.includes('word') || firstLine.includes('单词') ? 1 : 0;

                for (let i = startIndex; i < lines.length; i++) {
                    const parts = lines[i].split(',').map(p => p.trim());
                    if (parts.length >= 1 && parts[0]) {
                        words.push({
                            word: parts[0],
                            phonetic: parts[1] || '',
                            meaning: parts[2] || ''
                        });
                    }
                }
            } else {
                // TXT格式（默认）- 格式：单词, 音标, 中文翻译
                const lines = content.split('\n').filter(line => line.trim());
                lines.forEach(line => {
                    const parts = line.split(',').map(p => p.trim());
                    if (parts.length >= 1 && parts[0]) {
                        // 清理音标：去除方括号 [] 和斜杠 //
                        let phonetic = parts[1] || '';
                        phonetic = phonetic.replace(/[\[\]\/]/g, '').trim();

                        words.push({
                            word: parts[0],
                            phonetic: phonetic,
                            meaning: parts[2] || ''
                        });
                    }
                });
            }
        } catch (error) {
            console.error('❌ 文件解析失败:', error);
            throw new Error('文件格式错误，请检查文件内容');
        }

        return words;
    }

    /**
     * 导入错词（将整个文件作为一个错词卡，但保存单词数据）
     */
    async importMissedWords(file) {
        try {
            const content = await file.text();
            const format = file.name.endsWith('.json') ? 'json'
                : file.name.endsWith('.csv') ? 'csv'
                    : 'txt';

            const words = this.parseImportFile(content, format);

            if (words.length === 0) {
                throw new Error('文件中没有有效的单词数据');
            }

            // 检测存储空间
            const storageInfo = this.checkStorageSpace();
            const fileSize = content.length * 2; // UTF-16编码，估算大小
            const estimatedDataSize = JSON.stringify(words).length * 2;

            // 如果空间不足，阻止导入
            if (storageInfo.isCriticalSpace) {
                this.showStatus('🚨 存储空间不足！请先导出或清理错词数据', 'error');
                return false;
            }

            if (storageInfo.remaining < estimatedDataSize * 2) {
                if (!confirm(`⚠️ 存储空间可能不足（剩余 ${this.formatBytes(storageInfo.remaining)}），是否继续导入？\n建议先导出或清理旧数据。`)) {
                    return false;
                }
            }

            // 获取文件名（不含扩展名）作为错词卡名称
            const fileName = file.name.replace(/\.(txt|csv|json)$/i, '');

            // 将整个文件保存为一个错词卡
            // 使用文件名作为"单词"
            // 将单词数据保存为 JSON 字符串在 meaning 字段
            const summary = `包含 ${words.length} 个单词`;
            const wordsData = JSON.stringify(words);

            const success = this.saveMissedWord(fileName, summary, wordsData);
            if (!success) {
                return false;
            }

            // 重新加载错词列表
            this.loadMissedWords();
            // 更新存储空间显示（saveMissedWord 已调用，这里确保更新）
            this.updateStorageInfo();

            this.showStatus(`成功导入文件"${fileName}"，包含 ${words.length} 个单词！`, 'success');

            // 自动展开错词分类
            this.expandedCategories.add('missed-words');

            this.renderInterface(); // 刷新界面
            return true;
        } catch (error) {
            console.error('❌ 导入失败:', error);
            this.showStatus(`导入失败: ${error.message}`, 'error');
            return false;
        }
    }

    /**
     * 导出错词
     */
    exportMissedWords() {
        if (this.missedWords.length === 0) {
            this.showStatus('暂无错词，无法导出！', 'error');
            return;
        }

        try {
            // 创建文本内容
            let content = '';
            this.missedWords.forEach(word => {
                content += `${word.word}, ${word.phonetic}, ${word.meaning}\n`;
            });

            // 创建下载
            const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `错词_${new Date().toISOString().split('T')[0]}.txt`;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            this.showStatus(`成功导出 ${this.missedWords.length} 个错词！`, 'success');
        } catch (error) {
            console.error('❌ 导出失败:', error);
            this.showStatus('导出失败', 'error');
        }
    }

    /**
     * 渲染错词分类
     */
    renderMissedWords() {
        const container = document.getElementById('missed-words-grid');
        if (!container) return;

        const count = this.missedWords.length;

        // 更新标题中的数量
        const titleElement = document.querySelector('#missed-words-section .category-name');
        if (titleElement) {
            titleElement.textContent = `错词复习 (${count})`;
        }

        // 应用展开状态
        const content = document.getElementById('missed-words-content');
        const icon = document.querySelector('#missed-words-section .expand-icon');
        if (content && icon) {
            if (this.expandedCategories.has('missed-words')) {
                content.classList.remove('collapsed');
                icon.classList.add('expanded');
                content.style.maxHeight = 'none';  // 确保展开时没有高度限制
            } else {
                content.classList.add('collapsed');
                icon.classList.remove('expanded');
            }
        }

        // 清空容器
        container.innerHTML = '';

        // 如果没有错词，显示空态
        if (count === 0) {
            container.innerHTML = `
                <div class="empty-placeholder">
                    <div class="empty-icon">📝</div>
                    <div class="empty-text">暂无错词，继续加油！</div>
                    <div class="empty-hint">游戏中的错误单词会自动保存到这里</div>
                </div>
            `;
            // 更新存储空间显示（即使没有错词也要显示）
            this.updateStorageInfo();
            return;
        }

        // 渲染错词卡片
        this.missedWords.forEach(word => {
            const isSelected = this.selectedMissedWords.has(word.word);
            const card = document.createElement('div');
            card.className = `subcategory-item missed-word-card ${isSelected ? 'selected' : ''}`;
            card.setAttribute('data-word', word.word);

            // 格式化日期
            const createDate = new Date(word.createTime);
            const createDateStr = `${createDate.getMonth() + 1}/${createDate.getDate()}`;
            const updateDate = new Date(word.lastUpdate);
            const updateDateStr = `${updateDate.getMonth() + 1}/${updateDate.getDate()}`;

            // 计算艾宾浩斯复习状态
            const ebbStatus = calculateEbbinghausStatus(word.createTime, word.lastUpdate);
            const ebbDisplay = getEbbinghausDisplay(ebbStatus);

            card.innerHTML = `
                <div class="subcategory-header">
                    <span class="subcategory-title">${word.word}</span>
                    <span class="subcategory-phoneme">${word.phonetic}</span>
                </div>
                <div class="subcategory-description">包含单词（点击学习按钮查看详情）</div>
                <div class="subcategory-meta">
                    <span class="word-count">错误 ${word.count} 次</span>
                    <span class="ebbinghaus-status ${ebbDisplay.cssClass}" title="${ebbDisplay.title}">
                        <span class="bulb-icon">${ebbDisplay.icon}</span>
                        <span class="bulb-text">${ebbDisplay.text}</span>
                    </span>
                    <span class="create-time" title="创建时间">📅 ${createDateStr}</span>
                    <span class="last-update" title="最后更新">${updateDateStr}</span>
                </div>
                <div class="subcategory-actions">
                    <button class="action-btn learn-btn" onclick="openMissedWordLesson(event, '${word.word}')">学习</button>
                    <button class="action-btn select-btn" onclick="toggleMissedWord(event, '${word.word}')">
                        ${isSelected ? '✓ 已选' : '选择'}
                    </button>
                    <button class="action-btn delete-btn" onclick="deleteMissedWord(event, '${word.word}')">删除</button>
                </div>
            `;

            container.appendChild(card);
        });

        // 更新存储空间显示
        this.updateStorageInfo();
    }
}

// 全局函数
function toggleCategory(categoryId) {
    const content = document.getElementById(`${categoryId}-content`);
    const header = content.previousElementSibling;
    const icon = header.querySelector('.expand-icon');

    const expand = content.classList.contains('collapsed');

    // 动画：使用 max-height 过渡，结束后设置为 none 以自适应
    if (expand) {
        content.classList.remove('collapsed');
        icon.classList.add('expanded');
        // 先清零再在下一帧设置目标高度
        content.style.maxHeight = '0px';
        requestAnimationFrame(() => {
            const target = content.scrollHeight;
            content.style.maxHeight = `${target}px`;
        });
        content.addEventListener('transitionend', function onEnd(e) {
            if (e.propertyName === 'max-height') {
                content.style.maxHeight = 'none';
                content.removeEventListener('transitionend', onEnd);
            }
        });
    } else {
        // 从当前内容高度开始收起
        const start = content.scrollHeight;
        content.style.maxHeight = `${start}px`;
        requestAnimationFrame(() => {
            content.style.maxHeight = '0px';
        });
        content.classList.add('collapsed');
        icon.classList.remove('expanded');
    }

    // 记录展开状态
    if (window.settingsManager) {
        const set = window.settingsManager.expandedCategories;
        if (expand) {
            set.add(categoryId);
        } else {
            set.delete(categoryId);
        }
        window.settingsManager.saveUserSettings();
    }
}

function toggleGradeGroup(gradeId) {
    const content = document.getElementById(`${gradeId}-grid`);
    const header = content.previousElementSibling;
    const icon = header.querySelector('.expand-icon');

    const expand = content.classList.contains('collapsed');

    if (expand) {
        content.classList.remove('collapsed');
        icon.classList.add('expanded');
        content.style.maxHeight = '0px';
        requestAnimationFrame(() => {
            const target = content.scrollHeight;
            content.style.maxHeight = `${target}px`;
        });
        content.addEventListener('transitionend', function onEnd(e) {
            if (e.propertyName === 'max-height') {
                content.style.maxHeight = 'none';
                content.removeEventListener('transitionend', onEnd);
            }
        });
    } else {
        const start = content.scrollHeight;
        content.style.maxHeight = `${start}px`;
        requestAnimationFrame(() => {
            content.style.maxHeight = '0px';
        });
        content.classList.add('collapsed');
        icon.classList.remove('expanded');
    }

    // 记录年级展开状态
    if (window.settingsManager) {
        const set = window.settingsManager.expandedGradeGroups;
        if (expand) {
            set.add(gradeId);
        } else {
            set.delete(gradeId);
        }
        window.settingsManager.saveUserSettings();
    }
}

function selectAllInCategory(event, categoryId) {
    event.stopPropagation();

    if (!window.settingsManager) return;

    const category = window.settingsManager.config.categories.find(c => c.id === categoryId);
    if (!category) return;

    // 检查是否全部已选
    const allSelected = category.subcategories.every(sub =>
        window.settingsManager.selectedLibraries.has(sub.id)
    );

    // 如果全部已选，则取消全选；否则全选
    category.subcategories.forEach(sub => {
        if (allSelected) {
            window.settingsManager.selectedLibraries.delete(sub.id);
        } else {
            window.settingsManager.selectedLibraries.add(sub.id);
        }
    });

    window.settingsManager.renderInterface();
    window.settingsManager.showStatus(
        allSelected ? '已取消全选' : '已全选该分类',
        'info'
    );
}

function selectAllInGrade(event, gradeId) {
    event.stopPropagation();

    if (!window.settingsManager) return;

    const gradeCategory = window.settingsManager.config.categories.find(c => c.id === 'grade-based');
    const gradeLevel = gradeCategory.subcategories.find(g => g.id === gradeId);
    if (!gradeLevel) return;

    // 检查是否全部已选
    const allSelected = gradeLevel.items.every(item =>
        window.settingsManager.selectedLibraries.has(item.id)
    );

    // 如果全部已选，则取消全选；否则全选
    gradeLevel.items.forEach(item => {
        if (allSelected) {
            window.settingsManager.selectedLibraries.delete(item.id);
        } else {
            window.settingsManager.selectedLibraries.add(item.id);
        }
    });

    window.settingsManager.renderInterface();
    window.settingsManager.showStatus(
        allSelected ? '已取消全选' : '已全选该年级',
        'info'
    );
}

function goBack() {
    window.location.href = './index.html';
}

function saveSettings() {
    if (window.settingsManager) {
        window.settingsManager.saveSettings();
    }
}

function resetToDefault() {
    if (window.settingsManager) {
        window.settingsManager.resetToDefault();
    }
}

function applyAndStart() {
    if (window.settingsManager) {
        window.settingsManager.applyAndStart();
    }
}

// 打开学习页面
function openLesson(event, lessonId) {
    event.stopPropagation();
    
    // 检查是否是课外书课程（根据ID前缀判断）
    if (lessonId.startsWith('mth-') || lessonId.startsWith('hp-') || lessonId.startsWith('ort-')) {
        // 课外书使用专用的课外书学习模板
        window.location.href = `./study/extracurricular-lesson-template.html?lesson=${lessonId}`;
        return;
    }
    
    // 对按年级单元的课程使用新的单元模板
    if (/^grade\d+-term\d+-unit\d+$/i.test(lessonId)) {
        window.location.href = `./study/unit-lesson-template.html?lesson=${lessonId}`;
        return;
    }
    
    // 默认回退到自然拼读模板
    window.location.href = `./study/phonics-lesson-template.html?v=20251107-extbooks&lesson=${lessonId}`;
}

// ========== 错词管理全局函数 ==========

// 导入错词
function importMissedWords(event) {
    event.stopPropagation(); // 阻止事件冒泡，避免触发父元素的折叠/展开

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt,.csv,.json';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (file && window.settingsManager) {
            await window.settingsManager.importMissedWords(file);
        }
    };
    input.click();
}

// 清空错词
function clearMissedWords(event) {
    event.stopPropagation(); // 阻止事件冒泡，避免触发父元素的折叠/展开

    if (window.settingsManager) {
        // 保存当前展开状态
        const content = document.getElementById('missed-words-content');
        const wasExpanded = content && !content.classList.contains('collapsed');

        if (window.settingsManager.clearAllMissedWords()) {
            // 恢复展开状态
            if (wasExpanded) {
                window.settingsManager.expandedCategories.add('missed-words');
            } else {
                window.settingsManager.expandedCategories.delete('missed-words');
            }

            // 保存展开状态到 localStorage
            window.settingsManager.saveUserSettings();

            window.settingsManager.renderInterface();
            window.settingsManager.showStatus('已清空所有错词', 'success');
        }
    }
}

// 全选错词
function selectAllMissedWords(event) {
    event.stopPropagation(); // 阻止事件冒泡，避免触发父元素的折叠/展开

    if (window.settingsManager) {
        // 保存当前展开状态
        const content = document.getElementById('missed-words-content');
        const wasExpanded = content && !content.classList.contains('collapsed');

        const allMissedWordsIds = window.settingsManager.missedWords.map(w => w.word);

        // 检查是否已经全选
        const allSelected = allMissedWordsIds.every(id =>
            window.settingsManager.selectedMissedWords.has(id)
        );

        if (allSelected) {
            // 全部取消选择
            allMissedWordsIds.forEach(id => {
                window.settingsManager.selectedMissedWords.delete(id);
            });
            window.settingsManager.showStatus('已取消全选错词', 'info');
        } else {
            // 全部选择
            allMissedWordsIds.forEach(id => {
                window.settingsManager.selectedMissedWords.add(id);
            });
            window.settingsManager.showStatus('已全选所有错词', 'success');
        }

        // 恢复展开状态
        if (wasExpanded) {
            window.settingsManager.expandedCategories.add('missed-words');
        } else {
            window.settingsManager.expandedCategories.delete('missed-words');
        }

        // 保存展开状态到 localStorage
        window.settingsManager.saveUserSettings();

        window.settingsManager.renderInterface();
    }
}

// 删除单个错词
function deleteMissedWord(event, word) {
    event.stopPropagation();
    if (window.settingsManager) {
        if (confirm(`确定要删除错词"${word}"吗？`)) {
            // 删除前保存当前展开状态
            const content = document.getElementById('missed-words-content');
            const wasExpanded = content && !content.classList.contains('collapsed');

            window.settingsManager.deleteMissedWord(word);

            // 恢复展开状态
            if (wasExpanded) {
                window.settingsManager.expandedCategories.add('missed-words');
            } else {
                window.settingsManager.expandedCategories.delete('missed-words');
            }

            // 保存展开状态到 localStorage
            window.settingsManager.saveUserSettings();

            window.settingsManager.renderInterface();
            window.settingsManager.showStatus(`已删除错词: ${word}`, 'success');
        }
    }
}

// 选择/取消选择错词
function toggleMissedWord(event, word) {
    event.stopPropagation();

    if (!window.settingsManager) return;

    // 切换选中状态
    if (window.settingsManager.selectedMissedWords.has(word)) {
        window.settingsManager.selectedMissedWords.delete(word);
    } else {
        window.settingsManager.selectedMissedWords.add(word);
    }

    // 更新UI
    const card = event.currentTarget.closest('.missed-word-card');
    const btn = event.currentTarget;
    const isSelected = window.settingsManager.selectedMissedWords.has(word);

    if (isSelected) {
        card.classList.add('selected');
        btn.textContent = '✓ 已选';
    } else {
        card.classList.remove('selected');
        btn.textContent = '选择';
    }

    // 立即保存
    window.settingsManager.saveUserSettings();

    // 更新概览统计
    window.settingsManager.renderOverview();

    console.log(`${isSelected ? '✓' : '✗'} 错词选择: ${word}`);
}

// 展开/折叠错词分类
function toggleMissedWordsCategory() {
    const content = document.getElementById('missed-words-content');
    const header = content.previousElementSibling;
    const icon = header.querySelector('.expand-icon');

    const expand = content.classList.contains('collapsed');

    // 动画：使用 max-height 过渡，结束后设置为 none 以自适应
    if (expand) {
        content.classList.remove('collapsed');
        icon.classList.add('expanded');
        // 先清零再在下一帧设置目标高度
        content.style.maxHeight = '0px';
        requestAnimationFrame(() => {
            const target = content.scrollHeight;
            content.style.maxHeight = `${target}px`;
        });
        content.addEventListener('transitionend', function onEnd(e) {
            if (e.propertyName === 'max-height') {
                content.style.maxHeight = 'none';
                content.removeEventListener('transitionend', onEnd);
            }
        });
    } else {
        // 从当前内容高度开始收起
        const start = content.scrollHeight;
        content.style.maxHeight = `${start}px`;
        requestAnimationFrame(() => {
            content.style.maxHeight = '0px';
        });
        content.classList.add('collapsed');
        icon.classList.remove('expanded');
    }

    // 记录展开状态并保存到 localStorage
    if (window.settingsManager) {
        const set = window.settingsManager.expandedCategories;
        if (expand) {
            set.add('missed-words');
        } else {
            set.delete('missed-words');
        }
        window.settingsManager.saveUserSettings();
    }
}

// 打开错词学习页面
function openMissedWordLesson(event, fileName) {
    event.stopPropagation();

    // 跳转到专门的错词学习页面
    window.location.href = `./study/missed-words-lesson.html?file=${encodeURIComponent(fileName)}`;
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    window.settingsManager = new SettingsManagerV2();
});

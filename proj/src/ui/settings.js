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
    const createDate = new Date(createTime);
    const lastUpdateDate = new Date(lastUpdate);
    
    // 计算从创建到现在过了多少天
    const daysElapsed = Math.floor((now - createTime) / (1000 * 60 * 60 * 24));
    
    // 如果最后更新时间和创建时间相差很小（1小时内），说明是新建的，使用创建时间
    // 如果相差较大，说明重新出错了，从最后更新时间重新计算
    const baseTime = (lastUpdate - createTime) < (1000 * 60 * 60) ? createTime : lastUpdate;
    const baseDays = Math.floor((now - baseTime) / (1000 * 60 * 60 * 24));
    
    // 找到下一个应该复习的时间点
    let nextReviewDay = null;
    let needReview = false;
    let completed = false;
    
    for (let interval of EBBINGHAUS_INTERVALS) {
        if (baseDays >= interval) {
            needReview = true;
            continue;
        } else {
            nextReviewDay = interval;
            break;
        }
    }
    
    // 如果已经超过所有复习时间点，标记为已完成
    if (nextReviewDay === null && baseDays >= EBBINGHAUS_INTERVALS[EBBINGHAUS_INTERVALS.length - 1]) {
        completed = true;
        needReview = false;
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
            
            // 获取用户IP
            const ipStart = performance.now();
            await this.getUserIP();
            debugLog.info(`⏱️ [Settings] 获取用户IP耗时: ${(performance.now() - ipStart).toFixed(2)}ms`);
            
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
            }
        });

        // 应用展开状态
        this.applyExpandState();
    }

    applyExpandState() {
        // 顶层分类
        ['daily-phonics','special-practice','grade-based'].forEach(id => {
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
        ['primary-school','middle-school','high-school'].forEach(id => {
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
    
    updateGradeBasedCount() {
        const gradeCategory = this.config.categories.find(c => c.id === 'grade-based');
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
        
        if (categoryId === 'grade-based') {
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
    
    // ========== 错词管理功能 ==========
    
    /**
     * 获取用户IP地址
     */
    async getUserIP() {
        try {
            // 尝试从多个免费API获取IP
            const apis = [
                'https://api.ipify.org?format=json',
                'https://api.ip.sb/ip',
                'https://ipapi.co/json/'
            ];
            
            for (const api of apis) {
                try {
                    const response = await fetch(api, { timeout: 3000 });
                    if (response.ok) {
                        const data = await response.json();
                        this.userIP = data.ip || data;
                        console.log('🌐 用户IP:', this.userIP);
                        return;
                    }
                } catch (err) {
                    continue;
                }
            }
            
            // 所有API都失败，使用降级方案
            throw new Error('IP获取失败');
            
        } catch (error) {
            // 降级方案：根据环境生成标识
            if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
                this.userIP = 'localhost';
            } else {
                this.userIP = `unknown-${Date.now()}`;
            }
            console.warn('⚠️ IP获取失败，使用降级标识:', this.userIP);
        }
    }
    
    /**
     * 生成错词主键
     */
    generateMissedWordKey(word) {
        return `${this.userIP}::${word.toLowerCase()}`;
    }
    
    /**
     * 加载当前IP的错词数据
     */
    loadMissedWords() {
        try {
            const allMissedWords = JSON.parse(
                localStorage.getItem('wordTetris_missedWords') || '{}'
            );
            
            // 数据迁移：为旧数据添加时间戳
            let needsSave = false;
            const now = Date.now();
            Object.entries(allMissedWords).forEach(([key, data]) => {
                if (!data.createTime || !data.lastUpdate) {
                    needsSave = true;
                    // 如果没有时间戳，使用当前时间
                    if (!data.lastUpdate) {
                        data.lastUpdate = now;
                    }
                    if (!data.createTime) {
                        data.createTime = data.lastUpdate;
                    }
                }
            });
            
            // 如果有数据需要迁移，保存回 localStorage
            if (needsSave) {
                localStorage.setItem('wordTetris_missedWords', JSON.stringify(allMissedWords));
                console.log('✨ 已为旧错词数据添加时间戳');
            }
            
            // 筛选当前IP的错词
            this.missedWords = Object.entries(allMissedWords)
                .filter(([key]) => key.startsWith(`${this.userIP}::`))
                .map(([key, data]) => ({
                    word: data.word,
                    phonetic: data.phonetic || '',
                    meaning: data.meaning || '',
                    count: data.count || 1,
                    createTime: data.createTime || data.lastUpdate || Date.now(),  // 创建时间（兼容旧数据）
                    lastUpdate: data.lastUpdate || Date.now()
                }))
                .sort((a, b) => {
                    // 计算艾宾浩斯状态
                    const statusA = calculateEbbinghausStatus(a.createTime, a.lastUpdate);
                    const statusB = calculateEbbinghausStatus(b.createTime, b.lastUpdate);
                    
                    // 优先级：需要复习 > 未到时间 > 已完成
                    if (statusA.needReview && !statusB.needReview) return -1;
                    if (!statusA.needReview && statusB.needReview) return 1;
                    if (statusA.completed && !statusB.completed) return 1;
                    if (!statusA.completed && statusB.completed) return -1;
                    
                    // 同状态下按最后更新时间排序
                    return b.lastUpdate - a.lastUpdate;
                }); // 按艾宾浩斯状态和更新时间排序
            
            console.log(`📝 加载了 ${this.missedWords.length} 个错词`);
        } catch (error) {
            console.error('❌ 错词加载失败:', error);
            this.missedWords = [];
        }
    }
    
    /**
     * 保存单个错词
     */
    saveMissedWord(word, phonetic, meaning) {
        try {
            const allMissedWords = JSON.parse(
                localStorage.getItem('wordTetris_missedWords') || '{}'
            );
            
            const key = this.generateMissedWordKey(word);
            const now = Date.now();
            
            if (allMissedWords[key]) {
                // 已存在，更新计数和时间
                allMissedWords[key].count++;
                allMissedWords[key].lastUpdate = now;
                // 确保旧数据有 createTime（兼容性处理）
                if (!allMissedWords[key].createTime) {
                    allMissedWords[key].createTime = allMissedWords[key].lastUpdate || now;
                }
            } else {
                // 新增
                allMissedWords[key] = {
                    ip: this.userIP,
                    word: word.toLowerCase(),
                    phonetic: phonetic || '',
                    meaning: meaning || '',
                    count: 1,
                    createTime: now,      // 创建时间（永不改变）
                    lastUpdate: now       // 最后更新时间
                };
            }
            
            localStorage.setItem('wordTetris_missedWords', JSON.stringify(allMissedWords));
            this.loadMissedWords(); // 重新加载
            console.log(`💾 保存错词: ${word}`);
        } catch (error) {
            console.error('❌ 错词保存失败:', error);
        }
    }
    
    /**
     * 删除指定错词
     */
    deleteMissedWord(word) {
        try {
            const allMissedWords = JSON.parse(
                localStorage.getItem('wordTetris_missedWords') || '{}'
            );
            
            const key = this.generateMissedWordKey(word);
            delete allMissedWords[key];
            
            localStorage.setItem('wordTetris_missedWords', JSON.stringify(allMissedWords));
            this.loadMissedWords(); // 重新加载
            console.log(`🗑️ 删除错词: ${word}`);
            return true;
        } catch (error) {
            console.error('❌ 错词删除失败:', error);
            return false;
        }
    }
    
    /**
     * 清空当前IP的所有错词
     */
    clearAllMissedWords() {
        if (!confirm(`确定要清空所有错词吗？此操作不可恢复！`)) {
            return false;
        }
        
        try {
            const allMissedWords = JSON.parse(
                localStorage.getItem('wordTetris_missedWords') || '{}'
            );
            
            // 删除当前IP的所有错词
            Object.keys(allMissedWords).forEach(key => {
                if (key.startsWith(`${this.userIP}::`)) {
                    delete allMissedWords[key];
                }
            });
            
            localStorage.setItem('wordTetris_missedWords', JSON.stringify(allMissedWords));
            this.loadMissedWords(); // 重新加载
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
                if (Array.isArray(data)) {
                    data.forEach(item => {
                        if (item.word) {
                            words.push({
                                word: item.word.trim(),
                                phonetic: item.phonetic || '',
                                meaning: item.meaning || ''
                            });
                        }
                    });
                }
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
            
            // 获取文件名（不含扩展名）作为错词卡名称
            const fileName = file.name.replace(/\.(txt|csv|json)$/i, '');
            
            // 将整个文件保存为一个错词卡
            // 使用文件名作为"单词"
            // 将单词数据保存为 JSON 字符串在 meaning 字段
            const summary = `包含 ${words.length} 个单词`;
            const wordsData = JSON.stringify(words);
            
            this.saveMissedWord(fileName, summary, wordsData);
            
            // 重新加载错词列表
            this.loadMissedWords();
            
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
        content.addEventListener('transitionend', function onEnd(e){
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
        content.addEventListener('transitionend', function onEnd(e){
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
    // 对按年级单元的课程使用新的单元模板
    if (/^grade\d+-term\d+-unit\d+$/i.test(lessonId)) {
        window.location.href = `./study/unit-lesson-template.html?lesson=${lessonId}`;
        return;
    }
    // 默认回退到自然拼读模板
    window.location.href = `./study/phonics-lesson-template.html?lesson=${lessonId}`;
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
        content.addEventListener('transitionend', function onEnd(e){
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

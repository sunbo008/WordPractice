// 层级化设置页面管理器 v2.0
class SettingsManagerV2 {
    constructor() {
        this.config = null;
        this.selectedLibraries = new Set();
        this.init();
    }
    
    async init() {
        try {
            this.showStatus('正在加载配置...', 'info');
            
            // 加载配置文件
            await this.loadConfig();
            
            // 加载用户设置
            this.loadUserSettings();
            
            // 渲染界面
            this.renderInterface();
            
            this.showStatus('配置加载完成！', 'success');
            
        } catch (error) {
            console.error('初始化失败:', error);
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
            if (saved) {
                this.selectedLibraries = new Set(JSON.parse(saved));
                console.log('⚙️ 用户设置加载成功:', Array.from(this.selectedLibraries));
            } else {
                // 使用默认配置
                this.selectedLibraries = new Set(this.config.defaultConfig.enabledLibraries);
                console.log('⚙️ 使用默认配置:', Array.from(this.selectedLibraries));
            }
        } catch (error) {
            console.warn('⚠️ 用户设置加载失败，使用默认配置:', error);
            this.selectedLibraries = new Set(this.config.defaultConfig.enabledLibraries);
        }
    }
    
    saveUserSettings() {
        try {
            localStorage.setItem('wordTetris_selectedLibraries', 
                JSON.stringify(Array.from(this.selectedLibraries)));
            console.log('💾 用户设置已保存');
        } catch (error) {
            console.error('❌ 用户设置保存失败:', error);
        }
    }
    
    renderInterface() {
        this.renderOverview();
        this.renderCategories();
    }
    
    renderOverview() {
        document.getElementById('enabled-count').textContent = this.selectedLibraries.size;
        
        // 计算总单词数
        let totalWords = 0;
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
        
        document.getElementById('total-words-count').textContent = totalWords;
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
        if (this.selectedLibraries.size === 0) {
            this.showStatus('请至少选择一个课程！', 'error');
            return;
        }
        
        this.saveUserSettings();
        this.showStatus('设置保存成功！', 'success');
    }
    
    resetToDefault() {
        this.selectedLibraries = new Set(this.config.defaultConfig.enabledLibraries);
        this.renderInterface();
        this.showStatus('已恢复默认设置！', 'success');
    }
    
    applyAndStart() {
        if (this.selectedLibraries.size === 0) {
            this.showStatus('请至少选择一个课程！', 'error');
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
}

// 全局函数
function toggleCategory(categoryId) {
    const content = document.getElementById(`${categoryId}-content`);
    const header = content.previousElementSibling;
    const icon = header.querySelector('.expand-icon');
    
    content.classList.toggle('collapsed');
    icon.classList.toggle('expanded');
}

function toggleGradeGroup(gradeId) {
    const content = document.getElementById(`${gradeId}-grid`);
    const header = content.previousElementSibling;
    const icon = header.querySelector('.expand-icon');
    
    content.classList.toggle('collapsed');
    icon.classList.toggle('expanded');
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
    window.location.href = `./study/phonics-lesson-template.html?lesson=${lessonId}`;
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    window.settingsManager = new SettingsManagerV2();
});

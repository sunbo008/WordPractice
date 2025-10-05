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
        const response = await fetch('./words/config-v2.json');
        if (!response.ok) {
            throw new Error(`配置文件加载失败: HTTP ${response.status}`);
        }
        this.config = await response.json();
        console.log('📋 配置加载成功:', this.config.metadata);
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
        
        // 计算总单词数（简化版，实际需要根据加载的库计算）
        let totalWords = 0;
        this.config.categories.forEach(category => {
            if (category.subcategories) {
                category.subcategories.forEach(sub => {
                    if (this.selectedLibraries.has(sub.id)) {
                        totalWords += sub.wordCount || 0;
                    }
                });
            } else if (category.items) {
                // 处理年级分类的三层结构
                category.subcategories.forEach(grade => {
                    if (grade.items) {
                        grade.items.forEach(item => {
                            if (this.selectedLibraries.has(item.id)) {
                                totalWords += item.wordCount || 0;
                            }
                        });
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
    
    renderDailyPhonics(category) {
        const grid = document.getElementById('daily-phonics-grid');
        grid.innerHTML = '';
        
        let selectedCount = 0;
        
        category.subcategories.forEach(day => {
            const isSelected = this.selectedLibraries.has(day.id);
            if (isSelected) selectedCount++;
            
            const item = document.createElement('div');
            item.className = `subcategory-item ${isSelected ? 'selected' : ''}`;
            item.dataset.id = day.id;
            item.onclick = () => this.toggleSelection(day.id, 'daily-phonics');
            
            item.innerHTML = `
                <div class="subcategory-header">
                    <span class="subcategory-title">${day.name}</span>
                    <span class="subcategory-phoneme">${day.phoneme}</span>
                </div>
                <div class="subcategory-description">${day.description}</div>
                <div class="subcategory-meta">
                    <span class="word-count">${day.wordCount} 个单词</span>
                    <span class="difficulty-badge difficulty-${day.difficulty}">
                        ${this.getDifficultyName(day.difficulty)}
                    </span>
                </div>
            `;
            
            grid.appendChild(item);
        });
        
        document.getElementById('daily-phonics-count').textContent = 
            `${selectedCount}/${category.subcategories.length}`;
    }
    
    renderSpecialPractice(category) {
        const grid = document.getElementById('special-practice-grid');
        grid.innerHTML = '';
        
        let selectedCount = 0;
        
        category.subcategories.forEach(special => {
            const isSelected = this.selectedLibraries.has(special.id);
            if (isSelected) selectedCount++;
            
            const item = document.createElement('div');
            item.className = `subcategory-item ${isSelected ? 'selected' : ''}`;
            item.dataset.id = special.id;
            item.onclick = () => this.toggleSelection(special.id, 'special-practice');
            
            item.innerHTML = `
                <div class="subcategory-header">
                    <span class="subcategory-title">${special.name}</span>
                    <span class="subcategory-phoneme">${special.phoneme}</span>
                </div>
                <div class="subcategory-description">${special.description}</div>
                <div class="subcategory-meta">
                    <span class="word-count">${special.wordCount} 个单词</span>
                    <span class="difficulty-badge difficulty-${special.difficulty}">
                        ${this.getDifficultyName(special.difficulty)}
                    </span>
                </div>
            `;
            
            grid.appendChild(item);
        });
        
        document.getElementById('special-practice-count').textContent = 
            `${selectedCount}/${category.subcategories.length}`;
    }
    
    renderGradeBased(category) {
        category.subcategories.forEach(gradeLevel => {
            const grid = document.getElementById(`${gradeLevel.id}-grid`);
            grid.innerHTML = '';
            
            let selectedCount = 0;
            
            gradeLevel.items.forEach(term => {
                const isSelected = this.selectedLibraries.has(term.id);
                if (isSelected) selectedCount++;
                
                const item = document.createElement('div');
                item.className = `subcategory-item ${isSelected ? 'selected' : ''}`;
                item.dataset.id = term.id;
                item.onclick = () => this.toggleSelection(term.id, 'grade-based');
                
                item.innerHTML = `
                    <div class="subcategory-header">
                        <span class="subcategory-title">${term.name}</span>
                    </div>
                    <div class="subcategory-description">${term.description}</div>
                    <div class="subcategory-meta">
                        <span class="word-count">${term.wordCount} 个单词</span>
                        <span class="difficulty-badge difficulty-${term.difficulty}">
                            ${this.getDifficultyName(term.difficulty)}
                        </span>
                    </div>
                `;
                
                grid.appendChild(item);
            });
            
            document.getElementById(`${gradeLevel.id}-count`).textContent = 
                `${selectedCount}/${gradeLevel.items.length}`;
        });
        
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
            element.classList.toggle('selected');
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

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    window.settingsManager = new SettingsManagerV2();
});

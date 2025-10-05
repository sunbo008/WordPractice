// 设置页面管理器
class SettingsManager {
    constructor() {
        this.vocabularyManager = null;
        this.currentConfig = null;
        this.availableLibraries = [];
        
        this.init();
    }
    
    async init() {
        try {
            // 显示加载状态
            this.showStatus('正在加载词库配置...', 'info');
            
            // 初始化词汇管理器
            this.vocabularyManager = new VocabularyManagerV2();
            
            // 等待加载完成
            await this.waitForLoad();
            
            // 获取配置和词库信息
            this.currentConfig = this.vocabularyManager.getCurrentConfig();
            this.availableLibraries = this.vocabularyManager.getAvailableLibraries();
            
            // 渲染界面
            this.renderInterface();
            
            // 绑定事件
            this.bindEvents();
            
            this.showStatus('配置加载完成！', 'success');
            
        } catch (error) {
            console.error('设置页面初始化失败:', error);
            this.showStatus('配置加载失败: ' + error.message, 'error');
        }
    }
    
    async waitForLoad() {
        let attempts = 0;
        while (!this.vocabularyManager.isLoaded && attempts < 100) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (!this.vocabularyManager.isLoaded) {
            throw new Error('词库加载超时');
        }
    }
    
    renderInterface() {
        this.renderOverview();
        this.renderLibraryGrid();
        this.renderAdvancedSettings();
    }
    
    renderOverview() {
        const enabledCount = this.currentConfig.enabledLibraries.length;
        const stats = this.vocabularyManager.getLibraryStats();
        
        document.getElementById('enabled-libraries-count').textContent = enabledCount;
        document.getElementById('total-words-count').textContent = stats.totalWords;
        document.getElementById('difficulty-range').textContent = 
            `${this.currentConfig.difficultyRange[0]}-${this.currentConfig.difficultyRange[1]}`;
    }
    
    renderLibraryGrid() {
        const grid = document.getElementById('library-grid');
        grid.innerHTML = '';
        
        this.availableLibraries.forEach(library => {
            const card = this.createLibraryCard(library);
            grid.appendChild(card);
        });
    }
    
    createLibraryCard(library) {
        const isEnabled = this.currentConfig.enabledLibraries.includes(library.id);
        
        const card = document.createElement('div');
        card.className = `library-card ${isEnabled ? 'enabled' : ''} ${library.recommended ? 'recommended' : ''}`;
        card.dataset.libraryId = library.id;
        
        card.innerHTML = `
            <div class="library-header">
                <div class="library-icon">${library.icon}</div>
                <div class="library-title">
                    <h3>${library.name}</h3>
                    <div class="category">${this.getCategoryName(library.category)}</div>
                </div>
                <div class="library-toggle ${isEnabled ? 'enabled' : ''}" data-library-id="${library.id}"></div>
            </div>
            <div class="library-description">${library.description}</div>
            <div class="library-stats">
                <span>${library.totalWords} 个单词</span>
                <span class="difficulty-badge difficulty-${library.difficulty}">${this.getDifficultyName(library.difficulty)}</span>
            </div>
            <div class="library-tags">
                ${library.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
            </div>
        `;
        
        return card;
    }
    
    getCategoryName(category) {
        const categoryMap = {
            'phonics': '音标学习',
            'vocabulary': '词汇学习',
            'grammar': '语法学习',
            'conversation': '对话练习'
        };
        return categoryMap[category] || category;
    }
    
    getDifficultyName(difficulty) {
        const difficultyMap = {
            'beginner': '初级',
            'intermediate': '中级',
            'advanced': '高级'
        };
        return difficultyMap[difficulty] || difficulty;
    }
    
    renderAdvancedSettings() {
        document.getElementById('max-words').value = this.currentConfig.maxWords;
        document.getElementById('max-words-value').textContent = this.currentConfig.maxWords;
        
        document.getElementById('min-difficulty').value = this.currentConfig.difficultyRange[0];
        document.getElementById('max-difficulty').value = this.currentConfig.difficultyRange[1];
    }
    
    bindEvents() {
        // 词库切换事件
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('library-toggle')) {
                this.toggleLibrary(e.target.dataset.libraryId);
            } else if (e.target.closest('.library-card')) {
                const card = e.target.closest('.library-card');
                const libraryId = card.dataset.libraryId;
                this.toggleLibrary(libraryId);
            }
        });
        
        // 最大单词数滑块
        const maxWordsSlider = document.getElementById('max-words');
        const maxWordsValue = document.getElementById('max-words-value');
        maxWordsSlider.addEventListener('input', (e) => {
            maxWordsValue.textContent = e.target.value;
        });
        
        // 难度选择
        document.getElementById('min-difficulty').addEventListener('change', (e) => {
            const minDiff = parseInt(e.target.value);
            const maxDiffSelect = document.getElementById('max-difficulty');
            const maxDiff = parseInt(maxDiffSelect.value);
            
            if (minDiff > maxDiff) {
                maxDiffSelect.value = minDiff;
            }
        });
        
        document.getElementById('max-difficulty').addEventListener('change', (e) => {
            const maxDiff = parseInt(e.target.value);
            const minDiffSelect = document.getElementById('min-difficulty');
            const minDiff = parseInt(minDiffSelect.value);
            
            if (maxDiff < minDiff) {
                minDiffSelect.value = maxDiff;
            }
        });
    }
    
    toggleLibrary(libraryId) {
        const enabledLibraries = [...this.currentConfig.enabledLibraries];
        const index = enabledLibraries.indexOf(libraryId);
        
        if (index > -1) {
            // 如果只有一个词库启用，不允许禁用
            if (enabledLibraries.length === 1) {
                this.showStatus('至少需要启用一个词库！', 'error');
                return;
            }
            enabledLibraries.splice(index, 1);
        } else {
            enabledLibraries.push(libraryId);
        }
        
        this.currentConfig.enabledLibraries = enabledLibraries;
        
        // 更新界面
        this.renderInterface();
        
        // 显示变更提示
        const library = this.availableLibraries.find(lib => lib.id === libraryId);
        const action = index > -1 ? '禁用' : '启用';
        this.showStatus(`已${action}词库: ${library.name}`, 'info');
    }
    
    async saveSettings() {
        try {
            this.showStatus('正在保存设置...', 'info');
            
            // 收集当前设置
            const newConfig = {
                enabledLibraries: this.currentConfig.enabledLibraries,
                maxWords: parseInt(document.getElementById('max-words').value),
                difficultyRange: [
                    parseInt(document.getElementById('min-difficulty').value),
                    parseInt(document.getElementById('max-difficulty').value)
                ]
            };
            
            // 应用设置
            await this.vocabularyManager.updateConfig(newConfig);
            this.currentConfig = this.vocabularyManager.getCurrentConfig();
            
            // 更新界面
            this.renderOverview();
            
            this.showStatus('设置保存成功！', 'success');
            
        } catch (error) {
            console.error('保存设置失败:', error);
            this.showStatus('保存设置失败: ' + error.message, 'error');
        }
    }
    
    async resetToDefault() {
        try {
            this.showStatus('正在恢复默认设置...', 'info');
            
            // 获取默认配置
            const defaultConfig = {
                enabledLibraries: ['basic-phonics', 'common-words'],
                maxWords: 200,
                difficultyRange: [1, 3],
                categories: ['all']
            };
            
            // 应用默认设置
            await this.vocabularyManager.updateConfig(defaultConfig);
            this.currentConfig = this.vocabularyManager.getCurrentConfig();
            
            // 更新界面
            this.renderInterface();
            
            this.showStatus('已恢复默认设置！', 'success');
            
        } catch (error) {
            console.error('恢复默认设置失败:', error);
            this.showStatus('恢复默认设置失败: ' + error.message, 'error');
        }
    }
    
    async applyAndStart() {
        try {
            // 先保存设置
            await this.saveSettings();
            
            // 跳转到游戏页面
            window.location.href = './index.html';
            
        } catch (error) {
            console.error('应用设置失败:', error);
            this.showStatus('应用设置失败: ' + error.message, 'error');
        }
    }
    
    showStatus(message, type = 'info') {
        const statusElement = document.getElementById('status-message');
        statusElement.textContent = message;
        statusElement.className = `status-message ${type} show`;
        
        setTimeout(() => {
            statusElement.classList.remove('show');
        }, 3000);
    }
}

// 全局函数
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
    window.settingsManager = new SettingsManager();
});

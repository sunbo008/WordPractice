/**
 * 考级页面控制器
 * 负责渲染徽章悬挂区、技能树和考试区
 */

class CertificationPage {
    constructor() {
        this.certSystem = new CertificationSystem();
        this.testMode = false; // 测试模式：跳过解锁和冷却检查
        this.badgeMap = {
            'phonics': { file: 'phonics-badge.svg', name: '音标大师', encourage: '我们一起见证了你的成长，努力必然有回报，加油！！！' },
            'grade3': { file: 'grade3-badge.svg', name: '三年级', encourage: '迈出第一步，你已经很棒了！继续前进！' },
            'grade4': { file: 'grade4-badge.svg', name: '四年级', encourage: '稳步提升中，你的坚持让人敬佩！' },
            'grade5': { file: 'grade5-badge.svg', name: '五年级', encourage: '积累的力量正在显现，胜利就在前方！' },
            'grade6': { file: 'grade6-badge.svg', name: '六年级', encourage: '小学词汇全部掌握！你已准备好迎接新挑战！' },
            'flyGuy': { file: 'flyguy-badge.svg', name: 'Fly Guy', encourage: '阅读的快乐你已体会到了，继续翱翔吧！' },
            'magicTreeHouse': { file: 'treehouse-badge.svg', name: '神奇树屋', encourage: '穿越时空的冒险者，你的词汇量突飞猛进！' },
            'dragonBall': { file: 'dragonball-badge.svg', name: '七龙珠', encourage: '集齐七龙珠的勇士，没有什么能阻挡你！' },
            'harryPotter': { file: 'harrypotter-badge.svg', name: '哈利波特', encourage: '魔法世界的探索者，你的英语已经非常出色！' },
            'middleSchool': { file: 'middle-badge.svg', name: '初中', encourage: '初中词汇已拿下，你的努力值得骄傲！' },
            'highSchool': { file: 'high-badge.svg', name: '高中', encourage: '高中词汇全部掌握，大学之门为你敞开！' },
            'cet4': { file: 'cet4-badge.svg', name: '四级', encourage: '四级词汇已征服，你已是真正的英语高手！' }
        };
    }

    /**
     * 初始化页面
     */
    init() {
        // 检查测试模式参数: ?test=1
        this._checkTestMode();
        
        this.renderBadgeHall();
        this.renderSkillTree();
        this.updateStats();
        
        // 创建考试确认弹窗
        this._createExamModal();
        
        // 绑定导出导入按钮事件
        this._bindDataManagementEvents();
        
        // 定时刷新冷却时间显示
        setInterval(() => this.renderSkillTree(), 60000); // 每分钟刷新一次
    }
    
    /**
     * 检查是否启用测试模式
     * URL 参数: ?test=1
     */
    _checkTestMode() {
        const params = new URLSearchParams(window.location.search);
        this.testMode = params.get('test') === '1';
        
        if (this.testMode) {
            console.log('🧪 测试模式已启用 - 跳过解锁和冷却检查');
            this._showTestModeIndicator();
        }
    }
    
    /**
     * 显示测试模式指示器
     */
    _showTestModeIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'testModeIndicator';
        indicator.innerHTML = `
            <div style="
                position: fixed;
                top: 10px;
                left: 50%;
                transform: translateX(-50%);
                padding: 8px 20px;
                background: linear-gradient(135deg, #ff6b6b, #ee5a24);
                border: 2px solid #ffd700;
                border-radius: 20px;
                color: white;
                font-weight: bold;
                font-size: 14px;
                z-index: 9999;
                box-shadow: 0 4px 15px rgba(255, 107, 107, 0.5);
                animation: pulse-test 1.5s ease-in-out infinite;
            ">
                🧪 测试模式 - 所有考试可直接进入
            </div>
        `;
        
        // 添加动画样式
        const style = document.createElement('style');
        style.textContent = `
            @keyframes pulse-test {
                0%, 100% { transform: translateX(-50%) scale(1); }
                50% { transform: translateX(-50%) scale(1.05); }
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(indicator);
    }
    
    /**
     * 绑定数据管理按钮事件
     */
    _bindDataManagementEvents() {
        const exportBtn = document.getElementById('exportBtn');
        const importBtn = document.getElementById('importBtn');
        
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.certSystem.storage.exportToFile();
            });
        }
        
        if (importBtn) {
            importBtn.addEventListener('click', async () => {
                await this.certSystem.storage.importFromFile();
            });
        }
    }
    
    /**
     * 创建考试确认弹窗
     */
    _createExamModal() {
        const modal = document.createElement('div');
        modal.id = 'examModal';
        modal.className = 'exam-modal';
        modal.innerHTML = `
            <div class="exam-modal-content">
                <div class="exam-modal-header">
                    <span class="exam-modal-icon">📝</span>
                    <h3 class="exam-modal-title">开始考试</h3>
                </div>
                <div class="exam-modal-body">
                    <div class="exam-modal-level" id="modalLevelName"></div>
                    <div class="exam-modal-scope" id="modalExamScope"></div>
                    <div class="exam-modal-info">
                        <div class="exam-info-item">
                            <span class="info-label">📚 范围</span>
                            <span class="info-value" id="modalWordCount">--</span>
                        </div>
                        <div class="exam-info-item">
                            <span class="info-label">🎯 通过标准</span>
                            <span class="info-value">≥ 90%</span>
                        </div>
                        <div class="exam-info-item">
                            <span class="info-label">⏱️ 时间限制</span>
                            <span class="info-value">无</span>
                        </div>
                    </div>
                </div>
                <div class="exam-modal-footer">
                    <button class="exam-modal-btn cancel" id="modalCancelBtn">取消</button>
                    <button class="exam-modal-btn confirm" id="modalConfirmBtn">🚀 开始</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        // 绑定事件
        document.getElementById('modalCancelBtn').addEventListener('click', () => this._hideExamModal());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this._hideExamModal();
        });
    }
    
    /**
     * 显示考试确认弹窗
     */
    _showExamModal(series, majorLevel, minorLevel) {
        const modal = document.getElementById('examModal');
        const levelNameEl = document.getElementById('modalLevelName');
        const examScopeEl = document.getElementById('modalExamScope');
        const wordCountEl = document.getElementById('modalWordCount');
        const confirmBtn = document.getElementById('modalConfirmBtn');
        
        // 获取显示名称
        const displayName = this.certSystem.getLevelDisplayName(series, majorLevel, minorLevel);
        levelNameEl.textContent = displayName;
        
        // 获取考试信息
        const examInfo = this.certSystem.getExamInfo(series, majorLevel, minorLevel);
        examScopeEl.textContent = examInfo.scope;
        // wordCount=0 表示加载全部单词
        if (examInfo.wordCount === 0) {
            // 从 scope 中提取数量描述（如果有的话）
            const match = examInfo.scope.match(/（[约]?(\d+)个）/);
            wordCountEl.textContent = match ? `全部 ~${match[1]} 个单词` : '全部单词';
        } else {
            wordCountEl.textContent = `${examInfo.wordCount} 个单词`;
        }
        
        // 存储当前选择
        this._pendingExam = { series, majorLevel, minorLevel };
        
        // 绑定确认按钮
        confirmBtn.onclick = () => {
            this._hideExamModal();
            this.startExam(series, majorLevel, minorLevel);
        };
        
        modal.classList.add('show');
    }
    
    /**
     * 隐藏考试确认弹窗
     */
    _hideExamModal() {
        const modal = document.getElementById('examModal');
        modal.classList.remove('show');
    }

    /**
     * 渲染徽章悬挂区
     */
    renderBadgeHall() {
        const container = document.getElementById('badgeHall');
        if (!container) return;

        const progress = this.certSystem.getProgress();
        const earnedBadges = this.certSystem.getEarnedBadges();
        const earnedMap = {};
        earnedBadges.forEach(b => {
            earnedMap[b.id] = b.earnedAt;
        });
        
        // 测试模式：test=2 时开启所有徽章
        const urlParams = new URLSearchParams(window.location.search);
        const isTestMode = urlParams.get('test') === '2';
        if (isTestMode) {
            const allBadgeIds = Object.keys(this.badgeMap);
            const testTime = Date.now();
            allBadgeIds.forEach(id => {
                if (!earnedMap[id]) {
                    earnedMap[id] = testTime;
                }
            });
        }

        // 基础系列
        const basicBadges = ['phonics', 'grade3', 'grade4', 'grade5', 'grade6'];
        // 课外阅读系列
        const readingBadges = ['flyGuy', 'magicTreeHouse', 'dragonBall', 'harryPotter'];
        // 升学系列
        const academicBadges = ['middleSchool', 'highSchool', 'cet4'];

        const formatDate = (timestamp) => {
            if (!timestamp) return '';
            const date = new Date(timestamp);
            return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
        };

        // 获取徽章对应的系列和大级别
        const getBadgeSeriesInfo = (id) => {
            if (id === 'phonics') return { series: 'phonics', major: null };
            if (['grade3', 'grade4', 'grade5', 'grade6'].includes(id)) return { series: 'primaryGrades', major: id };
            if (['flyGuy', 'magicTreeHouse', 'dragonBall', 'harryPotter'].includes(id)) return { series: 'extracurricular', major: id };
            if (['middleSchool', 'highSchool', 'cet4'].includes(id)) return { series: 'academic', major: id };
            return null;
        };

        const renderBadgeRow = (badges, label) => {
            const badgesHtml = badges.map(id => {
                const info = this.badgeMap[id];
                const earnedAt = earnedMap[id];
                const earned = !!earnedAt;
                const filePrefix = earned ? info.file : info.file.replace('.svg', '-gray.svg');
                
                // 检查是否显示亮星（测试模式下全部显示亮星）
                const seriesInfo = getBadgeSeriesInfo(id);
                const showStar = isTestMode || (seriesInfo && this.certSystem.shouldShowStar(seriesInfo.series, seriesInfo.major));
                const starHtml = showStar ? '<span class="badge-hall-star">⭐</span>' : '';
                
                const tooltip = earned 
                    ? `🏅 ${info.name}\n${info.encourage}\n\n解锁于: ${formatDate(earnedAt)}${showStar ? '\n🌟 全满分成就！' : ''}` 
                    : `🔒 ${info.name}\n未解锁`;
                const passedBadgeHtml = earned ? '<span class="badge-hall-passed">🏅</span>' : '';
                return `
                    <div class="badge-slot ${earned ? 'earned' : 'locked'}" title="${tooltip}">
                        <div class="badge-img-wrapper">
                            <img src="assets/badges/${filePrefix}" alt="${info.name}">
                            ${starHtml}
                            ${passedBadgeHtml}
                        </div>
                        <div class="badge-slot-name">${info.name}</div>
                    </div>
                `;
            }).join('');

            return `
                <div class="badge-section">
                    <div class="badge-section-label">${label}</div>
                    <div class="badge-row">${badgesHtml}</div>
                </div>
            `;
        };

        container.innerHTML = `
            <h2 class="badge-hall-title">徽章悬挂区</h2>
            ${renderBadgeRow(basicBadges, '基础系列')}
            ${renderBadgeRow(readingBadges, '课外阅读系列')}
            ${renderBadgeRow(academicBadges, '升学系列')}
        `;
    }

    /**
     * 渲染技能树
     */
    renderSkillTree() {
        const container = document.getElementById('skillTree');
        if (!container) return;

        const progress = this.certSystem.getProgress();
        
        // 渲染主干路径
        const mainPathHtml = this._renderMainPath(progress);
        
        // 渲染分支
        const branchHtml = this._renderBranches(progress);

        container.innerHTML = `
            <div class="main-path">
                ${mainPathHtml}
            </div>
            ${branchHtml}
        `;

        // 绑定节点点击事件
        this._bindNodeEvents();
    }

    /**
     * 渲染主干路径（音标→小学年级）- 纵向树状布局，展示所有小级别
     */
    _renderMainPath(progress) {
        const html = [];
        
        // ========== 音标系列 ==========
        html.push(this._renderPhonicsTree(progress));
        
        // 连接箭头到年级
        const phonicsCompleted = progress.phonics.badge.earned;
        html.push(`<span class="tree-arrow main-arrow ${phonicsCompleted ? 'active' : ''}">↓</span>`);
        
        // ========== 年级系列 ==========
        const grades = ['grade3', 'grade4', 'grade5', 'grade6'];
        const gradeNames = { grade3: '三年级', grade4: '四年级', grade5: '五年级', grade6: '六年级' };
        
        let prevGradePassed = phonicsCompleted;
        
        grades.forEach((grade, idx) => {
            html.push(this._renderGradeTree(progress, grade, gradeNames[grade], prevGradePassed));
            
            const gradeCompleted = progress.primaryGrades[grade]?.badge.earned;
            
            if (idx < grades.length - 1) {
                html.push(`<span class="tree-arrow main-arrow ${gradeCompleted ? 'active' : ''}">↓</span>`);
            }
            
            prevGradePassed = gradeCompleted;
        });

        return html.join('');
    }
    
    /**
     * 渲染音标系列树状结构
     */
    _renderPhonicsTree(progress) {
        const config = this.certSystem.levelConfig.phonics;
        const phonicsCompleted = progress.phonics.badge.earned;
        
        // 渲染小级别节点
        const subNodes = config.order.map((level, idx) => {
            const levelData = progress.phonics.levels[level];
            const passed = levelData?.passed;
            
            // 检查是否解锁
            let unlocked = idx === 0;
            if (idx > 0) {
                const prevLevel = config.order[idx - 1];
                unlocked = progress.phonics.levels[prevLevel]?.passed || false;
            }
            
            // 检查冷却状态
            const isInCooldown = levelData && this.certSystem.storage.isInCooldown(levelData);
            const cooldownText = isInCooldown ? this.certSystem.storage.formatCooldownTime(levelData) : '';
            
            const statusClass = passed ? 'completed' : (unlocked ? 'current' : 'locked');
            const statusIcon = passed ? '✅' : (unlocked ? '🔓' : '🔒');
            const isLast = idx === config.order.length - 1;
            
            // 生成 tooltip
            const tooltip = this._getNodeTooltip(levelData, unlocked, isInCooldown, cooldownText);
            
            return `
                <div class="tree-sub-row">
                    <div class="tree-connector ${isLast ? 'last' : ''}"></div>
                    <div class="tree-node sub-node ${statusClass}" 
                         data-series="phonics" data-major="${level}" data-minor=""
                         data-tooltip="${tooltip}">
                        <span class="node-name">${config.levelNames[level]}</span>
                        <span class="node-status-icon">${statusIcon}</span>
                        ${passed && levelData?.score ? `<span class="node-score">${levelData.score}%</span>` : ''}
                    </div>
                </div>
            `;
        }).join('');
        
        const badgeFile = phonicsCompleted 
            ? this.badgeMap.phonics.file 
            : this.badgeMap.phonics.file.replace('.svg', '-gray.svg');
        
        // 检查总考是否解锁
        const finalExamUnlocked = this.certSystem.isFinalExamUnlocked('phonics');
        const finalExamData = progress.phonics.finalExam;
        const finalExamPassed = finalExamData?.passed;
        
        // 主节点状态
        let mainNodeClass = 'locked';
        let mainNodeTooltip = '🔒 完成所有小级别后解锁总考';
        if (phonicsCompleted) {
            mainNodeClass = 'completed';
            mainNodeTooltip = '✅ 已获得徽章，点击可重新挑战总考';
        } else if (finalExamUnlocked) {
            mainNodeClass = 'current final-exam-ready';
            mainNodeTooltip = finalExamPassed 
                ? `✅ 总考已通过: ${finalExamData.score}%，点击重新挑战` 
                : '🎯 所有小级别已通过，点击开始级别总考！';
        }
        
        // 检查是否显示亮星
        const showStar = this.certSystem.shouldShowStar('phonics');
        const starHtml = showStar ? '<span class="badge-star">⭐</span>' : '';
        
        // 主节点状态图标
        let mainStatusIcon = '🔒';
        if (phonicsCompleted) {
            mainStatusIcon = '✅';
        } else if (finalExamUnlocked) {
            mainStatusIcon = '📝';
        }
        
        return `
            <div class="tree-group">
                <div class="tree-node main-node ${mainNodeClass}" 
                     data-series="phonics" data-major="" data-minor="finalExam"
                     data-tooltip="${mainNodeTooltip}">
                    <div class="badge-wrapper">
                        <img class="node-badge" src="assets/badges/${badgeFile}" alt="音标徽章">
                        ${starHtml}
                    </div>
                    <span class="node-name">音标</span>
                    <span class="node-status-icon">${mainStatusIcon}</span>
                </div>
                <div class="tree-sub-nodes">${subNodes}</div>
            </div>
        `;
    }
    
    /**
     * 渲染年级树状结构
     */
    _renderGradeTree(progress, gradeId, gradeName, isUnlocked) {
        const gradeData = progress.primaryGrades[gradeId];
        const gradeCompleted = gradeData?.badge.earned;
        const terms = ['term1', 'term2'];
        const termNames = { term1: '上学期', term2: '下学期' };
        
        // 渲染学期节点
        const subNodes = terms.map((term, idx) => {
            const termData = gradeData?.[term];
            const passed = termData?.passed;
            
            let unlocked = isUnlocked && idx === 0;
            if (idx === 1) {
                unlocked = gradeData?.term1?.passed || false;
            }
            
            // 检查冷却状态
            const isInCooldown = termData && this.certSystem.storage.isInCooldown(termData);
            const cooldownText = isInCooldown ? this.certSystem.storage.formatCooldownTime(termData) : '';
            
            const statusClass = passed ? 'completed' : (unlocked ? 'current' : 'locked');
            const statusIcon = passed ? '✅' : (unlocked ? '🔓' : '🔒');
            const isLast = idx === terms.length - 1;
            
            // 生成 tooltip
            const tooltip = this._getNodeTooltip(termData, unlocked, isInCooldown, cooldownText);
            
            return `
                <div class="tree-sub-row">
                    <div class="tree-connector ${isLast ? 'last' : ''}"></div>
                    <div class="tree-node sub-node ${statusClass}" 
                         data-series="primaryGrades" data-major="${gradeId}" data-minor="${term}"
                         data-tooltip="${tooltip}">
                        <span class="node-name">${termNames[term]}</span>
                        <span class="node-status-icon">${statusIcon}</span>
                        ${passed && termData?.score ? `<span class="node-score">${termData.score}%</span>` : ''}
                    </div>
                </div>
            `;
        }).join('');
        
        const badgeKey = gradeId; // grade3, grade4, etc.
        const badgeFile = gradeCompleted 
            ? this.badgeMap[badgeKey].file 
            : this.badgeMap[badgeKey].file.replace('.svg', '-gray.svg');
        
        // 检查总考是否解锁
        const finalExamUnlocked = this.certSystem.isFinalExamUnlocked('primaryGrades', gradeId);
        const finalExamData = gradeData?.finalExam;
        const finalExamPassed = finalExamData?.passed;
        
        // 主节点状态
        let mainClass = 'locked';
        let mainNodeTooltip = '🔒 完成所有小级别后解锁总考';
        if (gradeCompleted) {
            mainClass = 'completed';
            mainNodeTooltip = '✅ 已获得徽章，点击可重新挑战总考';
        } else if (finalExamUnlocked) {
            mainClass = 'current final-exam-ready';
            mainNodeTooltip = finalExamPassed 
                ? `✅ 总考已通过: ${finalExamData.score}%，点击重新挑战` 
                : '🎯 所有小级别已通过，点击开始级别总考！';
        } else if (isUnlocked) {
            mainClass = 'in-progress';
            mainNodeTooltip = '📚 完成所有小级别后解锁总考';
        }
        
        // 检查是否显示亮星
        const showStar = this.certSystem.shouldShowStar('primaryGrades', gradeId);
        const starHtml = showStar ? '<span class="badge-star">⭐</span>' : '';
        
        // 主节点状态图标
        let mainStatusIcon = '🔒';
        if (gradeCompleted) {
            mainStatusIcon = '✅';
        } else if (finalExamUnlocked) {
            mainStatusIcon = '📝';
        } else if (isUnlocked) {
            mainStatusIcon = '📚';
        }
        
        return `
            <div class="tree-group">
                <div class="tree-node main-node ${mainClass}" 
                     data-series="primaryGrades" data-major="${gradeId}" data-minor="finalExam"
                     data-tooltip="${mainNodeTooltip}">
                    <div class="badge-wrapper">
                        <img class="node-badge" src="assets/badges/${badgeFile}" alt="${gradeName}徽章">
                        ${starHtml}
                    </div>
                    <span class="node-name">${gradeName}</span>
                    <span class="node-status-icon">${mainStatusIcon}</span>
                </div>
                <div class="tree-sub-nodes">${subNodes}</div>
            </div>
        `;
    }
    
    /**
     * 旧方法保留兼容 - 渲染年级区块
     */
    _renderGradeSection(progress, gradeId, gradeName, isUnlocked) {
        return this._renderGradeTree(progress, gradeId, gradeName, isUnlocked);
    }
    
    _unused_renderGradeSection(progress, gradeId, gradeName, isUnlocked) {
        const gradeData = progress.primaryGrades[gradeId];
        const gradeCompleted = gradeData?.badge.earned;
        const terms = ['term1', 'term2'];
        const termNames = { term1: '上学期', term2: '下学期' };
        const subLevels = '';
        const sectionClass = gradeCompleted ? 'completed' : (isUnlocked ? 'current' : 'locked');
        
        return `
            <div class="level-section ${sectionClass}">
                <div class="level-header">
                    <span class="level-icon">📚</span>
                    <span class="level-name">${gradeName}</span>
                    <span class="level-badge">${gradeCompleted ? '🏅' : ''}</span>
                </div>
                ${isUnlocked ? `<div class="sub-levels">${subLevels}</div>` : 
                    '<div class="locked-hint">🔒 完成前置级别后解锁</div>'}
            </div>
        `;
    }

    /**
     * 渲染分支（课外阅读 / 升学）- 从六年级分叉
     */
    _renderBranches(progress) {
        const grade6Passed = progress.primaryGrades.grade6?.badge.earned;
        const activeClass = grade6Passed ? 'active' : '';
        
        // 分叉连接线
        const forkConnector = `
            <div class="branch-connector">
                <div class="branch-connector-line ${activeClass}"></div>
                <div class="branch-connector-fork">
                    <div class="branch-connector-left">
                        <div class="branch-connector-horizontal ${activeClass}"></div>
                        <div class="branch-connector-vertical ${activeClass}"></div>
                    </div>
                    <div class="branch-connector-right">
                        <div class="branch-connector-horizontal ${activeClass}"></div>
                        <div class="branch-connector-vertical ${activeClass}"></div>
                    </div>
                </div>
            </div>
        `;
        
        // 始终渲染树状结构，未解锁时显示锁定状态
        const readingTree = this._renderBranchTree('extracurricular', progress, grade6Passed);
        const academicTree = this._renderBranchTree('academic', progress, grade6Passed);
        
        const lockedClass = grade6Passed ? '' : 'series-locked';
        const lockHint = grade6Passed ? '' : '<div class="branch-lock-hint">🔒 完成6年级后解锁</div>';

        return `
            ${forkConnector}
            <div class="branch-area">
                <div class="branch ${lockedClass}">
                    <div class="branch-title">📖 课外阅读</div>
                    ${lockHint}
                    <div class="branch-tree">${readingTree}</div>
                </div>
                <div class="branch ${lockedClass}">
                    <div class="branch-title">🎓 升学</div>
                    ${lockHint}
                    <div class="branch-tree">${academicTree}</div>
                </div>
            </div>
        `;
    }

    /**
     * 渲染分支树状结构（课外阅读/升学系列）
     */
    _renderBranchTree(series, progress, isSeriesUnlocked = true) {
        const config = this.certSystem.levelConfig[series];
        const seriesData = progress[series];
        const html = [];
        
        config.order.forEach((majorLevel, idx) => {
            const levelData = seriesData[majorLevel];
            const completed = levelData?.badge.earned;
            
            // 检查解锁状态（系列未解锁则全部锁定）
            let unlocked = isSeriesUnlocked;
            if (isSeriesUnlocked && idx > 0) {
                const prevLevel = config.order[idx - 1];
                unlocked = seriesData[prevLevel]?.badge.earned;
            }
            
            // 渲染大级别及其小级别
            html.push(this._renderBranchMajorLevel(series, majorLevel, progress, unlocked));
            
            // 添加连接箭头（除了最后一个）
            if (idx < config.order.length - 1) {
                html.push(`<span class="tree-arrow branch-arrow ${completed ? 'active' : ''}">↓</span>`);
            }
        });
        
        return html.join('');
    }
    
    /**
     * 渲染分支的大级别节点（带小级别）
     */
    _renderBranchMajorLevel(series, majorLevel, progress, isUnlocked) {
        const config = this.certSystem.levelConfig[series];
        const levelConfig = config.levelNames[majorLevel];
        const seriesData = progress[series];
        const levelData = seriesData[majorLevel];
        const completed = levelData?.badge.earned;
        
        const name = levelConfig?.name || majorLevel;
        const subLevels = levelConfig?.subLevels || [];
        const subNames = levelConfig?.subNames || {};
        
        // 获取徽章
        const badgeKey = majorLevel;
        const badgeInfo = this.badgeMap[badgeKey];
        let badgeHtml = '';
        if (badgeInfo) {
            const badgeFile = completed 
                ? badgeInfo.file 
                : badgeInfo.file.replace('.svg', '-gray.svg');
            badgeHtml = `<img class="node-badge small" src="assets/badges/${badgeFile}" alt="${name}徽章">`;
        }
        
        // 检查总考是否解锁
        const finalExamUnlocked = this.certSystem.isFinalExamUnlocked(series, majorLevel);
        const finalExamData = levelData?.finalExam;
        const finalExamPassed = finalExamData?.passed;
        
        // 主节点状态
        let mainClass = 'locked';
        let mainNodeTooltip = '🔒 完成所有小级别后解锁总考';
        if (completed) {
            mainClass = 'completed';
            mainNodeTooltip = '✅ 已获得徽章，点击可重新挑战总考';
        } else if (finalExamUnlocked) {
            mainClass = 'current final-exam-ready';
            mainNodeTooltip = finalExamPassed 
                ? `✅ 总考已通过: ${finalExamData.score}%，点击重新挑战` 
                : '🎯 所有小级别已通过，点击开始级别总考！';
        } else if (isUnlocked) {
            mainClass = 'in-progress';
            mainNodeTooltip = '📚 完成所有小级别后解锁总考';
        }
        
        // 检查是否显示亮星
        const showStar = this.certSystem.shouldShowStar(series, majorLevel);
        const starHtml = showStar ? '<span class="badge-star">⭐</span>' : '';
        
        // 主节点状态图标
        let mainStatusIcon = '🔒';
        if (completed) {
            mainStatusIcon = '✅';
        } else if (finalExamUnlocked) {
            mainStatusIcon = '📝';
        } else if (isUnlocked) {
            mainStatusIcon = '📚';
        }
        
        // 如果没有小级别，显示简单节点（直接可以总考）
        if (subLevels.length === 0) {
            return `
                <div class="tree-group branch-group">
                    <div class="tree-node main-node branch-main ${mainClass}" 
                         data-series="${series}" data-major="${majorLevel}" data-minor="finalExam"
                         data-tooltip="${mainNodeTooltip}">
                        <div class="badge-wrapper">
                            ${badgeHtml || `<span class="node-icon">📖</span>`}
                            ${starHtml}
                        </div>
                        <span class="node-name">${name}</span>
                        <span class="node-status-icon">${mainStatusIcon}</span>
                    </div>
                </div>
            `;
        }
        
        // 渲染小级别节点
        const subNodes = subLevels.map((subLevel, idx) => {
            const subData = levelData?.levels?.[subLevel];
            const subPassed = subData?.passed;
            
            // 检查小级别是否解锁
            let subUnlocked = isUnlocked && idx === 0;
            if (idx > 0) {
                const prevSub = subLevels[idx - 1];
                subUnlocked = levelData?.levels?.[prevSub]?.passed || false;
            }
            
            // 检查冷却状态
            const isInCooldown = subData && this.certSystem.storage.isInCooldown(subData);
            const cooldownText = isInCooldown ? this.certSystem.storage.formatCooldownTime(subData) : '';
            
            const statusClass = subPassed ? 'completed' : (subUnlocked ? 'current' : 'locked');
            const statusIcon = subPassed ? '✅' : (subUnlocked ? '🔓' : '🔒');
            const isLast = idx === subLevels.length - 1;
            
            // 获取小级别显示名称
            let subName = subNames[subLevel] || subLevel;
            if (series === 'extracurricular' && majorLevel === 'flyGuy') {
                const flyGuyNames = { book1to5: '1-5册', book6to10: '6-10册', book11to15: '11-15册' };
                subName = flyGuyNames[subLevel] || subLevel;
            }
            
            // 生成 tooltip
            const tooltip = this._getNodeTooltip(subData, subUnlocked, isInCooldown, cooldownText);
            
            return `
                <div class="tree-sub-row">
                    <div class="tree-connector ${isLast ? 'last' : ''}"></div>
                    <div class="tree-node sub-node ${statusClass}" 
                         data-series="${series}" data-major="${majorLevel}" data-minor="${subLevel}"
                         data-tooltip="${tooltip}">
                        <span class="node-name">${subName}</span>
                        <span class="node-status-icon">${statusIcon}</span>
                        ${subPassed && subData?.score ? `<span class="node-score">${subData.score}%</span>` : ''}
                    </div>
                </div>
            `;
        }).join('');
        
        return `
            <div class="tree-group branch-group">
                <div class="tree-node main-node branch-main ${mainClass}" 
                     data-series="${series}" data-major="${majorLevel}" data-minor="finalExam"
                     data-tooltip="${mainNodeTooltip}">
                    <div class="badge-wrapper">
                        ${badgeHtml || `<span class="node-icon">📖</span>`}
                        ${starHtml}
                    </div>
                    <span class="node-name">${name}</span>
                    <span class="node-status-icon">${mainStatusIcon}</span>
                </div>
                <div class="tree-sub-nodes">${subNodes}</div>
            </div>
        `;
    }

    /**
     * 创建节点 HTML
     */
    _createNode(series, majorLevel, minorLevel, icon, name, completed, isCurrent, locked = false) {
        let statusText = '🔒 锁定';
        if (completed) statusText = '✅ 已通过';
        else if (isCurrent) statusText = '🔓 可挑战';

        const classes = ['tree-node'];
        if (completed) classes.push('completed');
        if (isCurrent) classes.push('current');
        if (locked) classes.push('locked');

        return `
            <div class="${classes.join(' ')}" 
                 data-series="${series}" 
                 data-major="${majorLevel || ''}" 
                 data-minor="${minorLevel || ''}">
                <span class="node-icon">${icon}</span>
                <span class="node-name">${name}</span>
                <span class="node-status">${statusText}</span>
            </div>
        `;
    }

    /**
     * 绑定节点点击事件
     */
    _bindNodeEvents() {
        // 绑定小级别点击事件（所有树状结构）
        document.querySelectorAll('.tree-node.sub-node').forEach(node => {
            node.addEventListener('click', () => {
                // 测试模式下忽略锁定状态
                if (!this.testMode && node.classList.contains('locked')) return;
                // 移除 completed 检查，允许重复挑战
                
                const series = node.dataset.series;
                const major = node.dataset.major || null;
                const minor = node.dataset.minor || null;
                
                // 直接使用当前点击的级别
                // 测试模式下跳过检查
                if (this.testMode) {
                    this._showExamModal(series, major, minor);
                    return;
                }
                
                const canStart = this.certSystem.canStartExam(series, major, minor);
                if (canStart.allowed) {
                    this._showExamModal(series, major, minor);
                } else {
                    this._showCooldownNotice(canStart.reason);
                }
            });
        });
        
        // 绑定所有主节点点击（总考）
        document.querySelectorAll('.tree-node.main-node').forEach(node => {
            node.addEventListener('click', () => {
                // 测试模式下忽略锁定和进行中状态
                if (!this.testMode) {
                    // 锁定状态不可点击
                    if (node.classList.contains('locked')) return;
                    // 进行中状态（小级别未全部通过）不可点击总考
                    if (node.classList.contains('in-progress')) return;
                }
                
                const series = node.dataset.series;
                const major = node.dataset.major || null;
                const minor = node.dataset.minor || 'finalExam';
                
                if (series) {
                    // 测试模式下跳过检查
                    if (this.testMode) {
                        this._showExamModal(series, major, minor);
                        return;
                    }
                    
                    const canStart = this.certSystem.canStartExam(series, major, minor);
                    if (canStart.allowed) {
                        this._showExamModal(series, major, minor);
                    } else {
                        this._showCooldownNotice(canStart.reason);
                    }
                }
            });
        });
    }
    
    /**
     * 生成节点的 hover 提示文本
     * @param {object} levelData - 级别数据
     * @param {boolean} isUnlocked - 是否解锁
     * @param {boolean} isInCooldown - 是否在冷却中
     * @param {string} cooldownText - 冷却剩余时间文本
     * @returns {string} tooltip 文本
     */
    _getNodeTooltip(levelData, isUnlocked, isInCooldown = false, cooldownText = '') {
        if (!isUnlocked) {
            return '🔒 完成前置级别后解锁';
        }
        
        if (isInCooldown && cooldownText) {
            return `⏳ 冷却中 ${cooldownText}`;
        }
        
        if (levelData?.passed) {
            const score = levelData.score || 0;
            const duration = levelData.bestDuration;
            if (duration !== null && duration !== undefined) {
                const mins = Math.floor(duration / 60);
                const secs = duration % 60;
                const timeStr = mins > 0 ? `${mins}m${secs}s` : `${secs}s`;
                return `✅ 最佳成绩: ${score}% · 用时: ${timeStr}\n点击重新挑战`;
            }
            return `✅ 最佳成绩: ${score}%\n点击重新挑战`;
        }
        
        if (levelData?.attempts > 0) {
            return `❌ 未通过 · 最高: ${levelData.score || 0}%`;
        }
        
        return '🔓 点击开始挑战';
    }
    
    /**
     * 格式化用时
     */
    _formatDuration(seconds) {
        if (seconds === null || seconds === undefined) return '';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return mins > 0 ? `${mins}m${secs}s` : `${secs}s`;
    }
    
    /**
     * 获取下一个可考的小级别
     */
    _getNextMinorLevel(series, majorLevel) {
        const progress = this.certSystem.getProgress();
        
        if (series === 'phonics') {
            // 音标系列：找第一个未通过的小级别
            // 注意：对于音标，majorLevel 就是小级别名称，minorLevel 为 null
            const levels = this.certSystem.levelConfig.phonics.order;
            for (const level of levels) {
                if (!progress.phonics.levels[level]?.passed) {
                    return { major: level, minor: null };
                }
            }
        } else if (series === 'primaryGrades') {
            // 年级系列：检查上下学期
            const gradeData = progress.primaryGrades[majorLevel];
            if (!gradeData?.term1?.passed) {
                return { major: majorLevel, minor: 'term1' };
            }
            if (!gradeData?.term2?.passed) {
                return { major: majorLevel, minor: 'term2' };
            }
        } else if (series === 'extracurricular' || series === 'academic') {
            // 课外阅读/升学系列
            const config = this.certSystem.levelConfig[series];
            const seriesData = progress[series];
            
            // 找到 majorLevel 或第一个未完成的
            const targetMajor = majorLevel || config.order.find(m => !seriesData[m]?.badge?.earned);
            if (targetMajor) {
                const levels = config.levels[targetMajor];
                for (const level of levels) {
                    if (!seriesData[targetMajor]?.[level]?.passed) {
                        return { major: targetMajor, minor: level };
                    }
                }
            }
        }
        
        return null;
    }
    
    /**
     * 显示冷却提示
     */
    _showCooldownNotice(message) {
        // 创建临时提示
        const notice = document.createElement('div');
        notice.className = 'cooldown-toast';
        notice.innerHTML = `<span>⏳</span> ${message}`;
        document.body.appendChild(notice);
        
        setTimeout(() => notice.classList.add('show'), 10);
        setTimeout(() => {
            notice.classList.remove('show');
            setTimeout(() => notice.remove(), 300);
        }, 2500);
    }


    /**
     * 开始考试
     */
    startExam(series, majorLevel, minorLevel) {
        // 将考试信息存储到 sessionStorage
        const examInfo = { series, majorLevel, minorLevel };
        sessionStorage.setItem('currentExam', JSON.stringify(examInfo));
        
        // 跳转到游戏页面进行考试
        let url = `index.html?mode=exam&series=${series}&major=${majorLevel || ''}&minor=${minorLevel || ''}`;
        
        // 测试模式下传递 test 参数
        if (this.testMode) {
            url += '&test=1';
        }
        
        window.location.href = url;
    }


    /**
     * 更新统计信息
     */
    updateStats() {
        const progress = this.certSystem.getProgress();
        const badges = this.certSystem.getEarnedBadges();
        
        // 已获徽章数
        document.getElementById('badgeCount').textContent = badges.length;
        
        // 已通过级别数
        let passedCount = 0;
        
        // 音标系列
        Object.values(progress.phonics.levels).forEach(l => {
            if (l.passed) passedCount++;
        });
        
        // 小学年级系列
        ['grade3', 'grade4', 'grade5', 'grade6'].forEach(grade => {
            if (progress.primaryGrades[grade]?.term1?.passed) passedCount++;
            if (progress.primaryGrades[grade]?.term2?.passed) passedCount++;
        });
        
        document.getElementById('levelsPassed').textContent = passedCount;
        
        // 考试次数
        let totalAttempts = 0;
        Object.values(progress.phonics.levels).forEach(l => {
            totalAttempts += l.attempts || 0;
        });
        ['grade3', 'grade4', 'grade5', 'grade6'].forEach(grade => {
            totalAttempts += progress.primaryGrades[grade]?.term1?.attempts || 0;
            totalAttempts += progress.primaryGrades[grade]?.term2?.attempts || 0;
        });
        
        document.getElementById('totalAttempts').textContent = totalAttempts;
    }
}

// 页面加载后初始化
document.addEventListener('DOMContentLoaded', function() {
    const page = new CertificationPage();
    page.init();
});


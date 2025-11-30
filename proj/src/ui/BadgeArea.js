/**
 * 主页徽章区组件
 * 显示已获得的徽章，或挑衅手势
 */

class BadgeArea {
    constructor() {
        this.certSystem = null;
        this.container = null;
        this.initialized = false;
    }

    /**
     * 初始化徽章区
     */
    init() {
        if (this.initialized) return;
        
        // 初始化考级系统
        if (typeof CertificationStorage !== 'undefined' && typeof CertificationSystem !== 'undefined') {
            this.certSystem = new CertificationSystem();
        } else {
            console.error('考级系统模块未加载');
            return;
        }
        
        // 创建容器
        this.container = document.createElement('div');
        this.container.className = 'badge-area';
        this.container.id = 'badgeArea';
        
        // 添加点击事件
        this.container.addEventListener('click', () => this.navigateToCertification());
        
        // 渲染内容
        this.render();
        
        // 插入到 game-header 内部最左边
        const gameHeader = document.querySelector('.game-header');
        if (gameHeader) {
            // 包装原有标题内容
            if (!gameHeader.querySelector('.header-content')) {
                const headerContent = document.createElement('div');
                headerContent.className = 'header-content';
                while (gameHeader.firstChild) {
                    headerContent.appendChild(gameHeader.firstChild);
                }
                gameHeader.appendChild(headerContent);
            }
            // 插入徽章区到最前面
            gameHeader.insertBefore(this.container, gameHeader.firstChild);
        } else {
            // 回退方案
            document.body.appendChild(this.container);
        }
        
        this.initialized = true;
    }

    /**
     * 渲染徽章区
     */
    render() {
        if (!this.container || !this.certSystem) return;
        
        const badges = this.certSystem.getEarnedBadges();
        
        if (badges.length === 0) {
            this.renderEmptyState();
        } else {
            this.renderBadges(badges);
        }
    }

    /**
     * 渲染无徽章状态（挑衅手势）
     */
    renderEmptyState() {
        this.container.innerHTML = `
            <div class="badge-area-container badge-area-empty">
                <div class="challenge-icon">👊</div>
                <div class="challenge-text">！！挑战！！</div>
                <div class="badge-area-hint">点击进入考级</div>
            </div>
        `;
    }

    /**
     * 渲染已获得的徽章
     */
    renderBadges(badges) {
        const badgeMap = {
            'phonics': 'phonics-badge.svg',
            'grade3': 'grade3-badge.svg',
            'grade4': 'grade4-badge.svg',
            'grade5': 'grade5-badge.svg',
            'grade6': 'grade6-badge.svg',
            'flyGuy': 'flyguy-badge.svg',
            'magicTreeHouse': 'treehouse-badge.svg',
            'dragonBall': 'dragonball-badge.svg',
            'harryPotter': 'harrypotter-badge.svg',
            'middleSchool': 'middle-badge.svg',
            'highSchool': 'high-badge.svg',
            'cet4': 'cet4-badge.svg'
        };

        const maxDisplay = 5; // 最多显示5个徽章缩略图
        const displayBadges = badges.slice(0, maxDisplay);
        const remaining = badges.length - maxDisplay;

        let thumbnailsHtml = displayBadges.map(badge => {
            const svgFile = badgeMap[badge.id] || 'phonics-badge.svg';
            return `<img class="badge-thumbnail" src="assets/badges/${svgFile}" alt="${badge.name}" title="${badge.name}">`;
        }).join('');

        this.container.innerHTML = `
            <div class="badge-area-container badge-area-earned">
                <div class="badge-thumbnails">
                    ${thumbnailsHtml}
                </div>
                <div class="badge-count-text">
                    ${badges.length} 枚徽章${remaining > 0 ? ` (+${remaining})` : ''}
                </div>
                <div class="badge-area-hint">点击查看全部</div>
            </div>
        `;
    }

    /**
     * 跳转到考级页面
     */
    navigateToCertification() {
        window.location.href = 'certification.html';
    }

    /**
     * 刷新徽章区显示
     */
    refresh() {
        if (this.certSystem) {
            // 重新加载进度
            this.certSystem.progress = this.certSystem.storage.load();
            this.render();
        }
    }

    /**
     * 显示徽章获得动画
     */
    showBadgeEarnedAnimation(badgeInfo) {
        // 创建全屏遮罩
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            animation: fadeIn 0.3s ease;
        `;

        const badgeMap = {
            'phonics': 'phonics-badge.svg',
            'grade3': 'grade3-badge.svg',
            'grade4': 'grade4-badge.svg',
            'grade5': 'grade5-badge.svg',
            'grade6': 'grade6-badge.svg',
            'flyGuy': 'flyguy-badge.svg',
            'magicTreeHouse': 'treehouse-badge.svg',
            'dragonBall': 'dragonball-badge.svg',
            'harryPotter': 'harrypotter-badge.svg',
            'middleSchool': 'middle-badge.svg',
            'highSchool': 'high-badge.svg',
            'cet4': 'cet4-badge.svg'
        };

        const svgFile = badgeMap[badgeInfo.id] || 'phonics-badge.svg';

        overlay.innerHTML = `
            <div style="text-align: center;">
                <h2 style="color: #ffd700; font-size: 28px; margin-bottom: 20px; text-shadow: 0 0 20px rgba(255, 215, 0, 0.5);">
                    🎉 恭喜获得徽章！
                </h2>
                <img src="assets/badges/${svgFile}" alt="${badgeInfo.name}" 
                     style="width: 150px; height: auto;" class="badge-unlocking">
                <h3 style="color: #c9a227; font-size: 24px; margin-top: 20px;">
                    ${badgeInfo.name}
                </h3>
                <button id="closeBadgeModal" style="
                    margin-top: 30px;
                    padding: 12px 30px;
                    font-size: 16px;
                    background: linear-gradient(135deg, #c9a227, #ffd700);
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    color: #1a1a2e;
                    font-weight: bold;
                    transition: transform 0.2s ease;
                ">继续</button>
            </div>
        `;

        document.body.appendChild(overlay);

        // 点击关闭
        overlay.querySelector('#closeBadgeModal').addEventListener('click', () => {
            overlay.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => overlay.remove(), 300);
            this.refresh();
        });
    }
}

// 添加淡入淡出动画
const badgeAreaStyles = document.createElement('style');
badgeAreaStyles.textContent = `
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
    }
`;
document.head.appendChild(badgeAreaStyles);

// 导出单例
window.BadgeArea = BadgeArea;

// 页面加载后自动初始化
document.addEventListener('DOMContentLoaded', function() {
    // 延迟初始化，确保其他模块已加载
    setTimeout(() => {
        if (typeof CertificationStorage !== 'undefined' && typeof CertificationSystem !== 'undefined') {
            window.badgeArea = new BadgeArea();
            window.badgeArea.init();
        }
    }, 100);
});


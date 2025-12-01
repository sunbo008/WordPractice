/**
 * 主游戏界面段位显示组件
 * 在 header 右侧显示当前最高段位徽章
 */

class TierDisplay {
    constructor() {
        this.certSystem = null;
        this.container = null;
        this.initialized = false;
        
        // 段位配置
        this.tierConfig = {
            bronze: {
                name: '青铜',
                icon: '🥉',
                color: '#CD7F32',
                file: 'tier-bronze-badge.svg'
            },
            silver: {
                name: '白银',
                icon: '🥈',
                color: '#C0C0C0',
                file: 'tier-silver-badge.svg'
            },
            gold: {
                name: '黄金',
                icon: '🥇',
                color: '#FFD700',
                file: 'tier-gold-badge.svg'
            },
            king: {
                name: '王者',
                icon: '👑',
                color: '#9B30FF',
                file: 'tier-king-badge.svg'
            }
        };
    }

    /**
     * 初始化段位显示区
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
        this.container.className = 'tier-display';
        this.container.id = 'tierDisplay';
        
        // 渲染内容
        this.render();
        
        // 插入到 game-header 内部最右边
        const gameHeader = document.querySelector('.game-header');
        if (gameHeader) {
            gameHeader.appendChild(this.container);
        }
        
        this.initialized = true;
    }

    /**
     * 渲染段位显示区
     */
    render() {
        if (!this.container || !this.certSystem) return;
        
        const highestTier = this.certSystem.getHighestTier();
        
        if (highestTier) {
            this.renderTierBadge(highestTier);
        } else {
            this.renderEmptyState();
        }
    }

    /**
     * 渲染无段位状态（显示灰色青铜徽章）
     */
    renderEmptyState() {
        const bronzeConfig = this.tierConfig.bronze;
        this.container.innerHTML = `
            <div class="tier-display-container tier-display-empty">
                <div class="tier-badge-display">
                    <img src="assets/badges/tier-bronze-badge-gray.svg" alt="未解锁段位" class="tier-badge-img locked">
                </div>
            </div>
        `;
    }

    /**
     * 渲染已获得的段位徽章
     */
    renderTierBadge(tierInfo) {
        const config = this.tierConfig[tierInfo.tier];
        this.container.innerHTML = `
            <div class="tier-display-container tier-display-earned" style="--tier-color: ${config.color}">
                <div class="tier-badge-display">
                    <img src="assets/badges/${config.file}" alt="${config.name}段位" class="tier-badge-img">
                </div>
            </div>
        `;
    }

    /**
     * 刷新段位显示
     */
    refresh() {
        if (this.certSystem) {
            // 重新加载进度
            this.certSystem.progress = this.certSystem.storage.load();
            this.render();
        }
    }
}

// 导出单例
window.TierDisplay = TierDisplay;

// 页面加载后自动初始化
document.addEventListener('DOMContentLoaded', function() {
    // 延迟初始化，确保其他模块已加载
    setTimeout(() => {
        if (typeof CertificationStorage !== 'undefined' && typeof CertificationSystem !== 'undefined') {
            window.tierDisplay = new TierDisplay();
            window.tierDisplay.init();
        }
    }, 100);
});


// 游戏设置集成脚本
document.addEventListener('DOMContentLoaded', () => {
    // 添加设置按钮事件监听器
    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            // 直接跳转到设置页面（清除缓存影响）
            const timestamp = Date.now();
            window.location.href = `./settings.html?t=${timestamp}`;
        });
        console.log('✅ 设置按钮事件已绑定');
    } else {
        console.warn('⚠️ 未找到设置按钮');
    }
    
    // 添加其他按钮事件（如果需要）
    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const resetBtn = document.getElementById('resetBtn');
    const toggleSpeechBtn = document.getElementById('toggleSpeechBtn');
    
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            if (window.game) {
                window.game.startGame();
            }
        });
    }
    
    if (pauseBtn) {
        pauseBtn.addEventListener('click', () => {
            if (window.game) {
                window.game.pauseGame();
            }
        });
    }
    
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (window.game) {
                window.game.resetGame(true); // 自动开始
            }
        });
    }
    
    if (toggleSpeechBtn) {
        toggleSpeechBtn.addEventListener('click', () => {
            if (window.game) {
                window.game.toggleSpeech();
            }
        });
    }
});

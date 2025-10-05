// 速度调试工具
// 在游戏页面的控制台中运行此脚本来监控速度

function debugSpeed() {
    if (typeof window.game === 'undefined') {
        console.log('❌ 游戏实例未找到，请先启动游戏');
        return;
    }
    
    const game = window.game;
    
    console.log('🎮 当前游戏速度信息：');
    console.log('─'.repeat(50));
    console.log(`等级: ${game.level}`);
    console.log(`基础速度: ${game.baseSpeed} 像素/帧`);
    console.log(`速度倍数: ${game.speedMultiplier}`);
    console.log(`当前速度: ${game.wordSpeed} 像素/帧`);
    
    // 计算理论速度
    const theoreticalMultiplier = 1.0 + (game.level - 1) * 0.05;
    const theoreticalSpeed = game.baseSpeed * theoreticalMultiplier;
    
    console.log(`理论倍数: ${theoreticalMultiplier.toFixed(3)}`);
    console.log(`理论速度: ${theoreticalSpeed.toFixed(6)} 像素/帧`);
    
    // 检查是否匹配
    const speedMatch = Math.abs(game.wordSpeed - theoreticalSpeed) < 0.000001;
    const multiplierMatch = Math.abs(game.speedMultiplier - theoreticalMultiplier) < 0.001;
    
    console.log('─'.repeat(50));
    console.log(`速度匹配: ${speedMatch ? '✅' : '❌'}`);
    console.log(`倍数匹配: ${multiplierMatch ? '✅' : '❌'}`);
    
    if (!speedMatch || !multiplierMatch) {
        console.log('⚠️ 速度计算可能有问题！');
    } else {
        console.log('✅ 速度计算正确！');
    }
    
    // 显示帧数信息
    const framesPerPixel = 1 / game.wordSpeed;
    console.log(`帧数/像素: ${framesPerPixel.toFixed(2)} 帧`);
    
    return {
        level: game.level,
        baseSpeed: game.baseSpeed,
        speedMultiplier: game.speedMultiplier,
        wordSpeed: game.wordSpeed,
        theoreticalSpeed: theoreticalSpeed,
        framesPerPixel: framesPerPixel,
        isCorrect: speedMatch && multiplierMatch
    };
}

function monitorSpeed() {
    if (typeof window.game === 'undefined') {
        console.log('❌ 游戏实例未找到');
        return;
    }
    
    console.log('🔍 开始监控速度变化...');
    
    let lastLevel = window.game.level;
    let lastSpeed = window.game.wordSpeed;
    
    const monitor = setInterval(() => {
        const game = window.game;
        
        if (game.level !== lastLevel) {
            console.log(`📈 等级变化: ${lastLevel} → ${game.level}`);
            console.log(`📈 速度变化: ${lastSpeed.toFixed(6)} → ${game.wordSpeed.toFixed(6)}`);
            console.log(`📈 速度倍数: ${game.speedMultiplier.toFixed(3)}`);
            
            // 验证速度增加是否正确
            const expectedMultiplier = 1.0 + (game.level - 1) * 0.05;
            const expectedSpeed = game.baseSpeed * expectedMultiplier;
            
            if (Math.abs(game.wordSpeed - expectedSpeed) < 0.000001) {
                console.log('✅ 速度增加正确！');
            } else {
                console.log('❌ 速度增加错误！');
                console.log(`   期望速度: ${expectedSpeed.toFixed(6)}`);
                console.log(`   实际速度: ${game.wordSpeed.toFixed(6)}`);
            }
            
            lastLevel = game.level;
            lastSpeed = game.wordSpeed;
        }
    }, 1000);
    
    // 10分钟后停止监控
    setTimeout(() => {
        clearInterval(monitor);
        console.log('🔍 速度监控已停止');
    }, 600000);
    
    return monitor;
}

function testSpeedCalculation() {
    console.log('🧮 速度计算测试：');
    console.log('─'.repeat(60));
    console.log('等级 | 倍数   | 速度(像素/帧) | 帧数/像素 | 设计要求');
    console.log('─'.repeat(60));
    
    const baseSpeed = 1/3;
    
    for (let level = 1; level <= 10; level++) {
        const multiplier = 1.0 + (level - 1) * 0.05;
        const speed = baseSpeed * multiplier;
        const framesPerPixel = 1 / speed;
        
        let designNote = '';
        if (level === 1) designNote = '基础速度(3帧1像素)';
        else if (level === 2) designNote = '+5%速度(约2.85帧1像素)';
        else if (level === 3) designNote = '+10%速度(约2.7帧1像素)';
        else if (level === 4) designNote = '+15%速度(约2.55帧1像素)';
        else designNote = `+${(level-1)*5}%速度`;
        
        console.log(`${level.toString().padStart(2)} 级 | ${multiplier.toFixed(3)} | ${speed.toFixed(6).padStart(11)} | ${framesPerPixel.toFixed(2).padStart(7)} | ${designNote}`);
    }
}

// 自动运行函数
if (typeof window !== 'undefined') {
    window.debugSpeed = debugSpeed;
    window.monitorSpeed = monitorSpeed;
    window.testSpeedCalculation = testSpeedCalculation;
    
    console.log('🛠️ 速度调试工具已加载！');
    console.log('使用方法：');
    console.log('  debugSpeed() - 检查当前速度');
    console.log('  monitorSpeed() - 监控速度变化');
    console.log('  testSpeedCalculation() - 显示速度计算表');
}

// 游戏渲染引擎
// 负责所有画布渲染操作，包括背景、缓冲区、单词绘制、UI 信息显示
class GameRenderer {
    constructor(ctx, game) {
        this.ctx = ctx;
        this.game = game; // 访问游戏状态
    }
    
    render() {
        // 清空画布
        this.ctx.clearRect(0, 0, this.game.canvasWidth, this.game.canvasHeight);
        
        // 绘制背景（统一深蓝底色）
        this.drawBackground();
        
        // 绘制缓冲区
        this.drawBufferZone();
        
        // 绘制堆叠单词
        this.drawStackedWords();
        
        // 绘制炮管系统（炮管、炮弹、基座覆盖层）
        this.game.cannonSystem.render();
        
        // 绘制下降单词
        this.drawFallingWords();
        
        // 绘制爆炸效果
        this.game.drawExplosions();
        
        // 绘制炮口火花
        this.game.drawMuzzleFlashes();
        
        // 绘制中文翻译爆炸动画（在粒子之上）
        this.game.drawMeaningExplosions();
        
        // 绘制错误标记
        this.game.drawErrorMarks();
        
        // 绘制UI元素
        this.drawGameInfo();
    }

    drawBackground() {
        // 主区域统一深蓝底色，避免上下色差
        this.ctx.fillStyle = '#0e1f3d';
        this.ctx.fillRect(0, 0, this.game.canvasWidth, this.game.canvasHeight);
        
        // 缓冲区背景
        this.ctx.fillStyle = 'rgba(255, 215, 0, 0.1)';
        this.ctx.fillRect(0, 0, this.game.canvasWidth, this.game.bufferHeight);
        
        // 分界线
        this.ctx.strokeStyle = '#ffd700';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.game.bufferHeight);
        this.ctx.lineTo(this.game.canvasWidth, this.game.bufferHeight);
        this.ctx.stroke();
    }

    drawBufferZone() {
        // 绘制缓冲区标题
        this.ctx.fillStyle = '#ffd700';
        this.ctx.font = '16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('单词准备区', this.game.canvasWidth / 2, 25);
        
        // 绘制下一个单词
        if (this.game.nextWord && this.game.bufferState === 'countdown') {
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '28px Arial';  // 从24px增加到28px
            this.ctx.fillText(this.game.nextWord.display, this.game.canvasWidth / 2, 55);
        }
    }

    drawFallingWords() {
        this.game.fallingWords.forEach(word => {
            // 单词背景
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            this.ctx.fillRect(word.x - word.width/2, word.y, word.width, word.height);
            
            // 单词边框 - 根据输入正确性改变颜色
            if (word.inputCorrect === false) {
                this.ctx.strokeStyle = '#ff4444'; // 错误输入红色
            } else if (word.inputCorrect === true) {
                this.ctx.strokeStyle = '#44ff44'; // 正确输入绿色
            } else {
                this.ctx.strokeStyle = '#ffd700'; // 默认金色
            }
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(word.x - word.width/2, word.y, word.width, word.height);
            
            // 显示单词文本 - 使用实时显示或原始显示
            const displayText = word.realTimeDisplay || word.display;
            this.drawWordWithHighlight(displayText, word.x, word.y + 25, word);
        });
    }

    drawWordWithHighlight(text, x, y, word) {
        this.ctx.font = '32px Arial';  // 从20px增加到32px，更醒目
        this.ctx.textAlign = 'center';
        
        // 获取重音音节位置
        const stressPositions = word.stressPositions || [];
        
        // 如果有实时显示，需要特殊处理高亮
        if (word.realTimeDisplay) {
            // 解析带有[]的文本
            const parts = text.split(/(\[[^\]]*\])/);
            let currentX = x - (this.ctx.measureText(text.replace(/[\[\]]/g, '')).width / 2);
            let charIndex = 0; // 跟踪原始单词中的字符位置
            
            parts.forEach(part => {
                if (part.startsWith('[') && part.endsWith(']')) {
                    // 输入的字母，绿色或红色高亮
                    const letter = part.slice(1, -1);
                    this.ctx.fillStyle = word.inputCorrect ? '#44ff44' : '#ff4444';
                    this.ctx.fillText(letter, currentX + this.ctx.measureText(letter).width/2, y);
                    currentX += this.ctx.measureText(letter).width;
                    charIndex++;
                } else {
                    // 普通字母或下划线 - 需要考虑重音音节
                    this.drawTextWithStress(part, currentX, y, charIndex, stressPositions, false);
                    currentX += this.ctx.measureText(part).width;
                    charIndex += part.length;
                }
            });
        } else {
            // 普通显示 - 处理下划线和重音
            this.drawTextWithStress(text, x, y, 0, stressPositions, true);
        }
    }
    
    // 绘制带有重音高亮和自定义下划线的文本
    drawTextWithStress(text, x, y, startCharIndex, stressPositions, centered = false) {
        if (centered) {
            // 居中显示
            const totalWidth = this.measureTextWithCustomUnderlines(text);
            let currentX = x - totalWidth / 2;
            
            for (let i = 0; i < text.length; i++) {
                const char = text[i];
                const charIndex = startCharIndex + i;
                
                if (char === '_') {
                    this.drawCustomUnderscore(currentX, y);
                    currentX += this.getCustomUnderscoreWidth();
                } else {
                    // 检查是否是重音音节的字母
                    if (stressPositions.includes(charIndex)) {
                        this.ctx.fillStyle = '#ff4444'; // 重音音节用红色
                    } else {
                        this.ctx.fillStyle = '#ffffff'; // 普通字母用白色
                    }
                    this.ctx.fillText(char, currentX + this.ctx.measureText(char).width/2, y);
                    currentX += this.ctx.measureText(char).width;
                }
            }
        } else {
            // 左对齐显示
            let currentX = x;
            
            for (let i = 0; i < text.length; i++) {
                const char = text[i];
                const charIndex = startCharIndex + i;
                
                if (char === '_') {
                    this.drawCustomUnderscore(currentX, y);
                    currentX += this.getCustomUnderscoreWidth();
                } else {
                    // 检查是否是重音音节的字母
                    if (stressPositions.includes(charIndex)) {
                        this.ctx.fillStyle = '#ff4444'; // 重音音节用红色
                    } else {
                        this.ctx.fillStyle = '#ffffff'; // 普通字母用白色
                    }
                    this.ctx.fillText(char, currentX + this.ctx.measureText(char).width/2, y);
                    currentX += this.ctx.measureText(char).width;
                }
            }
        }
    }
    
    // 绘制带有自定义下划线的文本（保留向后兼容）
    drawTextWithCustomUnderlines(text, x, y, centered = false) {
        // 调用新的带重音的方法，但不传递重音位置
        this.drawTextWithStress(text, x, y, 0, [], centered);
    }
    
    // 绘制自定义下划线（缩短4像素）
    drawCustomUnderscore(x, y) {
        const underscoreWidth = this.ctx.measureText('_').width;
        const customWidth = underscoreWidth - 4; // 缩短4像素
        const startX = x + 2; // 左右各缩短2像素
        
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(startX, y + 5); // 下划线位置
        this.ctx.lineTo(startX + customWidth, y + 5);
        this.ctx.stroke();
    }
    
    // 获取自定义下划线的宽度
    getCustomUnderscoreWidth() {
        return this.ctx.measureText('_').width; // 保持原始字符宽度，只是绘制时缩短
    }
    
    // 测量包含自定义下划线的文本宽度
    measureTextWithCustomUnderlines(text) {
        let totalWidth = 0;
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            if (char === '_') {
                totalWidth += this.getCustomUnderscoreWidth();
            } else {
                totalWidth += this.ctx.measureText(char).width;
            }
        }
        return totalWidth;
    }

    drawStackedWords() {
        // 按设计方案显示堆叠单词：每行多个单词，从底部向上堆叠
        const wordsPerRow = 5; // 每行5个单词
        const wordWidth = 110;  // 调整为110px，确保5个单词能放下
        const wordHeight = 50;  // 保持50px高度
        const padding = 5;      // 减小边距
        
        // 添加调试信息：只在堆叠区数量变化时输出
        if (this.game.stackedWords.length > 0 && this.game._lastStackedWordsCount !== this.game.stackedWords.length) {
            this.game._lastStackedWordsCount = this.game.stackedWords.length;
            debugLog.info(`🎨 渲染堆叠区: ${this.game.stackedWords.length}个单词 [${this.game.stackedWords.map(w => w.original).join(', ')}]`);
        }
        
        this.game.stackedWords.forEach((word, index) => {
            // 验证单词对象
            if (!word) {
                debugLog.error(`❌ 堆叠区发现空对象，索引: ${index}`);
                return;
            }
            
            if (!word.original) {
                debugLog.error(`❌ 堆叠区单词缺少original属性，索引: ${index}`);
                debugLog.error(`   完整对象: ${JSON.stringify(word, null, 2)}`);
                return;
            }
            
            const row = Math.floor(index / wordsPerRow);
            const col = index % wordsPerRow;
            const x = padding + col * (wordWidth + 5);
            const y = this.game.canvasHeight - wordHeight - row * (wordHeight + 2);
            
            // 单词背景 - 根据类型显示不同颜色
            if (word.giveUp) {
                // 放弃的单词 - 深灰色
                this.ctx.fillStyle = 'rgba(96, 96, 96, 0.9)';
                this.ctx.strokeStyle = '#555555';
            } else {
                // 失败的单词 - 浅灰色
                this.ctx.fillStyle = 'rgba(128, 128, 128, 0.9)';
                this.ctx.strokeStyle = '#666666';
            }
            this.ctx.fillRect(x, y, wordWidth, wordHeight);
            
            // 单词边框
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(x, y, wordWidth, wordHeight);
            
            // 单词文本 - 字体放大一倍
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '28px Arial';  // 放大一倍：14px -> 28px
            this.ctx.textAlign = 'center';
            this.ctx.fillText(word.original, x + wordWidth/2, y + wordHeight/2 + 10);
            
            // 显示中文意思（小字）- 字体放大一倍
            this.ctx.fillStyle = '#87CEEB';  // 淡蓝色 (Sky Blue)
            this.ctx.font = '20px Arial';  // 放大一倍：10px -> 20px
            this.ctx.fillText(word.meaning || '', x + wordWidth/2, y + wordHeight - 6);
        });
    }

    drawGameInfo() {
        // 绘制游戏状态信息
        if (this.game.gameState === 'paused') {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.game.canvasWidth, this.game.canvasHeight);
            
            this.ctx.fillStyle = '#ffd700';
            this.ctx.font = '48px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('游戏暂停', this.game.canvasWidth / 2, this.game.canvasHeight / 2);
        }
    }

    // 绘制圆角矩形（工具方法）
    drawRoundedRect(x, y, width, height, radius) {
        this.ctx.beginPath();
        this.ctx.moveTo(x + radius, y);
        this.ctx.lineTo(x + width - radius, y);
        this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        this.ctx.lineTo(x + width, y + height - radius);
        this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        this.ctx.lineTo(x + radius, y + height);
        this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        this.ctx.lineTo(x, y + radius);
        this.ctx.quadraticCurveTo(x, y, x + radius, y);
        this.ctx.closePath();
    }
}


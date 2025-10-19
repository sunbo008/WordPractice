// 爆炸特效系统
// 管理所有爆炸效果、炮口火花、中文翻译动画和错误标记
class ExplosionSystem {
    constructor(ctx, game) {
        this.ctx = ctx;
        this.game = game;
        
        // 爆炸效果数组
        this.explosions = [];
        this.muzzleFlashes = [];
        this.meaningExplosions = [];
        
        // 错误标记数组
        this.errorMarks = [];
    }
    
    // ==================== 创建方法 ====================
    
    createExplosion(x, y, wordLength) {
        // 创建多彩粒子爆炸
        const particleCount = Math.min(50, wordLength * 8);
        const particles = [];
        
        const colors = [
            { r: 255, g: 69, b: 0 },   // 橙红色
            { r: 255, g: 215, b: 0 },  // 金色
            { r: 255, g: 0, b: 0 },    // 红色
            { r: 255, g: 165, b: 0 },  // 橙色
            { r: 255, g: 255, b: 0 },  // 黄色
            { r: 0, g: 255, b: 127 }   // 绿色
        ];
        
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount;
            const speed = 2 + Math.random() * 4;
            const color = colors[Math.floor(Math.random() * colors.length)];
            
            particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 2 + Math.random() * 3,
                life: 1,
                maxLife: 1,
                decay: 0.02 + Math.random() * 0.02,
                color: color
            });
        }
        
        this.explosions.push({
            particles: particles,
            life: 1
        });
    }

    createMuzzleFlash(x, y, angle) {
        // 创建炮口火花粒子（沿着炮管方向喷射）
        const particleCount = 20; // 火花数量
        const particles = [];
        
        // 火花颜色：橙色、黄色、白色
        const colors = [
            { r: 255, g: 140, b: 0 },   // 橙色
            { r: 255, g: 215, b: 0 },   // 金色
            { r: 255, g: 255, b: 200 }, // 淡黄白色
            { r: 255, g: 69, b: 0 },    // 橙红色
            { r: 255, g: 255, b: 255 }  // 白色
        ];
        
        for (let i = 0; i < particleCount; i++) {
            // 在炮管方向的锥形范围内随机发射（扩散角度±30度）
            const spreadAngle = (Math.random() - 0.5) * Math.PI / 3; // ±30度
            const particleAngle = angle + spreadAngle;
            
            const speed = 3 + Math.random() * 5; // 速度3-8
            const color = colors[Math.floor(Math.random() * colors.length)];
            
            particles.push({
                x: x,
                y: y,
                vx: Math.sin(particleAngle) * speed,
                vy: -Math.cos(particleAngle) * speed,
                size: 2 + Math.random() * 3,
                life: 1,
                maxLife: 1,
                decay: 0.05 + Math.random() * 0.05, // 快速衰减（0.05-0.1）
                color: color
            });
        }
        
        this.muzzleFlashes.push({
            particles: particles,
            life: 1
        });
    }

    createMeaningExplosion(x, y, meaning, englishWord) {
        // 创建中文翻译爆炸动画
        const meaningExplosion = {
            x: x,
            y: y,
            meaning: meaning || '未知',
            englishWord: englishWord || '',
            scale: 0.5,        // 从0.5倍开始
            targetScale: 2.5,  // 放大到2.5倍
            life: 1,           // 生命周期（1秒）
            maxLife: 1,
            phase: 'growing',  // growing（放大阶段）-> showing（显示阶段）-> fading（淡出阶段）
            displayTime: 0,    // 显示时间计数
            alpha: 0           // 透明度
        };
        
        this.meaningExplosions.push(meaningExplosion);
    }

    showErrorMark(word, errorIndex) {
        // 计算错误字母的位置
        const missingIndex = word.missing[errorIndex];
        const letterWidth = this.ctx.measureText('A').width;
        const wordX = word.x;
        const wordY = word.y;
        
        // 计算错误字母在单词中的x位置
        let xOffset = 0;
        for (let i = 0; i < missingIndex; i++) {
            xOffset += this.ctx.measureText(word.original[i]).width;
        }
        
        // 创建错误标记
        const errorMark = {
            x: wordX + xOffset,
            y: wordY + word.height / 2,
            life: 1,
            maxLife: 1,
            decay: 0.05,
            size: 20
        };
        
        this.errorMarks.push(errorMark);
        
        // 重置连击和完美等级
        this.game.combo = 0;
        this.game.perfectLevel = false;
    }
    
    // ==================== 更新方法 ====================
    
    update() {
        this.updateExplosions();
        this.updateMuzzleFlashes();
        this.updateMeaningExplosions();
        this.updateErrorMarks();
    }

    updateExplosions() {
        for (let i = this.explosions.length - 1; i >= 0; i--) {
            const explosion = this.explosions[i];
            let allDead = true;
            
            explosion.particles.forEach(particle => {
                if (particle.life > 0) {
                    allDead = false;
                    particle.x += particle.vx;
                    particle.y += particle.vy;
                    particle.vy += 0.1; // 重力
                    particle.life -= particle.decay;
                }
            });
            
            if (allDead) {
                this.explosions.splice(i, 1);
            }
        }
    }

    updateMuzzleFlashes() {
        for (let i = this.muzzleFlashes.length - 1; i >= 0; i--) {
            const flash = this.muzzleFlashes[i];
            let allDead = true;
            
            flash.particles.forEach(particle => {
                if (particle.life > 0) {
                    allDead = false;
                    particle.x += particle.vx;
                    particle.y += particle.vy;
                    particle.vy += 0.2; // 轻微重力
                    particle.life -= particle.decay;
                }
            });
            
            if (allDead) {
                this.muzzleFlashes.splice(i, 1);
            }
        }
    }

    updateMeaningExplosions() {
        for (let i = this.meaningExplosions.length - 1; i >= 0; i--) {
            const explosion = this.meaningExplosions[i];
            
            if (explosion.phase === 'growing') {
                // 放大阶段（0.3秒）
                explosion.scale += (explosion.targetScale - 0.5) * 0.15;
                explosion.alpha += 0.1;
                
                if (explosion.scale >= explosion.targetScale * 0.95) {
                    explosion.phase = 'showing';
                    explosion.alpha = 1;
                }
            } else if (explosion.phase === 'showing') {
                // 显示阶段（1秒）
                explosion.displayTime += 1/60; // 假设60fps
                
                if (explosion.displayTime >= 1.0) {
                    explosion.phase = 'fading';
                }
            } else if (explosion.phase === 'fading') {
                // 淡出阶段（0.5秒）
                explosion.alpha -= 0.04;
                explosion.scale += 0.05; // 继续轻微放大
                
                if (explosion.alpha <= 0) {
                    this.meaningExplosions.splice(i, 1);
                }
            }
        }
    }

    updateErrorMarks() {
        for (let i = this.errorMarks.length - 1; i >= 0; i--) {
            const mark = this.errorMarks[i];
            mark.life -= mark.decay;
            
            if (mark.life <= 0) {
                this.errorMarks.splice(i, 1);
            }
        }
    }
    
    // ==================== 渲染方法 ====================
    
    render() {
        this.drawExplosions();
        this.drawMuzzleFlashes();
        this.drawMeaningExplosions();
        this.drawErrorMarks();
    }

    drawExplosions() {
        this.explosions.forEach(explosion => {
            explosion.particles.forEach(particle => {
                if (particle.life > 0) {
                    const alpha = particle.life / particle.maxLife;
                    this.ctx.fillStyle = `rgba(${particle.color.r}, ${particle.color.g}, ${particle.color.b}, ${alpha})`;
                    this.ctx.beginPath();
                    this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                    this.ctx.fill();
                }
            });
        });
    }

    drawMuzzleFlashes() {
        this.muzzleFlashes.forEach(flash => {
            flash.particles.forEach(particle => {
                if (particle.life > 0) {
                    const alpha = particle.life / particle.maxLife;
                    // 火花带光晕效果
                    this.ctx.save();
                    
                    // 外层光晕
                    const gradient = this.ctx.createRadialGradient(
                        particle.x, particle.y, 0,
                        particle.x, particle.y, particle.size * 2
                    );
                    gradient.addColorStop(0, `rgba(${particle.color.r}, ${particle.color.g}, ${particle.color.b}, ${alpha})`);
                    gradient.addColorStop(0.5, `rgba(${particle.color.r}, ${particle.color.g}, ${particle.color.b}, ${alpha * 0.5})`);
                    gradient.addColorStop(1, `rgba(${particle.color.r}, ${particle.color.g}, ${particle.color.b}, 0)`);
                    
                    this.ctx.fillStyle = gradient;
                    this.ctx.beginPath();
                    this.ctx.arc(particle.x, particle.y, particle.size * 2, 0, Math.PI * 2);
                    this.ctx.fill();
                    
                    // 核心亮点
                    this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
                    this.ctx.beginPath();
                    this.ctx.arc(particle.x, particle.y, particle.size * 0.5, 0, Math.PI * 2);
                    this.ctx.fill();
                    
                    this.ctx.restore();
                }
            });
        });
    }

    drawMeaningExplosions() {
        this.meaningExplosions.forEach(explosion => {
            if (explosion.alpha > 0) {
                this.ctx.save();
                
                // 移动到爆炸位置
                this.ctx.translate(explosion.x, explosion.y);
                
                // 设置字体和样式
                const fontSize = 24 * explosion.scale;
                this.ctx.font = `bold ${fontSize}px "Microsoft YaHei", "PingFang SC", "Hiragino Sans GB", sans-serif`;
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                
                // 绘制中文翻译（带描边和发光效果）
                // 外层发光
                this.ctx.shadowColor = 'rgba(255, 215, 0, 0.8)';
                this.ctx.shadowBlur = 20 * explosion.scale;
                
                // 描边
                this.ctx.strokeStyle = `rgba(255, 165, 0, ${explosion.alpha})`;
                this.ctx.lineWidth = 3 * explosion.scale;
                this.ctx.strokeText(explosion.meaning, 0, 0);
                
                // 填充
                const gradient = this.ctx.createLinearGradient(0, -fontSize/2, 0, fontSize/2);
                gradient.addColorStop(0, `rgba(255, 255, 100, ${explosion.alpha})`);
                gradient.addColorStop(0.5, `rgba(255, 215, 0, ${explosion.alpha})`);
                gradient.addColorStop(1, `rgba(255, 165, 0, ${explosion.alpha})`);
                this.ctx.fillStyle = gradient;
                this.ctx.fillText(explosion.meaning, 0, 0);
                
                // 绘制英文单词（小字，在中文下方）
                if (explosion.scale >= 1.5) {
                    const englishFontSize = 12 * explosion.scale * 0.6;
                    this.ctx.font = `${englishFontSize}px Arial`;
                    this.ctx.fillStyle = `rgba(200, 200, 200, ${explosion.alpha * 0.8})`;
                    this.ctx.shadowBlur = 5;
                    this.ctx.fillText(explosion.englishWord, 0, fontSize * 0.6);
                }
                
                this.ctx.restore();
            }
        });
    }

    drawErrorMarks() {
        this.errorMarks.forEach(mark => {
            if (mark.life > 0) {
                const alpha = mark.life;
                
                // 绘制血色红叉
                this.ctx.save();
                this.ctx.strokeStyle = `rgba(255, 0, 0, ${alpha})`;
                this.ctx.lineWidth = 3;
                this.ctx.lineCap = 'round';
                
                const halfSize = mark.size / 2;
                
                // X形状
                this.ctx.beginPath();
                this.ctx.moveTo(mark.x - halfSize, mark.y - halfSize);
                this.ctx.lineTo(mark.x + halfSize, mark.y + halfSize);
                this.ctx.stroke();
                
                this.ctx.beginPath();
                this.ctx.moveTo(mark.x + halfSize, mark.y - halfSize);
                this.ctx.lineTo(mark.x - halfSize, mark.y + halfSize);
                this.ctx.stroke();
                
                // 闪烁效果
                if (Math.floor(mark.life * 10) % 2 === 0) {
                    this.ctx.strokeStyle = `rgba(139, 0, 0, ${alpha})`;
                    this.ctx.lineWidth = 5;
                    
                    this.ctx.beginPath();
                    this.ctx.moveTo(mark.x - halfSize, mark.y - halfSize);
                    this.ctx.lineTo(mark.x + halfSize, mark.y + halfSize);
                    this.ctx.stroke();
                    
                    this.ctx.beginPath();
                    this.ctx.moveTo(mark.x + halfSize, mark.y - halfSize);
                    this.ctx.lineTo(mark.x - halfSize, mark.y + halfSize);
                    this.ctx.stroke();
                }
                
                this.ctx.restore();
            }
        });
    }
    
    // ==================== 工具方法 ====================
    
    clearInputWithAnimation() {
        const inputElement = document.getElementById('letterInput');
        
        // 添加淡出动画
        inputElement.style.transition = 'opacity 0.3s';
        inputElement.style.opacity = '0.3';
        
        setTimeout(() => {
            inputElement.value = '';
            inputElement.style.opacity = '1';
            
            // 清除当前单词的实时显示
            if (this.game.fallingWords.length > 0) {
                this.game.fallingWords[0].realTimeDisplay = null;
                this.game.fallingWords[0].inputCorrect = null;
            }
            this.game.updateHtmlPreview('等待输入...', null);
        }, 300);
    }
}


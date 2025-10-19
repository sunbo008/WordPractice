// 炮管武器系统
// 负责炮管渲染、炮弹发射、瞄准计算、后坐力动画、引信物理
class CannonSystem {
    constructor(ctx, game) {
        this.ctx = ctx;
        this.game = game; // 访问游戏状态
        
        // 炮管状态
        this.cannon = {
            x: game.canvasWidth / 2,
            y: game.canvasHeight - 30, // 画布底部位置，向上偏移30px
            width: 40,
            height: 60,
            angle: -Math.PI / 2, // 初始向上
            targetAngle: -Math.PI / 2,
            recoil: 0, // 后坐力偏移量
            recoilDecay: 0.12 // 后坐力衰减速度
        };
        
        // 炮弹系统
        this.bullets = [];
        
        // 引信燃烧系统
        this.fuseParticles = [];
        
        // 引信摆动物理系统
        this.fuse = {
            length: 12, // 引信长度
            angle: 0, // 引信相对炮管的角度（初始垂直向下）
            angleVelocity: 0, // 角速度
            damping: 0.95, // 阻尼系数
            gravity: 0.3, // 重力影响
            attachX: 18, // 附着点X（相对炮管）
            attachY: -60 // 附着点Y（相对炮管）
        };
        
        // 炮塔基座纹理缓存（静态生成，避免每帧重新计算）
        this.baseTexture = this.generateBaseTexture();
        
        // 炮管瞄准日志计数器
        this._cannonLogCounter = 0;
    }
    
    update() {
        this.updateCannonAngle();
        this.updateBullets();
    }
    
    render() {
        this.drawCannon();
        this.drawBullets();
        this.drawBaseOverlay();
    }
    
    shootBullet(targetWord) {
        // 触发后坐力效果（向后推20像素，增强视觉冲击）
        this.cannon.recoil = 30;
        
        // 计算炮口位置（炮管前端，考虑旋转角度）
        const muzzleDistance = 118; // 炮口距离炮管中心的距离
        const muzzleX = this.cannon.x + Math.sin(this.cannon.angle) * muzzleDistance;
        const muzzleY = this.cannon.y - Math.cos(this.cannon.angle) * muzzleDistance;
        
        // 创建炮口火花效果
        this.game.explosionSystem.createMuzzleFlash(muzzleX, muzzleY, this.cannon.angle);
        
        // 创建火球炮弹对象
        const bullet = {
            x: muzzleX,
            y: muzzleY,
            targetX: targetWord.x,
            targetY: targetWord.y + targetWord.height / 2,
            speed: 15,
            targetWord: targetWord,
            rotation: 0, // 火球旋转角度
            trail: [] // 火焰尾迹
        };
        
        // 计算炮弹方向
        const dx = bullet.targetX - bullet.x;
        const dy = bullet.targetY - bullet.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        bullet.vx = (dx / distance) * bullet.speed;
        bullet.vy = (dy / distance) * bullet.speed;
        
        this.bullets.push(bullet);
    }
    
    autoShoot(word) {
        if (this.game.gameState !== 'playing' && this.game.gameState !== 'review') return;
        
        // 检查单词是否仍在下降列表中
        const wordIndex = this.game.fallingWords.indexOf(word);
        if (wordIndex === -1) return;
        
        // 发射炮弹
        this.shootBullet(word);
    }
    
    // 更新炮管瞄准角度
    updateCannonAngle() {
        if (this.game.gameState !== 'playing' && this.game.gameState !== 'review') {
            return;
        }
        
        // 更新炮管瞄准角度
        if (this.game.fallingWords.length > 0) {
            const targetWord = this.game.fallingWords[0];
            const dx = targetWord.x - this.cannon.x;
            const dy = targetWord.y - this.cannon.y;
            
            // 计算目标角度
            const newTargetAngle = Math.atan2(dx, -dy);
            
            // 只在角度变化较大时更新（避免过度计算）
            if (Math.abs(newTargetAngle - this.cannon.targetAngle) > 0.01) {
                this.cannon.targetAngle = newTargetAngle;
            }
        }
        
        // 平滑过渡炮管角度
        const angleDiff = this.cannon.targetAngle - this.cannon.angle;
        
        // 只有当角度差异足够大时才更新
        if (Math.abs(angleDiff) > 0.001) {
            // 处理角度跨越 -PI/PI 边界的情况
            let normalizedDiff = angleDiff;
            if (angleDiff > Math.PI) {
                normalizedDiff = angleDiff - 2 * Math.PI;
            } else if (angleDiff < -Math.PI) {
                normalizedDiff = angleDiff + 2 * Math.PI;
            }
            
            this.cannon.angle += normalizedDiff * 0.2; // 提高响应速度到0.2
            
            // 更新日志计数器
            if (!this._cannonLogCounter) this._cannonLogCounter = 0;
            this._cannonLogCounter++;
        }
    }
    
    // 更新炮弹
    updateBullets() {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            
            // 保存当前位置作为尾迹
            bullet.trail.push({ x: bullet.x, y: bullet.y, alpha: 1 });
            if (bullet.trail.length > 20) {
                bullet.trail.shift();
            }
            
            // 更新尾迹透明度
            bullet.trail.forEach((point, index) => {
                point.alpha = index / bullet.trail.length;
            });
            
            // 更新炮弹位置
            bullet.x += bullet.vx;
            bullet.y += bullet.vy;
            
            // 更新火球旋转
            bullet.rotation += 0.3;
            
            // 检查是否击中目标
            const dx = bullet.x - bullet.targetX;
            const dy = bullet.y - bullet.targetY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 20) {
                // 击中目标
                this.bullets.splice(i, 1);
                this.onBulletHit(bullet.targetWord);
            } else if (bullet.y < 0 || bullet.y > this.game.canvasHeight || 
                       bullet.x < 0 || bullet.x > this.game.canvasWidth) {
                // 炮弹飞出屏幕
                this.bullets.splice(i, 1);
            }
        }
    }
    
    onBulletHit(word) {
        // 停止语音朗读
        this.game.stopSpeaking();
        
        // 移除单词
        const wordIndex = this.game.fallingWords.indexOf(word);
        if (wordIndex !== -1) {
            this.game.fallingWords.splice(wordIndex, 1);
        }
        
        // 创建爆炸效果
        this.game.explosionSystem.createExplosion(word.x, word.y + word.height / 2, word.original.length);
        
        // 创建中文翻译爆炸动画
        this.game.explosionSystem.createMeaningExplosion(word.x, word.y + word.height / 2, word.meaning, word.original);
        
        // 更新游戏统计
        this.game.hitWords.add(word.original.toLowerCase());
        this.game.fallenWords.add(word.original.toLowerCase());
        
        // 更新考试统计显示
        this.game.updateExamStats();
        
        // 更新连击
        const now = Date.now();
        if (now - this.game.lastHitTime < 3000) {
            this.game.combo++;
        } else {
            this.game.combo = 1;
        }
        this.game.lastHitTime = now;
        
        // 计算分数（包括射击奖励）
        const baseScore = this.game.calculateScore(word);
        const shootBonus = 2; // 射击奖励
        const totalScore = baseScore + shootBonus;
        this.game.score += totalScore;
        
        // 显示击中效果
        this.game.showHitEffect(word, totalScore);
        
        // 单词数量+1
        this.game.levelWordCount++;
        
        // 更新UI
        this.game.updateUI();
        
        // 清空输入
        this.game.clearInput();
        
        // 检查升级
        if (this.game.score >= this.game.targetScore) {
            this.game.levelUp();
            return;
        }
        
        // 【重要修复】不在这里生成下一个单词！
        // 问题：这里调用 generateNextWord() 会导致每击中一个单词消耗 2 个单词池单词
        // 原因：releaseWord() 也会调用 generateNextWord()
        // 
        // 正确流程：
        // 1. 击中单词 → onBulletHit()（不生成新单词）
        // 2. 等待当前单词从缓冲区释放完成
        // 3. releaseWord() → generateNextWord()（唯一正确的生成时机）
        
        console.log('✅ 单词击中完成，等待缓冲区自动释放下一个单词');
    }
    
    // 绘制炮管
    drawCannon() {
        // 炮管在游戏进行时始终显示
        if (this.game.gameState !== 'playing' && this.game.gameState !== 'review') return;
        
        // 更新后坐力（逐渐衰减）
        if (this.cannon.recoil > 0) {
            this.cannon.recoil *= (1 - this.cannon.recoilDecay);
            if (this.cannon.recoil < 0.1) {
                this.cannon.recoil = 0;
            }
        }
        
        this.ctx.save();
        this.ctx.translate(this.cannon.x, this.cannon.y);
        
        // === 卡通风格木质大炮（堡垒基座设计） ===
        
        // 1. 绘制半圆形堡垒基座（保持水平，不受后坐力影响）
        this.ctx.save();
        
        // 基座阴影
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        this.ctx.beginPath();
        this.ctx.arc(0, 25, 62, Math.PI, 0);
        this.ctx.closePath();
        this.ctx.fill();
        
        // 半圆主体（石质渐变）
        const baseGradient = this.ctx.createRadialGradient(0, 25, 0, 0, 25, 60);
        baseGradient.addColorStop(0, '#8B8D8F');
        baseGradient.addColorStop(0.3, '#7F8C8D');
        baseGradient.addColorStop(0.6, '#6C7A7E');
        baseGradient.addColorStop(1, '#5D6D7E');
        this.ctx.fillStyle = baseGradient;
        this.ctx.beginPath();
        this.ctx.arc(0, 25, 60, Math.PI, 0);
        this.ctx.closePath();
        this.ctx.fill();
        
        // 石头不规则质感
        this.ctx.save();
        this.ctx.globalAlpha = 0.3;
        const stonePatterns = [
            { x: -40, y: 8, size: 12, darkness: 0.2 },
            { x: -25, y: 5, size: 10, darkness: 0.15 },
            { x: -10, y: 7, size: 14, darkness: 0.25 },
            { x: 8, y: 10, size: 11, darkness: 0.18 },
            { x: 28, y: 6, size: 13, darkness: 0.22 },
            { x: 45, y: 12, size: 10, darkness: 0.2 },
            { x: -30, y: 15, size: 8, darkness: 0.15 },
            { x: 18, y: 17, size: 9, darkness: 0.17 },
            { x: -48, y: 18, size: 10, darkness: 0.19 },
            { x: 38, y: 20, size: 11, darkness: 0.21 }
        ];
        stonePatterns.forEach(s => {
            const d = Math.sqrt(s.x * s.x + (s.y - 25) * (s.y - 25));
            if (d < 55 && s.y < 25) {
                this.ctx.fillStyle = `rgba(0,0,0,${s.darkness})`;
                this.ctx.beginPath();
                this.ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.fillStyle = `rgba(255,255,255,${s.darkness * 0.5})`;
                this.ctx.beginPath();
                this.ctx.arc(s.x - s.size * 0.3, s.y - s.size * 0.3, s.size * 0.4, 0, Math.PI * 2);
                this.ctx.fill();
            }
        });
        this.ctx.restore();

        // [省略顶层基座覆盖层代码 - 太长了，保持原样]
        // 12. 顶层基座覆盖层（使用半圆剪裁 + 实心重绘，强制覆盖相交处）
        this.ctx.save();
        this.ctx.translate(this.cannon.x, this.cannon.y);
        // 12.1 半圆剪裁区域
        this.ctx.beginPath();
        this.ctx.arc(0, 23, 61, Math.PI, 0);
        this.ctx.lineTo(61, 23);
        this.ctx.lineTo(-61, 23);
        this.ctx.closePath();
        this.ctx.clip();
        // 12.2 在剪裁内进行完全不透明的重绘（确保覆盖）
        this.ctx.globalAlpha = 1;
        // 阴影
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        this.ctx.beginPath();
        this.ctx.arc(0, 23, 63, Math.PI, 0);
        this.ctx.closePath();
        this.ctx.fill();
        // 主体
        const coverGrad = this.ctx.createRadialGradient(0, 23, 0, 0, 23, 61);
        coverGrad.addColorStop(0, '#8B8D8F');
        coverGrad.addColorStop(0.3, '#7F8C8D');
        coverGrad.addColorStop(0.6, '#6C7A7E');
        coverGrad.addColorStop(1, '#5D6D7E');
        this.ctx.fillStyle = coverGrad;
        this.ctx.beginPath();
        this.ctx.arc(0, 23, 61, Math.PI, 0);
        this.ctx.closePath();
        this.ctx.fill();
        // 石块纹理
        this.ctx.save();
        this.ctx.globalAlpha = 0.3;
        const stonesTop = [
            { x: -40, y: 8, size: 12, darkness: 0.2 },
            { x: -25, y: 5, size: 10, darkness: 0.15 },
            { x: -10, y: 7, size: 14, darkness: 0.25 },
            { x: 8, y: 10, size: 11, darkness: 0.18 },
            { x: 28, y: 6, size: 13, darkness: 0.22 },
            { x: 45, y: 12, size: 10, darkness: 0.2 }
        ];
        stonesTop.forEach(s => {
            const d = Math.sqrt(s.x * s.x + (s.y - 23) * (s.y - 23));
            if (d < 56 && s.y < 23) {
                this.ctx.fillStyle = `rgba(0,0,0,${s.darkness})`;
                this.ctx.beginPath();
                this.ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.fillStyle = `rgba(255,255,255,${s.darkness * 0.5})`;
                this.ctx.beginPath();
                this.ctx.arc(s.x - s.size * 0.3, s.y - s.size * 0.3, s.size * 0.4, 0, Math.PI * 2);
                this.ctx.fill();
            }
        });
        this.ctx.restore();
        // 裂纹
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
        this.ctx.lineWidth = 1.5;
        this.ctx.lineCap = 'round';
        const cracksTop = [
            [{ x: -48, y: 10 }, { x: -35, y: 8 }, { x: -22, y: 9 }],
            [{ x: 3, y: 6 }, { x: 15, y: 8 }, { x: 25, y: 7 }]
        ];
        cracksTop.forEach(c => {
            this.ctx.beginPath();
            this.ctx.moveTo(c[0].x, c[0].y);
            for (let i = 1; i < c.length; i++) this.ctx.lineTo(c[i].x, c[i].y);
            this.ctx.stroke();
        });
        // 顶缘描边（在剪裁内绘制）
        this.ctx.strokeStyle = '#2C3E50';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.arc(0, 23, 61, Math.PI, 0);
        this.ctx.stroke();
        this.ctx.restore();
        
        // 裂纹
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
        this.ctx.lineWidth = 1.5;
        this.ctx.lineCap = 'round';
        const cracks = [
            [{ x: -48, y: 12 }, { x: -35, y: 10 }, { x: -22, y: 11 }],
            [{ x: -28, y: 6 }, { x: -18, y: 8 }, { x: -8, y: 7 }],
            [{ x: 3, y: 8 }, { x: 15, y: 10 }, { x: 25, y: 9 }],
            [{ x: 32, y: 13 }, { x: 42, y: 11 }, { x: 52, y: 15 }],
            [{ x: -38, y: 18 }, { x: -28, y: 20 }, { x: -18, y: 19 }],
            [{ x: 12, y: 16 }, { x: 22, y: 18 }, { x: 32, y: 20 }]
        ];
        cracks.forEach(c => {
            this.ctx.beginPath();
            this.ctx.moveTo(c[0].x, c[0].y);
            for (let i = 1; i < c.length; i++) this.ctx.lineTo(c[i].x, c[i].y);
            this.ctx.stroke();
        });
        
        // 底部平面 + 阴影 + 顶缘描边
        this.ctx.fillStyle = '#4A5A5E';
        this.ctx.fillRect(-60, 25, 120, 6);
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.fillRect(-60, 25, 120, 2);
        this.ctx.strokeStyle = '#2C3E50';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.arc(0, 25, 60, Math.PI, 0);
        this.ctx.stroke();
        this.ctx.restore();
        
        // 应用炮管旋转和后坐力（基座不受影响）
        this.ctx.rotate(this.cannon.angle);
        if (this.cannon.recoil > 0) {
            this.ctx.translate(0, this.cannon.recoil);
        }
        
        // 2. 绘制木质支架（V形支撑）
        this.ctx.fillStyle = '#A0522D';
        // 左支架
        this.ctx.beginPath();
        this.ctx.moveTo(-20, -5);
        this.ctx.lineTo(-15, -25);
        this.ctx.lineTo(-10, -25);
        this.ctx.lineTo(-15, -5);
        this.ctx.closePath();
        this.ctx.fill();
        
        // 右支架
        this.ctx.beginPath();
        this.ctx.moveTo(20, -5);
        this.ctx.lineTo(15, -25);
        this.ctx.lineTo(10, -25);
        this.ctx.lineTo(15, -5);
        this.ctx.closePath();
        this.ctx.fill();
        
        // 支架高光
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        this.ctx.beginPath();
        this.ctx.moveTo(-20, -5);
        this.ctx.lineTo(-17, -25);
        this.ctx.lineTo(-15, -25);
        this.ctx.lineTo(-18, -5);
        this.ctx.closePath();
        this.ctx.fill();
        
        // 3. 绘制金属炮管（深灰色，分段设计）
        // 炮管后段（粗）
        const barrelGradient1 = this.ctx.createLinearGradient(-15, 0, 15, 0);
        barrelGradient1.addColorStop(0, '#2C3E50');
        barrelGradient1.addColorStop(0.3, '#34495E');
        barrelGradient1.addColorStop(0.5, '#4A5F7F');
        barrelGradient1.addColorStop(0.7, '#34495E');
        barrelGradient1.addColorStop(1, '#2C3E50');
        this.ctx.fillStyle = barrelGradient1;
        this.drawRoundedRect(-15, -50, 30, 30, 4);
        this.ctx.fill();
        
        // 炮管中段（略细）
        const barrelGradient2 = this.ctx.createLinearGradient(-13, 0, 13, 0);
        barrelGradient2.addColorStop(0, '#34495E');
        barrelGradient2.addColorStop(0.5, '#4A5F7F');
        barrelGradient2.addColorStop(1, '#34495E');
        this.ctx.fillStyle = barrelGradient2;
        this.drawRoundedRect(-13, -75, 26, 30, 3);
        this.ctx.fill();
        
        // 炮管前段（细长）
        const barrelGradient3 = this.ctx.createLinearGradient(-11, 0, 11, 0);
        barrelGradient3.addColorStop(0, '#2C3E50');
        barrelGradient3.addColorStop(0.5, '#34495E');
        barrelGradient3.addColorStop(1, '#2C3E50');
        this.ctx.fillStyle = barrelGradient3;
        this.drawRoundedRect(-11, -105, 22, 35, 3);
        this.ctx.fill();
        
        // 炮管高光（左侧）
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        this.drawRoundedRect(-15, -50, 5, 30, 2);
        this.ctx.fill();
        this.drawRoundedRect(-13, -75, 5, 30, 2);
        this.ctx.fill();
        this.drawRoundedRect(-11, -105, 4, 35, 2);
        this.ctx.fill();
        
        // 炮管阴影（右侧）
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.drawRoundedRect(10, -50, 5, 30, 2);
        this.ctx.fill();
        this.drawRoundedRect(8, -75, 5, 30, 2);
        this.ctx.fill();
        this.drawRoundedRect(7, -105, 4, 35, 2);
        this.ctx.fill();
        
        // 5. 绘制炮管分段装饰环
        this.ctx.strokeStyle = '#1A252F';
        this.ctx.lineWidth = 3;
        [-48, -73, -98].forEach(y => {
            this.ctx.beginPath();
            this.ctx.moveTo(-15, y);
            this.ctx.lineTo(15, y);
            this.ctx.stroke();
        });
        
        // 6. 绘制炮口（粗圆柱体设计）
        // 炮口圆柱体（比炮身粗）
        const muzzleCylinderGradient = this.ctx.createLinearGradient(-18, 0, 18, 0);
        muzzleCylinderGradient.addColorStop(0, '#1A252F');
        muzzleCylinderGradient.addColorStop(0.3, '#2C3E50');
        muzzleCylinderGradient.addColorStop(0.5, '#4A5F7F');
        muzzleCylinderGradient.addColorStop(0.7, '#2C3E50');
        muzzleCylinderGradient.addColorStop(1, '#1A252F');
        this.ctx.fillStyle = muzzleCylinderGradient;
        this.drawRoundedRect(-18, -118, 36, 13, 2);
        this.ctx.fill();
        
        // 炮口圆柱体边缘环（蓝色装饰）
        this.ctx.strokeStyle = '#3498DB';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(-18, -106);
        this.ctx.lineTo(18, -106);
        this.ctx.stroke();
        
        // 炮口圆柱体高光
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        this.drawRoundedRect(-18, -118, 6, 13, 2);
        this.ctx.fill();
        
        // 7. 绘制金属铆钉装饰
        this.ctx.fillStyle = '#1A252F';
        [-45, -35, -70, -60, -95, -85].forEach(y => {
            // 左侧铆钉
            this.ctx.beginPath();
            this.ctx.arc(-12, y, 2.5, 0, Math.PI * 2);
            this.ctx.fill();
            // 右侧铆钉
            this.ctx.beginPath();
            this.ctx.arc(12, y, 2.5, 0, Math.PI * 2);
            this.ctx.fill();
        });
        
        // 铆钉高光
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        [-45, -35, -70, -60, -95, -85].forEach(y => {
            this.ctx.beginPath();
            this.ctx.arc(-13, y - 1, 1, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.beginPath();
            this.ctx.arc(11, y - 1, 1, 0, Math.PI * 2);
            this.ctx.fill();
        });
        
        // 8. 绘制底座装饰（金属扣件）
        this.ctx.fillStyle = '#34495E';
        this.ctx.fillRect(-8, -12, 16, 8);
        this.ctx.strokeStyle = '#1A252F';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(-8, -12, 16, 8);
        
        // 9. 燃烧引信效果（绳子摆动版）
        if (this.game.fallingWords.length > 0) {
            // 更新引信摆动物理
            const cannonAngle = this.cannon.angle;
            const worldDownAngle = Math.PI / 2;
            const targetAngle = worldDownAngle - cannonAngle;
            
            // 角加速度 = 重力扭矩
            const angleAccel = Math.sin(targetAngle - this.fuse.angle) * this.fuse.gravity;
            this.fuse.angleVelocity += angleAccel;
            this.fuse.angleVelocity *= this.fuse.damping; // 阻尼
            this.fuse.angle += this.fuse.angleVelocity;
            
            // 计算引信末端位置
            const fuseAttachX = this.fuse.attachX;
            const fuseAttachY = this.fuse.attachY;
            const fuseEndX = fuseAttachX + Math.sin(this.fuse.angle) * this.fuse.length;
            const fuseEndY = fuseAttachY + Math.cos(this.fuse.angle) * this.fuse.length;
            
            // 绘制引信绳子
            this.ctx.strokeStyle = '#3E2723';
            this.ctx.lineWidth = 2;
            this.ctx.lineCap = 'round';
            this.ctx.beginPath();
            this.ctx.moveTo(fuseAttachX, fuseAttachY);
            this.ctx.lineTo(fuseEndX, fuseEndY);
            this.ctx.stroke();
            
            // 引信末端燃烧点
            const glowGradient = this.ctx.createRadialGradient(fuseEndX, fuseEndY, 0, fuseEndX, fuseEndY, 6);
            glowGradient.addColorStop(0, '#FFC800');
            glowGradient.addColorStop(0.4, '#FF6400');
            glowGradient.addColorStop(1, 'rgba(255, 100, 0, 0)');
            this.ctx.fillStyle = glowGradient;
            this.ctx.beginPath();
            this.ctx.arc(fuseEndX, fuseEndY, 5, 0, Math.PI * 2);
            this.ctx.fill();
            
            // 引信末端亮核（闪烁效果）
            const time = Date.now();
            const flicker = 0.7 + Math.sin(time * 0.01) * 0.3;
            this.ctx.fillStyle = `rgba(255, 255, 200, ${flicker})`;
            this.ctx.beginPath();
            this.ctx.arc(fuseEndX, fuseEndY, 2, 0, Math.PI * 2);
            this.ctx.fill();
            
            // 生成燃烧粒子
            const fuseDirection = this.fuse.angle;
            const flameVx = Math.sin(fuseDirection);
            const flameVy = Math.cos(fuseDirection);
            
            if (Math.random() < 0.4) {
                const spreadAngle = (Math.random() - 0.5) * 0.5;
                const vx = flameVx * (1.5 + Math.random() * 1) * Math.cos(spreadAngle);
                const vy = flameVy * (1.5 + Math.random() * 1) * Math.sin(spreadAngle);
                
                this.fuseParticles.push({
                    x: fuseEndX + (Math.random() - 0.5) * 2,
                    y: fuseEndY + (Math.random() - 0.5) * 2,
                    vx: vx,
                    vy: vy,
                    life: 1.0,
                    size: 1.5 + Math.random() * 1.5,
                    color: Math.random() > 0.5 ? '#FFC800' : '#FF6400'
                });
            }
            
            // 偶尔生成火花
            if (Math.random() < 0.05) {
                const sparkAngle = fuseDirection + (Math.random() - 0.5) * 1;
                const sparkSpeed = 2 + Math.random() * 2;
                
                this.fuseParticles.push({
                    x: fuseEndX,
                    y: fuseEndY,
                    vx: Math.sin(sparkAngle) * sparkSpeed,
                    vy: Math.cos(sparkAngle) * sparkSpeed,
                    life: 1.0,
                    size: 1 + Math.random(),
                    color: '#FFFFC8',
                    isSpark: true
                });
            }
            
            // 绘制燃烧粒子
            this.fuseParticles.forEach(particle => {
                this.ctx.save();
                this.ctx.globalAlpha = particle.life;
                
                if (particle.isSpark) {
                    this.ctx.fillStyle = particle.color;
                    this.ctx.beginPath();
                    this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                    this.ctx.fill();
                } else {
                    const pGradient = this.ctx.createRadialGradient(
                        particle.x, particle.y, 0,
                        particle.x, particle.y, particle.size
                    );
                    pGradient.addColorStop(0, particle.color);
                    pGradient.addColorStop(1, 'rgba(255, 100, 0, 0)');
                    this.ctx.fillStyle = pGradient;
                    this.ctx.beginPath();
                    this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                    this.ctx.fill();
                }
                
                this.ctx.restore();
            });
            
            // 更新粒子状态
            this.fuseParticles = this.fuseParticles.filter(particle => {
                particle.x += particle.vx;
                particle.y += particle.vy;
                particle.vy += 0.05; // 轻微重力
                particle.life -= 0.02;
                return particle.life > 0;
            });
        }
        
        // 10. 绘制炮台基座（最后绘制，遮挡相交部分）
        (function () {
            const prevOp = this.ctx.globalCompositeOperation;
            this.ctx.globalCompositeOperation = 'destination-out';
            this.ctx.beginPath();
            this.ctx.ellipse(0, -20, 27, 10, 0, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.globalCompositeOperation = prevOp;
        }).call(this);

        // 炮台底部（圆柱形）
        const platformGradient = this.ctx.createLinearGradient(-25, 0, 25, 0);
        platformGradient.addColorStop(0, '#5D6D7E');
        platformGradient.addColorStop(0.5, '#7F8C8D');
        platformGradient.addColorStop(1, '#5D6D7E');
        this.ctx.fillStyle = platformGradient;
        this.ctx.fillRect(-25, -20, 50, 20);
        
        // 炮台顶部椭圆
        const topGradient = this.ctx.createRadialGradient(0, -20, 0, 0, -20, 25);
        topGradient.addColorStop(0, '#95A5A6');
        topGradient.addColorStop(1, '#7F8C8D');
        this.ctx.fillStyle = topGradient;
        const prevOp = this.ctx.globalCompositeOperation;
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.beginPath();
        this.ctx.ellipse(0, -20, 25, 8, 0, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.globalCompositeOperation = prevOp;
        
        // 炮台装饰环
        const prevOp2 = this.ctx.globalCompositeOperation;
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.strokeStyle = '#34495E';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.ellipse(0, -20, 23, 7, 0, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.globalCompositeOperation = prevOp2;
        
        // 炮台高光
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        this.ctx.fillRect(-25, -20, 8, 20);
        this.ctx.beginPath();
        this.ctx.ellipse(-8, -20, 10, 4, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.restore();
    }
    
    // 绘制炮弹
    drawBullets() {
        this.bullets.forEach(bullet => {
            // 1. 绘制火焰尾迹
            bullet.trail.forEach((point, index) => {
                const size = (index / bullet.trail.length) * 12;
                const alpha = point.alpha * 0.6;
                
                // 橙红色尾迹
                const trailGradient = this.ctx.createRadialGradient(
                    point.x, point.y, 0,
                    point.x, point.y, size
                );
                trailGradient.addColorStop(0, `rgba(255, 200, 0, ${alpha})`);
                trailGradient.addColorStop(0.5, `rgba(255, 100, 0, ${alpha * 0.7})`);
                trailGradient.addColorStop(1, `rgba(255, 50, 0, 0)`);
                
                this.ctx.fillStyle = trailGradient;
                this.ctx.beginPath();
                this.ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
                this.ctx.fill();
            });
            
            // 2. 绘制火球主体
            this.ctx.save();
            this.ctx.translate(bullet.x, bullet.y);
            this.ctx.rotate(bullet.rotation);
            
            // 外层光晕（红色）
            const outerGlow = this.ctx.createRadialGradient(0, 0, 0, 0, 0, 16);
            outerGlow.addColorStop(0, 'rgba(255, 100, 0, 0.8)');
            outerGlow.addColorStop(0.5, 'rgba(255, 50, 0, 0.4)');
            outerGlow.addColorStop(1, 'rgba(255, 0, 0, 0)');
            this.ctx.fillStyle = outerGlow;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, 16, 0, Math.PI * 2);
            this.ctx.fill();
            
            // 中层火球（橙色）
            const middleGlow = this.ctx.createRadialGradient(0, 0, 0, 0, 0, 10);
            middleGlow.addColorStop(0, 'rgba(255, 200, 0, 1)');
            middleGlow.addColorStop(0.6, 'rgba(255, 150, 0, 1)');
            middleGlow.addColorStop(1, 'rgba(255, 100, 0, 0.8)');
            this.ctx.fillStyle = middleGlow;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, 10, 0, Math.PI * 2);
            this.ctx.fill();
            
            // 内核（亮黄色）
            const core = this.ctx.createRadialGradient(0, 0, 0, 0, 0, 5);
            core.addColorStop(0, 'rgba(255, 255, 200, 1)');
            core.addColorStop(0.5, 'rgba(255, 255, 100, 1)');
            core.addColorStop(1, 'rgba(255, 200, 0, 1)');
            this.ctx.fillStyle = core;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, 5, 0, Math.PI * 2);
            this.ctx.fill();
            
            // 火焰纹理（旋转的火苗）
            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI * 2 / 6) * i;
                const flameX = Math.cos(angle) * 8;
                const flameY = Math.sin(angle) * 8;
                
                const flameGradient = this.ctx.createRadialGradient(
                    flameX, flameY, 0,
                    flameX, flameY, 4
                );
                flameGradient.addColorStop(0, 'rgba(255, 255, 150, 0.6)');
                flameGradient.addColorStop(1, 'rgba(255, 150, 0, 0)');
                
                this.ctx.fillStyle = flameGradient;
                this.ctx.beginPath();
                this.ctx.arc(flameX, flameY, 4, 0, Math.PI * 2);
                this.ctx.fill();
            }
            
            this.ctx.restore();
        });
    }
    
    // 辅助方法：绘制圆角矩形
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
    
    // 生成炮塔基座纹理（静态，只在初始化时生成一次）
    generateBaseTexture() {
        const texture = {
            scratches: [], // 划痕数据
            rustSpots: [], // 锈迹数据
            rivets: [      // 铆钉位置
                { angle: Math.PI * 0.3, radius: 50 },
                { angle: Math.PI * 0.5, radius: 50 },
                { angle: Math.PI * 0.7, radius: 50 },
                { angle: Math.PI * 0.2, radius: 35 },
                { angle: Math.PI * 0.8, radius: 35 }
            ],
            shineStripes: [] // 光泽条纹数据
        };
        
        // 生成50条随机划痕
        for (let i = 0; i < 50; i++) {
            const angle = Math.PI + Math.random() * Math.PI;
            const radius = 10 + Math.random() * 50;
            const x = Math.cos(angle) * radius;
            const y = 23 + Math.sin(angle) * radius;
            
            const scratchLength = 5 + Math.random() * 15;
            const scratchAngle = Math.random() * Math.PI * 2;
            const scratchEndX = x + Math.cos(scratchAngle) * scratchLength;
            const scratchEndY = y + Math.sin(scratchAngle) * scratchLength;
            
            texture.scratches.push({
                startX: x,
                startY: y,
                endX: scratchEndX,
                endY: scratchEndY,
                color: Math.random() > 0.5 ? '#9BA5A8' : '#3A3C3E',
                width: 0.5 + Math.random() * 1
            });
        }
        
        // 生成15个锈迹斑点
        for (let i = 0; i < 15; i++) {
            const angle = Math.PI + Math.random() * Math.PI;
            const radius = 15 + Math.random() * 45;
            const x = Math.cos(angle) * radius;
            const y = 23 + Math.sin(angle) * radius;
            
            texture.rustSpots.push({
                x: x,
                y: y,
                radius: 1 + Math.random() * 3
            });
        }
        
        // 生成3条光泽条纹数据
        for (let i = 0; i < 3; i++) {
            const angle = Math.PI * (0.3 + i * 0.2);
            const radius1 = 20;
            const radius2 = 55;
            
            texture.shineStripes.push({
                x1: Math.cos(angle) * radius1,
                y1: 23 + Math.sin(angle) * radius1,
                x2: Math.cos(angle) * radius2,
                y2: 23 + Math.sin(angle) * radius2
            });
        }
        
        return texture;
    }

    // 顶层半圆基座覆盖：在render()末尾调用
    drawBaseOverlay() {
        // 仅在playing/review时显示
        if (this.game.gameState !== 'playing' && this.game.gameState !== 'review') return;
        this.ctx.save();
        // 不要继承任何旋转/后坐力：仅定位
        this.ctx.translate(this.cannon.x, this.cannon.y);

        // 剪裁半圆区域
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.arc(0, 23, 61, Math.PI, 0);
        this.ctx.lineTo(61, 23);
        this.ctx.lineTo(-61, 23);
        this.ctx.closePath();
        this.ctx.clip();

        // 在剪裁内完全重绘半圆（不透明）
        // 阴影
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        this.ctx.beginPath();
        this.ctx.arc(0, 23, 63, Math.PI, 0);
        this.ctx.closePath();
        this.ctx.fill();
        
        // 主体渐变（深色金属底色）
        const grad = this.ctx.createRadialGradient(0, 23, 0, 0, 23, 61);
        grad.addColorStop(0, '#6B6D6F');
        grad.addColorStop(0.3, '#5F6C6D');
        grad.addColorStop(0.6, '#4C5A5E');
        grad.addColorStop(1, '#3D4D5E');
        this.ctx.fillStyle = grad;
        this.ctx.beginPath();
        this.ctx.arc(0, 23, 61, Math.PI, 0);
        this.ctx.closePath();
        this.ctx.fill();
        
        // === 铁皮纹理效果（使用预生成的静态纹理）===
        // 1. 绘制不规则铁皮划痕
        this.ctx.globalAlpha = 0.15;
        this.baseTexture.scratches.forEach(scratch => {
            this.ctx.strokeStyle = scratch.color;
            this.ctx.lineWidth = scratch.width;
            this.ctx.beginPath();
            this.ctx.moveTo(scratch.startX, scratch.startY);
            this.ctx.lineTo(scratch.endX, scratch.endY);
            this.ctx.stroke();
        });
        this.ctx.globalAlpha = 1;
        
        // 2. 绘制金属锈迹斑点
        this.ctx.globalAlpha = 0.2;
        this.ctx.fillStyle = '#8B4513';
        this.baseTexture.rustSpots.forEach(spot => {
            this.ctx.beginPath();
            this.ctx.arc(spot.x, spot.y, spot.radius, 0, Math.PI * 2);
            this.ctx.fill();
        });
        this.ctx.globalAlpha = 1;
        
        // 3. 绘制铆钉效果
        this.baseTexture.rivets.forEach(rivet => {
            const x = Math.cos(rivet.angle) * rivet.radius;
            const y = 23 + Math.sin(rivet.angle) * rivet.radius;
            
            // 铆钉阴影
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            this.ctx.beginPath();
            this.ctx.arc(x + 1, y + 1, 4, 0, Math.PI * 2);
            this.ctx.fill();
            
            // 铆钉主体
            const rivetGrad = this.ctx.createRadialGradient(x - 1, y - 1, 0, x, y, 4);
            rivetGrad.addColorStop(0, '#A8B0B3');
            rivetGrad.addColorStop(0.5, '#7A8288');
            rivetGrad.addColorStop(1, '#5A6268');
            this.ctx.fillStyle = rivetGrad;
            this.ctx.beginPath();
            this.ctx.arc(x, y, 4, 0, Math.PI * 2);
            this.ctx.fill();
            
            // 铆钉高光
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            this.ctx.beginPath();
            this.ctx.arc(x - 1.5, y - 1.5, 1.5, 0, Math.PI * 2);
            this.ctx.fill();
        });
        
        // 4. 绘制金属光泽条纹
        this.ctx.globalAlpha = 0.1;
        this.baseTexture.shineStripes.forEach(stripe => {
            const shineGrad = this.ctx.createLinearGradient(stripe.x1, stripe.y1, stripe.x2, stripe.y2);
            shineGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
            shineGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.6)');
            shineGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
            
            this.ctx.strokeStyle = shineGrad;
            this.ctx.lineWidth = 8;
            this.ctx.beginPath();
            this.ctx.moveTo(stripe.x1, stripe.y1);
            this.ctx.lineTo(stripe.x2, stripe.y2);
            this.ctx.stroke();
        });
        this.ctx.globalAlpha = 1;
        
        // 顶缘描边（加强深色边缘）
        this.ctx.strokeStyle = '#1C2C3E';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.arc(0, 23, 61, Math.PI, 0);
        this.ctx.stroke();
        
        this.ctx.restore();
        
        this.ctx.restore();
    }
}


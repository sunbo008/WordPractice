#!/usr/bin/env python3
"""
正确应用代码拆分修改
"""

def main():
    input_file = '../src/core/WordTetrisGame.backup.js'
    output_file = '../src/core/WordTetrisGame.js'
    
    with open(input_file, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    new_lines = []
    skip_until = -1
    
    for i, line in enumerate(lines):
        line_num = i + 1
        
        # 如果在跳过区域，继续跳过
        if i < skip_until:
            continue
        
        # 1. 在 setupHighDPICanvas() 之前添加画布尺寸初始化
        if line_num == 10 and 'setupHighDPICanvas' in line:
            new_lines.append('        \n')
            new_lines.append('        // 画布设置（逻辑尺寸） - 必须在 setupHighDPICanvas 之前初始化\n')
            new_lines.append('        this.canvasWidth = 600;\n')
            new_lines.append('        this.canvasHeight = 500;\n')
            new_lines.append('        this.bufferHeight = 80;\n')
            new_lines.append('        this.gameAreaTop = this.bufferHeight;\n')
            new_lines.append('        this.gameAreaHeight = this.canvasHeight - this.bufferHeight;\n')
            new_lines.append('        \n')
            new_lines.append('        // 高清屏适配并根据左栏高度设置画布显示高度\n')
            new_lines.append('        this.setupHighDPICanvas();\n')
            new_lines.append('        \n')
            new_lines.append('        // 初始化渲染引擎（在画布尺寸设置后）\n')
            new_lines.append('        this.renderer = new GameRenderer(this.ctx, this);\n')
            skip_until = i + 1
            continue
        
        # 2. 删除旧的 setupHighDPICanvas() 调用（如果存在）
        if line_num == 11 and 'setupHighDPICanvas' in line:
            continue
        
        # 3. 替换炮管系统初始化（删除 this.cannon 等，添加 this.cannonSystem）
        if line_num == 63 and '// 炮管系统' in line:
            new_lines.append('        \n')
            new_lines.append('        // 初始化炮管系统（在画布尺寸设置后）\n')
            new_lines.append('        this.cannonSystem = new CannonSystem(this.ctx, this);\n')
            # 跳过原有的炮管、炮弹、引信定义（到错误标记系统之前）
            skip_until = 102  # 跳到错误标记系统
            continue
        
        # 4. 删除画布设置（已经在前面添加了）
        if line_num >= 59 and line_num <= 64 and ('canvasWidth' in line or 'canvasHeight' in line or 'bufferHeight' in line):
            continue
        
        # 5. 删除 baseTexture 初始化
        if line_num >= 125 and line_num <= 126 and 'baseTexture' in line:
            skip_until = i + 3
            continue
        
        # 6. 修改 syncCanvasLogicalSize 中的炮管引用
        if 'if (this.cannon)' in line:
            new_lines.append('        if (this.cannonSystem && this.cannonSystem.cannon) {\n')
            continue
        if 'this.cannon.x = this.canvasWidth / 2;' in line:
            new_lines.append('            this.cannonSystem.cannon.x = this.canvasWidth / 2;\n')
            continue
        if 'this.cannon.y = this.canvasHeight - 30;' in line:
            new_lines.append('            this.cannonSystem.cannon.y = this.canvasHeight - 30;\n')
            continue
        
        # 7. 修改 resetGame 中的炮管引用
        if 'this.cannon.angle = -Math.PI / 2;' in line:
            new_lines.append('        // 【修复】重置炮管角度\n')
            new_lines.append('        if (this.cannonSystem && this.cannonSystem.cannon) {\n')
            new_lines.append('            this.cannonSystem.cannon.angle = -Math.PI / 2;\n')
            new_lines.append('            this.cannonSystem.cannon.targetAngle = -Math.PI / 2;\n')
            new_lines.append('        }\n')
            new_lines.append('        \n')
            new_lines.append('        // 重置炮弹和爆炸效果（现在在 cannonSystem 中）\n')
            new_lines.append('        if (this.cannonSystem) {\n')
            new_lines.append('            this.cannonSystem.bullets = [];\n')
            new_lines.append('        }\n')
            # 跳过原有的 3 行
            skip_until = i + 4
            continue
        
        # 8. 修改 updateGame 中的炮管更新
        if 'this.updateCannonAngle();' in line:
            new_lines.append('        // 更新炮管系统\n')
            new_lines.append('        this.cannonSystem.update();\n')
            # 跳过 updateBullets 调用
            if i + 3 < len(lines) and 'this.updateBullets()' in lines[i + 3]:
                skip_until = i + 4
            continue
        
        # 9. 简化 render 方法
        if line_num >= 1473 and 'render() {' in line:
            new_lines.append('    render() {\n')
            new_lines.append('        // 委托给渲染引擎\n')
            new_lines.append('        this.renderer.render();\n')
            new_lines.append('    }\n')
            new_lines.append('\n')
            new_lines.append('    // ===== 以下渲染和炮管方法已迁移至 GameRenderer 和 CannonSystem =====\n')
            new_lines.append('\n')
            # 跳过所有渲染和炮管方法，直到 drawExplosions
            j = i + 1
            while j < len(lines):
                if 'drawExplosions()' in lines[j]:
                    skip_until = j
                    break
                j += 1
            continue
        
        # 10. 修改 autoShoot 调用
        if 'this.autoShoot(currentWord)' in line:
            new_lines.append(line.replace('this.autoShoot', 'this.cannonSystem.autoShoot'))
            continue
        
        # 默认：保留行
        new_lines.append(line)
    
    # 写入文件
    with open(output_file, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    
    print(f"Refactoring applied!")
    print(f"  Original: {len(lines)} lines")
    print(f"  New file: {len(new_lines)} lines")
    print(f"  Deleted: {len(lines) - len(new_lines)} lines")

if __name__ == '__main__':
    main()


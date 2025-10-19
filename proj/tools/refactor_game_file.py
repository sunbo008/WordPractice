#!/usr/bin/env python3
"""
重构 WordTetrisGame.js：应用 GameRenderer 和 CannonSystem 拆分，删除旧代码
"""

import sys

def main():
    input_file = '../src/core/WordTetrisGame.js'
    output_file = '../src/core/WordTetrisGame.refactored.js'
    
    with open(input_file, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    new_lines = []
    skip_until_line = 0
    i = 0
    
    while i < len(lines):
        line_num = i + 1
        line = lines[i]
        
        # 跳过标记的区域
        if i < skip_until_line:
            i += 1
            continue
        
        # 在第 11 行后添加渲染引擎初始化
        if line_num == 11 and '// 高清屏适配' in line:
            new_lines.append(line)
            new_lines.append('        \n')
            new_lines.append('        // 初始化渲染引擎\n')
            new_lines.append('        this.renderer = new GameRenderer(this.ctx, this);\n')
            i += 1
            continue
        
        # 删除 this.cannon 定义（63-73行）
        if line_num == 63 and '// 炮管系统' in line:
            new_lines.append('        // 初始化炮管系统\n')
            new_lines.append('        this.cannonSystem = new CannonSystem(this.ctx, this);\n')
            skip_until_line = 77  # 跳到 bullets 之后
            i += 1
            continue
        
        # 删除 this.bullets（75-76行）- 已经在上面跳过
        
        # 删除 this.fuse 和 this.fuseParticles（87-99行）
        if line_num == 87 and '// 引信燃烧系统' in line:
            skip_until_line = 101  # 跳到错误标记系统
            i += 1
            continue
        
        # 删除 this.baseTexture（125-126行）
        if line_num == 125 and 'baseTexture' in line:
            skip_until_line = 128  # 跳到 init()
            i += 1
            continue
        
        # 修改 syncCanvasLogicalSize 中的 this.cannon 引用（513-515行）
        if line_num >= 513 and line_num <= 515 and 'this.cannon' in line:
            line = line.replace('this.cannon', 'this.cannonSystem.cannon')
            new_lines.append(line)
            i += 1
            continue
        
        # 修改 resetGame 中的引用（约 855 行）
        if 'this.cannon.angle = -Math.PI' in line:
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
            # 跳过原来的 3 行
            skip_until_line = i + 4
            i += 1
            continue
        
        # 删除 drawCannon 方法（1510-2102行，约592行）
        if line_num == 1510 and 'drawCannon()' in line:
            new_lines.append('\n')
            new_lines.append('    // ===== 以下炮管方法已迁移至 CannonSystem.js，已删除 =====\n')
            new_lines.append('    // drawCannon(), generateBaseTexture(), drawBaseOverlay()\n')
            new_lines.append('    // updateCannonAngle(), drawBullets()\n')
            new_lines.append('    // ==========================================================\n')
            new_lines.append('\n')
            skip_until_line = 2103  # 跳过整个 drawCannon 方法
            i += 1
            continue
        
        # 删除 generateBaseTexture 方法（2106-2173行）
        if line_num == 2106 and 'generateBaseTexture()' in line:
            skip_until_line = 2174
            i += 1
            continue
        
        # 删除 drawBaseOverlay 方法（2176-2292行）
        if line_num == 2176 and 'drawBaseOverlay()' in line:
            skip_until_line = 2293
            i += 1
            continue
        
        # 删除 updateCannonAngle 方法（2295-2368行）
        if line_num == 2295 and 'updateCannonAngle()' in line:
            skip_until_line = 2369
            i += 1
            continue
        
        # 删除 drawBullets 方法（2370-约2451行）
        if line_num == 2370 and 'drawBullets()' in line:
            skip_until_line = 2452  # drawExplosions 开始
            i += 1
            continue
        
        # 修改 autoShoot 方法（约 2875 行）
        if 'autoShoot(word)' in line and 'if (this.gameState' in lines[i+1]:
            new_lines.append(line)  # autoShoot(word) {
            new_lines.append('        // 转发到 CannonSystem\n')
            new_lines.append('        if (this.cannonSystem && this.cannonSystem.autoShoot) {\n')
            new_lines.append('            this.cannonSystem.autoShoot(word);\n')
            new_lines.append('        }\n')
            new_lines.append('    }\n')
            new_lines.append('\n')
            # 找到方法结束
            j = i + 1
            while j < len(lines) and not (lines[j].strip().startswith('}')):
                j += 1
            skip_until_line = j + 2  # 跳过方法体和结束括号
            i += 1
            continue
        
        # 删除 shootBullet 方法（保留转发版本）
        if 'shootBullet(targetWord)' in line:
            new_lines.append(line)  # shootBullet(targetWord) {
            new_lines.append('        // 转发到 CannonSystem\n')
            new_lines.append('        if (this.cannonSystem && this.cannonSystem.shootBullet) {\n')
            new_lines.append('            this.cannonSystem.shootBullet(targetWord);\n')
            new_lines.append('        }\n')
            new_lines.append('    }\n')
            new_lines.append('\n')
            # 找到方法结束
            j = i + 1
            depth = 1
            while j < len(lines) and depth > 0:
                if '{' in lines[j]:
                    depth += lines[j].count('{')
                if '}' in lines[j]:
                    depth -= lines[j].count('}')
                j += 1
            skip_until_line = j
            i += 1
            continue
        
        # 删除 updateBullets 方法
        if 'updateBullets()' in line and line.strip().startswith('updateBullets'):
            # 找到方法结束
            j = i + 1
            depth = 1
            while j < len(lines) and depth > 0:
                if '{' in lines[j]:
                    depth += lines[j].count('{')
                if '}' in lines[j]:
                    depth -= lines[j].count('}')
                j += 1
            skip_until_line = j
            i += 1
            continue
        
        # 修改 updateGame 中的 updateBullets 调用
        if 'this.updateBullets()' in line:
            # 跳过，已经在 CannonSystem.update() 中调用
            i += 1
            continue
        
        # 修改 updateGame 中的 updateCannonAngle 调用
        if 'this.updateCannonAngle()' in line:
            # 改为调用 cannonSystem.update()
            line = line.replace('this.updateCannonAngle()', 'this.cannonSystem.update()')
            new_lines.append(line)
            i += 1
            continue
        
        # 保留其他行
        new_lines.append(line)
        i += 1
    
    # 写入新文件
    with open(output_file, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    
    print("Refactoring completed!")
    print(f"   Original: {len(lines)} lines")
    print(f"   New file: {len(new_lines)} lines")
    print(f"   Deleted: {len(lines) - len(new_lines)} lines")
    print(f"\nNew file saved to: {output_file}")
    print(f"\nPlease review and then:")
    print(f"  mv {output_file} {input_file}")

if __name__ == '__main__':
    main()


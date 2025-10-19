#!/usr/bin/env python3
"""
完整的代码拆分 - 一次性应用所有修改
"""
import re

def main():
    input_file = '../src/core/WordTetrisGame.js'
    output_file = '../src/core/WordTetrisGame.refactored.js'
    
    with open(input_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 1. 在构造函数中添加画布尺寸初始化（在 setupHighDPICanvas 之前）
    setup_pattern = r'        this\.vocabularyManager = new VocabularyManagerV2\(\);\n        \n        // 高清屏适配并根据左栏高度设置画布显示高度\n        this\.setupHighDPICanvas\(\);'
    setup_replacement = '''        this.vocabularyManager = new VocabularyManagerV2();
        
        // 画布设置（逻辑尺寸） - 必须在 setupHighDPICanvas 之前初始化
        this.canvasWidth = 600;
        this.canvasHeight = 500;
        this.bufferHeight = 80;
        this.gameAreaTop = this.bufferHeight;
        this.gameAreaHeight = this.canvasHeight - this.bufferHeight;
        
        // 高清屏适配并根据左栏高度设置画布显示高度
        this.setupHighDPICanvas();
        
        // 初始化渲染引擎（在画布尺寸设置后）
        this.renderer = new GameRenderer(this.ctx, this);'''
    content = re.sub(setup_pattern, setup_replacement, content)
    
    # 2. 删除后面重复的画布设置
    content = re.sub(
        r'        // 画布设置（逻辑尺寸）.*?\n.*?this\.canvasWidth = 600;\n.*?this\.canvasHeight = 500;\n.*?this\.bufferHeight = 80;\n.*?this\.gameAreaTop = this\.bufferHeight;\n.*?this\.gameAreaHeight = this\.canvasHeight - this\.bufferHeight;\n        \n',
        '',
        content,
        flags=re.DOTALL
    )
    
    # 3. 替换炮管系统定义
    cannon_pattern = r'        // 炮管系统\n        this\.cannon = \{.*?\n        \};\n        \n        // 炮弹系统\n        this\.bullets = \[\];\n        \n.*?        // 引信摆动物理系统\n        this\.fuse = \{.*?\n        \};\n        \n'
    cannon_replacement = '''        // 初始化炮管系统（在画布尺寸设置后）
        this.cannonSystem = new CannonSystem(this.ctx, this);
        
'''
    content = re.sub(cannon_pattern, cannon_replacement, content, flags=re.DOTALL)
    
    # 4. 删除 baseTexture 初始化
    content = re.sub(
        r'        // 炮塔基座纹理缓存（静态生成，避免每帧重新计算）\n        this\.baseTexture = this\.generateBaseTexture\(\);\n        \n',
        '',
        content
    )
    
    # 5. 修改 syncCanvasLogicalSize 中的炮管引用
    content = content.replace(
        '        // 更新炮管位置\n        if (this.cannon) {\n            this.cannon.x = this.canvasWidth / 2;\n            this.cannon.y = this.canvasHeight - 30;\n        }',
        '        // 更新炮管位置\n        if (this.cannonSystem && this.cannonSystem.cannon) {\n            this.cannonSystem.cannon.x = this.canvasWidth / 2;\n            this.cannonSystem.cannon.y = this.canvasHeight - 30;\n        }'
    )
    
    # 6. 修改 resetGame 中的炮管引用
    content = content.replace(
        '        // 【修复】重置炮管角度\n        this.cannon.angle = -Math.PI / 2;\n        this.cannon.targetAngle = -Math.PI / 2;\n        this._cannonLogCounter = 0; // 重置炮管日志计数器\n        \n        // 重置炮弹和爆炸效果\n        this.bullets = [];',
        '''        // 【修复】重置炮管角度
        if (this.cannonSystem && this.cannonSystem.cannon) {
            this.cannonSystem.cannon.angle = -Math.PI / 2;
            this.cannonSystem.cannon.targetAngle = -Math.PI / 2;
        }
        
        // 重置炮弹和爆炸效果（现在在 cannonSystem 中）
        if (this.cannonSystem) {
            this.cannonSystem.bullets = [];
        }'''
    )
    
    # 7. 修改 updateGame 中的炮管更新
    content = content.replace(
        '        // 更新炮管瞄准角度\n        this.updateCannonAngle();\n        \n        // 更新下降单词\n        this.updateFallingWords();\n        \n        // 更新炮弹\n        this.updateBullets();',
        '        // 更新炮管系统\n        this.cannonSystem.update();\n        \n        // 更新下降单词\n        this.updateFallingWords();'
    )
    
    # 8. 简化 render 方法并删除所有渲染方法
    # 找到 render() 方法的开始
    render_start = content.find('    render() {')
    if render_start == -1:
        print("Error: Cannot find render() method")
        return
    
    # 找到 drawExplosions() 方法的开始（保留这个方法及之后的内容）
    draw_explosions_start = content.find('    drawExplosions() {', render_start)
    if draw_explosions_start == -1:
        print("Error: Cannot find drawExplosions() method")
        return
    
    # 替换 render 到 drawExplosions 之间的所有内容
    new_render_section = '''    render() {
        // 委托给渲染引擎
        this.renderer.render();
    }

    // ===== 以下渲染和炮管方法已迁移至 GameRenderer 和 CannonSystem =====
    // 已迁移方法不再保留在主文件中，避免代码冗余
    // ================================================================

    '''
    
    content = content[:render_start] + new_render_section + content[draw_explosions_start:]
    
    # 9. 修改 autoShoot 调用
    content = content.replace(
        'this.autoShoot(currentWord);',
        'this.cannonSystem.autoShoot(currentWord);'
    )
    
    # 写入文件
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(content)
    
    # 统计
    original_lines = len(open(input_file, 'r', encoding='utf-8').readlines())
    new_lines = len(open(output_file, 'r', encoding='utf-8').readlines())
    
    print("Refactoring completed!")
    print(f"  Original: {original_lines} lines")
    print(f"  New file: {new_lines} lines")
    print(f"  Deleted: {original_lines - new_lines} lines")
    print(f"\nPlease review and then: mv {output_file} {input_file}")

if __name__ == '__main__':
    main()


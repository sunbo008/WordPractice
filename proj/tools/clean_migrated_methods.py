#!/usr/bin/env python3
"""
删除已迁移到 GameRenderer 和 CannonSystem 的方法
"""

def main():
    input_file = '../src/core/WordTetrisGame.js'
    
    with open(input_file, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    # 要删除的方法名列表
    methods_to_delete = [
        'drawBackground',
        'drawBufferZone',
        'drawFallingWords',
        'drawStackedWords',
        'drawWordWithHighlight',
        'drawTextWithStress',
        'drawTextWithCustomUnderlines',
        'drawCustomUnderscore',
        'getCustomUnderscoreWidth',
        'measureTextWithCustomUnderlines',
        'drawGameInfo',
        'drawRoundedRect',
        'drawCannon',
        'generateBaseTexture',
        'drawBaseOverlay',
        'updateCannonAngle',
        'drawBullets',
        'autoShoot',
        'shootBullet',
        'updateBullets'
    ]
    
    new_lines = []
    i = 0
    while i < len(lines):
        line = lines[i]
        
        # 检查是否是要删除的方法
        should_delete = False
        for method_name in methods_to_delete:
            if f'    {method_name}()' in line or f'    {method_name}(word)' in line or f'    {method_name}(targetWord)' in line:
                should_delete = True
                print(f"Found method to delete at line {i+1}: {method_name}")
                break
        
        if should_delete:
            # 找到方法的结束位置（下一个方法或类结束）
            depth = 0
            started = False
            j = i
            while j < len(lines):
                if '{' in lines[j]:
                    depth += lines[j].count('{')
                    started = True
                if '}' in lines[j]:
                    depth -= lines[j].count('}')
                    if started and depth == 0:
                        # 方法结束
                        j += 1
                        break
                j += 1
            
            print(f"  Deleting lines {i+1} to {j} ({j-i} lines)")
            i = j  # 跳过整个方法
        else:
            new_lines.append(line)
            i += 1
    
    # 在 render() 方法后添加注释
    result_lines = []
    for i, line in enumerate(new_lines):
        result_lines.append(line)
        if '    render() {' in line and i + 2 < len(new_lines):
            # 在 render 方法后面找到合适的位置添加注释
            if 'this.renderer.render()' in new_lines[i+2]:
                result_lines.append(new_lines[i+1])  # 添加注释行
                result_lines.append(new_lines[i+2])  # 添加调用行
                result_lines.append('    }\n')
                result_lines.append('\n')
                result_lines.append('    // ===== 以下方法已迁移至 GameRenderer.js 和 CannonSystem.js =====\n')
                result_lines.append('    // 渲染方法（GameRenderer）: drawBackground, drawBufferZone, drawFallingWords,\n')
                result_lines.append('    //   drawStackedWords, drawWordWithHighlight, drawTextWithStress,\n')
                result_lines.append('    //   drawTextWithCustomUnderlines, drawCustomUnderscore, drawGameInfo, etc.\n')
                result_lines.append('    //\n')
                result_lines.append('    // 炮管方法（CannonSystem）: drawCannon, generateBaseTexture, drawBaseOverlay,\n')
                result_lines.append('    //   updateCannonAngle, drawBullets, autoShoot, shootBullet, updateBullets\n')
                result_lines.append('    // ================================================================\n')
                result_lines.append('\n')
                # 跳过已添加的行
                for _ in range(3):
                    i += 1
    
    # 如果没有在 render 后添加，就直接使用 new_lines
    if len(result_lines) == 0:
        result_lines = new_lines
    
    with open(input_file, 'w', encoding='utf-8') as f:
        f.writelines(result_lines)
    
    print(f"\nCleaning completed!")
    print(f"  Original: {len(lines)} lines")
    print(f"  New file: {len(result_lines)} lines")
    print(f"  Deleted: {len(lines) - len(result_lines)} lines")

if __name__ == '__main__':
    main()


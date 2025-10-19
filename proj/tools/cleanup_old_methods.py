#!/usr/bin/env python3
"""
清理 WordTetrisGame.js 中已迁移到其他系统的旧方法
"""

import re

# 读取文件
with open('../src/core/WordTetrisGame.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 需要删除的方法范围（行号-1，因为数组从0开始）
methods_to_delete = [
    (1509, 2102),  # drawCannon()
    (2105, 2173),  # generateBaseTexture()
    (2175, 2292),  # drawBaseOverlay()
    (2294, 2368),  # updateCannonAngle()
    (2369, 2450),  # drawBullets() - 估计结束位置
]

# 标记要删除的行
delete_lines = set()
for start, end in methods_to_delete:
    for i in range(start-1, end):  # 行号转数组索引
        delete_lines.add(i)

# 保留未标记删除的行
new_lines = [line for i, line in enumerate(lines) if i not in delete_lines]

# 写回文件
with open('../src/core/WordTetrisGame.js', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print(f"删除了 {len(delete_lines)} 行代码")
print(f"原文件: {len(lines)} 行")
print(f"新文件: {len(new_lines)} 行")


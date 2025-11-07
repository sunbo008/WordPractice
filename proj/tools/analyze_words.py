#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
分析文档中的英语单词数量（去重）
"""

import re
import sys
from pathlib import Path

def extract_words(text):
    """提取文本中的所有英语单词"""
    # 使用正则表达式提取单词（只包含字母，包括连字符）
    # 匹配：字母、连字符、撇号（用于缩写如 don't）
    words = re.findall(r"[a-zA-Z]+(?:[-'][a-zA-Z]+)?", text)
    return words

def analyze_document(file_path):
    """分析文档中的单词"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"读取文件错误: {e}")
        return None
    
    # 提取所有单词
    all_words = extract_words(content)
    
    # 转换为小写并去重
    unique_words = set(word.lower() for word in all_words)
    
    # 统计信息
    total_words = len(all_words)
    unique_count = len(unique_words)
    
    return {
        'total_words': total_words,
        'unique_words': unique_count,
        'unique_word_list': sorted(unique_words)
    }

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("用法: python analyze_words.py <文件路径>")
        sys.exit(1)
    
    file_path = sys.argv[1]
    result = analyze_document(file_path)
    
    if result:
        print(f"\n文档分析结果:")
        print(f"=" * 50)
        print(f"总单词数（含重复）: {result['total_words']}")
        print(f"唯一单词数（去重）: {result['unique_words']}")
        print(f"\n唯一单词列表（按字母顺序）:")
        print(f"-" * 50)
        
        # 每行显示10个单词
        words = result['unique_word_list']
        for i in range(0, len(words), 10):
            line_words = words[i:i+10]
            print(' '.join(f"{w:15}" for w in line_words))
        
        print(f"\n" + "=" * 50)


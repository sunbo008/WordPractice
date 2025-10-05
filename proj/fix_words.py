#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Word Tetris 单词库修复工具
移除重复单词并重新平衡难度分布
"""

import json
import sys
from collections import defaultdict

def load_words_data():
    """Load word data"""
    try:
        with open('words.json', 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        print("Error: words.json file not found")
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"Error: JSON format error - {e}")
        sys.exit(1)

def fix_duplicates_and_rebalance(data):
    """Fix duplicate words and rebalance difficulty distribution"""
    print("Starting word bank fix...")
    
    phonics_lessons = data.get('phonicsLessons', {})
    
    # 记录已见过的单词
    seen_words = set()
    words_to_remove = []
    
    # 第一步：移除重复单词（保留第一次出现的）
    print("\nStep 1: Removing duplicate words...")
    
    for lesson_key, lesson in phonics_lessons.items():
        words_to_keep = []
        for i, word_obj in enumerate(lesson.get('words', [])):
            word = word_obj['word'].lower()
            if word in seen_words:
                print(f"  Removing duplicate '{word}' from {lesson_key}")
                words_to_remove.append((lesson_key, i, word))
            else:
                seen_words.add(word)
                words_to_keep.append(word_obj)
        
        # 更新课程的单词列表
        lesson['words'] = words_to_keep
    
    # 第二步：重新平衡难度分布
    print("\nStep 2: Rebalancing difficulty distribution...")
    
    # 收集所有单词并按长度和复杂度重新分配难度
    all_words = []
    for lesson_key, lesson in phonics_lessons.items():
        for word_obj in lesson.get('words', []):
            all_words.append((lesson_key, word_obj))
    
    # 重新分配难度的规则：
    # 难度1：3-4字母的简单单词
    # 难度2：5-7字母的中等单词  
    # 难度3：8+字母的复杂单词
    
    difficulty_changes = []
    
    for lesson_key, word_obj in all_words:
        word = word_obj['word']
        old_difficulty = word_obj['difficulty']
        
        # 根据单词长度和复杂度重新分配难度
        if len(word) <= 4:
            new_difficulty = 1
        elif len(word) <= 7:
            new_difficulty = 2
        else:
            new_difficulty = 3
        
        # 特殊调整：某些复杂单词即使较短也应该是高难度
        complex_words = {
            'important': 3,
            'camera': 3,
            'morning': 2,
            'teacher': 2,
            'mother': 2,
            'father': 2,
            'sister': 2,
            'brother': 2,
            'number': 2,
            'winter': 2,
            'summer': 2,
            'before': 2,
            'about': 2,
            'banana': 2,
            'pizza': 2,
            'bottle': 2,
            'doctor': 2,
            'paper': 2,
            'water': 2,
            'order': 2,
            'corner': 2
        }
        
        if word.lower() in complex_words:
            new_difficulty = complex_words[word.lower()]
        
        if old_difficulty != new_difficulty:
            difficulty_changes.append((lesson_key, word, old_difficulty, new_difficulty))
            word_obj['difficulty'] = new_difficulty
    
    # 报告更改
    if difficulty_changes:
        print(f"  Changed difficulty for {len(difficulty_changes)} words:")
        for lesson_key, word, old_diff, new_diff in difficulty_changes:
            print(f"    {word}: {old_diff} -> {new_diff} ({lesson_key})")
    
    # 第三步：更新元数据
    print("\nStep 3: Updating metadata...")
    
    # 重新计算总单词数
    total_words = sum(len(lesson.get('words', [])) for lesson in phonics_lessons.values())
    
    # 统计难度分布
    difficulty_counts = defaultdict(int)
    for lesson in phonics_lessons.values():
        for word_obj in lesson.get('words', []):
            difficulty_counts[word_obj['difficulty']] += 1
    
    # 更新元数据
    data['metadata']['totalWords'] = total_words
    data['metadata']['version'] = "1.2"
    data['metadata']['lastUpdated'] = "2025-10-05"
    
    if 'fixedIssues' not in data['metadata']:
        data['metadata']['fixedIssues'] = []
    
    data['metadata']['fixedIssues'].extend([
        f"Removed {len(words_to_remove)} duplicate words",
        f"Rebalanced {len(difficulty_changes)} word difficulties",
        f"Final distribution: Diff1={difficulty_counts[1]}, Diff2={difficulty_counts[2]}, Diff3={difficulty_counts[3]}"
    ])
    
    print(f"  Total words after fix: {total_words}")
    print(f"  Difficulty distribution:")
    print(f"    Difficulty 1: {difficulty_counts[1]} words")
    print(f"    Difficulty 2: {difficulty_counts[2]} words") 
    print(f"    Difficulty 3: {difficulty_counts[3]} words")
    
    return data

def save_words_data(data):
    """Save fixed word data"""
    try:
        with open('words.json', 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print("\nFixed words.json saved successfully!")
        return True
    except Exception as e:
        print(f"Error saving words.json: {e}")
        return False

def create_backup():
    """Create backup of original file"""
    try:
        with open('words.json', 'r', encoding='utf-8') as f:
            data = f.read()
        with open('words_backup.json', 'w', encoding='utf-8') as f:
            f.write(data)
        print("Backup created: words_backup.json")
        return True
    except Exception as e:
        print(f"Error creating backup: {e}")
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("Word Tetris Word Bank Fix Tool")
    print("=" * 60)
    
    # 创建备份
    if not create_backup():
        print("Failed to create backup. Exiting...")
        sys.exit(1)
    
    # 加载数据
    data = load_words_data()
    
    # 修复问题
    fixed_data = fix_duplicates_and_rebalance(data)
    
    # 保存修复后的数据
    if save_words_data(fixed_data):
        print("\n" + "=" * 60)
        print("Fix completed successfully!")
        print("Original file backed up as words_backup.json")
        print("Run 'python analyze_words.py' to verify the fix")
        print("=" * 60)
    else:
        print("Fix failed!")
        sys.exit(1)

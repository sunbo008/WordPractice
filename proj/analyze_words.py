#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Word Tetris 单词库分析工具
分析words.json中的单词分布，检查重复和覆盖情况
"""

import json
import sys
from collections import defaultdict, Counter

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

def analyze_word_distribution(data):
    """分析单词分布"""
    print("=" * 60)
    print("Word Tetris Word Bank Analysis Report")
    print("=" * 60)
    
    # 基本信息
    metadata = data.get('metadata', {})
    print(f"Version: {metadata.get('version', 'N/A')}")
    print(f"Description: {metadata.get('description', 'N/A')}")
    print(f"Last Updated: {metadata.get('lastUpdated', 'N/A')}")
    print(f"Total Words: {metadata.get('totalWords', 'N/A')}")
    print()
    
    # 收集所有单词
    all_words = []
    word_sources = {}  # 单词 -> 来源课程列表
    difficulty_stats = defaultdict(list)
    lesson_stats = {}
    
    phonics_lessons = data.get('phonicsLessons', {})
    
    for lesson_key, lesson in phonics_lessons.items():
        lesson_words = lesson.get('words', [])
        lesson_stats[lesson_key] = {
            'phoneme': lesson.get('phoneme', ''),
            'description': lesson.get('description', ''),
            'word_count': len(lesson_words),
            'words': []
        }
        
        for word_obj in lesson_words:
            word = word_obj['word'].lower()
            difficulty = word_obj.get('difficulty', 1)
            meaning = word_obj.get('meaning', '')
            
            all_words.append(word)
            difficulty_stats[difficulty].append(word)
            lesson_stats[lesson_key]['words'].append({
                'word': word,
                'difficulty': difficulty,
                'meaning': meaning
            })
            
            # 记录单词来源
            if word not in word_sources:
                word_sources[word] = []
            word_sources[word].append({
                'lesson': lesson_key,
                'difficulty': difficulty,
                'meaning': meaning
            })
    
    # 统计信息
    total_words = len(all_words)
    unique_words = len(set(all_words))
    duplicate_count = total_words - unique_words
    
    print(f"Statistics Overview:")
    print(f"   Total words: {total_words}")
    print(f"   Unique words: {unique_words}")
    print(f"   Duplicate words: {duplicate_count}")
    print()
    
    # 难度分布
    print("Difficulty Level Distribution:")
    for difficulty in sorted(difficulty_stats.keys()):
        words = difficulty_stats[difficulty]
        unique_in_difficulty = len(set(words))
        print(f"   Difficulty {difficulty}: {len(words)} words (unique: {unique_in_difficulty})")
        
        # 显示前10个单词作为示例
        sample_words = list(set(words))[:10]
        print(f"      Examples: {', '.join(sample_words)}")
        if len(set(words)) > 10:
            print(f"      ... and {len(set(words)) - 10} more words")
    print()
    
    # 检查重复单词
    duplicates = []
    for word, sources in word_sources.items():
        if len(sources) > 1:
            duplicates.append((word, sources))
    
    if duplicates:
        print("WARNING: Found duplicate words:")
        for word, sources in duplicates:
            print(f"   '{word}' appears in:")
            for source in sources:
                print(f"      - {source['lesson']} (difficulty {source['difficulty']}) - {source['meaning']}")
        print()
    else:
        print("SUCCESS: No duplicate words found")
        print()
    
    # 课程统计
    print("Lesson Details:")
    for lesson_key in sorted(lesson_stats.keys()):
        lesson = lesson_stats[lesson_key]
        print(f"   {lesson_key}: {lesson['phoneme']} - {lesson['description']}")
        print(f"      Word count: {lesson['word_count']}")
        
        # 按难度分组
        by_difficulty = defaultdict(list)
        for word_info in lesson['words']:
            by_difficulty[word_info['difficulty']].append(word_info['word'])
        
        for diff in sorted(by_difficulty.keys()):
            words = by_difficulty[diff]
            print(f"      Difficulty {diff}: {len(words)} words - {', '.join(words)}")
        print()
    
    # 级别互斥性检查
    print("Level Exclusivity Check:")
    level_words = {
        1: set(difficulty_stats[1]),
        2: set(difficulty_stats[2]),
        3: set(difficulty_stats[3])
    }
    
    # 检查交集
    intersections = []
    for i in range(1, 4):
        for j in range(i+1, 4):
            intersection = level_words[i] & level_words[j]
            if intersection:
                intersections.append((i, j, intersection))
    
    if intersections:
        print("ERROR: Found level overlaps:")
        for level1, level2, words in intersections:
            print(f"   Difficulty {level1} and {level2} share words: {', '.join(words)}")
    else:
        print("SUCCESS: All levels are exclusive, no overlaps")
    
    print()
    
    # 覆盖率检查
    print("Coverage Analysis:")
    print(f"   Level 1-2 (Difficulty 1): {len(level_words[1])} words")
    print(f"   Level 3-4 (Difficulty 2): {len(level_words[2])} words")
    print(f"   Level 5+ (Difficulty 3): {len(level_words[3])} words")
    
    # 检查是否有足够的单词
    min_words_per_level = 20
    for level, words in level_words.items():
        if len(words) < min_words_per_level:
            print(f"WARNING: Difficulty {level} insufficient words: {len(words)} < {min_words_per_level}")
        else:
            print(f"SUCCESS: Difficulty {level} sufficient words: {len(words)} >= {min_words_per_level}")
    
    print()
    print("=" * 60)
    print("Analysis Complete!")
    
    return {
        'total_words': total_words,
        'unique_words': unique_words,
        'duplicates': duplicates,
        'difficulty_stats': dict(difficulty_stats),
        'level_intersections': intersections
    }

def fix_word_distribution(data):
    """Fix word distribution issues"""
    print("\nStarting word distribution fix...")
    
    # TODO: Add automatic fix logic
    # e.g.: Remove duplicates, reassign difficulty levels
    
    print("Fix functionality to be implemented...")

if __name__ == "__main__":
    data = load_words_data()
    analysis = analyze_word_distribution(data)
    
    # If issues found, ask for fix
    if analysis['duplicates'] or analysis['level_intersections']:
        print("\nIssues found. Fix them? (y/n): ", end="")
        # fix_word_distribution(data)  # Temporarily commented out

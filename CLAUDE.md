# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 语言配置 / Language Configuration

**重要：请始终使用中文进行交流和回复。** 这是一个中文教育项目，所有交互都应该使用中文，除非涉及技术术语或代码本身需要英文。

IMPORTANT: Always communicate in Chinese. This is a Chinese educational project and all interactions should be in Chinese unless dealing with technical terms or code itself.

## Repository Overview

WordPractice is a comprehensive English phonetics learning system designed for Chinese 6th-grade students. This is a **documentation-only repository** containing educational materials for learning 44 International Phonetic Alphabet (IPA) sounds through 880 carefully selected words over a 16-week curriculum.

## Project Architecture

### Core Structure
This repository contains structured learning materials organized around:
- **44 IPA phonetic symbols** (12 monophthongs + 8 diphthongs + 24 consonants)
- **880 vocabulary words** (20 words per phonetic symbol)
- **16-week learning schedule** based on Ebbinghaus forgetting curve
- **Tiered learning approach**: 240 core words + 640 extension words

### Key Document Categories

#### Primary Learning Materials
- `phonics_grade6_vowels.md` - Monophthongs (12 phonemes, 240 words) - Weeks 1-5
- `phonics_grade6_diphthongs.md` - Diphthongs (8 phonemes, 160 words) - Weeks 6-8
- `phonics_grade6_consonants.md` - Consonants (24 phonemes, 480 words) - Weeks 9-14
- `schwa_words.md` - Specialized schwa /ə/ practice

#### Planning & Navigation
- `complete_daily_schedule.md` - Complete 16-week daily learning plan (primary reference)
- `detailed_daily_plan.md` - Learning methodology overview
- `phonics_grade6_index.md` - Master index of all phonemes and progress tracking
- `document_index.md` - Complete documentation navigation guide

#### Content Standards
- `word_learning_prompt.md` - Content creation guidelines and quality standards

## Content Standards & Guidelines

### Phonetic Standards
- **British English pronunciation** (IPA standard)
- Age-appropriate vocabulary for 11-12 year olds
- Systematic progression from simple to complex phonemes
- Each word includes: IPA notation, Chinese translation, example sentence with translation

### Learning Methodology
- **Scientific foundation**: Based on memory science and Ebbinghaus forgetting curve
- **Spaced repetition**: 1→3→7→15 day review intervals
- **Daily sessions**: 15-20 minutes optimized for elementary attention spans
- **Tiered approach**: Core vocabulary mastery + extension vocabulary recognition

### Document Format Standards
Learning materials follow consistent table structure:
```
| 序号 | 单词 | 音标 | 中文释义 | 例句 | 例句中文 |
|------|------|------|----------|------|----------|
```

## Git配置说明

### Commit消息规范
项目已配置中文commit消息模板：
- 使用 `.gitmessage` 作为commit消息模板
- 支持中文编码（UTF-8）
- 遵循约定式提交格式：`类型: 简短描述`

### 常用提交类型
- `feat:` 新功能
- `fix:` 修复问题
- `docs:` 文档更新
- `style:` 格式调整
- `refactor:` 代码重构
- `test:` 测试相关
- `chore:` 工具和配置

## Development Guidelines

### Content Creation
When creating new learning materials, follow `word_learning_prompt.md` standards:
- Vocabulary selection: high-frequency, age-appropriate words
- Accurate British English IPA notation with proper stress marking
- Simple 5-8 word example sentences
- Natural, contextually appropriate Chinese translations

### Documentation Updates
- Maintain consistency with existing format and quality standards
- Update relevant index files when adding new content
- Ensure all cross-references remain valid
- Follow the established learning progression sequence

### Quality Assurance
- Verify phonetic accuracy against British English standards
- Confirm age-appropriateness for 6th-grade students
- Test comprehension level of example sentences
- Validate Chinese translations for clarity and naturalness

## Repository Navigation

For comprehensive orientation, always start with `document_index.md` which provides complete navigation guidance. The `complete_daily_schedule.md` serves as the primary curriculum reference with day-by-day learning objectives.

## Educational Philosophy

This system prioritizes:
- **Systematic coverage**: 100% phoneme coverage with sufficient practice vocabulary
- **Scientific methodology**: Evidence-based memory retention techniques
- **Cultural adaptation**: Content suitable for Chinese learning context
- **Sustainable learning**: Age-appropriate session lengths and difficulty progression
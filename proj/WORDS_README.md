# Word Tetris 单词库说明

## 📚 单词库概述

本项目的单词库已重新设计，基于 `phonics_methods` 中的15天学习计划和四个重点音标专项练习，包含155个核心单词，完全覆盖自然拼读学习内容。

## 📁 文件结构

### 主要文件
- `words.json` - 主单词库文件（JSON格式）
- `vocabulary.js` - 单词库管理类
- `WORDS_README.md` - 本说明文件

## 🎯 单词来源

### Phonics Methods 覆盖
单词库完全覆盖以下学习内容：

#### 第1-4天（第1周）
- **第1天**: /i:/ 长元音 - see, tree, green, sleep, sweet
- **第2天**: /ʊ/ 短元音 - book, look, good, put, pull  
- **第3天**: /u:/ 长元音 - moon, cool, school, blue, zoo
- **第4天**: /ɑ:/ 长元音 - car, star, park, arm, heart

#### 第6-9天（第2周）
- **第6天**: /ɪ/ 短元音 - big, sit, fish, milk, swim
- **第7天**: /e/ 短元音 - red, pen, bed, get, help
- **第8天**: /æ/ 短元音 - cat, bag, hat, sad, can
- **第9天**: /ɒ/ 短元音 - hot, dog, box, clock, stop

#### 第11-14天（第3周）
- **第11天**: /ʌ/ 短元音 - cup, sun, run, fun, bus
- **第12天**: /ɔ:/ 长元音 - ball, call, door, four, walk
- **第13天**: /ɜ:/ 长元音 - bird, girl, word, work, turn
- **第14天**: /ə/ 中性元音 - about, banana, sofa, camera, pizza

#### 专项练习
- **er结尾单词**: teacher, mother, father, sister, brother, water, paper, number, winter, summer

## 🎮 游戏配置

### 难度等级
1. **初级** (Level 1-2): 难度1单词，1个缺失字母
2. **中级** (Level 3-4): 难度1-2单词，1-2个缺失字母  
3. **高级** (Level 5+): 所有难度单词，2-3个缺失字母

### 单词分类
- **颜色**: red, green, blue
- **动物**: cat, dog, bird, fish
- **家庭**: mother, father, sister, brother
- **学校**: teacher, school, book, pen, paper
- **身体**: arm, heart
- **自然**: tree, sun, moon, star, water
- **动作**: see, look, sleep, run, walk, swim, work, help, turn, stop
- **物品**: cup, bag, hat, box, clock, door, ball, sofa, camera
- **食物**: banana, pizza, milk
- **形容词**: big, hot, cool, good, sweet, sad, fun
- **数字**: four, number
- **时间**: winter, summer
- **地点**: park, zoo, school
- **交通**: car, bus

## 📊 数据统计

- **总单词数**: 155个
- **音标覆盖**: 16个核心音标（新增4个重点音标专项练习）
- **难度分级**: 3个等级
- **分类标签**: 20个类别（新增5个分类）
- **新增内容**:
  - 音标/æ/专项练习: 20个单词
  - 音标/e/专项练习: 20个单词
  - 音标/ɔ:/专项练习: 20个单词
  - 音标/ɒ/专项练习: 20个单词

## 🔧 技术特性

### JSON结构
```json
{
  "metadata": {
    "version": "1.0",
    "totalWords": 75,
    "source": "phonics_methods 15天学习计划"
  },
  "phonicsLessons": {
    "day1": {
      "phoneme": "/i:/",
      "words": [...]
    }
  },
  "gameConfig": {
    "difficultyLevels": {...},
    "categories": {...}
  }
}
```

### 单词对象结构
```javascript
{
  "word": "TREE",
  "phonetic": "[triː]", 
  "meaning": "树",
  "difficulty": 1
}
```

## 🚀 使用方法

### 加载单词库
```javascript
const vocabularyManager = new VocabularyManager();
// 自动异步加载 words.json
```

### 获取随机单词
```javascript
const word = vocabularyManager.getRandomWord(level, isEndChallenge);
```

### 按难度筛选
```javascript
const words = vocabularyManager.getVocabularyForLevel(level);
```

## 📈 扩展性

### 添加新单词
1. 编辑 `words.json` 文件
2. 在对应的 `phonicsLessons` 中添加单词
3. 更新 `metadata.totalWords` 计数

### 添加新分类
1. 在 `gameConfig.categories` 中添加新分类
2. 确保单词包含对应的分类标签

## 🔄 版本历史

- **v1.0** (2025-10-05): 初始版本，基于phonics_methods内容创建

## 📞 维护说明

- 单词库与 `phonics_methods` 学习内容保持同步
- 支持热更新，无需重启游戏
- **已移除备用单词库**：JSON加载失败时直接显示错误信息
- 所有单词均包含音标和中文释义
- 提供详细的错误诊断和用户友好的错误提示

## 📝 更新日志

### v1.2 (2025-10-05)
- ❌ **移除备用单词库**: 不再使用硬编码的15个备用单词
- ✅ **优化错误处理**: JSON加载失败时显示用户友好的错误弹窗
- ✅ **详细错误信息**: 显示HTTP状态码、错误消息和解决建议
- ✅ **停止无限重试**: 加载失败时不再无限重试生成单词
- ✅ **控制台日志**: 提供详细的错误诊断信息

### v1.1 (2025-10-05)
- ✅ **新增80个单词**: 来自音标专项练习_四个重点音标.md
- ✅ **新增4个专项练习课程**:
  - `special_ae_phonics`: 音标/æ/专项练习 (20个单词)
  - `special_e_phonics`: 音标/e/专项练习 (20个单词)
  - `special_or_phonics`: 音标/ɔ:/专项练习 (20个单词)
  - `special_o_phonics`: 音标/ɒ/专项练习 (20个单词)
- ✅ **扩展分类系统**: 新增5个分类标签
  - clothing（服装）: hat, cap
  - professions（职业）: teacher, doctor
  - sports（运动）: sport, score
  - directions（方向）: back, north, top, corner
  - common_words（常用词）: yes, not, more, your, for, lot
- ✅ **更新元数据**: 总单词数从75个增加到155个
- ✅ **优化难度分布**: 保持合理的难度梯度

### v1.0 (2025-10-05)
- 🎉 初始版本发布
- 📚 基于phonics_methods 15天学习计划
- 🎯 包含75个核心单词，覆盖12个音标

---

**注意**: 本单词库专为Word Tetris游戏设计，完全符合游戏设计文档要求，确保教育价值和游戏体验的完美结合。

# 单词库使用说明

## 📁 目录结构

```
words/
├── daily-phonics/      # 按天学习音标课程
├── special-practice/   # 专项强化练习
└── grade-based/        # 按年级分类
    ├── primary/        # 小学词汇
    ├── middle/         # 初中词汇
    └── high/           # 高中词汇
```

## 🎯 自动发现机制

系统会**自动扫描并发现**以下文件：

### 1. daily-phonics 目录
- 自动扫描：`day01.json` ~ `day50.json`
- 文件不存在时自动跳过
- 支持任意数量的课程文件

### 2. special-practice 目录
- 自动扫描常见的音标练习文件，包括：
  - 元音练习：`ae-practice.json`, `e-practice.json`, `i-practice.json` 等
  - 辅音练习：`th-practice.json`, `sh-practice.json`, `ch-practice.json` 等
  - 其他练习：`vowels-practice.json`, `consonants-practice.json` 等
  - 数字编号：`special01.json` ~ `special20.json`

### 3. grade-based 目录
- 自动扫描：`grade1-term1.json` ~ `grade12-term2.json`
- 按目录分类：
  - `primary/` - 小学1-6年级
  - `middle/` - 初中7-9年级  
  - `high/` - 高中10-12年级

## ✨ 如何添加新的单词文件

### 方式一：使用标准命名（推荐）

直接在对应目录下创建符合命名规范的 JSON 文件，系统会自动发现：

```bash
# 添加新的日课程
words/daily-phonics/day16.json
words/daily-phonics/day17.json

# 添加专项练习
words/special-practice/oo-practice.json
words/special-practice/ph-practice.json

# 添加年级词汇
words/grade-based/primary/grade3-term1.json
words/grade-based/middle/grade7-term1.json
```

### 方式二：使用自定义命名

如果需要使用自定义文件名，可以修改 `src/core/vocabulary-config-loader.js` 中的扫描列表：

```javascript
// 在 scanSpecialPractice() 中添加新的文件名
const potentialFiles = [
    // ... 现有文件 ...
    'my-custom-practice',  // 添加你的自定义文件名
];
```

## 📋 JSON 文件格式

### 标准格式

```json
{
  "metadata": {
    "id": "day01",
    "name": "Day 1 - 长元音 /i:/",
    "phoneme": "/i:/",
    "description": "学习/i:/的发音和拼读规则",
    "category": "daily-phonics",
    "difficulty": "beginner",
    "wordCount": 10,
    "lastUpdated": "2025-10-09"
  },
  "words": [
    {
      "word": "see",
      "phonetic": "[siː]",
      "meaning": "看见",
      "difficulty": 1
    }
  ]
}
```

### 必需字段

- `metadata.id` - 唯一标识符
- `metadata.name` - 显示名称
- `words` - 单词数组

### 可选字段

- `metadata.phoneme` - 音标符号
- `metadata.description` - 描述信息
- `metadata.difficulty` - 难度级别（beginner/intermediate/advanced）
- `metadata.wordCount` - 单词数量（可自动计算）

## 🔄 更新流程

1. **创建/添加 JSON 文件** → 放到对应目录
2. **刷新浏览器** → 系统自动扫描发现
3. **在设置页面查看** → 新文件会自动出现在列表中
4. **选择并启用** → 即可使用

## 💡 提示

- ✅ 无需修改任何代码，只需添加 JSON 文件
- ✅ 文件命名遵循规范即可自动识别
- ✅ 不存在的文件会自动跳过，不影响系统运行
- ✅ 支持动态扩展，随时添加新内容

## 📊 当前文件统计

系统会在浏览器控制台输出扫描结果：

```
🔍 扫描 daily-phonics 目录...
  ✓ 发现文件: day01.json (Day 1 - 长元音 /i:/)
  ✓ 发现文件: day02.json (Day 2 - 短元音 /ʌ/)
  ...
✅ daily-phonics 扫描完成，发现 35 个文件
```

打开浏览器控制台（F12）即可查看详细的扫描日志。


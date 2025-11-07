# 课外书词汇 JSON 生成 Prompt

## 📝 使用方法

将下面的 prompt 和章节文本一起提交给 AI（如 GPT-4、Claude）。

---

## 🚀 快速参考（三步流程）

```bash
# 第一步：生成新 JSON
# 使用 AI + prompt 模板 + 全局词汇表

# 第二步：验证检查（强制）
# 2.1 验证单词数量
node -e "const d=require('./<新json路径>'); console.log('wordCount:', d.metadata.wordCount, '实际:', d.words.length, d.metadata.wordCount===d.words.length?'✅':'❌');"

# 2.2 验证去重
node proj/words/validate-deduplication.js <新json路径>

# 第三步：更新全局词汇表
node proj/words/generate-global-vocabulary.js
```

**关键提醒**：
- ⚠️ **最常见错误**：wordCount 与实际单词数量不一致，必须每次检查！
- ⚠️ 第二步发现重复时，必须手动删除重复单词并更新 wordCount
- ⚠️ 删除后必须重新运行第二步验证，直到通过
- ⚠️ 只有第二步所有验证通过后，才能执行第三步

---

## 🤖 Prompt 模板

```
请根据提供的章节文本，生成一个课外书词汇学习 JSON 文件。

输入信息：
- 系列前缀：mth（神奇树屋）/ hp（哈利波特）/ ort（牛津阅读树）
- 系列名称：Magic Tree House / Harry Potter / Oxford Reading Tree
- 书籍编号：[如 1]
- 章节编号：[如 1]
- 书名：[如 Dinosaurs Before Dark]
- 章节标题：[如 Into the Woods]
- 章节文本：[粘贴原文]

输出要求：

生成 JSON 文件，包含：

1. metadata（元数据）：
{
  "id": "{前缀}-book{XX}-ch{YY}",  // 如 "mth-book01-ch01"
  "name": "第X本《书名》- 第Y章",
  "description": "章节标题（中文翻译）",
  "chapterTitle": "章节标题",
  "bookTitle": "书名",
  "bookNumber": X,
  "chapterNumber": Y,
  "series": "系列名称",
  "category": "extracurricular-books",
  "difficulty": "beginner/intermediate/advanced",
  "wordCount": 实际单词数量,
  "recommendedAge": "6-9/8-12/10-15",
  "lastUpdated": "YYYY-MM-DD",
  
  "chapterSummary": {
    "brief": "1-2句概述（原创，不要复制原文）",
    "setting": "故事发生地点",
    "mainCharacters": ["人物1", "人物2"],
    "keyThemes": ["主题1", "主题2"]
  },
  
  "story": "用自己的话写一段章节概述（100-150词，原创内容，不要复制原文）"
}

2. words 数组（提取章节中的全部词汇）：
[
  {
    "word": "单词",
    "phonetic": "[国际音标]",
    "meaning": "中文释义",
    "difficulty": 1-5
  }
]

词汇提取要求：
- **提取章节文本中出现的所有不同单词**
- 排除超基础词汇：the, a, an, is, are, was, were, be, to, of, and, in, on, at, for, with, from, by, as
- **必须去重**：生成前检查该系列已有的所有 JSON 文件，如果单词已经在之前章节出现过，就不要再添加
- 每个单词只保留一次（同一章节内去重）
- 包含所有实词：名词、动词、形容词、副词、数词等

难度分级：
1 = 基础（see, tree）
2 = 常用（woods, climb）
3 = 进阶（mysterious, discover）
4 = 高级（Pennsylvania, disappeared）
5 = 专业（archaeological）

重要注意事项：
1. **全部提取**：提取章节文本中出现的所有不同单词（除超基础词汇外），不要只选择部分。

2. **🚫 全局去重（强制）**：生成前**必须**检查 `proj/words/GLOBAL_VOCABULARY.csv`（全局词汇表）。
   - ⚠️ 任何在词汇表中出现的单词都**不得添加**到新 JSON 中
   - 📋 提供给 AI 时，必须附上完整的 GLOBAL_VOCABULARY.csv 内容
   - 💡 AI 需要读取 CSV 的所有行，从第二列提取所有单词，建立已有单词列表
   - ✅ 生成后需人工抽查：随机选 10 个单词，确认不在全局词汇表中

3. **章节内去重**：同一个单词在章节中即使出现多次，也只添加一次到 words 数组。

4. **更新词汇表**：生成新 JSON 后，必须运行 `node proj/words/generate-global-vocabulary.js` 更新全局词汇表。

5. **原创内容**：story 和 chapterSummary 必须是原创内容，用自己的话概括，不要复制原文。

6. **⚠️ 单词数量验证（强制）**：
   - 生成 JSON 后，必须验证 `metadata.wordCount` 与 `words` 数组的实际长度一致
   - 计算方法：`words.length` = 实际单词数量
   - 如果不一致，必须修正 `wordCount` 的值
   - 这是常见错误，必须每次检查！

请生成完整的 JSON 文件。
```

---

## 📋 快速示例

**输入**：
```
系列前缀：mth
系列名称：Magic Tree House
书籍编号：1
章节编号：1
书名：Dinosaurs Before Dark
章节标题：Into the Woods
章节文本：[粘贴 B01C01_Into_the_Woods.txt 的内容]
```

**输出**：
```json
{
  "metadata": {
    "id": "mth-book01-ch01",
    "name": "第1本《Dinosaurs Before Dark》- 第1章",
    "description": "Into the Woods（进入森林）",
    "chapterTitle": "Into the Woods",
    "bookTitle": "Dinosaurs Before Dark",
    "bookNumber": 1,
    "chapterNumber": 1,
    "series": "Magic Tree House",
    "category": "extracurricular-books",
    "difficulty": "beginner",
    "wordCount": 30,
    "recommendedAge": "6-9",
    "lastUpdated": "2025-11-07",
    
    "chapterSummary": {
      "brief": "Jack and Annie discover a mysterious tree house filled with books.",
      "setting": "Woods near Frog Creek, Pennsylvania",
      "mainCharacters": ["Jack", "Annie"],
      "keyThemes": ["Discovery", "Adventure"]
    },
    
    "story": "Jack and Annie were walking home when Annie thought she saw a monster..."
  },
  "words": [...]
}
```

---

## 💾 文件命名

保存为：`{系列目录}/book{XX}-ch{YY}.json`

示例：
- `magic-tree-house/book01-ch01.json`
- `harry-potter/book01-ch01.json`
- `oxford-reading-tree/stage01-book01.json`（牛津阅读树用 stage）

---

## ✅ 生成前检查清单

生成新章节的 JSON 之前，必须完成以下步骤：

### 1. 全局去重检查

**提供给 AI 的指令**（必须执行）：
```
⚠️ 重要：生成前必须执行去重检查！

在生成新的 JSON 文件之前，请参考全局词汇表 CSV：proj/words/GLOBAL_VOCABULARY.csv

🚫 强制要求：
新生成的 words 数组中，任何在全局词汇表中出现的单词都必须排除，不得添加。

全局词汇表路径：proj/words/GLOBAL_VOCABULARY.csv
CSV 格式说明：
- 第一列：来源文件路径
- 第二列：该文件包含的所有单词（逗号分隔）

请读取 CSV 文件的所有行，提取第二列的所有单词，建立一个完整的已有单词列表。

当前词库包含：100 个文件，815 个不同单词

[粘贴 GLOBAL_VOCABULARY.csv 的完整内容]

验证方法：
1. 从 CSV 提取所有已有单词（读取所有行的第二列）
2. 从章节文本提取所有单词
3. 逐个检查是否在已有单词列表中
4. 只保留不在列表中的新单词
5. 排除超基础词汇（the, a, an, is, are, was, were, be, to, of, and, in, on, at, for, with, from, by, as）
```

**全局词汇表说明**：

**GLOBAL_VOCABULARY.csv**（唯一词汇表）
- 文件位置：`proj/words/GLOBAL_VOCABULARY.csv`
- 格式：CSV 表格
  - 第一列：来源文件路径
  - 第二列：该文件的所有单词（逗号分隔）
- 示例：
  ```csv
  来源文件,单词列表
  "daily-phonics/day01.json","see,tree,three,free,green,sleep,sweet,meet,feet,keep"
  "daily-phonics/day02.json","like,bike,kite,time,white,write,five,nine"
  ```
- 用途：
  - 提供给 AI 进行去重检查
  - 追踪每个单词来自哪个文件
  - 可以用 Excel 打开，方便查看和分析
- 维护：自动生成，每次添加新 JSON 后运行生成脚本

### 2. 完整性检查

**生成后验证**：
- [ ] 提取了章节中的所有不同单词（除超基础词外）
- [ ] 词汇数量合理（一般一个章节有 100-200 个不同的实词）
- [ ] 没有遗漏任何实词（名词、动词、形容词、副词等）
- [ ] 已经排除了跨章节重复的单词
- [ ] 难度分级合理分布

**如果发现遗漏**：
重新提交 prompt，明确要求：
```
请重新生成，要求：
1. 逐词扫描整个章节文本
2. 提取所有不同的实词（名词、动词、形容词、副词等）
3. 排除这些超基础词：the, a, an, is, are, was, were, be, to, of, and, in, on, at, for, with, from, by, as
4. 排除全局词汇表中的单词：[粘贴 GLOBAL_VOCABULARY.txt]
5. 确保每个单词只出现一次
```

---

## 🔄 维护全局词汇表

### 使用 Node.js 脚本（推荐）

**最简单的方法**：

```bash
# 生成或更新全局词汇表
node proj/words/generate-global-vocabulary.js
```

这个脚本会：
- 自动扫描 `proj/words` 目录下的所有 JSON 文件
- 提取所有单词
- 生成 `GLOBAL_VOCABULARY.csv`
  - 格式：第一列是文件路径，第二列是该文件的所有单词（逗号分隔）
- 显示统计信息：
  - 总文件数、不同单词数
  - 重复单词数量（在多个文件中出现的单词）
  - 前 10 个重复最多的单词

**首次运行**：
```bash
cd D:/workspace/WordPractice
node proj/words/generate-global-vocabulary.js

# 输出示例：
# 📁 找到 100 个 JSON 文件
# ✅ 提取到 815 个不同的单词
# 💾 CSV 已保存到: GLOBAL_VOCABULARY.csv
# ⚠️  前 10 个重复最多的单词: fish (在 7 个文件中)...
```

**每次添加新 JSON 后**：
重新运行相同命令即可，脚本会自动更新 CSV。

### 手动方法（备选）

如果没有 Node.js 环境，可以使用命令行：

```bash
# Windows PowerShell
Get-ChildItem -Path proj\words -Recurse -Filter *.json | 
  ForEach-Object { (Get-Content $_.FullName | ConvertFrom-Json).words.word } | 
  Where-Object { $_ } | 
  Sort-Object -Unique | 
  Out-File proj\words\GLOBAL_VOCABULARY.txt -Encoding utf8

# Linux/Mac (需要安装 jq)
find proj/words -name "*.json" -exec jq -r '.words[].word' {} \; | 
  sort -u > proj/words/GLOBAL_VOCABULARY.txt
```

### 验证词汇表

```bash
# 查看 CSV 文件前 5 行
head -n 5 proj/words/GLOBAL_VOCABULARY.csv

# 查看某个文件包含哪些单词
grep "daily-phonics/day01.json" proj/words/GLOBAL_VOCABULARY.csv

# 查看所有包含特定单词的文件（例如 sun）
grep -i "sun" proj/words/GLOBAL_VOCABULARY.csv
```

### 验证新生成的 JSON（检查是否有重复）

```bash
# 验证某个JSON文件的单词是否与全局词汇表有重复
node -e "
const fs = require('fs');
const jsonPath = 'proj/words/extracurricular-books/magic-tree-house/book01-ch01.json';
const globalWords = new Set(fs.readFileSync('proj/words/GLOBAL_VOCABULARY.txt', 'utf8').split('\\n').filter(Boolean));
const newWords = require('./' + jsonPath).words.map(w => w.word);

// 找出重复的单词
const duplicates = newWords.filter(word => {
  // 从全局词汇表中临时移除当前文件的单词（因为全局词汇表已包含此文件）
  const tempGlobal = new Set([...globalWords].filter(w => !newWords.includes(w)));
  return tempGlobal.has(word);
});

if (duplicates.length > 0) {
  console.log('❌ 发现重复单词（这些单词在其他课程中已存在）:');
  console.log(duplicates.join(', '));
} else {
  console.log('✅ 未发现重复单词');
}
"
```

---

## 📊 标准工作流程（按顺序执行）

### 第一步：生成新 JSON 文件

```bash
# 1.1 查看当前全局词汇表 CSV
cat proj/words/GLOBAL_VOCABULARY.csv
# 或在编辑器中打开，复制全部内容

# 1.2 准备 prompt
# 使用文档开头的 Prompt 模板
# 将 GLOBAL_VOCABULARY.csv 的完整内容粘贴到 prompt 中

# 1.3 提交给 AI 生成 JSON
# AI 需要：
# - 读取 CSV 的所有行
# - 从第二列提取所有已有单词
# - 根据章节文本生成 JSON
# - 自动排除已有单词

# 1.4 保存生成的 JSON 文件
# 例如：proj/words/extracurricular-books/magic-tree-house/book01-ch02.json
```

### 第二步：验证检查（强制执行）

```bash
# 2.1 验证单词数量是否一致
node -e "const data = require('./proj/words/extracurricular-books/magic-tree-house/book01-ch02.json'); console.log('metadata.wordCount:', data.metadata.wordCount); console.log('实际单词数量:', data.words.length); console.log('是否一致:', data.metadata.wordCount === data.words.length ? '✅ 一致' : '❌ 不一致，需要修正');"

# 2.2 运行去重检查工具
node proj/words/validate-deduplication.js proj/words/extracurricular-books/magic-tree-house/book01-ch02.json

# 2.3 查看检查结果
# ✅ 如果显示"验证通过"，继续第三步
# ❌ 如果发现重复单词，会列出所有重复的单词
```

**如果发现问题**：

**A. 单词数量不一致**：
```bash
# 如果显示：❌ 不一致，需要修正
# 1. 打开 JSON 文件
# 2. 更新 metadata.wordCount 为实际的 words.length
# 3. 保存文件
# 4. 重新运行第一个验证命令确认
```

**B. 发现重复单词**：
```bash
# 例如，如果显示：
# ❌ 发现重复单词：sun, tree, book

# 则需要：
# 1. 打开 JSON 文件
# 2. 在 words 数组中找到并删除这些重复单词
# 3. 更新 metadata.wordCount 减去删除的数量
# 4. 保存文件
# 5. 重新运行验证工具确认
```

### 第三步：更新全局词汇表

```bash
# 3.1 运行全局词汇表生成工具
node proj/words/generate-global-vocabulary.js

# 3.2 查看更新结果
# 输出会显示：
# ✅ 提取到 XXX 个不同的单词
# 前 20 个单词: [列表]

# 3.3 确认新增了多少单词
# 对比更新前后的数量
```

---

## 🔍 完整示例（实际操作）

### 场景：生成 Magic Tree House Book 1 - Chapter 2

```bash
# ========== 第一步：生成新 JSON ==========

# 1. 查看全局词汇表 CSV
cat proj/words/GLOBAL_VOCABULARY.csv
# 当前：100 个文件，815 个不同单词

# 2. 将 CSV 完整内容复制，准备 prompt

# 3. 使用 AI 生成 book01-ch02.json
# AI 会：
# - 读取 CSV 所有行，从第二列提取所有已有单词
# - 根据章节文本提取新单词
# - 自动排除已有的 815 个单词

# 4. 保存文件到：
# proj/words/extracurricular-books/magic-tree-house/book01-ch02.json


# ========== 第二步：去重检查 ==========

node proj/words/validate-deduplication.js proj/words/extracurricular-books/magic-tree-house/book01-ch02.json

# 输出示例 1（验证通过）:
# 🔍 正在验证: book01-ch02.json
# 📚 全局词汇表: 815 个单词
# 📖 新文件单词: 65 个
# ✅ 验证通过！未发现重复单词

# 输出示例 2（发现重复）:
# 🔍 正在验证: book01-ch02.json
# 📚 全局词汇表: 815 个单词
# 📖 新文件单词: 68 个
# ❌ 发现重复单词！这些单词在其他课程中已经出现过（共 3 个）：
#    sun, tree, book
# ⚠️  建议：从 words 数组中删除这些重复的单词

# 如果发现重复，打开 book01-ch02.json 手动删除这些单词
# 然后重新运行验证，直到通过


# ========== 第三步：更新全局词汇表 ==========

node proj/words/generate-global-vocabulary.js

# 输出：
# 🔍 扫描词库目录...
# 📁 找到 101 个 JSON 文件
# 📖 提取单词...
# ✅ 提取到 880 个不同的单词（新增 65 个）
# 💾 已保存到: proj/words/GLOBAL_VOCABULARY.txt

# ========== 完成！ ==========
```

---

## ⚠️ 注意事项

### 必须按顺序执行

1. **不要跳过第二步**：验证检查是强制步骤，确保数据正确
2. **不要先更新词汇表**：必须先通过所有验证后，才能更新全局词汇表
3. **发现问题必须修正**：即使 AI 说已经检查了，仍需人工验证

### 常见错误（必须避免）

❌ **错误1：单词数量不一致**
```
metadata.wordCount: 89
实际单词数量: 80
❌ 这是最常见的错误！
```
**原因**：生成过程中统计错误，或删除了单词但忘记更新 wordCount
**解决**：生成后必须验证，确保一致

❌ **错误2：跳过验证步骤**
```
生成 JSON → 直接更新词汇表 → 发现问题但已经来不及了
```

✅ **正确流程**：
```
生成 JSON 
  ↓
验证单词数量（metadata.wordCount === words.length）
  ↓
验证去重（无重复单词）
  ↓
所有验证通过
  ↓
更新全局词汇表
```
# Word Tetris 词库管理系统

## 📁 目录结构

```
words/
├── config-v2.json           # 词库配置文件（自动生成）
├── daily-phonics/           # 按天学习音标
│   ├── day01.json
│   ├── day02.json
│   └── ...
├── special-practice/        # 专项强化练习
│   ├── ae-practice.json
│   ├── e-practice.json
│   └── ...
└── grade-based/             # 按年级分类
    ├── primary/             # 小学
    ├── middle/              # 初中
    └── high/                # 高中
```

---

## 🔄 运行时动态配置系统

### 核心原理

配置**在运行时自动生成**，无需任何手动操作！

系统会自动：
1. 扫描 `daily-phonics/` 目录，读取所有 JSON 文件
2. 扫描 `special-practice/` 目录，读取所有 JSON 文件
3. 扫描 `grade-based/` 目录（如果文件存在）
4. 从每个 JSON 文件的 `metadata` 字段提取配置信息
5. **运行时动态生成完整配置对象**

### 使用方法

#### 1. 添加新课程

**只需一步：创建 JSON 文件**

在对应目录下创建新的 JSON 文件，例如 `day15.json`：

```json
{
  "metadata": {
    "id": "day15",
    "name": "Day 15 - 复习测试",
    "phoneme": "综合",
    "description": "综合复习前14天的音标",
    "day": 15,
    "category": "daily-phonics",
    "difficulty": "intermediate",
    "wordCount": 20,
    "lastUpdated": "2025-10-06"
  },
  "words": [
    {"word": "example", "phonetic": "[ɪɡˈzɑːmpl]", "meaning": "例子", "difficulty": 2},
    ...
  ]
}
```

**刷新页面 - 完成！** 新课程会自动出现在设置页面中。

#### 2. 修改课程信息

只需修改对应的 JSON 文件的 `metadata` 字段，**刷新页面即可**。

#### 3. 删除课程

直接删除对应的 JSON 文件，**刷新页面即可**。

---

## 📝 JSON 文件格式规范

### 完整结构

每个词库 JSON 文件应包含以下结构：

```json
{
  "metadata": {
    "id": "唯一标识符",
    "name": "显示名称",
    "phoneme": "音标符号",
    "description": "课程描述",
    "category": "分类标识",
    "difficulty": "难度等级",
    "wordCount": 单词数量,
    "lastUpdated": "更新日期"
  },
  "lesson": {
    "pronunciationTips": [
      "发音要领1",
      "发音要领2"
    ],
    "phonicsPatterns": [
      "拼读规律1",
      "拼读规律2"
    ],
    "practiceSteps": [
      "练习步骤1",
      "练习步骤2"
    ]
  },
  "words": [
    {
      "word": "单词",
      "phonetic": "[音标]",
      "meaning": "中文意思",
      "difficulty": 难度级别(1-3)
    }
  ]
}
```

### Metadata 字段说明

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `id` | string | ✅ | 唯一标识符，用于 localStorage 保存 |
| `name` | string | ✅ | 显示在设置页面的课程名称 |
| `phoneme` | string | ⚠️ | 音标符号（音标课程必需） |
| `description` | string | ✅ | 课程简短描述 |
| `category` | string | ✅ | 分类：daily-phonics / special-practice / grade-based |
| `difficulty` | string | ✅ | 难度：beginner / intermediate / advanced |
| `wordCount` | number | ✅ | 单词数量（会自动计算） |
| `lastUpdated` | string | ⚠️ | 最后更新日期 |

### Lesson 字段说明（学习内容）

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `pronunciationTips` | array | ⚠️ | 发音要领列表 |
| `phonicsPatterns` | array | ⚠️ | 拼读规律列表 |
| `practiceSteps` | array | ⚠️ | 练习步骤列表 |

**注意**：`lesson` 字段为可选，主要用于每日音标课程的学习页面展示。

---

## 🛠️ 自动化工作流

### 开发流程（超级简单）

```bash
# 1. 创建或修改词库 JSON 文件
vim words/daily-phonics/day15.json

# 2. 刷新浏览器 - 完成！
# 访问 http://localhost:8090/settings-v2.html
```

**就这么简单！** 无需任何额外步骤。

### 测试验证

```bash
# 1. 启动本地服务器
cd proj
python -m http.server 8090

# 2. 打开测试页面查看配置加载
http://localhost:8090/test-runtime-config.html

# 3. 打开设置页面测试功能
http://localhost:8090/settings-v2.html
```

---

## 🎯 优势

### ✅ 运行时配置的好处

1. **零配置**：添加新课程只需创建 JSON 文件，刷新即可
2. **即时生效**：无需运行任何脚本，修改立即可见
3. **零依赖**：不需要 Python 环境
4. **自动同步**：配置始终反映实际文件状态
5. **减少错误**：无需手动操作，避免人为失误
6. **灵活管理**：可以随时添加/删除/修改课程
7. **版本控制友好**：只需管理 JSON 文件

### ⚠️ 注意事项

1. **保持 metadata 完整**
   - 缺失字段会导致显示异常
   - 建议使用模板创建新文件

2. **文件命名规范**
   - 每日课程：`day01.json`, `day02.json` 等
   - 专项练习：使用描述性名称，如 `ae-practice.json`
   - 年级分类：如 `grade3-term1.json`

3. **浏览器缓存**
   - 修改后如未生效，尝试强制刷新（Ctrl+F5）
   - 浏览器会缓存 JSON 文件以提升性能

---

## 📊 当前统计

访问测试页面可以看到实时统计：

```
http://localhost:8090/test-runtime-config.html

显示：
- 每日音标课程: 12 个
- 专项练习: 4 个
- 年级分类: 20 个
- 总计词库: 36 个
```

---

## 🔍 故障排除

### 问题：新课程没有出现在设置页面

**解决方案**：
1. 检查 JSON 文件格式是否正确
2. 确保运行了 `generate_config_v2.py`
3. 清空浏览器缓存
4. 检查 `metadata.id` 是否唯一

### 问题：配置加载失败

**解决方案**：
1. 检查 JSON 文件是否有语法错误（可用 jsonlint.com 验证）
2. 确保 `words/` 目录结构正确
3. 打开浏览器控制台查看错误信息
4. 确保本地服务器正在运行

---

## 📚 示例

### 创建新的每日课程

```bash
# 创建 day15.json
cat > words/daily-phonics/day15.json << 'EOF'
{
  "metadata": {
    "id": "day15",
    "name": "Day 15 - 综合测试",
    "phoneme": "Review",
    "description": "前14天音标综合复习",
    "category": "daily-phonics",
    "difficulty": "intermediate",
    "wordCount": 30,
    "lastUpdated": "2025-10-06"
  },
  "lesson": {
    "pronunciationTips": [
      "复习前14天学习的所有音标",
      "注意区分相似音标的发音",
      "多做对比练习"
    ],
    "phonicsPatterns": [
      "综合运用所学的拼读规律",
      "识别不同的字母组合"
    ],
    "practiceSteps": [
      "逐个复习每个音标的发音",
      "练习相似音标的对比",
      "完成综合测试题"
    ]
  },
  "words": [
    {"word": "test", "phonetic": "[test]", "meaning": "测试", "difficulty": 2}
  ]
}
EOF

# 刷新浏览器 - 完成！
```

---

## 🚀 未来扩展

可以进一步增强功能：

- ✅ 运行时自动配置生成
- ✅ 实时文件扫描和加载
- ✅ 浏览器端配置管理
- ✅ 学习内容集成到JSON
- ✅ 学习页面动态加载
- ⏳ 自动检查单词重复
- ⏳ 生成难度分布图表
- ⏳ 在线词库编辑器
- ⏳ 批量导入/导出功能

---

## 📖 学习页面集成

### 学习内容来源

学习页面 `study/phonics-lesson-template.html` 会自动从JSON文件的 `lesson` 字段读取：

- **发音要领** (`pronunciationTips`)：舌位、唇形、气流、音长等
- **拼读规律** (`phonicsPatterns`)：字母组合发音规则
- **练习步骤** (`practiceSteps`)：具体的发音练习方法

### 优势

1. **内容集中管理**：所有课程内容都在JSON文件中
2. **易于维护**：修改JSON即可更新学习内容
3. **动态加载**：无需修改HTML代码
4. **扩展性强**：可随时添加新的学习内容字段

---

**最后更新**：2025-10-06  
**维护者**：Word Tetris Team


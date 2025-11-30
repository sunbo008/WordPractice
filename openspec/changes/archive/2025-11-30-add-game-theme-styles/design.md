## 背景

当前 Word Cannon 游戏在 `styles.css` 中使用硬编码的颜色值。为了支持多主题，我们需要一个基于 CSS 变量的主题系统，实现动态主题切换，同时保持游戏的视觉一致性和教育目的。

**目标用户**: 小学六年级学生（11-12岁），喜欢个性化和主题化的体验。

## 目标 / 非目标

**目标:**
- 让用户可以在 5 种视觉风格间切换
- 所有主题都保持良好的可读性和可访问性
- 主题选择在会话间持久保存
- 对游戏性能零影响
- 暗色主题下文字颜色自动适配
- **亮色主题（Kitty猫）下使用深色文字确保可读性**
- **全站所有页面统一主题适配**

**非目标:**
- 用户自定义创建主题
- 主题专属音效
- 主题专属动画（CSS 效果除外）

## 技术决策

### 决策 1: 使用 CSS 变量实现主题

**方案**: 使用 CSS 自定义属性（变量）来定义所有可主题化的颜色和渐变。

**原因**: 
- 浏览器原生支持，无 JavaScript 开销
- 易于维护和扩展
- 可通过 CSS 实现平滑过渡效果

**备选方案:**
- JavaScript 动态注入样式 → 否决（性能开销大，难以维护）
- 多个 CSS 文件切换 → 否决（会有无样式闪烁，HTTP 请求增多）

### 决策 2: 在 Body 元素上应用主题类

**方案**: 通过在 `<body>` 元素上添加类来应用主题（如 `body.theme-cyberpunk`）。

**原因**:
- 单一控制点管理主题
- CSS 层叠自然应用到所有子元素
- 便于调试和检查

### 决策 3: 主题变量结构

每个主题定义以下 CSS 变量类别：

```css
/* 基础颜色 */
--theme-bg-primary       /* 主背景渐变起始色 */
--theme-bg-secondary     /* 主背景渐变结束色 */
--theme-text-primary     /* 主要文字颜色 */
--theme-text-secondary   /* 次要/淡化文字 */
--theme-accent           /* 主强调色（按钮、高亮） */
--theme-accent-hover     /* 强调色悬停状态 */
--theme-gold             /* 分数/成就颜色 */

/* 面板 */
--theme-panel-bg         /* 面板背景（半透明） */
--theme-panel-bg-solid   /* 面板背景（实色） */
--theme-panel-bg-dark    /* 深色面板背景 */
--theme-panel-border     /* 面板边框 */

/* 状态颜色 */
--theme-success          /* 成功状态（绿色） */
--theme-success-hover    /* 成功悬停 */
--theme-error            /* 错误状态（红色） */
--theme-error-hover      /* 错误悬停 */
--theme-warning          /* 警告状态（黄色） */

/* 游戏画布 */
--theme-canvas-bg        /* 游戏画布背景 */
--theme-canvas-border    /* 游戏画布边框 */

/* 输入框 */
--theme-input-bg         /* 输入框背景 */
--theme-input-border     /* 输入框边框 */
--theme-input-text       /* 输入框文字 */

/* 弹窗 */
--theme-modal-bg         /* 弹窗背景 */
--theme-shadow           /* 阴影颜色 */
--theme-glow             /* 光晕颜色 */

/* 按钮颜色 */
--theme-btn-secondary    /* 次要按钮 */
--theme-btn-disabled     /* 禁用按钮 */
--theme-btn-settings     /* 设置按钮 */
--theme-btn-settings-hover
--theme-btn-test         /* 测试按钮 */
--theme-btn-test-hover

/* 统计数值 */
--theme-stats-value      /* 统计数值颜色 */
--theme-stats-percentage /* 百分比颜色 */
--theme-light-border     /* 信号灯边框 */

/* 学习页面颜色 */
--study-container-bg     /* 容器背景 */
--study-text             /* 文字颜色 */
--study-title            /* 标题颜色 */
--study-meta             /* 元信息颜色 */
--study-word-bg          /* 单词卡片背景 */
--study-word-border      /* 单词卡片边框 */
--study-word             /* 单词文字 */
--study-phonetic         /* 音标颜色 */
--study-meaning          /* 释义颜色 */
--study-section-title    /* 章节标题 */
--study-story-bg         /* 故事框背景 */
--study-story-border     /* 故事框边框 */
--study-story-text       /* 故事文字 */
--study-btn-secondary    /* 次要按钮 */
--study-speak-border     /* 朗读按钮边框 */
--study-speak-bg         /* 朗读按钮背景 */
--study-speak-hover      /* 朗读按钮悬停 */

/* 音标学习页面 */
--phonics-guide-bg       /* 发音指南背景 */
--phonics-tips-bg        /* 技巧提示背景 */
--phonics-rules-bg       /* 规则框背景 */
```

### 决策 4: 设置页面的主题预览

**方案**: 为每个主题选项显示一个小预览卡片，展示该主题的配色效果。

**原因**: 帮助用户在应用主题前了解主题外观。

### 决策 5: 暗色主题文字颜色适配

**方案**: 为每个暗色主题（赛博朋克、蝙蝠侠、蜘蛛侠）添加专门的文字颜色覆盖规则。

**原因**: 原本设置页面的文字（如"休闲"、"挑战"标签）是深色，在暗色背景下难以辨认。

**适配元素:**
- `.mode-radio-label` - 游戏模式单选标签
- `h2` 标题
- `.subcategory-title` - 子分类标题
- `.grade-name` - 年级名称
- `.subcategory-description` - 描述文字

### 决策 6: 亮色主题（Kitty猫）深色文字适配

**方案**: Kitty猫主题使用深粉色文字而非白色，确保在浅粉背景下的可读性。

**原因**: Kitty猫主题背景色较浅（`#d4789c` → `#e8a4bc`），白色文字对比度不足。

**关键适配:**
- 容器背景: `rgba(255, 255, 255, 0.85)`（白色半透明）
- 标题文字: `#7a2040`（深玫红）
- 正文文字: `#5a2040` ~ `#7a3050`（深粉系）
- 元信息: `#8a5070`（中等深度粉灰）
- 按钮: 实心渐变填充（而非透明边框）

### 决策 7: 锁定元素可见性优化

**方案**: 锁定状态元素使用 `opacity: 0.65-0.7` + `filter: grayscale(30%)` + `border-style: dashed`。

**原因**: 原本 `opacity: 0.4-0.5` 导致锁定节点与背景融合，难以辨认。

**改进:**
- 提高不透明度确保可见
- 轻微灰度表示"不可用"
- 虚线边框明确区分锁定状态
- 每个主题提供专属锁定状态配色

## 主题规格说明

### 默认主题 (default)
- 经典蓝色渐变设计
- 专业、教育感
- 配色: `#1e3c72` → `#2a5298`，金色强调 `#ffd700`

### 赛博朋克主题 (cyberpunk)
- 科技金属风格
- 配色: 
  - 背景: `#3a3a42` → `#52525c`（银灰）
  - 强调色: `#f0c030`（科技黄）
  - 金属色: `#c0c0c8`（银灰）
- 文字颜色: `#f5f5f5`（白色系）
- 特效: 金色光晕、金属质感边框

### Kitty猫主题 (doraemon)
- 温柔粉红色调
- 圆角、可爱元素
- 配色:
  - 背景: `#d4789c` → `#e8a4bc`（粉色渐变）
  - 强调色: `#c9557a`（深粉）
  - 容器: 白色半透明 `rgba(255,255,255,0.85)`
- **文字颜色: 深粉色系**（`#7a2040` ~ `#8a5070`）
- 特效: 圆润边角、可爱图标（🎀💖🌸）
- 按钮: 实心渐变填充确保可见

### 蝙蝠侠主题 (batman)
- 暗黑、哥特氛围
- 配色:
  - 背景: `#0d0d0d` → `#1a1a2e`（深蓝黑）
  - 强调色: `#ffd700`（蝙蝠信号灯黄）
  - 面板: 深黑半透明
- 锐利边缘，戏剧性对比
- 文字颜色: `#e0e0e0`（浅灰）
- 特效: 金色光晕、暗影效果

### 蜘蛛侠主题 (spiderman)
- 热血红黑色系
- 配色:
  - 背景: `#1a0a0a` → `#2d1515`（深红黑渐变）
  - 强调色: `#e23636`（蜘蛛红）
  - 悬停: `#c42020`（深红）
- 发光边框，英雄气质
- 文字颜色: `#ffffff`（白色）
- 特效: 红色光晕

## 实现文件

| 文件 | 用途 |
|------|------|
| `proj/css/themes.css` | 主题 CSS 变量定义、特效、游戏页面主题覆盖 |
| `proj/css/styles.css` | 主游戏页面样式（使用 CSS 变量） |
| `proj/css/settings.css` | 设置页面样式 + 主题预览卡片 + 各主题适配 |
| `proj/css/certification.css` | 荣誉殿堂页面样式 + 各主题适配 |
| `proj/index.html` | 主游戏页面（引入 themes.css + 主题加载脚本） |
| `proj/settings.html` | 设置页面（主题选择 UI） |
| `proj/certification.html` | 荣誉殿堂页面（主题加载脚本） |
| `proj/study/unit-lesson-template.html` | 课程学习页面（主题适配） |
| `proj/study/extracurricular-lesson-template.html` | 课外阅读页面（主题适配） |
| `proj/study/missed-words-lesson.html` | 错词复习页面（主题适配） |
| `proj/study/phonics-lesson-template.html` | 音标学习页面（主题适配） |
| `proj/src/ui/settings.js` | 主题切换和持久化逻辑 |

## 页面主题适配清单

### 所有页面通用
- [x] 引入 `themes.css`
- [x] 添加主题加载脚本（防止闪烁）
- [x] body 添加主题类

### 游戏主页 (index.html)
- [x] 游戏信息栏使用主题变量
- [x] 按钮颜色使用主题变量
- [x] 侧边栏面板使用主题变量
- [x] Kitty主题：白色背景 + 深色文字

### 设置页面 (settings.html)
- [x] 主题选择卡片 UI
- [x] 各主题完整适配（文字、背景、边框）
- [x] Kitty主题：白色背景 + 深粉文字

### 荣誉殿堂 (certification.html)
- [x] 技能树节点使用主题变量
- [x] 锁定节点可见性优化
- [x] 数据管理按钮主题适配
- [x] 各主题图标替换（Kitty: 🎀💖🌸）

### 学习页面 (study/*.html)
- [x] 单词卡片使用主题变量
- [x] 按钮使用主题变量
- [x] 故事框使用主题变量
- [x] 音标页面特殊区块适配

## 风险 / 权衡

| 风险 | 缓解措施 |
|------|----------|
| 某些主题可能降低可读性 | 用实际游戏内容测试所有主题；确保足够的对比度 |
| CSS 文件体积增加 | 主题定义相对较小（约8KB）；可接受 |
| 主题可能与单词图片冲突 | 用各种单词图片测试；游戏画布背景独立处理 |
| 暗色主题下文字不可见 | 已为每个暗色主题添加文字颜色覆盖规则 |
| **亮色主题（Kitty）文字不可见** | **使用深色文字 + 白色半透明背景** |
| **锁定元素与背景融合** | **提高不透明度 + 灰度滤镜 + 虚线边框** |

## 迁移计划

1. 将当前硬编码颜色提取为 CSS 变量（向后兼容）
2. 添加主题系统，默认主题与当前外观一致
3. 逐步添加新主题
4. 默认主题确保现有用户无视觉变化
5. **全站所有页面统一适配主题**

## 存储键名

- `wordTetris_selectedTheme` - 存储主题ID
- 有效值: `'default'`, `'cyberpunk'`, `'doraemon'`, `'batman'`, `'spiderman'`
- 默认值: `'default'`

## 对比度设计原则

### 暗色主题（赛博朋克、蝙蝠侠、蜘蛛侠）
- 背景: 深色
- 文字: 浅色/白色
- 强调: 亮色（金/黄/红）

### 亮色主题（Kitty猫）
- 背景: 浅粉色
- 容器: 白色半透明
- 文字: **深色**（深粉/深玫红）
- 强调: 深粉色
- 按钮: **实心填充**（非透明边框）

这确保在所有主题下，元素都有足够的对比度，文字清晰可读。

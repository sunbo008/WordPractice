# Day15 词汇加载问题修复说明

## 🐛 问题描述

用户选择第15天音标练习时，游戏中没有单词落下，游戏无法正常进行。

## 🔍 问题分析

### 根本原因

1. **配置问题**：`vocabulary-config-loader.js` 第58行的默认配置只加载前4天的课程：
   ```javascript
   enabledLibraries: dailyPhonics.slice(0, 4).map(item => item.id)
   // 结果: ['day01', 'day02', 'day03', 'day04']
   ```

2. **加载机制**：`VocabularyManagerV2` 只加载 `enabledLibraries` 中指定的词库
   - Day15不在默认启用列表中
   - 游戏启动时不会加载day15.json
   - 选择day15时没有可用单词

### 为什么Day15的JSON格式不是问题

虽然day15.json使用了压缩格式（单行格式）：
```json
{"word": "cup", "phonetic": "[kʌp]", "meaning": "杯子", "difficulty": 2}
```

而day01.json使用了展开格式（多行格式）：
```json
{
  "word": "see",
  "phonetic": "[siː]",
  "meaning": "看见",
  "difficulty": 1
}
```

但两种格式在JSON语法上都是完全正确的，JavaScript的`JSON.parse()`可以正确解析两种格式。

**真正的问题是：day15根本没有被加载！**

## ✅ 修复方案

### 修改1: `vocabulary-config-loader.js`

**文件位置**: `proj/vocabulary-config-loader.js`  
**行号**: 58

**修改前**:
```javascript
enabledLibraries: dailyPhonics.slice(0, 4).map(item => item.id),
```

**修改后**:
```javascript
enabledLibraries: dailyPhonics.map(item => item.id), // 加载所有daily-phonics课程
```

**效果**: 默认加载所有15天的课程（day01 - day15）

### 修改2: `vocabulary-manager-v2.js`

**文件位置**: `proj/vocabulary-manager-v2.js`  
**行号**: 16-22

**修改前**:
```javascript
this.currentConfig = {
    enabledLibraries: ['basic-phonics', 'common-words'],
    maxWords: 200,
    difficultyRange: [1, 3],
    categories: ['all']
};
```

**修改后**:
```javascript
// 当前配置 (初始占位，会从配置加载器获取实际默认值)
this.currentConfig = {
    enabledLibraries: [], // 会从配置加载器的defaultConfig获取
    maxWords: 200,
    difficultyRange: [1, 3],
    categories: ['all']
};
```

**效果**: 确保使用配置加载器中的默认配置

## 🧪 测试验证

### 测试文件

创建了 `proj/test-day15-fix.html` 用于验证修复效果。

### 测试步骤

1. 打开 `proj/test-day15-fix.html`
2. 页面会自动运行基础测试
3. 检查以下项目：
   - ✅ 配置加载器是否包含day15
   - ✅ 词汇管理器是否加载了day15
   - ✅ day15的单词是否可以正常读取
   - ✅ 随机单词生成是否包含day15的单词

### 预期结果

```
配置信息：
- Daily Phonics课程数: 15
- 默认启用课程数: 15
- 是否包含Day15: ✅ 是
- 启用的课程: day01, day02, ..., day15

词汇管理器状态：
- 已加载词库数: 15
- 总单词数: ~150 (取决于每天的单词数)
- 是否加载Day15: ✅ 是
```

## 🎮 游戏中验证

1. 打开 `proj/index.html`
2. 点击"设置"按钮
3. 在词库选择中应该能看到所有15天的课程都被选中
4. 开始游戏，确认单词正常下落

## 📋 影响范围

### 修复前

- **可用课程**: day01 ~ day04 (4天)
- **可用单词数**: ~40个
- **问题**: day05-day15选择后无单词

### 修复后

- **可用课程**: day01 ~ day15 (15天)
- **可用单词数**: ~150个
- **效果**: 所有课程都可以正常使用

## 🔄 其他建议

### 1. 用户设置持久化

如果用户之前保存过设置（只包含day01-day04），需要清除localStorage：

```javascript
localStorage.removeItem('wordTetris_selectedLibraries');
location.reload();
```

### 2. 设置页面提示

建议在设置页面添加"恢复默认配置"按钮，方便用户重置词库选择。

### 3. 词库加载状态显示

建议在游戏开始前显示已加载的词库信息，让用户了解当前可用的单词范围。

## 📚 相关文件

- `proj/vocabulary-config-loader.js` - 配置加载器（已修改）
- `proj/vocabulary-manager-v2.js` - 词汇管理器（已修改）
- `proj/test-day15-fix.html` - 测试页面（新增）
- `proj/words/daily-phonics/day15.json` - Day15词库数据（正常）

## ✨ 结论

问题已修复！Day15及所有课程现在都可以正常使用。修复方案确保了：

1. ✅ 所有15天课程默认加载
2. ✅ Day15单词可以正常在游戏中出现
3. ✅ 用户可以在设置中自由选择课程
4. ✅ 系统行为更符合用户预期

---

**修复日期**: 2025-10-06  
**修复版本**: v2.1


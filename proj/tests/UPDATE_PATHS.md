# 测试文件路径更新说明

## 📋 需要更新的路径

测试文件需要从旧的单文件结构更新为新的模块化结构。

### 旧路径 → 新路径

| 旧路径 | 新路径 |
|--------|--------|
| `../game.js` | `../src/core/WordTetrisGame.js` |
| `../vocabulary-manager-v2.js` | `../src/core/vocabulary-manager-v2.js` |
| `../vocabulary-config-loader.js` | `../src/core/vocabulary-config-loader.js` |
| `../game-settings-integration.js` | `../src/core/game-settings-integration.js` |
| `../vocabulary.js` | `../src/core/vocabulary-manager-v2.js` (旧版已弃用) |
| `../styles.css` | `../public/css/styles.css` |
| `../settings-v2.js` | `../src/ui/settings.js` |

## 🔧 批量更新方法

### 方法1：使用查找替换（推荐）

在IDE中使用正则表达式查找替换：

1. **更新JS引用**
   ```
   查找: src="../vocabulary-manager-v2.js"
   替换: src="../src/core/vocabulary-manager-v2.js"
   
   查找: src="../vocabulary-config-loader.js"
   替换: src="../src/core/vocabulary-config-loader.js"
   
   查找: src="../game.js"
   替换: src="../src/core/WordTetrisGame.js"
   
   查找: src="../vocabulary.js"
   替换: src="../src/core/vocabulary-manager-v2.js"
   ```

2. **更新CSS引用**
   ```
   查找: href="../styles.css"
   替换: href="../public/css/styles.css"
   ```

### 方法2：创建通用测试模板

建议创建一个通用的测试页面模板，包含正确的引用：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>测试页面</title>
    <link rel="stylesheet" href="../public/css/styles.css">
</head>
<body>
    <!-- 测试内容 -->
    
    <!-- 核心脚本 -->
    <script src="../src/core/vocabulary-config-loader.js"></script>
    <script src="../src/core/vocabulary-manager-v2.js"></script>
    <script src="../src/core/WordTetrisGame.js"></script>
</body>
</html>
```

## 📝 更新检查清单

需要检查以下文件：

- [ ] levels-plan.html
- [ ] test-day01-loading.html
- [ ] test-day15-fix.html
- [ ] test-exam-stats.html
- [ ] test-vocabulary-loading-fix.html
- [ ] test-distributed-vocabulary.html
- [ ] 其他所有 test-*.html 文件

## ⚠️ 注意事项

1. **旧版vocabulary.js**：已弃用，应改为使用 `vocabulary-manager-v2.js`
2. **版本号参数**：建议更新为统一版本号 `?v=20251007-2`
3. **相对路径**：tests目录在proj下，所以使用 `../` 访问proj根目录

## 🚀 验证方法

更新后，访问测试文件检查：

1. 打开浏览器开发者工具（F12）
2. 查看Console标签，确认无404错误
3. 查看Network标签，确认所有JS/CSS文件成功加载

## 📊 受影响的文件统计

根据扫描结果，有以下文件需要更新：
- levels-plan.html
- test-day01-loading.html
- test-day15-fix.html
- test-exam-stats.html
- test-vocabulary-loading-fix.html
- test-distributed-vocabulary.html

以及其他可能使用旧路径的测试文件。


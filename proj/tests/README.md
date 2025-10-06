# 测试文件目录

本目录包含所有单元测试和功能测试文件。

## 📁 目录结构

```
tests/
├── README.md                           # 本文件
├── check-word-duplicates.html         # 单词重复检查工具
├── test-auto-levelup.html             # 自动升级测试
├── test-day01-loading.html            # Day01词库加载测试
├── test-day15-fix.html                # Day15修复测试
├── test-disabled-buttons.html         # 禁用按钮测试
├── test-distributed-vocabulary.html   # 分布式词库测试
├── test-error-handling.html           # 错误处理测试
├── test-exam-stats.html               # 考试统计测试
├── test-export-vocabulary.html        # 导出生词本测试
├── test-hierarchical-settings.html    # 层级化设置测试
├── test-json-access.html              # JSON访问测试
├── test-levelup-modal.html            # 升级弹窗测试
├── test-lowercase.html                # 小写显示测试
├── test-multi-letter-fix.html         # 多字母修复测试
├── test-multi-letter-input.html       # 多字母输入测试
├── test-phonics-words.html            # 音标单词测试
├── test-refresh-reset.html            # 刷新重置测试
├── test-reset-autostart.html          # 重置自动开始测试
├── test-runtime-config.html           # 运行时配置测试
├── test-speech.html                   # 语音测试
├── test-speed-control.html            # 速度控制测试
├── test-study-speaker.html            # 学习朗读测试
├── test-vocab-stats.html              # 生词统计测试
├── test-vocabulary-loading-fix.html   # 词库加载修复测试
├── test-word-size-lowercase.html      # 单词大小写测试
└── test-words.html                    # 单词测试
```

## 🚀 使用方法

### 运行测试

直接在浏览器中打开对应的HTML文件即可运行测试：

```
file:///D:/workspace/WordPractice/proj/tests/test-xxx.html
```

或者通过本地服务器访问：

```
http://localhost:8000/proj/tests/test-xxx.html
```

### 路径说明

所有测试文件已经配置为使用相对路径引用父目录的资源：

- JavaScript文件：`../vocabulary.js`、`../game.js` 等
- 词库文件：`../words/xxx.json`
- 设置页面：`../settings-v2.html`
- 学习页面：`../study/xxx.html`

## 📝 测试分类

### 词库相关测试
- `test-day01-loading.html` - Day01词库加载
- `test-day15-fix.html` - Day15修复
- `test-distributed-vocabulary.html` - 分布式词库
- `test-phonics-words.html` - 音标单词
- `test-vocabulary-loading-fix.html` - 词库加载修复
- `test-words.html` - 单词测试

### 游戏功能测试
- `test-auto-levelup.html` - 自动升级
- `test-levelup-modal.html` - 升级弹窗
- `test-speed-control.html` - 速度控制
- `test-multi-letter-input.html` - 多字母输入
- `test-multi-letter-fix.html` - 多字母修复

### UI/UX测试
- `test-disabled-buttons.html` - 禁用按钮
- `test-lowercase.html` - 小写显示
- `test-word-size-lowercase.html` - 单词大小写

### 统计功能测试
- `test-exam-stats.html` - 考试统计
- `test-vocab-stats.html` - 生词统计
- `test-export-vocabulary.html` - 导出生词本

### 配置相关测试
- `test-hierarchical-settings.html` - 层级化设置
- `test-runtime-config.html` - 运行时配置
- `test-json-access.html` - JSON访问

### 其他功能测试
- `test-speech.html` - 语音朗读
- `test-study-speaker.html` - 学习朗读
- `test-error-handling.html` - 错误处理
- `test-refresh-reset.html` - 刷新重置
- `test-reset-autostart.html` - 重置自动开始

## 🔧 维护说明

### 添加新测试

1. 在 `tests/` 目录下创建新的测试文件
2. 使用 `../` 前缀引用父目录的资源
3. 更新本 README 文件

### 修改路径

如果需要修改资源路径，请确保：
- 所有 `src` 和 `href` 属性使用 `../` 前缀
- 所有 `fetch()` 调用使用 `../` 前缀
- 所有 `window.location.href` 使用 `../` 前缀

## ⚠️ 注意事项

1. **相对路径**：所有测试文件使用相对路径，移动文件时需要更新路径
2. **浏览器兼容性**：某些测试（如语音测试）需要特定浏览器支持
3. **本地服务器**：建议使用本地服务器运行测试，避免CORS问题
4. **缓存问题**：测试时注意清除浏览器缓存，某些文件使用了版本号参数

## 📚 相关文档

- [测试指南](../TEST_GUIDE.md)
- [实现总结](../IMPLEMENTATION_SUMMARY.md)
- [项目README](../README.md)

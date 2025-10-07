# 🚀 快速访问指南

## 📌 重要URL（请收藏）

### 主游戏页面
```
http://localhost:8000/proj/
```
或
```
http://localhost:8000/proj/public/index.html
```

### ⚙️ 词库设置页面
```
http://localhost:8000/proj/public/settings.html
```

### 🧪 结构测试页面
```
http://localhost:8000/proj/public/test-structure.html
```

## ⚠️ 注意事项

### URL已更改
- ❌ 旧：`settings-v2.html`
- ✅ 新：`settings.html`

**旧URL会自动重定向到新地址！**

## 🎮 使用流程

1. **启动服务器**
   ```bash
   # Windows: 双击
   START_SERVER.bat
   
   # 或手动
   python -m http.server 8000
   ```

2. **打开游戏**
   - 浏览器访问：`http://localhost:8000/proj/`
   - 或直接访问：`http://localhost:8000/proj/public/index.html`

3. **设置词库**
   - 点击游戏中的"⚙️ 词库设置"按钮
   - 或直接访问：`http://localhost:8000/proj/public/settings.html`

4. **开始学习**
   - 选择词库后返回游戏
   - 点击"开始游戏"
   - 开始单词练习！

## 📱 快捷键

| 按键 | 功能 |
|------|------|
| A-Z | 输入字母 |
| Enter | 提交答案 |
| Backspace | 删除字符 |
| Space | 放弃当前单词 |

## 🔊 语音控制

- 点击"🔊 语音开/关"按钮切换
- 开启后会自动朗读下降的单词

## 💡 提示

1. **首次使用**：建议先访问设置页面选择词库
2. **词库选择**：可以同时选择多个词库
3. **错词本**：游戏中会自动记录错误的单词
4. **导出功能**：可以导出错词本到文本文件

## 🆘 常见问题

### Q: 页面打不开？
A: 确认服务器已启动，端口是8000

### Q: 词库加载失败？
A: 检查浏览器控制台（F12）的错误信息

### Q: 设置页面404？
A: 使用新URL：`settings.html`（不是settings-v2.html）

### Q: 图片不显示？
A: 确认Junction链接创建成功（`public/images`指向`../images`）

## 📚 更多文档

- [完整README](../README.md)
- [部署指南](../DEPLOYMENT_GUIDE.md)
- [测试指南](../TEST_NEW_STRUCTURE.md)
- [URL变更说明](URL_CHANGES.md)

---

**快速开始游戏！🎮**


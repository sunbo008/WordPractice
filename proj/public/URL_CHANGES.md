# 📝 URL变更说明

## 重要更新：文件名已更改

在项目重构过程中，部分文件名进行了标准化处理。

### 🔄 文件名变更

| 旧URL | 新URL | 状态 |
|-------|-------|------|
| `settings-v2.html` | `settings.html` | ✅ 自动重定向 |
| `settings-v2.css` | `css/settings.css` | ✅ 已迁移 |
| `settings-v2.js` | (已集成到src/ui/) | ✅ 模块化 |

### ✅ 正确的访问地址

#### 主游戏页面
```
http://localhost:8000/proj/
http://localhost:8000/proj/index.html
http://localhost:8000/proj/public/index.html
```

#### 设置页面（新）
```
http://localhost:8000/proj/public/settings.html  ← 使用这个！
```

#### 设置页面（旧，会自动重定向）
```
http://localhost:8000/proj/public/settings-v2.html  ← 自动跳转
```

### 🎯 如何访问设置

**方法1：游戏内点击按钮（推荐）**
1. 打开游戏主页
2. 点击"⚙️ 词库设置"按钮
3. 自动跳转到正确的设置页面

**方法2：直接访问**
```
http://localhost:8000/proj/public/settings.html
```

**方法3：使用旧URL（会自动重定向）**
```
http://localhost:8000/proj/public/settings-v2.html
```

### 📚 其他页面

- 测试页面：`proj/public/test-structure.html`
- 游戏主页：`proj/public/index.html`

### 🔖 请更新您的书签！

如果您收藏了旧的URL，请更新为新地址。旧URL虽然会自动重定向，但建议使用新地址以获得最佳体验。

### ❓ 为什么更改？

1. **标准化命名**：去除版本号后缀（-v2），使URL更简洁
2. **模块化结构**：配合新的目录结构重组
3. **更好的维护性**：统一的命名规范，便于长期维护

### 🆘 遇到问题？

如果访问任何页面时遇到404错误：
1. 检查URL拼写是否正确
2. 确保使用了正确的端口（8000）
3. 确认Web服务器正在运行
4. 查看浏览器控制台（F12）的错误信息

---

**更新日期**：2025-10-07
**影响范围**：设置页面URL
**向后兼容**：✅ 旧URL自动重定向


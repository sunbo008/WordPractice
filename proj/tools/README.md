# WordPractice 工具集

本目录包含项目所需的各种工具脚本。

---

## 📁 工具列表

### 1. R2 上传工具

**文件**：`upload-to-r2.js`

**功能**：将 `proj/audio/` 和 `proj/images/` 上传到 Cloudflare R2

**使用方法**：
```bash
# 1. 安装依赖
cd proj/tools
npm install

# 2. 配置环境变量（在项目根目录）
cd ../..
cp .env.example .env
nano .env  # 编辑配置

# 3. 运行上传（返回 tools 目录）
cd proj/tools
node upload-to-r2.js
```

**详细文档**：
- [快速开始指南](../../R2_QUICK_START.md)
- [完整迁移指南](../../R2_MIGRATION_GUIDE.md)

---

## 🔧 配置文件

### package.json

Node.js 项目配置，定义了依赖包和脚本命令。

**安装依赖**：
```bash
npm install
```

**运行脚本**：
```bash
npm run upload  # 等同于 node upload-to-r2.js
```

---

## 📚 相关文档

- [R2 快速开始](../../R2_QUICK_START.md) - 5 分钟上手
- [R2 迁移指南](../../R2_MIGRATION_GUIDE.md) - 完整教程
- [项目主文档](../../README.md)

---

## ⚠️ 注意事项

1. **敏感信息保护**
   - 不要将 `.env` 文件提交到 Git
   - API Token 需妥善保管

2. **网络要求**
   - 上传大文件需要稳定网络
   - 首次上传可能需要 10-30 分钟

3. **成本控制**
   - R2 免费额度：10 GB 存储
   - 本项目约 300 MB，完全在免费范围内

---

## 🆘 获取帮助

遇到问题？
1. 查看 [故障排除](../../R2_MIGRATION_GUIDE.md#故障排除)
2. 查看上传日志
3. 提交 Issue

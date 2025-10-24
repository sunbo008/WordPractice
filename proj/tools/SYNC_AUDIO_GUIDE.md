# 🎵 音频同步到 R2 自动化工具

## 📋 功能说明

这个自动化脚本会按顺序执行以下操作：

1. **下载音频** - 扫描所有单词 JSON 文件，通过有道 API 下载缺失的音频
2. **上传到 R2** - 将下载的音频文件上传到 Cloudflare R2 CDN

## 🚀 使用方法

### 方法 1：直接运行脚本（推荐）

#### Windows 系统

**双击运行**：
```
proj/tools/sync-audio-to-r2.bat
```

**或在命令行中**：
```bash
cd proj/tools
sync-audio-to-r2.bat
```

#### Git Bash / Linux / macOS

```bash
cd proj/tools
./sync-audio-to-r2.sh
```

### 方法 2：使用 npm 脚本

```bash
cd proj/tools
npm run sync:audio
```

### 方法 3：分步执行

如果需要分别执行，可以：

```bash
cd proj/tools

# 只下载音频
python download_word_audio.py

# 只上传到 R2
npm run upload:r2
# 或
node upload-to-r2.js
```

---

## ⚙️ 前置要求

### 1. 安装依赖

```bash
cd proj/tools
npm install
```

需要的依赖：
- `@aws-sdk/client-s3` - R2 上传 SDK
- `dotenv` - 环境变量加载
- `mime-types` - 文件类型识别

### 2. 配置 R2 凭证

在项目根目录创建 `.env` 文件：

```bash
cd ../..  # 返回项目根目录
nano .env  # 或使用任何文本编辑器
```

添加以下内容：

```env
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key_id
R2_SECRET_ACCESS_KEY=your_secret_access_key
R2_BUCKET_NAME=wordpractice-assets
```

**如何获取 R2 凭证**：
1. 登录 Cloudflare Dashboard
2. 进入 R2 → 创建 Bucket（如果还没有）
3. 创建 API Token（R2 → Manage R2 API Tokens）
4. 复制 Account ID、Access Key ID、Secret Access Key

---

## 📊 运行效果

```bash
╔════════════════════════════════════════════════════════╗
║       音频同步到 R2 自动化工具                        ║
╚════════════════════════════════════════════════════════╝

[检查] 检查环境依赖...
✅ Python: Python 3.11.0
✅ Node.js: v18.17.0

═══════════════════════════════════════════════════════
步骤 1/2: 下载单词音频（通过有道 API）
═══════════════════════════════════════════════════════

[扫描] 扫描单词文件...
   找到 25 个 JSON 文件
   共收集到 150 个唯一单词

[检查] 检查已存在的音频文件...
   已存在 120 个音频文件

[下载] 开始下载 30 个单词的音频...

[1/30] 下载: abandon [OK]
[2/30] 下载: ability [OK]
...

==================================================
[统计] 下载统计
==================================================
总单词数:     150
已存在文件:   120
成功下载:     30
下载失败:     0
==================================================

✅ 音频下载完成！

═══════════════════════════════════════════════════════
步骤 2/2: 上传音频文件到 Cloudflare R2
═══════════════════════════════════════════════════════

🚀 Cloudflare R2 资源上传工具（优化版）

📋 配置信息：
   Account ID: abc123def456
   Bucket: wordpractice-assets
   强制重新上传: 否
   缓存文件: .upload-cache.json
📋 加载上传记录: 120 个文件
✅ R2 客户端创建成功

📁 扫描目录: ../audio
✅ 找到 150 个文件

⚡ [1/150] 缓存跳过: audio/hello_youdao.mp3
✅ [2/150] 上传成功: audio/abandon_youdao.mp3 (15.34 KB)
...

💾 已保存上传记录: 150 个文件

==================================================
📊 上传统计：
   ✅ 上传成功: 30 个文件
   ⚡ 缓存跳过: 120 个文件
   🔄 同步记录: 0 个文件
   ❌ 失败: 0 个文件
   📦 总大小: 2.45 MB
   🌐 API 调用: 30 次
   ⚡ 节省请求: 120 次 (通过本地缓存)
==================================================

╔════════════════════════════════════════════════════════╗
║  🎉 所有任务完成！                                     ║
╠════════════════════════════════════════════════════════╣
║  ✅ 音频已下载                                         ║
║  ✅ 音频已上传到 R2                                    ║
╚════════════════════════════════════════════════════════╝
```

---

## 💡 使用场景

### 场景 1：添加新单词后同步音频

```bash
# 1. 在 proj/words/ 下添加新的单词 JSON 文件
# 2. 运行同步脚本
./sync-audio-to-r2.sh

# 脚本会自动：
# - 扫描新单词
# - 下载新单词的音频
# - 上传到 R2
```

### 场景 2：定期同步

建议每周运行一次，确保所有音频都已同步：

```bash
cd proj/tools
./sync-audio-to-r2.sh
```

### 场景 3：初次部署

首次部署项目时，使用此脚本快速获取所有音频：

```bash
cd proj/tools
npm install
./sync-audio-to-r2.sh
```

---

## ⚡ 性能优势

### 本地缓存机制

- **首次运行**：下载 + 上传所有音频（~5-10 分钟）
- **再次运行**：只处理新增/修改的音频（<1 分钟）

### 智能跳过

✅ 已存在的本地音频文件 → 跳过下载  
✅ 已上传到 R2 的文件 → 跳过上传（通过本地缓存）  
✅ 服务器已有的文件 → 补充到本地缓存，下次直接跳过

### API 请求优化

假设 150 个音频文件：

| 操作 | 无缓存 | 有缓存 | 节省 |
|------|--------|--------|------|
| 下载音频 | 150 次请求 | 0 次（已存在） | 100% |
| 上传到 R2 | 150 次查询 | 0 次（本地缓存） | 100% |

---

## 🛠️ 故障排查

### 问题 1：提示未找到 Python

**解决**：安装 Python 3
- Windows: https://www.python.org/downloads/
- 勾选 "Add Python to PATH"

### 问题 2：提示未找到 Node.js

**解决**：安装 Node.js
- 官网: https://nodejs.org/
- 推荐 LTS 版本

### 问题 3：缺少 .env 文件

**解决**：
```bash
cd ../..
nano .env
# 添加 R2 凭证
```

### 问题 4：音频下载失败

**原因**：
- 网络连接问题
- 有道 API 请求频率过高

**解决**：
- 检查网络连接
- 稍后重新运行（脚本会自动跳过已下载的文件）

### 问题 5：R2 上传失败

**原因**：
- R2 凭证错误
- 网络问题
- Bucket 不存在

**解决**：
1. 检查 .env 文件中的凭证是否正确
2. 确认 Bucket 已创建
3. 检查 API Token 权限

---

## 📁 生成的文件

运行脚本后会生成：

```
proj/
├── audio/
│   ├── hello_youdao.mp3        # 下载的音频文件
│   ├── world_youdao.mp3
│   └── ...
└── tools/
    └── .upload-cache.json      # 上传记录缓存（不要删除）
```

**重要**：
- `.upload-cache.json` 记录了上传历史，删除后会导致下次运行重新检查所有文件
- 此文件已加入 `.gitignore`，不会提交到 Git

---

## 🔄 工作流建议

### 推荐工作流

```bash
# 1. 添加新单词到 JSON 文件
vim proj/words/new-words.json

# 2. 提交单词数据
git add proj/words/
git commit -m "feat: 添加新单词"

# 3. 同步音频到 R2
cd proj/tools
./sync-audio-to-r2.sh

# 4. 推送代码（音频文件不会提交，因为已在 .gitignore 中）
git push origin main

# 5. 部署应用（Cloudflare Pages 会自动部署）
```

---

## 📊 完整资源管理流程

```
添加单词
   ↓
下载图片 (手动或通过 generate_word_images.py)
   ↓
运行 sync-audio-to-r2.sh
   ├─→ 下载音频（有道 API）
   └─→ 上传到 R2（图片 + 音频）
   ↓
部署应用（Cloudflare Pages）
   ↓
用户访问（从 R2 CDN 加载资源）
```

---

## ⚙️ 高级配置

### 只下载音频，不上传

编辑脚本，注释掉上传部分，或直接运行：
```bash
python download_word_audio.py
```

### 强制重新上传所有文件

```bash
FORCE_UPLOAD=true node upload-to-r2.js
```

### 修改上传目录

编辑 `upload-to-r2.js`，修改 `uploadDirs` 配置：
```javascript
uploadDirs: [
    { local: path.join(__dirname, '../audio'), remote: 'audio' },
    { local: path.join(__dirname, '../images/cache'), remote: 'images/cache' }
]
```

---

## 📞 技术支持

遇到问题？检查：
1. Python 和 Node.js 是否正确安装
2. `.env` 文件是否配置正确
3. 网络连接是否正常
4. R2 Bucket 是否已创建

祝同步顺利！🚀


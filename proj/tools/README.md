# 🛠️ Word Tetris 优化工具

## 📋 快速开始

### 1️⃣ 安装依赖

```bash
cd proj/tools
npm install
```

这会安装：
- `fluent-ffmpeg` + `ffmpeg-static`（音频压缩）
- `sharp`（图片压缩）

### 2️⃣ 运行压缩

```bash
# 压缩音频（662 个 MP3 文件）
npm run compress:audio

# 压缩图片（608 个 JPG/JPEG 文件）
npm run compress:images

# 一键压缩所有资源
npm run compress:all
```

### 3️⃣ 查看结果

- 音频输出：`proj/audio-optimized/`
- 图片输出：`proj/images-optimized/`

### 4️⃣ 上传到 R2 CDN（可选）

```bash
# 上传图片到 Cloudflare R2
node upload-to-r2.js
```

**特性**：
- ✅ 本地缓存上传记录，大大减少 API 请求
- ✅ 自动跳过已上传文件（通过本地记录）
- ✅ 自动同步服务器状态（发现服务器已有但本地未记录的文件）
- ✅ 检测文件修改（自动重新上传变更的文件）
- ✅ 显示节省的 API 调用次数

**配置方法**：
1. 在项目根目录创建 `.env` 文件
2. 添加 R2 凭证（参考下方）

---

## 📊 预期效果

| 资源类型 | 原始大小 | 压缩后 | 节省 |
|---------|---------|--------|------|
| 音频 | ~35 MB | ~8 MB | **77%** ⬇️ |
| 图片 | ~80 MB | ~25 MB | **69%** ⬇️ |
| **总计** | **~115 MB** | **~33 MB** | **71%** ⬇️ |

加载速度提升：**首屏时间减少 60-70%**

---

## 📖 详细优化指南

### 🚀 方案 1：HTTP/2 Server Push

#### 原理

传统加载流程需要多次往返（RTT）：
```
浏览器 → 请求 HTML → 服务器
浏览器 ← 返回 HTML ← 服务器
浏览器解析 HTML，发现需要 CSS
浏览器 → 请求 CSS → 服务器
浏览器 ← 返回 CSS ← 服务器
...（依次加载 JS、JSON）
```

HTTP/2 Server Push 一次性推送：
```
浏览器 → 请求 HTML → 服务器
浏览器 ← 同时推送 HTML + CSS + JS + JSON ← 服务器
```

**节省时间**：假设网络延迟 50ms，传统方式需要 10 次往返 = 500ms，Server Push 只需 1 次 = 50ms。

#### 实施步骤

##### ✅ 步骤 1：已创建 `_headers` 文件

文件位置：`proj/_headers`

这个文件已经配置好：
- ✅ HTTP/2 Server Push（预加载关键资源）
- ✅ DNS 预连接（加速 R2 CDN）
- ✅ 缓存策略（分层缓存）

##### ✅ 步骤 2：部署到 Cloudflare Pages

Cloudflare Pages 会自动识别 `_headers` 文件，无需额外配置。

**部署方法**：

```bash
# 方法 1：通过 Git 推送（推荐）
git add proj/_headers
git commit -m "feat: 添加 HTTP/2 Server Push 和缓存优化"
git push origin main

# Cloudflare Pages 会自动部署
```

或者：

```bash
# 方法 2：使用你现有的部署脚本
./deploy-to-vercel.sh  # 如果支持
```

##### ✅ 步骤 3：验证效果

部署后，打开 Chrome DevTools 验证：

1. **Network 面板**：
   ```
   - 按 F12 打开开发者工具
   - 切换到 Network 标签
   - 勾选 "Disable cache"（禁用缓存）
   - 刷新页面（Ctrl + Shift + R）
   - 查看 "Initiator" 列
   - 如果显示 "Push / Other"，说明 Server Push 生效
   ```

2. **查看响应头**：
   ```
   - 点击 index.html 请求
   - 查看 Response Headers
   - 应该看到类似：
     link: </css/styles.css>; rel=preload; as=style
     link: </src/config/r2-config.js>; rel=preload; as=script
   ```

3. **Performance 面板**（更直观）：
   ```
   - 切换到 Performance 标签
   - 点击 "录制" 按钮
   - 刷新页面
   - 停止录制
   - 查看 Network 时间线
   - Push 的资源会在 HTML 下载完成前就开始传输
   ```

#### 预期效果

| 指标 | 优化前 | 优化后 | 提升 |
|------|--------|--------|------|
| 首屏时间（FCP） | ~1.5s | ~0.5s | **67%** ⬇️ |
| 可交互时间（TTI） | ~2.5s | ~1.0s | **60%** ⬇️ |
| 资源加载完成 | ~3.0s | ~1.2s | **60%** ⬇️ |

**注意**：实际效果取决于网络条件，网络越慢，提升越明显。

---

### 📦 方案 2：资源压缩优化

#### 🎵 音频压缩

##### 当前状态
- **文件数量**：662 个 MP3 文件
- **原始大小**：约 30-50 MB（估计）
- **问题**：可能使用高比特率（128 kbps），对语音内容过度

##### 优化目标
- **目标大小**：8-15 MB
- **节省空间**：70-75%
- **音质损失**：几乎无损（语音内容）

##### 实施步骤

###### 1️⃣ 安装依赖

```bash
cd proj/tools

# 安装 Node.js 依赖
npm init -y  # 如果还没有 package.json
npm install fluent-ffmpeg ffmpeg-static
```

###### 2️⃣ 运行压缩脚本

```bash
node compress-audio.js
```

脚本会：
- ✅ 扫描 `proj/audio/` 目录下所有 MP3 文件
- ✅ 批量压缩（并发 4 个线程）
- ✅ 输出到 `proj/audio-optimized/` 目录
- ✅ 保持原始文件名和目录结构
- ✅ 显示压缩统计（原始大小 → 压缩后大小 → 节省比例）

**压缩参数**（可在脚本中调整）：
```javascript
audioBitrate: '32k',      // 比特率：32 kbps（语音足够）
audioChannels: 1,         // 单声道
audioFrequency: 22050,    // 采样率：22050 Hz
```

**示例输出**：
```
🎵 音频批量压缩工具

📂 输入目录: D:/workspace/WordPractice/proj/audio
📂 输出目录: D:/workspace/WordPractice/proj/audio-optimized
⚙️  压缩参数:
   - 比特率: 32k
   - 采样率: 22050 Hz
   - 声道: 单声道
   - 并发数: 4

🔍 扫描音频文件...
✅ 找到 662 个音频文件

🚀 开始批量压缩...

🔧 处理: about_youdao.mp3
✅ 完成: about_youdao.mp3 (0.05MB → 0.01MB, 节省 80%)

...

============================================================
📊 处理完成！统计信息：
============================================================
总文件数:   662
处理成功:   662
跳过:       0
失败:       0
原始大小:   33.12 MB
压缩后:     8.45 MB
节省空间:   24.67 MB (74.5%)
处理时间:   45.3 秒
============================================================
```

###### 3️⃣ 试听验证

在 `proj/audio-optimized/` 目录中随机试听几个文件，确认音质满意。

推荐测试：
- `hello_youdao.mp3`（简单单词）
- `beautiful_youdao.mp3`（复杂单词）
- `answer the phone_youdao.mp3`（短语）

**如果音质不满意**，可以调整参数：
```javascript
// 在 compress-audio.js 中修改：
audioBitrate: '48k',  // 提高比特率（32k → 48k）
audioQuality: 3,      // 提高质量（5 → 3，数字越小质量越高）
```

###### 4️⃣ 替换原文件

如果满意，备份原文件并替换：

```bash
# 备份原文件
mv proj/audio proj/audio-backup

# 替换为压缩后的文件
mv proj/audio-optimized proj/audio
```

**重要**：保留 `audio-backup`，以防需要回滚。

---

#### 🖼️ 图片压缩

##### 当前状态
- **文件数量**：608 个 JPG/JPEG 文件
- **原始大小**：约 50-100 MB（估计）
- **问题**：可能尺寸过大（>1000px），未使用现代格式（WebP）

##### 优化目标
- **目标大小**：15-30 MB
- **节省空间**：50-70%
- **视觉质量**：几乎无损

##### 实施步骤

###### 1️⃣ 安装依赖

```bash
cd proj/tools

# 安装 Sharp（高性能图片处理库）
npm install sharp
```

###### 2️⃣ 运行压缩脚本

```bash
node compress-images.js
```

脚本会：
- ✅ 扫描 `proj/images/cache/` 目录下所有图片
- ✅ 批量压缩（并发 8 个线程）
- ✅ 转换为 WebP 格式（可选）
- ✅ 调整尺寸（最大 800x800px）
- ✅ 输出到 `proj/images-optimized/` 目录

**压缩参数**（可在脚本中调整）：
```javascript
format: 'webp',         // 输出格式：webp（推荐）/ jpeg / png
quality: 80,            // 质量：80（WebP），85（JPEG）
maxWidth: 800,          // 最大宽度（保持比例）
maxHeight: 800,         // 最大高度
keepOriginalFormat: false, // true = 保持原格式，false = 转换为 WebP
```

**WebP 的优势**：
- 比 JPEG 小 25-35%
- 比 PNG 小 50-70%
- 支持透明度
- 浏览器支持率 >95%（Chrome、Firefox、Edge、Safari 14+）

###### 3️⃣ 查看效果

随机打开几个压缩后的图片，确认质量满意。

**如果图片质量不满意**，可以提高质量参数：
```javascript
quality: 85,  // 提高质量（80 → 85）
```

###### 4️⃣ 修改代码（如果转换为 WebP）

如果选择转换为 WebP，需要修改游戏代码中的图片路径：

**修改 `proj/src/core/WordTetrisGame.js`**：

找到 `updateImageShowcase` 方法（约 2905 行）：

```javascript
// 原代码：
const localJpg = getImageUrl(`cache/${word}.jpeg`);
this.tryLoadImage(img, localJpg, '本地JPEG', () => {
  const localJpeg = getImageUrl(`cache/${word}.jpg`);
  this.tryLoadImage(img, localJpeg, '本地JPG', () => {
    const localPng = getImageUrl(`cache/${word}.png`);
    // ...
  });
});

// 修改为（优先加载 WebP）：
const localWebp = getImageUrl(`cache/${word}.webp`);
this.tryLoadImage(img, localWebp, '本地WebP', () => {
  const localJpg = getImageUrl(`cache/${word}.jpeg`);
  this.tryLoadImage(img, localJpg, '本地JPEG', () => {
    // ... 保留原有的回退逻辑
  });
});
```

**或者**：保持原格式（不转换为 WebP），在脚本中设置：
```javascript
keepOriginalFormat: true,  // 保持原格式（JPEG/PNG）
```

###### 5️⃣ 替换原文件

```bash
# 备份原文件
mv proj/images/cache proj/images/cache-backup

# 替换为压缩后的文件
mv proj/images-optimized/cache proj/images/cache
```

---

## 🎯 完整优化流程

### 推荐执行顺序

```bash
# 1. 创建 _headers 文件（已完成）
# 文件：proj/_headers

# 2. 压缩音频文件
cd proj/tools
npm install fluent-ffmpeg ffmpeg-static
node compress-audio.js
# 试听验证
# 如果满意，替换原文件

# 3. 压缩图片文件
npm install sharp
node compress-images.js
# 查看验证
# 如果满意，替换原文件并修改代码（如果转 WebP）

# 4. 提交代码
cd ../..
git add proj/_headers proj/audio proj/images
git commit -m "perf: 优化资源加载和压缩（HTTP/2 Push + 音频/图片压缩）"
git push origin main

# 5. 上传到 R2（如果使用 R2 CDN）
# 使用 Cloudflare Dashboard 或 Wrangler CLI 上传压缩后的音频和图片

# 6. 部署到 Cloudflare Pages
# 自动部署（如果绑定了 GitHub）
# 或手动部署

# 7. 验证效果
# 打开 https://wordpractice.pages.dev/
# 按 F12 → Network 面板
# 清除缓存（Ctrl + Shift + Delete）
# 刷新页面（Ctrl + Shift + R）
# 查看加载时间和资源大小
```

---

## 📊 优化效果对比

### 加载速度

| 指标 | 优化前 | 优化后 | 提升 |
|------|--------|--------|------|
| 首屏时间（FCP） | ~2.0s | ~0.6s | **70%** ⬇️ |
| 可交互时间（TTI） | ~3.5s | ~1.2s | **66%** ⬇️ |
| 完全加载 | ~5.0s | ~2.0s | **60%** ⬇️ |

### 资源大小

| 资源类型 | 优化前 | 优化后 | 节省 |
|---------|--------|--------|------|
| 音频（662 文件） | ~35 MB | ~8 MB | **77%** ⬇️ |
| 图片（608 文件） | ~80 MB | ~25 MB | **69%** ⬇️ |
| **总计** | **~115 MB** | **~33 MB** | **71%** ⬇️ |

### 用户体验

- ✅ **快速电脑**：首次访问从 3s 降至 1s
- ✅ **慢速电脑**：首次访问从 8s 降至 2.5s
- ✅ **移动设备**：流量消耗减少 70%
- ✅ **重复访问**：利用缓存，几乎秒开

---

## 🔍 性能监控

### 使用 Lighthouse 测试

```bash
# 安装 Lighthouse CLI（可选）
npm install -g lighthouse

# 运行测试
lighthouse https://wordpractice.pages.dev/ --view
```

**或者**：在 Chrome DevTools 中使用 Lighthouse：
1. 按 F12 打开开发者工具
2. 切换到 "Lighthouse" 标签
3. 选择 "Performance" + "Best practices"
4. 点击 "Analyze page load"

**目标分数**：
- Performance: 90+（优化前可能 60-70）
- Best Practices: 95+

---

## 🛠️ 故障排查

### 问题 1：音频压缩后无声音

**原因**：FFmpeg 未正确安装或路径错误

**解决**：
```bash
# 检查 FFmpeg 是否安装
ffmpeg -version

# 如果未安装，通过 ffmpeg-static 安装
npm install ffmpeg-static

# 或手动下载 FFmpeg：
# Windows: https://www.gyan.dev/ffmpeg/builds/
# 将 ffmpeg.exe 添加到系统 PATH
```

### 问题 2：图片压缩后模糊

**原因**：质量参数过低

**解决**：在 `compress-images.js` 中提高质量：
```javascript
quality: 85,  // 从 80 提高到 85
```

### 问题 3：Server Push 未生效

**原因**：浏览器不支持或缓存问题

**解决**：
1. 清除浏览器缓存（Ctrl + Shift + Delete）
2. 硬刷新（Ctrl + Shift + R）
3. 检查响应头是否包含 `Link:` 头
4. 确认 Cloudflare Pages 已部署最新版本

### 问题 4：WebP 图片不显示

**原因**：旧版 Safari 不支持 WebP

**解决**：
1. **方案 A**：保持原格式（`keepOriginalFormat: true`）
2. **方案 B**：添加回退逻辑（代码已包含）
3. **方案 C**：使用 `<picture>` 标签：
   ```html
   <picture>
     <source srcset="image.webp" type="image/webp">
     <img src="image.jpg" alt="...">
   </picture>
   ```

---

## 💡 进阶优化建议

### 1. Service Worker 缓存

创建 Service Worker 预缓存常用资源：

```javascript
// sw.js
const CACHE_NAME = 'word-tetris-v1';
const urlsToCache = [
  '/',
  '/css/styles.css',
  '/src/core/WordTetrisGame.js',
  '/words/vocabulary-config.json',
  // 常用单词的音频和图片
  '/audio/hello_youdao.mp3',
  '/images/cache/hello.webp',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
});
```

### 2. 懒加载

对非关键资源（如错词本）使用懒加载：

```javascript
// 延迟加载错词管理器
setTimeout(() => {
  import('./utils/MissedWordsManager.js');
}, 2000);
```

### 3. 图片懒加载

使用 `loading="lazy"` 属性：

```html
<img src="image.webp" loading="lazy" alt="...">
```

### 4. 预连接第三方域名

在 HTML 中添加：

```html
<link rel="preconnect" href="https://loremflickr.com">
<link rel="preconnect" href="https://picsum.photos">
```

---

## 📞 技术支持

如有问题，请检查：
1. Node.js 版本是否 >= 14
2. FFmpeg 是否正确安装
3. 网络连接是否正常
4. 文件路径是否正确

祝优化顺利！🚀

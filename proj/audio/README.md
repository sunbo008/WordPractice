# 语音缓存目录

## 📁 目录说明

此目录用于存储本地开发环境的音频缓存文件。

## 🎯 工作原理

### 本地开发环境

1. **自动检测**：系统检测到 `localhost` 环境时，优先使用此目录的音频文件
2. **文件命名规则**：`{单词}_{提供商}.mp3`
   - 示例：`hello_youdao.mp3`、`world_baidu.mp3`
3. **手动保存**：
   - 游戏会尝试下载在线音频并提示保存
   - 如果遇到 CORS 限制，无法自动下载，可以手动下载音频文件并保存到此目录
4. **Git 提交**：保存的音频文件可以通过 git 提交到代码库

### Vercel 生产环境

- **IndexedDB 存储**：自动使用浏览器的 IndexedDB 缓存音频
- **持久化保存**：升级版本后缓存不会丢失
- **自动管理**：无需手动操作

## 📝 使用示例

### 手动下载音频（如果需要）

1. **有道词典 TTS**：
   ```
   https://dict.youdao.com/dictvoice?audio=hello&type=1
   ```
   保存为：`hello_youdao.mp3`

2. **百度翻译 TTS**：
   ```
   https://fanyi.baidu.com/gettts?lan=en&text=hello&spd=5&source=web
   ```
   保存为：`hello_baidu.mp3`

3. **Google Translate TTS**：
   ```
   https://translate.google.com/translate_tts?ie=UTF-8&tl=en&client=tw-ob&q=hello
   ```
   保存为：`hello_google.mp3`

### 批量下载（本地开发环境）

游戏运行时，打开浏览器控制台，执行：

```javascript
// 查看待下载队列
console.log(window._audioCacheDownloadQueue);

// 批量下载所有音频文件
downloadLocalAudio();
```

## 🔍 缓存优先级

1. **本地文件**（此目录）
2. **IndexedDB 缓存**
3. **在线 TTS**

## ⚠️ 注意事项

1. **CORS 限制**：某些 TTS 服务有跨域限制，无法通过 `fetch()` 下载
   - 遇到此情况时，系统会自动降级到直接播放在线音频
   - 如需缓存，请手动访问 URL 并保存音频文件

2. **文件大小**：建议只缓存常用单词，避免仓库体积过大

3. **音频格式**：统一使用 MP3 格式

## 📊 缓存统计

在浏览器控制台执行以下命令查看缓存信息：

```javascript
// 获取 AudioCacheManager 实例
const cacheManager = AudioCacheManager.getInstance();

// 查看缓存统计
await cacheManager.getStats();

// 清空所有 IndexedDB 缓存
await cacheManager.clearAllCache();
```

## 🎉 示例文件

```
proj/audio/
  ├── hello_youdao.mp3
  ├── world_baidu.mp3
  ├── good_youdao.mp3
  └── README.md（本文件）
```

---

**提示**：如果音频文件较多，建议只提交高频单词的音频文件到 git，其他单词使用在线 TTS。

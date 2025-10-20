# 免费词典和翻译 API 使用指南

本文档介绍多个免费的英语词典和翻译 API，以及如何集成到 Word Tetris 项目中。

---

## 📋 目录

- [API 对比总览](#api-对比总览)
- [完全免费 API（无需密钥）](#完全免费-api无需密钥)
- [有免费额度的 API（需注册）](#有免费额度的-api需注册)
- [集成示例代码](#集成示例代码)
- [使用建议](#使用建议)
- [常见问题](#常见问题)

---

## API 对比总览

| API 名称 | 免费额度 | 需要密钥 | 中文翻译 | 音标 | 发音 | 例句 | 推荐度 |
|---------|---------|---------|---------|------|------|------|--------|
| **Free Dictionary API** | ♾️ 无限 | ❌ 不需要 | ❌ 无 | ✅ 有 | ✅ 有 | ✅ 有 | ⭐⭐⭐⭐⭐ |
| **Wiktionary API** | ♾️ 无限 | ❌ 不需要 | ✅ 部分 | ✅ 有 | ❌ 无 | ✅ 有 | ⭐⭐⭐⭐ |
| **有道智云** | 100万字符/月 | ✅ 需要 | ✅ 有 | ✅ 有 | ✅ 有 | ✅ 有 | ⭐⭐⭐⭐⭐ |
| **百度翻译** | 5-100万字符/月 | ✅ 需要 | ✅ 有 | ❌ 无 | ✅ 有 | ❌ 无 | ⭐⭐⭐ |
| **腾讯翻译** | 500万字符/月 | ✅ 需要 | ✅ 有 | ❌ 无 | ❌ 无 | ❌ 无 | ⭐⭐⭐ |
| **DeepL API** | 50万字符/月 | ✅ 需要 | ✅ 有 | ❌ 无 | ❌ 无 | ❌ 无 | ⭐⭐⭐⭐ |

---

## 完全免费 API（无需密钥）

### 1. Free Dictionary API ⭐ 强烈推荐

#### 📝 简介
- **官网**：https://dictionaryapi.dev/
- **特点**：完全免费、无限调用、无需注册、开源项目
- **数据来源**：Google 词典、维基词典、WordNet

#### 🔗 API 端点
```
GET https://api.dictionaryapi.dev/api/v2/entries/en/{word}
```

#### 📊 返回数据结构
```json
[
  {
    "word": "hello",
    "phonetic": "/həˈloʊ/",
    "phonetics": [
      {
        "text": "/həˈloʊ/",
        "audio": "https://api.dictionaryapi.dev/media/pronunciations/en/hello-au.mp3"
      },
      {
        "text": "/hɛˈloʊ/",
        "audio": "https://api.dictionaryapi.dev/media/pronunciations/en/hello-uk.mp3"
      }
    ],
    "meanings": [
      {
        "partOfSpeech": "noun",
        "definitions": [
          {
            "definition": "A greeting (salutation) said when meeting someone or acknowledging someone's arrival or presence.",
            "synonyms": [],
            "antonyms": [],
            "example": "She waved me a hello."
          }
        ],
        "synonyms": ["greeting"],
        "antonyms": ["goodbye"]
      },
      {
        "partOfSpeech": "verb",
        "definitions": [
          {
            "definition": "To greet with \"hello\".",
            "example": "I hello'd my friend when I saw her."
          }
        ]
      },
      {
        "partOfSpeech": "interjection",
        "definitions": [
          {
            "definition": "A greeting used when meeting someone or acknowledging someone's arrival or presence.",
            "example": "Hello, how are you?"
          }
        ]
      }
    ],
    "license": {
      "name": "CC BY-SA 3.0",
      "url": "https://creativecommons.org/licenses/by-sa/3.0"
    },
    "sourceUrls": [
      "https://en.wiktionary.org/wiki/hello"
    ]
  }
]
```

#### 💻 使用示例

**原生 JavaScript：**
```javascript
async function lookupWord(word) {
  const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`;
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      if (response.status === 404) {
        return { error: 'Word not found' };
      }
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    return data[0]; // 返回第一个结果
  } catch (error) {
    console.error('Lookup failed:', error);
    return { error: error.message };
  }
}

// 使用
const result = await lookupWord('hello');
console.log('音标:', result.phonetic);
console.log('发音:', result.phonetics[0].audio);
console.log('释义:', result.meanings[0].definitions[0].definition);
```

**Node.js（Vercel Serverless Function）：**
```javascript
// api/dictionary.js
export default async function handler(req, res) {
  const { word } = req.query;
  
  if (!word) {
    return res.status(400).json({ error: 'Missing word parameter' });
  }
  
  const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`;
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      if (response.status === 404) {
        return res.status(404).json({ error: 'Word not found' });
      }
      throw new Error(`Upstream error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // 简化数据结构
    const simplified = {
      word: data[0].word,
      phonetic: data[0].phonetic,
      audio: data[0].phonetics.find(p => p.audio)?.audio || null,
      meanings: data[0].meanings.map(m => ({
        partOfSpeech: m.partOfSpeech,
        definition: m.definitions[0].definition,
        example: m.definitions[0].example || null
      }))
    };
    
    res.setHeader('Cache-Control', 'public, max-age=86400'); // 缓存 1 天
    res.json(simplified);
  } catch (error) {
    console.error('Dictionary API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
```

#### ✨ 优点
- ✅ 完全免费，无限调用
- ✅ 无需注册或密钥
- ✅ 包含音标、发音、例句、同义词
- ✅ 开源项目，可自己部署
- ✅ 响应速度快

#### ⚠️ 缺点
- ❌ 仅支持英文释义（无中文翻译）
- ❌ 数据覆盖不如商业 API
- ❌ 某些生僻词可能查不到

---

### 2. Wiktionary API

#### 📝 简介
- **官网**：https://en.wiktionary.org/
- **特点**：维基词典官方 API，多语言支持
- **数据来源**：维基媒体基金会

#### 🔗 API 端点
```
GET https://en.wiktionary.org/api/rest_v1/page/definition/{word}
```

#### 📊 返回数据示例
```json
{
  "en": [
    {
      "partOfSpeech": "noun",
      "language": "en",
      "definitions": [
        {
          "definition": "A greeting (salutation) said when meeting someone.",
          "parsedExamples": [
            {
              "example": "She waved me a hello."
            }
          ]
        }
      ]
    }
  ]
}
```

#### 💻 使用示例
```javascript
async function lookupWiktionary(word) {
  const url = `https://en.wiktionary.org/api/rest_v1/page/definition/${word}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    return data.en || data; // 返回英文条目
  } catch (error) {
    console.error('Wiktionary lookup failed:', error);
    return null;
  }
}
```

#### ✨ 优点
- ✅ 完全免费
- ✅ 支持多语言
- ✅ 数据丰富（词源、用法等）

#### ⚠️ 缺点
- ❌ API 不太稳定
- ❌ 数据格式复杂
- ❌ 无音频发音

---

## 有免费额度的 API（需注册）

### 3. 有道智云 API ⭐ 中文推荐

#### 📝 简介
- **官网**：https://ai.youdao.com/
- **免费额度**：新用户 100万字符/月（文本翻译）
- **收费标准**：超出后 49元/百万字符

#### 🔑 申请步骤

1. **注册账号**
   - 访问 https://ai.youdao.com/
   - 使用邮箱或手机号注册

2. **创建应用**
   - 进入控制台
   - 创建「文本翻译」应用
   - 获取 `AppKey` 和 `AppSecret`

3. **绑定服务**
   - 将「文本翻译」服务绑定到应用
   - 查看免费额度

#### 🔗 API 端点
```
POST https://openapi.youdao.com/api
```

#### 📊 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| q | string | 是 | 待翻译文本 |
| from | string | 是 | 源语言（en/zh-CHS/auto） |
| to | string | 是 | 目标语言（en/zh-CHS） |
| appKey | string | 是 | 应用 ID |
| salt | string | 是 | 随机数（UUID） |
| sign | string | 是 | 签名（MD5） |
| signType | string | 否 | 签名类型（v3） |
| curtime | string | 否 | 当前时间戳 |

#### 🔐 签名计算
```javascript
// 签名算法：MD5(appKey + q + salt + curtime + appSecret)
import crypto from 'crypto';

function generateSign(appKey, q, salt, curtime, appSecret) {
  const str = appKey + truncate(q) + salt + curtime + appSecret;
  return crypto.createHash('md5').update(str).digest('hex');
}

function truncate(q) {
  const len = q.length;
  if (len <= 20) return q;
  return q.substring(0, 10) + len + q.substring(len - 10, len);
}
```

#### 💻 完整示例（Vercel Serverless）

```javascript
// api/youdao-translate.js
import crypto from 'crypto';

export default async function handler(req, res) {
  const { word, from = 'en', to = 'zh-CHS' } = req.query;
  
  if (!word) {
    return res.status(400).json({ error: 'Missing word parameter' });
  }
  
  const appKey = process.env.YOUDAO_APP_KEY;
  const appSecret = process.env.YOUDAO_APP_SECRET;
  
  if (!appKey || !appSecret) {
    return res.status(500).json({ error: 'API credentials not configured' });
  }
  
  const salt = Date.now().toString();
  const curtime = Math.round(Date.now() / 1000).toString();
  
  // 计算签名
  const sign = crypto.createHash('md5')
    .update(appKey + truncate(word) + salt + curtime + appSecret)
    .digest('hex');
  
  const url = 'https://openapi.youdao.com/api';
  const params = new URLSearchParams({
    q: word,
    from,
    to,
    appKey,
    salt,
    sign,
    signType: 'v3',
    curtime
  });
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params
    });
    
    const data = await response.json();
    
    if (data.errorCode === '0') {
      res.json({
        word: data.query,
        translation: data.translation[0],
        phonetic: data.basic?.phonetic || null,
        explains: data.basic?.explains || []
      });
    } else {
      res.status(400).json({ error: `API error: ${data.errorCode}` });
    }
  } catch (error) {
    console.error('Translation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

function truncate(q) {
  const len = q.length;
  if (len <= 20) return q;
  return q.substring(0, 10) + len + q.substring(len - 10, len);
}
```

#### 📦 环境变量配置（Vercel）
在项目根目录创建 `.env.local`：
```bash
YOUDAO_APP_KEY=your_app_key_here
YOUDAO_APP_SECRET=your_app_secret_here
```

在 Vercel 后台配置环境变量：
```
Settings → Environment Variables → Add New
```

#### ✨ 优点
- ✅ 官方授权，合法合规
- ✅ 100万字符/月免费额度
- ✅ 支持中英互译
- ✅ 包含音标、例句
- ✅ 响应速度快

#### ⚠️ 缺点
- ❌ 需要注册申请
- ❌ 超出免费额度后收费
- ❌ 需要签名计算

---

### 4. 百度翻译 API

#### 📝 简介
- **官网**：https://fanyi-api.baidu.com/
- **免费额度**：
  - 标准版：5万字符/月
  - 高级版（认证后）：100万字符/月
- **收费标准**：49元/百万字符

#### 🔑 申请步骤
1. 注册百度账号
2. 开通翻译服务
3. 创建应用，获取 `APP ID` 和 `密钥`

#### 🔗 API 端点
```
GET https://fanyi-api.baidu.com/api/trans/vip/translate
```

#### 💻 使用示例
```javascript
// api/baidu-translate.js
import crypto from 'crypto';

export default async function handler(req, res) {
  const { word, from = 'en', to = 'zh' } = req.query;
  
  const appid = process.env.BAIDU_APP_ID;
  const key = process.env.BAIDU_APP_KEY;
  const salt = Date.now();
  
  // 签名：MD5(appid + q + salt + key)
  const sign = crypto.createHash('md5')
    .update(appid + word + salt + key)
    .digest('hex');
  
  const url = `https://fanyi-api.baidu.com/api/trans/vip/translate?q=${encodeURIComponent(word)}&from=${from}&to=${to}&appid=${appid}&salt=${salt}&sign=${sign}`;
  
  const response = await fetch(url);
  const data = await response.json();
  
  res.json(data);
}
```

---

### 5. 腾讯翻译 API

#### 📝 简介
- **官网**：https://cloud.tencent.com/product/tmt
- **免费额度**：500万字符/月
- **收费标准**：58元/百万字符

#### 🔑 申请步骤
1. 注册腾讯云账号
2. 开通机器翻译服务
3. 获取 `SecretId` 和 `SecretKey`

---

### 6. DeepL API

#### 📝 简介
- **官网**：https://www.deepl.com/pro-api
- **免费额度**：50万字符/月
- **特点**：翻译质量极高

#### 🔑 申请步骤
1. 注册 DeepL 账号
2. 申请 API Free 计划
3. 获取 `Auth Key`

#### 💻 使用示例
```javascript
async function translateWithDeepL(text, targetLang = 'ZH') {
  const authKey = process.env.DEEPL_AUTH_KEY;
  const url = 'https://api-free.deepl.com/v2/translate';
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `DeepL-Auth-Key ${authKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      text: [text],
      target_lang: targetLang
    })
  });
  
  const data = await response.json();
  return data.translations[0].text;
}
```

---

## 集成示例代码

### 统一词典服务封装

创建 `src/utils/DictionaryService.js`：

```javascript
/**
 * 词典服务 - 统一封装多个 API
 */
class DictionaryService {
  constructor() {
    this.providers = [
      {
        name: 'Free Dictionary API',
        lookup: this.lookupFreeDictionary.bind(this),
        priority: 1
      },
      {
        name: 'Youdao API',
        lookup: this.lookupYoudao.bind(this),
        priority: 2
      }
    ];
  }
  
  /**
   * 查询单词（自动降级）
   */
  async lookup(word) {
    for (const provider of this.providers) {
      try {
        console.log(`尝试使用 ${provider.name} 查询...`);
        const result = await provider.lookup(word);
        
        if (result && !result.error) {
          console.log(`✅ ${provider.name} 查询成功`);
          return {
            ...result,
            provider: provider.name
          };
        }
      } catch (error) {
        console.warn(`${provider.name} 查询失败:`, error);
        continue;
      }
    }
    
    return { error: 'All providers failed' };
  }
  
  /**
   * Free Dictionary API
   */
  async lookupFreeDictionary(word) {
    const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    const entry = data[0];
    
    return {
      word: entry.word,
      phonetic: entry.phonetic,
      audio: entry.phonetics.find(p => p.audio)?.audio,
      meanings: entry.meanings.map(m => ({
        partOfSpeech: m.partOfSpeech,
        definition: m.definitions[0].definition,
        example: m.definitions[0].example
      }))
    };
  }
  
  /**
   * 有道 API（通过代理）
   */
  async lookupYoudao(word) {
    const url = `/api/youdao-translate?word=${encodeURIComponent(word)}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      word: data.word,
      translation: data.translation,
      phonetic: data.phonetic,
      explains: data.explains
    };
  }
}

// 全局单例
window.DictionaryService = new DictionaryService();
```

### 在游戏中使用

```javascript
// 查询单词
const dict = window.DictionaryService;
const result = await dict.lookup('hello');

if (result.error) {
  console.error('查询失败:', result.error);
} else {
  console.log('单词:', result.word);
  console.log('音标:', result.phonetic);
  console.log('翻译:', result.translation);
  console.log('提供商:', result.provider);
  
  // 播放发音
  if (result.audio) {
    const audio = new Audio(result.audio);
    audio.play();
  }
}
```

---

## 使用建议

### 1. 多 API 降级策略

```javascript
// 推荐顺序
const providers = [
  'Free Dictionary API',  // 优先：免费无限
  'Youdao API',          // 次选：有中文翻译
  'Local Cache'          // 兜底：本地缓存
];
```

### 2. 缓存机制

```javascript
class CachedDictionaryService {
  constructor() {
    this.cache = new Map();
    this.maxSize = 1000;
  }
  
  async lookup(word) {
    // 检查缓存
    if (this.cache.has(word)) {
      console.log('✅ 命中缓存');
      return this.cache.get(word);
    }
    
    // 查询 API
    const result = await this.queryAPI(word);
    
    // 存入缓存
    if (!result.error) {
      this.cache.set(word, result);
      
      // 限制缓存大小
      if (this.cache.size > this.maxSize) {
        const firstKey = this.cache.keys().next().value;
        this.cache.delete(firstKey);
      }
    }
    
    return result;
  }
}
```

### 3. 离线降级

```javascript
// 预加载常用单词词库
const offlineDictionary = {
  "hello": {
    phonetic: "/həˈloʊ/",
    translation: "你好",
    audio: "/audio/hello_youdao.mp3"
  },
  // ... 更多单词
};

// 离线查询
function lookupOffline(word) {
  return offlineDictionary[word.toLowerCase()] || null;
}
```

### 4. 错误处理

```javascript
async function safeLookup(word) {
  try {
    return await dictService.lookup(word);
  } catch (error) {
    console.error('查询失败:', error);
    
    // 降级到离线词库
    const offline = lookupOffline(word);
    if (offline) {
      return { ...offline, source: 'offline' };
    }
    
    return { error: '查询失败，请检查网络连接' };
  }
}
```

---

## 常见问题

### Q1：如何选择 API？
**A**：
- 仅需英文释义 → **Free Dictionary API**
- 需要中文翻译 → **有道智云 API**
- 追求翻译质量 → **DeepL API**
- 预算有限 → **Free Dictionary + 本地缓存**

### Q2：如何避免超出免费额度？
**A**：
1. 实施缓存机制（本地 + 浏览器）
2. 仅在必要时调用 API
3. 优先使用完全免费的 API
4. 监控用量（API 后台查看）

### Q3：API 查询失败怎么办？
**A**：
1. 实施多 API 降级策略
2. 使用本地词库兜底
3. 显示友好的错误提示
4. 记录错误日志，排查问题

### Q4：如何保护 API 密钥？
**A**：
```bash
# ❌ 错误：直接写在前端代码
const apiKey = 'your_secret_key';

# ✅ 正确：使用环境变量 + 后端代理
// .env.local
YOUDAO_APP_KEY=xxx
YOUDAO_APP_SECRET=xxx

// 前端调用代理接口
fetch('/api/translate?word=hello')
```

### Q5：能否同时使用多个 API？
**A**：可以！建议策略：
```javascript
// 1. 先查本地缓存
const cached = getFromCache(word);
if (cached) return cached;

// 2. 使用免费 API（英文释义）
const english = await lookupFreeDictionary(word);

// 3. 如有必要，查询中文翻译
const chinese = await lookupYoudao(word);

// 4. 合并结果
return { ...english, translation: chinese };
```

### Q6：如何处理单词不存在的情况？
**A**：
```javascript
const result = await dict.lookup(word);

if (result.error || result.status === 404) {
  console.log('单词不存在，可能是：');
  console.log('- 拼写错误');
  console.log('- 生僻词（词库未收录）');
  console.log('- 专有名词');
  
  // 提供拼写建议
  const suggestions = getSuggestions(word);
  console.log('您是否要查询:', suggestions);
}
```

---

## 总结

### 推荐组合方案

#### 方案 A：完全免费（推荐新手）
```
Free Dictionary API (英文) + 本地词库 (中文)
```
- ✅ 零成本
- ✅ 无限调用
- ⚠️ 需要自己准备中文词库

#### 方案 B：混合方案（推荐）
```
Free Dictionary API (主力) + 有道智云 (中文翻译)
```
- ✅ 体验最好
- ✅ 100万字符/月免费
- ⚠️ 需要注册有道账号

#### 方案 C：纯在线（适合商业）
```
有道智云 API (主力) + DeepL API (高质量翻译)
```
- ✅ 功能完整
- ✅ 质量最高
- ⚠️ 超出免费额度后收费

### 快速开始

1. **立即可用**：
   ```javascript
   fetch('https://api.dictionaryapi.dev/api/v2/entries/en/hello')
   ```

2. **5分钟集成**：
   - 复制上面的 `DictionaryService.js`
   - 在项目中引入
   - 开始使用！

3. **进阶优化**：
   - 添加缓存机制
   - 实现离线降级
   - 配置有道 API

祝您使用愉快！🎉



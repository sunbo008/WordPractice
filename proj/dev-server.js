/*
 * 高性能本地开发服务器（无需依赖），提供：
 * 1) 静态文件服务（根目录 = proj/）
 * 2) /api/youdao-tts 代理，有道 TTS → 解决浏览器端 CORS 下载问题
 * 3) 支持 _headers 文件配置（Cloudflare Pages 兼容）
 * 4) 文件缓存优化
 *
 * 启动：
 *   node proj/dev-server.js
 * 访问：
 *   http://localhost:3000/tests/tts-service-test.html
 */

import http from 'http';
import { readFile, stat } from 'fs/promises';
import path from 'path';
import url from 'url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const PROJ_ROOT = __dirname; // proj 目录
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

// 文件缓存（开发环境可选，生产环境建议开启）
const FILE_CACHE = new Map();
const CACHE_ENABLED = process.env.CACHE === '1';

// _headers 配置缓存
let headersConfig = null;
let headersConfigMtime = 0;

const contentTypeByExt = (ext) => {
  switch (ext) {
    case '.html': return 'text/html; charset=utf-8';
    case '.js': return 'application/javascript; charset=utf-8';
    case '.css': return 'text/css; charset=utf-8';
    case '.json': return 'application/json; charset=utf-8';
    case '.mp3': return 'audio/mpeg';
    case '.png': return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.svg': return 'image/svg+xml';
    case '.ico': return 'image/x-icon';
    default: return 'application/octet-stream';
  }
};

// 解析 _headers 文件
async function loadHeadersConfig() {
  const headersPath = path.join(PROJ_ROOT, '_headers');
  try {
    const st = await stat(headersPath);
    if (st.mtimeMs === headersConfigMtime && headersConfig) {
      return headersConfig;
    }

    const content = await readFile(headersPath, 'utf-8');
    const config = [];
    let currentPath = null;
    let currentHeaders = {};

    for (const line of content.split('\n')) {
      const trimmed = line.trim();

      // 跳过注释和空行
      if (!trimmed || trimmed.startsWith('#')) continue;

      // 新路径段（不以空格开头）
      if (!line.startsWith(' ') && !line.startsWith('\t')) {
        if (currentPath) {
          config.push({ path: currentPath, headers: currentHeaders });
        }
        currentPath = trimmed;
        currentHeaders = {};
      } else if (currentPath) {
        // 头部配置（以空格或制表符开头）
        const colonIndex = trimmed.indexOf(':');
        if (colonIndex > 0) {
          const key = trimmed.substring(0, colonIndex).trim();
          const value = trimmed.substring(colonIndex + 1).trim();

          // 支持多个 Link 头（HTTP/2 Server Push）
          if (key === 'Link') {
            if (!currentHeaders[key]) {
              currentHeaders[key] = [];
            }
            currentHeaders[key].push(value);
          } else {
            currentHeaders[key] = value;
          }
        }
      }
    }

    // 添加最后一个路径
    if (currentPath) {
      config.push({ path: currentPath, headers: currentHeaders });
    }

    headersConfig = config;
    headersConfigMtime = st.mtimeMs;
    console.log(`✓ Loaded _headers config (${config.length} rules)`);
    return config;
  } catch (e) {
    if (e.code !== 'ENOENT') {
      console.warn('Warning: Failed to load _headers:', e.message);
    }
    return [];
  }
}

// 匹配 URL 路径到 _headers 规则
function matchHeadersForPath(pathname, config) {
  const headers = {};
  const matchedRules = [];

  // 先找出所有匹配的规则
  for (const rule of config) {
    let pattern = rule.path;

    // 转换 _headers 模式为正则表达式
    // /path/* → /path/.*
    // /* → /.*
    pattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '\\?');

    const regex = new RegExp(`^${pattern}$`);

    if (regex.test(pathname)) {
      // 计算规则的特异性（路径越长越具体）
      const specificity = rule.path.split('/').length;
      matchedRules.push({ rule, specificity });
    }
  }

  // 按特异性排序（通用规则先，具体规则后，这样具体规则可以覆盖通用规则）
  matchedRules.sort((a, b) => a.specificity - b.specificity);

  // 按顺序应用规则（后面的规则覆盖前面的）
  for (const { rule } of matchedRules) {
    for (const [key, value] of Object.entries(rule.headers)) {
      if (key === 'Link' && Array.isArray(value)) {
        // Link 头支持多个值
        headers[key] = headers[key] || [];
        if (Array.isArray(headers[key])) {
          headers[key].push(...value);
        }
      } else {
        headers[key] = value;
      }
    }
  }

  return headers;
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, headers);
  if (body instanceof Buffer) {
    res.end(body);
  } else {
    res.end(String(body));
  }
}

function notFound(res, msg = 'Not Found') {
  send(res, 404, msg, { 'Content-Type': 'text/plain; charset=utf-8' });
}

async function handleProxyYoudaoTTS(req, res, searchParams) {
  const word = (searchParams.get('word') || '').trim();
  if (!word) {
    return send(res, 400, JSON.stringify({ error: 'missing word' }), {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*'
    });
  }
  const upstreamUrl = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=1`;
  try {
    const upstream = await fetch(upstreamUrl);
    if (!upstream.ok) {
      return send(res, upstream.status, JSON.stringify({ error: `upstream ${upstream.status}` }), {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
      });
    }
    const arrayBuf = await upstream.arrayBuffer();
    const buf = Buffer.from(arrayBuf);
    send(res, 200, buf, {
      'Content-Type': 'audio/mpeg',
      'Content-Length': String(buf.length),
      'Content-Disposition': `attachment; filename="${word.toLowerCase()}_youdao.mp3"`,
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=31536000, immutable'
    });
  } catch (e) {
    send(res, 500, JSON.stringify({ error: e?.message || String(e) }), {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*'
    });
  }
}

async function handleStatic(req, res, pathname) {
  // 将 URL 路径映射到 proj/ 下的文件
  const safePath = path.normalize(path.join(PROJ_ROOT, pathname.replace(/^\/+/, '')));
  if (!safePath.startsWith(PROJ_ROOT)) {
    return notFound(res);
  }

  let filePath = safePath;
  let actualPathname = pathname;

  try {
    const st = await stat(filePath);
    if (st.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
      actualPathname = pathname === '/' ? '/index.html' : `${pathname}/index.html`;
    }
  } catch {
    return notFound(res);
  }

  // 检查缓存
  let data;
  if (CACHE_ENABLED && FILE_CACHE.has(filePath)) {
    data = FILE_CACHE.get(filePath);
  } else {
    try {
      data = await readFile(filePath);
      if (CACHE_ENABLED) {
        FILE_CACHE.set(filePath, data);
      }
    } catch (e) {
      return notFound(res);
    }
  }

  // 准备响应头
  const ext = path.extname(filePath).toLowerCase();
  const responseHeaders = { 'Content-Type': contentTypeByExt(ext) };

  // 加载并应用 _headers 配置
  const config = await loadHeadersConfig();
  const customHeaders = matchHeadersForPath(actualPathname, config);

  // 合并自定义头部
  for (const [key, value] of Object.entries(customHeaders)) {
    if (key === 'Link' && Array.isArray(value)) {
      // Link 头需要合并为多行
      responseHeaders[key] = value.join(', ');
    } else {
      responseHeaders[key] = value;
    }
  }

  send(res, 200, data, responseHeaders);
}

const server = http.createServer(async (req, res) => {
  const parsed = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = parsed.pathname;

  // API 路由：/api/youdao-tts
  if (pathname === '/api/youdao-tts') {
    return handleProxyYoudaoTTS(req, res, parsed.searchParams);
  }

  // 静态文件
  return handleStatic(req, res, pathname);
});

// 启动时加载 _headers 配置
loadHeadersConfig().then(() => {
  // 只监听本地回环地址，防止外部直接访问
  server.listen(PORT, '127.0.0.1', () => {
    console.log('');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  🚀 高性能开发服务器已启动                                 ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log(`║  📡 本地地址: http://127.0.0.1:${PORT}`.padEnd(61) + '║');
    console.log(`║  🔒 监听地址: 127.0.0.1 (仅本地访问)`.padEnd(61) + '║');
    console.log(`║  📁 根目录: ${PROJ_ROOT}`.padEnd(61) + '║');
    console.log(`║  ⚡ 文件缓存: ${CACHE_ENABLED ? '已启用 (CACHE=1)' : '已禁用 (设置 CACHE=1 启用)'}`.padEnd(61) + '║');
    console.log(`║  📋 _headers: ${headersConfig ? `已加载 (${headersConfig.length} 条规则)` : '未找到'}`.padEnd(61) + '║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log('║  推荐访问:                                                  ║');
    console.log(`║  • http://localhost:${PORT}/`.padEnd(61) + '║');
    console.log(`║  • http://localhost:${PORT}/tests/tts-service-test.html`.padEnd(61) + '║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('💡 提示: 修改 _headers 文件后会自动重新加载配置');
    console.log('💡 提示: 启用缓存可提升性能 → CACHE=1 node dev-server.js');
    console.log('💡 提示: 服务器仅监听本地地址，外部无法直接访问');
    console.log('');
  });
}).catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});



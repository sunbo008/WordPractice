/*
 * 简易本地开发服务器（无需依赖），提供：
 * 1) 静态文件服务（根目录 = proj/）
 * 2) /api/youdao-tts 代理，有道 TTS → 解决浏览器端 CORS 下载问题
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
  try {
    const st = await stat(filePath);
    if (st.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }
  } catch {
    return notFound(res);
  }

  try {
    const data = await readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const type = contentTypeByExt(ext);
    send(res, 200, data, { 'Content-Type': type });
  } catch (e) {
    notFound(res);
  }
}

const server = http.createServer(async (req, res) => {
  const parsed = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = parsed.pathname;

  // API 路由：/api/youdao-tts
  if (pathname === '/api/youdao-tts') {
    return handleProxyYoudaoTTS(req, res, parsed.searchParams);
  }

  // 静态文件
  return handleStatic(req, res, pathname === '/' ? '/index.html' : pathname);
});

server.listen(PORT, () => {
  console.log(`Dev server running at http://localhost:${PORT}`);
  console.log(`Open: http://localhost:${PORT}/tests/tts-service-test.html`);
});



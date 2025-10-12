// 通过 Vercel Serverless Function 代理有道 TTS，解决浏览器端 CORS 下载受限问题
// 访问方式：/api/youdao-tts?word=hello

export default async function handler(req, res) {
  try {
    const { word = '' } = req.query || {};
    const trimmed = String(word || '').trim();
    if (!trimmed) {
      res.status(400).json({ error: 'missing word' });
      return;
    }

    const url = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(trimmed)}&type=1`;

    // Node 18+ 原生 fetch 可用
    const upstream = await fetch(url);
    if (!upstream.ok) {
      res.status(upstream.status).json({ error: `upstream ${upstream.status}` });
      return;
    }

    // 读取为 ArrayBuffer 再转 Buffer 以便设置下载头
    const arrayBuf = await upstream.arrayBuffer();
    const buf = Buffer.from(arrayBuf);

    // 设置下载头和 CORS（便于跨源下载触发保存）
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', String(buf.length));
    res.setHeader('Content-Disposition', `attachment; filename="${trimmed.toLowerCase()}_youdao.mp3"`);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

    res.status(200).send(buf);
  } catch (e) {
    res.status(500).json({ error: e?.message || String(e) });
  }
}



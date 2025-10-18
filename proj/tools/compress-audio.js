/**
 * 音频批量压缩工具
 * 依赖：Node.js + fluent-ffmpeg + ffmpeg-static
 * 
 * 安装依赖：
 * npm install fluent-ffmpeg ffmpeg-static
 * 
 * 运行：
 * node proj/tools/compress-audio.js
 */

const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const fs = require('fs');
const path = require('path');

// 设置 FFmpeg 路径
ffmpeg.setFfmpegPath(ffmpegPath);

// 配置
const CONFIG = {
  inputDir: path.join(__dirname, '../audio'),        // 输入目录
  outputDir: path.join(__dirname, '../audio-optimized'), // 输出目录
  
  // 音频参数（针对语音优化）
  audioBitrate: '32k',      // 比特率：32 kbps（语音足够）
  audioCodec: 'libmp3lame', // 编码器：MP3
  audioChannels: 1,         // 声道：单声道
  audioFrequency: 22050,    // 采样率：22050 Hz
  
  // 高级参数
  audioQuality: 5,          // VBR 质量（0-9，5 是中等）
  normalize: false,         // 是否音量标准化
  
  // 批处理参数
  concurrent: 4,            // 并发处理数量
  skipExisting: true,       // 跳过已存在的文件
};

// 统计信息
const stats = {
  total: 0,
  processed: 0,
  skipped: 0,
  failed: 0,
  originalSize: 0,
  compressedSize: 0,
  startTime: Date.now(),
};

/**
 * 获取所有 MP3 文件
 */
function getAllMp3Files(dir) {
  const files = [];
  
  function traverse(currentDir) {
    const items = fs.readdirSync(currentDir, { withFileTypes: true });
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item.name);
      
      if (item.isDirectory()) {
        traverse(fullPath);
      } else if (item.isFile() && item.name.toLowerCase().endsWith('.mp3')) {
        files.push(fullPath);
      }
    }
  }
  
  traverse(dir);
  return files;
}

/**
 * 获取文件大小（MB）
 */
function getFileSizeMB(filePath) {
  const stats = fs.statSync(filePath);
  return stats.size / (1024 * 1024);
}

/**
 * 压缩单个音频文件
 */
function compressAudio(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    // 检查输出文件是否已存在
    if (CONFIG.skipExisting && fs.existsSync(outputPath)) {
      stats.skipped++;
      console.log(`⏭️  跳过已存在: ${path.basename(outputPath)}`);
      return resolve({ skipped: true });
    }
    
    // 确保输出目录存在
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // 记录原始大小
    const originalSize = getFileSizeMB(inputPath);
    
    // 构建 FFmpeg 命令
    const command = ffmpeg(inputPath)
      .audioCodec(CONFIG.audioCodec)
      .audioBitrate(CONFIG.audioBitrate)
      .audioChannels(CONFIG.audioChannels)
      .audioFrequency(CONFIG.audioFrequency)
      .audioQuality(CONFIG.audioQuality);
    
    // 音量标准化（可选）
    if (CONFIG.normalize) {
      command.audioFilters('loudnorm');
    }
    
    // 执行压缩
    command
      .output(outputPath)
      .on('start', (commandLine) => {
        console.log(`🔧 处理: ${path.basename(inputPath)}`);
        // console.log(`   命令: ${commandLine}`);
      })
      .on('progress', (progress) => {
        // 可选：显示进度（会产生大量输出）
        // process.stdout.write(`\r   进度: ${progress.percent?.toFixed(1) || 0}%`);
      })
      .on('end', () => {
        const compressedSize = getFileSizeMB(outputPath);
        const ratio = ((1 - compressedSize / originalSize) * 100).toFixed(1);
        
        stats.processed++;
        stats.originalSize += originalSize;
        stats.compressedSize += compressedSize;
        
        console.log(`✅ 完成: ${path.basename(outputPath)} (${originalSize.toFixed(2)}MB → ${compressedSize.toFixed(2)}MB, 节省 ${ratio}%)`);
        resolve({ success: true, originalSize, compressedSize });
      })
      .on('error', (err, stdout, stderr) => {
        stats.failed++;
        console.error(`❌ 失败: ${path.basename(inputPath)}`);
        console.error(`   错误: ${err.message}`);
        reject(err);
      })
      .run();
  });
}

/**
 * 批量处理（并发控制）
 */
async function processBatch(files) {
  const queue = [...files];
  const workers = [];
  
  async function worker() {
    while (queue.length > 0) {
      const inputPath = queue.shift();
      if (!inputPath) break;
      
      // 生成输出路径（保持相对路径结构）
      const relativePath = path.relative(CONFIG.inputDir, inputPath);
      const outputPath = path.join(CONFIG.outputDir, relativePath);
      
      try {
        await compressAudio(inputPath, outputPath);
      } catch (err) {
        // 错误已在 compressAudio 中处理
      }
    }
  }
  
  // 启动并发工作线程
  for (let i = 0; i < CONFIG.concurrent; i++) {
    workers.push(worker());
  }
  
  await Promise.all(workers);
}

/**
 * 主函数
 */
async function main() {
  console.log('🎵 音频批量压缩工具\n');
  console.log('📂 输入目录:', CONFIG.inputDir);
  console.log('📂 输出目录:', CONFIG.outputDir);
  console.log('⚙️  压缩参数:');
  console.log(`   - 比特率: ${CONFIG.audioBitrate}`);
  console.log(`   - 采样率: ${CONFIG.audioFrequency} Hz`);
  console.log(`   - 声道: ${CONFIG.audioChannels === 1 ? '单声道' : '立体声'}`);
  console.log(`   - 并发数: ${CONFIG.concurrent}`);
  console.log('');
  
  // 检查输入目录
  if (!fs.existsSync(CONFIG.inputDir)) {
    console.error('❌ 输入目录不存在:', CONFIG.inputDir);
    process.exit(1);
  }
  
  // 获取所有文件
  console.log('🔍 扫描音频文件...');
  const files = getAllMp3Files(CONFIG.inputDir);
  stats.total = files.length;
  
  if (files.length === 0) {
    console.log('⚠️  未找到 MP3 文件');
    return;
  }
  
  console.log(`✅ 找到 ${files.length} 个音频文件\n`);
  
  // 开始处理
  console.log('🚀 开始批量压缩...\n');
  await processBatch(files);
  
  // 输出统计信息
  const elapsedTime = ((Date.now() - stats.startTime) / 1000).toFixed(1);
  const compressionRatio = ((1 - stats.compressedSize / stats.originalSize) * 100).toFixed(1);
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 处理完成！统计信息：');
  console.log('='.repeat(60));
  console.log(`总文件数:   ${stats.total}`);
  console.log(`处理成功:   ${stats.processed}`);
  console.log(`跳过:       ${stats.skipped}`);
  console.log(`失败:       ${stats.failed}`);
  console.log(`原始大小:   ${stats.originalSize.toFixed(2)} MB`);
  console.log(`压缩后:     ${stats.compressedSize.toFixed(2)} MB`);
  console.log(`节省空间:   ${(stats.originalSize - stats.compressedSize).toFixed(2)} MB (${compressionRatio}%)`);
  console.log(`处理时间:   ${elapsedTime} 秒`);
  console.log('='.repeat(60));
  
  console.log('\n💡 下一步操作：');
  console.log('1. 试听几个压缩后的文件，确认音质满意');
  console.log('2. 如果满意，将 audio-optimized 文件夹替换原 audio 文件夹');
  console.log('3. 重新部署到 Cloudflare R2');
  console.log('4. 清除浏览器缓存测试加载速度');
}

// 运行
main().catch(err => {
  console.error('❌ 发生错误:', err);
  process.exit(1);
});


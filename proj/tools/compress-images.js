/**
 * 图片批量压缩工具
 * 依赖：Node.js + sharp
 * 
 * 安装依赖：
 * npm install sharp
 * 
 * 运行：
 * node proj/tools/compress-images.js
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// 配置
const CONFIG = {
  inputDir: path.join(__dirname, '../images/cache'),        // 输入目录
  outputDir: path.join(__dirname, '../images-optimized'),   // 输出目录
  
  // 图片参数
  format: 'webp',         // 输出格式：webp（推荐）/ jpeg / png
  quality: 80,            // 质量：1-100（WebP: 80, JPEG: 85）
  maxWidth: 800,          // 最大宽度（px，保持比例）
  maxHeight: 800,         // 最大高度（px，保持比例）
  
  // 批处理参数
  concurrent: 8,          // 并发处理数量
  skipExisting: true,     // 跳过已存在的文件
  keepOriginalFormat: false, // 是否保持原格式（不转换为 WebP）
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
 * 获取所有图片文件
 */
function getAllImageFiles(dir) {
  const files = [];
  const extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  
  function traverse(currentDir) {
    const items = fs.readdirSync(currentDir, { withFileTypes: true });
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item.name);
      
      if (item.isDirectory()) {
        traverse(fullPath);
      } else if (item.isFile()) {
        const ext = path.extname(item.name).toLowerCase();
        if (extensions.includes(ext)) {
          files.push(fullPath);
        }
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
 * 压缩单个图片
 */
async function compressImage(inputPath, outputPath) {
  try {
    // 检查输出文件是否已存在
    if (CONFIG.skipExisting && fs.existsSync(outputPath)) {
      stats.skipped++;
      console.log(`⏭️  跳过已存在: ${path.basename(outputPath)}`);
      return { skipped: true };
    }
    
    // 确保输出目录存在
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // 记录原始大小
    const originalSize = getFileSizeMB(inputPath);
    
    console.log(`🔧 处理: ${path.basename(inputPath)}`);
    
    // 构建 Sharp 处理链
    let processor = sharp(inputPath);
    
    // 调整尺寸（如果超过最大尺寸）
    const metadata = await processor.metadata();
    if (metadata.width > CONFIG.maxWidth || metadata.height > CONFIG.maxHeight) {
      processor = processor.resize(CONFIG.maxWidth, CONFIG.maxHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }
    
    // 根据配置选择输出格式
    if (CONFIG.keepOriginalFormat) {
      // 保持原格式
      const ext = path.extname(inputPath).toLowerCase();
      if (ext === '.jpg' || ext === '.jpeg') {
        processor = processor.jpeg({ quality: CONFIG.quality, mozjpeg: true });
      } else if (ext === '.png') {
        processor = processor.png({ quality: CONFIG.quality, compressionLevel: 9 });
      } else if (ext === '.webp') {
        processor = processor.webp({ quality: CONFIG.quality });
      }
    } else {
      // 转换为 WebP
      processor = processor.webp({ quality: CONFIG.quality });
    }
    
    // 执行压缩
    await processor.toFile(outputPath);
    
    // 计算压缩比
    const compressedSize = getFileSizeMB(outputPath);
    const ratio = ((1 - compressedSize / originalSize) * 100).toFixed(1);
    
    stats.processed++;
    stats.originalSize += originalSize;
    stats.compressedSize += compressedSize;
    
    console.log(`✅ 完成: ${path.basename(outputPath)} (${originalSize.toFixed(2)}MB → ${compressedSize.toFixed(2)}MB, 节省 ${ratio}%)`);
    
    return { success: true, originalSize, compressedSize };
    
  } catch (err) {
    stats.failed++;
    console.error(`❌ 失败: ${path.basename(inputPath)}`);
    console.error(`   错误: ${err.message}`);
    return { failed: true, error: err };
  }
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
      let outputPath = path.join(CONFIG.outputDir, relativePath);
      
      // 如果转换为 WebP，修改文件扩展名
      if (!CONFIG.keepOriginalFormat && CONFIG.format === 'webp') {
        const ext = path.extname(outputPath);
        outputPath = outputPath.replace(new RegExp(`${ext}$`), '.webp');
      }
      
      await compressImage(inputPath, outputPath);
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
  console.log('🖼️  图片批量压缩工具\n');
  console.log('📂 输入目录:', CONFIG.inputDir);
  console.log('📂 输出目录:', CONFIG.outputDir);
  console.log('⚙️  压缩参数:');
  console.log(`   - 格式: ${CONFIG.format.toUpperCase()}`);
  console.log(`   - 质量: ${CONFIG.quality}`);
  console.log(`   - 最大尺寸: ${CONFIG.maxWidth}x${CONFIG.maxHeight}px`);
  console.log(`   - 并发数: ${CONFIG.concurrent}`);
  console.log('');
  
  // 检查输入目录
  if (!fs.existsSync(CONFIG.inputDir)) {
    console.error('❌ 输入目录不存在:', CONFIG.inputDir);
    process.exit(1);
  }
  
  // 获取所有文件
  console.log('🔍 扫描图片文件...');
  const files = getAllImageFiles(CONFIG.inputDir);
  stats.total = files.length;
  
  if (files.length === 0) {
    console.log('⚠️  未找到图片文件');
    return;
  }
  
  console.log(`✅ 找到 ${files.length} 个图片文件\n`);
  
  // 开始处理
  console.log('🚀 开始批量压缩...\n');
  await processBatch(files);
  
  // 输出统计信息
  const elapsedTime = ((Date.now() - stats.startTime) / 1000).toFixed(1);
  const compressionRatio = stats.originalSize > 0 
    ? ((1 - stats.compressedSize / stats.originalSize) * 100).toFixed(1)
    : 0;
  
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
  console.log('1. 查看几个压缩后的图片，确认质量满意');
  console.log('2. 如果转换为 WebP，需要修改代码中的图片路径（.jpg → .webp）');
  console.log('3. 如果满意，将 images-optimized 文件夹替换原 images 文件夹');
  console.log('4. 重新部署到 Cloudflare R2');
  console.log('5. 清除浏览器缓存测试加载速度');
}

// 运行
main().catch(err => {
  console.error('❌ 发生错误:', err);
  process.exit(1);
});


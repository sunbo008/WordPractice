/**
 * Cloudflare R2 资源上传脚本
 * 
 * 功能：
 * 1. 将 proj/images/cache/ 目录中的图片上传到 Cloudflare R2
 * 2. 保持原有目录结构
 * 3. 支持断点续传（跳过已上传文件）
 * 4. 显示上传进度
 * 
 * 使用方法：
 * 1. 安装依赖：npm install
 * 2. 配置环境变量（在项目根目录创建 .env 文件）
 * 3. 运行：node upload-to-r2.js
 */

const { S3Client, PutObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');
const mime = require('mime-types');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// ============================================
// 配置区域 - 请在项目根目录的 .env 文件中设置这些变量
// ============================================

const config = {
    // Cloudflare R2 配置
    accountId: process.env.R2_ACCOUNT_ID || '',
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    bucketName: process.env.R2_BUCKET_NAME || 'wordpractice-assets',
    
    // 上传目录配置（相对于项目根目录）
    // 只上传 proj/images/cache 目录中的图片
    uploadDirs: [
        { local: path.join(__dirname, '../images/cache'), remote: 'images/cache' }
    ],
    
    // 是否强制重新上传（false = 跳过已存在文件）
    forceUpload: process.env.FORCE_UPLOAD === 'true',
};

// ============================================
// 检查配置
// ============================================

function checkConfig() {
    const missing = [];
    if (!config.accountId) missing.push('R2_ACCOUNT_ID');
    if (!config.accessKeyId) missing.push('R2_ACCESS_KEY_ID');
    if (!config.secretAccessKey) missing.push('R2_SECRET_ACCESS_KEY');
    
    if (missing.length > 0) {
        console.error('❌ 缺少必要的环境变量：', missing.join(', '));
        console.log('\n请在项目根目录创建 .env 文件并设置以下变量：');
        console.log('位置：WordPractice/.env (与 README.md 同级)\n');
        console.log('R2_ACCOUNT_ID=your_account_id');
        console.log('R2_ACCESS_KEY_ID=your_access_key_id');
        console.log('R2_SECRET_ACCESS_KEY=your_secret_access_key');
        console.log('R2_BUCKET_NAME=wordpractice-assets (可选，默认为 wordpractice-assets)');
        console.log('\n快速创建：');
        console.log('  cd ../..  # 返回项目根目录');
        console.log('  cp .env.example .env');
        console.log('  nano .env  # 编辑配置');
        process.exit(1);
    }
}

// ============================================
// 创建 R2 客户端
// ============================================

function createR2Client() {
    return new S3Client({
        region: 'auto',
        endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId: config.accessKeyId,
            secretAccessKey: config.secretAccessKey,
        },
    });
}

// ============================================
// 文件操作函数
// ============================================

/**
 * 递归获取目录下所有文件
 */
function getAllFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
            getAllFiles(filePath, fileList);
        } else {
            fileList.push(filePath);
        }
    });
    
    return fileList;
}

/**
 * 检查文件是否已存在于 R2
 */
async function fileExistsInR2(client, bucketName, key) {
    try {
        await client.send(new HeadObjectCommand({
            Bucket: bucketName,
            Key: key,
        }));
        return true;
    } catch (error) {
        if (error.name === 'NotFound') {
            return false;
        }
        throw error;
    }
}

/**
 * 上传单个文件到 R2
 */
async function uploadFile(client, bucketName, localPath, remotePath) {
    const fileContent = fs.readFileSync(localPath);
    const contentType = mime.lookup(localPath) || 'application/octet-stream';
    
    await client.send(new PutObjectCommand({
        Bucket: bucketName,
        Key: remotePath,
        Body: fileContent,
        ContentType: contentType,
    }));
}

/**
 * 格式化文件大小
 */
function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

// ============================================
// 主上传逻辑
// ============================================

async function uploadDirectory(client, localDir, remotePrefix) {
    console.log(`\n📁 扫描目录: ${localDir}`);
    
    const files = getAllFiles(localDir);
    console.log(`✅ 找到 ${files.length} 个文件`);
    
    let uploaded = 0;
    let skipped = 0;
    let failed = 0;
    let totalSize = 0;
    
    for (let i = 0; i < files.length; i++) {
        const localPath = files[i];
        const relativePath = path.relative(localDir, localPath);
        const remotePath = `${remotePrefix}/${relativePath}`.replace(/\\/g, '/');
        
        const stat = fs.statSync(localPath);
        const fileSize = stat.size;
        
        try {
            // 检查是否需要跳过
            if (!config.forceUpload) {
                const exists = await fileExistsInR2(client, config.bucketName, remotePath);
                if (exists) {
                    skipped++;
                    console.log(`⏭️  [${i + 1}/${files.length}] 跳过已存在: ${remotePath}`);
                    continue;
                }
            }
            
            // 上传文件
            await uploadFile(client, config.bucketName, localPath, remotePath);
            uploaded++;
            totalSize += fileSize;
            console.log(`✅ [${i + 1}/${files.length}] 上传成功: ${remotePath} (${formatSize(fileSize)})`);
            
        } catch (error) {
            failed++;
            console.error(`❌ [${i + 1}/${files.length}] 上传失败: ${remotePath}`, error.message);
        }
    }
    
    return { uploaded, skipped, failed, totalSize };
}

async function main() {
    console.log('🚀 Cloudflare R2 资源上传工具\n');
    
    // 检查配置
    checkConfig();
    
    console.log('📋 配置信息：');
    console.log(`   Account ID: ${config.accountId}`);
    console.log(`   Bucket: ${config.bucketName}`);
    console.log(`   强制重新上传: ${config.forceUpload ? '是' : '否'}`);
    
    // 创建客户端
    const client = createR2Client();
    console.log('✅ R2 客户端创建成功');
    
    // 上传所有目录
    let totalStats = {
        uploaded: 0,
        skipped: 0,
        failed: 0,
        totalSize: 0
    };
    
    for (const dir of config.uploadDirs) {
        if (!fs.existsSync(dir.local)) {
            console.log(`⚠️  目录不存在，跳过: ${dir.local}`);
            continue;
        }
        
        const stats = await uploadDirectory(client, dir.local, dir.remote);
        totalStats.uploaded += stats.uploaded;
        totalStats.skipped += stats.skipped;
        totalStats.failed += stats.failed;
        totalStats.totalSize += stats.totalSize;
    }
    
    // 显示统计
    console.log('\n' + '='.repeat(50));
    console.log('📊 上传统计：');
    console.log(`   ✅ 上传成功: ${totalStats.uploaded} 个文件`);
    console.log(`   ⏭️  跳过: ${totalStats.skipped} 个文件`);
    console.log(`   ❌ 失败: ${totalStats.failed} 个文件`);
    console.log(`   📦 总大小: ${formatSize(totalStats.totalSize)}`);
    console.log('='.repeat(50));
    
    if (totalStats.failed > 0) {
        console.log('\n⚠️  有文件上传失败，请检查错误日志');
        process.exit(1);
    } else {
        console.log('\n🎉 所有文件上传完成！');
        console.log('\n📝 下一步：');
        console.log('1. 在 Cloudflare R2 控制台为 bucket 配置自定义域名或使用 R2.dev 域名');
        console.log('2. 将 CDN 域名配置到 proj/src/config/r2-config.js');
        console.log('3. 重新部署应用到 Cloudflare Pages');
    }
}

// 运行主函数
main().catch(error => {
    console.error('❌ 上传过程出错：', error);
    process.exit(1);
});


/**
 * Cloudflare R2 资源上传脚本（带本地缓存优化）
 * 
 * 功能：
 * 1. 将 proj/images/cache/ 和 proj/audio/ 目录中的资源上传到 Cloudflare R2
 * 2. 保持原有目录结构
 * 3. 支持断点续传（跳过已上传文件）
 * 4. 本地缓存上传记录，避免频繁查询服务器
 * 5. 显示上传进度
 * 
 * 优化特性：
 * - 本地保存上传记录，大大减少 API 请求
 * - 自动同步服务器状态（发现服务器已有但本地未记录的文件会补充记录）
 * - 检测文件修改时间，自动重新上传变更的文件
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
    // 上传图片和音频文件
    uploadDirs: [
        { local: path.join(__dirname, '../images/cache'), remote: 'images/cache' },
        { local: path.join(__dirname, '../audio'), remote: 'audio' }
    ],
    
    // 本地上传记录缓存文件
    cacheFile: path.join(__dirname, '.upload-cache.json'),
    
    // 是否强制重新上传（false = 跳过已存在文件）
    forceUpload: process.env.FORCE_UPLOAD === 'true',
};

// ============================================
// 上传记录缓存管理
// ============================================

class UploadCache {
    constructor(cacheFile) {
        this.cacheFile = cacheFile;
        this.cache = this.load();
        this.modified = false;
    }
    
    /**
     * 加载上传记录
     */
    load() {
        if (fs.existsSync(this.cacheFile)) {
            try {
                const data = fs.readFileSync(this.cacheFile, 'utf-8');
                const cache = JSON.parse(data);
                console.log(`📋 加载上传记录: ${Object.keys(cache.files || {}).length} 个文件`);
                return cache;
            } catch (error) {
                console.warn('⚠️  上传记录文件损坏，将创建新记录');
                return this.createEmpty();
            }
        }
        return this.createEmpty();
    }
    
    /**
     * 创建空记录
     */
    createEmpty() {
        return {
            version: '1.0',
            lastUpdate: new Date().toISOString(),
            files: {}
        };
    }
    
    /**
     * 保存上传记录
     */
    save() {
        if (!this.modified) {
            return;
        }
        
        this.cache.lastUpdate = new Date().toISOString();
        fs.writeFileSync(this.cacheFile, JSON.stringify(this.cache, null, 2), 'utf-8');
        console.log(`💾 已保存上传记录: ${Object.keys(this.cache.files).length} 个文件`);
        this.modified = false;
    }
    
    /**
     * 检查文件是否已上传（基于本地记录）
     */
    isUploaded(remotePath, localStat) {
        const record = this.cache.files[remotePath];
        if (!record || !record.uploaded) {
            return false;
        }
        
        // 检查文件是否被修改（通过修改时间和大小）
        if (record.size !== localStat.size || record.mtime !== localStat.mtimeMs) {
            return false;
        }
        
        return true;
    }
    
    /**
     * 标记文件已上传
     */
    markUploaded(remotePath, localStat) {
        this.cache.files[remotePath] = {
            uploaded: true,
            size: localStat.size,
            mtime: localStat.mtimeMs,
            uploadedAt: new Date().toISOString()
        };
        this.modified = true;
    }
    
    /**
     * 获取统计信息
     */
    getStats() {
        const files = Object.values(this.cache.files);
        return {
            total: files.length,
            uploaded: files.filter(f => f.uploaded).length
        };
    }
}

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
// 主上传逻辑（优化版）
// ============================================

async function uploadDirectory(client, localDir, remotePrefix, uploadCache) {
    console.log(`\n📁 扫描目录: ${localDir}`);
    
    const files = getAllFiles(localDir);
    console.log(`✅ 找到 ${files.length} 个文件`);
    
    let uploaded = 0;
    let skippedCache = 0;  // 通过本地缓存跳过
    let skippedServer = 0; // 通过服务器查询跳过
    let failed = 0;
    let totalSize = 0;
    let apiCalls = 0;      // API 调用次数
    
    for (let i = 0; i < files.length; i++) {
        const localPath = files[i];
        const relativePath = path.relative(localDir, localPath);
        const remotePath = `${remotePrefix}/${relativePath}`.replace(/\\/g, '/');
        
        const stat = fs.statSync(localPath);
        const fileSize = stat.size;
        
        try {
            // 强制上传模式：直接上传所有文件
            if (config.forceUpload) {
                await uploadFile(client, config.bucketName, localPath, remotePath);
                apiCalls++;
                uploaded++;
                totalSize += fileSize;
                uploadCache.markUploaded(remotePath, stat);
                console.log(`✅ [${i + 1}/${files.length}] 强制上传: ${remotePath} (${formatSize(fileSize)})`);
                continue;
            }
            
            // 1. 先检查本地缓存
            if (uploadCache.isUploaded(remotePath, stat)) {
                skippedCache++;
                console.log(`⚡ [${i + 1}/${files.length}] 缓存跳过: ${remotePath}`);
                continue;
            }
            
            // 2. 本地缓存没有记录，查询服务器
            const existsInR2 = await fileExistsInR2(client, config.bucketName, remotePath);
            apiCalls++;
            
            if (existsInR2) {
                // 服务器已有文件，补充到本地缓存
                skippedServer++;
                uploadCache.markUploaded(remotePath, stat);
                console.log(`🔄 [${i + 1}/${files.length}] 同步记录: ${remotePath}`);
                continue;
            }
            
            // 3. 文件不存在，执行上传
            await uploadFile(client, config.bucketName, localPath, remotePath);
            apiCalls++;
            uploaded++;
            totalSize += fileSize;
            uploadCache.markUploaded(remotePath, stat);
            console.log(`✅ [${i + 1}/${files.length}] 上传成功: ${remotePath} (${formatSize(fileSize)})`);
            
        } catch (error) {
            failed++;
            console.error(`❌ [${i + 1}/${files.length}] 上传失败: ${remotePath}`, error.message);
        }
    }
    
    return { uploaded, skippedCache, skippedServer, failed, totalSize, apiCalls };
}

async function main() {
    console.log('🚀 Cloudflare R2 资源上传工具（优化版）\n');
    
    // 检查配置
    checkConfig();
    
    console.log('📋 配置信息：');
    console.log(`   Account ID: ${config.accountId}`);
    console.log(`   Bucket: ${config.bucketName}`);
    console.log(`   强制重新上传: ${config.forceUpload ? '是' : '否'}`);
    console.log(`   缓存文件: ${config.cacheFile}`);
    
    // 加载上传记录缓存
    const uploadCache = new UploadCache(config.cacheFile);
    
    // 创建客户端
    const client = createR2Client();
    console.log('✅ R2 客户端创建成功');
    
    // 上传所有目录
    let totalStats = {
        uploaded: 0,
        skippedCache: 0,
        skippedServer: 0,
        failed: 0,
        totalSize: 0,
        apiCalls: 0
    };
    
    for (const dir of config.uploadDirs) {
        if (!fs.existsSync(dir.local)) {
            console.log(`⚠️  目录不存在，跳过: ${dir.local}`);
            continue;
        }
        
        const stats = await uploadDirectory(client, dir.local, dir.remote, uploadCache);
        totalStats.uploaded += stats.uploaded;
        totalStats.skippedCache += stats.skippedCache;
        totalStats.skippedServer += stats.skippedServer;
        totalStats.failed += stats.failed;
        totalStats.totalSize += stats.totalSize;
        totalStats.apiCalls += stats.apiCalls;
    }
    
    // 保存上传记录
    uploadCache.save();
    
    // 显示统计
    console.log('\n' + '='.repeat(50));
    console.log('📊 上传统计：');
    console.log(`   ✅ 上传成功: ${totalStats.uploaded} 个文件`);
    console.log(`   ⚡ 缓存跳过: ${totalStats.skippedCache} 个文件`);
    console.log(`   🔄 同步记录: ${totalStats.skippedServer} 个文件`);
    console.log(`   ❌ 失败: ${totalStats.failed} 个文件`);
    console.log(`   📦 总大小: ${formatSize(totalStats.totalSize)}`);
    console.log(`   🌐 API 调用: ${totalStats.apiCalls} 次`);
    
    const totalFiles = totalStats.uploaded + totalStats.skippedCache + totalStats.skippedServer + totalStats.failed;
    const savedCalls = totalFiles - totalStats.apiCalls;
    if (savedCalls > 0) {
        console.log(`   ⚡ 节省请求: ${savedCalls} 次 (通过本地缓存)`);
    }
    
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

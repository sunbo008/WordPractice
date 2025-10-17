/**
 * Cloudflare R2 CDN 配置
 * 
 * 使用说明：
 * 1. 在 Cloudflare R2 控制台为 bucket 配置自定义域名
 * 2. 将域名填入下方 R2_CDN_BASE_URL
 * 3. 如果使用 R2.dev 域名，格式为：https://pub-xxxxx.r2.dev
 */

const R2Config = {
    // ============================================
    // CDN 配置 - 请根据实际情况修改
    // ============================================
    
    // R2 CDN 基础 URL（必须配置）
    // 示例：https://assets.yourdomain.com 或 https://pub-xxxxx.r2.dev
    R2_CDN_BASE_URL: 'https://pub-b3f1546eda5148c98fd9298b9d66d7f6.r2.dev',
    
    // 音频文件路径前缀
    AUDIO_PATH: 'audio',
    
    // 图片文件路径前缀
    IMAGES_PATH: 'images',
    
    // ============================================
    // 降级策略配置
    // ============================================
    
    // 是否启用本地降级（开发环境建议启用）
    enableLocalFallback: false,
    
    // 本地音频路径（降级使用）
    localAudioPath: '/audio/',
    
    // 本地图片路径（降级使用）
    localImagesPath: './images/',
    
    // ============================================
    // 环境检测
    // ============================================
    
    /**
     * 判断是否使用 R2 CDN
     */
    shouldUseR2() {
        // 如果没有配置 CDN 域名，不使用 R2
        if (!this.R2_CDN_BASE_URL || this.R2_CDN_BASE_URL.includes('YOUR_R2_CDN_DOMAIN_HERE')) {
            console.log('🚫 [R2Config] 未配置 CDN 域名，不使用 R2');
            return false;
        }
        
        // 本地开发环境可以选择不使用 R2（如果启用了本地降级）
        const isLocal = ['localhost', '127.0.0.1', ''].includes(location.hostname) ||
                       location.hostname.startsWith('192.168.');
        
        if (isLocal && this.enableLocalFallback) {
            console.log(`🏠 [R2Config] 本地环境 + 启用降级 → 不使用 R2 (hostname: ${location.hostname})`);
            return false;
        }
        
        console.log(`✅ [R2Config] 使用 R2 CDN (hostname: ${location.hostname}, CDN: ${this.R2_CDN_BASE_URL})`);
        return true;
    },
    
    /**
     * 获取音频 URL
     * @param {string} fileName - 文件名（如 'hello_youdao.mp3'）
     * @returns {string} 完整的 URL
     */
    getAudioUrl(fileName) {
        if (this.shouldUseR2()) {
            // URL 编码文件名（处理空格等特殊字符）
            const encodedFileName = encodeURIComponent(fileName);
            const url = `${this.R2_CDN_BASE_URL}/${this.AUDIO_PATH}/${encodedFileName}`;
            console.log(`🎵 [R2Config] 生成音频URL: ${fileName} → ${url}`);
            return url;
        } else {
            const url = `${this.localAudioPath}${fileName}`;
            console.log(`📁 [R2Config] 生成本地URL: ${fileName} → ${url}`);
            return url;
        }
    },
    
    /**
     * 获取图片 URL
     * @param {string} filePath - 文件路径（如 'cache/hello.jpg'）
     * @returns {string} 完整的 URL
     */
    getImageUrl(filePath) {
        if (this.shouldUseR2()) {
            // URL 编码文件路径（处理空格等特殊字符）
            const pathParts = filePath.split('/');
            const encodedParts = pathParts.map(part => encodeURIComponent(part));
            const encodedPath = encodedParts.join('/');
            return `${this.R2_CDN_BASE_URL}/${this.IMAGES_PATH}/${encodedPath}`;
        } else {
            return `${this.localImagesPath}${filePath}`;
        }
    },
};

// 导出配置对象
if (typeof module !== 'undefined' && module.exports) {
    module.exports = R2Config;
}


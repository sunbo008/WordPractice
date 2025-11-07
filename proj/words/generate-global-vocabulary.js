/**
 * 生成全局词汇表 CSV
 * CSV 格式：每行是一个文件，列是该文件包含的所有单词
 * 
 * 格式：
 * 来源文件,单词1,单词2,单词3,...
 * daily-phonics/day01.json,word1,word2,word3,...
 * 
 * 使用方法：
 * node proj/words/generate-global-vocabulary.js
 */

const fs = require('fs');
const path = require('path');

// 递归扫描目录中的所有 JSON 文件
function scanDirectory(dir) {
    const files = [];
    
    function scan(currentPath) {
        const items = fs.readdirSync(currentPath);
        
        for (const item of items) {
            const fullPath = path.join(currentPath, item);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
                // 递归扫描子目录
                scan(fullPath);
            } else if (stat.isFile() && item.endsWith('.json')) {
                // 收集 JSON 文件
                files.push(fullPath);
            }
        }
    }
    
    scan(dir);
    return files;
}

// 从 JSON 文件中提取单词
function extractWords(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(content);
        
        if (data.words && Array.isArray(data.words)) {
            return data.words.map(item => item.word).filter(word => word);
        }
    } catch (error) {
        console.error(`Error reading ${filePath}:`, error.message);
    }
    
    return [];
}

// 获取相对路径（用于 CSV 显示）
function getRelativePath(filePath, wordsDir) {
    return path.relative(wordsDir, filePath).replace(/\\/g, '/');
}

// 主函数
function main() {
    const wordsDir = __dirname; // 当前脚本所在目录 (proj/words)
    const csvOutputFile = path.join(wordsDir, 'GLOBAL_VOCABULARY.csv');
    
    console.log('🔍 扫描词库目录...');
    const jsonFiles = scanDirectory(wordsDir);
    console.log(`📁 找到 ${jsonFiles.length} 个 JSON 文件`);
    
    console.log('📖 提取单词...');
    
    // 文件和单词映射 { filePath: [word1, word2, ...] }
    const fileWords = new Map();
    
    // 统计：所有不同的单词
    const allWords = new Set();
    
    for (const file of jsonFiles) {
        const words = extractWords(file);
        const relativePath = getRelativePath(file, wordsDir);
        
        fileWords.set(relativePath, words);
        
        // 统计所有不同单词
        words.forEach(word => allWords.add(word));
    }
    
    console.log(`✅ 提取到 ${allWords.size} 个不同的单词`);
    
    // ========== 生成 CSV 文件 ==========
    console.log('📊 生成 CSV 文件...');
    
    const csvLines = [];
    
    // CSV 表头
    csvLines.push('来源文件,单词列表');
    
    // 按文件路径排序
    const sortedFiles = Array.from(fileWords.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    
    for (const [filePath, words] of sortedFiles) {
        // CSV 行：文件路径,"单词1,单词2,单词3,..."
        // 将单词用逗号连接，整体用引号包裹
        const wordsStr = words.join(',');
        csvLines.push(`"${filePath}","${wordsStr}"`);
    }
    
    fs.writeFileSync(csvOutputFile, csvLines.join('\n'), 'utf8');
    console.log(`💾 CSV 已保存到: ${csvOutputFile}`);
    
    // ========== 统计信息 ==========
    console.log('');
    console.log('📊 统计信息:');
    console.log(`   - 总文件数: ${jsonFiles.length} 个`);
    console.log(`   - 不同单词: ${allWords.size} 个`);
    
    // 统计每个单词出现在多少个文件中
    const wordFileCount = new Map();
    for (const [filePath, words] of fileWords) {
        for (const word of words) {
            if (!wordFileCount.has(word)) {
                wordFileCount.set(word, new Set());
            }
            wordFileCount.get(word).add(filePath);
        }
    }
    
    // 找出重复单词
    const duplicateWords = Array.from(wordFileCount.entries()).filter(([word, files]) => files.size > 1);
    
    console.log(`   - 重复单词: ${duplicateWords.length} 个（在多个文件中出现）`);
    
    if (duplicateWords.length > 0) {
        console.log('');
        console.log('⚠️  前 10 个重复最多的单词:');
        duplicateWords
            .sort((a, b) => b[1].size - a[1].size)
            .slice(0, 10)
            .forEach(([word, files], index) => {
                console.log(`   ${index + 1}. ${word} (在 ${files.size} 个文件中)`);
            });
    }
    
    console.log('');
    console.log('💡 使用提示:');
    console.log('   - CSV 格式：第一列是文件路径，第二列是该文件的所有单词（逗号分隔）');
    console.log('   - AI 可以直接读取 CSV 的所有行，提取所有单词进行去重检查');
    console.log('   - 可以用 Excel 或文本编辑器打开查看');
}

// 执行
main();


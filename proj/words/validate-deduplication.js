/**
 * 验证新生成的 JSON 文件是否有重复单词
 * 
 * 工作原理：
 * 1. 读取全局词汇表 CSV (GLOBAL_VOCABULARY.csv)
 * 2. 从 CSV 中提取所有其他文件的单词
 * 3. 检查新 JSON 文件的单词是否与其他文件重复
 * 
 * 使用方法：
 * node proj/words/validate-deduplication.js <json文件路径>
 * 
 * 示例：
 * node proj/words/validate-deduplication.js proj/words/extracurricular-books/magic-tree-house/book01-ch01.json
 * 
 * 注意：
 * - 需要先运行 generate-global-vocabulary.js 生成 CSV 文件
 * - CSV 格式：第一列是文件路径，第二列是单词列表
 */

const fs = require('fs');
const path = require('path');

// 获取命令行参数
const jsonFilePath = process.argv[2];

if (!jsonFilePath) {
    console.error('❌ 错误：请提供 JSON 文件路径');
    console.log('使用方法: node validate-deduplication.js <json文件路径>');
    console.log('示例: node validate-deduplication.js proj/words/extracurricular-books/magic-tree-house/book01-ch01.json');
    process.exit(1);
}

// 检查文件是否存在
if (!fs.existsSync(jsonFilePath)) {
    console.error(`❌ 错误：文件不存在 ${jsonFilePath}`);
    process.exit(1);
}

console.log(`🔍 正在验证: ${jsonFilePath}`);
console.log('');

// 读取全局词汇表 CSV
const globalVocabCSVPath = path.join(__dirname, 'GLOBAL_VOCABULARY.csv');

if (!fs.existsSync(globalVocabCSVPath)) {
    console.error('❌ 错误：全局词汇表 CSV 不存在');
    console.log('请先运行: node proj/words/generate-global-vocabulary.js');
    process.exit(1);
}

console.log('📚 读取全局词汇表 CSV...');

// 解析 CSV，提取所有已有单词
const csvContent = fs.readFileSync(globalVocabCSVPath, 'utf8');
const csvLines = csvContent.split('\n');

const otherWords = new Set();
let csvFileCount = 0;

// 计算当前验证文件的相对路径（相对于 proj/words 目录）
const currentRelativePath = path.relative(__dirname, jsonFilePath).replace(/\\/g, '/');

for (let i = 1; i < csvLines.length; i++) { // 跳过表头
    const line = csvLines[i].trim();
    if (!line) continue;
    
    // 解析 CSV 行："文件路径","单词1,单词2,单词3,..."
    const match = line.match(/^"([^"]+)","([^"]*)"$/);
    if (!match) continue;
    
    const filePath = match[1];
    const wordsStr = match[2];
    
    // 跳过当前验证的文件
    if (filePath === currentRelativePath) {
        continue;
    }
    
    // 跳过空单词列表
    if (!wordsStr) continue;
    
    csvFileCount++;
    
    // 提取该文件的所有单词
    const words = wordsStr.split(',').map(w => w.trim().toLowerCase());
    words.forEach(word => {
        if (word) {
            otherWords.add(word);
        }
    });
}

console.log(`📁 从 CSV 读取了 ${csvFileCount} 个其他文件`);
console.log(`📚 其他文件共有: ${otherWords.size} 个不同单词`);
console.log('');

// 读取新JSON文件的单词
const jsonData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));
const newWords = jsonData.words.map(w => w.word);

console.log(`📖 新文件单词: ${newWords.length} 个`);
console.log('');

// 查找重复
const duplicates = [];
for (const word of newWords) {
    if (otherWords.has(word.toLowerCase())) {
        duplicates.push(word);
    }
}

// 输出结果
if (duplicates.length > 0) {
    console.log('❌ 发现重复单词！');
    console.log(`   这些单词在其他课程中已经出现过（共 ${duplicates.length} 个）：`);
    console.log('');
    
    // 按字母排序
    duplicates.sort();
    
    // 分组显示（每行5个）
    for (let i = 0; i < duplicates.length; i += 5) {
        const group = duplicates.slice(i, i + 5);
        console.log(`   ${group.join(', ')}`);
    }
    
    console.log('');
    console.log('⚠️  建议：从 words 数组中删除这些重复的单词');
    process.exit(1);
} else {
    console.log('✅ 验证通过！');
    console.log('   未发现重复单词，所有单词都是新的');
    console.log('');
    console.log('📊 统计信息：');
    console.log(`   - 新增单词: ${newWords.length} 个`);
    console.log(`   - 其他文件单词: ${otherWords.size} 个`);
    console.log('');
    console.log('💡 提示：运行 generate-global-vocabulary.js 更新全局词汇表');
}


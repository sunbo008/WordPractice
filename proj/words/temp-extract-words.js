const fs = require('fs');

// 读取 CSV，提取所有已有单词
const csv = fs.readFileSync('proj/words/GLOBAL_VOCABULARY.csv', 'utf8');
const lines = csv.split('\n');
const existingWords = new Set();

for (let i = 1; i < lines.length; i++) {
    const match = lines[i].match(/^"([^"]+)","([^"]*)"$/);
    if (match && match[2]) {
        const words = match[2].split(',').map(w => w.trim().toLowerCase());
        words.forEach(w => w && existingWords.add(w));
    }
}

console.log('📚 已有单词总数:', existingWords.size);
console.log('');

// 读取章节文本
const text = fs.readFileSync('proj/doc/TreeHouse/B01C01_Into_the_Woods.txt', 'utf8');

// 提取所有单词
const allWords = text
    .toLowerCase()
    .replace(/[^a-z\s'-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 0);

// 超基础词汇
const basicWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'to', 'of', 'and', 'in', 'on', 'at', 'for', 'with', 'from', 'by', 'as']);

// 去重：章节内去重 + 排除已有单词 + 排除基础词
const uniqueWords = new Set();
allWords.forEach(word => {
    if (!basicWords.has(word) && !existingWords.has(word)) {
        uniqueWords.add(word);
    }
});

const newWords = Array.from(uniqueWords).sort();

console.log('📖 章节总单词数:', allWords.length);
console.log('✅ 去重后新单词数:', newWords.length);
console.log('');
console.log('🆕 新单词列表:');
newWords.forEach((w, i) => console.log(`  ${i+1}. ${w}`));

// 输出 JSON 格式供使用
console.log('');
console.log('📋 JSON 格式（供复制）:');
console.log(JSON.stringify(newWords, null, 2));


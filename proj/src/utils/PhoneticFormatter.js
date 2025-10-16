/**
 * 音标格式化工具
 * 统一处理音标的显示格式
 */
class PhoneticFormatter {
    /**
     * 格式化音标 - 添加斜杠包裹
     * @param {string} phonetic - 原始音标字符串
     * @returns {string} - 格式化后的音标（带斜杠）
     */
    static format(phonetic) {
        if (!phonetic || typeof phonetic !== 'string') {
            return '';
        }
        
        // 去除首尾空格
        phonetic = phonetic.trim();
        
        if (!phonetic) {
            return '';
        }
        
        // 如果已经有斜杠，直接返回
        if (phonetic.startsWith('/') && phonetic.endsWith('/')) {
            return phonetic;
        }
        
        // 如果有方括号，替换为斜杠
        if (phonetic.startsWith('[') && phonetic.endsWith(']')) {
            return '/' + phonetic.slice(1, -1) + '/';
        }
        
        // 否则添加斜杠
        return '/' + phonetic + '/';
    }
    
    /**
     * 批量格式化音标（用于单词对象数组）
     * @param {Array} words - 单词对象数组，每个对象包含 phonetic 字段
     * @returns {Array} - 格式化后的单词数组
     */
    static formatWords(words) {
        if (!Array.isArray(words)) {
            return words;
        }
        
        return words.map(word => ({
            ...word,
            phonetic: this.format(word.phonetic)
        }));
    }
}

// 如果是浏览器环境，挂载到 window
if (typeof window !== 'undefined') {
    window.PhoneticFormatter = PhoneticFormatter;
}


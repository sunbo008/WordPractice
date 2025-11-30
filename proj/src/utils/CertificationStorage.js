/**
 * 考级进度持久化存储模块
 * 负责将考级进度保存到 localStorage 并恢复
 */

class CertificationStorage {
    constructor() {
        this.STORAGE_KEY = 'wordTetris_certification';
        this.COOLDOWN_DURATION = 30 * 60 * 1000; // 30分钟冷却时间（毫秒）
    }

    /**
     * 获取默认的考级进度数据结构
     */
    getDefaultProgress() {
        return {
            // 音标系列
            phonics: {
                unlocked: true,
                badge: { earned: false, earnedAt: null },
                finalExam: this._createLevelData(),  // 级别总考
                levels: {
                    shortVowels: this._createLevelData(),
                    longVowels: this._createLevelData(),
                    diphthongs: this._createLevelData(),
                    consonants: this._createLevelData(),
                    complexSounds: this._createLevelData()
                }
            },
            
            // 小学年级系列
            primaryGrades: {
                unlocked: false,
                grade3: {
                    badge: { earned: false, earnedAt: null },
                    finalExam: this._createLevelData(),  // 级别总考
                    term1: this._createLevelData(),
                    term2: this._createLevelData()
                },
                grade4: {
                    badge: { earned: false, earnedAt: null },
                    finalExam: this._createLevelData(),  // 级别总考
                    term1: this._createLevelData(),
                    term2: this._createLevelData()
                },
                grade5: {
                    badge: { earned: false, earnedAt: null },
                    finalExam: this._createLevelData(),  // 级别总考
                    term1: this._createLevelData(),
                    term2: this._createLevelData()
                },
                grade6: {
                    badge: { earned: false, earnedAt: null },
                    finalExam: this._createLevelData(),  // 级别总考
                    term1: this._createLevelData(),
                    term2: this._createLevelData()
                }
            },
            
            // 课外阅读系列
            extracurricular: {
                unlocked: false,
                flyGuy: {
                    badge: { earned: false, earnedAt: null },
                    finalExam: this._createLevelData(),  // 级别总考
                    levels: {
                        book1to5: this._createLevelData(),
                        book6to10: this._createLevelData(),
                        book11to15: this._createLevelData()
                    }
                },
                magicTreeHouse: {
                    badge: { earned: false, earnedAt: null },
                    finalExam: this._createLevelData(),  // 级别总考
                    levels: {} // 待定
                },
                dragonBall: {
                    badge: { earned: false, earnedAt: null },
                    finalExam: this._createLevelData(),  // 级别总考
                    levels: {} // 待定
                },
                harryPotter: {
                    badge: { earned: false, earnedAt: null },
                    finalExam: this._createLevelData(),  // 级别总考
                    levels: {} // 待定
                }
            },
            
            // 升学系列
            academic: {
                unlocked: false,
                middleSchool: {
                    badge: { earned: false, earnedAt: null },
                    finalExam: this._createLevelData(),  // 级别总考
                    levels: {
                        grade7Term1: this._createLevelData(),
                        grade7Term2: this._createLevelData(),
                        grade8Term1: this._createLevelData(),
                        grade8Term2: this._createLevelData(),
                        grade9Term1: this._createLevelData(),
                        grade9Term2: this._createLevelData()
                    }
                },
                highSchool: {
                    badge: { earned: false, earnedAt: null },
                    finalExam: this._createLevelData(),  // 级别总考
                    levels: {
                        senior1Term1: this._createLevelData(),
                        senior1Term2: this._createLevelData(),
                        senior2Term1: this._createLevelData(),
                        senior2Term2: this._createLevelData(),
                        senior3Term1: this._createLevelData(),
                        senior3Term2: this._createLevelData()
                    }
                },
                cet4: {
                    badge: { earned: false, earnedAt: null },
                    finalExam: this._createLevelData(),  // 级别总考
                    levels: {
                        coreVocab: this._createLevelData(),
                        highFreqVocab: this._createLevelData(),
                        advancedVocab: this._createLevelData()
                    }
                }
            }
        };
    }

    /**
     * 创建级别数据的默认结构
     */
    _createLevelData() {
        return {
            score: 0,
            passed: false,
            attempts: 0,
            lastAttempt: null,
            cooldownUntil: null,
            bestDuration: null  // 最佳用时（秒），仅记录通过时的用时
        };
    }

    /**
     * 加载考级进度
     */
    load() {
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY);
            if (saved) {
                const progress = JSON.parse(saved);
                // 合并默认值，确保新增字段也存在
                return this._mergeWithDefaults(progress);
            }
        } catch (e) {
            console.error('加载考级进度失败:', e);
        }
        return this.getDefaultProgress();
    }

    /**
     * 保存考级进度
     */
    save(progress) {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(progress));
            return true;
        } catch (e) {
            console.error('保存考级进度失败:', e);
            return false;
        }
    }

    /**
     * 将已保存的进度与默认值合并（处理版本升级新增字段）
     */
    _mergeWithDefaults(saved) {
        const defaults = this.getDefaultProgress();
        return this._deepMerge(defaults, saved);
    }

    /**
     * 深度合并对象
     */
    _deepMerge(target, source) {
        if (!source) return target;
        
        const result = { ...target };
        
        for (const key in source) {
            if (source.hasOwnProperty(key)) {
                if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                    result[key] = this._deepMerge(target[key] || {}, source[key]);
                } else {
                    result[key] = source[key];
                }
            }
        }
        
        return result;
    }

    /**
     * 检查级别是否在冷却期
     */
    isInCooldown(levelData) {
        if (!levelData.cooldownUntil) return false;
        return Date.now() < levelData.cooldownUntil;
    }

    /**
     * 获取剩余冷却时间（秒）
     */
    getRemainingCooldown(levelData) {
        if (!levelData.cooldownUntil) return 0;
        const remaining = levelData.cooldownUntil - Date.now();
        return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
    }

    /**
     * 格式化剩余冷却时间为 "MM:SS" 格式
     */
    formatCooldownTime(levelData) {
        const seconds = this.getRemainingCooldown(levelData);
        if (seconds <= 0) return '';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    /**
     * 设置冷却期
     */
    setCooldown(levelData) {
        levelData.cooldownUntil = Date.now() + this.COOLDOWN_DURATION;
    }

    /**
     * 清除冷却期
     */
    clearCooldown(levelData) {
        levelData.cooldownUntil = null;
    }

    /**
     * 重置所有进度
     */
    reset() {
        localStorage.removeItem(this.STORAGE_KEY);
        return this.getDefaultProgress();
    }

    /**
     * 获取已获得的徽章列表
     */
    getEarnedBadges(progress) {
        const badges = [];
        
        // 音标徽章
        if (progress.phonics.badge.earned) {
            badges.push({ id: 'phonics', name: '音标大师', earnedAt: progress.phonics.badge.earnedAt });
        }
        
        // 小学年级徽章
        ['grade3', 'grade4', 'grade5', 'grade6'].forEach(grade => {
            if (progress.primaryGrades[grade]?.badge.earned) {
                const gradeNum = grade.replace('grade', '');
                badges.push({ 
                    id: grade, 
                    name: `${gradeNum}年级`, 
                    earnedAt: progress.primaryGrades[grade].badge.earnedAt 
                });
            }
        });
        
        // 课外阅读徽章
        ['flyGuy', 'magicTreeHouse', 'dragonBall', 'harryPotter'].forEach(book => {
            if (progress.extracurricular[book]?.badge.earned) {
                const names = {
                    flyGuy: 'Fly Guy',
                    magicTreeHouse: '神奇树屋',
                    dragonBall: '七龙珠',
                    harryPotter: '哈利波特'
                };
                badges.push({ 
                    id: book, 
                    name: names[book], 
                    earnedAt: progress.extracurricular[book].badge.earnedAt 
                });
            }
        });
        
        // 升学系列徽章
        ['middleSchool', 'highSchool', 'cet4'].forEach(level => {
            if (progress.academic[level]?.badge.earned) {
                const names = {
                    middleSchool: '初中',
                    highSchool: '高中',
                    cet4: '四级'
                };
                badges.push({ 
                    id: level, 
                    name: names[level], 
                    earnedAt: progress.academic[level].badge.earnedAt 
                });
            }
        });
        
        return badges;
    }
    
    /**
     * 导出数据到 JSON 文件
     * 即使没有考试记录，也导出完整的初始数据结构
     */
    exportToFile() {
        try {
            // 获取当前数据，如果没有则使用默认数据
            let progress;
            const savedData = localStorage.getItem(this.STORAGE_KEY);
            if (savedData) {
                progress = this._mergeWithDefaults(JSON.parse(savedData));
            } else {
                progress = this.getDefaultProgress();
            }
            
            const exportData = {
                version: '1.0',
                exportTime: new Date().toISOString(),
                data: progress
            };
            
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `荣誉殿堂_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            return true;
        } catch (e) {
            console.error('导出失败:', e);
            alert('导出失败: ' + e.message);
            return false;
        }
    }
    
    /**
     * 从 JSON 文件导入数据
     * @returns {Promise<boolean>}
     */
    importFromFile() {
        return new Promise((resolve) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) {
                    resolve(false);
                    return;
                }
                
                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const importData = JSON.parse(event.target.result);
                        
                        // 验证数据格式
                        if (!importData.data || !importData.version) {
                            throw new Error('无效的数据格式');
                        }
                        
                        // 确认导入
                        const badges = this.getEarnedBadges(importData.data);
                        const confirmMsg = `确认导入以下数据？\n\n` +
                            `导出时间: ${new Date(importData.exportTime).toLocaleString('zh-CN')}\n` +
                            `已获徽章: ${badges.length} 枚\n\n` +
                            `⚠️ 导入将覆盖当前数据！`;
                        
                        if (!confirm(confirmMsg)) {
                            resolve(false);
                            return;
                        }
                        
                        // 合并默认值确保兼容性
                        const mergedData = this._mergeWithDefaults(importData.data);
                        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(mergedData));
                        
                        alert('✅ 导入成功！页面将刷新...');
                        location.reload();
                        resolve(true);
                    } catch (err) {
                        console.error('导入失败:', err);
                        alert('❌ 导入失败: ' + err.message);
                        resolve(false);
                    }
                };
                
                reader.onerror = () => {
                    alert('❌ 读取文件失败');
                    resolve(false);
                };
                
                reader.readAsText(file);
            };
            
            input.click();
        });
    }
}

// 导出单例
window.CertificationStorage = CertificationStorage;


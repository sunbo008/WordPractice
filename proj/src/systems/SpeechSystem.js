// 语音朗读系统
export class SpeechSystem {
    constructor() {
        this.speechEnabled = true;
        this.currentSpeech = null;
        this.speechTimer = null;
        this.speechSynthesis = null;
        this.britishVoice = null;
        
        this.setupSpeechSynthesis();
    }
    
    setupSpeechSynthesis() {
        console.log('初始化语音合成系统...');
        
        // 检查浏览器是否支持语音合成
        if ('speechSynthesis' in window) {
            this.speechSynthesis = window.speechSynthesis;
            console.log('✅ 浏览器支持 Web Speech API');
            
            // 等待语音列表加载
            const voices = this.speechSynthesis.getVoices();
            console.log('当前可用语音数量:', voices.length);
            
            if (voices.length === 0) {
                console.log('⏳ 语音列表未加载，等待 voiceschanged 事件...');
                this.speechSynthesis.addEventListener('voiceschanged', () => {
                    console.log('📢 voiceschanged 事件触发');
                    this.selectBritishVoice();
                });
            } else {
                this.selectBritishVoice();
            }
        } else {
            console.error('❌ 浏览器不支持语音合成功能');
            this.speechEnabled = false;
        }
    }

    selectBritishVoice() {
        // 获取所有可用的语音
        const voices = this.speechSynthesis.getVoices();
        console.log('正在选择语音，可用数量:', voices.length);
        
        // 打印前几个语音供调试
        if (voices.length > 0) {
            console.log('可用语音示例:', voices.slice(0, 5).map(v => `${v.name} (${v.lang})`));
        }
        
        // 尝试找到英式英语语音
        this.britishVoice = voices.find(voice => 
            voice.lang === 'en-GB' || 
            voice.name.includes('British') || 
            voice.name.includes('UK') ||
            voice.name.includes('Daniel') ||
            voice.name.includes('Kate')
        );
        
        // 如果没有英式语音，使用任何英语语音
        if (!this.britishVoice) {
            this.britishVoice = voices.find(voice => 
                voice.lang.startsWith('en-')
            );
        }
        
        if (this.britishVoice) {
            console.log('✅ 已选择语音:', this.britishVoice.name, '(', this.britishVoice.lang, ')');
        } else {
            console.warn('⚠️ 未找到合适的英语语音，将使用默认语音');
        }
    }

    speakWord(word) {
        // 检查是否启用语音
        if (!this.speechEnabled || !this.speechSynthesis) {
            console.log('语音未启用或不支持');
            return;
        }

        // 如果没有语音，尝试重新获取
        if (!this.britishVoice) {
            this.selectBritishVoice();
        }

        // 创建新的语音合成实例
        const utterance = new SpeechSynthesisUtterance(word);
        
        // 设置语音（如果有的话）
        if (this.britishVoice) {
            utterance.voice = this.britishVoice;
        }
        
        utterance.lang = 'en-GB';
        utterance.rate = 0.9; // 稍微慢一点，便于听清
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        // 添加错误处理
        utterance.onerror = (event) => {
            console.error('语音朗读错误:', event.error, event);
        };

        utterance.onstart = () => {
            console.log('开始朗读:', word);
        };

        utterance.onend = () => {
            console.log('朗读完成:', word);
        };

        // 播放语音
        this.currentSpeech = utterance;
        this.speechSynthesis.speak(utterance);

        console.log('已发送朗读请求:', word, '语音:', this.britishVoice ? this.britishVoice.name : '默认');
    }

    startRepeatedSpeech(word) {
        console.log('开始重复朗读:', word);
        
        // 先停止之前的朗读
        this.stopSpeaking();
        
        // 立即播放第一次
        this.speakWord(word);

        // 设置定时器，每5秒重复播放
        this.speechTimer = setInterval(() => {
            console.log('定时重复朗读:', word);
            this.speakWord(word);
        }, 5000); // 5秒 = 5000毫秒
    }

    stopSpeaking() {
        // 取消定时器
        if (this.speechTimer) {
            clearInterval(this.speechTimer);
            this.speechTimer = null;
        }

        // 停止当前语音
        if (this.speechSynthesis) {
            this.speechSynthesis.cancel();
        }

        this.currentSpeech = null;
    }

    toggle() {
        this.speechEnabled = !this.speechEnabled;
        
        const btn = document.getElementById('toggleSpeechBtn');
        if (this.speechEnabled) {
            btn.textContent = '🔊 语音开';
            btn.classList.remove('disabled');
        } else {
            btn.textContent = '🔇 语音关';
            btn.classList.add('disabled');
            this.stopSpeaking();
        }
        
        console.log('语音', this.speechEnabled ? '开启' : '关闭');
        
        return this.speechEnabled;
    }

    isEnabled() {
        return this.speechEnabled;
    }
}


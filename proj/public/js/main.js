// 主入口文件 - 导入所有模块并初始化游戏
import { debugLog } from '../../src/utils/DebugLogger.js';
import '../../src/core/vocabulary-config-loader.js';
import '../../src/core/vocabulary-manager-v2.js';
import '../../src/core/WordTetrisGame.js';
import '../../src/core/game-settings-integration.js';

// 初始化调试日志
debugLog.init();
debugLog.info('🎮 Word Tetris 游戏启动...');


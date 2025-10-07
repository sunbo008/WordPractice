// 游戏核心引擎 - 从原 game.js 提取主要游戏逻辑
// 此文件将包含 WordTetrisGame 类的核心功能

import { debugLog } from '../utils/DebugLogger.js';
import { SpeechSystem } from '../systems/SpeechSystem.js';
import { CanvasHelper } from '../utils/CanvasHelper.js';

export { debugLog };

// 注意：由于 game.js 文件过大且高度耦合，
// 完整拆分需要更多时间。当前策略：
// 1. 先创建模块结构
// 2. 提取独立的工具类和系统类
// 3. 主游戏类暂时保持相对完整，逐步解耦

// 此处暂时导出原game.js的内容
// 实际的完整拆分将在后续步骤完成


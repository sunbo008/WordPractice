# Implementation Tasks

## 1. 代码修改
- [x] 1.1 修改键盘事件处理正则表达式，添加句点字符支持（`WordTetrisGame.js` 第 642 行）
- [x] 1.2 修改输入过滤器正则表达式，添加句点字符支持（`WordTetrisGame.js` 第 665 行）

## 2. 功能验证
- [x] 2.1 验证 vocabularyManager.checkAnswer() 方法无需修改（已支持任意字符比较）
- [x] 2.2 验证 updateRealTimeDisplay() 方法无需修改（基于字符串处理）
- [x] 2.3 验证 handleCharacterInput() 方法无需修改（通用字符处理）
- [x] 2.4 验证 handleBackspace() 方法无需修改（通用字符删除）

## 3. 测试用例
- [x] 3.1 创建测试页面 `proj/tests/test-period-words.html`
- [x] 3.2 添加 P.E. 单词输入测试（缺失字母包含句点）
- [x] 3.3 添加 Dr. 单词输入测试
- [x] 3.4 添加 U.S.A. 单词输入测试（多个句点）
- [x] 3.5 添加字符过滤测试（确认只接受字母、连字符、句点）
- [x] 3.6 验证普通单词和连字符单词不受影响（回归测试）

## 4. 文档更新
- [x] 4.1 在 `word_tetris_game_design.md` 中添加句点字符支持说明
- [x] 4.2 更新 OpenSpec 规格说明文档

## 5. 部署与验证
- [x] 5.1 在开发环境中完整测试所有用例
- [x] 5.2 确认无回归问题
- [x] 5.3 准备提交变更


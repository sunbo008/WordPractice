# Change: 添加句点（.）字符输入支持

## Why
当前游戏输入系统支持英文字母（a-z）和连字符（-），但不支持句点（.）字符。某些英文单词和缩写包含句点，例如 P.E.（体育课）、U.S.A.（美国）、Dr.（博士）等。这些单词无法正确输入，影响了游戏的学习完整性。

## What Changes
- 扩展键盘输入处理，接受句点（.）字符
- 在输入过滤器中添加句点字符支持
- 句点字符使用与字母、连字符相同的验证和显示逻辑
- 确保包含句点的单词（如 P.E.）可以正确输入和验证

## Impact
- Affected specs: `word-input`
- Affected code:
  - `proj/src/core/WordTetrisGame.js` - 键盘事件处理（第 642 行）
  - `proj/src/core/WordTetrisGame.js` - 输入过滤器（第 665 行）
- Breaking changes: 无
- Backward compatibility: 完全向后兼容，普通单词和连字符单词的输入不受影响


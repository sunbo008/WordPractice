# Change: 修复带连字符单词的输入问题

## Why

当前游戏只允许输入字母（a-z, A-Z），导致像 `pencil-box`、`well-known` 这样带连字符的单词无法正确输入。用户在输入时连字符会被自动过滤掉，导致输入验证失败，严重影响用户体验。

这是一个**输入逻辑缺陷**，需要立即修复以支持完整的英文单词输入规则。

## What Changes

- 修改键盘输入过滤逻辑，允许连字符（`-`）字符
- 更新输入验证逻辑，正确处理带连字符的单词
- 确保连字符在实时显示中正确展示
- 保持现有的字母大小写处理逻辑不变

## Impact

- **Affected specs**: word-input（单词输入功能）
- **Affected code**: 
  - `proj/src/core/WordTetrisGame.js` (输入处理和验证逻辑，约第 642-695 行)
  - `proj/src/core/vocabulary-manager-v2.js` (单词验证逻辑)
- **Breaking changes**: 无
- **User impact**: 正向影响，用户可以正常输入带连字符的单词
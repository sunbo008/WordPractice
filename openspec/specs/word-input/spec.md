# word-input Specification

## Purpose
TBD - created by archiving change fix-hyphenated-word-input. Update Purpose after archive.
## Requirements
### Requirement: 支持连字符输入
系统 SHALL 允许用户在单词输入过程中输入连字符（hyphen, `-`）字符，以支持复合词和短语动词的正确输入。

#### Scenario: 用户输入带连字符的单词
- **WHEN** 单词包含连字符（如 `pencil-box`）
- **AND** 用户按下连字符键（`-`）
- **THEN** 系统应接受该字符输入
- **AND** 在输入框中正确显示连字符
- **AND** 在单词验证时正确匹配连字符

#### Scenario: 用户输入缺失字母包含连字符位置的单词
- **WHEN** 单词为 `pencil-box`，缺失字母为 `c` 和 `-`
- **AND** 用户依次输入 `c` 和 `-`
- **THEN** 系统应正确识别输入
- **AND** 实时显示为绿色高亮（表示正确）
- **AND** 触发炮管射击消除单词

#### Scenario: 连字符输入不影响普通单词
- **WHEN** 单词为普通单词（如 `tree`）
- **AND** 用户尝试输入连字符
- **THEN** 系统应拒绝该输入（因为不在缺失字母列表中）
- **OR** 如果接受输入，应标记为错误（红色高亮）

### Requirement: 字符输入验证
系统 SHALL 验证用户输入的字符，包括字母（a-z, A-Z）和连字符（`-`），并提供实时反馈。

#### Scenario: 接受的字符类型
- **WHEN** 用户按下键盘按键
- **THEN** 系统应接受以下字符：
  - 英文字母 a-z（不区分大小写）
  - 连字符 `-`
- **AND** 拒绝其他所有字符（数字、空格、标点符号等）

#### Scenario: 实时输入显示
- **WHEN** 用户输入字符
- **THEN** 系统应在单词缺失位置显示输入的字符
- **AND** 正确字符显示为绿色
- **AND** 错误字符显示为红色
- **AND** 连字符与字母使用相同的显示逻辑

#### Scenario: 输入长度限制
- **WHEN** 用户输入字符
- **THEN** 系统应限制输入长度不超过缺失字母数量
- **AND** 计算长度时应将连字符计为一个字符
- **AND** 达到长度限制后拒绝额外输入

### Requirement: 退格键删除字符
系统 SHALL 允许用户使用退格键（Backspace）删除已输入的字符，包括连字符。

#### Scenario: 删除最后一个字符（连字符）
- **WHEN** 用户已输入 `c-`
- **AND** 用户按下退格键
- **THEN** 系统应删除连字符
- **AND** 输入状态恢复为 `c`
- **AND** 更新实时显示


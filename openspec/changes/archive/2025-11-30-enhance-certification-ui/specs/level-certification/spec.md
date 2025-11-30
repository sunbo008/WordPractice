## ADDED Requirements

### Requirement: 测试模式支持
系统 SHALL 支持通过 URL 参数 `test=2` 开启测试模式，在荣誉殿堂中显示所有徽章为已获得状态。

#### Scenario: 测试模式开启所有徽章
- **WHEN** 用户访问带有 `?test=2` 参数的荣誉殿堂页面
- **THEN** 所有徽章显示为彩色已获得状态
- **AND** 所有徽章显示亮星标记

### Requirement: 徽章通过标志
系统 SHALL 在已获得的徽章右下角显示🏅通过标志。

#### Scenario: 已获得徽章显示通过标志
- **WHEN** 用户查看荣誉殿堂中已获得的徽章
- **THEN** 徽章右下角显示🏅图标
- **AND** 图标紧挨徽章边缘

### Requirement: 徽章鼓励语句
系统 SHALL 为每个徽章配置专属鼓励语句，在鼠标悬停时显示。

#### Scenario: 鼠标悬停显示鼓励语句
- **WHEN** 用户将鼠标悬停在已获得的徽章上
- **THEN** tooltip 中显示该徽章的鼓励语句
- **AND** tooltip 还显示解锁日期

### Requirement: 动态单词计数
系统 SHALL 动态计算考试单词数量（去重后），而非使用静态配置值。

#### Scenario: 考试确认弹窗显示动态单词数
- **WHEN** 用户点击考试按钮打开确认弹窗
- **THEN** 弹窗先显示 "计算中..."
- **AND** 然后显示实际去重后的单词数量

### Requirement: 徽章区位置
徽章区 SHALL 显示在游戏页面 header 的最左边，与标题同行。

#### Scenario: 徽章区与标题同行显示
- **WHEN** 用户进入游戏主页面
- **THEN** 徽章区显示在 header 左侧
- **AND** 标题居中显示


# Change: 增强考级系统 UI 和用户体验

## Why
考级系统需要更好的视觉反馈和用户体验，包括测试模式支持、徽章通过标识、鼓励语句、动态单词计数以及更合理的布局位置。

## What Changes
- 添加测试模式 `test=2` 参数，可开启所有徽章显示
- 徽章右下角显示🏅通过标志
- 徽章点亮后鼠标悬停显示鼓励语句
- 考试单词数量改为动态计算（去重后实际数量）
- 徽章区位置从固定左上角移到 header 最左边

## Impact
- Affected specs: `level-certification`
- Affected code:
  - `proj/src/ui/CertificationPage.js` - 测试模式、鼓励语句、动态计算
  - `proj/src/systems/ExamIntegration.js` - 新增 getExamWordCount 方法
  - `proj/src/systems/CertificationSystem.js` - 移除硬编码单词数量
  - `proj/src/ui/BadgeArea.js` - 位置调整到 header 内
  - `proj/css/badge.css` - 徽章区样式调整
  - `proj/css/styles.css` - header flex 布局
  - `proj/css/certification.css` - 通过标志样式


## 1. 测试模式支持
- [x] 1.1 添加 URL 参数检测 `test=2`
- [x] 1.2 测试模式下所有徽章显示为已获得状态
- [x] 1.3 测试模式下所有徽章显示亮星

## 2. 徽章通过标志
- [x] 2.1 在已获得徽章右下角显示🏅标志
- [x] 2.2 添加 `.badge-hall-passed` CSS 样式
- [x] 2.3 调整标志位置（右下角紧挨徽章）

## 3. 鼓励语句
- [x] 3.1 为每个徽章配置鼓励语句
- [x] 3.2 在 tooltip 中显示鼓励语句

## 4. 动态单词计数
- [x] 4.1 在 ExamIntegration 添加 `getExamWordCount()` 方法
- [x] 4.2 修改 `_showExamModal()` 为异步方法
- [x] 4.3 显示 "计算中..." 占位，然后显示实际数量
- [x] 4.4 移除配置文件中硬编码的单词数量

## 5. 徽章区位置调整
- [x] 5.1 修改 BadgeArea.js 插入位置到 header 内
- [x] 5.2 修改 game-header 为 flex 布局
- [x] 5.3 包装原有标题内容到 .header-content
- [x] 5.4 调整 badge-area CSS 样式


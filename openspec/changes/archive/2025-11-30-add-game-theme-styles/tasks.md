## 1. CSS 基础设施

- [x] 1.1 创建 `proj/css/themes.css` 文件，定义 CSS 变量
- [x] 1.2 定义默认主题变量（与当前样式一致）
- [x] 1.3 更新 `proj/css/styles.css`，用 CSS 变量替换硬编码颜色
- [x] 1.4 在 `proj/index.html` 中引入 `themes.css`

## 2. 主题定义

- [x] 2.1 创建赛博朋克主题 CSS 变量
- [x] 2.2 创建 Kitty猫主题 CSS 变量
- [x] 2.3 创建蝙蝠侠主题 CSS 变量
- [x] 2.4 创建蜘蛛侠主题 CSS 变量
- [x] 2.5 为每个主题添加按钮颜色变量
- [x] 2.6 为每个主题添加统计数值颜色变量
- [x] 2.7 为每个主题添加学习页面颜色变量
- [x] 2.8 为每个主题添加音标页面颜色变量

## 3. 设置界面

- [x] 3.1 在 `proj/settings.html` 中添加主题选择区域
- [x] 3.2 添加主题预览卡片，显示配色效果
- [x] 3.3 在 `proj/css/settings.css` 中添加主题选择界面样式
- [x] 3.4 在 `proj/settings.html` 中引入 `themes.css`
- [x] 3.5 各主题设置页面完整适配（背景、文字、按钮）

## 4. 主题切换逻辑

- [x] 4.1 页面加载时从 localStorage 读取并应用主题（所有页面）
- [x] 4.2 在 `proj/src/ui/settings.js` 中实现主题切换函数
- [x] 4.3 主题切换时保存到 localStorage
- [x] 4.4 动态给 body 元素添加主题类名
- [x] 4.5 添加主题加载脚本防止页面闪烁

## 5. 游戏主页适配

- [x] 5.1 游戏信息栏使用主题变量
- [x] 5.2 控制按钮使用主题变量
- [x] 5.3 侧边栏面板使用主题变量
- [x] 5.4 Kitty主题特殊适配（白色背景+深色文字）
- [x] 5.5 弹窗使用主题变量

## 6. 荣誉殿堂页面适配

- [x] 6.1 在 `proj/certification.html` 中引入 `themes.css` 和主题加载脚本
- [x] 6.2 更新 `proj/css/certification.css` 使用 CSS 变量
- [x] 6.3 技能树节点主题适配
- [x] 6.4 锁定节点可见性优化（提高不透明度+虚线边框）
- [x] 6.5 数据管理按钮主题适配
- [x] 6.6 各主题图标替换（Kitty: 🎀💖🌸）
- [x] 6.7 Kitty主题深色文字适配

## 7. 学习页面适配

- [x] 7.1 更新 `proj/study/unit-lesson-template.html` 主题支持
- [x] 7.2 更新 `proj/study/extracurricular-lesson-template.html` 主题支持
- [x] 7.3 更新 `proj/study/missed-words-lesson.html` 主题支持
- [x] 7.4 更新 `proj/study/phonics-lesson-template.html` 主题支持
- [x] 7.5 单词卡片使用主题变量
- [x] 7.6 按钮使用主题变量
- [x] 7.7 各主题学习页面完整适配

## 8. 对比度优化

- [x] 8.1 Kitty主题使用深色文字（而非白色）
- [x] 8.2 Kitty主题容器使用白色半透明背景
- [x] 8.3 Kitty主题按钮使用实心填充（而非透明边框）
- [x] 8.4 锁定元素使用灰度滤镜+虚线边框
- [x] 8.5 各主题锁定状态配色适配

## 9. 集成测试

- [x] 9.1 在游戏主页面（`index.html`）测试所有主题
- [x] 9.2 在设置页面（`settings.html`）测试所有主题
- [x] 9.3 在荣誉殿堂（`certification.html`）测试所有主题
- [x] 9.4 在学习页面测试所有主题
- [x] 9.5 验证主题在页面导航间持久保存
- [x] 9.6 验证游戏画布在所有主题下正常渲染
- [x] 9.7 验证所有主题下文字可读性

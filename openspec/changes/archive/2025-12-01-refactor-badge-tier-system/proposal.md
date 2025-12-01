# Change: 重构徽章悬挂区段位系统

## Why
当前徽章悬挂区按"基础系列"、"课外阅读系列"、"升学系列"分组，缺乏段位层级感。需要重新划分为青铜、白银、黄金、王者四个段位，并为每个段位设计专属徽章，增强成就感和游戏化体验。

## What Changes
- **BREAKING**: 移除原有"基础系列"、"课外阅读系列"、"升学系列"分组
- 新增四个段位分组：
  - 青铜：音标（1枚）
  - 白银：3~6年级（4枚）
  - 黄金：Fly Guy、神奇树屋、初中、高中（4枚）
  - 王者：七龙珠、哈利波特、四级（3枚）
- 新增4枚段位徽章（青铜、白银、黄金、王者）
- 原有12枚徽章仅调整边框/装饰色系以匹配所属段位，保留原有图案样式
- 段位徽章点亮逻辑：当该段位内所有分级考试徽章全部点亮时，段位徽章自动点亮
- 主游戏界面 header 右侧显示当前段位，与左侧徽章区呼应

## Impact
- Affected specs: `level-certification`
- Affected code:
  - `proj/src/ui/CertificationPage.js` - 徽章悬挂区渲染逻辑
  - `proj/src/ui/BadgeArea.js` - 主页徽章区显示
  - `proj/src/ui/TierDisplay.js` - 新增：主页段位显示组件
  - `proj/src/systems/CertificationSystem.js` - 段位徽章点亮逻辑
  - `proj/src/utils/CertificationStorage.js` - 段位徽章存储
  - `proj/css/certification.css` - 段位分组样式
  - `proj/css/badge.css` - 段位显示样式
  - `proj/index.html` - header 布局调整
  - `proj/assets/badges/` - 16枚徽章 SVG 文件（12枚重设计 + 4枚新增段位徽章）


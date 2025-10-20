# Word Tetris 桌面应用打包指南

本文档介绍如何将 Word Tetris Web 应用打包成可双击运行的桌面应用程序。

---

## 📋 目录

- [方案对比](#方案对比)
- [方案 1：Electron 打包（推荐）](#方案-1electron-打包推荐)
- [方案 2：PyWebView 打包](#方案-2pywebview-打包)
- [方案 3：Python HTTP 服务器](#方案-3python-http-服务器)
- [常见问题](#常见问题)

---

## 方案对比

| 方案 | 用户体验 | 文件大小 | 开发难度 | 跨平台 | 推荐度 |
|------|---------|---------|---------|--------|--------|
| **Electron** | ⭐⭐⭐⭐⭐<br>完美桌面体验 | ~100-150MB | 中等 | ✅ Win/Mac/Linux | ⭐⭐⭐⭐⭐ |
| **PyWebView** | ⭐⭐⭐⭐<br>接近桌面体验 | ~15-30MB | 简单 | ✅ Win/Mac/Linux | ⭐⭐⭐⭐ |
| **Python HTTP** | ⭐⭐⭐<br>浏览器体验 | ~5-10MB | 最简单 | ✅ Win/Mac/Linux | ⭐⭐⭐ |

---

## 方案 1：Electron 打包（推荐）

### 🎯 适合场景
- 需要专业的桌面应用体验
- 希望应用看起来像原生软件
- 不在意文件体积（用户体验优先）

### 📦 打包后效果
- Windows: `Word-Tetris-Setup-1.0.0.exe` （安装程序）
- macOS: `Word-Tetris-1.0.0.dmg` （磁盘镜像）
- Linux: `Word-Tetris-1.0.0.AppImage` （便携应用）

### 🛠️ 实现步骤

#### 第 1 步：安装 Node.js
```bash
# 访问 https://nodejs.org/ 下载并安装 LTS 版本
# 验证安装
node --version
npm --version
```

#### 第 2 步：初始化项目
在项目根目录执行：
```bash
# 初始化 package.json
npm init -y

# 安装 Electron 及打包工具
npm install electron --save-dev
npm install electron-builder --save-dev
```

#### 第 3 步：创建主进程文件
在项目根目录创建 `electron-main.js`：

```javascript
const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

// 全局窗口引用
let mainWindow;

// 创建主窗口
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      // 允许加载本地资源
      webSecurity: true
    },
    icon: path.join(__dirname, 'proj/images/icon.png'),
    title: 'Word Tetris - 单词俄罗斯方块',
    show: false // 先不显示，等加载完成后再显示
  });

  // 加载 index.html
  mainWindow.loadFile('proj/index.html');

  // 窗口加载完成后显示
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // 开发模式：打开开发者工具
  // mainWindow.webContents.openDevTools();

  // 窗口关闭时清理引用
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // 创建菜单
  createMenu();
}

// 创建应用菜单
function createMenu() {
  const template = [
    {
      label: '文件',
      submenu: [
        {
          label: '重新加载',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            if (mainWindow) mainWindow.reload();
          }
        },
        { type: 'separator' },
        {
          label: '退出',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: '编辑',
      submenu: [
        { label: '撤销', role: 'undo' },
        { label: '重做', role: 'redo' },
        { type: 'separator' },
        { label: '剪切', role: 'cut' },
        { label: '复制', role: 'copy' },
        { label: '粘贴', role: 'paste' }
      ]
    },
    {
      label: '视图',
      submenu: [
        { label: '全屏', role: 'togglefullscreen' },
        { type: 'separator' },
        { label: '开发者工具', role: 'toggleDevTools' }
      ]
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '关于 Word Tetris',
          click: () => {
            const { dialog } = require('electron');
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: '关于',
              message: 'Word Tetris v1.0.0',
              detail: '单词俄罗斯方块 - 在游戏中学习英语\n\n© 2024 WordPractice'
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// 应用准备就绪
app.whenReady().then(createWindow);

// 所有窗口关闭时退出（macOS 除外）
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// macOS 激活时重新创建窗口
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
```

#### 第 4 步：配置 package.json
修改项目根目录的 `package.json`：

```json
{
  "name": "word-tetris",
  "version": "1.0.0",
  "description": "Word Tetris - 单词俄罗斯方块，在游戏中学习英语",
  "main": "electron-main.js",
  "scripts": {
    "start": "electron .",
    "build": "electron-builder",
    "build:win": "electron-builder --win",
    "build:mac": "electron-builder --mac",
    "build:linux": "electron-builder --linux"
  },
  "keywords": ["word", "tetris", "english", "learning", "game"],
  "author": "WordPractice",
  "license": "MIT",
  "build": {
    "appId": "com.wordpractice.tetris",
    "productName": "Word Tetris",
    "copyright": "Copyright © 2024 WordPractice",
    "directories": {
      "output": "dist",
      "buildResources": "build"
    },
    "files": [
      "proj/**/*",
      "api/**/*",
      "electron-main.js",
      "!proj/tests/**",
      "!proj/tools/**",
      "!**/*.md"
    ],
    "win": {
      "target": [
        {
          "target": "nsis",
          "arch": ["x64"]
        }
      ],
      "icon": "build/icon.ico"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true,
      "shortcutName": "Word Tetris"
    },
    "mac": {
      "target": "dmg",
      "icon": "build/icon.icns",
      "category": "public.app-category.education"
    },
    "linux": {
      "target": "AppImage",
      "icon": "build/icon.png",
      "category": "Education"
    }
  }
}
```

#### 第 5 步：准备应用图标
创建 `build` 目录并放置图标文件：
- `build/icon.ico` - Windows 图标（256x256）
- `build/icon.icns` - macOS 图标（512x512）
- `build/icon.png` - Linux 图标（512x512）

> 💡 提示：可以使用在线工具将 PNG 转换为 ICO 和 ICNS 格式

#### 第 6 步：测试运行
```bash
# 开发模式运行
npm start
```

#### 第 7 步：打包应用
```bash
# Windows 平台
npm run build:win

# macOS 平台
npm run build:mac

# Linux 平台
npm run build:linux

# 或同时打包当前平台
npm run build
```

#### 第 8 步：查看打包结果
打包完成后，在 `dist` 目录查看：
- Windows: `Word Tetris Setup 1.0.0.exe`
- macOS: `Word Tetris-1.0.0.dmg`
- Linux: `Word Tetris-1.0.0.AppImage`

### ✨ 优点
- ✅ 完美的桌面应用体验
- ✅ 自定义窗口、菜单、图标
- ✅ 自动更新支持（可扩展）
- ✅ 跨平台一致性好
- ✅ 生态成熟，文档丰富

### ⚠️ 缺点
- ❌ 文件体积大（100MB+）
- ❌ 首次加载稍慢
- ❌ 打包时间较长

---

## 方案 2：PyWebView 打包

### 🎯 适合场景
- 熟悉 Python 开发
- 希望文件体积更小
- 需要快速打包

### 📦 打包后效果
- Windows: `WordTetris.exe` （单文件可执行程序）
- 文件大小：15-30MB

### 🛠️ 实现步骤

#### 第 1 步：安装 Python 依赖
```bash
# 安装 pywebview
pip install pywebview

# Windows 需要额外安装（选择其一）
pip install pythonnet  # 推荐，使用 .NET WebView2
# 或
pip install pywebview[cef]  # 使用 CEF 浏览器引擎

# 安装打包工具
pip install pyinstaller
```

#### 第 2 步：创建启动脚本
在项目根目录创建 `app.py`：

```python
#!/usr/bin/env python3
"""
Word Tetris 桌面应用启动器
使用 PyWebView 将 Web 应用打包成桌面程序
"""

import webview
import os
import sys
import threading
import http.server
import socketserver
from pathlib import Path


class LocalServer:
    """本地 HTTP 服务器"""
    
    def __init__(self, port=8080):
        self.port = port
        self.server = None
        self.thread = None
        
    def start(self):
        """启动服务器（后台线程）"""
        def run_server():
            # 切换到项目目录
            os.chdir(self._get_base_path())
            
            Handler = http.server.SimpleHTTPRequestHandler
            Handler.extensions_map.update({
                '.js': 'application/javascript',
                '.json': 'application/json',
                '.css': 'text/css',
                '.html': 'text/html',
            })
            
            with socketserver.TCPServer(("127.0.0.1", self.port), Handler) as httpd:
                self.server = httpd
                print(f"✅ 本地服务器启动：http://127.0.0.1:{self.port}")
                httpd.serve_forever()
        
        self.thread = threading.Thread(target=run_server, daemon=True)
        self.thread.start()
    
    def _get_base_path(self):
        """获取项目根目录"""
        if getattr(sys, 'frozen', False):
            # 打包后的路径
            return sys._MEIPASS
        else:
            # 开发时的路径
            return Path(__file__).parent


class Api:
    """提供给前端调用的 API"""
    
    def show_message(self, title, message):
        """显示消息框"""
        return {'status': 'ok', 'message': f'{title}: {message}'}


def main():
    """主函数"""
    # 启动本地服务器
    server = LocalServer(port=8080)
    server.start()
    
    # 创建 API 实例
    api = Api()
    
    # 创建窗口
    window = webview.create_window(
        title='Word Tetris - 单词俄罗斯方块',
        url='http://127.0.0.1:8080/proj/index.html',
        width=1400,
        height=900,
        resizable=True,
        fullscreen=False,
        min_size=(1024, 768),
        background_color='#1a1a2e',
        js_api=api
    )
    
    # 启动应用
    webview.start(
        debug=False,  # 生产环境关闭调试
        http_server=False  # 使用自定义服务器
    )


if __name__ == '__main__':
    main()
```

#### 第 3 步：测试运行
```bash
python app.py
```

#### 第 4 步：打包应用
```bash
# Windows 打包（单文件）
pyinstaller --onefile --windowed \
  --name="WordTetris" \
  --icon=build/icon.ico \
  --add-data "proj;proj" \
  --add-data "api;api" \
  --hidden-import=clr \
  app.py

# macOS/Linux 打包
pyinstaller --onefile --windowed \
  --name="WordTetris" \
  --icon=build/icon.icns \
  --add-data "proj:proj" \
  --add-data "api:api" \
  app.py
```

或创建 `WordTetris.spec` 配置文件：

```python
# -*- mode: python ; coding: utf-8 -*-

block_cipher = None

a = Analysis(
    ['app.py'],
    pathex=[],
    binaries=[],
    datas=[
        ('proj', 'proj'),
        ('api', 'api'),
    ],
    hiddenimports=['clr'],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='WordTetris',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon='build/icon.ico'
)
```

使用配置文件打包：
```bash
pyinstaller WordTetris.spec
```

#### 第 5 步：查看打包结果
打包完成后，在 `dist` 目录查看：
- `WordTetris.exe` （Windows）
- `WordTetris.app` （macOS）

### ✨ 优点
- ✅ 文件体积小（15-30MB）
- ✅ 纯 Python 方案，易于维护
- ✅ 打包速度快
- ✅ 跨平台支持

### ⚠️ 缺点
- ❌ 体验不如 Electron 原生
- ❌ 依赖系统浏览器引擎
- ❌ 某些高级功能受限

---

## 方案 3：Python HTTP 服务器

### 🎯 适合场景
- 最简单的打包方式
- 不介意通过浏览器访问
- 希望文件体积最小

### 📦 打包后效果
- Windows: `WordTetris.exe` （启动器）
- 自动打开默认浏览器
- 文件大小：5-10MB

### 🛠️ 实现步骤

#### 第 1 步：创建启动脚本
在项目根目录创建 `run.py`：

```python
#!/usr/bin/env python3
"""
Word Tetris 简易启动器
启动本地 HTTP 服务器并自动打开浏览器
"""

import http.server
import socketserver
import webbrowser
import os
import sys
import signal
import threading
import time
from pathlib import Path


class ColoredOutput:
    """彩色终端输出"""
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    
    @staticmethod
    def print_header(text):
        print(f"{ColoredOutput.HEADER}{ColoredOutput.BOLD}{text}{ColoredOutput.ENDC}")
    
    @staticmethod
    def print_success(text):
        print(f"{ColoredOutput.OKGREEN}✅ {text}{ColoredOutput.ENDC}")
    
    @staticmethod
    def print_info(text):
        print(f"{ColoredOutput.OKCYAN}ℹ️  {text}{ColoredOutput.ENDC}")
    
    @staticmethod
    def print_warning(text):
        print(f"{ColoredOutput.WARNING}⚠️  {text}{ColoredOutput.ENDC}")
    
    @staticmethod
    def print_error(text):
        print(f"{ColoredOutput.FAIL}❌ {text}{ColoredOutput.ENDC}")


def get_base_path():
    """获取项目根目录"""
    if getattr(sys, 'frozen', False):
        return sys._MEIPASS
    else:
        return Path(__file__).parent


def find_free_port(start_port=8080, max_attempts=10):
    """查找可用端口"""
    import socket
    
    for port in range(start_port, start_port + max_attempts):
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind(('127.0.0.1', port))
                return port
        except OSError:
            continue
    
    raise RuntimeError(f"无法找到可用端口（尝试范围：{start_port}-{start_port + max_attempts}）")


def open_browser_delayed(url, delay=1.5):
    """延迟打开浏览器"""
    def delayed_open():
        time.sleep(delay)
        ColoredOutput.print_info(f"正在打开浏览器...")
        webbrowser.open(url)
    
    thread = threading.Thread(target=delayed_open, daemon=True)
    thread.start()


def main():
    """主函数"""
    # 切换到项目目录
    base_path = get_base_path()
    os.chdir(base_path)
    
    # 查找可用端口
    try:
        PORT = find_free_port()
    except RuntimeError as e:
        ColoredOutput.print_error(str(e))
        input("\n按 Enter 键退出...")
        sys.exit(1)
    
    # 构建 URL
    url = f"http://127.0.0.1:{PORT}/proj/index.html"
    
    # 打印欢迎信息
    ColoredOutput.print_header("\n" + "="*60)
    ColoredOutput.print_header("    🎮 Word Tetris - 单词俄罗斯方块")
    ColoredOutput.print_header("="*60 + "\n")
    
    ColoredOutput.print_success(f"本地服务器启动成功！")
    ColoredOutput.print_info(f"访问地址: {url}")
    ColoredOutput.print_info(f"端口号: {PORT}")
    ColoredOutput.print_warning("按 Ctrl+C 停止服务器\n")
    
    # 延迟打开浏览器
    open_browser_delayed(url)
    
    # 启动 HTTP 服务器
    Handler = http.server.SimpleHTTPRequestHandler
    Handler.extensions_map.update({
        '.js': 'application/javascript',
        '.json': 'application/json',
        '.css': 'text/css',
        '.html': 'text/html',
        '.mp3': 'audio/mpeg',
        '.jpg': 'image/jpeg',
        '.png': 'image/png',
    })
    
    # 禁用服务器日志（可选）
    # Handler.log_message = lambda *args: None
    
    with socketserver.TCPServer(("127.0.0.1", PORT), Handler) as httpd:
        # 注册信号处理
        def signal_handler(sig, frame):
            ColoredOutput.print_warning("\n正在关闭服务器...")
            httpd.shutdown()
            ColoredOutput.print_success("服务器已关闭，再见！👋\n")
            sys.exit(0)
        
        signal.signal(signal.SIGINT, signal_handler)
        
        # 保持服务器运行
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        ColoredOutput.print_error(f"启动失败: {str(e)}")
        input("\n按 Enter 键退出...")
        sys.exit(1)
```

#### 第 2 步：测试运行
```bash
python run.py
```

#### 第 3 步：打包应用
```bash
# Windows
pyinstaller --onefile --console \
  --name="WordTetris" \
  --icon=build/icon.ico \
  --add-data "proj;proj" \
  --add-data "api;api" \
  run.py

# macOS/Linux
pyinstaller --onefile --console \
  --name="WordTetris" \
  --add-data "proj:proj" \
  --add-data "api:api" \
  run.py
```

#### 第 4 步：查看打包结果
打包完成后，在 `dist` 目录查看：
- `WordTetris.exe`

双击运行后会自动打开浏览器！

### ✨ 优点
- ✅ 最简单的实现方式
- ✅ 文件体积最小（5-10MB）
- ✅ 代码清晰易维护
- ✅ 无需额外依赖

### ⚠️ 缺点
- ❌ 依赖系统浏览器
- ❌ 不是真正的桌面应用
- ❌ 用户体验一般

---

## 常见问题

### Q1：打包后文件太大怎么办？
**A**：
- Electron：使用 `electron-builder` 的压缩选项
- PyWebView：使用 `pyinstaller` 的 `--onefile` 和 UPX 压缩
- 删除不必要的测试文件和文档

### Q2：打包后无法加载资源？
**A**：
- 检查文件路径是否正确（使用相对路径）
- 确认 `--add-data` 参数包含了所有资源
- 查看控制台错误信息

### Q3：如何添加应用图标？
**A**：
- Windows：使用 `.ico` 格式（256x256）
- macOS：使用 `.icns` 格式（512x512）
- Linux：使用 `.png` 格式（512x512）
- 在线工具：https://www.icoconverter.com/

### Q4：打包后运行速度变慢？
**A**：
- Electron：首次启动需要加载 Chromium，正常现象
- PyWebView：依赖系统浏览器，性能因系统而异
- 优化前端资源加载（压缩、缓存）

### Q5：如何实现自动更新？
**A**：
- Electron：使用 `electron-updater` 模块
- PyWebView：需要自己实现更新逻辑
- 或使用在线版本，无需更新

### Q6：能否同时支持离线和在线功能？
**A**：
可以！建议方案：
- 词库数据：打包到本地
- TTS 朗读：在线 API（有网时使用）
- 图片资源：本地缓存 + 在线加载
- 翻译功能：本地词典 + 在线 API

### Q7：如何减少 Electron 打包体积？
**A**：
```javascript
// 在 package.json 中配置
"build": {
  "asar": true,  // 启用 ASAR 压缩
  "compression": "maximum",  // 最大压缩
  "files": [
    "!tests/**",  // 排除测试文件
    "!doc/**",    // 排除文档
    "!*.md"       // 排除 Markdown
  ]
}
```

### Q8：macOS 无法打开应用（安全限制）？
**A**：
```bash
# 允许运行未签名的应用
xattr -cr /Applications/WordTetris.app

# 或在「系统偏好设置」→「安全性与隐私」中允许
```

---

## 推荐配置

### 最佳实践（Electron）

```json
{
  "scripts": {
    "start": "electron .",
    "build": "electron-builder",
    "build:all": "electron-builder -mwl"
  },
  "build": {
    "compression": "maximum",
    "asar": true,
    "files": [
      "proj/**/*",
      "!proj/tests/**",
      "!proj/doc/**",
      "!**/*.md"
    ],
    "win": {
      "target": ["nsis", "portable"]
    }
  }
}
```

### 开发建议

1. **版本控制**：使用语义化版本（如 1.0.0）
2. **测试充分**：打包前在目标平台测试
3. **资源优化**：压缩图片、合并 CSS/JS
4. **错误处理**：添加崩溃报告和日志
5. **用户体验**：添加启动画面、进度提示

---

## 总结

| 需求 | 推荐方案 |
|------|---------|
| 专业桌面应用 | ⭐ **Electron** |
| 快速打包 | ⭐ **PyWebView** |
| 最小体积 | ⭐ **Python HTTP** |
| 学习实践 | ⭐ **三个都试试** |

**我的建议**：
- 生产环境：**Electron**（用户体验最好）
- 个人使用：**PyWebView**（轻量快速）
- 临时分享：**Python HTTP**（极简方案）

祝打包顺利！🎉



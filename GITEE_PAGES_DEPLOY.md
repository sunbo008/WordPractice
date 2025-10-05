# Gitee Pages 部署指南

本文档详细说明如何将 Word Practice 项目部署到 Gitee Pages。

## 📋 前置要求

1. **Gitee 账号**：需要在 [Gitee](https://gitee.com) 注册账号
2. **实名认证**：Gitee Pages 需要完成实名认证才能使用
3. **Git 环境**：本地需要安装 Git

## 🚀 快速部署（推荐方式）

### 🎯 针对已有 GitHub 仓库的部署方案

如果你已经有 GitHub 仓库，有两种方式部署到 Gitee：

#### **方式 1：从 GitHub 导入到 Gitee（最简单）**

1. 登录 [Gitee](https://gitee.com)
2. 点击右上角 `+` -> `从 GitHub/GitLab 导入仓库`
3. 授权 Gitee 访问你的 GitHub（首次需要）
4. 选择要导入的仓库（`WordPractice`）
5. 填写 Gitee 仓库信息：
   - **仓库名称**：`word-practice`（或保持原名）
   - **是否开源**：选择"公开"
6. 点击"导入"，等待完成（通常 1-2 分钟）

✅ **优点**：一次性导入，简单快速  
⚠️ **注意**：后续更新需要手动同步或使用双推送

#### **方式 2：添加 Gitee 为第二远程仓库（推荐，可双推送）**

1. 登录 [Gitee](https://gitee.com)
2. 点击右上角 `+` -> `新建仓库`
3. 填写仓库信息：
   - **仓库名称**：`word-practice`（或自定义名称）
   - **是否开源**：选择"公开"（私有仓库无法使用 Gitee Pages）
   - **初始化仓库**：**不勾选**（重要！因为我们已有代码）
4. 点击"创建"

---

### 步骤 1：创建 Gitee 仓库（如果选择方式 2）

按照上面"方式 2"的说明创建空仓库。

### 步骤 2：添加 Gitee 远程仓库

如果使用方式 1（从 GitHub 导入），跳过此步骤，直接到步骤 4。

如果使用方式 2（双远程仓库），在项目根目录执行：

```bash
# 添加 Gitee 远程仓库（HTTPS 方式）
git remote add gitee https://gitee.com/你的用户名/word-practice.git

# 或使用 SSH 方式（需要先配置 SSH 密钥，推荐）
git remote add gitee git@gitee.com:你的用户名/word-practice.git
```

验证是否添加成功：

```bash
git remote -v
```

应该看到类似输出：

```
gitee   https://gitee.com/你的用户名/word-practice.git (fetch)
gitee   https://gitee.com/你的用户名/word-practice.git (push)
origin  https://github.com/你的用户名/WordPractice.git (fetch)
origin  https://github.com/你的用户名/WordPractice.git (push)
```

✅ 现在你的仓库同时关联了 GitHub 和 Gitee！

### 步骤 3：首次推送到 Gitee

如果使用方式 1（从 GitHub 导入），代码已经在 Gitee 上，跳过此步骤。

如果使用方式 2（双远程仓库），需要首次推送：

```bash
# 推送当前分支到 Gitee
git push gitee main

# 如果你的主分支是 master
git push gitee master

# 推送所有分支和标签（可选）
git push gitee --all
git push gitee --tags
```

#### 🔄 后续更新（双推送）

安装了双远程仓库后，每次更新可以同时推送到 GitHub 和 Gitee：

```bash
# 方法 1：使用部署脚本（推荐）
chmod +x deploy-to-gitee.sh
./deploy-to-gitee.sh

# 方法 2：手动双推送
git add .
git commit -m "更新说明"
git push origin main    # 推送到 GitHub
git push gitee main     # 推送到 Gitee

# 方法 3：一次性推送到所有远程仓库
git push --all
```

### 步骤 4：启用 Gitee Pages

1. 访问你的 Gitee 仓库页面
2. 点击 `服务` -> `Gitee Pages`
3. 配置部署设置：
   - **部署分支**：选择 `main`（或你的默认分支）
   - **部署目录**：选择 `proj`（⚠️ 重要：必须选择 proj 目录）
4. 点击 `启动` 按钮

### 步骤 5：等待部署完成

- 首次部署需要 1-3 分钟
- 部署成功后会显示访问地址
- 访问地址格式：`https://你的用户名.gitee.io/word-practice`

## 🔄 更新部署

每次修改代码后，需要重新部署：

```bash
# 方法 1：使用部署脚本（推荐）
./deploy-to-gitee.sh

# 方法 2：手动推送
git add .
git commit -m "更新说明"
git push gitee main
```

**⚠️ 重要**：Gitee Pages 免费版推送代码后需要：
1. 访问仓库的 Gitee Pages 页面
2. 点击 `更新` 按钮
3. 等待重新部署（约 1 分钟）

## 📁 项目结构说明

本项目使用 `proj` 目录作为部署根目录：

```
WordPractice/
├── proj/                    # ← 这是 Gitee Pages 的部署目录
│   ├── index.html          # 游戏主页面
│   ├── settings-v2.html    # 设置页面
│   ├── study/              # 学习模块
│   │   └── phonics-lesson-template.html
│   ├── words/              # 词库文件
│   │   ├── daily-phonics/
│   │   └── special-practice/
│   ├── *.js                # JavaScript 文件
│   └── *.css               # 样式文件
├── deploy-to-gitee.sh      # Gitee 部署脚本
└── README.md
```

**配置 Gitee Pages 时务必选择 `proj` 目录**，否则无法正常访问。

## 🔧 配置 SSH 密钥（可选，推荐）

使用 SSH 方式可以避免每次推送都输入密码：

### 1. 生成 SSH 密钥

```bash
ssh-keygen -t rsa -C "your_email@example.com"
```

按提示操作，默认保存在 `~/.ssh/id_rsa`

### 2. 查看公钥

```bash
cat ~/.ssh/id_rsa.pub
```

### 3. 添加到 Gitee

1. 登录 Gitee
2. 点击右上角头像 -> `设置`
3. 左侧菜单选择 `SSH 公钥`
4. 将公钥内容粘贴进去
5. 点击 `确定`

### 4. 测试连接

```bash
ssh -T git@gitee.com
```

看到欢迎信息即表示配置成功。

## 🌐 访问地址

部署成功后，可以通过以下地址访问：

- **主游戏页面**：`https://你的用户名.gitee.io/word-practice/`
- **设置页面**：`https://你的用户名.gitee.io/word-practice/settings-v2.html`
- **学习页面**：`https://你的用户名.gitee.io/word-practice/study/phonics-lesson-template.html`

## 🎯 自定义域名（可选）

Gitee Pages 支持绑定自定义域名：

1. 在 Gitee Pages 设置页面找到"自定义域名"
2. 输入你的域名（如 `words.example.com`）
3. 在域名 DNS 设置中添加 CNAME 记录：
   - 记录类型：`CNAME`
   - 主机记录：`words`（或 `@` 用于根域名）
   - 记录值：`你的用户名.gitee.io`
4. 等待 DNS 生效（通常 10 分钟到 24 小时）

## ⚠️ 常见问题

### 1. 访问 404 错误

**原因**：部署目录配置错误

**解决**：
- 确认部署目录选择的是 `proj`
- 重新点击"更新"按钮

### 2. 推送失败：Permission denied

**原因**：没有仓库权限或 SSH 密钥未配置

**解决**：
- 确认仓库是你自己创建的
- 使用 HTTPS 方式推送（会提示输入密码）
- 或配置 SSH 密钥

### 3. 更新代码后页面没变化

**原因**：Gitee Pages 免费版需要手动更新

**解决**：
1. 访问仓库的 Gitee Pages 页面
2. 点击"更新"按钮
3. 清除浏览器缓存（Ctrl + F5）

### 4. 样式或 JS 文件 404

**原因**：相对路径问题

**解决**：
- 确认所有资源文件都在 `proj` 目录下
- 检查 HTML 中的引用路径是否正确
- 本项目已经使用相对路径，应该不会有这个问题

### 5. 实名认证问题

**原因**：Gitee Pages 需要实名认证

**解决**：
1. 访问 Gitee 个人设置
2. 完成实名认证（需要身份证信息）
3. 认证通过后即可使用 Gitee Pages

## 💡 Gitee Pages vs Vercel 对比

| 特性 | Gitee Pages | Vercel |
|------|-------------|--------|
| 国内访问速度 | ⭐⭐⭐⭐⭐ 极快 | ⭐⭐ 较慢 |
| 部署方式 | 手动点击更新 | 自动部署 |
| 免费额度 | 无限制 | 有限制 |
| 配置难度 | 简单 | 简单 |
| 自定义域名 | 支持 | 支持 |
| HTTPS | 自动 | 自动 |
| 实名认证 | 需要 | 不需要 |

## 📚 相关链接

- [Gitee Pages 官方文档](https://gitee.com/help/articles/4136)
- [Gitee 帮助中心](https://gitee.com/help)
- [Git 基础教程](https://git-scm.com/book/zh/v2)

## 🆘 获取帮助

如果遇到问题：
1. 查看本文档的"常见问题"部分
2. 访问 [Gitee 帮助中心](https://gitee.com/help)
3. 在项目仓库提交 Issue

---

**祝你部署顺利！🎉**


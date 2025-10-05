# GitHub 仓库部署到 Gitee Pages 指南

本指南专门针对**已有 GitHub 仓库**的用户，说明如何将项目同时部署到 Gitee Pages。

## 🎯 为什么要同时使用 GitHub 和 Gitee？

| 平台 | 优势 | 适用场景 |
|------|------|----------|
| **GitHub** | 国际主流、生态丰富、协作功能强大 | 开源项目、国际合作、代码托管 |
| **Gitee** | 国内访问快、Pages 速度极快 | 国内用户访问、演示项目 |

**最佳实践**：同时使用两个平台
- 代码托管在 GitHub（主仓库）
- 静态网站部署在 Gitee Pages（国内访问快）

## 🚀 两种部署方式对比

### 方式 1：从 GitHub 导入到 Gitee（最简单）

**优点**：
- ✅ 操作简单，几分钟搞定
- ✅ 自动导入所有历史记录
- ✅ 自动同步分支和标签

**缺点**：
- ⚠️ 后续更新需要手动同步
- ⚠️ 或者需要配置自动同步工具

**适合**：不经常更新的项目、快速部署需求

---

### 方式 2：双远程仓库（推荐）

**优点**：
- ✅ 一次配置，长期使用
- ✅ 可以同时推送到两个平台
- ✅ GitHub 和 Gitee 保持同步

**缺点**：
- ⚠️ 初次配置稍复杂
- ⚠️ 每次需要推送两次（或使用脚本）

**适合**：经常更新的项目、需要保持同步

---

## 📋 方式 1：从 GitHub 导入（最简单）

### 步骤 1：导入仓库

1. 登录 [Gitee](https://gitee.com)
2. 点击右上角 `+` -> `从 GitHub/GitLab 导入仓库`
3. **首次导入**需要授权：
   - 点击"授权 GitHub 账号"
   - 跳转到 GitHub 授权页面
   - 点击"Authorize"授权
4. 返回 Gitee，会看到你的 GitHub 仓库列表
5. 找到 `WordPractice` 仓库，点击"导入"
6. 配置导入选项：
   - **仓库名称**：`word-practice`（或保持 `WordPractice`）
   - **是否开源**：公开（必须公开才能使用 Gitee Pages）
   - **同步代码**：勾选（可选，定期自动同步）
7. 点击"导入"按钮

### 步骤 2：等待导入完成

- 通常需要 1-3 分钟
- 导入完成后会自动跳转到仓库页面

### 步骤 3：启用 Gitee Pages

1. 在 Gitee 仓库页面，点击 `服务` -> `Gitee Pages`
2. 配置部署：
   - **部署分支**：`main`（或 `master`）
   - **部署目录**：`proj` ⚠️ **重要！**
3. 点击 `启动` 按钮
4. 等待部署完成（1-3 分钟）

### 步骤 4：访问网站

部署成功后，访问地址：
```
https://你的用户名.gitee.io/word-practice/
```

### 后续更新

**方法 A：重新导入（简单但会覆盖）**
1. 在 Gitee 仓库页面，点击右上角"刷新"按钮
2. 等待同步完成
3. 返回 Gitee Pages 页面，点击"更新"

**方法 B：添加为远程仓库（推荐）**

后续可以将 Gitee 添加为第二远程仓库：
```bash
git remote add gitee https://gitee.com/你的用户名/word-practice.git
```

然后就可以使用方式 2 的推送方法了。

---

## 📋 方式 2：双远程仓库（推荐）

### 步骤 1：创建 Gitee 空仓库

1. 登录 [Gitee](https://gitee.com)
2. 点击右上角 `+` -> `新建仓库`
3. 填写信息：
   - **仓库名称**：`word-practice`
   - **是否开源**：公开
   - **初始化仓库**：**不勾选任何选项**（重要！）
4. 点击"创建"

### 步骤 2：添加 Gitee 为远程仓库

在项目根目录打开终端：

```bash
# 查看当前远程仓库
git remote -v

# 添加 Gitee 为第二个远程仓库（HTTPS 方式）
git remote add gitee https://gitee.com/你的用户名/word-practice.git

# 或使用 SSH 方式（推荐，需先配置 SSH 密钥）
git remote add gitee git@gitee.com:你的用户名/word-practice.git

# 验证是否添加成功
git remote -v
```

应该看到：
```
gitee   https://gitee.com/你的用户名/word-practice.git (fetch)
gitee   https://gitee.com/你的用户名/word-practice.git (push)
origin  https://github.com/你的用户名/WordPractice.git (fetch)
origin  https://github.com/你的用户名/WordPractice.git (push)
```

### 步骤 3：首次推送到 Gitee

```bash
# 推送当前分支到 Gitee
git push gitee main

# 如果提示没有 main 分支，可能是 master
git push gitee master

# （可选）推送所有分支和标签
git push gitee --all
git push gitee --tags
```

### 步骤 4：启用 Gitee Pages

同方式 1 的步骤 3。

### 步骤 5：后续更新（双推送）

每次更新代码后：

```bash
# 提交更改
git add .
git commit -m "更新说明"

# 推送到 GitHub
git push origin main

# 推送到 Gitee
git push gitee main
```

**或使用一键部署脚本**：

```bash
chmod +x deploy-to-gitee.sh
./deploy-to-gitee.sh
```

脚本会询问是否同时推送到 GitHub，选择 `y` 即可同时推送。

---

## 🔧 配置 Git 别名（可选）

让双推送更简单：

```bash
# 配置别名：推送到所有远程仓库
git config --global alias.push-all '!git push origin && git push gitee'

# 使用别名
git add .
git commit -m "更新"
git push-all main
```

或者配置 `all` 远程仓库组：

```bash
# 添加 all 远程仓库组
git remote add all https://github.com/你的用户名/WordPractice.git
git remote set-url --add --push all https://github.com/你的用户名/WordPractice.git
git remote set-url --add --push all https://gitee.com/你的用户名/word-practice.git

# 一次性推送到所有仓库
git push all main
```

---

## 🔐 配置 SSH 密钥（推荐）

使用 SSH 方式可以避免每次推送都输入密码。

### 为 GitHub 配置 SSH

```bash
# 1. 生成 SSH 密钥
ssh-keygen -t rsa -C "your_email@example.com"

# 2. 查看公钥
cat ~/.ssh/id_rsa.pub

# 3. 复制公钥内容

# 4. 添加到 GitHub
# - 访问 https://github.com/settings/keys
# - 点击 "New SSH key"
# - 粘贴公钥，点击 "Add SSH key"

# 5. 测试连接
ssh -T git@github.com
```

### 为 Gitee 配置 SSH

```bash
# 1. 查看公钥（使用同一个密钥）
cat ~/.ssh/id_rsa.pub

# 2. 复制公钥内容

# 3. 添加到 Gitee
# - 访问 https://gitee.com/profile/sshkeys
# - 粘贴公钥，点击 "确定"

# 4. 测试连接
ssh -T git@gitee.com
```

### 修改远程仓库 URL 为 SSH

```bash
# 修改 GitHub（如果之前用的 HTTPS）
git remote set-url origin git@github.com:你的用户名/WordPractice.git

# 修改 Gitee
git remote set-url gitee git@gitee.com:你的用户名/word-practice.git

# 验证
git remote -v
```

---

## 🔄 自动同步 GitHub 到 Gitee（进阶）

### 使用 GitHub Actions（推荐）

创建 `.github/workflows/sync-to-gitee.yml`：

```yaml
name: Sync to Gitee

on:
  push:
    branches:
      - main

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Sync to Gitee
        uses: wearerequired/git-mirror-action@master
        env:
          SSH_PRIVATE_KEY: ${{ secrets.GITEE_PRIVATE_KEY }}
        with:
          source-repo: git@github.com:你的用户名/WordPractice.git
          destination-repo: git@gitee.com:你的用户名/word-practice.git
```

配置步骤：
1. 生成 SSH 密钥对（专门用于同步）
2. 公钥添加到 Gitee
3. 私钥添加到 GitHub Secrets（命名为 `GITEE_PRIVATE_KEY`）
4. 推送到 GitHub，自动触发同步

---

## 📊 两种方式总结

| 特性 | 方式 1：导入 | 方式 2：双远程 |
|------|-------------|---------------|
| 配置难度 | ⭐ 简单 | ⭐⭐ 中等 |
| 首次部署速度 | ⭐⭐⭐ 快 | ⭐⭐ 中等 |
| 后续更新 | 手动同步 | 自动推送 |
| 保持同步 | ⚠️ 需要手动 | ✅ 自动 |
| 推荐场景 | 快速演示 | 长期维护 |

## 💡 最佳实践建议

1. **首次部署**：使用方式 1 快速上线
2. **后续维护**：添加 Gitee 为远程仓库（方式 2）
3. **自动化**：配置 GitHub Actions 自动同步
4. **安全性**：使用 SSH 密钥而不是密码

## 🆘 常见问题

### 1. 推送到 Gitee 时提示权限错误

**解决**：
```bash
# 确认远程仓库 URL
git remote -v

# 如果是 HTTPS，输入 Gitee 账号密码
# 或改用 SSH 方式
git remote set-url gitee git@gitee.com:你的用户名/word-practice.git
```

### 2. GitHub 和 Gitee 代码不一致

**解决**：
```bash
# 强制推送到 Gitee（谨慎使用）
git push gitee main --force

# 或先拉取 Gitee 的更改
git pull gitee main
```

### 3. Gitee Pages 显示 404

**原因**：部署目录配置错误

**解决**：
1. 确认部署目录设置为 `proj`
2. 点击"更新"按钮
3. 等待 1-3 分钟

### 4. 更新代码后 Gitee Pages 没变化

**原因**：Gitee Pages 免费版需要手动更新

**解决**：
1. 访问仓库的 Gitee Pages 设置页面
2. 点击"更新"按钮
3. 清除浏览器缓存（Ctrl + F5）

---

## 📚 相关链接

- [GitHub 官方文档](https://docs.github.com)
- [Gitee Pages 官方文档](https://gitee.com/help/articles/4136)
- [Git 远程仓库管理](https://git-scm.com/book/zh/v2/Git-%E5%9F%BA%E7%A1%80-%E8%BF%9C%E7%A8%8B%E4%BB%93%E5%BA%93%E7%9A%84%E4%BD%BF%E7%94%A8)

---

**祝你部署顺利！🎉**

如有问题，欢迎提 Issue 或参考完整部署文档 `GITEE_PAGES_DEPLOY.md`。


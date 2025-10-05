#!/bin/bash
# Gitee Pages 部署脚本（支持 GitHub + Gitee 双推送）

echo "🚀 开始部署到 Gitee Pages..."

# 检查是否有 Gitee 远程仓库
if ! git remote | grep -q "gitee"; then
    echo "❌ 未找到 Gitee 远程仓库"
    echo ""
    echo "📋 有两种方式添加 Gitee 仓库："
    echo ""
    echo "方式 1：从 GitHub 导入到 Gitee（最简单）"
    echo "  1. 访问 https://gitee.com"
    echo "  2. 点击 '+' -> '从 GitHub/GitLab 导入仓库'"
    echo "  3. 选择此仓库并导入"
    echo "  4. 导入后执行："
    echo "     git remote add gitee https://gitee.com/你的用户名/仓库名.git"
    echo ""
    echo "方式 2：添加空仓库为远程仓库"
    echo "  1. 在 Gitee 创建空仓库（不要初始化）"
    echo "  2. 执行："
    echo "     git remote add gitee https://gitee.com/你的用户名/仓库名.git"
    echo "     git push gitee main"
    echo ""
    echo "或使用 SSH 方式（推荐）："
    echo "  git remote add gitee git@gitee.com:你的用户名/仓库名.git"
    exit 1
fi

# 显示当前分支
current_branch=$(git branch --show-current)
echo "📍 当前分支: $current_branch"

# 检查是否有未提交的更改
if ! git diff-index --quiet HEAD --; then
    echo "⚠️  检测到未提交的更改"
    read -p "是否提交并推送？(y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "📝 提交更改..."
        git add .
        read -p "请输入提交信息: " commit_msg
        git commit -m "$commit_msg"
    else
        echo "❌ 取消部署"
        exit 1
    fi
fi

# 询问是否同时推送到 GitHub
read -p "是否同时推送到 GitHub？(y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "📤 推送到 GitHub..."
    git push origin $current_branch
    echo "✅ 已推送到 GitHub"
fi

# 推送到 Gitee
echo "📤 推送到 Gitee..."
git push gitee $current_branch

echo ""
echo "✅ 代码已推送成功！"
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "📦 推送目标："
    echo "  ✅ GitHub (origin)"
    echo "  ✅ Gitee (gitee)"
    echo ""
fi
echo "📋 接下来的步骤："
echo "1. 访问你的 Gitee 仓库页面"
echo "2. 点击 '服务' -> 'Gitee Pages'"
echo "3. 选择分支: $current_branch"
echo "4. 选择部署目录: proj"
echo "5. 点击 '启动' 或 '更新' 按钮"
echo ""
echo "⏱️  部署通常需要 1-3 分钟"
echo "🌐 部署后访问地址: https://你的用户名.gitee.io/你的仓库名"
echo ""
echo "💡 提示: Gitee Pages 免费版每次更新代码后需要手动点击'更新'按钮"
echo "💡 GitHub 仓库地址: https://github.com/你的用户名/WordPractice"


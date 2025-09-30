#!/bin/bash
# Vercel 手动部署脚本

echo "🚀 开始手动部署到 Vercel..."

# 方法 1：使用 Vercel CLI（推荐）
if command -v vercel &> /dev/null; then
    echo "✅ 检测到 Vercel CLI"
    echo "📦 开始部署..."
    vercel --prod
else
    echo "⚠️  未安装 Vercel CLI"
    echo "请先安装：npm install -g vercel"
    echo "或访问 https://vercel.com/dashboard 手动部署"
fi

echo "✨ 完成！"

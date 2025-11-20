---
name: /git-commit-msg
id: git-commit-msg
category: Git
description: 生成 commit message 但不提交，方便审查和调整。
---

**目标**
基于当前的 Git 变更生成高质量的 commit message，但不实际执行提交，让用户可以审查和根据需要调整。

**执行步骤**

1. 检查 Git 状态
   - 运行 `git status` 查看当前变更
   - 运行 `git diff --cached` 查看已暂存的变更
   - 如果没有暂存的变更，运行 `git diff` 查看未暂存的变更

2. 分析变更内容
   - 识别变更的文件和类型（新增、修改、删除）
   - 理解变更的核心目的和影响范围
   - 注意是否有重要的功能添加、Bug 修复或重构

3. 生成 commit message
   - 遵循约定式提交（Conventional Commits）格式
   - 使用中文撰写（符合项目习惯）
   - 格式：`<type>(<scope>): <subject>`
   - Type 类型：
     * `feat`: 新功能
     * `fix`: Bug 修复
     * `docs`: 文档变更
     * `style`: 代码格式调整（不影响功能）
     * `refactor`: 重构（既不是新功能也不是 Bug 修复）
     * `perf`: 性能优化
     * `test`: 测试相关
     * `chore`: 构建过程或辅助工具变更
   - Subject 应该简洁明了，说明做了什么
   - 如果需要，添加详细的 body 说明变更细节

4. 展示生成的 commit message
   - 清晰地展示生成的 commit message
   - 说明这些变更的主要内容
   - 提供建议的提交命令供用户参考

**注意事项**
- 不要执行 `git commit` 命令
- 如果有未暂存的变更，提醒用户先执行 `git add`
- 如果工作区是干净的（没有变更），提示用户
- 确保 commit message 符合项目规范
- 在 Windows 环境下使用 Git Bash 处理中文字符


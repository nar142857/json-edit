#!/bin/bash

# 获取当前分支名
BRANCH=$(git symbolic-ref --short HEAD)
if [ -z "$BRANCH" ]; then
    BRANCH="main"  # 默认使用 main 分支
fi

# 先拉取远程更新
echo "拉取远程更新..."
git pull origin $BRANCH --rebase

# 检查是否有未提交的更改
if git diff-index --quiet HEAD --; then
    echo "没有需要提交的更改"
else
    # 添加所有更改
    git add .

    # 获取提交信息
    echo "请输入提交信息:"
    read COMMIT_MSG

    if [ -z "$COMMIT_MSG" ]; then
        COMMIT_MSG="Update: $(date '+%Y-%m-%d %H:%M:%S')"
    fi

    # 提交更改
    git commit -m "$COMMIT_MSG"
fi

# 推送到所有远程仓库
echo "推送到远程仓库..."
git push origin $BRANCH

echo "推送完成！" 
#!/bin/bash

# 获取当前分支名
BRANCH=$(git symbolic-ref --short HEAD)
if [ -z "$BRANCH" ]; then
    BRANCH="main"  # 默认使用 main 分支
fi

# 检查是否有未提交的更改
if ! git diff-index --quiet HEAD --; then
    # 有未提交的更改，先提交
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

# 尝试正常推送
echo "推送到远程仓库..."
if git push origin $BRANCH; then
    echo "推送成功！"
else
    # 推送失败，可能是远程有更新
    echo "正常推送失败，尝试拉取远程更新..."
    
    # 尝试拉取并变基
    if git pull origin $BRANCH --rebase; then
        echo "拉取成功，重新推送..."
        if git push origin $BRANCH; then
            echo "推送成功！"
        else
            echo "推送失败，尝试强制推送..."
            read -p "是否强制推送？这可能会覆盖远程更改 [y/N] " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                if git push origin $BRANCH -f; then
                    echo "强制推送成功！"
                else
                    echo "强制推送失败！"
                    exit 1
                fi
            else
                echo "取消推送"
                exit 1
            fi
        fi
    else
        echo "拉取失败！请手动解决冲突"
        exit 1
    fi
fi 
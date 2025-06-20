#!/bin/bash

# 自動プッシュスクリプト
# 使用方法: ./autopush.sh [カスタムメッセージ]

# 変更があるかチェック
if git diff --quiet && git diff --staged --quiet; then
    echo "📝 変更がありません。プッシュする必要はありません。"
    exit 0
fi

# カスタムメッセージが指定されていない場合、自動生成
if [ -z "$1" ]; then
    TIMESTAMP=$(date '+%Y-%m-%d %H:%M')
    COMMIT_MSG="🔄 自動更新 - $TIMESTAMP"
else
    COMMIT_MSG="$1"
fi

echo "📦 変更をコミット中: $COMMIT_MSG"

# 全ての変更をステージング
git add -A

# コミット
git commit -m "$COMMIT_MSG"

# プッシュ
echo "🚀 リモートリポジトリにプッシュ中..."
git push

echo "✅ 自動プッシュ完了！"

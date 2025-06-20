#!/bin/bash

# 🚀 Git Auto Push - 汎用自動プッシュツール
# 使用方法: ./autopush.sh [カスタムメッセージ]
# エイリアス: ap [カスタムメッセージ]

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 絵文字定義
ROCKET="��"
CHECK="✅"
PACKAGE="📦"
WARNING="⚠️"
INFO="ℹ️"
PENCIL="📝"

echo -e "${CYAN}${ROCKET} Git Auto Push Tool${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Git リポジトリかチェック
if [ ! -d ".git" ]; then
    echo -e "${RED}${WARNING} エラー: Git リポジトリではありません${NC}"
    echo -e "${YELLOW}${INFO} 'git init' を実行してください${NC}"
    exit 1
fi

# 変更があるかチェック
if git diff --quiet && git diff --staged --quiet; then
    echo -e "${YELLOW}${PENCIL} 変更がありません。プッシュする必要はありません。${NC}"
    exit 0
fi

# リモートが設定されているかチェック
if ! git remote get-url origin &>/dev/null; then
    echo -e "${RED}${WARNING} エラー: リモートリポジトリが設定されていません${NC}"
    echo -e "${YELLOW}${INFO} 'git remote add origin <URL>' を実行してください${NC}"
    exit 1
fi

# 変更されたファイルを表示
echo -e "${BLUE}${INFO} 変更されたファイル:${NC}"
git status --porcelain | while read line; do
    echo -e "  ${GREEN}${line}${NC}"
done
echo ""

# カスタムメッセージが指定されていない場合、自動生成
if [ -z "$1" ]; then
    TIMESTAMP=$(date '+%Y-%m-%d %H:%M')
    COMMIT_MSG="🔄 自動更新 - $TIMESTAMP"
else
    COMMIT_MSG="$1"
fi

echo -e "${PACKAGE} ${CYAN}コミットメッセージ:${NC} ${COMMIT_MSG}"

# 全ての変更をステージング
echo -e "${BLUE}${INFO} 変更をステージング中...${NC}"
git add -A

# コミット
echo -e "${BLUE}${INFO} コミット中...${NC}"
if git commit -m "$COMMIT_MSG"; then
    echo -e "${GREEN}${CHECK} コミット完了${NC}"
else
    echo -e "${RED}${WARNING} コミットに失敗しました${NC}"
    exit 1
fi

# プッシュ
echo -e "${BLUE}${INFO} リモートリポジトリにプッシュ中...${NC}"
if git push; then
    echo ""
    echo -e "${GREEN}${CHECK}${CHECK}${CHECK} 自動プッシュ完了！${CHECK}${CHECK}${CHECK}${NC}"
    echo -e "${PURPLE}Repository: $(git remote get-url origin)${NC}"
    echo -e "${PURPLE}Branch: $(git branch --show-current)${NC}"
    echo -e "${PURPLE}Commit: $(git rev-parse --short HEAD)${NC}"
else
    echo -e "${RED}${WARNING} プッシュに失敗しました${NC}"
    exit 1
fi

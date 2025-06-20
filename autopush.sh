#!/bin/bash

# 🚀 Git Auto Push - 汎用自動プッシュツール
# 使用方法: ./autopush.sh [カスタムメッセージ]
# エイリアス: ap [カスタムメッセージ]
# セットアップ: ./autopush.sh --setup

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 絵文字定義
ROCKET="🚀"
CHECK="✅"
PACKAGE="📦"
WARNING="⚠️"
INFO="ℹ️"
PENCIL="📝"
SETUP="⚙️"

# セットアップモードのチェック
if [ "$1" = "--setup" ] || [ "$1" = "-s" ]; then
    echo -e "${CYAN}${SETUP} Git Auto Push セットアップ${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    # 現在のスクリプトのパスを取得
    SCRIPT_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/$(basename "${BASH_SOURCE[0]}")"
    
    # シェル設定ファイルを特定
    if [ -n "$ZSH_VERSION" ]; then
        SHELL_RC="$HOME/.zshrc"
        SHELL_NAME="Zsh"
    elif [ -n "$BASH_VERSION" ]; then
        SHELL_RC="$HOME/.bashrc"
        SHELL_NAME="Bash"
    else
        SHELL_RC="$HOME/.profile"
        SHELL_NAME="Shell"
    fi

    echo -e "${INFO} ${SHELL_NAME}にエイリアスを設定します"
    echo -e "${INFO} 設定ファイル: ${SHELL_RC}"
    echo -e "${INFO} スクリプトパス: ${SCRIPT_PATH}"
    
    # 既存のエイリアスをチェック
    if [ -f "$SHELL_RC" ] && grep -q "alias ap=" "$SHELL_RC"; then
        echo -e "${YELLOW}${WARNING} 既存の 'ap' エイリアスが見つかりました${NC}"
        echo -e "${INFO} 既存の設定を更新します"
        
        # 既存のap関連行を削除（バックアップを取る）
        if [ -f "$SHELL_RC" ]; then
            cp "$SHELL_RC" "${SHELL_RC}.autopush.backup"
            grep -v "alias ap=" "$SHELL_RC" > "${SHELL_RC}.tmp" && mv "${SHELL_RC}.tmp" "$SHELL_RC"
        fi
    fi
    
    # エイリアスを追加
    echo "" >> "$SHELL_RC"
    echo "# 🚀 Git Auto Push エイリアス" >> "$SHELL_RC"
    echo "alias ap='\"$SCRIPT_PATH\"'" >> "$SHELL_RC"
    
    echo -e "${GREEN}${CHECK} エイリアスを設定しました！${NC}"
    echo ""
    echo -e "${PURPLE}次の手順で使用を開始してください:${NC}"
    echo -e "${BLUE}1.${NC} シェルを再読み込み: ${YELLOW}source $SHELL_RC${NC}"
    echo -e "${BLUE}2.${NC} または新しいターミナルを開く"
    echo -e "${BLUE}3.${NC} ${GREEN}ap${NC} コマンドで自動プッシュ実行！"
    echo ""
    echo -e "${INFO} 使用方法:"
    echo -e "  ${GREEN}ap${NC}                 # 自動メッセージでコミット&プッシュ"
    echo -e "  ${GREEN}ap \"修正完了\"${NC}      # カスタムメッセージでコミット&プッシュ"
    
    exit 0
fi

echo -e "${CYAN}${ROCKET} Git Auto Push Tool${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# apコマンドが設定されていない場合のヒント表示
if [ "$(basename "$0")" = "autopush.sh" ] && [ -t 1 ]; then
    echo -e "${YELLOW}${INFO} ヒント: ${GREEN}./autopush.sh --setup${NC} を実行すると ${GREEN}ap${NC} コマンドが使えるようになります${NC}"
    echo ""
fi

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

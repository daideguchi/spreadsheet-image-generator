#!/bin/bash

# 🚀 Git Auto Push - ワンコマンド インストーラー
# 使用方法: curl -s https://raw.githubusercontent.com/daideguchi/git-autopush/main/install.sh | bash

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
WARNING="⚠️"
INFO="ℹ️"
DOWNLOAD="📥"

echo -e "${CYAN}${ROCKET} Git Auto Push インストーラー${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Git リポジトリかチェック
if [ ! -d ".git" ]; then
    echo -e "${RED}${WARNING} エラー: Git リポジトリではありません${NC}"
    echo -e "${YELLOW}${INFO} 'git init' を実行してからもう一度お試しください${NC}"
    exit 1
fi

# autopush.sh をダウンロード
echo -e "${BLUE}${DOWNLOAD} autopush.sh をダウンロード中...${NC}"
if curl -s -o autopush.sh https://raw.githubusercontent.com/daideguchi/git-autopush/main/autopush.sh; then
    echo -e "${GREEN}${CHECK} autopush.sh ダウンロード完了${NC}"
else
    echo -e "${RED}${WARNING} autopush.sh のダウンロードに失敗しました${NC}"
    exit 1
fi

# 実行権限を付与
chmod +x autopush.sh
echo -e "${GREEN}${CHECK} 実行権限を付与しました${NC}"

# エイリアス設定（既存のエイリアスがあるかチェック）
SHELL_RC=""
if [ -n "$ZSH_VERSION" ]; then
    SHELL_RC="$HOME/.zshrc"
elif [ -n "$BASH_VERSION" ]; then
    SHELL_RC="$HOME/.bashrc"
else
    SHELL_RC="$HOME/.zshrc"  # デフォルト
fi

# エイリアスが既に存在するかチェック
if ! grep -q "alias ap=" "$SHELL_RC" 2>/dev/null; then
    echo "" >> "$SHELL_RC"
    echo "# Git Auto Push エイリアス" >> "$SHELL_RC"
    echo "alias ap='./autopush.sh'" >> "$SHELL_RC"
    echo "alias autopush='./autopush.sh'" >> "$SHELL_RC"
    echo -e "${GREEN}${CHECK} エイリアスを $SHELL_RC に追加しました${NC}"
else
    echo -e "${YELLOW}${INFO} エイリアスは既に設定されています${NC}"
fi

# .gitignore にスクリプトを追加しない（プロジェクトに含める）
echo ""
echo -e "${GREEN}${CHECK}${CHECK}${CHECK} インストール完了！${CHECK}${CHECK}${CHECK}${NC}"
echo ""
echo -e "${CYAN}使用方法:${NC}"
echo -e "  ${YELLOW}ap${NC}                  # 自動メッセージでプッシュ"
echo -e "  ${YELLOW}ap \"メッセージ\"${NC}      # カスタムメッセージでプッシュ"
echo ""
echo -e "${PURPLE}新しいターミナルを開くか、以下を実行してエイリアスを有効化:${NC}"
echo -e "  ${YELLOW}source $SHELL_RC${NC}"
echo ""
echo -e "${BLUE}${INFO} 今すぐテスト: ${YELLOW}./autopush.sh \"🎉 Git Auto Push セットアップ完了\"${NC}" 
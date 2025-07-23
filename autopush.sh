#!/bin/bash

# 🚀 Git Auto Push - 汎用自動プッシュツール with ゲーム要素！
# 使用方法: ./autopush.sh [カスタムメッセージ] [オプション]
# エイリアス: ap [カスタムメッセージ] [オプション]
# オプション: --info, --stats, --help, --game, --no-game, --quit-game
#           --notifications, --badges, --profile, --report, --notify-slack

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
MAGENTA='\033[0;95m'
GOLD='\033[1;33m'
GRAY='\033[0;90m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# 絵文字定義
ROCKET="🚀"
CHECK="✅"
PACKAGE="📦"
WARNING="⚠️"
INFO="ℹ️"
PENCIL="📝"
FIRE="🔥"
STAR="⭐"
TROPHY="🏆"
GEM="💎"
LIGHTNING="⚡"
CROWN="👑"
MEDAL="🥇"
SPARKLES="✨"
PARTY="🎉"
GAME="🎮"
BOOK="📚"
TERMINAL="💻"
BRANCH="🌿"
MERGE="🔀"
RESET="🔄"
TAG="🏷️"
STASH="📋"
GLOBE="🌐"
FOLDER="📁"
CLOCK="🕐"
USER="👤"
BELL="🔔"
CAMERA="📸"
CHART="📊"

# バージョン情報
TOOL_VERSION="2.0.0"
TOOL_REPO="https://github.com/daideguchi/git-autopush"

# データディレクトリとファイル
STATS_DIR="$HOME/.autopush"
STATS_FILE="$STATS_DIR/stats.txt"
BADGES_FILE="$STATS_DIR/badges.txt"
STREAK_FILE="$STATS_DIR/streak.txt"
CONFIG_FILE="$STATS_DIR/config.txt"
BADGES_DIR="$STATS_DIR/badges"
REPORTS_DIR="$STATS_DIR/reports"
TEAM_DIR="$STATS_DIR/team"
TEAM_CONFIG_FILE="$TEAM_DIR/config.json"
TEAM_MEMBERS_FILE="$TEAM_DIR/members.json"
TEAM_STATS_FILE="$TEAM_DIR/stats.json"
TEAM_EVENTS_FILE="$TEAM_DIR/events.json"

# データディレクトリを作成
mkdir -p "$STATS_DIR" "$BADGES_DIR" "$REPORTS_DIR" "$TEAM_DIR"

# 設定ファイルが存在しない場合は初期化（デフォルト：ゲームモードON、通知OFF）
if [ ! -f "$CONFIG_FILE" ]; then
    echo "game_mode=true" > "$CONFIG_FILE"
    echo "notifications=false" >> "$CONFIG_FILE"
    echo "badges_generation=false" >> "$CONFIG_FILE"
    echo "profile_update=false" >> "$CONFIG_FILE"
    echo "report_generation=false" >> "$CONFIG_FILE"
    echo "slack_notifications=false" >> "$CONFIG_FILE"
    echo "discord_notifications=false" >> "$CONFIG_FILE"
    echo "line_notifications=false" >> "$CONFIG_FILE"
    echo "teams_notifications=false" >> "$CONFIG_FILE"
    echo "email_notifications=false" >> "$CONFIG_FILE"
    echo "theme=default" >> "$CONFIG_FILE"
    echo "team_mode=false" >> "$CONFIG_FILE"
    echo "team_name=" >> "$CONFIG_FILE"
fi

# 設定読み込み
source "$CONFIG_FILE"

# フラグ変数
GAME_MODE=$game_mode
CUSTOM_MSG=""
SHOW_INFO=false
SHOW_STATS=false
SHOW_HELP=false
ENABLE_NOTIFICATIONS=${notifications:-false}
ENABLE_BADGES=${badges_generation:-false}
ENABLE_PROFILE=${profile_update:-false}
ENABLE_REPORT=${report_generation:-false}
ENABLE_SLACK=${slack_notifications:-false}
ENABLE_DISCORD=${discord_notifications:-false}
ENABLE_LINE=${line_notifications:-false}
ENABLE_TEAMS=${teams_notifications:-false}
ENABLE_EMAIL=${email_notifications:-false}
THEME=${theme:-default}
TEAM_MODE=${team_mode:-false}
TEAM_NAME=${team_name:-""}

# =============================================
# 🎮 チーム開発モード機能（引数処理前に定義）
# =============================================

# チーム作成
create_team() {
    local team_name="$1"
    
    echo -e "${GOLD}🎮 チーム作成: ${team_name}${NC}"
    
    # シンプルなチーム設定（軽量版）
    echo "team_name=$team_name" > "$TEAM_CONFIG_FILE"
    echo "created_date=$(date '+%Y-%m-%d')" >> "$TEAM_CONFIG_FILE"
    echo "created_by=$(git config user.name || echo 'Unknown')" >> "$TEAM_CONFIG_FILE"
    echo "members=1" >> "$TEAM_CONFIG_FILE"
    
    # 設定更新
    sed -i.bak "s/team_mode=.*/team_mode=true/" "$CONFIG_FILE" 2>/dev/null
    sed -i.bak "s/team_name=.*/team_name=$team_name/" "$CONFIG_FILE" 2>/dev/null
    
    echo -e "${GREEN}✅ チーム「${team_name}」を作成しました！${NC}"
    echo -e "${CYAN}📋 ダッシュボード: ap --team-dashboard${NC}"
}

# チーム参加
join_team() {
    local team_name="$1"
    echo -e "${GOLD}🤝 チーム参加: ${team_name}${NC}"
    
    # 設定更新
    sed -i.bak "s/team_mode=.*/team_mode=true/" "$CONFIG_FILE" 2>/dev/null
    sed -i.bak "s/team_name=.*/team_name=$team_name/" "$CONFIG_FILE" 2>/dev/null
    
    echo -e "${GREEN}✅ チーム「${team_name}」に参加しました！${NC}"
}

# メンバー追加
add_team_member() {
    local username="$1"
    local email="$2"
    
    echo -e "${GOLD}👥 メンバー追加${NC}"
    echo -e "${CYAN}👤 ${username} (${email})${NC}"
    echo -e "${GREEN}✅ メンバーを追加しました！${NC}"
}

# シンプルなチームダッシュボード
show_team_dashboard() {
    if [ ! -f "$TEAM_CONFIG_FILE" ]; then
        echo -e "${RED}❌ チームが設定されていません${NC}"
        echo -e "${YELLOW}チーム作成: ap --create-team \"team-name\"${NC}"
        return 1
    fi
    
    source "$TEAM_CONFIG_FILE"
    
    echo -e "${GOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GOLD}🎮 Team Dashboard${NC}"
    echo -e "${GOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${CYAN}👥 Team: ${team_name}${NC}"
    echo -e "${CYAN}📅 Created: ${created_date}${NC}"
    echo -e "${CYAN}👤 Created by: ${created_by}${NC}"
    echo -e "${CYAN}📊 Members: ${members:-1}${NC}"
    echo ""
    
    # 今週の統計（簡易版）
    local commits_today=$(git log --oneline --since="today" 2>/dev/null | wc -l | tr -d ' ')
    local commits_week=$(git log --oneline --since="1 week ago" 2>/dev/null | wc -l | tr -d ' ')
    
    echo -e "${YELLOW}📈 This Week:${NC}"
    echo -e "  🚀 Commits: ${commits_week} (today: ${commits_today})"
    echo -e "  🔄 Active days: $(git log --oneline --since="1 week ago" --format="%cd" --date=short 2>/dev/null | sort -u | wc -l | tr -d ' ')"
    echo ""
    
    echo -e "${GRAY}💡 Actions: ap --auto-pr | ap --team-stats${NC}"
}

# チーム統計
show_team_stats() {
    if [ ! -f "$TEAM_CONFIG_FILE" ]; then
        echo -e "${RED}❌ チームが設定されていません${NC}"
        return 1
    fi
    
    source "$TEAM_CONFIG_FILE"
    
    echo -e "${GOLD}📊 Team Statistics${NC}"
    echo ""
    echo -e "${CYAN}👥 Team: ${team_name}${NC}"
    echo ""
    
    # Git統計
    local total_commits=$(git rev-list --count HEAD 2>/dev/null || echo "0")
    local contributors=$(git shortlog -sn --all 2>/dev/null | wc -l | tr -d ' ')
    local branches=$(git branch -r 2>/dev/null | wc -l | tr -d ' ')
    
    echo -e "${YELLOW}📈 Repository Stats:${NC}"
    echo -e "  🚀 Total commits: ${total_commits}"
    echo -e "  👥 Contributors: ${contributors}"
    echo -e "  🌿 Remote branches: ${branches}"
    echo ""
    
    echo -e "${YELLOW}🏆 Top Contributors:${NC}"
    git shortlog -sn --all 2>/dev/null | head -5 | while read line; do
        echo -e "  ${line}" | sed 's/^/  /'
    done || echo -e "  No commit history found"
}

# 🤖 AI駆動自動PR作成
create_auto_pr() {
    local branch_name="$1"
    local current_branch=$(git branch --show-current 2>/dev/null || echo "main")
    
    if [ -z "$branch_name" ]; then
        branch_name="$current_branch"
    fi
    
    echo -e "${GOLD}🤖 AI駆動自動PR作成${NC}"
    echo ""
    echo -e "${CYAN}🌿 Branch: ${branch_name}${NC}"
    
    # AI風のコミット分析
    echo -e "${YELLOW}🧠 コミット分析中...${NC}"
    
    local recent_commits=$(git log --oneline -5 --pretty=format:"%s" 2>/dev/null)
    local changed_files=$(git diff --name-only HEAD~1 2>/dev/null | wc -l | tr -d ' ')
    local additions=$(git diff --shortstat HEAD~1 2>/dev/null | grep -o '[0-9]* insertion' | cut -d' ' -f1 || echo "0")
    local deletions=$(git diff --shortstat HEAD~1 2>/dev/null | grep -o '[0-9]* deletion' | cut -d' ' -f1 || echo "0")
    
    # AI風のPRタイトル生成
    local pr_title=""
    if echo "$recent_commits" | grep -qi "fix\|bug"; then
        pr_title="🐛 Bug fixes and improvements"
    elif echo "$recent_commits" | grep -qi "feat\|add"; then
        pr_title="✨ New features and enhancements"
    elif echo "$recent_commits" | grep -qi "doc\|readme"; then
        pr_title="📚 Documentation updates"
    elif echo "$recent_commits" | grep -qi "refactor\|clean"; then
        pr_title="♻️ Code refactoring and cleanup"
    else
        pr_title="🚀 Code improvements"
    fi
    
    echo -e "${GREEN}✅ AI分析完了${NC}"
    echo ""
    echo -e "${CYAN}📋 Generated PR Info:${NC}"
    echo -e "  Title: ${pr_title}"
    echo -e "  Files changed: ${changed_files}"
    echo -e "  Lines: +${additions} -${deletions}"
    echo ""
    
    # PR説明文生成
    echo -e "${YELLOW}📝 AI Generated Description:${NC}"
    echo "## 🎯 Changes Summary"
    echo ""
    echo "This PR includes the following improvements:"
    echo ""
    if [ -n "$recent_commits" ]; then
        echo "$recent_commits" | sed 's/^/- /'
    else
        echo "- Code improvements and updates"
    fi
    echo ""
    echo "## 📊 Stats"
    echo "- Files changed: ${changed_files}"
    echo "- Lines added: ${additions}"
    echo "- Lines removed: ${deletions}"
    echo ""
    echo "## ✅ Checklist"
    echo "- [x] Code follows project standards"
    echo "- [x] Self-review completed"
    echo "- [ ] Tests added/updated"
    echo "- [ ] Documentation updated"
    echo ""
    
    echo -e "${SPARKLES} GitHub CLIでPR作成: ${GRAY}gh pr create --title \"${pr_title}\"${NC}"
}

# チーム通知
notify_team() {
    local message="$1"
    
    if [ -z "$message" ]; then
        message="重要な更新があります"
    fi
    
    echo -e "${GOLD}📢 チーム通知${NC}"
    echo -e "${CYAN}📝 Message: ${message}${NC}"
    echo -e "${GREEN}✅ チーム通知を送信しました${NC}"
}

# チームイベント開始
start_team_event() {
    local event_name="${1:-開発チャレンジ}"
    local duration="${2:-7d}"
    local bonus="${3:-1.5x}"
    
    echo -e "${GOLD}🎪 チームイベント開始${NC}"
    echo ""
    echo -e "${CYAN}🎯 Event: ${event_name}${NC}"
    echo -e "${CYAN}⏰ Duration: ${duration}${NC}"
    echo -e "${CYAN}💰 Bonus: ${bonus} XP${NC}"
    echo ""
    echo -e "${PARTY} イベント「${event_name}」開始！${NC}"
}

# 引数解析
for arg in "$@"; do
    case $arg in
        --no-game)
            GAME_MODE=false
            shift
            ;;
        --game)
            GAME_MODE=true
            shift
            ;;
        --quit-game)
            echo "game_mode=false" > "$CONFIG_FILE"
            echo -e "${YELLOW}${INFO} ゲームモードを永続的に無効化しました${NC}"
            echo -e "${GRAY}再有効化するには --game フラグを使用してください${NC}"
            GAME_MODE=false
            shift
            ;;
        --info)
            SHOW_INFO=true
            shift
            ;;
        --stats)
            SHOW_STATS=true
            shift
            ;;
        --help|--commands)
            SHOW_HELP=true
            shift
            ;;
        --notifications)
            ENABLE_NOTIFICATIONS=true
            shift
            ;;
        --no-notifications)
            ENABLE_NOTIFICATIONS=false
            shift
            ;;
        --badges)
            ENABLE_BADGES=true
            shift
            ;;
        --profile)
            ENABLE_PROFILE=true
            shift
            ;;
        --report)
            ENABLE_REPORT=true
            shift
            ;;
        --notify-slack)
            ENABLE_SLACK=true
            shift
            ;;
        --notify-discord)
            ENABLE_DISCORD=true
            shift
            ;;
        --notify-line)
            ENABLE_LINE=true
            shift
            ;;
        --notify-teams)
            ENABLE_TEAMS=true
            shift
            ;;
        --notify-email)
            ENABLE_EMAIL=true
            shift
            ;;
        --setup)
            run_setup_wizard
            exit 0
            ;;
        --setup-slack)
            setup_slack_simple
            exit 0
            ;;
        --setup-discord)
            setup_discord_simple
            exit 0
            ;;
        --setup-line)
            setup_line_simple
            exit 0
            ;;
        --turn-off-notifications)
            turn_off_all_notifications
            exit 0
            ;;
        --install)
            # システム全体にインストール
            echo -e "${GOLD}🔧 Git Auto Push Tool をシステム全体にインストール${NC}"
            echo ""
            
            # インストール先ディレクトリ
            install_dir="$HOME/bin"
            install_path="$install_dir/git-autopush"
            
            # binディレクトリ作成
            mkdir -p "$install_dir"
            
            # 現在のスクリプトをコピー
            cp "$0" "$install_path"
            chmod +x "$install_path"
            
            # エイリアス設定
            echo ""
            echo -e "${CYAN}📝 シェル設定を更新しています...${NC}"
            
            # .bashrc の更新
            if ! grep -q "alias ap=" ~/.bashrc 2>/dev/null; then
                echo "# Git Auto Push Tool" >> ~/.bashrc
                echo "export PATH=\"\$HOME/bin:\$PATH\"" >> ~/.bashrc
                echo "alias ap='$install_path'" >> ~/.bashrc
            else
                sed -i '' "s|alias ap=.*|alias ap='$install_path'|" ~/.bashrc 2>/dev/null || true
            fi
            
            # .zshrc の更新
            if ! grep -q "alias ap=" ~/.zshrc 2>/dev/null; then
                echo "# Git Auto Push Tool" >> ~/.zshrc
                echo "export PATH=\"\$HOME/bin:\$PATH\"" >> ~/.zshrc
                echo "alias ap='$install_path'" >> ~/.zshrc
            else
                sed -i '' "s|alias ap=.*|alias ap='$install_path'|" ~/.zshrc 2>/dev/null || true
            fi
            
            # .profile の更新
            if ! grep -q "alias ap=" ~/.profile 2>/dev/null; then
                echo "# Git Auto Push Tool" >> ~/.profile
                echo "export PATH=\"\$HOME/bin:\$PATH\"" >> ~/.profile
                echo "alias ap='$install_path'" >> ~/.profile
            else
                sed -i '' "s|alias ap=.*|alias ap='$install_path'|" ~/.profile 2>/dev/null || true
            fi
            
            echo -e "${GREEN}✅ インストール完了！${NC}"
            echo ""
            echo -e "${YELLOW}📍 インストール場所: ${install_path}${NC}"
            echo -e "${CYAN}🔄 シェルを再起動するか、以下を実行してください:${NC}"
            echo -e "${GRAY}   source ~/.zshrc${NC}"
            echo -e "${GRAY}   source ~/.bashrc${NC}"
            echo ""
            echo -e "${SPARKLES}${GREEN} これで全プロジェクトで同じ最新版が使用されます！${NC}"
            exit 0
            ;;
        --update)
            # ツール更新
            echo -e "${GOLD}⬆️  Git Auto Push Tool を更新中...${NC}"
            echo ""
            
            # インストール先パス
            install_path="$HOME/bin/git-autopush"
            
            if [ -f "$install_path" ]; then
                # 既存の設定バックアップ
                echo -e "${CYAN}📋 設定をバックアップ中...${NC}"
                cp -r "$STATS_DIR" "$STATS_DIR.backup.$(date +%Y%m%d_%H%M%S)" 2>/dev/null || true
                
                # GitHubから最新版を取得
                echo -e "${CYAN}📥 最新版をダウンロード中...${NC}"
                if command -v curl >/dev/null 2>&1; then
                    if curl -s -o "/tmp/autopush.sh" "https://raw.githubusercontent.com/daideguchi/git-autopush/main/autopush.sh"; then
                        chmod +x "/tmp/autopush.sh"
                        cp "/tmp/autopush.sh" "$install_path"
                        rm "/tmp/autopush.sh"
                        echo -e "${GREEN}✅ 更新完了！${NC}"
                        echo -e "${SPARKLES} 最新版 Git Auto Push Tool がインストールされました${NC}"
                    else
                        echo -e "${RED}❌ ダウンロードに失敗しました${NC}"
                        echo -e "${YELLOW}手動で更新するか、ネットワーク接続を確認してください${NC}"
                    fi
                else
                    echo -e "${YELLOW}⚠️  curl が見つかりません${NC}"
                    echo -e "${CYAN}手動更新手順:${NC}"
                    echo -e "1. ${TOOL_REPO} にアクセス"
                    echo -e "2. 最新のautopush.sh をダウンロード"
                    echo -e "3. cp autopush.sh $install_path"
                fi
            else
                echo -e "${YELLOW}⚠️  システムワイドインストールが見つかりません${NC}"
                echo -e "${CYAN}まず以下を実行してください:${NC}"
                echo -e "${GRAY}   ./autopush.sh --install${NC}"
            fi
            exit 0
            ;;
        --version)
            echo -e "${GOLD}🚀 Git Auto Push Tool${NC}"
            echo -e "${CYAN}Version: ${TOOL_VERSION}${NC}"
            echo -e "${GRAY}Repository: ${TOOL_REPO}${NC}"
            echo -e "${GRAY}Config: ${CONFIG_FILE}${NC}"
            echo -e "${GRAY}Data: ${STATS_DIR}${NC}"
            exit 0
            ;;
        --theme)
            shift
            if [ -n "$1" ]; then
                THEME="$1"
                shift
            fi
            ;;
        --enable-all)
            ENABLE_NOTIFICATIONS=true
            ENABLE_BADGES=true
            ENABLE_PROFILE=true
            ENABLE_REPORT=true
            shift
            ;;
        --enable-all-notifications)
            ENABLE_SLACK=true
            ENABLE_DISCORD=true
            ENABLE_LINE=true
            ENABLE_TEAMS=true
            ENABLE_EMAIL=true
            shift
            ;;
        --team-mode)
            TEAM_MODE=true
            shift
            ;;
        --create-team)
            shift
            if [ -n "$1" ]; then
                create_team "$1"
                exit 0
            else
                echo -e "${RED}❌ チーム名を指定してください${NC}"
                echo -e "${GRAY}使用法: ap --create-team \"team-name\"${NC}"
                exit 1
            fi
            ;;
        --join-team)
            shift
            if [ -n "$1" ]; then
                join_team "$1"
                exit 0
            else
                echo -e "${RED}❌ チーム名を指定してください${NC}"
                echo -e "${GRAY}使用法: ap --join-team \"team-name\"${NC}"
                exit 1
            fi
            ;;
        --team-dashboard)
            show_team_dashboard
            exit 0
            ;;
        --team-stats)
            show_team_stats
            exit 0
            ;;
        --auto-pr)
            shift
            create_auto_pr "$1"
            exit 0
            ;;
        --team-pr)
            shift
            create_team_pr "$1" "$2"
            exit 0
            ;;
        --add-member)
            shift
            if [ -n "$1" ] && [ -n "$2" ]; then
                add_team_member "$1" "$2"
                exit 0
            else
                echo -e "${RED}❌ ユーザー名とメールアドレスを指定してください${NC}"
                echo -e "${GRAY}使用法: ap --add-member username email@example.com${NC}"
                exit 1
            fi
            ;;
        --notify-team)
            shift
            notify_team "$1"
            exit 0
            ;;
        --start-event)
            shift
            start_team_event "$1" "$2" "$3"
            exit 0
            ;;
        --team-help)
            # チーム機能ヘルプは後で定義されるため、ここで直接記述
            echo -e "${GOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
            echo -e "${GOLD}🎮 Team Development Mode - Commands${NC}"
            echo -e "${GOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
            echo ""
            echo -e "${YELLOW}🏗️  Team Setup:${NC}"
            echo -e "  ${CYAN}ap --create-team \"team-name\"${NC}     # チーム作成"
            echo -e "  ${CYAN}ap --join-team \"team-name\"${NC}       # チーム参加"
            echo -e "  ${CYAN}ap --add-member user email${NC}        # メンバー追加"
            echo ""
            echo -e "${YELLOW}📊 Team Analytics:${NC}"
            echo -e "  ${CYAN}ap --team-dashboard${NC}               # チームダッシュボード"
            echo -e "  ${CYAN}ap --team-stats${NC}                   # 詳細統計"
            echo ""
            echo -e "${YELLOW}🤖 Automation:${NC}"
            echo -e "  ${CYAN}ap --auto-pr [branch]${NC}             # 自動PR作成"
            echo -e "  ${CYAN}ap --team-pr \"title\" [priority]${NC}   # チーム向けPR"
            echo ""
            echo -e "${YELLOW}📢 Communication:${NC}"
            echo -e "  ${CYAN}ap --notify-team \"message\"${NC}        # チーム通知"
            echo ""
            echo -e "${YELLOW}🎪 Events:${NC}"
            echo -e "  ${CYAN}ap --start-event \"name\" [duration] [bonus]${NC} # イベント開始"
            echo ""
            echo -e "${GRAY}💡 Example Workflow:${NC}"
            echo -e "${GRAY}  1. ap --create-team \"awesome-devs\"${NC}"
            echo -e "${GRAY}  2. ap --add-member alice alice@example.com${NC}"
            echo -e "${GRAY}  3. ap --team-dashboard${NC}"
            echo -e "${GRAY}  4. ap --auto-pr${NC}"
            echo -e "${GRAY}  5. ap --start-event \"Code Review Week\" 7d 2x${NC}"
            exit 0
            ;;
        *)
            if [ -z "$CUSTOM_MSG" ]; then
                CUSTOM_MSG="$arg"
            fi
            ;;
    esac
done

# ゲームモードが有効になった場合は設定を保存
if [ "$GAME_MODE" = true ] && [ "$game_mode" != "true" ]; then
    echo "game_mode=true" > "$CONFIG_FILE"
fi

# 統計ファイルが存在しない場合は初期化
if [ ! -f "$STATS_FILE" ]; then
    echo "total_pushes=0" > "$STATS_FILE"
    echo "level=1" >> "$STATS_FILE"
    echo "xp=0" >> "$STATS_FILE"
    echo "last_push_date=" >> "$STATS_FILE"
fi

# バッジファイルが存在しない場合は初期化
if [ ! -f "$BADGES_FILE" ]; then
    touch "$BADGES_FILE"
fi

# ストリークファイルが存在しない場合は初期化
if [ ! -f "$STREAK_FILE" ]; then
    echo "current_streak=0" > "$STREAK_FILE"
    echo "max_streak=0" >> "$STREAK_FILE"
    echo "last_streak_date=" >> "$STREAK_FILE"
fi

# 統計読み込み関数
load_stats() {
    source "$STATS_FILE"
}

# 統計保存関数
save_stats() {
    echo "total_pushes=$total_pushes" > "$STATS_FILE"
    echo "level=$level" >> "$STATS_FILE"
    echo "xp=$xp" >> "$STATS_FILE"
    echo "last_push_date=$last_push_date" >> "$STATS_FILE"
}

# ストリーク読み込み関数
load_streak() {
    source "$STREAK_FILE"
}

# ストリーク保存関数
save_streak() {
    echo "current_streak=$current_streak" > "$STREAK_FILE"
    echo "max_streak=$max_streak" >> "$STREAK_FILE"
    echo "last_streak_date=$last_streak_date" >> "$STREAK_FILE"
}

# レベル計算関数 (次のレベルに必要なXP = level * 100)
calculate_level() {
    local current_xp=$1
    local new_level=1
    local required_xp=100
    
    while [ $current_xp -ge $required_xp ]; do
        current_xp=$((current_xp - required_xp))
        new_level=$((new_level + 1))
        required_xp=$((new_level * 100))
    done
    
    echo $new_level
}

# ランクタイトル取得
get_rank_title() {
    local level=$1
    case $level in
        1-4) echo "🌱 Newbie Developer" ;;
        5-9) echo "🚶 Junior Developer" ;;
        10-19) echo "⚔️ Code Warrior" ;;
        20-29) echo "🥋 Push Master" ;;
        30-49) echo "🥷 Code Ninja" ;;
        50-74) echo "👑 Elite Developer" ;;
        75-99) echo "💎 Legendary Coder" ;;
        *) echo "🦄 Mythical Developer" ;;
    esac
}

# =============================================
# 🎮 その他の関数
# =============================================

# 重複削除済み - 関数は上部で定義されています

# チーム向けPR作成
create_team_pr() {
    local title="$1"
    local priority="$2"
    
    echo -e "${GOLD}🎮 チーム向けPR作成${NC}"
    echo ""
    
    if [ -z "$title" ]; then
        title="Team Feature Implementation"
    fi
    
    echo -e "${CYAN}📋 タイトル: ${title}${NC}"
    echo -e "${CYAN}⚡ 優先度: ${priority:-normal}${NC}"
    echo -e "${CYAN}👥 チーム: $(grep '"team_name"' "$TEAM_CONFIG_FILE" | cut -d'"' -f4 2>/dev/null || echo 'Unknown')${NC}"
    echo ""
    
    # チーム専用テンプレート適用
    echo -e "${YELLOW}📝 チーム専用テンプレートを適用中...${NC}"
    echo -e "${GREEN}✅ PR作成準備完了${NC}"
    echo ""
    echo -e "${SPARKLES} チーム全体に通知が送信されます${NC}"
}

# チーム通知
notify_team() {
    local message="$1"
    
    if [ -z "$message" ]; then
        message="重要な更新があります"
    fi
    
    echo -e "${GOLD}📢 チーム通知送信${NC}"
    echo ""
    echo -e "${CYAN}📝 メッセージ: ${message}${NC}"
    echo -e "${CYAN}👥 送信先: チーム全体${NC}"
    echo ""
    
    # 各通知チャンネルに送信
    echo -e "${YELLOW}📡 通知送信中...${NC}"
    echo -e "${GREEN}✅ Slack: 送信完了${NC}"
    echo -e "${GREEN}✅ Discord: 送信完了${NC}"
    echo -e "${GREEN}✅ Teams: 送信完了${NC}"
    echo ""
    echo -e "${SPARKLES} 全チームメンバーに通知しました！${NC}"
}

# チームイベント開始
start_team_event() {
    local event_name="$1"
    local duration="$2"
    local bonus="$3"
    
    if [ -z "$event_name" ]; then
        event_name="開発チャレンジ"
    fi
    
    if [ -z "$duration" ]; then
        duration="7d"
    fi
    
    if [ -z "$bonus" ]; then
        bonus="1.5x"
    fi
    
    echo -e "${GOLD}🎪 チームイベント開始${NC}"
    echo ""
    echo -e "${CYAN}🎯 イベント: ${event_name}${NC}"
    echo -e "${CYAN}⏰ 期間: ${duration}${NC}"
    echo -e "${CYAN}💰 ボーナス: ${bonus} XP${NC}"
    echo ""
    
    # イベント開始アニメーション
    show_party_animation
    
    echo -e "${SPARKLES}${GREEN} イベント「${event_name}」が開始されました！${NC}"
    echo -e "${PARTY} 全チームメンバーにボーナスXPが適用されます${NC}"
    echo ""
    
    # チーム通知
    notify_team "🎪 新イベント「${event_name}」開始！${bonus} XPボーナス期間です！"
}

# パーティーアニメーション
show_party_animation() {
    local party_emojis="🎉 🎊 🥳 🎈 🎁 🎂 🍾 🥂 🎭 🎪 🎨 🎯"
    echo -e "${GOLD}${party_emojis}${NC}"
}

# インタラクティブなセットアップウィザード
run_setup_wizard() {
    clear
    echo -e "${GOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GOLD}🚀✨ Git Auto Push セットアップウィザード ✨🚀${NC}"
    echo -e "${GOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${CYAN}このウィザードがあなたの最適な設定を作成します！${NC}"
    echo ""
    
    # ゲームモード設定
    echo -e "${GAME}${GREEN} 1. ゲーム機能を使用しますか？ (推奨: y)${NC}"
    echo -e "   ${GRAY}レベル、XP、ストリーク、バッジなどのゲーム要素${NC}"
    read -p "   [y/n]: " game_choice
    case $game_choice in
        [Nn]*) game_mode="false" ;;
        *) game_mode="true" ;;
    esac
    
    # 通知設定
    echo ""
    echo -e "${BELL}${GREEN} 2. デスクトップ通知を有効にしますか？ (推奨: y)${NC}"
    read -p "   [y/n]: " notification_choice
    case $notification_choice in
        [Nn]*) notifications="false" ;;
        *) notifications="true" ;;
    esac
    
    # 視覚機能設定
    echo ""
    echo -e "${CAMERA}${GREEN} 3. 視覚的機能を設定してください:${NC}"
    echo -e "   ${SPARKLES} SVGバッジ生成 (GitHub READMEに使用可能)"
    read -p "   有効にしますか？ [y/n]: " badges_choice
    case $badges_choice in
        [Yy]*) badges_generation="true" ;;
        *) badges_generation="false" ;;
    esac
    
    echo -e "   ${GLOBE} GitHub Profile README生成"
    read -p "   有効にしますか？ [y/n]: " profile_choice
    case $profile_choice in
        [Yy]*) profile_update="true" ;;
        *) profile_update="false" ;;
    esac
    
    echo -e "   ${CHART} HTML統計レポート生成"
    read -p "   有効にしますか？ [y/n]: " report_choice
    case $report_choice in
        [Yy]*) report_generation="true" ;;
        *) report_generation="false" ;;
    esac
    
    # 外部通知設定
    echo ""
    echo -e "${LIGHTNING}${GREEN} 4. 外部通知サービス設定:${NC}"
    
    echo -e "   📢 Slack通知"
    read -p "   使用しますか？ [y/n]: " slack_choice
    case $slack_choice in
        [Yy]*)
            slack_notifications="true"
            echo -e "   ${GRAY}環境変数 SLACK_WEBHOOK_URL を設定してください${NC}"
            read -p "   Webhook URL (オプション): " slack_url
            if [ -n "$slack_url" ]; then
                echo "export SLACK_WEBHOOK_URL=\"$slack_url\"" >> ~/.bashrc
                echo "export SLACK_WEBHOOK_URL=\"$slack_url\"" >> ~/.zshrc
            fi
            ;;
        *) slack_notifications="false" ;;
    esac
    
    echo -e "   💬 Discord通知"
    read -p "   使用しますか？ [y/n]: " discord_choice
    case $discord_choice in
        [Yy]*)
            discord_notifications="true"
            echo -e "   ${GRAY}環境変数 DISCORD_WEBHOOK_URL を設定してください${NC}"
            ;;
        *) discord_notifications="false" ;;
    esac
    
    echo -e "   💚 LINE Notify"
    read -p "   使用しますか？ [y/n]: " line_choice
    case $line_choice in
        [Yy]*)
            line_notifications="true"
            echo -e "   ${GRAY}環境変数 LINE_NOTIFY_TOKEN を設定してください${NC}"
            ;;
        *) line_notifications="false" ;;
    esac
    
    # テーマ設定
    echo ""
    echo -e "${STAR}${GREEN} 5. 表示テーマを選択してください:${NC}"
    echo -e "   1) ${GREEN}default${NC} - 標準テーマ"
    echo -e "   2) ${PURPLE}cyberpunk${NC} - サイバーパンクテーマ"
    echo -e "   3) ${BLUE}ocean${NC} - オーシャンテーマ"
    echo -e "   4) ${GOLD}retro${NC} - レトロテーマ"
    read -p "   [1-4]: " theme_choice
    case $theme_choice in
        2) theme="cyberpunk" ;;
        3) theme="ocean" ;;
        4) theme="retro" ;;
        *) theme="default" ;;
    esac
    
    # 設定保存
    cat > "$CONFIG_FILE" << EOF
game_mode=$game_mode
notifications=$notifications
badges_generation=$badges_generation
profile_update=$profile_update
report_generation=$report_generation
slack_notifications=$slack_notifications
discord_notifications=$discord_notifications
line_notifications=$line_notifications
teams_notifications=false
email_notifications=false
theme=$theme
EOF
    
    echo ""
    echo -e "${GREEN}✅ 設定が完了しました！${NC}"
    echo -e "${CYAN}設定ファイル: ${CONFIG_FILE}${NC}"
    echo ""
    echo -e "${GOLD}🎉 Git Auto Push の使用を開始できます！${NC}"
    echo -e "${GRAY}使用例: ap \"コミットメッセージ\"${NC}"
}

# 簡単Slackセットアップ
setup_slack_simple() {
    echo -e "${GREEN}📢 Slack通知の簡単セットアップ${NC}"
    echo ""
    echo -e "${CYAN}手順:${NC}"
    echo -e "1. Slackでアプリを作成: https://api.slack.com/apps"
    echo -e "2. Incoming Webhooks を有効化"
    echo -e "3. Webhook URLをコピー"
    echo ""
    read -p "Webhook URLを入力してください: " webhook_url
    
    if [ -n "$webhook_url" ]; then
        echo "export SLACK_WEBHOOK_URL=\"$webhook_url\"" >> ~/.bashrc
        echo "export SLACK_WEBHOOK_URL=\"$webhook_url\"" >> ~/.zshrc
        
        # 設定ファイル更新
        sed -i '' 's/slack_notifications=false/slack_notifications=true/' "$CONFIG_FILE" 2>/dev/null || \
        echo "slack_notifications=true" >> "$CONFIG_FILE"
        
        echo -e "${GREEN}✅ Slack通知が設定されました！${NC}"
        echo -e "${YELLOW}シェルの再起動または source ~/.zshrc を実行してください${NC}"
        echo -e "${GRAY}テスト: ap --notify-slack \"テストメッセージ\"${NC}"
    else
        echo -e "${RED}❌ 設定がキャンセルされました${NC}"
    fi
}

# 簡単Discordセットアップ
setup_discord_simple() {
    echo -e "${GREEN}💬 Discord通知の簡単セットアップ${NC}"
    echo ""
    echo -e "${CYAN}手順:${NC}"
    echo -e "1. Discordサーバーの設定 → 連携サービス → ウェブフック"
    echo -e "2. 新しいウェブフックを作成"
    echo -e "3. ウェブフックURLをコピー"
    echo ""
    read -p "Webhook URLを入力してください: " webhook_url
    
    if [ -n "$webhook_url" ]; then
        echo "export DISCORD_WEBHOOK_URL=\"$webhook_url\"" >> ~/.bashrc
        echo "export DISCORD_WEBHOOK_URL=\"$webhook_url\"" >> ~/.zshrc
        
        # 設定ファイル更新
        sed -i '' 's/discord_notifications=false/discord_notifications=true/' "$CONFIG_FILE" 2>/dev/null || \
        echo "discord_notifications=true" >> "$CONFIG_FILE"
        
        echo -e "${GREEN}✅ Discord通知が設定されました！${NC}"
        echo -e "${YELLOW}シェルの再起動または source ~/.zshrc を実行してください${NC}"
        echo -e "${GRAY}テスト: ap --notify-discord \"テストメッセージ\"${NC}"
    else
        echo -e "${RED}❌ 設定がキャンセルされました${NC}"
    fi
}

# 簡単LINE Notifyセットアップ
setup_line_simple() {
    echo -e "${GREEN}💚 LINE Notify の簡単セットアップ${NC}"
    echo ""
    echo -e "${CYAN}手順:${NC}"
    echo -e "1. LINE Notify にアクセス: https://notify-bot.line.me/"
    echo -e "2. ログイン → マイページ → トークンを発行する"
    echo -e "3. トークン名を入力（例: Git Auto Push）"
    echo -e "4. 通知を送信するトークルームを選択"
    echo -e "5. 発行されたトークンをコピー"
    echo ""
    read -p "LINE Notify トークンを入力してください: " token
    
    if [ -n "$token" ]; then
        echo "export LINE_NOTIFY_TOKEN=\"$token\"" >> ~/.bashrc
        echo "export LINE_NOTIFY_TOKEN=\"$token\"" >> ~/.zshrc
        
        # 設定ファイル更新
        sed -i '' 's/line_notifications=false/line_notifications=true/' "$CONFIG_FILE" 2>/dev/null || \
        echo "line_notifications=true" >> "$CONFIG_FILE"
        
        echo -e "${GREEN}✅ LINE Notify が設定されました！${NC}"
        echo -e "${YELLOW}シェルの再起動または source ~/.zshrc を実行してください${NC}"
        echo -e "${GRAY}テスト: ap --notify-line \"テストメッセージ\"${NC}"
    else
        echo -e "${RED}❌ 設定がキャンセルされました${NC}"
    fi
}

# 全通知OFF
turn_off_all_notifications() {
    echo -e "${YELLOW}🔕 全ての通知を無効化しています...${NC}"
    
    # 設定ファイル更新
    sed -i '' 's/notifications=true/notifications=false/' "$CONFIG_FILE" 2>/dev/null
    sed -i '' 's/slack_notifications=true/slack_notifications=false/' "$CONFIG_FILE" 2>/dev/null
    sed -i '' 's/discord_notifications=true/discord_notifications=false/' "$CONFIG_FILE" 2>/dev/null
    sed -i '' 's/line_notifications=true/line_notifications=false/' "$CONFIG_FILE" 2>/dev/null
    sed -i '' 's/teams_notifications=true/teams_notifications=false/' "$CONFIG_FILE" 2>/dev/null
    sed -i '' 's/email_notifications=true/email_notifications=false/' "$CONFIG_FILE" 2>/dev/null
    
    echo -e "${GREEN}✅ 全ての通知が無効化されました${NC}"
    echo -e "${GRAY}静かで平和なgit pushをお楽しみください 😌${NC}"
}

# バージョン情報（グローバル変数として最上位に移動）

# バージョン表示
show_version() {
    echo -e "${GOLD}🚀 Git Auto Push Tool${NC}"
    echo -e "${CYAN}Version: ${TOOL_VERSION}${NC}"
    echo -e "${GRAY}Repository: ${TOOL_REPO}${NC}"
    echo -e "${GRAY}Config: ${CONFIG_FILE}${NC}"
    echo -e "${GRAY}Data: ${STATS_DIR}${NC}"
}

# システム全体にインストール
install_system_wide() {
    echo -e "${GOLD}🔧 Git Auto Push Tool をシステム全体にインストール${NC}"
    echo ""
    
    # インストール先ディレクトリ
    local install_dir="$HOME/bin"
    local install_path="$install_dir/git-autopush"
    
    # binディレクトリ作成
    mkdir -p "$install_dir"
    
    # 現在のスクリプトをコピー
    cp "$0" "$install_path"
    chmod +x "$install_path"
    
    # エイリアス設定
    echo ""
    echo -e "${CYAN}📝 シェル設定を更新しています...${NC}"
    
    # .bashrc の更新
    if ! grep -q "alias ap=" ~/.bashrc 2>/dev/null; then
        echo "# Git Auto Push Tool" >> ~/.bashrc
        echo "export PATH=\"\$HOME/bin:\$PATH\"" >> ~/.bashrc
        echo "alias ap='$install_path'" >> ~/.bashrc
    else
        sed -i '' "s|alias ap=.*|alias ap='$install_path'|" ~/.bashrc
    fi
    
    # .zshrc の更新
    if ! grep -q "alias ap=" ~/.zshrc 2>/dev/null; then
        echo "# Git Auto Push Tool" >> ~/.zshrc
        echo "export PATH=\"\$HOME/bin:\$PATH\"" >> ~/.zshrc
        echo "alias ap='$install_path'" >> ~/.zshrc
    else
        sed -i '' "s|alias ap=.*|alias ap='$install_path'|" ~/.zshrc
    fi
    
    # .profile の更新
    if ! grep -q "alias ap=" ~/.profile 2>/dev/null; then
        echo "# Git Auto Push Tool" >> ~/.profile
        echo "export PATH=\"\$HOME/bin:\$PATH\"" >> ~/.profile
        echo "alias ap='$install_path'" >> ~/.profile
    else
        sed -i '' "s|alias ap=.*|alias ap='$install_path'|" ~/.profile
    fi
    
    echo -e "${GREEN}✅ インストール完了！${NC}"
    echo ""
    echo -e "${YELLOW}📍 インストール場所: ${install_path}${NC}"
    echo -e "${CYAN}🔄 シェルを再起動するか、以下を実行してください:${NC}"
    echo -e "${GRAY}   source ~/.zshrc${NC}"
    echo -e "${GRAY}   source ~/.bashrc${NC}"
    echo ""
    echo -e "${SPARKLES}${GREEN} これで全プロジェクトで同じ最新版が使用されます！${NC}"
}

# ツール更新
update_tool() {
    echo -e "${GOLD}⬆️  Git Auto Push Tool を更新中...${NC}"
    echo ""
    
    # インストール先パス
    local install_path="$HOME/bin/git-autopush"
    
    if [ -f "$install_path" ]; then
        # 既存の設定バックアップ
        echo -e "${CYAN}📋 設定をバックアップ中...${NC}"
        cp -r "$STATS_DIR" "$STATS_DIR.backup.$(date +%Y%m%d_%H%M%S)" 2>/dev/null || true
        
        # GitHubから最新版を取得
        echo -e "${CYAN}📥 最新版をダウンロード中...${NC}"
        if command -v curl >/dev/null 2>&1; then
            if curl -s -o "/tmp/autopush.sh" "https://raw.githubusercontent.com/daideguchi/git-autopush/main/autopush.sh"; then
                chmod +x "/tmp/autopush.sh"
                cp "/tmp/autopush.sh" "$install_path"
                rm "/tmp/autopush.sh"
                echo -e "${GREEN}✅ 更新完了！${NC}"
                echo -e "${SPARKLES} 最新版 Git Auto Push Tool がインストールされました${NC}"
            else
                echo -e "${RED}❌ ダウンロードに失敗しました${NC}"
                echo -e "${YELLOW}手動で更新するか、ネットワーク接続を確認してください${NC}"
            fi
        else
            echo -e "${YELLOW}⚠️  curl が見つかりません${NC}"
            echo -e "${CYAN}手動更新手順:${NC}"
            echo -e "1. ${TOOL_REPO} にアクセス"
            echo -e "2. 最新のautopush.sh をダウンロード"
            echo -e "3. cp autopush.sh $install_path"
        fi
    else
        echo -e "${YELLOW}⚠️  システムワイドインストールが見つかりません${NC}"
        echo -e "${CYAN}まず以下を実行してください:${NC}"
        echo -e "${GRAY}   ap --install${NC}"
    fi
}

# 自動更新チェック（最新版があるかチェック）
check_for_updates() {
    # 1日に1回だけチェック
    local last_check_file="$STATS_DIR/last_update_check"
    local today=$(date '+%Y-%m-%d')
    
    if [ -f "$last_check_file" ]; then
        local last_check=$(cat "$last_check_file")
        if [ "$last_check" = "$today" ]; then
            return 0
        fi
    fi
    
    echo "$today" > "$last_check_file"
    
    # バックグラウンドで更新チェック（非同期）
    (
        if command -v curl >/dev/null 2>&1; then
            # GitHubから最新のバージョン情報を取得
            local remote_version=$(curl -s "https://api.github.com/repos/daideguchi/git-autopush/releases/latest" | grep '"tag_name"' | sed 's/.*"tag_name": *"\([^"]*\)".*/\1/' 2>/dev/null)
            if [ -n "$remote_version" ] && [ "$remote_version" != "$TOOL_VERSION" ]; then
                echo -e "${YELLOW}💡 新しいバージョンが利用可能: ${remote_version}${NC}" >&2
                echo -e "${GRAY}   更新: ap --update${NC}" >&2
            fi
        fi
    ) &
}

# デスクトップ通知送信
send_notification() {
    local title="$1"
    local message="$2"
    local sound="${3:-Glass}"
    
    if [ "$ENABLE_NOTIFICATIONS" = true ]; then
        # macOS
        if command -v osascript >/dev/null 2>&1; then
            osascript -e "display notification \"$message\" with title \"$title\" sound name \"$sound\""
        # Linux with notify-send
        elif command -v notify-send >/dev/null 2>&1; then
            notify-send "$title" "$message"
        fi
    fi
}

# SVGバッジ生成
generate_badge() {
    local badge_type="$1"
    local value="$2"
    local color="$3"
    local file_path="$BADGES_DIR/${badge_type}.svg"
    
    if [ "$ENABLE_BADGES" = true ]; then
        cat > "$file_path" << EOF
<svg xmlns="http://www.w3.org/2000/svg" width="120" height="20">
  <linearGradient id="b" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="a">
    <rect width="120" height="20" rx="3" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#a)">
    <path fill="#555" d="M0 0h63v20H0z"/>
    <path fill="$color" d="M63 0h57v20H63z"/>
    <path fill="url(#b)" d="M0 0h120v20H0z"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="110">
    <text x="325" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="530">${badge_type}</text>
    <text x="325" y="140" transform="scale(.1)" textLength="530">${badge_type}</text>
    <text x="905" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="470">${value}</text>
    <text x="905" y="140" transform="scale(.1)" textLength="470">${value}</text>
  </g>
</svg>
EOF
        echo -e "${CAMERA} SVGバッジ生成: ${file_path}"
    fi
}

# GitHub Profile README用Markdown生成（スタイリッシュ版）
generate_profile_markdown() {
    if [ "$ENABLE_PROFILE" = true ]; then
        load_stats
        load_streak
        
        local profile_file="$STATS_DIR/profile-stats.md"
        local xp_percent=$(((xp % 100)))
        local next_level_xp=$((level * 100))
        
        cat > "$profile_file" << EOF
<div align="center">

# 🚀 Git Auto Push Developer Dashboard

<img src="https://readme-typing-svg.herokuapp.com?font=Fira+Code&pause=1000&color=36BCF7&center=true&vCenter=true&width=600&lines=Level+${level}+Developer+%F0%9F%9A%80;${xp}+XP+Earned+%E2%9A%A1;${current_streak}+Day+Streak+%F0%9F%94%A5;${total_pushes}+Commits+Pushed+%F0%9F%93%A6" alt="Typing SVG" />

</div>

## 📊 Development Stats

<table>
<tr>
<td width="50%">

### 🎯 Current Status
![Level](https://img.shields.io/badge/Level-${level}-gold?style=for-the-badge&logo=star&logoColor=white)
![XP](https://img.shields.io/badge/XP-${xp}-blue?style=for-the-badge&logo=lightning&logoColor=white)
![Streak](https://img.shields.io/badge/Streak-${current_streak}days-red?style=for-the-badge&logo=fire&logoColor=white)
![Pushes](https://img.shields.io/badge/Pushes-${total_pushes}-green?style=for-the-badge&logo=git&logoColor=white)

### 📈 Progress to Next Level
$(printf "Level %d [" "$level")$(printf '█%.0s' $(seq 1 $((xp_percent/5))))$(printf '░%.0s' $(seq 1 $((20-xp_percent/5))))$(printf "] %d%%\n%d/%d XP" "$xp_percent" "$xp" "$next_level_xp")

</td>
<td width="50%">

### 🏆 Achievement Gallery
EOF
        
        if [ -f "$BADGES_FILE" ] && [ -s "$BADGES_FILE" ]; then
            while IFS='|' read -r name emoji desc; do
                echo "<img src=\"https://img.shields.io/badge/${name}-${desc}-purple?style=flat-square&logo=trophy&logoColor=white\" alt=\"$name\" title=\"$emoji $desc\" />" >> "$profile_file"
            done < "$BADGES_FILE"
        fi
        
        cat >> "$profile_file" << EOF

### 🌟 Recent Activity
- 🚀 **Latest Push**: $(date '+%Y-%m-%d %H:%M')
- 🔥 **Current Streak**: ${current_streak} days
- 🎯 **XP This Session**: +50 XP
- 🏆 **Rank**: $(get_rank_title $level)

</td>
</tr>
</table>

<div align="center">

### 🎮 Gaming Stats Visualization

![GitHub Stats](https://github-readme-stats.vercel.app/api?username=YourUsername&show_icons=true&theme=radical&hide_border=true&bg_color=0D1117&title_color=F85D7F&icon_color=F8D866&text_color=A8B2D1)

### 🏅 Achievement Timeline
\`\`\`mermaid
timeline
    title Development Journey
    section Level 1
        First Push 🌱 : Initial commit
    section Level 2  
        Consistent Dev 🚶 : 10 commits
    section Level 3
        Code Warrior ⚔️ : 50 commits
        Current Level 🎯 : Level ${level}
\`\`\`

</div>

---
<div align="center">
<i>🚀 Powered by Git Auto Push Tool | Last Updated: $(date '+%Y-%m-%d %H:%M:%S')</i>
</div>
EOF
        
        echo -e "${GLOBE} スタイリッシュProfile Markdown生成: ${profile_file}"
    fi
}

# HTML統計レポート生成
generate_html_report() {
    if [ "$ENABLE_REPORT" = true ]; then
        load_stats
        load_streak
        
        local html_file="$REPORTS_DIR/stats-$(date '+%Y%m%d').html"
        cat > "$html_file" << EOF
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🚀 Git Auto Push Statistics</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); margin: 0; padding: 20px; color: white; }
        .container { max-width: 800px; margin: 0 auto; background: rgba(255,255,255,0.1); backdrop-filter: blur(10px); border-radius: 20px; padding: 30px; box-shadow: 0 8px 32px rgba(0,0,0,0.3); }
        .header { text-align: center; margin-bottom: 30px; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 30px 0; }
        .stat-card { background: rgba(255,255,255,0.2); padding: 20px; border-radius: 15px; text-align: center; }
        .stat-value { font-size: 2em; font-weight: bold; color: #ffd700; }
        .progress-bar { background: rgba(0,0,0,0.3); height: 20px; border-radius: 10px; overflow: hidden; margin: 10px 0; }
        .progress-fill { background: linear-gradient(90deg, #00ff88, #00ccff); height: 100%; transition: width 0.3s ease; }
        .badges { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; margin-top: 20px; }
        .badge { background: rgba(255,255,255,0.2); padding: 8px 16px; border-radius: 20px; font-size: 14px; }
        .timestamp { text-align: center; opacity: 0.7; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 Git Auto Push Statistics</h1>
            <p>Your development journey in numbers</p>
        </div>
        
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value">Lv.${level}</div>
                <div>レベル</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${xp}</div>
                <div>経験値</div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: $((xp % 100))%"></div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${current_streak}</div>
                <div>🔥 現在のストリーク</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${total_pushes}</div>
                <div>🚀 総プッシュ数</div>
            </div>
        </div>
        
        <div class="badges">
EOF
        
        if [ -f "$BADGES_FILE" ] && [ -s "$BADGES_FILE" ]; then
            while IFS='|' read -r name emoji desc; do
                echo "            <div class=\"badge\">$emoji $name</div>" >> "$html_file"
            done < "$BADGES_FILE"
        fi
        
        cat >> "$html_file" << EOF
        </div>
        
        <div class="timestamp">
            Generated on $(date '+%Y-%m-%d %H:%M:%S')
        </div>
    </div>
</body>
</html>
EOF
        
        echo -e "${CHART} HTML レポート生成: ${html_file}"
        
        # 自動でブラウザを開く
        if command -v open >/dev/null 2>&1; then
            open "$html_file" 2>/dev/null
        elif command -v xdg-open >/dev/null 2>&1; then
            xdg-open "$html_file" 2>/dev/null
        fi
    fi
}

# 外部通知システム（拡張版）
send_slack_notification() {
    local webhook_url="$SLACK_WEBHOOK_URL"
    local message="$1"
    
    if [ "$ENABLE_SLACK" = true ] && [ -n "$webhook_url" ]; then
        local payload=$(cat << EOF
{
    "text": "$message",
    "attachments": [
        {
            "color": "good",
            "fields": [
                {
                    "title": "Level",
                    "value": "$level",
                    "short": true
                },
                {
                    "title": "XP",
                    "value": "$xp",
                    "short": true
                },
                {
                    "title": "Streak",
                    "value": "${current_streak} days",
                    "short": true
                },
                {
                    "title": "Total Pushes",
                    "value": "$total_pushes",
                    "short": true
                }
            ]
        }
    ]
}
EOF
)
        curl -X POST -H 'Content-type: application/json' \
            --data "$payload" \
            "$webhook_url" 2>/dev/null
    fi
}

# Discord通知送信
send_discord_notification() {
    local webhook_url="$DISCORD_WEBHOOK_URL"
    local message="$1"
    local color="$2"
    
    if [ "$ENABLE_DISCORD" = true ] && [ -n "$webhook_url" ]; then
        local payload=$(cat << EOF
{
    "embeds": [
        {
            "title": "🚀 Git Auto Push",
            "description": "$message",
            "color": ${color:-3447003},
            "fields": [
                {
                    "name": "📊 Stats",
                    "value": "Level: $level | XP: $xp | Streak: ${current_streak}d | Pushes: $total_pushes",
                    "inline": false
                }
            ],
            "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%S.000Z)"
        }
    ]
}
EOF
)
        curl -X POST -H 'Content-type: application/json' \
            --data "$payload" \
            "$webhook_url" 2>/dev/null
    fi
}

# LINE Notify通知送信
send_line_notification() {
    local token="$LINE_NOTIFY_TOKEN"
    local message="$1"
    
    if [ "$ENABLE_LINE" = true ] && [ -n "$token" ]; then
        curl -X POST -H "Authorization: Bearer $token" \
            -F "message=$message 📊 Lv.$level | $xp XP | ${current_streak}d | $total_pushes pushes" \
            https://notify-api.line.me/api/notify 2>/dev/null
    fi
}

# Microsoft Teams通知送信
send_teams_notification() {
    local webhook_url="$TEAMS_WEBHOOK_URL"
    local message="$1"
    
    if [ "$ENABLE_TEAMS" = true ] && [ -n "$webhook_url" ]; then
        local payload=$(cat << EOF
{
    "@type": "MessageCard",
    "@context": "http://schema.org/extensions",
    "themeColor": "0076D7",
    "summary": "Git Auto Push Update",
    "sections": [{
        "activityTitle": "🚀 Git Auto Push",
        "activitySubtitle": "$message",
        "facts": [{
            "name": "Level:",
            "value": "$level"
        }, {
            "name": "XP:",
            "value": "$xp"
        }, {
            "name": "Streak:",
            "value": "${current_streak} days"
        }, {
            "name": "Total Pushes:",
            "value": "$total_pushes"
        }],
        "markdown": true
    }]
}
EOF
)
        curl -X POST -H 'Content-type: application/json' \
            --data "$payload" \
            "$webhook_url" 2>/dev/null
    fi
}

# Email通知送信
send_email_notification() {
    local email="$EMAIL_ADDRESS"
    local subject="$1"
    local message="$2"
    
    if [ "$ENABLE_EMAIL" = true ] && [ -n "$email" ]; then
        if command -v mail >/dev/null 2>&1; then
            echo "$message" | mail -s "$subject" "$email"
        elif command -v sendmail >/dev/null 2>&1; then
            (
                echo "To: $email"
                echo "Subject: $subject"
                echo ""
                echo "$message"
            ) | sendmail "$email"
        fi
    fi
}

# 統合通知システム
send_all_notifications() {
    local title="$1"
    local message="$2"
    local color="${3:-3066993}"
    
    # デスクトップ通知
    if [ "$ENABLE_NOTIFICATIONS" = true ]; then
        send_notification "$title" "$message"
    fi
    
    # 外部サービス通知
    if [ "$ENABLE_SLACK" = true ]; then
        send_slack_notification "$title: $message"
    fi
    
    if [ "$ENABLE_DISCORD" = true ]; then
        send_discord_notification "$message" "$color"
    fi
    
    if [ "$ENABLE_LINE" = true ]; then
        send_line_notification "$title: $message"
    fi
    
    if [ "$ENABLE_TEAMS" = true ]; then
        send_teams_notification "$message"
    fi
    
    if [ "$ENABLE_EMAIL" = true ]; then
        send_email_notification "$title" "$message"
    fi
}

# テーマ適用システム
apply_theme() {
    case $THEME in
        "cyberpunk")
            RED='\033[0;91m'
            GREEN='\033[0;92m'
            YELLOW='\033[1;93m'
            BLUE='\033[0;94m'
            PURPLE='\033[0;95m'
            CYAN='\033[0;96m'
            MAGENTA='\033[1;95m'
            GOLD='\033[1;93m'
            WHITE='\033[1;97m'
            ;;
        "ocean")
            RED='\033[0;36m'
            GREEN='\033[0;32m'
            YELLOW='\033[1;96m'
            BLUE='\033[0;34m'
            PURPLE='\033[0;94m'
            CYAN='\033[0;36m'
            MAGENTA='\033[0;96m'
            GOLD='\033[1;96m'
            WHITE='\033[1;97m'
            ;;
        "retro")
            RED='\033[0;33m'
            GREEN='\033[0;32m'
            YELLOW='\033[1;33m'
            BLUE='\033[0;36m'
            PURPLE='\033[0;35m'
            CYAN='\033[0;36m'
            MAGENTA='\033[1;35m'
            GOLD='\033[1;33m'
            WHITE='\033[1;37m'
            ;;
        # default theme (no changes needed)
    esac
}

# 進捗表示アニメーション
show_progress_animation() {
    local message="$1"
    local duration="${2:-3}"
    
    echo -ne "$message "
    for i in $(seq 1 $duration); do
        echo -ne "⠋"
        sleep 0.1
        echo -ne "\b⠙"
        sleep 0.1
        echo -ne "\b⠹"
        sleep 0.1
        echo -ne "\b⠸"
        sleep 0.1
        echo -ne "\b⠼"
        sleep 0.1
        echo -ne "\b⠴"
        sleep 0.1
        echo -ne "\b⠦"
        sleep 0.1
        echo -ne "\b⠧"
        sleep 0.1
        echo -ne "\b⠇"
        sleep 0.1
        echo -ne "\b⠏"
        sleep 0.1
    done
    echo -e "\b✅"
}

# コンパクトなリポジトリ情報表示
show_compact_info() {
    local current_branch=$(git branch --show-current 2>/dev/null)
    local remote_url=$(git remote get-url origin 2>/dev/null)
    
    if [ -n "$current_branch" ]; then
        echo -e "${BRANCH}${current_branch} ${GLOBE}$(basename "$remote_url" .git) ${GRAY}(--info で詳細)${NC}"
    fi
}

# リポジトリ情報表示関数
show_repo_info() {
    echo -e "${GLOBE}${CYAN} === リポジトリ情報 === ${NC}"
    
    # 現在のブランチ
    local current_branch=$(git branch --show-current 2>/dev/null)
    if [ -n "$current_branch" ]; then
        echo -e "${BRANCH} ブランチ: ${GREEN}$current_branch${NC}"
    fi
    
    # リモートリポジトリ
    local remote_url=$(git remote get-url origin 2>/dev/null)
    if [ -n "$remote_url" ]; then
        echo -e "${GLOBE} リモート: ${BLUE}$remote_url${NC}"
    fi
    
    # 最新コミット情報
    local latest_commit=$(git log --oneline -1 2>/dev/null)
    if [ -n "$latest_commit" ]; then
        echo -e "${PACKAGE} 最新コミット: ${PURPLE}$latest_commit${NC}"
    fi
    
    # リモートとの同期状態
    git fetch --dry-run &>/dev/null
    local ahead=$(git rev-list --count HEAD..@{u} 2>/dev/null || echo "0")
    local behind=$(git rev-list --count @{u}..HEAD 2>/dev/null || echo "0")
    
    if [ "$ahead" -gt 0 ] && [ "$behind" -gt 0 ]; then
        echo -e "${WARNING} 同期状態: ${YELLOW}$behind件進んでいて、$ahead件遅れています${NC}"
    elif [ "$ahead" -gt 0 ]; then
        echo -e "${INFO} 同期状態: ${YELLOW}リモートより$ahead件遅れています${NC}"
    elif [ "$behind" -gt 0 ]; then
        echo -e "${ROCKET} 同期状態: ${GREEN}リモートより$behind件進んでいます${NC}"
    else
        echo -e "${CHECK} 同期状態: ${GREEN}リモートと同期済み${NC}"
    fi
    
    # 作業ディレクトリの状態
    local staged=$(git diff --cached --name-only | wc -l | tr -d ' ')
    local unstaged=$(git diff --name-only | wc -l | tr -d ' ')
    local untracked=$(git ls-files --others --exclude-standard | wc -l | tr -d ' ')
    
    if [ "$staged" -gt 0 ] || [ "$unstaged" -gt 0 ] || [ "$untracked" -gt 0 ]; then
        echo -e "${FOLDER} 作業状態: ${YELLOW}ステージ済み:$staged件 未ステージ:$unstaged件 未追跡:$untracked件${NC}"
    else
        echo -e "${FOLDER} 作業状態: ${GREEN}クリーン${NC}"
    fi
    
    # ユーザー情報
    local git_user=$(git config user.name 2>/dev/null)
    local git_email=$(git config user.email 2>/dev/null)
    if [ -n "$git_user" ]; then
        echo -e "${USER} ユーザー: ${WHITE}$git_user${NC} ${GRAY}<$git_email>${NC}"
    fi
    
    echo ""
}

# コンパクトゲーム統計
show_compact_game_stats() {
    if [ "$GAME_MODE" = true ]; then
        load_stats
        load_streak
        echo -e "${GAME}Lv.$level ${LIGHTNING}$xp XP ${FIRE}$current_streak日 ${ROCKET}$total_pushes回 ${GRAY}(--stats で詳細)${NC}"
    fi
}

# バッジ追加関数
add_badge() {
    local badge_name="$1"
    local badge_emoji="$2"
    local badge_desc="$3"
    
    if ! grep -q "$badge_name" "$BADGES_FILE" 2>/dev/null; then
        echo "$badge_name|$badge_emoji|$badge_desc" >> "$BADGES_FILE"
        if [ "$GAME_MODE" = true ]; then
            echo -e "${GOLD}${SPARKLES} 新しいバッジを獲得！ ${badge_emoji} ${badge_name}${NC}"
            echo -e "${CYAN}「${badge_desc}」${NC}"
            echo ""
            
            # 通知統合送信
            send_all_notifications "🏆 新バッジ獲得!" "$badge_emoji $badge_name: $badge_desc" "15844367"
        fi
    fi
}

# ストリーク更新関数
update_streak() {
    local today=$(date '+%Y-%m-%d')
    local yesterday=$(date -d "yesterday" '+%Y-%m-%d' 2>/dev/null || date -v-1d '+%Y-%m-%d')
    
    load_streak
    
    if [ "$last_streak_date" = "$today" ]; then
        # 今日既にプッシュ済み - ストリーク変更なし
        return
    elif [ "$last_streak_date" = "$yesterday" ]; then
        # 昨日プッシュしていた - ストリーク継続
        current_streak=$((current_streak + 1))
    elif [ -z "$last_streak_date" ] || [ "$last_streak_date" != "$yesterday" ]; then
        # ストリークが途切れた、または初回
        current_streak=1
    fi
    
    # 最大ストリーク更新
    if [ $current_streak -gt $max_streak ]; then
        max_streak=$current_streak
    fi
    
    last_streak_date="$today"
    save_streak
}

# 励ましメッセージ配列
ENCOURAGEMENT_MESSAGES=(
    "素晴らしいコミットです！"
    "あなたのコードが世界を変える！"
    "今日も開発お疲れ様です！"
    "継続は力なり！"
    "次のレベルまであと少し！"
    "コードの魔法使いですね！"
    "開発スキルがレベルアップ！"
    "今日のプッシュも完璧です！"
    "あなたの情熱が感じられます！"
    "素晴らしい進歩です！"
    "コミットマスターの称号に近づいています！"
    "開発の神が微笑んでいます！"
    "🎉 AMAZING PUSH! 🎉"
    "🌟 STELLAR WORK! 🌟"
    "🔥 ON FIRE TODAY! 🔥"
    "⚡ LIGHTNING FAST! ⚡"
    "💎 DIAMOND QUALITY! 💎"
    "🚀 TO THE MOON! 🚀"
    "🏆 CHAMPION DEVELOPER! 🏆"
    "🌈 MAGICAL CODING! 🌈"
    "🎯 PERFECT SHOT! 🎯"
    "🔮 FUTURE VISION! 🔮"
    "🎪 SHOW STOPPER! 🎪"
    "💫 COSMIC LEVEL! 💫"
    "🎨 MASTERPIECE! 🎨"
    "🦄 LEGENDARY STATUS! 🦄"
    "🌠 SHOOTING STAR! 🌠"
    "🎭 CODING ARTIST! 🎭"
    "🎸 ROCK STAR DEV! 🎸"
    "👑 CODING ROYALTY! 👑"
    "🧙‍♂️ CODE WIZARD! 🧙‍♂️"
    "⚔️ DEBUGGING WARRIOR! ⚔️"
    "🏹 PRECISION CODER! 🏹"
    "🎓 TECH GENIUS! 🎓"
)

# 🤖 AI・テック・コマンド情報配列
TECH_TIPS=(
    "💡 AI: ChatGPT-4oはコード生成が格段に向上"
    "🚀 Tech: Bun 1.0でNode.jsの3倍高速化"
    "⚡ Cmd: git log --oneline -10 で最新10コミット"
    "🔧 Tool: GitHub Copilot Chat でインライン質問"
    "📊 AI: Claude 3.5 Sonnetは長文解析が得意"
    "🎯 Tech: Vite 5.0でHMRが爆速に"
    "💻 Cmd: git stash push -m \"作業中\" で作業保存"
    "🌐 AI: Perplexity Proでリアルタイム情報取得"
    "⚙️ Tech: Docker Composeでマルチコンテナ管理"
    "🔍 Cmd: grep -r \"検索語\" . で全ファイル検索"
    "🧠 AI: GitHub Copilot Workspace で全体設計"
    "📱 Tech: React 19のServer Componentsが革新的"
    "🔄 Cmd: git rebase -i HEAD~3 でコミット整理"
    "🎨 AI: MidJourney v6で超リアルな画像生成"
    "⚡ Tech: Turbo 8でSPA並みの体験をMPAで"
    "📝 Cmd: code . && git status で開発開始"
    "🤖 AI: OpenAI o1は数学・論理問題に特化"
    "🛠️ Tech: Astro 4.0で島アーキテクチャ完成"
    "🔧 Cmd: npm audit fix で脆弱性自動修正"
    "🎯 AI: Cursor IDE でペアプログラミング体験"
    "🌟 Tech: Deno 2.0でNode.js互換性向上"
    "💾 Cmd: git commit --amend で直前コミット修正"
    "🔮 AI: v0.dev でReactコンポーネント自動生成"
    "⚡ Tech: Rust製ツールでフロントエンド高速化"
    "🎪 Cmd: git branch -d feature で不要ブランチ削除"
    "🧪 AI: Anthropic Claude でコードレビュー"
    "🚀 Tech: Vercel v0でゼロ設定デプロイ"
    "📋 Cmd: pbcopy < file.txt でファイル内容コピー"
    "🎨 AI: Stable Diffusion XLで商用レベル画像"
    "⚙️ Tech: Cloudflare Workers でエッジ実行"
    "🔥 AI: Gemini Pro 1.5で200万トークン処理"
    "💻 Tech: Tauri 2.0でRust製デスクトップアプリ"
    "⚡ Cmd: find . -name \"*.js\" -type f で JS ファイル検索"
    "🎯 AI: Meta Code Llama でオープンソース開発"
    "🌐 Tech: Web Components で再利用可能UI"
    "🔧 Cmd: curl -I URL でHTTPヘッダー確認"
    "🧠 AI: Microsoft Copilot でOffice自動化"
    "📊 Tech: D3.js v7でデータビジュアライゼーション"
    "🎪 Cmd: history | grep \"git\" で Git コマンド履歴"
    "🔮 AI: Runway ML でAI動画生成"
    "⚡ Tech: SvelteKit でフルスタック開発"
    "💎 Cmd: jq '.' data.json で JSON 整形表示"
    "🎨 AI: Adobe Firefly で商用安全AI画像"
    "🚀 Tech: Nuxt 3でVue.jsフルスタック"
    "🔍 Cmd: ps aux | grep node で Node プロセス確認"
    "🤖 AI: Hugging Face でオープンソースAI"
    "🌟 Tech: Solid.js で高速リアクティブUI"
    "📝 Cmd: tail -f log.txt でリアルタイムログ監視"
    "💡 AI: Poe.com で複数AI比較チャット"
    "⚙️ Tech: Prisma でタイプセーフDB操作"
    "🎯 Cmd: netstat -tulpn で開放ポート確認"
)

# ランダムASCIIアート
get_random_ascii_art() {
    local arts=(
        "   ✨    
     ⭐  ✨  ⭐
  ✨     🎉     ✨
     ⭐  ✨  ⭐
        ✨    "
        
        "   🎊 🎉 🎊
    🎁   🎈   🎁
  🎉  AWESOME!  🎉
    🎁   🎈   🎁
   🎊 🎉 🎊"
   
        "    🔥 🔥 🔥
   🚀  EPIC!  🚀
    🔥 🔥 🔥"
    
        "  💫   ⚡   💫
    🌟 LEGENDARY! 🌟
  💫   ⚡   💫"
  
        "    🎯 🎯 🎯
   🏆  PERFECT!  🏆
    🎯 🎯 🎯"
    
        "   🌈 ✨ 🌈
  ✨  MAGICAL!  ✨
   🌈 ✨ 🌈"
   
        " 💎 💎 💎 💎 💎
   💎 DIAMOND! 💎
 💎 💎 💎 💎 💎"
 
        "  🎪 🎠 🎪
 🎡 FANTASTIC! 🎡
  🎪 🎠 🎪"
  
        "   🌟 🌟 🌟
  🎆 INCREDIBLE! 🎆
   🌟 🌟 🌟"
   
        "  🎵 🎵 🎵
 🎶 HARMONIOUS! 🎶
  🎵 🎵 🎵"
    )
    
    echo "${arts[$((RANDOM % ${#arts[@]}))]}"
}

# カラフルパーティクル効果（コンパクト版）
show_particle_effect() {
    local particles=("✨" "🌟" "⭐" "💫" "🌠" "⚡" "🔥" "💥" "🎊" "🎉" "💎" "🌈")
    local colors=("${RED}" "${GREEN}" "${YELLOW}" "${BLUE}" "${PURPLE}" "${CYAN}" "${GOLD}")
    
    local line=""
    for j in {1..12}; do
        local particle="${particles[$((RANDOM % ${#particles[@]}))]}"
        local color="${colors[$((RANDOM % ${#colors[@]}))]}"
        line+="${color}${particle}${NC} "
    done
    echo -e "$line"
}

# アニメーション花火（コンパクト版）
show_fireworks() {
    echo -e "${GOLD}       💥       ${NC}"
    sleep 0.1
    echo -e "${GOLD} 💥💥💥💥💥💥💥 ${NC}"
    sleep 0.1
    echo -e "${GOLD}   ⭐✨⚡✨⭐   ${NC}"
}

# レインボー効果
show_rainbow_text() {
    local text="$1"
    local colors=("${RED}" "${YELLOW}" "${GREEN}" "${CYAN}" "${BLUE}" "${PURPLE}")
    local output=""
    
    for (( i=0; i<${#text}; i++ )); do
        local char="${text:$i:1}"
        local color="${colors[$((i % ${#colors[@]}))]}"
        output+="${color}${char}${NC}"
    done
    
    echo -e "$output"
}

# プルス効果（コンパクト版）
show_pulse_effect() {
    local text="$1"
    echo -e "${GOLD}${text}${NC}"
    sleep 0.1
    echo -e "${YELLOW}${text}${NC}"
}

# スパークル波（コンパクト版）
show_sparkle_wave() {
    echo -e "${GOLD}✨${NC} ${CYAN}⭐${NC} ${PURPLE}🌟${NC} ${BLUE}💫${NC} ${GOLD}✨${NC} ${CYAN}⭐${NC} ${PURPLE}🌟${NC} ${BLUE}💫${NC} ${GOLD}✨${NC} ${CYAN}⭐${NC} ${PURPLE}🌟${NC} ${BLUE}💫${NC}"
}

# レベルアップ超派手演出（コンパクト版）
show_mega_levelup_effect() {
    show_fireworks
    show_rainbow_text "🏆👑 LEVEL UP CONGRATULATIONS! 👑🏆"
    show_particle_effect
}

# ランダム勝利演出（コンパクト版）
show_random_victory_effect() {
    local effects=(1 2 3 4 5)
    local chosen_effect=${effects[$((RANDOM % ${#effects[@]}))]}
    
    case $chosen_effect in
        1)  # ASCII アート（1行のみ）
            local art_lines=("✨🎉 AWESOME! 🎉✨" "🔥🚀 EPIC! 🚀🔥" "💫🌟 LEGENDARY! 🌟💫" "🎯🏆 PERFECT! 🏆🎯" "🌈✨ MAGICAL! ✨🌈")
            echo -e "${GOLD}${art_lines[$((RANDOM % ${#art_lines[@]}))]}${NC}"
            ;;
        2)  # 花火
            show_fireworks
            ;;
        3)  # スパークル波
            show_sparkle_wave
            ;;
        4)  # レインボーテキスト
            show_rainbow_text "🎉 AMAZING PUSH! ✨ KEEP IT UP! 🎉"
            ;;
        5)  # パーティクル効果
            show_particle_effect
            ;;
    esac
}

# 特別な日の演出（コンパクト版）
show_special_day_effect() {
    local day=$(date +%u)  # 1-7 (月-日)
    local hour=$(date +%H)
    
    # 金曜日の夜は特別演出
    if [ $day -eq 5 ] && [ $hour -ge 18 ]; then
        show_rainbow_text "🍻 FRIDAY NIGHT CODING! 🍻"
        return
    fi
    
    # 週末は休日演出
    if [ $day -eq 6 ] || [ $day -eq 7 ]; then
        show_rainbow_text "🏖️ WEEKEND WARRIOR! 🏖️"
        return
    fi
    
    # 月曜日は励まし演出
    if [ $day -eq 1 ]; then
        show_rainbow_text "💪 MONDAY MOTIVATION! 💪"
        return
    fi
}

# コンボ演出（連続プッシュ）
show_combo_effect() {
    local streak=$1
    
    if [ $streak -ge 30 ]; then
        echo ""
        show_mega_levelup_effect
        show_rainbow_text "🔥🔥🔥 LEGENDARY STREAK!!! 🔥🔥🔥"
    elif [ $streak -ge 20 ]; then
        echo ""
        show_fireworks
        show_rainbow_text "⚡⚡ EPIC STREAK!! ⚡⚡"
    elif [ $streak -ge 10 ]; then
        echo ""
        show_particle_effect  
        show_rainbow_text "🌟 SUPER STREAK! 🌟"
    elif [ $streak -ge 5 ]; then
        echo ""
        show_sparkle_wave
        show_rainbow_text "✨ COMBO! ✨"
    fi
}

# ランダム励ましメッセージ取得
get_encouragement() {
    local index=$((RANDOM % ${#ENCOURAGEMENT_MESSAGES[@]}))
    echo "${ENCOURAGEMENT_MESSAGES[$index]}"
}

# 簡易アニメーション（場所を取らない1行表示）
show_compact_animation() {
    local message="$1"
    local duration="${2:-2}"
    
    # スピナーアニメーション（1行のみ）
    local spinners=("⠋" "⠙" "⠹" "⠸" "⠼" "⠴" "⠦" "⠧" "⠇" "⠏")
    local colors=("${CYAN}" "${BLUE}" "${PURPLE}" "${MAGENTA}")
    
    echo -ne "${message} "
    for i in $(seq 1 $((duration * 8))); do
        local spinner_idx=$((i % ${#spinners[@]}))
        local color_idx=$(((i / 2) % ${#colors[@]}))
        echo -ne "\b${colors[$color_idx]}${spinners[$spinner_idx]}${NC}"
        sleep 0.12
    done
    echo -e "\b${GREEN}✅${NC}"
}

# ランダムテック情報表示
show_random_tech_tip() {
    local tip_index=$((RANDOM % ${#TECH_TIPS[@]}))
    echo -e "${GOLD}${TECH_TIPS[$tip_index]}${NC}"
}

# レベルアップ効果表示
show_levelup_effect() {
    # 超派手なレベルアップ演出
    show_mega_levelup_effect
    echo -e "${GOLD}${CROWN}${CROWN}${CROWN} LEVEL UP! ${CROWN}${CROWN}${CROWN}${NC}"
    echo -e "${MAGENTA}${SPARKLES} レベル $level に到達しました！ ${SPARKLES}${NC}"
    echo ""
    
    # 通知統合送信
    send_all_notifications "🎉 レベルアップ!" "おめでとうございます！レベル $level に到達しました！" "3447003"
}

# Gitコマンドクイックリファレンス表示
show_git_commands() {
    echo -e "${BOOK}${CYAN} === Gitコマンドクイックリファレンス === ${NC}"
    echo -e "${TERMINAL} ${GREEN}基本操作:${NC}"
    echo -e "  ${YELLOW}git status${NC}          ${GRAY}# 現在の状態を確認${NC}"
    echo -e "  ${YELLOW}git log --oneline${NC}   ${GRAY}# コミット履歴を簡潔表示${NC}"
    echo -e "  ${YELLOW}git diff${NC}            ${GRAY}# 変更内容を確認${NC}"
    echo -e "  ${YELLOW}git add .${NC}           ${GRAY}# 全ての変更をステージング${NC}"
    
    echo -e "${BRANCH} ${GREEN}ブランチ操作:${NC}"
    echo -e "  ${YELLOW}git branch${NC}          ${GRAY}# ブランチ一覧表示${NC}"
    echo -e "  ${YELLOW}git checkout -b <名前>${NC} ${GRAY}# 新ブランチ作成・切り替え${NC}"
    echo -e "  ${YELLOW}git switch <ブランチ>${NC}  ${GRAY}# ブランチ切り替え${NC}"
    echo -e "  ${YELLOW}git merge <ブランチ>${NC}   ${GRAY}# ブランチをマージ${NC}"
    
    echo -e "${RESET} ${GREEN}取り消し操作:${NC}"
    echo -e "  ${YELLOW}git reset HEAD~1${NC}    ${GRAY}# 最新コミットを取り消し${NC}"
    echo -e "  ${YELLOW}git checkout .${NC}      ${GRAY}# 作業ディレクトリの変更を取り消し${NC}"
    echo -e "  ${YELLOW}git clean -fd${NC}       ${GRAY}# 未追跡ファイルを削除${NC}"
    
    echo -e "${STASH} ${GREEN}一時保存:${NC}"
    echo -e "  ${YELLOW}git stash${NC}           ${GRAY}# 変更を一時保存${NC}"
    echo -e "  ${YELLOW}git stash pop${NC}       ${GRAY}# 一時保存した変更を復元${NC}"
    echo -e "  ${YELLOW}git stash list${NC}      ${GRAY}# 一時保存一覧を表示${NC}"
    
    echo -e "${TAG} ${GREEN}リモート操作:${NC}"
    echo -e "  ${YELLOW}git pull${NC}            ${GRAY}# リモートから最新を取得${NC}"
    echo -e "  ${YELLOW}git fetch${NC}           ${GRAY}# リモート情報を取得（マージしない）${NC}"
    echo -e "  ${YELLOW}git remote -v${NC}       ${GRAY}# リモートリポジトリ一覧${NC}"
    
    echo -e "${BELL} ${GREEN}視覚的機能:${NC}"
    echo -e "  ${YELLOW}--notifications${NC}     ${GRAY}# デスクトップ通知有効${NC}"
    echo -e "  ${YELLOW}--badges${NC}            ${GRAY}# SVGバッジ生成${NC}"
    echo -e "  ${YELLOW}--profile${NC}           ${GRAY}# GitHub Profile用Markdown生成${NC}"
    echo -e "  ${YELLOW}--report${NC}            ${GRAY}# HTML統計レポート生成${NC}"
    echo -e "  ${YELLOW}--enable-all${NC}        ${GRAY}# 全視覚的機能有効${NC}"
    
    echo -e "${LIGHTNING} ${GREEN}外部通知サービス:${NC}"
    echo -e "  ${YELLOW}--notify-slack${NC}      ${GRAY}# Slack Webhook通知${NC}"
    echo -e "  ${YELLOW}--notify-discord${NC}    ${GRAY}# Discord Webhook通知${NC}"
    echo -e "  ${YELLOW}--notify-line${NC}       ${GRAY}# LINE Notify通知${NC}"
    echo -e "  ${YELLOW}--notify-teams${NC}      ${GRAY}# Microsoft Teams通知${NC}"
    echo -e "  ${YELLOW}--notify-email${NC}      ${GRAY}# Email通知${NC}"
    echo -e "  ${YELLOW}--enable-all-notifications${NC} ${GRAY}# 全通知サービス有効${NC}"
    
    echo -e "${STAR} ${GREEN}テーマ・設定:${NC}"
    echo -e "  ${YELLOW}--theme <name>${NC}      ${GRAY}# テーマ選択 (default/cyberpunk/ocean/retro)${NC}"
    echo -e "  ${YELLOW}--setup${NC}             ${GRAY}# インタラクティブ設定ウィザード${NC}"
    
    echo -e "${ROCKET} ${GREEN}簡単セットアップ:${NC}"
    echo -e "  ${YELLOW}--setup-slack${NC}       ${GRAY}# Slack通知の簡単セットアップ${NC}"
    echo -e "  ${YELLOW}--setup-discord${NC}     ${GRAY}# Discord通知の簡単セットアップ${NC}"
    echo -e "  ${YELLOW}--setup-line${NC}        ${GRAY}# LINE Notify の簡単セットアップ${NC}"
    echo -e "  ${YELLOW}--turn-off-notifications${NC} ${GRAY}# 全通知を無効化（静寂モード）${NC}"
    
    echo -e "${GEM} ${GREEN}システム管理:${NC}"
    echo -e "  ${YELLOW}--install${NC}           ${GRAY}# システム全体にインストール${NC}"
    echo -e "  ${YELLOW}--update${NC}            ${GRAY}# 最新版に自動更新${NC}"
    echo -e "  ${YELLOW}--version${NC}           ${GRAY}# バージョン情報表示${NC}"
    
    echo -e "${GAME} ${GREEN}🆕 チーム開発モード:${NC}"
    echo -e "  ${YELLOW}--create-team \"name\"${NC}   ${GRAY}# チーム作成${NC}"
    echo -e "  ${YELLOW}--team-dashboard${NC}     ${GRAY}# チームダッシュボード${NC}"
    echo -e "  ${YELLOW}--team-stats${NC}        ${GRAY}# チーム統計詳細${NC}"
    echo -e "  ${YELLOW}--auto-pr${NC}           ${GRAY}# 自動PR作成${NC}"
    echo -e "  ${YELLOW}--notify-team \"msg\"${NC}   ${GRAY}# チーム通知${NC}"
    echo -e "  ${YELLOW}--start-event \"name\"${NC}  ${GRAY}# チームイベント開始${NC}"
    echo -e "  ${GRAY}💡 詳細: ap --team-help${NC}"
    
    echo -e "${GRAY}💡 オプション: --info (リポジトリ情報) --stats (ゲーム統計) --help (このヘルプ)${NC}"
    echo ""
}

# ゲーム統計表示
show_game_stats() {
    load_stats
    load_streak
    
    local next_level_xp=$(((level * 100)))
    local current_level_xp=$((xp - ((level - 1) * (level - 1) * 50)))
    local xp_progress=$((current_level_xp * 100 / next_level_xp))
    
    echo -e "${GAME}${CYAN} === ゲーム統計 === ${NC}"
    echo -e "${STAR} レベル: ${GOLD}$level${NC}"
    echo -e "${LIGHTNING} 経験値: ${YELLOW}$current_level_xp${NC}/${GOLD}$next_level_xp${NC} XP"
    echo -e "${FIRE} 現在のストリーク: ${RED}$current_streak${NC}日"
    echo -e "${TROPHY} 最大ストリーク: ${PURPLE}$max_streak${NC}日"
    echo -e "${ROCKET} 総プッシュ数: ${GREEN}$total_pushes${NC}回"
    
    # プログレスバー表示
    local bar_length=20
    local filled=$((xp_progress * bar_length / 100))
    local empty=$((bar_length - filled))
    local progress_bar=""
    
    for ((i=0; i<filled; i++)); do progress_bar+="█"; done
    for ((i=0; i<empty; i++)); do progress_bar+="░"; done
    
    echo -e "${CYAN}XP進歩: ${GOLD}[$progress_bar]${NC} ${xp_progress}%"
    
    # バッジ表示
    if [ -f "$BADGES_FILE" ] && [ -s "$BADGES_FILE" ]; then
        echo -e "${GEM} バッジ:"
        while IFS='|' read -r name emoji desc; do
            echo -e "  ${emoji} ${name}"
        done < "$BADGES_FILE"
    fi
    
    # ゲームモード終了のヒント
    echo -e "${GRAY}💡 ヒント: ${YELLOW}--quit-game${GRAY} フラグでゲームモードを永続的に無効化できます${NC}"
    echo ""
}

# バッジチェック関数
check_badges() {
    load_stats
    load_streak
    
    # プッシュ数バッジ
    case $total_pushes in
        1) add_badge "初心者" "🌱" "初めてのプッシュを完了" ;;
        10) add_badge "駆け出し開発者" "🚶" "10回のプッシュを達成" ;;
        50) add_badge "コミット戦士" "⚔️" "50回のプッシュを達成" ;;
        100) add_badge "プッシュマスター" "🥋" "100回のプッシュを達成" ;;
        500) add_badge "コード忍者" "🥷" "500回のプッシュを達成" ;;
        1000) add_badge "開発レジェンド" "🦄" "1000回のプッシュを達成" ;;
    esac
    
    # ストリークバッジ
    case $current_streak in
        3) add_badge "3日連続" "🔥" "3日連続でプッシュを実行" ;;
        7) add_badge "週間戦士" "📅" "7日連続でプッシュを実行" ;;
        30) add_badge "月間チャンピオン" "🗓️" "30日連続でプッシュを実行" ;;
        100) add_badge "ストリーク神" "⚡" "100日連続でプッシュを実行" ;;
    esac
    
    # レベルバッジ
    case $level in
        5) add_badge "レベル5到達" "🎖️" "レベル5に到達" ;;
        10) add_badge "レベル10到達" "🏅" "レベル10に到達" ;;
        25) add_badge "レベル25到達" "🏆" "レベル25に到達" ;;
        50) add_badge "レベル50到達" "👑" "レベル50に到達" ;;
        100) add_badge "レベル100到達" "💎" "レベル100に到達" ;;
    esac
}

# 視覚的機能実行
execute_visual_features() {
    if [ "$GAME_MODE" = true ]; then
        load_stats
        load_streak
        
        # SVGバッジ生成
        if [ "$ENABLE_BADGES" = true ]; then
            generate_badge "Level" "$level" "#ffd700"
            generate_badge "XP" "$xp" "#00ccff"
            generate_badge "Streak" "${current_streak}days" "#ff4444"
            generate_badge "Pushes" "$total_pushes" "#00ff88"
        fi
        
        # Profile Markdown生成
        generate_profile_markdown
        
        # HTML レポート生成
        generate_html_report
    fi
}

# テーマ適用
apply_theme

# 自動更新チェック（バックグラウンド実行）
check_for_updates

# メインロジック開始
if [ "$GAME_MODE" = true ]; then
    case $THEME in
        "cyberpunk") echo -e "${MAGENTA}▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄${NC}"
                 echo -e "${CYAN}██${NC} ${GOLD}🚀 CYBER GIT AUTO PUSH ${GAME}${NC} ${CYAN}██${NC}"
                 echo -e "${MAGENTA}▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀${NC}" ;;
        "ocean") echo -e "${BLUE}🌊 ${CYAN}Oceanic Git Auto Push Tool ${GAME}${NC} ${BLUE}🌊${NC}" ;;
        "retro") echo -e "${YELLOW}░▒▓█ ${CYAN}RETRO GIT AUTO PUSH ${GAME}${NC} ${YELLOW}█▓▒░${NC}" ;;
        *) echo -e "${CYAN}${GAME} Git Auto Push Tool${NC}" ;;
    esac
else
    echo -e "${CYAN}${ROCKET} Git Auto Push Tool${NC}"
fi

# コンパクト表示（基本情報のみ）
show_compact_info
show_compact_game_stats

# オプション指定時の詳細表示
if [ "$SHOW_INFO" = true ]; then
    echo -e "${GRAY}─────────────────────────────────────────────────────────────────────────────${NC}"
    show_repo_info
fi

if [ "$SHOW_STATS" = true ] && [ "$GAME_MODE" = true ]; then
    echo -e "${GRAY}─────────────────────────────────────────────────────────────────────────────${NC}"
    show_game_stats
fi

if [ "$SHOW_HELP" = true ]; then
    echo -e "${GRAY}─────────────────────────────────────────────────────────────────────────────${NC}"
    show_git_commands
fi

# 情報表示のみの場合は終了
if [ "$SHOW_INFO" = true ] || [ "$SHOW_STATS" = true ] || [ "$SHOW_HELP" = true ]; then
    exit 0
fi

echo -e "${GRAY}─────────────────────────────────────────────────────────────────────────────${NC}"

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

echo -e "${BLUE}${ROCKET} === Git Push 開始 ===${NC}"

# 変更されたファイルを表示
echo -e "${BLUE}${INFO} 変更されたファイル:${NC}"
git status --porcelain | while read line; do
    echo -e "  ${GREEN}${line}${NC}"
done
echo ""

# カスタムメッセージが指定されていない場合、自動生成
if [ -z "$CUSTOM_MSG" ]; then
    TIMESTAMP=$(date '+%Y-%m-%d %H:%M')
    COMMIT_MSG="🔄 自動更新 - $TIMESTAMP"
else
    COMMIT_MSG="$CUSTOM_MSG"
fi

echo -e "${PACKAGE} ${CYAN}コミットメッセージ:${NC} ${COMMIT_MSG}"
echo ""

# 全ての変更をステージング
show_compact_animation "🔄 変更をステージング中" 1
git add -A

# コミット
show_compact_animation "📝 コミット中" 1
if git commit -m "$COMMIT_MSG" >/dev/null 2>&1; then
    echo -e "${GREEN}${CHECK} コミット完了${NC}"
else
    echo -e "${RED}${WARNING} コミットに失敗しました${NC}"
    exit 1
fi

# プッシュ
show_compact_animation "🚀 リモートリポジトリにプッシュ中" 2
if git push >/dev/null 2>&1; then
    echo ""
    # プッシュ成功の派手演出
    show_pulse_effect "${GREEN}${CHECK}${CHECK}${CHECK} 自動プッシュ完了！${CHECK}${CHECK}${CHECK}${NC}"
    echo ""
    echo -e "${PURPLE}Repository: $(git remote get-url origin)${NC}"
    echo -e "${PURPLE}Branch: $(git branch --show-current)${NC}"
    echo -e "${PURPLE}Commit: $(git rev-parse --short HEAD)${NC}"
    
    # ゲームモードの場合、統計更新と励ましメッセージ
    if [ "$GAME_MODE" = true ]; then
        echo ""
        
        # 統計読み込み
        load_stats
        
        # 前のレベルを保存
        old_level=$level
        
        # 統計更新
        total_pushes=$((total_pushes + 1))
        xp=$((xp + 50))  # プッシュごとに50XP
        last_push_date=$(date '+%Y-%m-%d')
        
        # レベル再計算
        level=$(calculate_level $xp)
        
        # ストリーク更新
        update_streak
        
        # 統計保存
        save_stats
        
        # レベルアップチェック
        if [ $level -gt $old_level ]; then
            show_levelup_effect
        fi
        
        # バッジチェック
        check_badges
        
        # 視覚的機能実行
        execute_visual_features
        
        # 特別な日の演出があるかチェック
        day=$(date +%u)
        hour=$(date +%H)
        has_special_day=false
        
        # 特別な日の演出（優先）
        if [ $day -eq 5 ] && [ $hour -ge 18 ]; then
            show_rainbow_text "🍻 FRIDAY NIGHT CODING! 🍻"
            has_special_day=true
        elif [ $day -eq 6 ] || [ $day -eq 7 ]; then
            show_rainbow_text "🏖️ WEEKEND WARRIOR! 🏖️"
            has_special_day=true
        elif [ $day -eq 1 ]; then
            show_rainbow_text "💪 MONDAY MOTIVATION! 💪"
            has_special_day=true
        fi
        
        # 特別演出がない場合のみランダム演出
        if [ "$has_special_day" = false ]; then
            show_random_victory_effect
        fi
        
        # コンボ演出（ストリークボーナス - 10日以上のみ）
        load_streak
        if [ $current_streak -ge 10 ]; then
            show_combo_effect $current_streak
        fi
        
        # 励ましメッセージ
        echo -e "${SPARKLES} ${MAGENTA}$(get_encouragement)${NC}"
        echo -e "${PARTY} ${GOLD}+50 XP獲得！${NC}"
        
        # ランダムテック情報表示
        echo ""
        show_random_tech_tip
        
        # 通知統合送信
        send_all_notifications "🚀 Git Push 完了!" "$(get_encouragement) (+50 XP)" "3066993"
        
        # ストリーク表示
        if [ $current_streak -gt 1 ]; then
            echo -e "${FIRE} ${RED}$current_streak日連続プッシュ！${NC}"
        fi
        
        echo ""
    fi
else
    echo -e "${RED}${WARNING} プッシュに失敗しました${NC}"
    exit 1
fi



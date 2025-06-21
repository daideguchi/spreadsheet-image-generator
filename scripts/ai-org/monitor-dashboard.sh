#!/bin/bash

# Claude Code AI組織 - 監視ダッシュボード
# 複数ワーカーの同時作業を監視

set -e

SESSION_NAME="claude_ai_org"
MONITOR_SESSION="claude_monitor"

# 色付き出力
print_info() { echo -e "\033[0;34m[INFO]\033[0m $1"; }
print_success() { echo -e "\033[0;32m[SUCCESS]\033[0m $1"; }
print_error() { echo -e "\033[0;31m[ERROR]\033[0m $1"; }
print_warning() { echo -e "\033[0;33m[WARNING]\033[0m $1"; }

# ヘルプ表示
show_help() {
    cat << EOF
Claude Code AI組織 - 監視ダッシュボード

使用方法:
  $0 [コマンド]

コマンド:
  create-split     4分割監視画面を作成
  show-dashboard   リアルタイムダッシュボード表示
  monitor-logs     ログ監視開始
  watch-files      ファイル変更監視
  performance      パフォーマンス監視
  help             このヘルプを表示

分割画面構成:
  ┌──────────────┬──────────────┐
  │  🏗️ Architect │  ⚙️ Backend   │
  │  (設計・管理)  │  (GAS・API)   │
  ├──────────────┼──────────────┤
  │  🎨 Frontend  │  🧪 QA + 🚀   │
  │  (UI/UX)     │  (テスト+運用) │
  └──────────────┴──────────────┘

例:
  $0 create-split    # 4分割監視画面作成
  $0 show-dashboard  # ダッシュボード表示
  $0 monitor-logs    # ログ監視開始
EOF
}

# tmuxセッション存在確認
check_session() {
    if ! tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
        print_error "AI組織セッションが見つかりません"
        echo "開始方法: ./scripts/ai-org/claude-org.sh start"
        exit 1
    fi
}

# 4分割監視画面作成
create_split_monitor() {
    check_session
    
    print_info "4分割監視画面を作成します..."
    
    # 既存の監視セッションを削除
    if tmux has-session -t "$MONITOR_SESSION" 2>/dev/null; then
        tmux kill-session -t "$MONITOR_SESSION"
    fi
    
    # 新しい監視セッション作成
    tmux new-session -d -s "$MONITOR_SESSION" -n "monitor"
    
    # 最初のペインでArchitect監視
    tmux send-keys -t "$MONITOR_SESSION:monitor.0" "echo '🏗️ ARCHITECT MONITOR'" Enter
    tmux send-keys -t "$MONITOR_SESSION:monitor.0" "echo '═══════════════════════════════════════'" Enter
    tmux send-keys -t "$MONITOR_SESSION:monitor.0" "echo 'ロール: 全体設計・技術判断・チーム調整'" Enter
    tmux send-keys -t "$MONITOR_SESSION:monitor.0" "echo '監視開始: $(date)'" Enter
    tmux send-keys -t "$MONITOR_SESSION:monitor.0" "echo ''" Enter
    
    # 縦分割でBackend監視
    tmux split-window -t "$MONITOR_SESSION:monitor" -h
    tmux send-keys -t "$MONITOR_SESSION:monitor.1" "echo '⚙️ BACKEND MONITOR'" Enter
    tmux send-keys -t "$MONITOR_SESSION:monitor.1" "echo '═══════════════════════════════════════'" Enter
    tmux send-keys -t "$MONITOR_SESSION:monitor.1" "echo 'ロール: GAS開発・API連携・データ処理'" Enter
    tmux send-keys -t "$MONITOR_SESSION:monitor.1" "echo '監視開始: $(date)'" Enter
    tmux send-keys -t "$MONITOR_SESSION:monitor.1" "echo ''" Enter
    
    # 左下にFrontend監視
    tmux split-window -t "$MONITOR_SESSION:monitor.0" -v
    tmux send-keys -t "$MONITOR_SESSION:monitor.2" "echo '🎨 FRONTEND MONITOR'" Enter
    tmux send-keys -t "$MONITOR_SESSION:monitor.2" "echo '═══════════════════════════════════════'" Enter
    tmux send-keys -t "$MONITOR_SESSION:monitor.2" "echo 'ロール: UI/UX開発・サイドバー・ユーザビリティ'" Enter
    tmux send-keys -t "$MONITOR_SESSION:monitor.2" "echo '監視開始: $(date)'" Enter
    tmux send-keys -t "$MONITOR_SESSION:monitor.2" "echo ''" Enter
    
    # 右下にQA + DevOps監視
    tmux split-window -t "$MONITOR_SESSION:monitor.1" -v
    tmux send-keys -t "$MONITOR_SESSION:monitor.3" "echo '🧪 QA + 🚀 DEVOPS MONITOR'" Enter
    tmux send-keys -t "$MONITOR_SESSION:monitor.3" "echo '═══════════════════════════════════════'" Enter
    tmux send-keys -t "$MONITOR_SESSION:monitor.3" "echo 'ロール: テスト・品質保証・デプロイ・運用'" Enter
    tmux send-keys -t "$MONITOR_SESSION:monitor.3" "echo '監視開始: $(date)'" Enter
    tmux send-keys -t "$MONITOR_SESSION:monitor.3" "echo ''" Enter
    
    # レイアウトを均等に調整
    tmux select-layout -t "$MONITOR_SESSION:monitor" tiled
    
    print_success "4分割監視画面を作成しました"
    echo ""
    echo "📋 接続方法:"
    echo "  tmux attach -t $MONITOR_SESSION"
    echo ""
    echo "🎛️ 操作方法:"
    echo "  Ctrl+b + ↑↓←→  # ペイン間移動"
    echo "  Ctrl+b + z      # ペイン最大化/復元"
    echo "  Ctrl+b + d      # セッションからデタッチ"
    echo ""
}

# リアルタイムダッシュボード表示
show_dashboard() {
    echo ""
    echo "📊 Claude Code AI組織 - リアルタイムダッシュボード"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    # セッション情報
    if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
        print_success "🔄 AI組織セッション: 実行中"
        echo ""
        echo "👥 ワーカー状況:"
        tmux list-windows -t "$SESSION_NAME" -F "  #{window_name}: #{?window_active,✅ アクティブ,⏸️ 待機中}"
        echo ""
    else
        print_warning "❌ AI組織セッション: 停止中"
    fi
    
    # 監視セッション情報
    if tmux has-session -t "$MONITOR_SESSION" 2>/dev/null; then
        print_success "📺 監視セッション: 実行中"
        echo "  接続方法: tmux attach -t $MONITOR_SESSION"
    else
        print_warning "📺 監視セッション: 未作成"
        echo "  作成方法: $0 create-split"
    fi
    echo ""
    
    # プロジェクト状況
    echo "📁 プロジェクト状況:"
    echo "  - 最終更新: $(stat -f %Sm -t '%Y-%m-%d %H:%M:%S' . 2>/dev/null || date)"
    echo "  - ソースファイル: $(find . -name "*.gs" -o -name "*.html" | grep -v backup | wc -l | tr -d ' ')個"
    echo "  - 設定ファイル: $(ls -1 *.json 2>/dev/null | wc -l | tr -d ' ')個"
    
    # 最近の変更
    echo ""
    echo "📝 最近の変更 (直近5ファイル):"
    find . -type f \( -name "*.gs" -o -name "*.html" -o -name "*.md" -o -name "*.sh" \) \
        | grep -v ".git" | grep -v "backup" \
        | xargs ls -lt 2>/dev/null | head -5 \
        | awk '{print "  " $9 " (" $6 " " $7 " " $8 ")"}'
    echo ""
    
    # システム情報
    echo "💻 システム情報:"
    echo "  - tmux セッション: $(tmux list-sessions 2>/dev/null | wc -l | tr -d ' ')個"
    echo "  - 実行時刻: $(date '+%Y-%m-%d %H:%M:%S')"
    echo "  - 作業ディレクトリ: $(pwd)"
    echo ""
}

# ログ監視開始
monitor_logs() {
    print_info "ログ監視を開始します..."
    
    # ログディレクトリ作成
    mkdir -p logs
    
    # 各ワーカーのログファイルを作成
    touch logs/architect.log logs/backend.log logs/frontend.log logs/qa.log logs/devops.log
    
    echo ""
    echo "📊 ログファイル監視開始:"
    echo "  - logs/architect.log  (🏗️ 設計・管理)"
    echo "  - logs/backend.log    (⚙️ GAS・API)"
    echo "  - logs/frontend.log   (🎨 UI/UX)"
    echo "  - logs/qa.log         (🧪 テスト)"
    echo "  - logs/devops.log     (🚀 運用)"
    echo ""
    
    # マルチタイル監視
    if command -v tail >/dev/null 2>&1; then
        print_info "リアルタイムログ監視を開始..."
        echo "終了するには Ctrl+C を押してください"
        echo ""
        
        # 並行でログ監視
        tail -f logs/*.log 2>/dev/null &
        TAIL_PID=$!
        
        # 1秒間隔でログサマリー表示
        while true; do
            sleep 5
            echo "--- ログサマリー $(date '+%H:%M:%S') ---"
            for log in logs/*.log; do
                if [[ -s "$log" ]]; then
                    echo "$(basename $log): $(wc -l < $log) 行"
                fi
            done
            echo ""
        done
        
        # クリーンアップ
        kill $TAIL_PID 2>/dev/null || true
    else
        print_warning "tail コマンドが利用できません"
    fi
}

# ファイル変更監視
watch_files() {
    print_info "ファイル変更監視を開始します..."
    
    echo ""
    echo "🔍 監視対象ファイル:"
    echo "  - Code.gs (Google Apps Script メインロジック)"
    echo "  - Sidebar.html (UI/フロントエンド)"
    echo "  - *.md (ドキュメント)"
    echo "  - *.sh (スクリプト)"
    echo ""
    
    # 初期ファイル状態を記録
    find . -name "*.gs" -o -name "*.html" -o -name "*.md" -o -name "*.sh" \
        | grep -v ".git" | grep -v "backup" \
        | xargs ls -l > /tmp/file_state_before.txt 2>/dev/null
    
    print_info "5秒間隔でファイル変更をチェック中..."
    echo "終了するには Ctrl+C を押してください"
    echo ""
    
    while true; do
        sleep 5
        
        # 現在のファイル状態をチェック
        find . -name "*.gs" -o -name "*.html" -o -name "*.md" -o -name "*.sh" \
            | grep -v ".git" | grep -v "backup" \
            | xargs ls -l > /tmp/file_state_after.txt 2>/dev/null
        
        # 変更を検出
        if ! diff /tmp/file_state_before.txt /tmp/file_state_after.txt >/dev/null 2>&1; then
            echo "🔄 ファイル変更検出: $(date '+%H:%M:%S')"
            diff /tmp/file_state_before.txt /tmp/file_state_after.txt | grep "^>" | awk '{print "  変更: " $10}'
            echo ""
            
            # 状態を更新
            cp /tmp/file_state_after.txt /tmp/file_state_before.txt
        fi
    done
}

# パフォーマンス監視
performance_monitor() {
    print_info "パフォーマンス監視を開始します..."
    
    echo ""
    echo "📈 監視項目:"
    echo "  - tmux セッション数"
    echo "  - ファイル数・サイズ"
    echo "  - 最新更新時刻"
    echo ""
    
    while true; do
        clear
        echo "🔄 パフォーマンス監視 - $(date '+%Y-%m-%d %H:%M:%S')"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        
        # tmux情報
        local session_count=$(tmux list-sessions 2>/dev/null | wc -l | tr -d ' ')
        echo "🖥️  tmux セッション: ${session_count}個"
        
        if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
            local window_count=$(tmux list-windows -t "$SESSION_NAME" | wc -l | tr -d ' ')
            echo "   └─ AI組織ウィンドウ: ${window_count}個"
        fi
        echo ""
        
        # ファイル統計
        local gs_files=$(find . -name "*.gs" | grep -v backup | wc -l | tr -d ' ')
        local html_files=$(find . -name "*.html" | grep -v backup | wc -l | tr -d ' ')
        local md_files=$(find . -name "*.md" | wc -l | tr -d ' ')
        
        echo "📁 ファイル統計:"
        echo "   - Google Apps Script: ${gs_files}個"
        echo "   - HTML/UI: ${html_files}個"
        echo "   - ドキュメント: ${md_files}個"
        echo ""
        
        # ディスクサイズ
        local total_size=$(du -sh . 2>/dev/null | awk '{print $1}')
        echo "💾 プロジェクトサイズ: ${total_size}"
        echo ""
        
        # 最新アクティビティ
        echo "⏰ 最新アクティビティ:"
        find . -type f \( -name "*.gs" -o -name "*.html" -o -name "*.md" \) \
            | grep -v ".git" | grep -v "backup" \
            | xargs ls -lt 2>/dev/null | head -3 \
            | awk '{print "   " $9 " (" $6 " " $7 " " $8 ")"}'
        echo ""
        
        echo "更新間隔: 3秒 | 終了: Ctrl+C"
        sleep 3
    done
}

# メイン処理
main() {
    case "${1:-help}" in
        "create-split")
            create_split_monitor
            ;;
        "show-dashboard"|"dashboard")
            show_dashboard
            ;;
        "monitor-logs"|"logs")
            monitor_logs
            ;;
        "watch-files"|"watch")
            watch_files
            ;;
        "performance"|"perf")
            performance_monitor
            ;;
        "help"|"--help"|"-h")
            show_help
            ;;
        *)
            print_error "不明なコマンド: $1"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# スクリプト実行
main "$@"
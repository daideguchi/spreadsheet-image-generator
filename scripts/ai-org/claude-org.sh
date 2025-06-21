#!/bin/bash

# Claude Code AI組織管理スクリプト
# 画像生成ツールプロジェクト用AI組織設定

set -e

# 設定
PROJECT_NAME="image_gen"
SESSION_NAME="claude_ai_org"
ROLES_FILE=".cursor/ai-org/ROLES.md"

# 色付き出力
print_info() {
    echo -e "\033[0;34m[INFO]\033[0m $1"
}

print_success() {
    echo -e "\033[0;32m[SUCCESS]\033[0m $1"
}

print_error() {
    echo -e "\033[0;31m[ERROR]\033[0m $1"
}

print_warning() {
    echo -e "\033[0;33m[WARNING]\033[0m $1"
}

# ヘルプ表示
show_help() {
    cat << EOF
Claude Code AI組織管理ツール

使用方法:
  $0 [コマンド] [オプション]

コマンド:
  analyze           プロジェクト分析を実行
  start            AI組織セッションを開始
  stop             AI組織セッションを停止
  status           現在の状況を表示
  assign <role> <task>  ロールにタスクを割り当て
  progress         進捗状況を確認
  help             このヘルプを表示

例:
  $0 analyze                    # プロジェクト分析
  $0 start                      # AI組織開始
  $0 assign frontend "UIを改善"  # フロントエンド担当にタスク割り当て
  $0 status                     # 状況確認

AI組織ロール:
  - architect: アーキテクト（設計・全体管理）
  - backend: バックエンド開発者（GAS, API）
  - frontend: フロントエンド開発者（HTML, CSS, JS）
  - qa: QA・テスト担当
  - devops: DevOps・デプロイ管理
EOF
}

# プロジェクト分析
analyze_project() {
    print_info "プロジェクト分析を開始します..."
    
    echo ""
    echo "🔍 プロジェクト分析結果"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    # ファイル分析
    echo "📁 ファイル構成:"
    find . -type f -name "*.gs" -o -name "*.html" -o -name "*.js" -o -name "*.json" | \
        grep -v ".git" | grep -v "backup" | head -10 | sed 's/^/  /'
    echo ""
    
    # 技術スタック分析
    echo "🛠️  技術スタック:"
    echo "  - Google Apps Script (V8)"
    echo "  - OpenAI DALL-E API"
    echo "  - HTML/CSS/JavaScript UI"
    echo "  - Google Spreadsheets"
    echo ""
    
    # コード行数
    if command -v wc >/dev/null 2>&1; then
        local total_lines=$(find . -name "*.gs" -o -name "*.html" -o -name "*.js" | \
            grep -v ".git" | grep -v "backup" | xargs wc -l 2>/dev/null | tail -1 | awk '{print $1}' || echo "不明")
        echo "📊 総コード行数: ${total_lines:-不明}"
    fi
    echo ""
    
    # 推奨AI組織構成
    echo "👥 推奨AI組織構成（5名体制）:"
    echo "  🏗️  Architect     - 全体設計・アーキテクチャ管理"
    echo "  ⚙️  Backend Dev   - GAS開発・API連携"
    echo "  🎨 Frontend Dev  - UI/UX・サイドバー開発"
    echo "  🧪 QA Engineer   - テスト・品質管理"
    echo "  🚀 DevOps        - デプロイ・運用管理"
    echo ""
    
    # タスク分析
    echo "📋 現在のタスク状況:"
    if [[ -f "todo.md" ]]; then
        local todo_count=$(grep -c "^-\|^*\|^\d" todo.md 2>/dev/null || echo "0")
        echo "  - TODOファイル: ${todo_count}項目"
    fi
    
    if [[ -f "README.md" ]]; then
        echo "  - ドキュメント: 整備済み"
    fi
    
    echo "  - 設定ファイル: $(ls *.json 2>/dev/null | wc -l)個"
    echo ""
    
    print_success "プロジェクト分析完了"
    echo ""
    echo "次のステップ: $0 start"
}

# tmuxセッション確認
check_tmux() {
    if ! command -v tmux >/dev/null 2>&1; then
        print_error "tmuxがインストールされていません"
        echo "インストール方法:"
        echo "  macOS: brew install tmux"
        echo "  Ubuntu/Debian: sudo apt install tmux"
        exit 1
    fi
}

# AI組織セッション開始
start_ai_org() {
    check_tmux
    
    print_info "AI組織セッションを開始します..."
    
    # 既存セッションチェック
    if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
        print_warning "セッション '$SESSION_NAME' は既に存在します"
        read -p "既存セッションに接続しますか？ (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            tmux attach-session -t "$SESSION_NAME"
            return
        else
            print_info "新しいセッションを作成します..."
            tmux kill-session -t "$SESSION_NAME" 2>/dev/null || true
        fi
    fi
    
    # ロールファイルの作成
    create_roles_file
    
    # tmuxセッション作成
    tmux new-session -d -s "$SESSION_NAME" -n "architect"
    
    # 各ロール用のウィンドウを作成
    tmux new-window -t "$SESSION_NAME" -n "backend"
    tmux new-window -t "$SESSION_NAME" -n "frontend" 
    tmux new-window -t "$SESSION_NAME" -n "qa"
    tmux new-window -t "$SESSION_NAME" -n "devops"
    
    # 各ウィンドウの初期化
    tmux send-keys -t "$SESSION_NAME:architect" "echo '🏗️  Architect - 設計・全体管理'" Enter
    tmux send-keys -t "$SESSION_NAME:architect" "echo 'ロール: プロジェクト全体のアーキテクチャ設計と管理'" Enter
    tmux send-keys -t "$SESSION_NAME:architect" "echo 'タスク: 設計レビュー、技術選定、チーム調整'" Enter
    
    tmux send-keys -t "$SESSION_NAME:backend" "echo '⚙️  Backend Developer - GAS・API開発'" Enter
    tmux send-keys -t "$SESSION_NAME:backend" "echo 'ロール: Google Apps Script開発、OpenAI API連携'" Enter
    tmux send-keys -t "$SESSION_NAME:backend" "echo 'タスク: Code.gs開発、エラーハンドリング、パフォーマンス最適化'" Enter
    
    tmux send-keys -t "$SESSION_NAME:frontend" "echo '🎨 Frontend Developer - UI/UX開発'" Enter
    tmux send-keys -t "$SESSION_NAME:frontend" "echo 'ロール: サイドバーUI、スプレッドシート連携'" Enter
    tmux send-keys -t "$SESSION_NAME:frontend" "echo 'タスク: Sidebar.html開発、CSS改善、ユーザビリティ向上'" Enter
    
    tmux send-keys -t "$SESSION_NAME:qa" "echo '🧪 QA Engineer - テスト・品質管理'" Enter
    tmux send-keys -t "$SESSION_NAME:qa" "echo 'ロール: テスト設計、品質保証、バグ発見'" Enter
    tmux send-keys -t "$SESSION_NAME:qa" "echo 'タスク: テストケース作成、動作確認、レポート作成'" Enter
    
    tmux send-keys -t "$SESSION_NAME:devops" "echo '🚀 DevOps Engineer - デプロイ・運用'" Enter
    tmux send-keys -t "$SESSION_NAME:devops" "echo 'ロール: デプロイメント、監視、インフラ管理'" Enter
    tmux send-keys -t "$SESSION_NAME:devops" "echo 'タスク: autopush.sh改善、clasp設定、運用監視'" Enter
    
    # architect ウィンドウをアクティブに
    tmux select-window -t "$SESSION_NAME:architect"
    
    print_success "AI組織セッション '$SESSION_NAME' を開始しました"
    echo ""
    echo "📋 利用可能なコマンド:"
    echo "  tmux attach -t $SESSION_NAME     # セッションに接続"
    echo "  tmux list-windows -t $SESSION_NAME  # ウィンドウ一覧"
    echo "  $0 status                        # 状況確認"
    echo "  $0 assign <role> <task>          # タスク割り当て"
    echo ""
    
    # 自動接続オプション
    read -p "セッションに接続しますか？ (Y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        tmux attach-session -t "$SESSION_NAME"
    fi
}

# ロールファイルの作成
create_roles_file() {
    mkdir -p "$(dirname "$ROLES_FILE")"
    
    cat > "$ROLES_FILE" << 'EOF'
# Claude Code AI組織 - ロール定義

## プロジェクト: Google Apps Script 画像生成ツール

### 組織構成（5名体制）

#### 🏗️ Architect（アーキテクト）
**責任範囲:**
- プロジェクト全体のアーキテクチャ設計
- 技術選定と技術債務管理
- チーム間の調整と意思決定
- コードレビューと品質基準設定

**主なタスク:**
- システム設計書の作成・更新
- 技術スタックの選定と評価
- パフォーマンス要件の定義
- セキュリティ要件の策定

#### ⚙️ Backend Developer（バックエンド開発者）
**責任範囲:**
- Google Apps Script開発
- OpenAI API連携実装
- データ処理ロジック
- エラーハンドリング

**主なタスク:**
- Code.gsの開発・保守
- API統合とレート制限対応
- スプレッドシート操作ロジック
- バッチ処理の最適化

#### 🎨 Frontend Developer（フロントエンド開発者）
**責任範囲:**
- ユーザーインターフェース開発
- サイドバーUI実装
- ユーザビリティ改善
- レスポンシブデザイン

**主なタスク:**
- Sidebar.htmlの開発・改善
- CSS/JavaScriptの実装
- ユーザーフィードバック対応
- UI/UXの継続的改善

#### 🧪 QA Engineer（品質保証）
**責任範囲:**
- テスト設計・実行
- 品質基準の定義
- バグ発見・報告
- リリース品質の保証

**主なタスク:**
- テストケースの作成・実行
- 動作確認とバグレポート
- ユーザーシナリオテスト
- 品質メトリクスの監視

#### 🚀 DevOps Engineer（DevOps）
**責任範囲:**
- デプロイメント自動化
- 開発環境整備
- 監視・ログ管理
- 運用効率化

**主なタスク:**
- autopush.shの改善
- clasp設定とCI/CD構築
- ログ監視システム構築
- バックアップ・復旧手順整備

### 連携フロー

1. **Architect** が要件定義と設計を作成
2. **Backend** がCore機能を実装
3. **Frontend** がUI/UXを実装
4. **QA** がテスト・検証を実行
5. **DevOps** がデプロイ・運用を管理

### コミュニケーション

- **日次**: 各ロールの進捗共有
- **週次**: アーキテクトによる全体レビュー
- **リリース前**: QAによる最終確認

### 成果物

- **Architect**: 設計書、技術仕様
- **Backend**: Code.gs、API連携
- **Frontend**: Sidebar.html、UI
- **QA**: テストレポート、品質指標
- **DevOps**: デプロイスクリプト、運用手順
EOF

    print_success "ロールファイルを作成しました: $ROLES_FILE"
}

# セッション停止
stop_ai_org() {
    print_info "AI組織セッションを停止します..."
    
    if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
        tmux kill-session -t "$SESSION_NAME"
        print_success "セッション '$SESSION_NAME' を停止しました"
    else
        print_warning "セッション '$SESSION_NAME' は存在しません"
    fi
}

# 状況確認
show_status() {
    echo ""
    echo "📊 Claude Code AI組織 - 状況確認"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    # tmuxセッション状況
    if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
        print_success "AI組織セッション: 実行中"
        echo ""
        echo "🪟 アクティブなウィンドウ:"
        tmux list-windows -t "$SESSION_NAME" -F "  #{window_name}: #{window_active}" | \
            sed 's/1$/✅ アクティブ/' | sed 's/0$/⏸️  待機中/'
    else
        print_warning "AI組織セッション: 停止中"
        echo "  開始方法: $0 start"
    fi
    echo ""
    
    # プロジェクト状況
    echo "📁 プロジェクト状況:"
    echo "  - 設定ファイル: $(ls -1 *.json 2>/dev/null | wc -l | tr -d ' ')個"
    echo "  - ソースファイル: $(find . -name "*.gs" -o -name "*.html" | grep -v ".git" | wc -l | tr -d ' ')個"
    echo "  - ドキュメント: $(ls -1 *.md 2>/dev/null | wc -l | tr -d ' ')個"
    
    if [[ -f "$ROLES_FILE" ]]; then
        echo "  - AI組織ロール: 設定済み"
    else
        echo "  - AI組織ロール: 未設定"
    fi
    echo ""
    
    # 直近のタスク
    echo "📋 推奨次アクション:"
    if ! tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
        echo "  1. $0 start    # AI組織セッション開始"
    else
        echo "  1. tmux attach -t $SESSION_NAME    # セッションに接続"
    fi
    echo "  2. $0 assign <role> <task>         # タスク割り当て"
    echo "  3. $0 progress                     # 進捗確認"
    echo ""
}

# タスク割り当て
assign_task() {
    local role="$1"
    local task="$2"
    
    if [[ -z "$role" || -z "$task" ]]; then
        print_error "使用方法: $0 assign <role> <task>"
        echo "利用可能なロール: architect, backend, frontend, qa, devops"
        return 1
    fi
    
    # ロール検証
    local valid_roles=("architect" "backend" "frontend" "qa" "devops")
    if [[ ! " ${valid_roles[@]} " =~ " ${role} " ]]; then
        print_error "無効なロール: $role"
        echo "利用可能なロール: ${valid_roles[*]}"
        return 1
    fi
    
    print_info "タスクを割り当て中: $role -> $task"
    
    # tmuxセッションが存在する場合、該当ウィンドウにタスクを送信
    if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
        tmux send-keys -t "$SESSION_NAME:$role" "clear" Enter
        tmux send-keys -t "$SESSION_NAME:$role" "echo '📋 新しいタスク: $task'" Enter
        tmux send-keys -t "$SESSION_NAME:$role" "echo '担当: $role | 割り当て時刻: $(date)'" Enter
        tmux send-keys -t "$SESSION_NAME:$role" "echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'" Enter
        
        print_success "タスクを $role に割り当てました"
        echo "確認方法: tmux attach -t $SESSION_NAME"
    else
        print_warning "AI組織セッションが開始されていません"
        echo "セッション開始: $0 start"
    fi
}

# 進捗確認
show_progress() {
    echo ""
    echo "📈 進捗状況"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    # ファイル更新状況
    echo "📁 最近更新されたファイル:"
    find . -name "*.gs" -o -name "*.html" -o -name "*.md" -o -name "*.json" | \
        grep -v ".git" | grep -v "backup" | \
        xargs ls -lt 2>/dev/null | head -5 | \
        awk '{print "  " $9 " (" $6 " " $7 " " $8 ")"}'
    echo ""
    
    # Git状況（存在する場合）
    if [[ -d ".git" ]]; then
        echo "🔄 Git状況:"
        local git_status=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
        local last_commit=$(git log -1 --format="%h %s" 2>/dev/null)
        echo "  - 変更ファイル数: ${git_status}個"
        echo "  - 最新コミット: ${last_commit}"
    fi
    echo ""
    
    # TODO分析
    if [[ -f "todo.md" ]]; then
        echo "📋 TODO状況:"
        local total_todos=$(grep -c "^-\|^*" todo.md 2>/dev/null || echo "0")
        local done_todos=$(grep -c "\[x\]" todo.md 2>/dev/null || echo "0")
        local pending_todos=$((total_todos - done_todos))
        
        echo "  - 総タスク数: ${total_todos}"
        echo "  - 完了: ${done_todos}"
        echo "  - 残り: ${pending_todos}"
        
        if [[ $total_todos -gt 0 ]]; then
            local progress=$((done_todos * 100 / total_todos))
            echo "  - 進捗率: ${progress}%"
        fi
    fi
    echo ""
}

# メイン処理
main() {
    case "${1:-help}" in
        "analyze")
            analyze_project
            ;;
        "start")
            start_ai_org
            ;;
        "stop")
            stop_ai_org
            ;;
        "status")
            show_status
            ;;
        "assign")
            assign_task "$2" "$3"
            ;;
        "progress")
            show_progress
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
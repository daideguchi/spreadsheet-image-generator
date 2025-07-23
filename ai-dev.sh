#!/bin/bash

# 2️⃣ AI Developer
# コード開発・テスト・デバッグ・ファイル監視

clear
echo "💻 AI Developer 起動中..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "👨‍💻 役割: コード開発・テスト・デバッグ"
echo "🔧 担当: ファイル監視・自動ビルド・品質チェック"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

LOG_FILE="ai-org-logs/dev-$(date +%Y%m%d-%H%M%S).log"
echo "📝 ログファイル: $LOG_FILE"

# ログ関数
log_dev() {
    echo "[$(date '+%H:%M:%S')] DEV: $1" | tee -a "$LOG_FILE"
}

# ファイル監視関数
watch_files() {
    log_dev "📁 ファイル監視開始"
    
    # macOSでfswatch使用（Homebrewでインストール: brew install fswatch）
    if command -v fswatch >/dev/null 2>&1; then
        log_dev "fswatch使用でファイル監視"
        fswatch -o . | while read f; do
            log_dev "ファイル変更検出"
            check_code_quality
        done &
    else
        # fallback: find使用
        log_dev "find使用でファイル監視（5秒間隔）"
        while true; do
            find . -name "*.gs" -o -name "*.html" -newer /tmp/ai-dev-lastcheck 2>/dev/null | while read file; do
                log_dev "変更検出: $file"
                check_code_quality "$file"
            done
            touch /tmp/ai-dev-lastcheck
            sleep 5
        done &
    fi
}

# コード品質チェック関数
check_code_quality() {
    local file="$1"
    log_dev "🔍 コード品質チェック: $file"
    
    if [[ "$file" == *.gs ]]; then
        # Google Apps Script構文チェック
        log_dev "GAS構文チェック"
        # 基本的な構文エラーチェック
        if grep -q "function.*{" "$file"; then
            log_dev "✅ 基本構文OK"
        else
            log_dev "⚠️ 構文要確認"
        fi
    fi
    
    if [[ "$file" == *.html ]]; then
        # HTML構文チェック
        log_dev "HTML構文チェック"
        if grep -q "<!DOCTYPE html>" "$file"; then
            log_dev "✅ HTML構造OK"
        else
            log_dev "⚠️ DOCTYPE要確認"
        fi
    fi
}

# 開発ダッシュボード
dev_dashboard() {
    while true; do
        clear
        echo "💻 AI Developer Dashboard"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "⏰ $(date '+%Y-%m-%d %H:%M:%S')"
        echo ""
        
        # コードファイル一覧
        echo "📄 Code Files:"
        find . -name "*.gs" -o -name "*.html" | head -10
        echo ""
        
        # 最近の変更
        echo "🔄 Recent Changes:"
        git log --oneline -5 2>/dev/null || echo "No git history"
        echo ""
        
        # ファイルサイズ
        echo "📊 File Sizes:"
        find . -name "*.gs" -o -name "*.html" -exec ls -lh {} \; | head -5
        echo ""
        
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "⌨️ Commands: [q]uit [c]heck [e]dit [t]est [w]atch [l]og"
        
        read -t 10 -n 1 cmd
        case $cmd in
            q) log_dev "開発監視終了"; break ;;
            c) 
                log_dev "コード品質チェック実行"
                check_code_quality "Code.gs"
                check_code_quality "Sidebar.html"
                read -p "Press Enter to continue..."
                ;;
            e)
                log_dev "ファイル編集"
                echo "編集するファイルを選択:"
                select file in *.gs *.html; do
                    if [ -n "$file" ]; then
                        log_dev "編集開始: $file"
                        nano "$file"
                        break
                    fi
                done
                ;;
            t)
                log_dev "テスト実行"
                echo "テスト機能は開発中..."
                read -p "Press Enter to continue..."
                ;;
            w)
                log_dev "ファイル監視開始"
                watch_files
                ;;
            l)
                log_dev "ログ確認"
                tail -20 "$LOG_FILE"
                read -p "Press Enter to continue..."
                ;;
        esac
    done
}

log_dev "AI Developer開始"
dev_dashboard 
#!/bin/bash

# 1️⃣ AI Project Manager
# プロジェクト統括・Git管理・進捗監視

clear
echo "🏢 AI Project Manager 起動中..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "👨‍💼 役割: プロジェクト統括・Git管理・デプロイメント"
echo "📊 担当: 進捗監視・メトリクス・リリース管理"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

LOG_FILE="ai-org-logs/pm-$(date +%Y%m%d-%H%M%S).log"
echo "📝 ログファイル: $LOG_FILE"

# ログ関数
log_pm() {
    echo "[$(date '+%H:%M:%S')] PM: $1" | tee -a "$LOG_FILE"
}

# プロジェクト状態監視関数
monitor_project() {
    log_pm "📊 プロジェクト状態監視開始"
    
    while true; do
        clear
        echo "🏢 AI Project Manager Dashboard"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "⏰ $(date '+%Y-%m-%d %H:%M:%S')"
        echo ""
        
        # Git状況
        echo "📊 Git Status:"
        git status --porcelain | head -5
        echo ""
        
        # ファイル変更監視
        echo "📁 Recent File Changes:"
        find . -name "*.gs" -o -name "*.html" -o -name "*.md" -mtime -1 | head -5
        echo ""
        
        # プロセス監視
        echo "💻 Active Processes:"
        ps aux | grep -E "(node|python|git)" | grep -v grep | head -3
        echo ""
        
        # メトリクス
        echo "📈 Project Metrics:"
        echo "   📄 Total Files: $(find . -type f | wc -l)"
        echo "   📝 Code Files: $(find . -name "*.gs" -o -name "*.html" | wc -l)"
        echo "   📊 Git Commits: $(git rev-list --count HEAD 2>/dev/null || echo "0")"
        echo ""
        
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "⌨️ Commands: [q]uit [p]ush [s]tatus [l]og [r]efresh"
        
        read -t 10 -n 1 cmd
        case $cmd in
            q) log_pm "プロジェクト監視終了"; break ;;
            p) 
                log_pm "Git Auto Push実行"
                ap "🤖 AI PM: 自動プッシュ - $(date '+%H:%M:%S')"
                ;;
            s) 
                log_pm "詳細ステータス確認"
                git status
                read -p "Press Enter to continue..."
                ;;
            l)
                log_pm "ログ確認"
                tail -20 "$LOG_FILE"
                read -p "Press Enter to continue..."
                ;;
        esac
    done
}

log_pm "AI Project Manager開始"
monitor_project 
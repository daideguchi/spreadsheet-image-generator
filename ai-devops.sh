#!/bin/bash

# 3️⃣ AI DevOps Engineer
# システム監視・ログ管理・パフォーマンス最適化

clear
echo "⚙️ AI DevOps Engineer 起動中..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "👨‍🔧 役割: システム監視・ログ管理・最適化"
echo "🔧 担当: パフォーマンス監視・セキュリティ・インフラ"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

LOG_FILE="ai-org-logs/devops-$(date +%Y%m%d-%H%M%S).log"
echo "📝 ログファイル: $LOG_FILE"

# ログ関数
log_devops() {
    echo "[$(date '+%H:%M:%S')] DEVOPS: $1" | tee -a "$LOG_FILE"
}

# システム監視関数
monitor_system() {
    log_devops "🖥️ システム監視開始"
    
    while true; do
        clear
        echo "⚙️ AI DevOps Engineer Dashboard"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "⏰ $(date '+%Y-%m-%d %H:%M:%S')"
        echo ""
        
        # システムリソース
        echo "💻 System Resources:"
        echo "   CPU: $(top -l 1 | grep "CPU usage" | head -1 | awk '{print $3}' | sed 's/%//')"
        echo "   Memory: $(vm_stat | grep "Pages free" | awk '{print $3}' | sed 's/\.//')KB free"
        echo "   Disk: $(df -h . | tail -1 | awk '{print $5}') used"
        echo ""
        
        # ネットワーク監視
        echo "🌐 Network Status:"
        if ping -c 1 google.com >/dev/null 2>&1; then
            echo "   ✅ Internet: Connected"
        else
            echo "   ❌ Internet: Disconnected"
        fi
        echo ""
        
        # プロセス監視
        echo "⚡ Active Processes:"
        ps aux | grep -E "(node|python|git|code)" | grep -v grep | head -5
        echo ""
        
        # ログファイルサイズ
        echo "📊 Log Files:"
        find ai-org-logs -name "*.log" -exec ls -lh {} \; 2>/dev/null | head -5
        echo ""
        
        # セキュリティチェック
        echo "🔒 Security Status:"
        if [ -f ".gitignore" ]; then
            echo "   ✅ .gitignore: Present"
        else
            echo "   ⚠️ .gitignore: Missing"
        fi
        
        if find . -name "*.key" -o -name "*.pem" | grep -q .; then
            echo "   ⚠️ Sensitive files detected"
        else
            echo "   ✅ No sensitive files found"
        fi
        echo ""
        
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "⌨️ Commands: [q]uit [c]lean [o]ptimize [s]ecurity [l]ogs [b]ackup"
        
        read -t 10 -n 1 cmd
        case $cmd in
            q) log_devops "システム監視終了"; break ;;
            c) 
                log_devops "システムクリーンアップ実行"
                cleanup_system
                ;;
            o)
                log_devops "パフォーマンス最適化実行"
                optimize_performance
                ;;
            s)
                log_devops "セキュリティチェック実行"
                security_check
                ;;
            l)
                log_devops "ログ管理"
                manage_logs
                ;;
            b)
                log_devops "バックアップ実行"
                create_backup
                ;;
        esac
    done
}

# システムクリーンアップ
cleanup_system() {
    log_devops "🧹 システムクリーンアップ開始"
    
    # 一時ファイル削除
    find . -name "*.tmp" -delete 2>/dev/null
    find . -name ".DS_Store" -delete 2>/dev/null
    
    # 古いログファイル削除（7日以上）
    find ai-org-logs -name "*.log" -mtime +7 -delete 2>/dev/null
    
    log_devops "✅ クリーンアップ完了"
    read -p "Press Enter to continue..."
}

# パフォーマンス最適化
optimize_performance() {
    log_devops "⚡ パフォーマンス最適化開始"
    
    # Git最適化
    git gc --aggressive 2>/dev/null
    
    # ファイル権限最適化
    find . -name "*.sh" -exec chmod +x {} \; 2>/dev/null
    
    log_devops "✅ 最適化完了"
    read -p "Press Enter to continue..."
}

# セキュリティチェック
security_check() {
    log_devops "🔒 セキュリティチェック開始"
    
    echo "セキュリティスキャン結果:"
    
    # 機密ファイルチェック
    if find . -name "*.key" -o -name "*.pem" -o -name "*.p12" | grep -q .; then
        echo "⚠️ 機密ファイルが検出されました"
        find . -name "*.key" -o -name "*.pem" -o -name "*.p12"
    else
        echo "✅ 機密ファイルなし"
    fi
    
    # パスワードチェック
    if grep -r "password\|secret\|key" . --include="*.gs" --include="*.html" | grep -v "console.log" | head -5; then
        echo "⚠️ 潜在的な機密情報が検出されました"
    else
        echo "✅ 機密情報の露出なし"
    fi
    
    log_devops "✅ セキュリティチェック完了"
    read -p "Press Enter to continue..."
}

# ログ管理
manage_logs() {
    log_devops "📊 ログ管理開始"
    
    echo "ログファイル一覧:"
    ls -lh ai-org-logs/ 2>/dev/null || echo "ログファイルなし"
    
    echo ""
    echo "最新ログ（各チーム）:"
    for team in pm dev devops qa; do
        latest_log=$(ls -t ai-org-logs/${team}-*.log 2>/dev/null | head -1)
        if [ -n "$latest_log" ]; then
            echo "📄 $team: $(basename $latest_log)"
            tail -3 "$latest_log"
            echo ""
        fi
    done
    
    read -p "Press Enter to continue..."
}

# バックアップ作成
create_backup() {
    log_devops "💾 バックアップ作成開始"
    
    backup_dir="backup/ai-org-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$backup_dir"
    
    # 重要ファイルをバックアップ
    cp *.gs *.html *.md *.sh "$backup_dir/" 2>/dev/null
    cp -r ai-org-logs "$backup_dir/" 2>/dev/null
    
    log_devops "✅ バックアップ完了: $backup_dir"
    read -p "Press Enter to continue..."
}

log_devops "AI DevOps Engineer開始"
monitor_system 
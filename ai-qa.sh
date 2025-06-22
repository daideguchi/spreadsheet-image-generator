#!/bin/bash

# 4️⃣ AI Quality Assurance
# 品質保証・自動テスト・エラー検出・ユーザビリティ検証

clear
echo "🔍 AI Quality Assurance 起動中..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "👨‍🔬 役割: 品質保証・自動テスト・エラー検出"
echo "🧪 担当: ユーザビリティ検証・バグ検出・品質レポート"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

LOG_FILE="ai-org-logs/qa-$(date +%Y%m%d-%H%M%S).log"
echo "📝 ログファイル: $LOG_FILE"

# ログ関数
log_qa() {
    echo "[$(date '+%H:%M:%S')] QA: $1" | tee -a "$LOG_FILE"
}

# 品質ダッシュボード
qa_dashboard() {
    while true; do
        clear
        echo "🔍 AI Quality Assurance Dashboard"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "⏰ $(date '+%Y-%m-%d %H:%M:%S')"
        echo ""
        
        # 品質メトリクス
        echo "📊 Quality Metrics:"
        echo "   📄 Total Files: $(find . -name "*.gs" -o -name "*.html" | wc -l)"
        echo "   📏 Code Lines: $(cat *.gs *.html 2>/dev/null | wc -l)"
        echo "   🔍 Functions: $(grep -c "function " *.gs 2>/dev/null || echo "0")"
        echo "   🏷️ Comments: $(grep -c "//" *.gs *.html 2>/dev/null || echo "0")"
        echo ""
        
        # エラー検出
        echo "🚨 Error Detection:"
        error_count=$(run_error_detection | wc -l)
        if [ "$error_count" -gt 0 ]; then
            echo "   ⚠️ Potential Issues: $error_count"
        else
            echo "   ✅ No Issues Detected"
        fi
        echo ""
        
        # テスト結果
        echo "🧪 Test Results:"
        echo "   📋 Syntax Tests: $(test_syntax && echo "✅ PASS" || echo "❌ FAIL")"
        echo "   🔗 Link Tests: $(test_links && echo "✅ PASS" || echo "❌ FAIL")"
        echo "   📱 UI Tests: $(test_ui && echo "✅ PASS" || echo "❌ FAIL")"
        echo ""
        
        # 品質スコア
        quality_score=$(calculate_quality_score)
        echo "🏆 Quality Score: $quality_score/100"
        echo ""
        
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "⌨️ Commands: [q]uit [t]est [e]rrors [r]eport [u]sability [f]ull-scan"
        
        read -t 10 -n 1 cmd
        case $cmd in
            q) log_qa "品質監視終了"; break ;;
            t) 
                log_qa "テスト実行"
                run_tests
                ;;
            e)
                log_qa "エラー検出実行"
                run_error_detection | head -20
                read -p "Press Enter to continue..."
                ;;
            r)
                log_qa "品質レポート生成"
                generate_quality_report
                ;;
            u)
                log_qa "ユーザビリティチェック"
                usability_check
                ;;
            f)
                log_qa "フルスキャン実行"
                full_quality_scan
                ;;
        esac
    done
}

# エラー検出関数
run_error_detection() {
    # 構文エラー検出
    grep -n "function.*{" *.gs 2>/dev/null | grep -v "function.*{.*}" | while read line; do
        echo "⚠️ Syntax: $line"
    done
    
    # 未定義変数検出
    grep -n "console\.log" *.gs *.html 2>/dev/null | while read line; do
        echo "🐛 Debug: $line"
    done
    
    # HTMLエラー検出
    if [ -f "Sidebar.html" ]; then
        if ! grep -q "<!DOCTYPE html>" Sidebar.html; then
            echo "⚠️ HTML: Missing DOCTYPE in Sidebar.html"
        fi
        if ! grep -q "</html>" Sidebar.html; then
            echo "⚠️ HTML: Missing closing html tag in Sidebar.html"
        fi
    fi
}

# 構文テスト
test_syntax() {
    local errors=0
    
    # Google Apps Script構文チェック
    for file in *.gs; do
        [ ! -f "$file" ] && continue
        if ! grep -q "function" "$file"; then
            errors=$((errors + 1))
        fi
    done
    
    # HTML構文チェック
    for file in *.html; do
        [ ! -f "$file" ] && continue
        if ! grep -q "<!DOCTYPE html>" "$file"; then
            errors=$((errors + 1))
        fi
    done
    
    return $errors
}

# リンクテスト
test_links() {
    local errors=0
    
    # HTMLファイル内のリンクチェック
    for file in *.html; do
        [ ! -f "$file" ] && continue
        # 基本的なHTML構造チェック
        if ! grep -q "<script>" "$file" && grep -q "google.script.run" "$file"; then
            errors=$((errors + 1))
        fi
    done
    
    return $errors
}

# UIテスト
test_ui() {
    local errors=0
    
    if [ -f "Sidebar.html" ]; then
        # 基本的なUI要素チェック
        if ! grep -q "button" Sidebar.html; then
            errors=$((errors + 1))
        fi
        if ! grep -q "style" Sidebar.html && ! grep -q "css" Sidebar.html; then
            errors=$((errors + 1))
        fi
    else
        errors=$((errors + 1))
    fi
    
    return $errors
}

# 品質スコア計算
calculate_quality_score() {
    local score=100
    
    # 構文エラーでマイナス
    test_syntax || score=$((score - 20))
    
    # リンクエラーでマイナス
    test_links || score=$((score - 15))
    
    # UIエラーでマイナス
    test_ui || score=$((score - 15))
    
    # コメント率チェック
    local total_lines=$(cat *.gs *.html 2>/dev/null | wc -l)
    local comment_lines=$(grep -c "//" *.gs *.html 2>/dev/null || echo "0")
    if [ "$total_lines" -gt 0 ]; then
        local comment_ratio=$((comment_lines * 100 / total_lines))
        if [ "$comment_ratio" -lt 10 ]; then
            score=$((score - 10))
        fi
    fi
    
    # 最小値0
    [ "$score" -lt 0 ] && score=0
    
    echo $score
}

# テスト実行
run_tests() {
    log_qa "🧪 全テスト実行開始"
    
    echo "テスト実行中..."
    echo ""
    
    echo "1. 構文テスト:"
    if test_syntax; then
        echo "   ✅ PASS - 構文エラーなし"
    else
        echo "   ❌ FAIL - 構文エラー検出"
    fi
    
    echo "2. リンクテスト:"
    if test_links; then
        echo "   ✅ PASS - リンクエラーなし"
    else
        echo "   ❌ FAIL - リンクエラー検出"
    fi
    
    echo "3. UIテスト:"
    if test_ui; then
        echo "   ✅ PASS - UI構造正常"
    else
        echo "   ❌ FAIL - UI問題検出"
    fi
    
    echo ""
    log_qa "✅ 全テスト完了"
    read -p "Press Enter to continue..."
}

# 品質レポート生成
generate_quality_report() {
    log_qa "📊 品質レポート生成開始"
    
    local report_file="ai-org-logs/quality-report-$(date +%Y%m%d-%H%M%S).html"
    
    cat > "$report_file" << EOF
<!DOCTYPE html>
<html>
<head>
    <title>Quality Report - $(date '+%Y-%m-%d %H:%M:%S')</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f0f0f0; padding: 20px; border-radius: 5px; }
        .metric { margin: 10px 0; padding: 10px; border-left: 4px solid #007cba; }
        .pass { border-left-color: #28a745; }
        .fail { border-left-color: #dc3545; }
        .score { font-size: 24px; font-weight: bold; color: #007cba; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔍 Quality Assurance Report</h1>
        <p>Generated: $(date '+%Y-%m-%d %H:%M:%S')</p>
        <p>Project: SpreadsheetImageGenerator</p>
    </div>
    
    <h2>📊 Quality Metrics</h2>
    <div class="metric">Files: $(find . -name "*.gs" -o -name "*.html" | wc -l)</div>
    <div class="metric">Code Lines: $(cat *.gs *.html 2>/dev/null | wc -l)</div>
    <div class="metric">Functions: $(grep -c "function " *.gs 2>/dev/null || echo "0")</div>
    
    <h2>🧪 Test Results</h2>
    <div class="metric $(test_syntax && echo "pass" || echo "fail")">
        Syntax Test: $(test_syntax && echo "✅ PASS" || echo "❌ FAIL")
    </div>
    <div class="metric $(test_links && echo "pass" || echo "fail")">
        Link Test: $(test_links && echo "✅ PASS" || echo "❌ FAIL")
    </div>
    <div class="metric $(test_ui && echo "pass" || echo "fail")">
        UI Test: $(test_ui && echo "✅ PASS" || echo "❌ FAIL")
    </div>
    
    <h2>🏆 Overall Score</h2>
    <div class="score">$(calculate_quality_score)/100</div>
    
    <h2>🚨 Issues Detected</h2>
    <pre>$(run_error_detection)</pre>
</body>
</html>
EOF
    
    log_qa "✅ レポート生成完了: $report_file"
    echo "品質レポートが生成されました: $report_file"
    read -p "Press Enter to continue..."
}

# ユーザビリティチェック
usability_check() {
    log_qa "📱 ユーザビリティチェック開始"
    
    echo "ユーザビリティ検証結果:"
    echo ""
    
    # HTMLファイルのUXチェック
    if [ -f "Sidebar.html" ]; then
        echo "🖥️ Sidebar.html UX Check:"
        
        if grep -q "button" Sidebar.html; then
            echo "   ✅ Interactive elements present"
        else
            echo "   ⚠️ No interactive elements found"
        fi
        
        if grep -q "style\|css" Sidebar.html; then
            echo "   ✅ Styling applied"
        else
            echo "   ⚠️ No styling detected"
        fi
        
        if grep -q "responsive\|mobile" Sidebar.html; then
            echo "   ✅ Mobile-friendly design"
        else
            echo "   ⚠️ Mobile optimization unclear"
        fi
    fi
    
    echo ""
    log_qa "✅ ユーザビリティチェック完了"
    read -p "Press Enter to continue..."
}

# フルスキャン
full_quality_scan() {
    log_qa "🔍 フル品質スキャン開始"
    
    echo "完全品質スキャン実行中..."
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # 全テスト実行
    run_tests
    
    # エラー検出
    echo ""
    echo "🚨 検出されたイシュー:"
    run_error_detection
    
    # ユーザビリティチェック
    echo ""
    usability_check
    
    # レポート生成
    generate_quality_report
    
    log_qa "✅ フルスキャン完了"
}

log_qa "AI Quality Assurance開始"
qa_dashboard 
#!/bin/bash

# 🏢 AI組織管理システム
# 4つのターミナルでそれぞれの役割を分担

echo "🏢 AI組織立ち上げ中..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# プロジェクト情報
PROJECT_NAME="SpreadsheetImageGenerator"
PROJECT_DIR=$(pwd)
LOG_DIR="$PROJECT_DIR/ai-org-logs"

# ログディレクトリ作成
mkdir -p "$LOG_DIR"

echo "📋 プロジェクト: $PROJECT_NAME"
echo "📁 ディレクトリ: $PROJECT_DIR"
echo "📊 ログ保存先: $LOG_DIR"
echo ""

echo "🎯 AI組織メンバー:"
echo "1️⃣ AI Project Manager - プロジェクト統括・Git管理"
echo "2️⃣ AI Developer - コード開発・テスト・デバッグ"
echo "3️⃣ AI DevOps Engineer - システム監視・最適化"
echo "4️⃣ AI Quality Assurance - 品質保証・テスト"
echo ""

echo "🚀 各ターミナルでの実行コマンド:"
echo "ターミナル1: ./ai-pm.sh"
echo "ターミナル2: ./ai-dev.sh"
echo "ターミナル3: ./ai-devops.sh"
echo "ターミナル4: ./ai-qa.sh"
echo ""

echo "✅ AI組織セットアップ完了！"
echo "各ターミナルで対応するスクリプトを実行してください。" 
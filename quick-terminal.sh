#!/bin/bash

echo "🤖 AI組織最適化 4分割ターミナル起動中..."

if ! command -v tmux &> /dev/null; then
    echo "❌ tmuxが必要です: brew install tmux"
    exit 1
fi

SESSION_NAME="ai-org-full"
tmux has-session -t "$SESSION_NAME" 2>/dev/null && tmux kill-session -t "$SESSION_NAME"

tmux new-session -d -s "$SESSION_NAME" \; \
  split-window -h \; \
  split-window -v \; \
  select-pane -t 0 \; \
  split-window -v \; \
  send-keys -t 0 'echo "🤖 AI組織 - メインコントロール"' C-m \; \
  send-keys -t 0 'echo "📋 タスク管理、Git操作、全体制御"' C-m \; \
  send-keys -t 1 'echo "⚙️ 開発サーバー"' C-m \; \
  send-keys -t 1 'echo "💡 npm run dev / yarn dev"' C-m \; \
  send-keys -t 2 'echo "💻 ログ監視"' C-m \; \
  send-keys -t 2 'echo "📊 tail -f logs/ / デバッグ出力"' C-m \; \
  send-keys -t 3 'echo "🚀 追加作業"' C-m \; \
  send-keys -t 3 'echo "🧪 テスト実行、ビルド、デプロイ"' C-m \; \
  select-pane -t 0 \; \
  attach-session

echo "✅ AI組織最適化ターミナル準備完了！"

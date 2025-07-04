# スプレッドシート画像生成ツール

Google スプレッドシートと DALL-E API を連携した画像生成・ダウンロードツールです。

## 機能

- スプレッドシートのセルにプロンプトを入力
- ボタン一つで DALL-E による画像生成
- 生成した画像をスプレッドシートに表示
- 複数画像を一括で ZIP ダウンロード

## 技術構成

- **プラットフォーム**: Google スプレッドシート
- **拡張機能**: Google Apps Script (GAS)
- **画像生成 API**: OpenAI DALL-E API
- **フロントエンド**: HTMLService + JavaScript + JSZip

## 🚀 クイックスタート

### Google Apps Script で使用する場合

**`gas-files/` ディレクトリ**に必要なファイル一式が整理されています：

- `Code.gs` - メインスクリプト
- `Sidebar.html` - UI ファイル
- `appsscript.json` - 設定ファイル
- `README-GAS.md` - 詳細セットアップガイド

**各ファイルをコピー&ペーストで Google Apps Script エディタに貼り付けてください。**

## セットアップ手順

### 1. Google スプレッドシートの準備

1. 新しい Google スプレッドシートを作成
2. `拡張機能` → `Apps Script` で GAS エディタを開く

### 2. スクリプトファイルの配置

1. `Code.gs` の内容をメインの `コード.gs` に貼り付け
2. `ファイル` → `新規` → `HTML ファイル` で `Sidebar` を作成
3. `Sidebar.html` の内容を貼り付け

### 3. OpenAI API キーの設定

1. GAS エディタで `プロジェクトの設定` → `スクリプト プロパティ`
2. プロパティ名: `OPENAI_API_KEY`
3. 値: あなたの OpenAI API キー

### 4. 権限の許可

1. `デプロイ` → `実行` で初回実行時に権限を許可
2. スプレッドシートを再読み込み

## 使用方法

### 画像生成

1. スプレッドシートのセルにプロンプトを入力（複数セル可）
2. プロンプトを入力したセル範囲を選択
3. メニュー `画像ツール` → `サイドバーを開く`
4. `画像生成` ボタンをクリック
5. 生成された画像がセルに挿入されます

### 画像ダウンロード

1. サイドバーで `画像をダウンロード` ボタンをクリック
2. ZIP 形式で全画像がダウンロードされます

## 注意事項

- OpenAI API の利用には料金が発生します
- 1 回の生成で複数プロンプトを処理する場合、API 制限にご注意ください
- 画像は一時的にスプレッドシート上に保存されます

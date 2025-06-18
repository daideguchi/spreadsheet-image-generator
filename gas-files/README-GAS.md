# Google Apps Script ファイル一式

このディレクトリには Google Apps Script で使用する 3 つのファイルが含まれています。

## 📁 含まれるファイル

### 必須ファイル（3 つ）

1. **`Code.gs`** - メインの Google Apps Script コード
2. **`Sidebar.html`** - サイドバーの HTML ファイル
3. **`appsscript.json`** - プロジェクト設定ファイル

## 🔧 Google Apps Script での設定方法

### 方法 1: 手動コピー&ペースト（推奨）

#### ステップ 1: Code.gs の設定

1. Google Apps Script エディタで `コード.gs` を開く
2. 既存のコードをすべて削除
3. この `Code.gs` の内容をすべてコピー&ペースト

#### ステップ 2: Sidebar.html の設定

1. 左側のファイル一覧で **[+]** ボタンをクリック
2. **「HTML ファイル」** を選択
3. ファイル名を **`Sidebar`** に設定
4. この `Sidebar.html` の内容をすべてコピー&ペースト

#### ステップ 3: appsscript.json の設定

1. 左側のファイル一覧で **appsscript.json** をクリック
2. 既存の内容を削除
3. この `appsscript.json` の内容をすべてコピー&ペースト

### 方法 2: clasp を使用（上級者向け）

```bash
# claspのインストール
npm install -g @google/clasp

# Google Apps Script プロジェクトとの連携
clasp clone [スクリプトID]

# ファイルをプッシュ
clasp push
```

## ⚡ 重要な設定

### OpenAI API キーの設定

1. Apps Script エディタで **歯車アイコン** をクリック
2. **「スクリプト プロパティ」** セクションで **「プロパティを追加」**
3. プロパティ名: **`OPENAI_API_KEY`**
4. 値: あなたの OpenAI API キー

### 権限の許可

1. `onOpen` 関数を選択して **「実行」**
2. 権限確認ダイアログで **「許可」**
3. スプレッドシートを **F5 キー** で再読み込み

## 🚀 動作確認

正常に設定されると：

1. スプレッドシートのメニューに **「画像ツール」** が表示される
2. サイドバーが開ける
3. 画像生成と保存が可能

## 🔍 トラブルシューティング

問題が発生した場合は、リポジトリの `troubleshooting.md` を参照してください。

## 📞 サポート

- 詳細なセットアップ: `setup-guide.md`
- 図解ガイド: `gas-setup-detailed.md`
- トラブルシューティング: `troubleshooting.md`

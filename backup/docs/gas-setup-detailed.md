# Google Apps Script 詳細セットアップガイド

## Sidebar.html ファイルの作成方法（図解）

### 1. Apps Script エディタの起動

1. Google スプレッドシートを開く
2. メニューバー：`拡張機能` → `Apps Script`
3. 新しいタブで Apps Script エディタが開く

### 2. エディタの画面構成

```
Google Apps Script エディタ画面
┏━━━━━━━━━━━━━━┳━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ 左側：ファイル    ┃           右側：コードエディタ         ┃
┃                  ┃                                       ┃
┃ [+] ← このボタン  ┃  ここに選択されたファイルの           ┃
┃                  ┃  内容が表示される                     ┃
┃ 📄 コード.gs     ┃                                       ┃
┃                  ┃  function myFunction() {              ┃
┃                  ┃    // 既存のコード                     ┃
┃                  ┃  }                                    ┃
┃                  ┃                                       ┃
┗━━━━━━━━━━━━━━┻━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

### 3. HTML ファイルの追加手順

#### ステップ 1: ファイル追加ボタンをクリック

- 左側の **[+]** ボタンをクリック
- メニューが表示される：
  ```
  ┌──────────────┐
  │ スクリプト   │
  │ HTML ファイル │ ← これを選択
  └──────────────┘
  ```

#### ステップ 2: HTML ファイルを選択

- **「HTML ファイル」** をクリック

#### ステップ 3: ファイル名を入力

- ダイアログボックスが表示される：
  ```
  ┌─────────────────────────────┐
  │ 新しいHTMLファイル           │
  │                             │
  │ ファイル名: [Sidebar     ]  │ ← ここに入力
  │                             │
  │ [キャンセル]    [作成]     │
  └─────────────────────────────┘
  ```
- **`Sidebar`** と入力（.html は自動で追加される）
- **「作成」** ボタンをクリック

### 4. HTML コードの貼り付け

#### ステップ 1: ファイルを選択

- 左側に新しく表示された **`Sidebar.html`** をクリック

#### ステップ 2: 既存コードを削除

- 右側のエディタには以下のようなテンプレートが表示される：
  ```html
  <!DOCTYPE html>
  <html>
    <head>
      <base target="_top" />
    </head>
    <body></body>
  </html>
  ```
- **この内容をすべて選択して削除**

#### ステップ 3: 新しいコードを貼り付け

- `Sidebar.html` の内容をすべてコピー
- 右側のエディタに貼り付け

### 5. 完成画面

最終的に、左側のファイル一覧は以下のようになります：

```
┌─────────────┐
│   [+]       │
├─────────────┤
│ 📄 コード.gs │
│ 📄 Sidebar.html │
└─────────────┘
```

## よくある間違いと解決方法

### ❌ 間違い 1: 「ファイル」メニューを探す

- Google Apps Script には従来の「ファイル」メニューに「新規」オプションはありません
- **正解**: 左側の **[+]** ボタンを使用

### ❌ 間違い 2: ファイル名に .html を付ける

- ファイル名に `Sidebar.html` と入力してしまう
- **正解**: `Sidebar` とだけ入力（拡張子は自動付与）

### ❌ 間違い 3: 既存コードを残したまま貼り付け

- テンプレートコードの下に貼り付けてしまう
- **正解**: 既存コードを**すべて削除**してから貼り付け

## 保存について

- Google Apps Script は**自動保存**されます
- `Ctrl+S` を押す必要はありません
- 左上のプロジェクト名をクリックして名前を変更できます

## 次の手順

ファイルの作成が完了したら：

1. OpenAI API キーの設定
2. 権限の許可
3. 動作テスト

詳細は `setup-guide.md` を参照してください。

# コーディング規約

## Google Apps Script開発規約

### 基本原則
- **可読性**: コードは自己文書化されるべき
- **保守性**: 機能追加・修正が容易な構造
- **性能**: Google Apps Scriptの実行制限を考慮
- **セキュリティ**: APIキーなどの機密情報の適切な管理

### 命名規約

#### 関数名
```javascript
// ✅ 良い例
function generateImageFromPrompt() {}
function validateUserInput() {}
function formatCellData() {}

// ❌ 悪い例
function doSomething() {}
function func1() {}
function process() {}
```

#### 変数名
```javascript
// ✅ 良い例
const imagePrompt = cell.getValue();
const generatedImageUrl = response.data.url;
const rowIndex = 2;

// ❌ 悪い例
const data = cell.getValue();
const url = response.data.url;
const i = 2;
```

#### 定数
```javascript
// ✅ 大文字のスネークケース
const OPENAI_API_ENDPOINT = 'https://api.openai.com/v1/images/generations';
const MAX_RETRY_COUNT = 3;
const DEFAULT_IMAGE_SIZE = '1024x1024';
```

### 関数設計

#### 単一責任の原則
```javascript
// ✅ 良い例 - 各関数が単一の責任を持つ
function validatePrompt(prompt) {
  return prompt && prompt.trim().length > 0;
}

function callOpenAIAPI(prompt, size) {
  // API呼び出しのみ
}

function insertImageToCell(imageUrl, cell) {
  // セルへの画像挿入のみ
}

// ❌ 悪い例 - 複数の責任を持つ
function generateAndInsertImage(prompt, cell) {
  // バリデーション + API呼び出し + セル挿入が混在
}
```

#### エラーハンドリング
```javascript
// ✅ 適切なエラーハンドリング
function generateImage(prompt) {
  try {
    if (!validatePrompt(prompt)) {
      throw new Error('無効なプロンプトです');
    }
    
    const response = callOpenAIAPI(prompt);
    return response.data.url;
  } catch (error) {
    console.error('画像生成エラー:', error.message);
    showUserMessage('画像生成に失敗しました: ' + error.message);
    return null;
  }
}
```

### HTML/CSS規約

#### クラス命名
```css
/* ✅ BEM記法を推奨 */
.sidebar__button {}
.sidebar__button--primary {}
.sidebar__input-group {}
.sidebar__input-group__label {}

/* ❌ 避けるべき */
.btn {}
.input1 {}
.red-text {}
```

#### JavaScript in HTML
```javascript
// ✅ 適切な分離
function handleButtonClick() {
  google.script.run
    .withSuccessHandler(onSuccess)
    .withFailureHandler(onError)
    .generateImage();
}

// ❌ インライン記述は避ける
// <button onclick="google.script.run.generateImage()">
```

### パフォーマンス考慮事項

#### バッチ処理
```javascript
// ✅ バッチでデータを処理
function processMultipleRows(startRow, endRow) {
  const sheet = SpreadsheetApp.getActiveSheet();
  const range = sheet.getRange(startRow, 1, endRow - startRow + 1, 9);
  const values = range.getValues();
  
  const updates = values.map((row, index) => {
    // 処理ロジック
    return updatedRow;
  });
  
  range.setValues(updates);
}

// ❌ 1行ずつ処理（非効率）
function processRowByRow() {
  for (let i = 2; i <= lastRow; i++) {
    const cell = sheet.getRange(i, 2);
    // 毎回シートアクセス
  }
}
```

#### キャッシュ活用
```javascript
// ✅ PropertiesServiceでキャッシュ
function getCachedData(key) {
  const cached = PropertiesService.getScriptProperties().getProperty(key);
  return cached ? JSON.parse(cached) : null;
}

function setCachedData(key, data, expirationMinutes = 60) {
  const expiration = new Date().getTime() + (expirationMinutes * 60 * 1000);
  const cacheData = { data, expiration };
  PropertiesService.getScriptProperties().setProperty(key, JSON.stringify(cacheData));
}
```

### ドキュメンテーション

#### 関数コメント
```javascript
/**
 * OpenAI DALL-E APIを使用して画像を生成
 * @param {string} prompt - 画像生成用のプロンプト
 * @param {string} size - 画像サイズ（'1024x1024', '512x512'など）
 * @param {number} retryCount - リトライ回数（デフォルト: 0）
 * @returns {string|null} 生成された画像のURL、失敗時はnull
 */
function generateImageWithDALLE(prompt, size = '1024x1024', retryCount = 0) {
  // 実装
}
```

#### TODO/FIXME コメント
```javascript
// TODO: エラーレート制限への対応を追加
// FIXME: 大きな画像でメモリ不足が発生する可能性
// NOTE: この処理はGoogle Apps Scriptの制限により6分以内に完了する必要がある
```

### テスト可能な設計

```javascript
// ✅ テスト可能な純粋関数
function formatPrompt(userPrompt, commonPrompt) {
  if (!userPrompt && !commonPrompt) return '';
  return `${userPrompt || ''} ${commonPrompt || ''}`.trim();
}

// ✅ 依存性注入でテスト可能
function generateImage(prompt, apiClient = defaultAPIClient) {
  return apiClient.generateImage(prompt);
}
```

### セキュリティ

#### APIキー管理
```javascript
// ✅ PropertiesServiceを使用
function getAPIKey() {
  return PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');
}

// ❌ ハードコーディング禁止
// const API_KEY = 'sk-...'; // 絶対にしない
```

#### 入力検証
```javascript
function validateImagePrompt(prompt) {
  // 長さチェック
  if (!prompt || prompt.length > 1000) {
    return false;
  }
  
  // 不適切なコンテンツチェック
  const prohibitedWords = ['violence', 'adult', 'illegal'];
  return !prohibitedWords.some(word => 
    prompt.toLowerCase().includes(word)
  );
}
```
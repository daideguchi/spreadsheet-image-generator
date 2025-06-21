# アーキテクチャ設計

## プロジェクト構造

### 現在のファイル構成
```
image_gen/
├── Code.gs                 # メインロジック
├── Sidebar.html           # ユーザーインターフェース
├── appsscript.json        # GAS設定
├── autopush.sh           # デプロイメントスクリプト
├── .cursor/rules/        # 開発規約
└── docs/                 # ドキュメント
```

### 責任分離

#### Code.gs の構造化
```javascript
// === メイン処理 ===
function generateImageFromSpreadsheet() {}
function generateAllImages() {}

// === UI関連 ===
function showSidebar() {}
function updateProgress() {}

// === データ処理 ===
function getSheetData() {}
function updateSheetData() {}
function validateInput() {}

// === API関連 ===
function callOpenAIAPI() {}
function handleAPIResponse() {}
function retryAPICall() {}

// === ユーティリティ ===
function formatDate() {}
function calculateAspectRatio() {}
function showMessage() {}
```

## データフロー

### 1. ユーザー入力 → 画像生成フロー
```
[スプレッドシート] 
    ↓ (ユーザー入力)
[バリデーション]
    ↓ (検証済みデータ)
[プロンプト結合]
    ↓ (最終プロンプト)
[OpenAI API呼び出し]
    ↓ (画像URL)
[スプレッドシートに挿入]
    ↓ (完了)
[メタデータ更新]
```

### 2. バッチ処理フロー
```
[全行スキャン]
    ↓
[処理対象行の特定]
    ↓
[並行処理準備]
    ↓
[API呼び出し制限考慮]
    ↓
[順次処理実行]
    ↓
[結果の一括更新]
```

## スプレッドシート設計

### 列構成（A-I列）
| 列 | 用途 | 入力方式 | 色 |
|---|---|---|---|
| A | No. | 自動連番 | グレー |
| B | プロンプト | ユーザー入力 | 緑 |
| C | 共通プロンプト | ドロップダウン | オレンジ |
| D | 結合プロンプト | 自動生成 | グレー |
| E | 生成画像 | 自動挿入 | グレー |
| F | 画像比率 | 自動計算 | グレー |
| G | 生成日時 | 自動記録 | グレー |
| H | ステータス | 自動更新 | グレー |
| I | エラーログ | 自動記録 | グレー |

### データ検証ルール
```javascript
const VALIDATION_RULES = {
  PROMPT_MIN_LENGTH: 1,
  PROMPT_MAX_LENGTH: 1000,
  REQUIRED_COLUMNS: ['B', 'C'], // プロンプト系列
  AUTO_COLUMNS: ['A', 'D', 'E', 'F', 'G', 'H', 'I'], // 自動生成
  USER_COLUMNS: ['B', 'C'] // ユーザー入力
};
```

## API統合アーキテクチャ

### OpenAI API クライアント設計
```javascript
class OpenAIClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = 'https://api.openai.com/v1';
    this.maxRetries = 3;
    this.retryDelay = 1000; // ms
  }
  
  async generateImage(prompt, options = {}) {
    // 実装
  }
  
  async handleRateLimit(response) {
    // レート制限処理
  }
  
  async retryWithBackoff(func, retryCount = 0) {
    // 指数バックオフでリトライ
  }
}
```

### エラー処理戦略
```javascript
const ERROR_TYPES = {
  VALIDATION_ERROR: 'validation',
  API_ERROR: 'api',
  NETWORK_ERROR: 'network',
  QUOTA_ERROR: 'quota',
  UNKNOWN_ERROR: 'unknown'
};

const ERROR_HANDLERS = {
  [ERROR_TYPES.API_ERROR]: handleAPIError,
  [ERROR_TYPES.NETWORK_ERROR]: handleNetworkError,
  [ERROR_TYPES.QUOTA_ERROR]: handleQuotaError,
  [ERROR_TYPES.VALIDATION_ERROR]: handleValidationError
};
```

## UI/UX アーキテクチャ

### Sidebarコンポーネント設計
```html
<!-- 機能別セクション -->
<div class="sidebar">
  <section class="sidebar__controls">
    <!-- 実行ボタン群 -->
  </section>
  
  <section class="sidebar__settings">
    <!-- 設定項目 -->
  </section>
  
  <section class="sidebar__progress">
    <!-- 進捗表示 -->
  </section>
  
  <section class="sidebar__logs">
    <!-- ログ表示 -->
  </section>
</div>
```

### 状態管理
```javascript
const AppState = {
  processing: false,
  progress: 0,
  lastError: null,
  settings: {
    imageSize: '1024x1024',
    retryCount: 3,
    batchSize: 5
  }
};
```

## パフォーマンス最適化

### 実行時間制限対応
```javascript
const EXECUTION_LIMITS = {
  MAX_EXECUTION_TIME: 6 * 60 * 1000, // 6分
  BATCH_SIZE: 5, // 一度に処理する行数
  API_RATE_LIMIT: 60, // 1分あたりのリクエスト数
  COOLDOWN_TIME: 1000 // APIコール間の待機時間
};
```

### メモリ使用量最適化
```javascript
function processInBatches(data, batchSize = 10) {
  const results = [];
  
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    const batchResults = processBatch(batch);
    results.push(...batchResults);
    
    // メモリクリーンアップ
    Utilities.sleep(100);
  }
  
  return results;
}
```

## セキュリティアーキテクチャ

### 認証・認可
```javascript
function checkPermissions() {
  const user = Session.getActiveUser();
  const allowedDomains = ['company.com'];
  
  if (!allowedDomains.some(domain => 
    user.getEmail().endsWith(domain))) {
    throw new Error('アクセス権限がありません');
  }
}
```

### APIキー管理
```javascript
const SecurityManager = {
  getAPIKey() {
    return PropertiesService.getScriptProperties()
      .getProperty('OPENAI_API_KEY');
  },
  
  setAPIKey(key) {
    if (!this.validateAPIKey(key)) {
      throw new Error('無効なAPIキーです');
    }
    PropertiesService.getScriptProperties()
      .setProperty('OPENAI_API_KEY', key);
  },
  
  validateAPIKey(key) {
    return key && key.startsWith('sk-') && key.length > 20;
  }
};
```

## 監視・ログ

### ログ構造
```javascript
const Logger = {
  info(message, data = {}) {
    console.log(`[INFO] ${message}`, data);
  },
  
  error(message, error = {}) {
    console.error(`[ERROR] ${message}`, {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  },
  
  performance(operation, duration) {
    console.log(`[PERF] ${operation}: ${duration}ms`);
  }
};
```

### メトリクス収集
```javascript
const Metrics = {
  apiCalls: 0,
  successRate: 0,
  averageResponseTime: 0,
  errorCount: 0,
  
  recordAPICall(success, responseTime) {
    this.apiCalls++;
    if (success) {
      this.updateAverageResponseTime(responseTime);
    } else {
      this.errorCount++;
    }
    this.updateSuccessRate();
  }
};
```

## 拡張性考慮

### プラグインアーキテクチャ
```javascript
const PluginManager = {
  plugins: new Map(),
  
  register(name, plugin) {
    this.plugins.set(name, plugin);
  },
  
  execute(hookName, data) {
    for (const plugin of this.plugins.values()) {
      if (plugin.hooks && plugin.hooks[hookName]) {
        data = plugin.hooks[hookName](data);
      }
    }
    return data;
  }
};
```

### 設定駆動開発
```javascript
const CONFIG = {
  imageGeneration: {
    defaultSize: '1024x1024',
    supportedSizes: ['256x256', '512x512', '1024x1024'],
    maxRetries: 3,
    timeout: 30000
  },
  ui: {
    theme: 'light',
    language: 'ja',
    animations: true
  }
};
```
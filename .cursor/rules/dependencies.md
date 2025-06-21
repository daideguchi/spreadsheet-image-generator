# 依存関係管理

## Google Apps Script 依存関係

### 必要なGoogle APIs
```json
{
  "timeZone": "Asia/Tokyo",
  "dependencies": {
    "enabledAdvancedServices": [
      {
        "userSymbol": "Drive",
        "version": "v3",
        "serviceId": "drive"
      },
      {
        "userSymbol": "Sheets",
        "version": "v4", 
        "serviceId": "sheets"
      }
    ]
  },
  "oauthScopes": [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/script.container.ui",
    "https://www.googleapis.com/auth/script.external_request",
    "https://www.googleapis.com/auth/drive.file",
    "https://www.googleapis.com/auth/drive.readonly",
    "https://www.googleapis.com/auth/drive"
  ]
}
```

### OAuthスコープの説明
- `spreadsheets`: スプレッドシートの読み書き
- `script.container.ui`: サイドバーUI表示
- `script.external_request`: 外部API呼び出し（OpenAI）
- `drive.file`: 作成したファイルへのアクセス
- `drive.readonly`: 既存ファイルの読み取り
- `drive`: Driveファイル操作全般

## 外部API依存関係

### OpenAI API
**バージョン**: v1
**エンドポイント**: `https://api.openai.com/v1/images/generations`

**必要な認証情報**:
```javascript
// PropertiesServiceに保存
const API_KEYS = {
  OPENAI_API_KEY: 'sk-...' // OpenAI APIキー
};

// 設定方法
function setupAPIKeys() {
  const properties = PropertiesService.getScriptProperties();
  properties.setProperties(API_KEYS);
}
```

**リクエスト制限**:
- レート制限: 60 requests/minute
- 画像生成制限: モデルにより異なる
- ファイルサイズ制限: 最大4MB

**対応モデル**:
```javascript
const SUPPORTED_MODELS = {
  'dall-e-3': {
    maxSize: '1024x1024',
    quality: ['standard', 'hd'],
    style: ['vivid', 'natural']
  },
  'dall-e-2': {
    maxSize: '1024x1024',
    quality: ['standard'],
    sizes: ['256x256', '512x512', '1024x1024']
  }
};
```

## ライブラリとユーティリティ

### 内蔵ライブラリ
Google Apps Scriptで利用可能な組み込みサービス:

```javascript
// 利用中のGoogleサービス
const GOOGLE_SERVICES = {
  SpreadsheetApp: 'スプレッドシート操作',
  UrlFetchApp: 'HTTP/HTTPS通信',
  PropertiesService: '設定値保存',
  Utilities: 'ユーティリティ関数',
  Session: 'ユーザーセッション情報',
  DriveApp: 'Googleドライブ操作',
  HtmlService: 'HTML UI作成',
  ScriptApp: 'スクリプト管理'
};
```

### カスタムユーティリティ
```javascript
// 共通ユーティリティ関数
const Utils = {
  // ハッシュ生成
  generateHash(text) {
    return Utilities.computeDigest(
      Utilities.DigestAlgorithm.MD5,
      text
    ).map(byte => (byte & 0xFF).toString(16).padStart(2, '0')).join('');
  },

  // 安全な JSON パース
  safeJsonParse(jsonString, defaultValue = null) {
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      console.warn('JSON parse error:', error.message);
      return defaultValue;
    }
  },

  // 遅延実行
  sleep(milliseconds) {
    return Utilities.sleep(milliseconds);
  },

  // 日付フォーマット
  formatDate(date, format = 'yyyy-MM-dd HH:mm:ss') {
    return Utilities.formatDate(date, 'JST', format);
  },

  // URL検証
  isValidUrl(string) {
    try {
      new URL(string);
      return true;
    } catch {
      return false;
    }
  }
};
```

## バージョン管理

### アプリケーションバージョン
```javascript
const APP_CONFIG = {
  version: '1.0.0',
  lastUpdated: '2025-06-21',
  features: [
    'DALL-E画像生成',
    '9列スプレッドシート構造',
    'バッチ処理対応',
    'エラーハンドリング',
    'プログレス表示'
  ],
  dependencies: {
    'google-apps-script': 'V8',
    'openai-api': 'v1'
  }
};

// バージョン情報取得
function getVersionInfo() {
  return {
    ...APP_CONFIG,
    runtimeVersion: ScriptApp.getService().getRuntimeVersion(),
    timezone: Session.getScriptTimeZone()
  };
}
```

### 互換性マトリックス
```javascript
const COMPATIBILITY = {
  'google-apps-script': {
    minimum: 'V8',
    recommended: 'V8',
    features: {
      'arrow-functions': true,
      'async-await': false, // GASではサポートされていない
      'modern-js': true,
      'es6-modules': false
    }
  },
  'openai-api': {
    supported: ['v1'],
    models: ['dall-e-2', 'dall-e-3'],
    features: {
      'image-generation': true,
      'image-editing': false, // 未実装
      'variations': false // 未実装
    }
  }
};
```

## 開発環境依存関係

### clasp (Command Line Apps Script Projects)
```json
{
  "scriptId": "your-script-id",
  "rootDir": "./src",
  "filePushOrder": [
    "Code.gs",
    "Sidebar.html"
  ]
}
```

### 推奨VS Code拡張機能
```json
{
  "recommendations": [
    "google.clasp",
    "ms-vscode.vscode-typescript-next",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss"
  ]
}
```

### TypeScript定義（開発時）
```typescript
// global.d.ts
declare global {
  const SpreadsheetApp: GoogleAppsScript.Spreadsheet.SpreadsheetApp;
  const UrlFetchApp: GoogleAppsScript.URL_Fetch.UrlFetchApp;
  const PropertiesService: GoogleAppsScript.Properties.PropertiesService;
  const Utilities: GoogleAppsScript.Utilities;
  const Session: GoogleAppsScript.Session;
  const DriveApp: GoogleAppsScript.Drive.DriveApp;
  const HtmlService: GoogleAppsScript.HTML.HtmlService;
  const ScriptApp: GoogleAppsScript.Script.ScriptApp;
}

// OpenAI API型定義
interface OpenAIImageRequest {
  prompt: string;
  model?: 'dall-e-2' | 'dall-e-3';
  n?: number;
  size?: '256x256' | '512x512' | '1024x1024';
  quality?: 'standard' | 'hd';
  style?: 'vivid' | 'natural';
}

interface OpenAIImageResponse {
  created: number;
  data: Array<{
    url: string;
    revised_prompt?: string;
  }>;
}
```

## 設定管理

### 環境設定
```javascript
const CONFIG = {
  // 開発環境
  development: {
    apiEndpoint: 'https://api.openai.com/v1',
    logLevel: 'DEBUG',
    retryCount: 1,
    timeout: 10000
  },
  
  // 本番環境
  production: {
    apiEndpoint: 'https://api.openai.com/v1',
    logLevel: 'ERROR',
    retryCount: 3,
    timeout: 30000
  }
};

// 環境取得
function getCurrentEnvironment() {
  const scriptId = ScriptApp.getScriptId();
  return scriptId.includes('dev') ? 'development' : 'production';
}

function getConfig() {
  const env = getCurrentEnvironment();
  return CONFIG[env];
}
```

### 設定値検証
```javascript
function validateConfiguration() {
  const config = getConfig();
  const apiKey = PropertiesService.getScriptProperties()
    .getProperty('OPENAI_API_KEY');
  
  const validationResults = {
    apiKey: !!apiKey && apiKey.startsWith('sk-'),
    endpoint: !!config.apiEndpoint,
    timeout: config.timeout > 0,
    retryCount: config.retryCount >= 0
  };
  
  const isValid = Object.values(validationResults).every(Boolean);
  
  if (!isValid) {
    console.error('設定に問題があります:', validationResults);
    throw new Error('設定が不正です');
  }
  
  return validationResults;
}
```

## パフォーマンス依存関係

### Google Apps Script制限
```javascript
const GAS_LIMITS = {
  // 実行時間
  executionTime: {
    simple: 6 * 60 * 1000,      // 6分
    installable: 6 * 60 * 1000   // 6分
  },
  
  // URL Fetch
  urlFetch: {
    daily: 20000,                // 1日あたり
    concurrent: 20,              // 同時実行
    timeout: 30 * 1000,          // 30秒
    responseSize: 50 * 1024 * 1024 // 50MB
  },
  
  // スプレッドシート
  spreadsheet: {
    cells: 10 * 1000 * 1000,     // 1000万セル
    columns: 18278,              // ZZZ列まで
    rows: 1000000                // 100万行
  },
  
  // メモリ（目安）
  memory: {
    heap: 100 * 1024 * 1024     // 約100MB
  }
};
```

### パフォーマンス監視
```javascript
function checkPerformanceMetrics() {
  const startTime = Date.now();
  const startMemory = getMemoryUsage(); // 疑似的
  
  return {
    checkExecutionTime() {
      return Date.now() - startTime;
    },
    
    checkMemoryUsage() {
      return getMemoryUsage() - startMemory;
    },
    
    isNearLimit(percentage = 90) {
      const executionTime = this.checkExecutionTime();
      const limit = GAS_LIMITS.executionTime.simple;
      return (executionTime / limit) * 100 > percentage;
    }
  };
}

// 使用例
function processWithMonitoring() {
  const monitor = checkPerformanceMetrics();
  
  // 処理実行
  while (hasMoreWork() && !monitor.isNearLimit(85)) {
    doWork();
  }
  
  if (monitor.isNearLimit(85)) {
    console.warn('実行時間制限に近づいています');
    scheduleNextExecution();
  }
}
```

## トラブルシューティング用診断

### 依存関係診断
```javascript
function diagnoseDependencies() {
  const results = {
    timestamp: new Date().toISOString(),
    version: APP_CONFIG.version,
    environment: getCurrentEnvironment(),
    checks: {}
  };
  
  // Google APIs チェック
  try {
    SpreadsheetApp.getActiveSpreadsheet();
    results.checks.spreadsheetApi = 'OK';
  } catch (error) {
    results.checks.spreadsheetApi = 'ERROR: ' + error.message;
  }
  
  // URL Fetch チェック
  try {
    UrlFetchApp.fetch('https://httpbin.org/get', { muteHttpExceptions: true });
    results.checks.urlFetch = 'OK';
  } catch (error) {
    results.checks.urlFetch = 'ERROR: ' + error.message;
  }
  
  // OpenAI API チェック
  try {
    const apiKey = PropertiesService.getScriptProperties()
      .getProperty('OPENAI_API_KEY');
    if (apiKey) {
      results.checks.openaiKey = 'CONFIGURED';
    } else {
      results.checks.openaiKey = 'NOT_CONFIGURED';
    }
  } catch (error) {
    results.checks.openaiKey = 'ERROR: ' + error.message;
  }
  
  console.log('依存関係診断結果:', results);
  return results;
}
```
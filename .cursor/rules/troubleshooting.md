# トラブルシューティングガイド

## 一般的な問題と解決方法

### Google Apps Script 関連

#### 1. 実行時間制限エラー
**エラー**: `Exception: Exceeded maximum execution time`

**原因**:
- Google Apps Scriptの6分実行時間制限
- 大量の画像を一度に生成しようとしている
- API応答が遅い

**解決方法**:
```javascript
// バッチ処理で分割実行
function generateImagesInBatches() {
  const BATCH_SIZE = 5;
  const sheet = SpreadsheetApp.getActiveSheet();
  const lastRow = sheet.getLastRow();
  
  for (let startRow = 2; startRow <= lastRow; startRow += BATCH_SIZE) {
    const endRow = Math.min(startRow + BATCH_SIZE - 1, lastRow);
    
    try {
      processRows(startRow, endRow);
      
      // 次のバッチまで少し待機
      Utilities.sleep(1000);
      
      // 実行時間チェック
      if (isNearTimeLimit()) {
        scheduleNextBatch(endRow + 1);
        break;
      }
    } catch (error) {
      console.error(`バッチ ${startRow}-${endRow} でエラー:`, error);
    }
  }
}

function isNearTimeLimit() {
  // 5分30秒を超えた場合に次のバッチをスケジュール
  return new Date() - startTime > 5.5 * 60 * 1000;
}
```

#### 2. メモリ不足エラー
**エラー**: `Exception: Service invoked too many times for one day`

**原因**:
- 大きな画像ファイルの処理
- 一度に大量のデータを読み込み

**解決方法**:
```javascript
// メモリ効率的な処理
function processLargeDataset() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const CHUNK_SIZE = 10;
  
  // 必要な範囲のみ読み込み
  const dataRange = sheet.getRange(2, 1, sheet.getLastRow() - 1, 9);
  const values = dataRange.getValues();
  
  // チャンクごとに処理
  for (let i = 0; i < values.length; i += CHUNK_SIZE) {
    const chunk = values.slice(i, i + CHUNK_SIZE);
    processChunk(chunk, i + 2); // +2 for 1-indexed and header row
    
    // メモリクリーンアップ
    Utilities.sleep(100);
  }
}

function processChunk(chunk, startRow) {
  const updates = chunk.map((row, index) => {
    // 行の処理
    return processRow(row);
  });
  
  // 一括更新
  const range = SpreadsheetApp.getActiveSheet()
    .getRange(startRow, 1, chunk.length, 9);
  range.setValues(updates);
}
```

### OpenAI API 関連

#### 3. API キーエラー
**エラー**: `401 Unauthorized` または `Invalid API key`

**診断手順**:
```javascript
function diagnoseAPIKey() {
  const apiKey = PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');
  
  if (!apiKey) {
    console.error('❌ APIキーが設定されていません');
    return false;
  }
  
  if (!apiKey.startsWith('sk-')) {
    console.error('❌ APIキーの形式が正しくありません');
    return false;
  }
  
  if (apiKey.length < 20) {
    console.error('❌ APIキーが短すぎます');
    return false;
  }
  
  // テスト呼び出し
  try {
    const testResponse = UrlFetchApp.fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    if (testResponse.getResponseCode() === 200) {
      console.log('✅ APIキーは有効です');
      return true;
    } else {
      console.error('❌ APIキーが無効または期限切れです');
      return false;
    }
  } catch (error) {
    console.error('❌ API接続エラー:', error.message);
    return false;
  }
}
```

#### 4. レート制限エラー
**エラー**: `429 Too Many Requests`

**解決方法**:
```javascript
class RateLimiter {
  constructor(requestsPerMinute = 60) {
    this.requestsPerMinute = requestsPerMinute;
    this.requests = [];
  }
  
  async waitIfNeeded() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // 1分以内のリクエストをフィルタリング
    this.requests = this.requests.filter(time => time > oneMinuteAgo);
    
    if (this.requests.length >= this.requestsPerMinute) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = 60000 - (now - oldestRequest);
      
      if (waitTime > 0) {
        console.log(`レート制限により ${waitTime}ms 待機中...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    this.requests.push(now);
  }
}

const rateLimiter = new RateLimiter(50); // 安全マージンを含めて50req/min

async function generateImageWithRateLimit(prompt) {
  await rateLimiter.waitIfNeeded();
  return generateImage(prompt);
}
```

#### 5. 画像生成失敗
**エラー**: コンテンツポリシー違反や技術的エラー

**解決方法**:
```javascript
function generateImageWithFallback(prompt, retryCount = 0) {
  const MAX_RETRIES = 3;
  
  try {
    return callOpenAIAPI(prompt);
  } catch (error) {
    console.error(`画像生成失敗 (試行 ${retryCount + 1}):`, error.message);
    
    // コンテンツポリシー違反の場合
    if (error.message.includes('content_policy_violation')) {
      const sanitizedPrompt = sanitizePrompt(prompt);
      if (sanitizedPrompt !== prompt && retryCount < MAX_RETRIES) {
        return generateImageWithFallback(sanitizedPrompt, retryCount + 1);
      }
      throw new Error(`コンテンツポリシー違反: ${prompt}`);
    }
    
    // 一時的なエラーの場合はリトライ
    if (isTemporaryError(error) && retryCount < MAX_RETRIES) {
      const delay = Math.pow(2, retryCount) * 1000; // 指数バックオフ
      Utilities.sleep(delay);
      return generateImageWithFallback(prompt, retryCount + 1);
    }
    
    throw error;
  }
}

function sanitizePrompt(prompt) {
  // 問題になりそうなキーワードを置換
  const replacements = {
    'violence': 'peaceful scene',
    'weapon': 'tool',
    'blood': 'red liquid'
  };
  
  let sanitized = prompt;
  Object.entries(replacements).forEach(([bad, good]) => {
    sanitized = sanitized.replace(new RegExp(bad, 'gi'), good);
  });
  
  return sanitized;
}

function isTemporaryError(error) {
  const temporaryErrors = [
    'server_error',
    'timeout',
    'rate_limit_exceeded',
    'service_unavailable'
  ];
  
  return temporaryErrors.some(temp => 
    error.message.toLowerCase().includes(temp)
  );
}
```

### スプレッドシート関連

#### 6. セル書き込みエラー
**エラー**: `Exception: The coordinates or dimensions of the range are invalid`

**解決方法**:
```javascript
function safeSetValue(sheet, row, col, value) {
  try {
    // 範囲チェック
    const maxRows = sheet.getMaxRows();
    const maxCols = sheet.getMaxColumns();
    
    if (row < 1 || row > maxRows || col < 1 || col > maxCols) {
      throw new Error(`範囲外: row=${row}, col=${col}, max=${maxRows}x${maxCols}`);
    }
    
    const cell = sheet.getRange(row, col);
    cell.setValue(value);
    
    return true;
  } catch (error) {
    console.error(`セル設定エラー (${row}, ${col}):`, error.message);
    return false;
  }
}

function insertImageToCell(imageUrl, sheet, row, col) {
  try {
    // 画像URLの検証
    if (!imageUrl || !imageUrl.startsWith('http')) {
      throw new Error('無効な画像URL');
    }
    
    // 画像を取得してBlobに変換
    const response = UrlFetchApp.fetch(imageUrl);
    const blob = response.getBlob();
    
    // セルサイズに合わせて画像を調整
    const cell = sheet.getRange(row, col);
    cell.setValue(''); // セルをクリア
    
    // 画像を挿入
    const image = sheet.insertImage(blob, col, row);
    
    // 画像サイズを調整
    image.setWidth(100);
    image.setHeight(100);
    
    return true;
  } catch (error) {
    console.error('画像挿入エラー:', error.message);
    // フォールバック: URLのみ設定
    return safeSetValue(sheet, row, col, imageUrl);
  }
}
```

#### 7. 権限エラー
**エラー**: `Exception: You do not have permission to call getRange`

**解決方法**:
```javascript
function checkPermissions() {
  try {
    // 基本的な読み取り権限をテスト
    const sheet = SpreadsheetApp.getActiveSheet();
    const testRange = sheet.getRange('A1');
    testRange.getValue();
    
    // 書き込み権限をテスト
    const originalValue = testRange.getValue();
    testRange.setValue('test');
    testRange.setValue(originalValue);
    
    console.log('✅ 必要な権限が揃っています');
    return true;
  } catch (error) {
    console.error('❌ 権限不足:', error.message);
    showUserMessage('スプレッドシートへの編集権限が必要です');
    return false;
  }
}

function requestPermissions() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    '権限が必要です',
    'このアドオンを使用するには、スプレッドシートの編集権限が必要です。許可しますか？',
    ui.ButtonSet.YES_NO
  );
  
  if (response === ui.Button.YES) {
    // 権限を要求する処理を実行
    try {
      SpreadsheetApp.getActiveSheet().getRange('A1').getValue();
      return true;
    } catch (error) {
      ui.alert('権限の取得に失敗しました。手動で権限を設定してください。');
      return false;
    }
  }
  
  return false;
}
```

## デバッグ手法

### ログ出力の強化
```javascript
class DebugLogger {
  constructor(enabled = true) {
    this.enabled = enabled;
    this.logs = [];
  }
  
  log(level, message, data = {}) {
    if (!this.enabled) return;
    
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data: JSON.stringify(data)
    };
    
    console.log(`[${level}] ${message}`, data);
    this.logs.push(logEntry);
    
    // ログが多くなりすぎないよう制限
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(-500);
    }
  }
  
  info(message, data) { this.log('INFO', message, data); }
  warn(message, data) { this.log('WARN', message, data); }
  error(message, data) { this.log('ERROR', message, data); }
  debug(message, data) { this.log('DEBUG', message, data); }
  
  exportLogs() {
    const sheet = SpreadsheetApp.getActiveSpreadsheet()
      .insertSheet('Debug_Logs_' + Utilities.formatDate(new Date(), 'JST', 'yyyyMMdd_HHmmss'));
    
    const headers = ['Timestamp', 'Level', 'Message', 'Data'];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    const logData = this.logs.map(log => [
      log.timestamp,
      log.level,
      log.message,
      log.data
    ]);
    
    if (logData.length > 0) {
      sheet.getRange(2, 1, logData.length, headers.length).setValues(logData);
    }
    
    return sheet.getUrl();
  }
}

const logger = new DebugLogger();
```

### パフォーマンス測定
```javascript
class PerformanceMonitor {
  constructor() {
    this.timers = new Map();
  }
  
  start(name) {
    this.timers.set(name, Date.now());
  }
  
  end(name) {
    const startTime = this.timers.get(name);
    if (!startTime) {
      console.warn(`Timer '${name}' was not started`);
      return 0;
    }
    
    const duration = Date.now() - startTime;
    this.timers.delete(name);
    
    console.log(`[PERF] ${name}: ${duration}ms`);
    return duration;
  }
  
  measure(name, func) {
    this.start(name);
    try {
      const result = func();
      this.end(name);
      return result;
    } catch (error) {
      this.end(name);
      throw error;
    }
  }
}

const perf = new PerformanceMonitor();

// 使用例
function generateImageWithPerfMonitoring(prompt) {
  return perf.measure('image_generation', () => {
    return generateImage(prompt);
  });
}
```

## 緊急時対応

### ロールバック機能
```javascript
function createBackup() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const backupSheet = SpreadsheetApp.getActiveSpreadsheet()
    .insertSheet('Backup_' + Utilities.formatDate(new Date(), 'JST', 'yyyyMMdd_HHmmss'));
  
  // 全データをバックアップ
  const sourceRange = sheet.getDataRange();
  const backupRange = backupSheet.getRange(1, 1, sourceRange.getNumRows(), sourceRange.getNumColumns());
  backupRange.setValues(sourceRange.getValues());
  
  // メタデータを記録
  backupSheet.getRange('A1').setNote(`バックアップ作成: ${new Date().toISOString()}`);
  
  console.log(`バックアップ作成完了: ${backupSheet.getName()}`);
  return backupSheet.getName();
}

function restoreFromBackup(backupSheetName) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const backupSheet = spreadsheet.getSheetByName(backupSheetName);
  
  if (!backupSheet) {
    throw new Error(`バックアップシートが見つかりません: ${backupSheetName}`);
  }
  
  const activeSheet = SpreadsheetApp.getActiveSheet();
  const backupRange = backupSheet.getDataRange();
  const targetRange = activeSheet.getRange(1, 1, backupRange.getNumRows(), backupRange.getNumColumns());
  
  targetRange.setValues(backupRange.getValues());
  
  console.log(`復元完了: ${backupSheetName} から復元`);
}
```

### 緊急停止機能
```javascript
let emergencyStop = false;

function setEmergencyStop() {
  emergencyStop = true;
  console.log('🚨 緊急停止が要求されました');
}

function checkEmergencyStop() {
  if (emergencyStop) {
    emergencyStop = false; // リセット
    throw new Error('処理が緊急停止されました');
  }
}

function processWithEmergencyStop(items) {
  for (let i = 0; i < items.length; i++) {
    checkEmergencyStop(); // 各ループで停止確認
    
    try {
      processItem(items[i]);
    } catch (error) {
      if (error.message.includes('緊急停止')) {
        console.log(`緊急停止: ${i}/${items.length} 処理済み`);
        break;
      }
      throw error;
    }
  }
}
```
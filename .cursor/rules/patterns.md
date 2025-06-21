# 設計パターン・ベストプラクティス

## Google Apps Script パターン

### 1. シングルトンパターン
Google Apps Scriptのグローバル関数を活用した状態管理

```javascript
// グローバル設定管理
function getGlobalConfig() {
  if (typeof globalThis._config === 'undefined') {
    globalThis._config = {
      apiKey: PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY'),
      defaultImageSize: '1024x1024',
      maxRetries: 3
    };
  }
  return globalThis._config;
}

// 使用例
function generateImage(prompt) {
  const config = getGlobalConfig();
  return callAPI(prompt, config.apiKey, config.defaultImageSize);
}
```

### 2. ファクトリーパターン
異なる画像生成プロバイダーに対応

```javascript
class ImageGeneratorFactory {
  static create(provider) {
    switch (provider) {
      case 'openai':
        return new OpenAIGenerator();
      case 'midjourney':
        return new MidjourneyGenerator();
      case 'stable-diffusion':
        return new StableDiffusionGenerator();
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }
}

// 基底クラス
class ImageGenerator {
  generate(prompt, options) {
    throw new Error('generate method must be implemented');
  }
}

// OpenAI実装
class OpenAIGenerator extends ImageGenerator {
  generate(prompt, options = {}) {
    return this.callOpenAIAPI(prompt, options);
  }
  
  callOpenAIAPI(prompt, options) {
    // OpenAI API実装
  }
}
```

### 3. デコレーターパターン
機能拡張（ログ、リトライ、キャッシュ）

```javascript
// ベース関数
function basicImageGeneration(prompt) {
  return callOpenAIAPI(prompt);
}

// ログデコレーター
function withLogging(func) {
  return function(prompt) {
    console.log(`画像生成開始: ${prompt}`);
    const start = new Date();
    
    try {
      const result = func.call(this, prompt);
      const duration = new Date() - start;
      console.log(`画像生成完了: ${duration}ms`);
      return result;
    } catch (error) {
      console.error(`画像生成エラー: ${error.message}`);
      throw error;
    }
  };
}

// リトライデコレーター
function withRetry(func, maxRetries = 3) {
  return function(prompt) {
    let lastError;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return func.call(this, prompt);
      } catch (error) {
        lastError = error;
        if (i < maxRetries - 1) {
          Utilities.sleep(Math.pow(2, i) * 1000); // 指数バックオフ
        }
      }
    }
    
    throw lastError;
  };
}

// キャッシュデコレーター
function withCache(func, cacheMinutes = 60) {
  return function(prompt) {
    const cacheKey = `image_${Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, prompt)}`;
    const cached = getCachedResult(cacheKey);
    
    if (cached) {
      return cached;
    }
    
    const result = func.call(this, prompt);
    setCachedResult(cacheKey, result, cacheMinutes);
    return result;
  };
}

// 使用例
const enhancedImageGeneration = withLogging(
  withRetry(
    withCache(basicImageGeneration, 30),
    3
  )
);
```

### 4. オブザーバーパターン
進捗通知とイベント処理

```javascript
class ProgressNotifier {
  constructor() {
    this.observers = [];
  }
  
  subscribe(observer) {
    this.observers.push(observer);
  }
  
  unsubscribe(observer) {
    this.observers = this.observers.filter(obs => obs !== observer);
  }
  
  notify(data) {
    this.observers.forEach(observer => observer.update(data));
  }
}

// 進捗オブザーバー
class ProgressObserver {
  update(data) {
    const { current, total, message } = data;
    const percentage = Math.round((current / total) * 100);
    console.log(`進捗: ${percentage}% - ${message}`);
    
    // サイドバーのUI更新
    updateProgressBar(percentage, message);
  }
}

// エラーオブザーバー
class ErrorObserver {
  update(data) {
    if (data.type === 'error') {
      console.error(`エラー発生: ${data.message}`);
      showErrorMessage(data.message);
    }
  }
}

// 使用例
const notifier = new ProgressNotifier();
notifier.subscribe(new ProgressObserver());
notifier.subscribe(new ErrorObserver());

function generateImagesWithProgress(prompts) {
  prompts.forEach((prompt, index) => {
    notifier.notify({
      current: index + 1,
      total: prompts.length,
      message: `画像生成中: ${prompt.substring(0, 30)}...`
    });
    
    try {
      generateImage(prompt);
    } catch (error) {
      notifier.notify({
        type: 'error',
        message: error.message
      });
    }
  });
}
```

## エラーハンドリングパターン

### 1. Result型パターン
成功・失敗を明示的に扱う

```javascript
class Result {
  constructor(value, error) {
    this.value = value;
    this.error = error;
    this.isSuccess = !error;
  }
  
  static success(value) {
    return new Result(value, null);
  }
  
  static failure(error) {
    return new Result(null, error);
  }
  
  map(func) {
    if (this.isSuccess) {
      try {
        return Result.success(func(this.value));
      } catch (error) {
        return Result.failure(error);
      }
    }
    return this;
  }
  
  flatMap(func) {
    if (this.isSuccess) {
      return func(this.value);
    }
    return this;
  }
  
  orElse(defaultValue) {
    return this.isSuccess ? this.value : defaultValue;
  }
}

// 使用例
function generateImageSafely(prompt) {
  try {
    if (!prompt || prompt.trim().length === 0) {
      return Result.failure(new Error('プロンプトが空です'));
    }
    
    const imageUrl = callOpenAIAPI(prompt);
    return Result.success(imageUrl);
  } catch (error) {
    return Result.failure(error);
  }
}

// チェーンで処理
generateImageSafely(prompt)
  .map(url => insertImageToSheet(url))
  .map(cell => updateMetadata(cell))
  .orElse('デフォルト画像URL');
```

### 2. サーキットブレーカーパターン
API障害時の連鎖障害防止

```javascript
class CircuitBreaker {
  constructor(threshold = 5, timeout = 60000) {
    this.threshold = threshold; // 失敗閾値
    this.timeout = timeout; // タイムアウト時間
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
  }
  
  async call(func) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime < this.timeout) {
        throw new Error('サーキットブレーカーが開いています');
      }
      this.state = 'HALF_OPEN';
    }
    
    try {
      const result = await func();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }
  
  onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
    }
  }
}

// 使用例
const apiCircuitBreaker = new CircuitBreaker(3, 30000);

function generateImageWithCircuitBreaker(prompt) {
  return apiCircuitBreaker.call(() => callOpenAIAPI(prompt));
}
```

## データ処理パターン

### 1. パイプラインパターン
データ変換の連鎖処理

```javascript
class Pipeline {
  constructor(initialValue) {
    this.value = initialValue;
  }
  
  pipe(func) {
    this.value = func(this.value);
    return this;
  }
  
  get() {
    return this.value;
  }
}

// パイプライン関数
const validatePrompt = (data) => {
  if (!data.prompt || data.prompt.trim().length === 0) {
    throw new Error('プロンプトが必要です');
  }
  return data;
};

const combinePrompts = (data) => ({
  ...data,
  finalPrompt: `${data.prompt} ${data.commonPrompt || ''}`.trim()
});

const generateImage = (data) => ({
  ...data,
  imageUrl: callOpenAIAPI(data.finalPrompt)
});

const calculateMetadata = (data) => ({
  ...data,
  aspectRatio: calculateAspectRatio(data.imageUrl),
  generatedAt: new Date().toISOString()
});

// 使用例
function processImageGeneration(inputData) {
  return new Pipeline(inputData)
    .pipe(validatePrompt)
    .pipe(combinePrompts)
    .pipe(generateImage)
    .pipe(calculateMetadata)
    .get();
}
```

### 2. バッチ処理パターン
大量データの効率的処理

```javascript
class BatchProcessor {
  constructor(batchSize = 10, delayMs = 1000) {
    this.batchSize = batchSize;
    this.delayMs = delayMs;
  }
  
  async process(items, processorFunc) {
    const results = [];
    
    for (let i = 0; i < items.length; i += this.batchSize) {
      const batch = items.slice(i, i + this.batchSize);
      
      console.log(`バッチ処理中: ${i + 1}-${i + batch.length}/${items.length}`);
      
      const batchResults = await Promise.all(
        batch.map(async (item, index) => {
          try {
            return await processorFunc(item, i + index);
          } catch (error) {
            console.error(`アイテム ${i + index} でエラー:`, error);
            return { error: error.message, item };
          }
        })
      );
      
      results.push(...batchResults);
      
      // レート制限対応
      if (i + this.batchSize < items.length) {
        await this.delay(this.delayMs);
      }
    }
    
    return results;
  }
  
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 使用例
const processor = new BatchProcessor(5, 2000);

async function generateMultipleImages(prompts) {
  return await processor.process(prompts, async (prompt, index) => {
    const result = await generateImageSafely(prompt);
    return {
      index,
      prompt,
      imageUrl: result.value,
      error: result.error?.message
    };
  });
}
```

## UI パターン

### 1. コマンドパターン
ユーザーアクションの管理

```javascript
class Command {
  execute() {
    throw new Error('execute method must be implemented');
  }
  
  undo() {
    throw new Error('undo method must be implemented');
  }
}

class GenerateImageCommand extends Command {
  constructor(prompt, cell) {
    super();
    this.prompt = prompt;
    this.cell = cell;
    this.previousValue = null;
  }
  
  execute() {
    this.previousValue = this.cell.getValue();
    const imageUrl = generateImage(this.prompt);
    this.cell.setValue(imageUrl);
    return imageUrl;
  }
  
  undo() {
    if (this.previousValue !== null) {
      this.cell.setValue(this.previousValue);
    }
  }
}

class CommandManager {
  constructor() {
    this.commands = [];
    this.currentIndex = -1;
  }
  
  execute(command) {
    // 現在位置以降のコマンドを削除
    this.commands = this.commands.slice(0, this.currentIndex + 1);
    
    const result = command.execute();
    this.commands.push(command);
    this.currentIndex++;
    
    return result;
  }
  
  undo() {
    if (this.currentIndex >= 0) {
      const command = this.commands[this.currentIndex];
      command.undo();
      this.currentIndex--;
    }
  }
  
  redo() {
    if (this.currentIndex < this.commands.length - 1) {
      this.currentIndex++;
      const command = this.commands[this.currentIndex];
      command.execute();
    }
  }
}
```

### 2. 状態管理パターン
アプリケーション状態の一元管理

```javascript
class AppState {
  constructor() {
    this.state = {
      processing: false,
      progress: 0,
      errors: [],
      settings: {
        imageSize: '1024x1024',
        retryCount: 3
      }
    };
    this.listeners = [];
  }
  
  subscribe(listener) {
    this.listeners.push(listener);
  }
  
  setState(updates) {
    const prevState = { ...this.state };
    this.state = { ...this.state, ...updates };
    
    this.listeners.forEach(listener => {
      listener(this.state, prevState);
    });
  }
  
  getState() {
    return { ...this.state };
  }
}

// グローバル状態管理
const appState = new AppState();

// UI更新リスナー
appState.subscribe((newState, prevState) => {
  if (newState.processing !== prevState.processing) {
    updateProcessingIndicator(newState.processing);
  }
  
  if (newState.progress !== prevState.progress) {
    updateProgressBar(newState.progress);
  }
});

// 使用例
function startImageGeneration() {
  appState.setState({ processing: true, progress: 0 });
  
  // 処理実行
  generateImages()
    .then(() => {
      appState.setState({ processing: false, progress: 100 });
    })
    .catch(error => {
      appState.setState({ 
        processing: false, 
        errors: [...appState.getState().errors, error.message] 
      });
    });
}
```

## パフォーマンス最適化パターン

### 1. メモ化パターン
計算結果のキャッシュ

```javascript
function memoize(func, keyGenerator = (...args) => JSON.stringify(args)) {
  const cache = new Map();
  
  return function(...args) {
    const key = keyGenerator(...args);
    
    if (cache.has(key)) {
      return cache.get(key);
    }
    
    const result = func.apply(this, args);
    cache.set(key, result);
    
    // メモリリーク防止（最大100件）
    if (cache.size > 100) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }
    
    return result;
  };
}

// 使用例
const memoizedImageGeneration = memoize(
  generateImage,
  (prompt) => `img_${Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, prompt)}`
);
```

### 2. 遅延読み込みパターン
必要時にのみリソースを読み込み

```javascript
class LazyLoader {
  constructor(loader) {
    this.loader = loader;
    this.loaded = false;
    this.value = null;
  }
  
  get() {
    if (!this.loaded) {
      this.value = this.loader();
      this.loaded = true;
    }
    return this.value;
  }
  
  reset() {
    this.loaded = false;
    this.value = null;
  }
}

// 使用例
const lazyAPIKey = new LazyLoader(() => {
  console.log('APIキーを読み込み中...');
  return PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');
});

function generateImage(prompt) {
  const apiKey = lazyAPIKey.get(); // 初回のみ実際に読み込み
  return callOpenAIAPI(prompt, apiKey);
}
```
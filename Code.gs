/**
 * スプレッドシート画像生成ツール - メインスクリプト
 * OpenAI DALL-E APIを使用してスプレッドシートに画像を生成・挿入するツール
 */

// OpenAI API キーはスクリプトのプロパティに保存
function getOpenAIApiKey() {
  const apiKey =
    PropertiesService.getScriptProperties().getProperty("OPENAI_API_KEY");
  if (!apiKey) {
    throw new Error(
      "OpenAI API キーが設定されていません。スクリプトのプロパティで OPENAI_API_KEY を設定してください。"
    );
  }
  return apiKey;
}

/**
 * スプレッドシート起動時にメニューを追加し、サイドバーを自動表示
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu("🎨 画像ツール")
    .addItem("📱 サイドバーを開く", "showSidebar")
    .addItem("🔧 新規プロジェクト作成", "initialSetup")
    .addSeparator()
    .addItem("🎯 共通プロンプト管理シートを作成", "createCommonPromptSheetMenu")
    .addItem("📊 整列", "alignQualitySettings")
    .addSeparator()
    .addItem("💾 バックアップ作成", "createBackupAndNewTable")
    .addItem("🧹 全データをリセット", "clearSheetMenu")
    .addSeparator()
    .addItem("📋 バージョン記録を開く", "openVersionSheet")
    .addSeparator()
    .addItem("🔐 権限承認を実行", "forcePermissionRequest")
    .addSeparator()
    .addItem("🧪 ライブラリ転記テスト実行", "testAddToImageLibraryForced")
    .addSeparator()
    .addItem("⚙️ 設定を確認", "checkSettings")
    .addToUi();

  // 🔐 権限チェック後のサイドバー自動表示
  try {
    Utilities.sleep(100); // 100ms待機で確実な表示

    // 初回使用時は簡潔な使い方を表示
    if (isFirstTimeUser()) {
      console.log("💡 初回使用者: 使い方ガイドを表示します");
      showUsageGuide();
    } else {
      // 🚀 権限承認済みかチェック
      const permissionResult = showPermissionAlertIfNeeded();

      if (permissionResult.success && !permissionResult.alerted) {
        // 権限OK: サイレントでサイドバー表示
        showSidebar();
        console.log("✅ サイドバーを自動表示しました（権限承認済み）");
      } else if (permissionResult.alerted) {
        // 権限不足: アラート表示済みなので処理終了
        console.log("🔐 権限承認が必要: アラート表示済み");
      }
    }
  } catch (error) {
    console.log("⚠️ サイドバーの自動表示をスキップ:", error.message);
    // フォールバック: 従来の使い方ガイド表示
    if (
      error.message.includes("container.ui") ||
      error.message.includes("permissions")
    ) {
      showUsageGuide();
    }
  }
}

/**
 * 初期セットアップ（プロンプト入力エリアを作成）- 権限チェック統合版
 */
function initialSetup() {
  // 🔐 権限チェック最優先実行
  const permissionResult = showPermissionAlertIfNeeded();

  // 権限が不足している場合はアラート表示済みなので終了
  if (!permissionResult.success && permissionResult.alerted) {
    console.log("🔐 権限不足: 初期セットアップをスキップ");
    return "権限承認が必要です";
  }

  try {
    console.log("📋 構造化テーブルの初期化を開始します（権限チェック済み）");

    // 権限OK: 直接初期化実行
    const result = createStructuredTable();

    console.log("✅ 構造化テーブルの初期化が完了しました");
    return result;
  } catch (error) {
    console.error("表初期化エラー:", error);
    throw new Error(`表の初期化に失敗しました: ${error.message}`);
  }
}

/**
 * サイドバーを表示（権限チェック統合版）
 */
function showSidebar() {
  // 🔐 権限チェック最優先実行
  const permissionResult = showPermissionAlertIfNeeded();

  // 権限が不足している場合はアラート表示済みなので終了
  if (!permissionResult.success && permissionResult.alerted) {
    console.log("🔐 権限不足: アラート表示済み、サイドバー表示をスキップ");
    return;
  }

  try {
    // 権限OK: サイドバーを表示
    const html = HtmlService.createHtmlOutputFromFile("Sidebar")
      .setTitle("🎨 DALL-E 画像生成ツール")
      .setWidth(500);
    SpreadsheetApp.getUi().showSidebar(html);

    console.log("✅ サイドバー表示成功（権限チェック済み）");
    // 成功したら権限承認済みとして記録
    markPermissionGranted();
  } catch (error) {
    console.error("サイドバー表示エラー:", error);

    // 🔐 権限エラーはサイレント処理（アラート表示削除）
    if (
      error.message.includes("container.ui") ||
      error.message.includes("permissions")
    ) {
      // 権限不足の場合はコンソールログのみ
      console.log("🔐 権限不足: サイドバー表示をスキップしました");
      console.log("💡 メニューから「🔐 権限承認を実行」で権限承認が可能です");
    } else {
      // その他のエラーもコンソールログのみ
      console.error("❌ サイドバー表示エラー:", error.message);
      console.log(
        "💡 解決方法: ページリロード、キャッシュクリア、時間をおいて再実行"
      );
    }
  }
}

/**
 * 権限要求（実際に権限承認ダイアログを表示）
 */
function requestPermissions() {
  try {
    // 1. スプレッドシート権限をテスト
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = spreadsheet.getActiveSheet();

    // 2. Drive権限をテスト（オプション）
    try {
      const file = DriveApp.getFileById(spreadsheet.getId());
      console.log("✅ Drive権限OK");
    } catch (driveError) {
      console.log("⚠️ Drive権限は後で必要になる場合があります");
      // Drive権限エラーは無視して続行
    }

    // 3. UI権限をテスト（これが重要）
    const ui = SpreadsheetApp.getUi();

    // 4. 外部リクエスト権限をテスト（オプション）
    try {
      UrlFetchApp.fetch("https://httpbin.org/get", {
        muteHttpExceptions: true,
        headers: { "User-Agent": "DALL-E Image Generator" },
      });
      console.log("✅ 外部リクエスト権限OK");
    } catch (fetchError) {
      console.log("⚠️ 外部リクエスト権限は画像生成時に必要になります");
      // 外部リクエスト権限エラーは無視して続行
    }

    // 5. サイドバー表示権限をテスト（これが最も重要）
    const html = HtmlService.createHtmlOutput("<p>権限テスト</p>")
      .setTitle("権限テスト")
      .setWidth(950);
    ui.showSidebar(html);

    // テスト用サイドバーを即座に閉じる
    Utilities.sleep(100);

    return "✅ 権限承認が完了しました";
  } catch (error) {
    console.error("権限要求エラー:", error);
    throw error; // エラーを再スローして権限承認ダイアログを表示
  }
}

/**
 * アクティブレンジのA1表記を取得
 */
function getActiveRangeA1() {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();
    const range = sheet.getActiveRange();

    return range.getA1Notation();
  } catch (error) {
    console.error("アクティブレンジの取得エラー:", error);
    throw new Error("アクティブレンジの取得に失敗しました");
  }
}

/**
 * 指定範囲の値を取得
 */
function getRangeValues(a1Notation) {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();
    const range = sheet.getRange(a1Notation);
    const values = range.getValues();

    // 空のセルを除外してプロンプトのみを返す
    const prompts = [];
    values.forEach((row) => {
      row.forEach((cell) => {
        if (cell && typeof cell === "string" && cell.trim() !== "") {
          prompts.push(cell.trim());
        }
      });
    });

    return prompts;
  } catch (error) {
    console.error("範囲値の取得エラー:", error);
    throw new Error("セルの値の取得に失敗しました");
  }
}

/**
 * サイズ判定のみの最小限解析（GPT-Image-1準拠）
 * プロンプトに基づいてサイズのみを判定し、最新の解像度オプションを使用
 * 優先度：強制サイズ指定 > 明確なサイズ指定 > 一般的なキーワード判定
 */
function analyzePromptForOptimalSettings(prompt, forcedSize = null) {
  // 🔥 明確なサイズ指定を最優先で判定
  const explicitSizePatterns = {
    // 明確な横長指定（最優先）
    explicitHorizontal:
      /(16:9|16×9|1536x1024|1536×1024|HORIZONTAL|horizontal|LANDSCAPE|landscape|WIDESCREEN|widescreen|WIDE|wide)/i.test(
        prompt
      ),
    // 明確な縦長指定（最優先）
    explicitVertical:
      /(9:16|9×16|1024x1536|1024×1536|VERTICAL|vertical|PORTRAIT|portrait|TALL|tall)/i.test(
        prompt
      ),
  };

  // 🔥 一般的なキーワード判定（優先度低）
  const generalPatterns = {
    // 一般的な縦長キーワード
    generalPortrait: /(縦|人物|顔|縦長|ポートレート)/i.test(prompt),
    // 一般的な横長キーワード
    generalLandscape: /(横|風景|panorama|パノラマ|panoramic)/i.test(prompt),
  };

  // 🔥 GPT-Image-1の新サイズオプション判定（優先度順）
  let selectedSize = "1024x1024"; // デフォルト（正方形）
  let reason = "デフォルト（正方形）";

  // 🚀 0. 強制サイズ指定を最優先（どんなプロンプトでも強制適用）
  if (forcedSize) {
    selectedSize = forcedSize;
    reason = `強制サイズ指定: ${forcedSize}`;
  }
  // 1. 明確な横長指定を最優先
  else if (explicitSizePatterns.explicitHorizontal) {
    selectedSize = "1536x1024"; // 横長（正しいサイズ）
    reason = "明確な横長指定を検出";
  }
  // 2. 明確な縦長指定を次に優先
  else if (explicitSizePatterns.explicitVertical) {
    selectedSize = "1024x1536"; // 縦長（正しいサイズ）
    reason = "明確な縦長指定を検出";
  }
  // 3. 一般的な横長キーワード
  else if (generalPatterns.generalLandscape) {
    selectedSize = "1536x1024"; // 横長（正しいサイズ）
    reason = "一般的な横長キーワードを検出";
  }
  // 4. 一般的な縦長キーワード
  else if (generalPatterns.generalPortrait) {
    selectedSize = "1024x1536"; // 縦長（正しいサイズ）
    reason = "一般的な縦長キーワードを検出";
  }

  // デバッグ用ログ：判定理由を表示
  console.log(`GPT-Image-1サイズ判定結果: size=${selectedSize} (${reason})`);
  return { size: selectedSize };
}

/**
 * 画像サイズの有効性を検証し、無効な場合は安全なサイズに修正
 */
function validateImageSize(size) {
  // サポートされているサイズ一覧（OpenAI APIの正式サポート値）
  const supportedSizes = ["1024x1024", "1024x1536", "1536x1024", "auto"];

  // undefinedやnullの場合はデフォルトサイズ
  if (!size) {
    console.log("🔧 サイズが未指定のため1024x1024（正方形）に設定");
    return "1024x1024";
  }

  // 文字列に変換して検証
  const sizeStr = String(size).trim();

  // 無効なサイズの自動修正マッピング
  const sizeFixMap = {
    "1792x1024": "1536x1024", // 横長の修正
    "1024x1792": "1024x1536", // 縦長の修正
    "512x512": "1024x1024", // 古いサイズの修正
    "256x256": "1024x1024", // 古いサイズの修正
  };

  // 自動修正が必要な場合
  if (sizeFixMap[sizeStr]) {
    const fixedSize = sizeFixMap[sizeStr];
    console.log(`🔧 無効サイズ自動修正: ${sizeStr} → ${fixedSize}`);
    return fixedSize;
  }

  // サポートされているサイズの場合はそのまま
  if (supportedSizes.includes(sizeStr)) {
    console.log(`✅ サイズ検証OK: ${sizeStr}`);
    return sizeStr;
  }

  // それ以外は全てデフォルトサイズに修正
  console.log(`🔧 未対応サイズのため1024x1024に修正: ${sizeStr}`);
  return "1024x1024";
}

/**
 * プロンプトの最適化処理（完全無改変版）
 * ユーザーのプロンプトを一切改変せずそのまま使用
 */
function optimizePromptForWebParity(prompt) {
  // ユーザーのプロンプトを完全にそのまま使用
  // 一切の改変を行わない
  return prompt;
}

/**
 * プロンプト品質向上処理（完全無改変版）
 * ユーザーのプロンプトを一切改変せずそのまま使用
 */
function enhancePromptForQuality(originalPrompt) {
  // ユーザーのプロンプトを完全にそのまま使用
  // 一切の改変・加工を行わない
  return originalPrompt;
}

/**
 * DALL-E APIを使って画像を生成（画質・サイズ選択対応）
 */
function generateImages(prompts, forcedSize = null, selectedModel = null) {
  if (!prompts || prompts.length === 0) {
    throw new Error("プロンプトが指定されていません");
  }

  const apiKey = getOpenAIApiKey();
  const results = [];
  const errors = [];

  // 🎯 モデル選択のデフォルト設定
  const model = selectedModel || "dall-e-3"; // デフォルトはDALL-E 3

  // 🔥 モデル別設定
  const modelConfigs = {
    "dall-e-3": {
      endpoint: "https://api.openai.com/v1/images/generations",
      defaultQuality: "standard", // standard/hd
      supportedQualities: ["standard", "hd"],
      costPerImage: "$0.02-$0.08",
      description: "DALL-E 3",
    },
    "gpt-image-1": {
      endpoint: "https://api.openai.com/v1/images/generations",
      defaultQuality: "high", // high/medium/low
      supportedQualities: ["high", "medium", "low"],
      costPerImage: "$2-$10",
      description: "GPT-Image-1",
    },
  };

  const config = modelConfigs[model] || modelConfigs["dall-e-3"];

  try {
    prompts.forEach((promptData, index) => {
      // promptDataがオブジェクトかどうかを確認（後方互換性のため）
      let actualPrompt, quality;
      if (typeof promptData === "object") {
        actualPrompt = promptData.prompt;
        quality = promptData.quality || config.defaultQuality;
      } else {
        // 文字列の場合は従来通り（後方互換性）
        actualPrompt = promptData;
        quality = config.defaultQuality;
      }

      // 🔧 品質設定をモデル別に調整
      if (model === "dall-e-3") {
        // DALL-E 3の場合：high/medium/low → standard/hd に変換
        if (quality === "high") {
          quality = "hd";
        } else {
          quality = "standard";
        }
      }

      // スタイル・サイズ判定をtryブロックの外で実行（catchブロックからもアクセス可能）
      const { size: rawSize } = analyzePromptForOptimalSettings(
        actualPrompt,
        forcedSize
      );

      // 🔧 サイズの安全性検証と自動修正
      const selectedSize = validateImageSize(rawSize);

      try {
        console.log(
          `🎨 画像生成中 ${index + 1}/${prompts.length}: ${actualPrompt}`
        );
        console.log(`📱 モデル: ${model} (${config.description})`);
        console.log(`🎯 品質: ${quality}, サイズ: ${selectedSize}`);
        console.log(`💵 コスト: ${config.costPerImage}`);

        // 🚨 プロンプト完全無改変の実現
        // ユーザーのプロンプトを一切改変せずそのまま使用
        // GPT-Image-1の自動改変を防ぐため、パラメーター側で制御
        const finalPrompt = actualPrompt; // ユーザープロンプトを完全にそのまま使用

        // デバッグ用ログ：送信されるプロンプトを確認
        console.log(`ユーザープロンプト（完全無改変）: ${finalPrompt}`);
        console.log(
          `自動設定パラメーター - サイズ: ${selectedSize}, 画質: ${quality}`
        );

        // 🔥 モデル別ペイロード作成
        let payload;

        if (model === "dall-e-3") {
          // DALL-E 3用ペイロード
          payload = {
            model: "dall-e-3",
            prompt: finalPrompt,
            n: 1,
            size: selectedSize,
            quality: quality, // standard/hd
            style: "natural", // DALL-E 3の新機能
          };
        } else {
          // GPT-Image-1用ペイロード（従来通り）
          payload = {
            prompt: finalPrompt,
            n: 1,
            size: selectedSize,
            model: "gpt-image-1",
            quality: quality, // high/medium/low
            background: "auto",
            output_format: "png",
            moderation: "auto",
          };
        }

        // リトライ機能付きAPIリクエスト
        let response;
        let lastError;
        const maxRetries = 3;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            console.log(`画像${index + 1}: 試行${attempt}/${maxRetries}`);

            response = UrlFetchApp.fetch(config.endpoint, {
              method: "POST",
              contentType: "application/json",
              headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                "User-Agent": "SpreadsheetImageGenerator/2.0",
                Accept: "application/json",
                "Accept-Language": "en,ja;q=0.9",
              },
              payload: JSON.stringify(payload),
              muteHttpExceptions: true,
            });

            const responseCode = response.getResponseCode();
            const responseText = response.getContentText();

            if (responseCode === 200) {
              console.log(`画像${index + 1}: 生成成功 (${model})`);
              break; // 成功したらループを抜ける
            } else if (responseCode === 500) {
              // 500エラーの場合はリトライ
              lastError = new Error(
                `OpenAI サーバーエラー (試行${attempt}/${maxRetries}): ${responseCode}\n応答: ${responseText}`
              );
              console.error(`画像${index + 1}: ${lastError.message}`);

              if (attempt < maxRetries) {
                const waitTime = attempt * 2000; // 2秒、4秒、6秒と待機時間を増加
                console.log(`${waitTime / 1000}秒待機してリトライします...`);
                Utilities.sleep(waitTime);
                continue;
              }
            } else if (responseCode === 429) {
              // レート制限エラー
              lastError = new Error(
                `レート制限エラー: リクエストが多すぎます。しばらく待ってから再試行してください。`
              );
              console.error(`画像${index + 1}: ${lastError.message}`);

              if (attempt < maxRetries) {
                const waitTime = 60000; // 1分待機
                console.log(`レート制限のため60秒待機します...`);
                Utilities.sleep(waitTime);
                continue;
              }
            } else {
              // その他のエラー
              lastError = new Error(
                `API エラー: ${responseCode}\n応答: ${responseText}`
              );
              console.error(`画像${index + 1}: ${lastError.message}`);
              break; // リトライしない
            }
          } catch (fetchError) {
            lastError = new Error(
              `ネットワークエラー (試行${attempt}/${maxRetries}): ${fetchError.message}`
            );
            console.error(`画像${index + 1}: ${lastError.message}`);

            if (attempt < maxRetries) {
              const waitTime = attempt * 1000;
              console.log(`${waitTime / 1000}秒待機してリトライします...`);
              Utilities.sleep(waitTime);
              continue;
            }
          }
        }

        // 最終的に失敗した場合
        if (!response || response.getResponseCode() !== 200) {
          throw lastError || new Error("画像生成に失敗しました");
        }

        let data = null;
        try {
          const responseText = response.getContentText();
          if (!responseText || responseText.trim() === "") {
            throw new Error("APIレスポンスが空です");
          }
          data = JSON.parse(responseText);
        } catch (parseError) {
          throw new Error(
            `APIレスポンスの解析に失敗しました: ${parseError.message}`
          );
        }

        if (!data) {
          throw new Error("APIレスポンスが無効です");
        }

        if (!data.data || !Array.isArray(data.data) || data.data.length === 0) {
          throw new Error(
            "画像データの取得に失敗しました（データが空または無効）"
          );
        }

        if (!data.data[0]) {
          throw new Error("画像データの最初の要素が無効です");
        }

        const imageData = data.data[0];
        let imageUrl;

        // 🔥 モデル別レスポンス処理
        if (model === "gpt-image-1") {
          // GPT-Image-1はbase64レスポンス
          if (imageData.b64_json) {
            imageUrl = `data:image/png;base64,${imageData.b64_json}`;
          } else if (imageData.url) {
            imageUrl = imageData.url;
          } else {
            throw new Error("画像データの形式が不正です");
          }
        } else {
          // DALL-E 3はURL形式
          if (imageData.url) {
            imageUrl = imageData.url;
          } else {
            throw new Error("画像URLの取得に失敗しました");
          }
        }

        // 🔍 プロンプト改変の分析（GPT-Image-1の場合）
        const revisedPrompt = imageData.revised_prompt;
        if (revisedPrompt && model === "gpt-image-1") {
          console.log(`📝 ユーザー入力プロンプト: ${actualPrompt}`);
          console.log(`🤖 GPT-Image-1内部処理版: ${revisedPrompt}`);

          const originalLength = actualPrompt.length;
          const revisedLength = revisedPrompt.length;
          const lengthDiff = Math.abs(revisedLength - originalLength);
          const changeRatio = (lengthDiff / originalLength) * 100;

          console.log(
            `📊 内部処理変更度: ${changeRatio.toFixed(
              1
            )}% (${lengthDiff}文字差)`
          );
        }

        results.push({
          prompt: actualPrompt,
          url: imageUrl,
          size: selectedSize, // 画像サイズ情報を追加
          revised_prompt: revisedPrompt || finalPrompt, // 実際に使用されたプロンプト
          original_prompt: actualPrompt, // 元のプロンプトも保存
          quality: quality, // 使用した画質設定も保存
        });

        // API制限を考慮した待機時間
        if (index < prompts.length - 1) {
          Utilities.sleep(1000); // 1秒待機
        }
      } catch (imageError) {
        // 個別の画像生成エラーを記録（全体を停止させない）
        console.error(`画像${index + 1}の生成に失敗:`, imageError);
        errors.push({
          index: index + 1,
          prompt: actualPrompt.substring(0, 50) + "...",
          error: imageError.message,
          quality: quality, // エラー時も画質設定を保存
        });

        // エラーでも結果に追加（エラー情報付き）
        results.push({
          prompt: actualPrompt,
          url: null,
          size: selectedSize,
          error: imageError.message,
          original_prompt: actualPrompt,
          quality: quality, // エラー時も画質設定を保存
          failed: true,
        });
      }
    });

    // 結果の概要をログ出力
    const successCount = results.filter((r) => !r.failed).length;
    const failureCount = errors.length;

    console.log(`画像生成完了: 成功${successCount}枚、失敗${failureCount}枚`);

    if (errors.length > 0) {
      console.warn("失敗した画像:", errors);
    }

    // 全て失敗した場合のみエラーを投げる
    if (successCount === 0) {
      const errorSummary = errors
        .map((e) => `画像${e.index}: ${e.error}`)
        .join("\n");
      throw new Error(`すべての画像生成に失敗しました:\n${errorSummary}`);
    }

    return results;
  } catch (error) {
    // 予期しないエラーの場合
    console.error("画像生成プロセスエラー:", error);
    throw new Error(`画像生成に失敗しました: ${error.message}`);
  }
}

/**
 * シートに画像を挿入（プロンプトの隣に配置）
 */
function insertImages(imageResults, rangeA1) {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();
    const range = sheet.getRange(rangeA1);
    const values = range.getValues();
    const numRows = values.length;
    const numCols = values[0].length;

    let imageIndex = 0;
    let processedCount = 0;

    for (let r = 0; r < numRows; r++) {
      for (let c = 0; c < numCols; c++) {
        const cellValue = values[r][c];

        // セルにプロンプトが入っている場合のみ画像を挿入
        if (
          cellValue &&
          typeof cellValue === "string" &&
          cellValue.trim() !== "" &&
          imageIndex < imageResults.length
        ) {
          const promptRow = range.getRow() + r;
          const promptCol = range.getColumn() + c;

          // プロンプトの隣の列（右隣）に画像を配置
          const imageCol = promptCol + 1;
          const imageCell = sheet.getRange(promptRow, imageCol);
          const imageUrl = imageResults[imageIndex].url;

          // IMAGE関数を使用して画像を表示
          imageCell.setFormula(`=IMAGE("${imageUrl}", 1)`);

          // 画像セルのサイズを調整
          sheet.setRowHeight(promptRow, 200);
          sheet.setColumnWidth(imageCol, 200);

          // プロンプトセルを最適化（長いプロンプトでも表示を制限）
          const promptCell = sheet.getRange(promptRow, promptCol);
          promptCell.setWrap(true); // 💡 改善要求: セル内折り返しを有効化
          promptCell.setVerticalAlignment("middle");

          // プロンプトが長い場合は省略表示
          const originalPrompt = cellValue;
          if (originalPrompt.length > 100) {
            const truncatedPrompt = originalPrompt.substring(0, 97) + "...";
            promptCell.setValue(truncatedPrompt);
            // 元のプロンプトをコメントとして保存 - ユーザープロンプト完全保持
            // 🔧 安全な文字数制限を適用（25,000文字制限）
            const maxSafeLength = 25000;
            let safeOriginal = `完全なプロンプト:\n${originalPrompt}`;
            if (safeOriginal.length > maxSafeLength) {
              safeOriginal =
                safeOriginal.substring(0, maxSafeLength - 100) +
                "\n[文字数制限により省略...]";
            }
            // ユーザープロンプトは絶対に省略しない
            promptCell.setNote(safeOriginal);
          }

          // ヘッダーを設定（初回のみ）
          if (imageIndex === 0) {
            const headerRow = Math.max(1, promptRow - 1);
            if (sheet.getRange(headerRow, promptCol).getValue() === "") {
              sheet.getRange(headerRow, promptCol).setValue("📝 プロンプト");
              sheet.getRange(headerRow, imageCol).setValue("🖼️ 生成画像");

              // ヘッダーのスタイル設定
              const headerRange = sheet.getRange(headerRow, promptCol, 1, 2);
              headerRange.setBackground("#1a73e8");
              headerRange.setFontColor("white");
              headerRange.setFontWeight("bold");
              headerRange.setHorizontalAlignment("center");
              sheet.setRowHeight(headerRow, 35);
            }
          }

          imageIndex++;
          processedCount++;
        }
      }
    }

    // 生成情報を下部に追加（コンパクト版）
    if (processedCount > 0) {
      const lastRow = sheet.getLastRow();
      const infoRow = lastRow + 2;
      const infoRange = sheet.getRange(infoRow, 1, 1, 3);
      infoRange.merge();
      infoRange.setValue(
        `✅ ${processedCount}枚の画像を生成完了 - ${new Date().toLocaleString(
          "ja-JP"
        )}`
      );
      infoRange.setBackground("#e8f5e8");
      infoRange.setFontColor("#2e7d32");
      infoRange.setHorizontalAlignment("center");
      infoRange.setFontWeight("bold");
      sheet.setRowHeight(infoRow, 30);
    }

    return `${processedCount}枚の画像をプロンプトの隣に配置しました`;
  } catch (error) {
    console.error("画像挿入エラー:", error);
    throw new Error(`画像の挿入に失敗しました: ${error.message}`);
  }
}

/**
 * シートからすべての画像URLを取得
 */
function getAllImageUrls() {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();
    const dataRange = sheet.getDataRange();
    const formulas = dataRange.getFormulas();
    const urls = [];

    formulas.forEach((row) => {
      row.forEach((formula) => {
        if (
          formula &&
          typeof formula === "string" &&
          formula.includes("=IMAGE(")
        ) {
          // =IMAGE("url", 1) の形式からURLを抽出
          const match = formula.match(/=IMAGE\("([^"]+)"/i);
          if (match && match[1]) {
            urls.push(match[1]);
          }
        }
      });
    });

    console.log(`${urls.length}個の画像URLを取得`);
    return urls;
  } catch (error) {
    console.error("画像URL取得エラー:", error);
    throw new Error(`画像URLの取得に失敗しました: ${error.message}`);
  }
}

// createImageTable関数は削除 - createStructuredTableに統合されました

/**
 * B列のプロンプトを検出して画像生成（9列構造対応・サイズ強制指定対応）
 */
function generateImagesFromStructuredTable(
  forcedSize = null,
  selectedModel = null
) {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();
    const lastRow = sheet.getLastRow();

    if (lastRow < 2) {
      throw new Error("プロンプトが入力されていません");
    }

    // B列からプロンプトを取得（2行目以降、最大101行目まで）
    const promptRange = sheet.getRange(2, 2, Math.min(lastRow - 1, 100), 1);
    const promptValues = promptRange.getValues();

    const validPrompts = [];
    const promptRows = [];

    promptValues.forEach((row, index) => {
      const prompt = row[0];
      const actualRow = index + 2; // 実際の行番号

      if (prompt && typeof prompt === "string" && prompt.trim() !== "") {
        // 既存データ保護：既に画像が生成されている行はスキップ
        const existingImageCell = sheet.getRange(actualRow, 5); // E列（画像列）
        const existingImage = existingImageCell.getFormula();

        if (existingImage && existingImage.includes("=IMAGE(")) {
          console.log(`行${actualRow}は既に画像が生成済みのためスキップ`);
          return; // この行をスキップ
        }

        // 完全なプロンプトを取得（共通プロンプト結合対応）
        let fullPrompt = getFullPrompt(sheet, actualRow);

        if (!fullPrompt) {
          console.log(`行${actualRow}: プロンプトが取得できませんでした`);
          return; // この行をスキップ
        }

        // H列から画質設定を取得
        const qualityCell = sheet.getRange(actualRow, 8); // H列（画質列）
        let displayQuality = qualityCell.getValue();

        // 表示値をAPI値に変換
        let quality = parseQualityValue(displayQuality);

        // 画質設定の検証とデフォルト値の設定
        if (!quality || !["high", "medium", "low"].includes(quality)) {
          quality = "high"; // デフォルトは高品質
          qualityCell.setValue(formatQualityDisplay("high")); // セルにもデフォルト表示値を設定
          console.log(`行${actualRow}: 画質設定が無効のため "high" に設定`);
        }

        console.log(
          `行${actualRow}: 完全プロンプト取得: ${fullPrompt.substring(
            0,
            50
          )}..., 画質: ${quality}`
        );

        validPrompts.push({
          prompt: fullPrompt,
          quality: quality,
        });
        promptRows.push(actualRow);
      }
    });

    if (validPrompts.length === 0) {
      throw new Error(
        "有効なプロンプトが見つかりません。B列にプロンプトを入力してください。"
      );
    }

    console.log(`${validPrompts.length}個のプロンプトを検出しました`);

    // 🚀 強制サイズ指定ログ
    if (forcedSize) {
      console.log(
        `🔧 強制サイズ指定: ${forcedSize} - プロンプト解析をオーバーライド`
      );
    }

    // 🔧 強制サイズの安全検証
    const safeForcedSize = forcedSize ? validateImageSize(forcedSize) : null;

    // 画像を生成（強制サイズ指定・モデル選択対応）
    const imageResults = generateImages(
      validPrompts,
      safeForcedSize,
      selectedModel
    );

    // 構造化テーブルに結果を配置
    return populateStructuredTable(imageResults, promptRows);
  } catch (error) {
    console.error("構造化テーブル画像生成エラー:", error);
    throw new Error(`画像生成に失敗しました: ${error.message}`);
  }
}

/**
 * 構造化テーブルに画像生成結果を配置（9列構造対応）
 */
function populateStructuredTable(imageResults, promptRows) {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();
    const currentTime = new Date().toLocaleString("ja-JP");
    let processedCount = 0;

    imageResults.forEach((result, index) => {
      const row = promptRows[index];

      if (result.failed) {
        // 失敗した画像の処理（自動生成エリア）
        const imageCell = sheet.getRange(row, 5); // E列：画像
        imageCell.setValue("❌ 生成失敗");
        imageCell.setHorizontalAlignment("center");
        imageCell.setVerticalAlignment("middle");
        imageCell.setFontWeight("bold");
        imageCell.setFontColor("#d32f2f");
        imageCell.setBackground("#ffebee");
        imageCell.setBorder(
          true,
          true,
          true,
          true,
          true,
          true,
          "#f44336",
          SpreadsheetApp.BorderStyle.DASHED
        ); // 📱 視覚改善: エラー用赤色破線
        // エラーメッセージ
        const maxErrorLength = 5000;
        let errorMessage = `❌ 自動生成エラー:\n${result.error}\n\n再生成するには、この行を選択して「🔄 再生成」ボタンをクリックしてください。`;
        if (errorMessage.length > maxErrorLength) {
          errorMessage =
            errorMessage.substring(0, maxErrorLength - 100) +
            "\n[エラーメッセージが長すぎるため省略...]";
        }
        imageCell.setNote(errorMessage);

        // F列: エラー表示（自動生成エリア）
        const ratioCell = sheet.getRange(row, 6);
        ratioCell.setValue("エラー");
        ratioCell.setHorizontalAlignment("center");
        ratioCell.setVerticalAlignment("middle");
        ratioCell.setFontWeight("bold");
        ratioCell.setFontColor("#d32f2f");
        ratioCell.setBackground("#ffebee");
        ratioCell.setBorder(
          true,
          true,
          true,
          true,
          true,
          true,
          "#f44336",
          SpreadsheetApp.BorderStyle.DASHED
        ); // 📱 視覚改善: エラー用赤色破線

        // G列: 生成日時（自動生成エリア）
        const timeCell = sheet.getRange(row, 7);
        timeCell.setValue(currentTime);
        timeCell.setHorizontalAlignment("center");
        timeCell.setVerticalAlignment("middle");
        timeCell.setFontSize(9);
        timeCell.setBackground("#ffebee");
        timeCell.setFontColor("#757575"); // 📱 視覚改善: 控えめなフォント色
        timeCell.setBorder(
          true,
          true,
          true,
          true,
          true,
          true,
          "#f44336",
          SpreadsheetApp.BorderStyle.DASHED
        ); // 📱 視覚改善: エラー用赤色破線

        // H列: ステータス（自動生成エリア）
        const statusCell = sheet.getRange(row, 8);
        statusCell.setValue("❌ 生成失敗");
        statusCell.setHorizontalAlignment("center");
        statusCell.setVerticalAlignment("middle");
        statusCell.setFontWeight("bold");
        statusCell.setFontColor("#d32f2f");
        statusCell.setBackground("#ffebee");
        statusCell.setBorder(
          true,
          true,
          true,
          true,
          true,
          true,
          "#f44336",
          SpreadsheetApp.BorderStyle.DASHED
        ); // 📱 視覚改善: エラー用赤色破線
      } else {
        // 成功した画像の処理
        const imageCell = sheet.getRange(row, 5); // E列：画像
        // base64画像をDriveに保存して短縮URLに変換
        let imageUrlForSheet = result.url;
        if (imageUrlForSheet && imageUrlForSheet.startsWith("data:image")) {
          try {
            imageUrlForSheet = uploadBase64ImageToDrive(imageUrlForSheet);
            console.log(`📁 Driveに保存した画像URL: ${imageUrlForSheet}`);
          } catch (driveError) {
            console.error("🚨 Drive保存失敗:", driveError.message);
          }
        }
        imageCell.setFormula(`=IMAGE("${imageUrlForSheet}", 1)`);

        // F列: 画像比率（動的検出）
        const ratioCell = sheet.getRange(row, 6);
        const imageSize = result.size || "1024x1024";
        let ratio = "1:1";

        if (imageSize === "1024x1536") {
          ratio = "2:3"; // GPT-Image-1縦長
        } else if (imageSize === "1536x1024") {
          ratio = "3:2"; // GPT-Image-1横長
        } else {
          ratio = "1:1"; // 正方形
        }

        ratioCell.setValue(ratio);
        ratioCell.setHorizontalAlignment("center");
        ratioCell.setVerticalAlignment("middle");
        ratioCell.setFontWeight("bold");
        ratioCell.setBackground("#f5f5f5"); // 📱 視覚改善: 自動生成エリアのグレー
        ratioCell.setFontColor("#4caf50"); // 📱 視覚改善: 成功を示す緑色フォント
        ratioCell.setBorder(
          true,
          true,
          true,
          true,
          true,
          true,
          "#bdbdbd",
          SpreadsheetApp.BorderStyle.DASHED
        ); // 📱 視覚改善: 破線境界線

        // G列: 生成日時（自動生成エリア）
        const timeCell = sheet.getRange(row, 7);
        timeCell.setValue(currentTime);
        timeCell.setHorizontalAlignment("center");
        timeCell.setVerticalAlignment("middle");
        timeCell.setFontSize(9);
        timeCell.setBackground("#f5f5f5"); // 📱 視覚改善: 自動生成エリアのグレー
        timeCell.setFontColor("#757575"); // 📱 視覚改善: 控えめなフォント色
        timeCell.setBorder(
          true,
          true,
          true,
          true,
          true,
          true,
          "#bdbdbd",
          SpreadsheetApp.BorderStyle.DASHED
        ); // 📱 視覚改善: 破線境界線

        // H列は画質選択のため、ステータス処理は削除
        // 画質設定は既にユーザーが設定済みなので上書きしない
      }

      // プロンプト情報の処理（UX改善版）
      const individualPrompt = sheet.getRange(row, 2).getValue(); // B列
      const commonPromptName = sheet.getRange(row, 3).getValue(); // C列

      // 結合プロンプトを更新
      updateCombinedPrompt(sheet, row);

      // GPT-Image-1の内部処理情報をコメントとして保存
      if (result.revised_prompt && result.original_prompt) {
        const combinedCell = sheet.getRange(row, 4); // D列：結合プロンプト
        const existingNote = combinedCell.getNote() || "";

        // 内部処理情報を追加
        const revisionInfo = `\n\n🤖 GPT-Image-1内部処理情報:\n元プロンプト: ${result.original_prompt.substring(
          0,
          200
        )}...\n内部処理版: ${result.revised_prompt.substring(0, 200)}...`;
        const updatedNote = existingNote + revisionInfo;

        if (updatedNote.length < 25000) {
          // 安全制限
          combinedCell.setNote(updatedNote);
        }
      }

      // I列: チェックボックス（新しい9列構造）
      const checkboxCell = sheet.getRange(row, 9);
      checkboxCell.insertCheckboxes();
      checkboxCell.setHorizontalAlignment("center");
      checkboxCell.setVerticalAlignment("middle");
      checkboxCell.setBackground("#f0f8ff"); // 📱 視覚改善: ユーザー操作エリアを薄い青色に
      checkboxCell.setBorder(
        true,
        true,
        true,
        true,
        true,
        true,
        "#4caf50",
        SpreadsheetApp.BorderStyle.SOLID
      ); // 📱 視覚改善: 緑色の境界線

      // 行の高さを画像に合わせて調整（固定）
      sheet.setRowHeight(row, 180);

      processedCount++;
    });

    // 🎯 限界突破: ライブラリ記録を完全に書き直し
    console.log("🔥🔥🔥 限界突破: ライブラリ記録システム開始");
    console.log(
      "🚀 画像結果詳細:",
      JSON.stringify(
        imageResults.map((r) => ({
          failed: r.failed,
          imageUrl: r.imageUrl ? r.imageUrl.substring(0, 50) + "..." : "なし",
          originalRow: r.originalRow || "不明",
        }))
      )
    );

    // 🎯 画像設定完了後の待機（確実な画像反映のため）
    console.log("⏳ 画像反映待機中...");
    Utilities.sleep(1500); // 1.5秒待機（画像が確実に設定されるまで）

    // 🎯 限界突破: 直接E列から画像を確認してライブラリに記録
    try {
      console.log("🔧 ライブラリシート準備開始...");
      const librarySheet = getOrCreateLibrarySheet();
      console.log(`📚 ライブラリシート準備完了: ${librarySheet.getName()}`);

      let libraryRecordCount = 0;

      // 🎯 各行を直接チェックして画像が存在する行のみライブラリに記録
      for (let i = 0; i < promptRows.length; i++) {
        const row = promptRows[i];
        const result = imageResults[i];

        console.log(`🔍 行${row}の処理開始: failed=${result.failed}`);

        // 失敗した画像はスキップ
        if (result.failed) {
          console.log(`⏭️ 行${row}は失敗のためスキップ`);
          continue;
        }

        try {
          // 🎯 元シートのE列から直接画像を再確認（最新状態）
          const imageCell = sheet.getRange(row, 5);
          const imageFormula = imageCell.getFormula();

          console.log(
            `📷 行${row} E列画像確認: ${
              imageFormula ? imageFormula.substring(0, 100) + "..." : "なし"
            }`
          );

          // IMAGE関数が存在する場合のみライブラリに記録
          if (imageFormula && imageFormula.includes("=IMAGE(")) {
            // プロンプト取得
            let promptText = "";
            try {
              promptText = getCombinedPrompt(sheet, row) || `画像生成_行${row}`;
            } catch (promptError) {
              promptText = `画像生成_行${row}`;
              console.warn(`プロンプト取得エラー 行${row}:`, promptError);
            }

            // 比率取得
            let aspectRatio = "1024x1024";
            try {
              aspectRatio = sheet.getRange(row, 6).getValue() || "1024x1024";
            } catch (ratioError) {
              console.warn(`比率取得エラー 行${row}:`, ratioError);
            }

            // ライブラリデータ作成（sourceFormulaを最新状態に）
            const libraryData = {
              prompt: promptText,
              imageUrl: result.url || result.imageUrl || "URL不明",
              aspectRatio: aspectRatio,
              status: "✅ GPT-Image-1",
              timestamp: new Date(),
              originalRow: row,
              sourceFormula: imageFormula, // 🎯 最新のフォーミュラを使用
              sourceSheet: sheet.getName(), // 🎯 元シート名を追加
            };

            console.log(`🚀 行${row}のライブラリ記録実行`);
            console.log(`📝 プロンプト: ${promptText.substring(0, 50)}...`);
            console.log(
              `🖼️ フォーミュラ: ${imageFormula.substring(0, 100)}...`
            );

            // ライブラリに記録
            const success = addToImageLibrary(libraryData);

            if (success) {
              libraryRecordCount++;
              console.log(`✅ 行${row}のライブラリ記録成功`);
            } else {
              console.error(`❌ 行${row}のライブラリ記録失敗`);
            }
          } else {
            console.warn(
              `⚠️ 行${row}にはIMAGE関数が存在しません: ${imageFormula}`
            );
          }
        } catch (rowError) {
          console.error(`🚨 行${row}の処理エラー:`, rowError);
        }
      }

      console.log(`🎯 ライブラリ記録完了: ${libraryRecordCount}件記録`);
    } catch (libraryError) {
      console.error("🚨 ライブラリ記録システムエラー:", libraryError);
    }

    console.log("🎯 ライブラリ記録処理完了");

    // 成功・失敗の詳細を含む結果メッセージ
    const successCount = imageResults.filter((r) => !r.failed).length;
    const failureCount = imageResults.filter((r) => r.failed).length;

    if (failureCount === 0) {
      return `✅ ${successCount}枚の画像を構造化テーブルに配置しました！`;
    } else if (successCount > 0) {
      return `⚠️ 部分的に完了: 成功${successCount}枚、失敗${failureCount}枚\n失敗した画像は赤色で表示されています。再生成をお試しください。`;
    } else {
      return `❌ すべての画像生成に失敗しました。しばらく時間をおいてから再試行してください。`;
    }
  } catch (error) {
    console.error("構造化テーブル配置エラー:", error);
    throw new Error(`結果の配置に失敗しました: ${error.message}`);
  }
}

/**
 * 画像生成と構造化テーブル配置を同時に実行（新システム）
 */
function generateImagesAndCreateTable(prompts) {
  try {
    // 新しい構造化テーブルシステムを使用
    return generateImagesFromStructuredTable();
  } catch (error) {
    console.error("構造化画像生成エラー:", error);
    throw new Error(`処理に失敗しました: ${error.message}`);
  }
}

/**
 * 全選択/解除機能（9列構造対応）
 * 💡 トグル方式：過半数がチェックされていれば全解除、そうでなければ全選択
 */
function toggleAllImageSelection() {
  try {
    console.log("🔄 全選択/解除を開始");
    const sheet = SpreadsheetApp.getActiveSheet();
    const dataRange = sheet.getDataRange();
    const lastRow = dataRange.getLastRow();

    // データ行がない場合は何もしない
    if (lastRow <= 1) {
      console.log("⚠️ データ行が存在しません");
      return;
    }

    // I列（チェックボックス列）の現在の状態を確認
    const checkboxRange = sheet.getRange(2, 9, lastRow - 1, 1); // I列（2行目から最終行まで）
    const checkboxValues = checkboxRange.getValues();

    // チェックされている数をカウント
    let checkedCount = 0;
    checkboxValues.forEach((row) => {
      if (row[0] === true) checkedCount++;
    });

    // 過半数がチェックされていれば全解除、そうでなければ全選択
    const shouldSelectAll = checkedCount < checkboxValues.length / 2;
    const newValues = checkboxValues.map(() => [shouldSelectAll]);

    checkboxRange.setValues(newValues);

    const action = shouldSelectAll ? "全選択" : "全解除";
    const emoji = shouldSelectAll ? "✅" : "❌";
    console.log(
      `${emoji} ${action}完了 - 対象行数: ${checkboxValues.length}行`
    );

    return `${emoji} ${action}完了 - ${checkboxValues.length}行の画像を${action}しました`;
  } catch (error) {
    console.error("全選択/解除エラー:", error);
    throw new Error(`全選択/解除に失敗しました: ${error.message}`);
  }
}

/**
 * 🆕 全選択専用関数
 * すべての画像を選択状態にします
 */
function selectAllImages() {
  try {
    console.log("✅ 全選択を開始");
    const sheet = SpreadsheetApp.getActiveSheet();
    const dataRange = sheet.getDataRange();
    const lastRow = dataRange.getLastRow();

    // データ行がない場合は何もしない
    if (lastRow <= 1) {
      console.log("⚠️ データ行が存在しません");
      return "⚠️ データ行が存在しません";
    }

    // I列（チェックボックス列）をすべてtrueに設定
    const checkboxRange = sheet.getRange(2, 9, lastRow - 1, 1); // I列（2行目から最終行まで）
    const checkboxValues = Array(lastRow - 1).fill([true]);

    checkboxRange.setValues(checkboxValues);

    console.log(`✅ 全選択完了 - 対象行数: ${lastRow - 1}行`);
    return `✅ 全選択完了 - ${lastRow - 1}行の画像をすべて選択しました`;
  } catch (error) {
    console.error("全選択エラー:", error);
    throw new Error(`全選択に失敗しました: ${error.message}`);
  }
}

/**
 * 🆕 全選択解除専用関数
 * すべての画像の選択を解除します
 */
function clearAllImageSelection() {
  try {
    console.log("❌ 全選択解除を開始");
    const sheet = SpreadsheetApp.getActiveSheet();
    const dataRange = sheet.getDataRange();
    const lastRow = dataRange.getLastRow();

    // データ行がない場合は何もしない
    if (lastRow <= 1) {
      console.log("⚠️ データ行が存在しません");
      return "⚠️ データ行が存在しません";
    }

    // I列（チェックボックス列）をすべてfalseに設定
    const checkboxRange = sheet.getRange(2, 9, lastRow - 1, 1); // I列（2行目から最終行まで）
    const checkboxValues = Array(lastRow - 1).fill([false]);

    checkboxRange.setValues(checkboxValues);

    console.log(`❌ 全選択解除完了 - 対象行数: ${lastRow - 1}行`);
    return `❌ 全選択解除完了 - ${
      lastRow - 1
    }行の画像の選択をすべて解除しました`;
  } catch (error) {
    console.error("全選択解除エラー:", error);
    throw new Error(`全選択解除に失敗しました: ${error.message}`);
  }
}

/**
 * Googleドライブ用：選択された画像をダウンロード
 */
function downloadSelectedImagesToDrive() {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();
    const lastRow = sheet.getLastRow();

    if (lastRow < 2) {
      return "❌ データがありません";
    }

    const selectedImages = [];
    const allImages = [];
    let downloadCount = 0;

    // 全画像と選択画像を並行して収集
    for (let i = 2; i <= lastRow; i++) {
      const checkboxCell = sheet.getRange(i, 9); // I列（チェックボックス）
      const isChecked = checkboxCell.getValue();
      const imageCell = sheet.getRange(i, 5); // E列（画像列）
      const imageFormula = imageCell.getFormula();

      if (imageFormula && imageFormula.includes("=IMAGE(")) {
        // IMAGE関数からURLを抽出
        const urlMatch = imageFormula.match(/=IMAGE\("([^"]+)"/);
        if (urlMatch && urlMatch[1]) {
          // 完全なプロンプトを取得（省略表示対応）
          const fullPrompt = getFullPrompt(sheet, i);
          const prompt = fullPrompt || `画像_${i}`;

          const imageData = {
            url: urlMatch[1],
            filename: createSimpleFilename(prompt, i),
            row: i,
          };

          // 全画像リストに追加
          allImages.push(imageData);

          // チェックされている場合は選択画像リストにも追加
          if (isChecked === true) {
            selectedImages.push(imageData);
          }
        }
      }
    }

    // 🔧 選択確認と自動判定ロジック
    if (selectedImages.length === 0) {
      if (allImages.length === 0) {
        return "❌ ダウンロードできる画像がありません。先に画像を生成してください。";
      } else {
        // 画像はあるが選択されていない場合の改善提案
        return `⚠️ 画像が選択されていません\n\n📊 利用可能な画像: ${allImages.length}枚\n\n💡 対処方法:\n1️⃣ チェックボックス（I列）で画像を選択してください\n2️⃣ 「☑️ 全選択」ボタンで全画像を選択\n3️⃣ 再度「📥 ダウンロード」をクリック\n\n🎯 選択した画像のみがダウンロードされます`;
      }
    }

    // 選択された画像数を明確に表示
    console.log(
      `📥 ダウンロード対象: ${selectedImages.length}枚の画像（全${allImages.length}枚中）`
    );

    // Google Driveに画像をダウンロード（実際の実装）
    const folderId = createDownloadFolder();

    const linkList = [];
    selectedImages.forEach((imageData) => {
      try {
        const response = UrlFetchApp.fetch(imageData.url);
        const blob = response.getBlob();
        blob.setName(imageData.filename);

        const folder = DriveApp.getFolderById(folderId);
        const file = folder.createFile(blob);

        // 共有リンクを取得
        file.setSharing(
          DriveApp.Access.ANYONE_WITH_LINK,
          DriveApp.Permission.VIEW
        );
        const link = file.getUrl();
        linkList.push(`• ${imageData.filename}: ${link}`);

        downloadCount++;
      } catch (downloadError) {
        console.error(
          `画像ダウンロードエラー (行${imageData.row}):`,
          downloadError
        );
      }
    });

    // 📊 詳細な結果メッセージ
    let message = `✅ ${downloadCount}枚の画像をダウンロードしました！\n`;
    message += `📁 Google Driveの「DALL-E画像ダウンロード」フォルダを確認してください。\n\n`;
    message += `📊 ダウンロード詳細:\n`;
    message += `• 選択された画像: ${selectedImages.length}枚\n`;
    message += `• 成功したダウンロード: ${downloadCount}枚\n`;
    message += `• 全画像数: ${allImages.length}枚\n`;

    if (downloadCount < selectedImages.length) {
      const failedCount = selectedImages.length - downloadCount;
      message += `⚠️ ${failedCount}枚のダウンロードに失敗しました\n`;
    }

    if (linkList.length > 0) {
      message += `\n🔗 ダウンロードリンク:\n${linkList.join("\n")}`;
    }
    return message;
  } catch (error) {
    console.error("画像ダウンロードエラー:", error);
    throw new Error(`画像ダウンロードに失敗しました: ${error.message}`);
  }
}

/**
 * 🎯 簡潔で分かりやすいファイル名を生成（ユーザー要求対応）
 */
function createSimpleFilename(prompt, rowNumber) {
  try {
    if (!prompt || typeof prompt !== "string") {
      return `画像_${String(rowNumber).padStart(3, "0")}.png`;
    }

    // プロンプトから主要なキーワードを抽出（最初の20文字）
    let cleanPrompt = prompt.trim().substring(0, 20);

    // 日本語と英数字以外の文字を除去し、アンダースコアに置換
    cleanPrompt = cleanPrompt
      .replace(/[^\w\s\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, "")
      .replace(/\s+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "");

    // 空になった場合のフォールバック
    if (!cleanPrompt) {
      cleanPrompt = "画像";
    }

    // 行番号を3桁でゼロ埋め
    const paddedRow = String(rowNumber).padStart(3, "0");

    // 最終的なファイル名：「プロンプト_001.png」形式
    return `${cleanPrompt}_${paddedRow}.png`;
  } catch (error) {
    console.error("ファイル名生成エラー:", error);
    return `画像_${String(rowNumber).padStart(3, "0")}.png`;
  }
}

/**
 * ダウンロード用フォルダを作成
 */
function createDownloadFolder() {
  try {
    const folderName = "DALL-E画像ダウンロード";
    const folders = DriveApp.getFoldersByName(folderName);

    if (folders.hasNext()) {
      return folders.next().getId();
    } else {
      const newFolder = DriveApp.createFolder(folderName);
      return newFolder.getId();
    }
  } catch (error) {
    console.error("フォルダ作成エラー:", error);
    throw new Error("ダウンロードフォルダの作成に失敗しました");
  }
}

/**
 * 選択された画像を再生成
 */
function regenerateSelectedImages() {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();
    const lastRow = sheet.getLastRow();

    if (lastRow < 2) {
      return "❌ データがありません";
    }

    const selectedPrompts = [];
    const selectedRows = [];

    // チェックされた行のプロンプトと画質設定を収集
    for (let i = 2; i <= lastRow; i++) {
      const checkboxCell = sheet.getRange(i, 9); // I列（チェックボックス）
      const isChecked = checkboxCell.getValue();

      if (isChecked === true) {
        // 完全なプロンプトを取得（省略表示対応）
        const fullPrompt = getFullPrompt(sheet, i);

        if (fullPrompt && fullPrompt.trim() !== "") {
          // H列から画質設定を取得
          const qualityCell = sheet.getRange(i, 8); // H列（画質列）
          let displayQuality = qualityCell.getValue();

          // 表示値をAPI値に変換
          let quality = parseQualityValue(displayQuality);

          // 画質設定の検証とデフォルト値の設定
          if (!quality || !["high", "medium", "low"].includes(quality)) {
            quality = "high"; // デフォルトは高品質
            qualityCell.setValue(formatQualityDisplay("high")); // セルにもデフォルト表示値を設定
            console.log(`行${i}: 再生成時の画質設定が無効のため "high" に設定`);
          }

          selectedPrompts.push({
            prompt: fullPrompt.trim(),
            quality: quality,
          });
          selectedRows.push(i);
        }
      }
    }

    if (selectedPrompts.length === 0) {
      // 画像総数をカウント
      let totalImageCount = 0;
      for (let i = 2; i <= lastRow; i++) {
        const imageCell = sheet.getRange(i, 5);
        const imageFormula = imageCell.getFormula();
        if (imageFormula && imageFormula.includes("=IMAGE(")) {
          totalImageCount++;
        }
      }

      if (totalImageCount === 0) {
        return "❌ 再生成できる画像がありません。先に画像を生成してください。";
      } else {
        return `⚠️ 画像が選択されていません\n\n📊 利用可能な画像: ${totalImageCount}枚\n\n💡 対処方法:\n1️⃣ チェックボックス（I列）で再生成したい画像を選択\n2️⃣ 「☑️ 全選択」で全画像を選択\n3️⃣ 再度「🔄 再生成」をクリック\n\n🎯 選択した画像のみが再生成されます`;
      }
    }

    console.log(
      `${selectedPrompts.length}個の選択されたプロンプトを再生成します`
    );

    // G列（生成日時）に再生成中を表示
    selectedRows.forEach((row) => {
      const timeCell = sheet.getRange(row, 7); // G列（生成日時）
      timeCell.setValue("🔄 再生成中");
      timeCell.setBackground("#fff3e0");
      timeCell.setFontColor("#ef6c00");
    });

    // 画像を再生成
    const imageResults = generateImages(selectedPrompts);

    // 結果を該当行に配置
    return populateStructuredTable(imageResults, selectedRows);
  } catch (error) {
    console.error("選択画像再生成エラー:", error);
    throw new Error(`選択画像の再生成に失敗しました: ${error.message}`);
  }
}

/**
 * シート保護機能付き画像生成（プログレスバー対応・サイズ強制指定対応）
 * 🚀 バッチ処理対応: 大量画像生成時は自動的にバッチ処理を実行
 */
function generateImagesFromStructuredTableWithProgress(
  forcedSize = null,
  selectedModel = null
) {
  let protection = null;
  try {
    const sheet = SpreadsheetApp.getActiveSheet();

    // シートを保護（編集禁止）
    console.log("シートを保護します");
    protection = sheet.protect().setDescription("画像生成中 - 編集禁止");
    protection.setWarningOnly(false);

    // 🎯 画像数を事前カウントしてバッチ処理を判定
    const imageCount = getImageGenerationCount();
    console.log(`📊 生成予定画像数: ${imageCount}枚`);

    let result;
    if (imageCount <= 8) {
      // 少数の場合：通常処理
      console.log("🔄 通常処理を実行");
      result = generateImagesFromStructuredTable(forcedSize, selectedModel);
    } else {
      // 多数の場合：バッチ処理
      console.log(`🚀 バッチ処理を実行 (${imageCount}枚)`);
      result = generateImagesFromStructuredTableBatch(
        forcedSize,
        selectedModel,
        imageCount
      );
    }

    return result;
  } catch (error) {
    console.error("保護付き画像生成エラー:", error);
    throw new Error(`画像生成に失敗しました: ${error.message}`);
  } finally {
    // 処理完了後、必ずシート保護を解除
    if (protection) {
      try {
        protection.remove();
        console.log("シート保護を解除しました");
      } catch (removeError) {
        console.error("シート保護解除エラー:", removeError);
      }
    }
  }
}

/**
 * 🚀 バッチ処理対応の大量画像生成（Google Apps Script 6分制限対応）
 * 15枚以上の画像でも安定動作するよう、分割処理を実装
 */
function generateImagesFromStructuredTableBatch(
  forcedSize = null,
  selectedModel = null,
  totalImages = 0
) {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();
    const lastRow = sheet.getLastRow();

    if (lastRow < 2) {
      throw new Error("プロンプトが入力されていません");
    }

    // 🎯 スマートバッチサイズ決定
    let batchSize;
    if (totalImages <= 15) {
      batchSize = 5; // 小バッチ
    } else if (totalImages <= 30) {
      batchSize = 6; // 中バッチ
    } else {
      batchSize = 8; // 大バッチ
    }

    console.log(`🚀 バッチ処理開始: ${totalImages}枚 → ${batchSize}枚ずつ処理`);

    // B列からプロンプトを取得
    const promptRange = sheet.getRange(2, 2, Math.min(lastRow - 1, 100), 1);
    const promptValues = promptRange.getValues();

    const validPrompts = [];
    const promptRows = [];

    // 有効なプロンプトを収集
    promptValues.forEach((row, index) => {
      const prompt = row[0];
      const actualRow = index + 2;

      if (prompt && typeof prompt === "string" && prompt.trim() !== "") {
        // 既存画像チェック
        const existingImageCell = sheet.getRange(actualRow, 5);
        const existingImage = existingImageCell.getFormula();

        if (existingImage && existingImage.includes("=IMAGE(")) {
          console.log(`行${actualRow}は既に画像が生成済みのためスキップ`);
          return;
        }

        const fullPrompt = getFullPrompt(sheet, actualRow);
        if (!fullPrompt) {
          console.log(`行${actualRow}: プロンプトが取得できませんでした`);
          return;
        }

        // 画質設定を取得（安全チェック強化）
        const qualityCell = sheet.getRange(actualRow, 8);
        let qualityValue = null;

        try {
          qualityValue = qualityCell.getValue();
        } catch (cellError) {
          console.error(`行${actualRow}のH列取得エラー:`, cellError);
          qualityValue = null;
        }

        let quality = null;
        try {
          quality = parseQualityValue(qualityValue);
        } catch (parseError) {
          console.error(`行${actualRow}の画質値解析エラー:`, parseError);
          quality = null;
        }

        if (!quality || !["high", "medium", "low"].includes(quality)) {
          quality = "high";
          try {
            qualityCell.setValue(formatQualityDisplay("high"));
          } catch (setCellError) {
            console.error(`行${actualRow}の画質設定エラー:`, setCellError);
            // エラーでも続行
          }
        }

        validPrompts.push({
          prompt: fullPrompt,
          quality: quality,
        });
        promptRows.push(actualRow);
      }
    });

    if (validPrompts.length === 0) {
      throw new Error("有効なプロンプトが見つかりません");
    }

    console.log(`📊 実際の処理数: ${validPrompts.length}枚`);
    console.log(`⚙️ バッチサイズ: ${batchSize}枚`);

    // 🎯 バッチ処理実行
    const allResults = [];
    let processedCount = 0;
    const totalBatches = Math.ceil(validPrompts.length / batchSize);

    for (let i = 0; i < validPrompts.length; i += batchSize) {
      const batchPrompts = validPrompts.slice(i, i + batchSize);
      const batchRows = promptRows.slice(i, i + batchSize);

      const batchNumber = Math.floor(i / batchSize) + 1;

      console.log(
        `🔄 バッチ${batchNumber}/${totalBatches}: ${batchPrompts.length}枚処理中`
      );

      // G列に進捗表示
      batchRows.forEach((row) => {
        const timeCell = sheet.getRange(row, 7);
        timeCell.setValue(`🔄 バッチ${batchNumber}/${totalBatches}`);
        timeCell.setBackground("#fff3e0");
        timeCell.setFontColor("#ef6c00");
      });

      try {
        // 🔧 バッチ処理でも強制サイズを安全検証
        const safeForcedSize = forcedSize
          ? validateImageSize(forcedSize)
          : null;

        // バッチ単位で画像生成
        const batchResults = generateImages(
          batchPrompts,
          safeForcedSize,
          selectedModel
        );

        // 結果を即座に配置（安全チェック強化）
        let batchResult = null;
        try {
          if (
            batchResults &&
            Array.isArray(batchResults) &&
            batchResults.length > 0
          ) {
            batchResult = populateStructuredTable(batchResults, batchRows);
          } else {
            console.warn(`バッチ${batchNumber}: 結果が空または無効`);
          }
        } catch (populateError) {
          console.error(`バッチ${batchNumber}の結果配置エラー:`, populateError);
          // 配置エラーでも続行
        }

        // 結果を集積（null/undefinedチェック強化）
        if (batchResults && Array.isArray(batchResults)) {
          allResults.push(...batchResults);
          const successfulResults = batchResults.filter((r) => r && !r.failed);
          processedCount += successfulResults.length;
        } else {
          console.warn(`バッチ${batchNumber}: 結果が配列でない`);
        }

        console.log(
          `✅ バッチ${batchNumber}完了: ${
            batchResults.filter((r) => !r.failed).length
          }枚成功`
        );

        // バッチ間の待機時間（API制限対応）
        if (i + batchSize < validPrompts.length) {
          console.log("⏳ 次のバッチまで2秒待機...");
          Utilities.sleep(2000);
        }
      } catch (batchError) {
        console.error(`❌ バッチ${batchNumber}でエラー:`, batchError);

        // エラーが発生したバッチの行にエラー表示
        batchRows.forEach((row) => {
          try {
            const imageCell = sheet.getRange(row, 5);
            imageCell.setValue("❌ バッチエラー");
            imageCell.setBackground("#ffebee");
            imageCell.setFontColor("#d32f2f");
            imageCell.setNote(`バッチ処理エラー: ${batchError.message}`);
          } catch (cellError) {
            console.error(`行${row}への エラー表示設定失敗:`, cellError);
          }
        });

        // バッチエラーでも結果に追加（エラー情報付き）
        for (let j = 0; j < batchRows.length; j++) {
          allResults.push({
            prompt: batchPrompts[j]?.prompt || "不明",
            url: null,
            size: null,
            error: batchError.message,
            failed: true,
          });
        }

        // 他のバッチは続行
        continue;
      }
    }

    // 最終結果（安全チェック強化）
    let successCount = 0;
    let failureCount = 0;

    if (allResults && Array.isArray(allResults)) {
      successCount = allResults.filter((r) => r && !r.failed).length;
      failureCount = allResults.filter((r) => r && r.failed).length;
    } else {
      console.error("最終結果が配列でない:", allResults);
    }

    console.log(
      `🎯 バッチ処理完了: ${totalBatches}バッチ処理, 成功${successCount}枚, 失敗${failureCount}枚`
    );

    if (successCount === 0) {
      return `❌ すべてのバッチが失敗しました。時間をおいてから再試行してください。`;
    } else if (failureCount === 0) {
      return `✅ ${successCount}枚の画像をバッチ処理で生成完了！（${totalBatches}バッチ処理）`;
    } else {
      return `⚠️ バッチ処理完了: 成功${successCount}枚、失敗${failureCount}枚\n${totalBatches}バッチで分割処理しました。`;
    }
  } catch (error) {
    console.error("バッチ処理エラー:", error);
    throw new Error(`バッチ処理に失敗しました: ${error.message}`);
  }
}

/**
 * シート保護機能付き選択画像再生成（プログレスバー対応）
 */
function regenerateSelectedImagesWithProgress() {
  let protection = null;
  try {
    const sheet = SpreadsheetApp.getActiveSheet();

    // シートを保護（編集禁止）
    console.log("シートを保護します");
    protection = sheet.protect().setDescription("画像再生成中 - 編集禁止");
    protection.setWarningOnly(false);

    // 選択画像再生成処理を実行
    const result = regenerateSelectedImages();

    return result;
  } catch (error) {
    console.error("保護付き画像再生成エラー:", error);
    throw new Error(`画像再生成に失敗しました: ${error.message}`);
  } finally {
    // 処理完了後、必ずシート保護を解除
    if (protection) {
      try {
        protection.remove();
        console.log("シート保護を解除しました");
      } catch (removeError) {
        console.error("シート保護解除エラー:", removeError);
      }
    }
  }
}

/**
 * 進捗通知機能付き画像生成（将来の拡張用）
 */
function generateImagesWithProgressCallback(prompts, callbackFunction) {
  try {
    const totalSteps = prompts.length;
    let completedSteps = 0;

    const results = [];

    prompts.forEach((prompt, index) => {
      try {
        // 🎯 改善: よりバランスの取れた進捗計算
        // API呼び出し前: 基本進捗
        const baseProgress = Math.round((completedSteps / totalSteps) * 80); // 80%まで
        console.log(
          `🔄 画像生成開始: ${baseProgress}% (${
            completedSteps + 1
          }/${totalSteps}) - ${prompt.substring(0, 30)}...`
        );

        // 個別画像生成
        const imageResult = generateImages([prompt]);
        results.push(...imageResult);

        completedSteps++;

        // 🎯 改善: 生成完了時に適切な進捗表示
        const completedProgress = Math.round(
          80 + (completedSteps / totalSteps) * 20
        ); // 80-100%
        console.log(
          `✅ 画像生成完了: ${completedProgress}% (${completedSteps}/${totalSteps})`
        );
      } catch (imageError) {
        console.error(`画像${index + 1}の生成エラー:`, imageError);
        completedSteps++; // エラーでも進捗を進める
        // エラーが発生してもその他の画像生成は続行
      }
    });

    return results;
  } catch (error) {
    console.error("進捗付き画像生成エラー:", error);
    throw new Error(`画像生成に失敗しました: ${error.message}`);
  }
}

/**
 * サイドバーから呼び出し：シートが空かどうか、プロンプトが入力されているかを判定
 * @return {{isEmpty: boolean, hasPrompt: boolean}}
 */
function getSheetState() {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();
    const lastRow = sheet.getLastRow();
    console.log("getSheetState: lastRow =", lastRow);

    // データが全く無いか、ヘッダー行のみなら空とみなす
    const isEmpty = lastRow <= 1;
    console.log("getSheetState: isEmpty =", isEmpty);

    // B列にプロンプトが存在するかチェック（2行目以降最大100行）
    let hasPrompt = false;
    let hasImages = false;
    if (!isEmpty) {
      const maxRows = Math.min(lastRow - 1, 100);
      console.log("getSheetState: maxRows =", maxRows);
      if (maxRows > 0) {
        const promptRange = sheet.getRange(2, 2, maxRows, 1);
        const values = promptRange.getValues();
        console.log("getSheetState: B列の値 =", values);
        hasPrompt = values.some((row) => {
          const v = row[0];
          const isValid = v && typeof v === "string" && v.trim() !== "";
          if (isValid) {
            console.log("getSheetState: 有効なプロンプト発見 =", v);
          }
          return v && typeof v === "string" && v.trim() !== "";
        });

        // E列に画像が存在するかチェック（9列構造）
        const imageRange = sheet.getRange(2, 5, maxRows, 1);
        const imageFormulas = imageRange.getFormulas();
        hasImages = imageFormulas.some((row) => {
          const formula = row[0];
          return (
            formula &&
            typeof formula === "string" &&
            formula.includes("=IMAGE(")
          );
        });
        console.log("getSheetState: hasImages =", hasImages);
      }
    }

    console.log("getSheetState: hasPrompt =", hasPrompt);
    return { isEmpty, hasPrompt, hasImages };
  } catch (e) {
    console.error("getSheetState error", e);
    return { isEmpty: false, hasPrompt: true, hasImages: false };
  }
}

/**
 * プロンプト入力後の自動処理（共通プロンプト対応版）
 */
function onEdit(e) {
  try {
    // 🚨🚨🚨 超重要デバッグ: onEdit実行確認
    console.log("🔥🔥🔥 onEdit関数が実行されました！🔥🔥🔥");

    const range = e.range;
    const sheet = range.getSheet();
    const row = range.getRow();
    const col = range.getColumn();

    // 🔍 詳細情報ログ
    console.log(`📝 編集位置: シート="${sheet.getName()}" 行=${row} 列=${col}`);
    console.log(`🎯 セル: ${range.getA1Notation()}`);
    console.log(
      `💾 値: "${range.getValue()}" (型: ${typeof range.getValue()})`
    );

    // メインシートでの編集のみ処理（共通プロンプト設定シートは除外）
    if (sheet.getName() === "共通プロンプト設定") {
      // 🔧 修正: 自動遷移を削除してシート滞在を維持
      try {
        // メインシートを取得（ただし遷移はしない）
        const mainSheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
        // 🚨 削除: SpreadsheetApp.setActiveSheet(mainSheet); ← これが自動遷移の原因
        updateCommonPromptDropdown();
        console.log(
          "共通プロンプト設定変更により、ドロップダウンを更新しました（シート滞在）"
        );
      } catch (error) {
        console.error("ドロップダウン更新エラー:", error);
      }
      return;
    }

    // B列（個別プロンプト）またはC列（共通プロンプト選択）の編集をチェック
    if ((col === 2 || col === 3) && row >= 2) {
      console.log(`🔄 編集検出: 行${row}列${col} - 結合プロンプト更新を開始`);

      if (col === 2) {
        // 🚀 B列（個別プロンプト）の編集 - 限界突破自動更新版
        const promptValue = range.getValue();
        console.log(`📝 B列入力検出: "${promptValue}" (行${row})`);

        // 💡 完全自動化: B列に何かが入力されたら即座に結合プロンプト更新
        console.log(`🚀 限界突破: B列→D列自動更新開始 行${row}`);

        // Step 1: プロンプト処理（入力があった場合）
        if (promptValue !== null && promptValue !== undefined) {
          const promptText = promptValue.toString().trim();
          if (promptText !== "") {
            console.log(`✅ B列プロンプト処理実行: "${promptText}"`);
            handleIndividualPromptInput(sheet, row, promptText);
          } else {
            console.log(
              `🧹 B列空欄処理: 行${row}のプロンプトがクリアされました`
            );
          }
        }

        // Step 2: 即座に結合プロンプト更新
        console.log(`🔄 即座実行: B列入力→D列結合プロンプト更新 行${row}`);
        updateCombinedPrompt(sheet, row);

        // Step 3: 確実性のための遅延再更新（プロンプト処理完了後）
        console.log(`🔄 遅延確認: 0.2秒後にD列再更新 行${row}`);
        Utilities.sleep(200);
        updateCombinedPrompt(sheet, row);

        // Step 4: 最終確認ログ
        const finalResult = sheet.getRange(row, 4).getValue();
        console.log(`✅ B列自動更新完了 行${row}: D列="${finalResult}"`);
      } else if (col === 3) {
        // 🚀 C列（共通プロンプト選択）の編集 - 限界突破自動更新版
        const newValue = range.getValue();
        console.log(
          `🔥 C列変更検出: "${newValue}" → 結合プロンプト更新実行 行${row}`
        );

        // 💡 追加デバッグ: 共通プロンプトの値を詳細確認
        console.log(
          `🔍 C列詳細確認 - 行${row}: 型=${typeof newValue}, 値="${newValue}"`
        );

        // 💡 強化修正: 即座に1回目の更新
        console.log(`🚀 Step1: C列→D列即座更新 行${row}`);
        updateCombinedPrompt(sheet, row);

        // 💡 強化修正: C列変更時は0.1秒遅延後に確実更新（プルダウン選択完了を待つ）
        Utilities.sleep(100);
        console.log(`🚀 Step2: C列→D列遅延更新 行${row}`);
        updateCombinedPrompt(sheet, row);

        // 💡 更なる確実性: 直後にもう一度更新（プルダウン値の反映を確実に）
        Utilities.sleep(50);
        const finalValue = sheet.getRange(row, 3).getValue();
        console.log(
          `🚀 Step3: C列最終確認 - 行${row}: "${finalValue}" で再更新`
        );
        updateCombinedPrompt(sheet, row);

        // 🔥 最終確認ログ
        const finalResult = sheet.getRange(row, 4).getValue();
        console.log(`✅ C列自動更新完了 行${row}: D列="${finalResult}"`);
      }
    }
  } catch (error) {
    console.error("onEdit エラー:", error);
    // エラーが発生してもユーザーの入力を妨げないよう、エラーは無視
  }
}

/**
 * 個別プロンプト入力処理（UX改善版）
 */
function handleIndividualPromptInput(sheet, row, individualPrompt) {
  try {
    const promptCell = sheet.getRange(row, 2); // B列

    // UX改善：プロンプトの長さに関係なく固定表示
    if (individualPrompt.length > 50) {
      // 50文字以上の場合は省略表示
      const truncatedPrompt = individualPrompt.substring(0, 47) + "...";
      promptCell.setValue(truncatedPrompt);
      promptCell.setNote(
        `完全なプロンプト（${individualPrompt.length}文字）:\n\n${individualPrompt}`
      );
      promptCell.setBackground("#fff9c4"); // 省略表示を示す薄い黄色
    } else {
      // 短いプロンプトはそのまま表示
      promptCell.setValue(individualPrompt);
      promptCell.setNote(`プロンプト（${individualPrompt.length}文字）`);
      promptCell.setBackground("#ffffff"); // デフォルト色
    }

    // セルの表示設定（UX改善）
    promptCell.setWrap(true); // 💡 改善要求: セル内折り返しを有効化
    promptCell.setVerticalAlignment("middle");
    promptCell.setBorder(
      true,
      true,
      true,
      true,
      true,
      true,
      "#d0d0d0",
      SpreadsheetApp.BorderStyle.SOLID
    );

    console.log(
      `行${row}: 個別プロンプトを処理しました (${individualPrompt.length}文字)`
    );
  } catch (error) {
    console.error(`行${row}の個別プロンプト処理エラー:`, error);
  }
}

/**
 * 完全なプロンプトを取得（共通プロンプト対応版）
 */
function getFullPrompt(sheet, row) {
  try {
    const individualPrompt = sheet.getRange(row, 2).getValue(); // B列：個別プロンプト
    const commonPromptName = sheet.getRange(row, 3).getValue(); // C列：共通プロンプト選択

    // 結合プロンプトを生成
    const combinedPrompt = combinePrompts(individualPrompt, commonPromptName);

    if (combinedPrompt && combinedPrompt.trim() !== "") {
      return combinedPrompt.trim();
    }

    // フォールバック：個別プロンプトのみ
    if (individualPrompt && typeof individualPrompt === "string") {
      return individualPrompt.trim();
    }

    // 従来の互換性のためにセルコメントからの取得も試行
    const promptCell = sheet.getRange(row, 2);
    const cellNote = promptCell.getNote();
    if (cellNote && cellNote.includes("完全なプロンプト")) {
      const match = cellNote.match(
        /完全なプロンプト[^:]*:\s*\n\n([\s\S]*?)(?:\n\n|$)/
      );
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return individualPrompt ? individualPrompt.toString().trim() : "";
  } catch (error) {
    console.error(`行${row}の完全プロンプト取得エラー:`, error);
    return "";
  }
}

/**
 * 🚀 限界突破：全行の結合プロンプト一括更新（手動実行機能）
 */
function updateAllCombinedPrompts() {
  try {
    console.log("🔥🔥🔥 全行結合プロンプト一括更新を開始 🔥🔥🔥");

    const sheet = SpreadsheetApp.getActiveSheet();
    const lastRow = sheet.getLastRow();

    if (lastRow < 2) {
      console.log("⚠️ データが存在しません");
      return;
    }

    let updatedCount = 0;

    // 2行目から最終行まで全て処理
    for (let row = 2; row <= lastRow; row++) {
      const bValue = sheet.getRange(row, 2).getValue(); // B列
      const cValue = sheet.getRange(row, 3).getValue(); // C列

      // B列またはC列に何かデータがある行のみ処理
      if (
        (bValue !== null &&
          bValue !== undefined &&
          bValue.toString().trim() !== "") ||
        (cValue !== null &&
          cValue !== undefined &&
          cValue.toString().trim() !== "")
      ) {
        console.log(`🔄 行${row}の結合プロンプト更新中...`);
        console.log(`   B列: "${bValue}"`);
        console.log(`   C列: "${cValue}"`);

        // 結合プロンプトを更新
        updateCombinedPrompt(sheet, row);
        updatedCount++;

        // 結果確認
        const dValue = sheet.getRange(row, 4).getValue();
        console.log(`   ✅ 更新完了 D列: "${dValue}"`);
      }
    }

    console.log(`🎉 一括更新完了: ${updatedCount}行を更新しました`);

    // 🚀 アラート削除：サイレント成功メッセージ
    console.log("✅ 結合プロンプト一括更新完了 - アラート表示なし");
    return `✅ 結合プロンプト一括更新完了 - ${updatedCount}行を更新しました`;
  } catch (error) {
    console.error("全行結合プロンプト更新エラー:", error);
    // 🚀 アラート削除：コンソールログのみ
    console.error("❌ 結合プロンプト一括更新でエラーが発生:", error.message);
    return `❌ エラー: 結合プロンプトの一括更新に失敗しました - ${error.message}`;
  }
}

/**
 * 結合プロンプトを更新（D列に表示）
 */
function updateCombinedPrompt(sheet, row) {
  try {
    const individualPrompt = sheet.getRange(row, 2).getValue(); // B列：個別プロンプト
    const commonPromptName = sheet.getRange(row, 3).getValue(); // C列：共通プロンプト選択

    // 💡 詳細デバッグ: 結合前の値を確認
    console.log(
      `🔍 行${row}結合前: B列="${individualPrompt}" (型:${typeof individualPrompt})`
    );
    console.log(
      `🔍 行${row}結合前: C列="${commonPromptName}" (型:${typeof commonPromptName})`
    );

    // 結合プロンプトを生成
    const combinedPrompt = combinePrompts(individualPrompt, commonPromptName);
    console.log(
      `🔄 行${row}結合結果: "${combinedPrompt}" (長さ:${
        combinedPrompt?.length || 0
      }文字)`
    );

    // D列に結合プロンプトを設定
    const combinedCell = sheet.getRange(row, 4);

    // 🔧 重要：UI表示は省略、AI送信用は完全版をメモに保存
    let displayText = combinedPrompt;
    const maxLength = 100; // 表示文字数制限

    if (combinedPrompt && combinedPrompt.length > maxLength) {
      // 長い場合は省略表示
      displayText = combinedPrompt.substring(0, maxLength) + "...";
    }

    // 省略表示をセルに設定
    combinedCell.setValue(displayText);

    // 完全なプロンプトをメモ（ツールチップ）に保存（AI送信用）
    if (combinedPrompt && combinedPrompt.length > maxLength) {
      combinedCell.setNote(
        `📄 完全な結合プロンプト:\n${combinedPrompt}\n\n💡 このセルをクリックして全文を確認できます。`
      );
    } else {
      combinedCell.setNote("🤖 自動結合プロンプト（編集不要）");
    }

    // 💡 改善要求: 文字はみ出し防止のためのスタイル設定強化
    combinedCell.setBackground("#f5f5f5"); // グレー背景
    combinedCell.setFontColor("#616161"); // グレー文字
    combinedCell.setWrap(true); // 💡 改善要求: 折り返しを有効にして文字はみ出しを防止
    combinedCell.setVerticalAlignment("middle"); // 💡 改善要求: 垂直配置を中央に
    combinedCell.setHorizontalAlignment("left"); // 左寄せ
    combinedCell.setFontSize(8); // 💡 改善要求: フォントサイズを小さく（はみ出し防止）
    combinedCell.setPadding(2, 2, 2, 2); // 💡 改善要求: パディング縮小（はみ出し防止）
    combinedCell.setBorder(
      true,
      true,
      true,
      true,
      true,
      true,
      "#bdbdbd",
      SpreadsheetApp.BorderStyle.DASHED
    );

    // セルのテキスト表示設定（小さなフォント）
    combinedCell.setTextStyle(
      SpreadsheetApp.newTextStyle().setFontSize(9).build()
    );

    console.log(
      `行${row}: 結合プロンプトを更新しました（縦幅制限: ${displayText.length}/${combinedPrompt.length}文字）`
    );
    return combinedPrompt;
  } catch (error) {
    console.error(`行${row}の結合プロンプト更新エラー:`, error);
    return "";
  }
}

/**
 * 結合プロンプトを取得（D列から）- 完全版を返す
 */
function getCombinedPrompt(sheet, row) {
  try {
    // セルのメモから完全なプロンプトを取得
    const combinedCell = sheet.getRange(row, 4);
    const cellNote = combinedCell.getNote();

    // メモに完全版が保存されている場合はそれを使用
    if (cellNote && cellNote.includes("完全な結合プロンプト:")) {
      const fullPromptMatch = cellNote.match(
        /完全な結合プロンプト:\n([\s\S]*?)\n\n💡/
      );
      if (fullPromptMatch && fullPromptMatch[1]) {
        return fullPromptMatch[1].trim();
      }
    }

    // メモにない場合は表示されている値を取得
    const displayedPrompt = combinedCell.getValue();
    if (
      displayedPrompt &&
      typeof displayedPrompt === "string" &&
      displayedPrompt.trim()
    ) {
      // 省略記号がある場合は再生成
      if (displayedPrompt.endsWith("...")) {
        return updateCombinedPrompt(sheet, row);
      }
      return displayedPrompt.trim();
    }

    // D列が空の場合は自動生成
    return updateCombinedPrompt(sheet, row);
  } catch (error) {
    console.error(`行${row}の結合プロンプト取得エラー:`, error);
    return "";
  }
}

/**
 * 個別プロンプトと共通プロンプトを結合
 */
function combinePrompts(individualPrompt, commonPromptName) {
  try {
    // 個別プロンプトを取得
    let individual = "";
    if (individualPrompt && typeof individualPrompt === "string") {
      individual = individualPrompt.trim();
    }

    // 共通プロンプトを取得
    let common = "";
    if (
      commonPromptName &&
      typeof commonPromptName === "string" &&
      commonPromptName.trim() !== "なし"
    ) {
      const commonPromptContent = getCommonPromptContent(
        commonPromptName.trim()
      );
      if (commonPromptContent) {
        common = commonPromptContent.trim();
      }
    }

    // 結合ロジック
    if (individual && common) {
      return `${individual}, ${common}`;
    } else if (individual) {
      return individual;
    } else if (common) {
      return common;
    } else {
      return "";
    }
  } catch (error) {
    console.error("プロンプト結合エラー:", error);
    return individualPrompt || "";
  }
}

/**
 * 共通プロンプト名から内容を取得
 */
function getCommonPromptContent(promptName) {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const commonSheet = spreadsheet.getSheetByName("共通プロンプト設定");

    if (!commonSheet) {
      console.log("共通プロンプト設定シートが見つかりません");
      return "";
    }

    const lastRow = commonSheet.getLastRow();

    // 4行目以降からプロンプト名を検索
    for (let i = 4; i <= lastRow; i++) {
      const nameCell = commonSheet.getRange(i, 1).getValue(); // A列：プロンプト名
      const contentCell = commonSheet.getRange(i, 2).getValue(); // B列：プロンプト内容

      if (
        nameCell &&
        typeof nameCell === "string" &&
        nameCell.trim() === promptName
      ) {
        if (contentCell && typeof contentCell === "string") {
          return contentCell.trim();
        }
      }
    }

    console.log(`共通プロンプト「${promptName}」が見つかりません`);
    return "";
  } catch (error) {
    console.error("共通プロンプト内容取得エラー:", error);
    return "";
  }
}

/**
 * 権限承認済みを記録
 */
function markPermissionGranted() {
  try {
    const properties = PropertiesService.getScriptProperties();
    properties.setProperty("PERMISSION_GRANTED", "true");
    markAsUsed(); // 使用記録も同時に保存
  } catch (error) {
    console.log("権限承認記録の保存に失敗:", error.message);
  }
}

/**
 * 使用記録を保存
 */
function markAsUsed() {
  try {
    const properties = PropertiesService.getScriptProperties();
    properties.setProperty("TOOL_USED_BEFORE", "true");
  } catch (error) {
    console.log("使用記録の保存に失敗:", error.message);
  }
}

/**
 * 初回使用者かどうか判定
 */
function isFirstTimeUser() {
  try {
    const properties = PropertiesService.getScriptProperties();
    const hasUsed = properties.getProperty("TOOL_USED_BEFORE");
    return !hasUsed;
  } catch (error) {
    return true; // エラーの場合は初回とみなす
  }
}

/**
 * 権限承認済みかどうか判定
 */
function isPermissionGranted() {
  try {
    const properties = PropertiesService.getScriptProperties();
    const permissionGranted = properties.getProperty("PERMISSION_GRANTED");
    return permissionGranted === "true";
  } catch (error) {
    return false; // エラーの場合は未承認とみなす
  }
}

/**
 * 🔐 包括的権限チェック（リアルタイム検証）
 * 実際に必要な権限を全てテストし、不足している場合のみアラート表示
 */
function checkAndHandlePermissions() {
  console.log("🔍 権限状態を包括的にチェック中...");

  const permissionResults = {
    spreadsheet: false,
    ui: false,
    drive: false,
    urlFetch: false,
    overall: false,
  };

  let missingPermissions = [];

  try {
    // 1. スプレッドシート権限チェック
    try {
      const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
      const sheet = spreadsheet.getActiveSheet();
      const testCell = sheet.getRange("A1");
      permissionResults.spreadsheet = true;
      console.log("✅ スプレッドシート権限: OK");
    } catch (error) {
      permissionResults.spreadsheet = false;
      missingPermissions.push("スプレッドシート操作");
      console.log("❌ スプレッドシート権限: 不足");
    }

    // 2. UI権限チェック
    try {
      const ui = SpreadsheetApp.getUi();
      permissionResults.ui = true;
      console.log("✅ UI権限: OK");
    } catch (error) {
      permissionResults.ui = false;
      missingPermissions.push("ユーザーインターフェース");
      console.log("❌ UI権限: 不足");
    }

    // 3. Drive権限チェック（オプション）
    try {
      const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
      const file = DriveApp.getFileById(spreadsheet.getId());
      permissionResults.drive = true;
      console.log("✅ Drive権限: OK");
    } catch (error) {
      permissionResults.drive = false;
      // Driveは必須ではないので警告のみ
      console.log("⚠️ Drive権限: 不足（オプション）");
    }

    // 4. 外部API権限チェック（オプション）
    try {
      UrlFetchApp.fetch("https://httpbin.org/get", {
        method: "GET",
        muteHttpExceptions: true,
        headers: { "User-Agent": "DALL-E Permission Test" },
      });
      permissionResults.urlFetch = true;
      console.log("✅ 外部API権限: OK");
    } catch (error) {
      permissionResults.urlFetch = false;
      // 外部APIは画像生成時に必要なので警告
      console.log("⚠️ 外部API権限: 不足（画像生成時必要）");
    }

    // 必須権限（スプレッドシート + UI）の判定
    permissionResults.overall =
      permissionResults.spreadsheet && permissionResults.ui;

    // 結果に基づく処理
    if (permissionResults.overall) {
      console.log("🎉 必須権限チェック完了: 全て承認済み");
      markPermissionGranted(); // 権限承認状態を記録
      return {
        granted: true,
        needsAlert: false,
        results: permissionResults,
      };
    } else {
      console.log("⚠️ 必須権限チェック: 不足している権限があります");
      return {
        granted: false,
        needsAlert: true,
        missingPermissions: missingPermissions,
        results: permissionResults,
      };
    }
  } catch (error) {
    console.error("権限チェック中にエラー:", error);
    return {
      granted: false,
      needsAlert: true,
      error: error.message,
      results: permissionResults,
    };
  }
}

/**
 * 🚨 条件付き権限アラート表示
 * 権限が不足している場合のみアラートを表示
 */
function showPermissionAlertIfNeeded() {
  const permissionCheck = checkAndHandlePermissions();

  // 権限が完全に承認済みの場合はサイレント処理
  if (permissionCheck.granted && !permissionCheck.needsAlert) {
    console.log("🔓 権限承認済み: サイレント処理");
    return { success: true, alerted: false };
  }

  // 権限が不足している場合のみアラート表示
  if (permissionCheck.needsAlert) {
    // 🔐 権限不足時もアラート表示を削除（コンソールログのみ）
    const missingList = permissionCheck.missingPermissions
      ? permissionCheck.missingPermissions.join("、")
      : "不明";

    console.log("🔐 権限不足検出:", missingList);
    console.log("💡 権限承認手順: メニューから「🔐 権限承認を実行」");
    console.log("💡 承認後の手順: メニューから「📱 サイドバーを開く」");

    // アラート表示を削除、サイレント処理
    return { success: false, alerted: false };
  }

  return { success: true, alerted: false };
}

/**
 * 使い方ガイドを表示（初回使用者向け）
 */
function showUsageGuide() {
  try {
    const ui = SpreadsheetApp.getUi();
    const response = ui.alert(
      "🎨 DALL-E 画像生成ツール",
      "📝 簡単3ステップで画像生成！\n\n" +
        "1️⃣ 「🔧 初期セットアップ」でテーブル作成\n" +
        "2️⃣ B列にプロンプト（画像の説明文）を入力\n" +
        "3️⃣ 「🎨 画像生成」ボタンをクリック\n\n" +
        "💡 例：「美しい夕日の海辺」「可愛い猫のイラスト」\n\n" +
        "⚠️ もし権限承認が必要な場合は、表示されるダイアログで「許可」をクリックしてください。\n\n" +
        "今すぐ始めますか？",
      ui.ButtonSet.YES_NO
    );

    if (response === ui.Button.YES) {
      try {
        // 直接サイドバーを表示
        showSidebar();
        markAsUsed();
      } catch (error) {
        // エラーの場合は初期セットアップから開始
        ui.alert(
          "🚀 ツール開始手順",
          "以下の手順でツールを開始してください：\n\n" +
            "1️⃣ 画面上部のメニューバーから「🎨 画像ツール」をクリック\n" +
            "2️⃣ ドロップダウンから「📱 サイドバーを開く」を選択\n" +
            "3️⃣ サイドバーが表示されたら準備完了！\n\n" +
            "💡 権限承認が求められた場合は「許可」をクリックしてください。\n" +
            "🎨 サイドバーからすべての機能にアクセスできます。",
          ui.ButtonSet.OK
        );
      }
    }
  } catch (error) {
    console.log("使い方ガイドの表示に失敗:", error.message);
  }
}

/**
 * 権限承認を強制実行（メニューから呼び出し可能）
 */
function forcePermissionRequest() {
  try {
    console.log("権限承認を開始します");

    // 1. スプレッドシート権限のテスト
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = spreadsheet.getActiveSheet();
    console.log("✅ スプレッドシート権限OK");

    // 2. Drive権限のテスト（オプション）
    try {
      const file = DriveApp.getFileById(spreadsheet.getId());
      const fileName = file.getName();
      console.log("✅ Drive権限OK:", fileName);
    } catch (driveError) {
      console.log(
        "⚠️ Drive権限は後で必要になる場合があります:",
        driveError.message
      );
      // Drive権限エラーは無視して続行
    }

    // 3. UI権限のテスト
    const ui = SpreadsheetApp.getUi();
    console.log("✅ UI権限OK");

    // 4. 外部リクエスト権限のテスト（オプション）
    try {
      const testResponse = UrlFetchApp.fetch("https://httpbin.org/get", {
        method: "GET",
        muteHttpExceptions: true,
        headers: { "User-Agent": "DALL-E Image Generator Test" },
      });
      console.log("✅ 外部リクエスト権限OK");
    } catch (fetchError) {
      console.log(
        "⚠️ 外部リクエスト権限は画像生成時に必要になります:",
        fetchError.message
      );
      // 外部リクエスト権限エラーは無視して続行
    }

    // 権限承認完了を記録
    markPermissionGranted();

    // 🔐 権限承認完了チェック（アラート表示削除）
    const finalCheck = checkAndHandlePermissions();
    if (!finalCheck.granted) {
      // 権限不足時もアラート表示なし、コンソールログのみ
      console.log("⚠️ 権限承認未完了: 一部の権限が不足しています");
      console.log("💡 解決方法: ブラウザリロード → 権限承認再実行");
    } else {
      // 権限承認完了: 最小限の成功メッセージ
      console.log("🎉 権限承認完了: 今後はサイレント動作");
    }

    return "✅ 権限承認が完了しました";
  } catch (error) {
    console.error("権限承認エラー:", error);
    console.log(
      "💡 権限承認手順: メニューから「🔐 権限承認を実行」を再実行してください"
    );
    console.log("💡 承認後の手順: メニューから「📱 サイドバーを開く」");

    // アラート表示を削除、コンソールログのみで対応
    throw error; // エラーを再スローして権限ダイアログを表示
  }
}

/**
 * シートを完全クリア（メニューから呼び出し）- 権限チェック統合版
 */
function clearSheetMenu() {
  // 🔐 権限チェック最優先実行
  const permissionResult = showPermissionAlertIfNeeded();

  // 権限が不足している場合はアラート表示済みなので終了
  if (!permissionResult.success && permissionResult.alerted) {
    console.log("🔐 権限不足: シートクリアをスキップ");
    return "権限承認が必要です";
  }

  try {
    console.log("🧹 シートの完全クリアを開始します（権限チェック済み）");
    clearAllData();
    console.log("✅ シートが完全にクリアされました");
    return "✅ シートを完全にクリアしました";
  } catch (error) {
    console.error("シートクリアエラー:", error);
    throw error;
  }
}

/**
 * シートのすべてのデータを削除（内部関数）- 完全クリア版
 */
function clearAllData() {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();

    console.log("🧹 シートの完全クリアを開始します");

    // 1. 既存のチェックボックスを強制削除（全範囲をチェック）
    try {
      const maxRows = sheet.getMaxRows();
      const maxCols = sheet.getMaxColumns();

      console.log(`📊 シートサイズ: ${maxRows}行 × ${maxCols}列`);

      // 大きなシートの場合は分割してクリア（メモリ効率向上）
      const batchSize = 1000;
      for (let startRow = 1; startRow <= maxRows; startRow += batchSize) {
        const endRow = Math.min(startRow + batchSize - 1, maxRows);
        const range = sheet.getRange(
          startRow,
          1,
          endRow - startRow + 1,
          maxCols
        );

        // 🔧 強制的に全ての要素を削除
        range.clear();
        range.clearContent();
        range.clearFormat();
        range.clearNote();

        // データ検証クリア（存在する場合のみ）
        try {
          if (typeof range.clearDataValidations === "function") {
            range.clearDataValidations();
          }
        } catch (validationError) {
          // 旧版APIでは無視
        }

        console.log(`🧹 ${startRow}-${endRow}行をクリア完了`);
      }
    } catch (clearError) {
      console.error("範囲クリアエラー:", clearError);
      // バックアップ手法：個別セルクリア
      sheet.clear();
    }

    // 2. シート全体の再初期化
    sheet.clearContents();
    sheet.clearFormats();
    sheet.clearNotes();

    // データ検証クリア（存在する場合のみ）
    try {
      if (typeof sheet.clearDataValidations === "function") {
        sheet.clearDataValidations();
      }
    } catch (validationError) {
      console.log("⚠️ データ検証クリアをスキップ（旧版API）");
    }

    // 3. 🔧 古いチェックボックスや条件付き書式を強制削除
    try {
      // 条件付き書式をすべて削除
      const conditionalFormats = sheet.getConditionalFormatRules();
      if (conditionalFormats.length > 0) {
        sheet.clearConditionalFormatRules();
        console.log(`🎨 ${conditionalFormats.length}個の条件付き書式を削除`);
      }

      // データ検証ルールをすべて削除（新版APIのみ）
      try {
        if (
          typeof sheet.getDataValidations === "function" &&
          typeof sheet.clearDataValidations === "function"
        ) {
          const dataValidations = sheet.getDataValidations();
          if (dataValidations.length > 0) {
            sheet.clearDataValidations();
            console.log("📝 データ検証ルールを削除");
          }
        }
      } catch (validationError) {
        console.log("⚠️ データ検証クリアをスキップ（旧版API）");
      }
    } catch (formatError) {
      console.error("書式削除エラー:", formatError);
    }

    // 4. 行と列のサイズをリセット
    const maxRows = sheet.getMaxRows();
    const maxCols = sheet.getMaxColumns();

    // デフォルトサイズに戻す（大きすぎる場合のみ）
    if (maxRows > 1000) {
      sheet.deleteRows(1001, maxRows - 1000);
      console.log(`📏 行数を${maxRows}から1000に削減`);
    }
    if (maxCols > 26) {
      sheet.deleteColumns(27, maxCols - 26);
      console.log(`📏 列数を${maxCols}から26に削減`);
    }

    // 5. 行の高さと列の幅をデフォルトに戻す
    sheet.setRowHeights(1, sheet.getMaxRows(), 21);
    sheet.setColumnWidths(1, sheet.getMaxColumns(), 100);

    // 6. フリーズした行・列を解除
    sheet.setFrozenRows(0);
    sheet.setFrozenColumns(0);

    // 7. 🔧 シート保護を解除（残っている場合）
    try {
      const protections = sheet.getProtections(
        SpreadsheetApp.ProtectionType.SHEET
      );
      protections.forEach((protection) => {
        protection.remove();
      });
      if (protections.length > 0) {
        console.log("🔐 シート保護を解除");
      }
    } catch (protectionError) {
      console.error("保護解除エラー:", protectionError);
    }

    console.log(
      "✅ シートが完全にクリアされました（チェックボックス・書式・保護すべて削除）"
    );
    return true;
  } catch (error) {
    console.error("データクリアエラー:", error);
    throw new Error("データの削除に失敗しました: " + error.message);
  }
}

/**
 * バックアップを作成して新しいテーブルを作成（改良版）
 */
function createBackupAndNewTable() {
  try {
    const ui = SpreadsheetApp.getUi();
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const currentSheet = spreadsheet.getActiveSheet();
    const currentSheetName = currentSheet.getName();

    console.log(`🔧 バックアップ開始: シート「${currentSheetName}」`);

    // データ存在確認
    const hasData = checkForAnyData();

    if (!hasData) {
      console.log("📄 バックアップ対象データなし - 直接初期化実行");
      // データがない場合は直接初期化
      const result = createStructuredTable();
      return {
        message: `✅ 新しい構造化テーブルを作成しました！\n\n📋 準備完了:\n• 100行の構造化テーブル\n• プロンプト入力エリア\n• 画像生成機能\n\n🎨 B列にプロンプトを入力して画像生成を開始できます。`,
        resetSidebar: true, // 🆕 サイドバーリセットフラグ
      };
    }

    // バックアップシート名を生成
    const now = new Date();
    const timestamp = Utilities.formatDate(
      now,
      Session.getScriptTimeZone(),
      "yyyy-MM-dd_HH-mm-ss"
    );
    const backupName = `Backup_${currentSheetName}_${timestamp}`;

    console.log(`💾 バックアップシート作成: ${backupName}`);

    // 現在のシートを複製してバックアップを作成
    const backupSheet = currentSheet.copyTo(spreadsheet);
    backupSheet.setName(backupName);

    // 💡 重要改善: バックアップシートを一番右に移動（入力シートは左にキープ）
    const totalSheets = spreadsheet.getSheets().length;
    const allSheets = spreadsheet.getSheets();
    const backupSheetIndex = allSheets.indexOf(backupSheet);

    // バックアップシートのインデックスを取得して一番右に移動
    spreadsheet.setActiveSheet(backupSheet);
    spreadsheet.moveActiveSheet(totalSheets);

    console.log(`✅ バックアップ完了: ${backupName} (一番右に配置)`);

    // 💡 重要改善: 元のシートを一番左に移動
    spreadsheet.setActiveSheet(currentSheet);
    spreadsheet.moveActiveSheet(1); // 一番左（位置1）に移動

    // 現在のシートをクリア
    console.log(`🧹 元シートクリア開始`);
    clearAllData();
    console.log(`✅ 元シートクリア完了`);

    // 新しい構造化テーブルを作成
    console.log(`🔧 新テーブル作成開始`);
    const result = createStructuredTable();
    console.log(`✅ 新テーブル作成完了`);

    const successMessage =
      `✅ バックアップが正常に作成されました！\n\n` +
      `💾 バックアップシート: 「${backupName}」（右端に配置）\n` +
      `🆕 現在のシート: 「${currentSheetName}」（左端に配置・新テーブル）\n\n` +
      `📋 準備完了:\n` +
      `• 元データは「${backupName}」に安全に保存\n` +
      `• 新しい100行構造化テーブル作成済み\n` +
      `• プロンプト入力エリア設定済み\n` +
      `• シート配置最適化完了\n\n` +
      `🚀 B列にプロンプトを入力して画像生成を開始できます。\n\n` +
      `💡 バックアップは画面下部のシートタブ右端から確認できます。`;

    console.log(`🎉 バックアップ付き初期化完了 - シート配置最適化済み`);
    return {
      message: successMessage,
      resetSidebar: true, // 🆕 サイドバーリセットフラグ
    };
  } catch (error) {
    console.error("🚨 バックアップ作成エラー:", error);

    // エラーメッセージを詳細に
    const errorMessage =
      `❌ バックアップの作成に失敗しました\n\n` +
      `🚨 エラー詳細: ${error.message}\n\n` +
      `💡 対処方法:\n` +
      `1️⃣ ページをリロードしてから再試行\n` +
      `2️⃣ 手動でシートを複製してからツール実行\n` +
      `3️⃣ それでも解決しない場合は開発者に連絡\n\n` +
      `⚠️ データを保護するため、初期化を中止しました。`;

    throw new Error(errorMessage);
  }
}

/**
 * 設定確認（API キー等の状態をチェック）
 */
function checkSettings() {
  try {
    const ui = SpreadsheetApp.getUi();
    let statusMessage = "⚙️ 設定状況\n\n";

    // API キーの確認
    try {
      const apiKey = getOpenAIApiKey();
      statusMessage += "🔐 OpenAI API キー: ✅ 設定済み\n";
      statusMessage += `   キー: ${apiKey.substring(0, 7)}...${apiKey.substring(
        apiKey.length - 4
      )}\n\n`;
    } catch (error) {
      statusMessage += "🔐 OpenAI API キー: ❌ 未設定\n";
      statusMessage += "   エラー: " + error.message + "\n\n";
    }

    // 権限状況の確認
    const permissionGranted = isPermissionGranted();
    statusMessage += `🔓 権限承認: ${
      permissionGranted ? "✅ 承認済み" : "❌ 未承認"
    }\n\n`;

    // 使用履歴の確認
    const hasUsedBefore = !isFirstTimeUser();
    statusMessage += `📊 使用履歴: ${
      hasUsedBefore ? "✅ 使用経験あり" : "🆕 初回使用"
    }\n\n`;

    // シート状況の確認
    const hasData = checkForAnyData();
    statusMessage += `📋 シートデータ: ${
      hasData ? "✅ データあり" : "📝 空のシート"
    }\n\n`;

    // 推奨アクション
    statusMessage += "🚀 推奨アクション:\n";

    try {
      getOpenAIApiKey();
      if (!hasData) {
        statusMessage += "• 「🔧 初期セットアップ」でテーブル作成\n";
        statusMessage += "• 「📱 サイドバーを開く」で画像生成開始\n";
      } else {
        statusMessage += "• 「📱 サイドバーを開く」で画像生成継続\n";
        statusMessage += "• 必要に応じて「💾 バックアップ作成」\n";
      }
    } catch (error) {
      statusMessage += "• まず OpenAI API キーを設定してください\n";
      statusMessage +=
        "• スクリプトエディタ → プロジェクトの設定 → スクリプト プロパティ\n";
      statusMessage += "• プロパティ: OPENAI_API_KEY\n";
      statusMessage += "• 値: あなたのOpenAI APIキー\n";
    }

    ui.alert("設定確認", statusMessage, ui.ButtonSet.OK);

    return statusMessage;
  } catch (error) {
    console.error("設定確認エラー:", error);
    SpreadsheetApp.getUi().alert(
      "エラー",
      "設定の確認に失敗しました: " + error.message,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    throw error;
  }
}

/**
 * データ存在チェック関数
 */
function checkForAnyData() {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();

    // 1行1列のみ、または完全に空の場合は「データなし」
    if (lastRow <= 1 && lastCol <= 1) {
      return false;
    }

    // データ範囲をチェック
    if (lastRow > 1 || lastCol > 1) {
      const dataRange = sheet.getRange(1, 1, lastRow || 1, lastCol || 1);
      const values = dataRange.getValues();

      // すべてのセルが空かチェック
      for (let i = 0; i < values.length; i++) {
        for (let j = 0; j < values[i].length; j++) {
          if (values[i][j] && values[i][j] !== "") {
            return true; // データが見つかった
          }
        }
      }
    }

    return false; // データが見つからない
  } catch (error) {
    console.error("データチェックエラー:", error);
    return false; // エラーの場合はデータなしとして扱う
  }
}

/**
 * セットアップ実行関数
 */
function executeSetup(setupOption) {
  try {
    switch (setupOption) {
      case "new":
        // 新規セットアップ
        return createStructuredTable();

      case "clear":
        // クリアして新規作成
        clearAllData();
        return createStructuredTable();

      case "backup":
        // バックアップを取って新規作成
        return createBackupAndNewTable();

      default:
        throw new Error("無効なセットアップオプション: " + setupOption);
    }
  } catch (error) {
    console.error("セットアップ実行エラー:", error);
    throw new Error(`セットアップに失敗しました: ${error.message}`);
  }
}

/**
 * 構造化テーブル作成（100行の9列構造）- 共通プロンプト機能付き
 */
function createStructuredTable() {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();

    // シートをクリア
    clearAllData();

    console.log("構造化テーブル作成開始");

    // ヘッダー行を作成（1行目）
    const headers = [
      "No.", // A列: 番号
      "📝 プロンプト", // B列: 個別プロンプト入力
      "🔗 共通プロンプト", // C列: 共通プロンプト選択（新機能）
      "📄 結合プロンプト", // D列: 最終的な完全プロンプト（自動生成）
      "🖼️ 生成画像", // E列: 画像
      "📐 画像比率", // F列: 比率
      "⏰ 生成日時", // G列: 日時
      "🎨 画質", // H列: 画質選択（high/medium/low）
      "☑️ 選択", // I列: チェックボックス
    ];

    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setValues([headers]);

    // ヘッダー行の色分けスタイル設定（入力エリアと自動生成エリアを区別）
    headerRange.setFontColor("white");
    headerRange.setFontWeight("bold");
    headerRange.setHorizontalAlignment("center");
    headerRange.setVerticalAlignment("middle");
    headerRange.setFontSize(12);
    sheet.setRowHeight(1, 45);

    // 📱 視覚改善: ヘッダーを機能別に色分け
    // ユーザー入力エリア（明るい色）
    sheet.getRange(1, 2).setBackground("#4caf50"); // B列: プロンプト入力（緑）
    sheet.getRange(1, 3).setBackground("#ff9800"); // C列: 共通プロンプト選択（オレンジ）
    sheet.getRange(1, 8).setBackground("#9c27b0"); // H列: 画質選択（紫）
    sheet.getRange(1, 9).setBackground("#4caf50"); // I列: 選択（緑）

    // 自動生成エリア（グレー系）
    sheet.getRange(1, 1).setBackground("#757575"); // A列: 番号（グレー）
    sheet.getRange(1, 4).setBackground("#757575"); // D列: 結合プロンプト（グレー）
    sheet.getRange(1, 5).setBackground("#757575"); // E列: 画像（グレー）
    sheet.getRange(1, 6).setBackground("#757575"); // F列: 比率（グレー）
    sheet.getRange(1, 7).setBackground("#757575"); // G列: 日時（グレー）

    // 列幅の最適化（9列構造）- 結合プロンプト列を拡張
    sheet.setColumnWidth(1, 60); // A: No.
    sheet.setColumnWidth(2, 250); // B: 個別プロンプト
    sheet.setColumnWidth(3, 150); // C: 共通プロンプト選択
    sheet.setColumnWidth(4, 200); // D: 結合プロンプト（省略表示対応：300→200に戻す）
    sheet.setColumnWidth(5, 220); // E: 画像
    sheet.setColumnWidth(6, 100); // F: 比率
    sheet.setColumnWidth(7, 140); // G: 日時
    sheet.setColumnWidth(8, 100); // H: 画質選択
    sheet.setColumnWidth(9, 80); // I: 選択

    console.log("ヘッダー行と列幅を設定完了");

    // 100行のデータ行を作成（2-101行目）
    for (let i = 1; i <= 100; i++) {
      const row = i + 1;

      try {
        // A列: 番号（自動生成エリア）
        const numberCell = sheet.getRange(row, 1);
        numberCell.setValue(i);
        numberCell.setHorizontalAlignment("center");
        numberCell.setFontWeight("bold");
        numberCell.setBackground("#f5f5f5"); // 📱 視覚改善: 自動生成エリアをグレーアウト
        numberCell.setFontColor("#666666"); // 📱 視覚改善: フォント色を控えめに
        numberCell.setNote("🔢 自動連番 - 編集不要");

        // B列: 個別プロンプト入力エリア（ユーザー入力エリア）
        const promptCell = sheet.getRange(row, 2);
        promptCell.setWrap(true); // 💡 改善要求: セル内折り返しを有効化
        promptCell.setVerticalAlignment("middle");
        promptCell.setFontSize(11);
        promptCell.setPadding(8, 8, 8, 8);
        promptCell.setBackground("#f8fff0"); // 📱 視覚改善: 入力エリアを明るい緑色に
        promptCell.setFontColor("#2e7d32"); // 📱 視覚改善: 入力促進の緑色フォント
        promptCell.setBorder(
          true,
          true,
          true,
          true,
          true,
          true,
          "#4caf50",
          SpreadsheetApp.BorderStyle.SOLID
        ); // 📱 視覚改善: 緑色の境界線
        promptCell.setNote(
          "✏️ ここにプロンプトを入力してください\n💡 長いプロンプトはセルをクリックして全文確認できます。"
        );

        // C列: 共通プロンプト選択（ユーザー入力エリア）
        const commonPromptCell = sheet.getRange(row, 3);
        commonPromptCell.setHorizontalAlignment("center");
        commonPromptCell.setVerticalAlignment("middle"); // 💡 改善要求: 垂直配置を中央に変更（既に中央だが明示）
        commonPromptCell.setFontSize(10);
        commonPromptCell.setBackground("#fff8e1"); // 📱 視覚改善: 入力エリアを明るい黄色に
        commonPromptCell.setFontColor("#f57c00"); // 📱 視覚改善: 選択促進のオレンジ色フォント
        commonPromptCell.setBorder(
          true,
          true,
          true,
          true,
          true,
          true,
          "#ff9800",
          SpreadsheetApp.BorderStyle.SOLID
        ); // 📱 視覚改善: オレンジ色の境界線
        commonPromptCell.setNote(
          "🎯 共通プロンプトを選択してください\n💡 新しい共通プロンプトは設定シートで追加可能です。"
        );

        // D列: 結合プロンプト（自動生成エリア）- 文字はみ出し防止改善
        const combinedCell = sheet.getRange(row, 4);
        combinedCell.setValue("🔗"); // アイコンのみ表示
        combinedCell.setHorizontalAlignment("left"); // 📱 改善: 左寄せに変更
        combinedCell.setVerticalAlignment("middle"); // 💡 改善要求: 垂直配置を中央に変更（文字はみ出し防止）
        combinedCell.setWrap(true); // 💡 改善要求: テキスト折り返しを有効化（はみ出し防止）
        combinedCell.setFontSize(8); // 💡 改善要求: フォントサイズをさらに小さく（はみ出し防止）
        combinedCell.setPadding(2, 2, 2, 2); // 💡 改善要求: パディングを縮小（はみ出し防止）
        combinedCell.setBackground("#eeeeee"); // 📱 視覚改善: 自動生成エリアをグレーアウト
        combinedCell.setFontColor("#757575"); // 📱 視覚改善: フォント色を控えめに
        combinedCell.setBorder(
          true,
          true,
          true,
          true,
          true,
          true,
          "#bdbdbd",
          SpreadsheetApp.BorderStyle.DASHED
        ); // 📱 視覚改善: 破線の境界線
        combinedCell.setNote(
          "🤖 自動結合プロンプト（編集不要）\n個別プロンプト + 共通プロンプトの結合結果がここに表示されます。\n💡 長い文章もスクロールで確認できます。"
        );

        // E列: 生成画像（自動生成エリア）
        const imageCell = sheet.getRange(row, 5);
        imageCell.setBackground("#f5f5f5"); // 📱 視覚改善: 自動生成エリアをグレーアウト
        imageCell.setNote("🎨 画像生成エリア（自動）");
        imageCell.setBorder(
          true,
          true,
          true,
          true,
          true,
          true,
          "#bdbdbd",
          SpreadsheetApp.BorderStyle.DASHED
        ); // 📱 視覚改善: 破線の境界線

        // F列: 画像比率（自動生成エリア）
        const ratioCell = sheet.getRange(row, 6);
        ratioCell.setBackground("#f5f5f5"); // 📱 視覚改善: 自動生成エリアをグレーアウト
        ratioCell.setFontColor("#757575"); // 📱 視覚改善: フォント色を控えめに
        ratioCell.setNote("📐 画像比率（自動計算）");
        ratioCell.setBorder(
          true,
          true,
          true,
          true,
          true,
          true,
          "#bdbdbd",
          SpreadsheetApp.BorderStyle.DASHED
        ); // 📱 視覚改善: 破線の境界線

        // G列: 生成日時（自動生成エリア）
        const timeCell = sheet.getRange(row, 7);
        timeCell.setBackground("#f5f5f5"); // 📱 視覚改善: 自動生成エリアをグレーアウト
        timeCell.setFontColor("#757575"); // 📱 視覚改善: フォント色を控えめに
        timeCell.setNote("⏰ 生成日時（自動記録）");
        timeCell.setBorder(
          true,
          true,
          true,
          true,
          true,
          true,
          "#bdbdbd",
          SpreadsheetApp.BorderStyle.DASHED
        ); // 📱 視覚改善: 破線の境界線

        // H列: 画質選択（ユーザー入力エリア）
        const qualityCell = sheet.getRange(row, 8);
        qualityCell.setValue(formatQualityDisplay("high")); // デフォルト値を高品質表示に設定
        qualityCell.setHorizontalAlignment("center");
        qualityCell.setVerticalAlignment("middle");
        qualityCell.setFontSize(10);
        qualityCell.setBackground("#f3e5f5"); // 📱 視覚改善: 入力エリアを明るい紫色に
        qualityCell.setFontColor("#9c27b0"); // 📱 視覚改善: 選択促進の紫色フォント
        qualityCell.setBorder(
          true,
          true,
          true,
          true,
          true,
          true,
          "#9c27b0",
          SpreadsheetApp.BorderStyle.SOLID
        ); // 📱 視覚改善: 紫色の境界線
        qualityCell.setNote(
          "🎨 画質を選択してください\n🔥 high: 高品質（推奨）\n⚡ medium: 中品質\n💨 low: 低品質（高速）"
        );

        // I列: チェックボックス（ユーザー入力エリア）
        const checkboxCell = sheet.getRange(row, 9);
        checkboxCell.insertCheckboxes();
        checkboxCell.setHorizontalAlignment("center");
        checkboxCell.setVerticalAlignment("middle");
        checkboxCell.setBackground("#e8f5e8"); // 📱 視覚改善: 操作エリアを明るい緑色に
        checkboxCell.setBorder(
          true,
          true,
          true,
          true,
          true,
          true,
          "#4caf50",
          SpreadsheetApp.BorderStyle.SOLID
        ); // 📱 視覚改善: 緑色の境界線
        checkboxCell.setNote("☑️ 選択・操作エリア");

        // 行の高さを固定（UX改善 + 結合プロンプト縦幅制限）
        sheet.setRowHeight(row, 50); // 🔧 結合プロンプト省略表示対応で50pxに戻す

        // 10行ごとに薄い区切り線を追加
        if (i % 10 === 0) {
          const rowRange = sheet.getRange(row, 1, 1, headers.length);
          rowRange.setBackground("#e0e0e0"); // 📱 視覚改善: 区切り線をより薄く
          console.log(`${i}行目まで作成完了 - 視覚改善対応`);
        }
      } catch (rowError) {
        console.error(`行${row}の作成でエラー:`, rowError);
        // 個別行のエラーは続行
      }
    }

    console.log("100行のテーブル作成完了");

    // 共通プロンプト機能を初期設定
    setupCommonPromptValidation();

    // 🎨 画質選択のプルダウン設定
    setupQualityValidation();

    // 🚀 限界突破: 全行の結合プロンプト自動初期化
    try {
      console.log("🔄 全行の結合プロンプト自動初期化を開始");
      initializeAllCombinedPrompts(sheet);
      console.log("✅ 全行の結合プロンプト自動初期化が完了");
    } catch (initError) {
      console.error("❌ 結合プロンプト初期化エラー:", initError);
      // エラーでもメイン機能は続行
    }

    // 🆕 バージョン記録シートも自動作成
    try {
      getOrCreateVersionSheet();
      console.log("✅ バージョン記録シートを自動作成しました");
    } catch (versionError) {
      console.error("バージョン記録シート作成エラー:", versionError);
      // エラーでもメイン機能は続行
    }

    // 完了メッセージを下部に追加
    try {
      const messageRow = 103;
      const messageRange = sheet.getRange(messageRow, 1, 1, 9);
      messageRange.merge();
      messageRange.setValue(
        `✨ テーブルを作成しました！\n🟢 緑色・🟣紫色・🟠オレンジ色エリア = 入力・操作エリア  |  🔘 グレーエリア = 自動生成・読み取り専用`
      );
      messageRange.setBackground("#e8f5e8");
      messageRange.setFontColor("#2e7d32");
      messageRange.setHorizontalAlignment("center");
      messageRange.setFontWeight("bold");
      messageRange.setFontSize(12);
      messageRange.setWrap(true);
      sheet.setRowHeight(messageRow, 60);

      console.log("完了メッセージを追加しました");
    } catch (messageError) {
      console.error("完了メッセージの追加でエラー:", messageError);
      // メッセージエラーは無視して続行
    }

    console.log(`✅ テーブルを作成しました（入力エリア色分け対応）`);
    return {
      message:
        "✅ テーブルを作成しました！🟢緑色・🟣紫色・🟠オレンジ色エリアに入力・操作してください。🔘グレーエリアは自動生成されます。",
      resetSidebar: true, // 🆕 サイドバーリセットフラグ
    };
  } catch (error) {
    console.error("構造化テーブル作成エラー:", error);
    throw new Error(`構造化テーブルの作成に失敗しました: ${error.message}`);
  }
}

/**
 * 📊 整列: H列の画質設定を一括置き換え
 */
function alignQualitySettings() {
  try {
    const ui = SpreadsheetApp.getUi();

    // 画質選択のダイアログを表示
    const response = ui.alert(
      "📊 画質整列機能",
      "H列（画質）の全ての値を一括で設定します。\n\n" +
        "🔥 high: 高品質（推奨・コスト高）\n" +
        "⚡ medium: 中品質（バランス）\n" +
        "💨 low: 低品質（高速・コスト安）\n\n" +
        "どの画質に統一しますか？",
      ui.ButtonSet.YES_NO_CANCEL
    );

    if (response === ui.Button.CANCEL) {
      return "キャンセルされました";
    }

    // 画質選択のダイアログ
    let selectedQuality = "high"; // デフォルト
    if (response === ui.Button.YES) {
      // 高品質を選択
      selectedQuality = "high";
    } else if (response === ui.Button.NO) {
      // 詳細選択ダイアログを表示
      const detailResponse = ui.alert(
        "📊 詳細画質選択",
        "画質を選択してください：\n\n" +
          "はい = ⚡ medium（中品質・バランス）\n" +
          "いいえ = 💨 low（低品質・高速・コスト安）\n" +
          "キャンセル = 🔥 high（高品質・推奨）",
        ui.ButtonSet.YES_NO_CANCEL
      );

      if (detailResponse === ui.Button.YES) {
        selectedQuality = "medium";
      } else if (detailResponse === ui.Button.NO) {
        selectedQuality = "low";
      } else {
        selectedQuality = "high";
      }
    }

    const sheet = SpreadsheetApp.getActiveSheet();
    const lastRow = sheet.getLastRow();

    if (lastRow < 2) {
      ui.alert(
        "エラー",
        "データが見つかりません。\n先に構造化テーブルを作成してください。",
        ui.ButtonSet.OK
      );
      return "データが見つかりません";
    }

    // H列（画質列）の全てを選択した画質に設定
    const qualityRange = sheet.getRange(2, 8, lastRow - 1, 1); // H2:H(lastRow)

    console.log(`📊 整列実行: H2:H${lastRow} を「${selectedQuality}」に設定`);

    // 一括で画質を設定（表示形式で）
    const qualityValues = [];
    for (let i = 0; i < lastRow - 1; i++) {
      qualityValues.push([formatQualityDisplay(selectedQuality)]);
    }
    qualityRange.setValues(qualityValues);

    // 成功メッセージ
    const qualityEmoji =
      selectedQuality === "high"
        ? "🔥"
        : selectedQuality === "medium"
        ? "⚡"
        : "💨";
    const successMessage = `✅ 画質整列完了！\n\n${qualityEmoji} 全${
      lastRow - 1
    }行を「${selectedQuality}」に統一しました`;

    ui.alert("📊 整列完了", successMessage, ui.ButtonSet.OK);

    console.log(
      `✅ 画質整列完了: ${lastRow - 1}行を「${selectedQuality}」に設定`
    );
    return successMessage;
  } catch (error) {
    console.error("📊 整列機能エラー:", error);
    const ui = SpreadsheetApp.getUi();
    ui.alert(
      "エラー",
      `画質整列に失敗しました:\n${error.message}`,
      ui.ButtonSet.OK
    );
    throw new Error(`画質整列に失敗しました: ${error.message}`);
  }
}

/**
 * 画質表示値をAPI値に変換
 */
function parseQualityValue(displayValue) {
  if (!displayValue) return "high"; // デフォルト

  const value = displayValue.toString().toLowerCase();
  if (value.includes("high")) return "high";
  if (value.includes("medium")) return "medium";
  if (value.includes("low")) return "low";

  // 従来の値もサポート（後方互換性）
  if (value === "high" || value === "medium" || value === "low") {
    return value;
  }

  return "high"; // デフォルト
}

/**
 * API値を画質表示値に変換
 */
function formatQualityDisplay(apiValue) {
  switch (apiValue) {
    case "high":
      return "🔥 high（高品質）";
    case "medium":
      return "⚡ medium（中品質）";
    case "low":
      return "💨 low（低品質）";
    default:
      return "🔥 high（高品質）";
  }
}

/**
 * 画質選択のプルダウン設定
 */
function setupQualityValidation() {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();

    console.log("画質選択のプルダウン設定を開始");

    // 画質の選択肢を定義（視認性向上版）
    const qualityOptions = [
      "🔥 high（高品質）",
      "⚡ medium（中品質）",
      "💨 low（低品質）",
    ];

    // H列（画質選択）にプルダウンを設定（2-101行目）
    const validationRange = sheet.getRange(2, 8, 100, 1); // H2:H101

    // データ検証ルールを作成
    const rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(qualityOptions, true)
      .setAllowInvalid(false)
      .setHelpText(
        "🎨 画質を選択してください\n🔥 high: 高品質（推奨・コスト高）\n⚡ medium: 中品質（バランス）\n💨 low: 低品質（高速・コスト安）"
      )
      .build();

    // プルダウンを適用
    validationRange.setDataValidation(rule);

    console.log(
      `✅ 画質選択のプルダウンを設定しました（選択肢: ${qualityOptions.length}個）`
    );
    console.log("画質選択肢:", qualityOptions);
  } catch (error) {
    console.error("画質選択プルダウン設定エラー:", error);
    // エラーでも処理を継続（初期化を止めない）
    console.warn("画質プルダウン設定に失敗しましたが、初期化を継続します");
  }
}

/**
 * 共通プロンプトのプルダウン設定（管理シート連動版）
 */
function setupCommonPromptValidation() {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

    console.log("共通プロンプトのプルダウン設定を開始");

    // 共通プロンプト設定シートを取得または作成
    let commonSheet = spreadsheet.getSheetByName("共通プロンプト設定");
    if (!commonSheet) {
      createCommonPromptSheet();
      commonSheet = spreadsheet.getSheetByName("共通プロンプト設定");
    }

    // プルダウンの選択肢を取得
    const dropdownOptions = getCommonPromptOptions();

    if (dropdownOptions.length === 0) {
      console.warn(
        "共通プロンプトの選択肢が空です。デフォルト選択肢を使用します。"
      );
      return;
    }

    // C列（共通プロンプト選択）にプルダウンを設定（2-101行目）
    const validationRange = sheet.getRange(2, 3, 100, 1); // C2:C101

    // データ検証ルールを作成
    const rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(dropdownOptions, true)
      .setAllowInvalid(false)
      .setHelpText(
        "💡 共通プロンプトを選択してください。新しいプロンプトは「共通プロンプト設定」シートで追加できます。"
      )
      .build();

    // プルダウンを適用
    validationRange.setDataValidation(rule);

    console.log(
      `✅ 共通プロンプトのプルダウンを設定しました（選択肢: ${dropdownOptions.length}個）`
    );
    console.log("選択肢:", dropdownOptions);
  } catch (error) {
    console.error("共通プロンプトプルダウン設定エラー:", error);
    // エラーでも処理を継続（初期化を止めない）
    console.warn("プルダウン設定に失敗しましたが、初期化を継続します");
  }
}

/**
 * 共通プロンプトの選択肢を取得（プロンプト名のみ厳密抽出）
 */
function getCommonPromptOptions() {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

    // デフォルトの選択肢（最小限）
    const options = ["なし"];

    // 共通プロンプト設定シートから追加の選択肢を取得
    const commonSheet = spreadsheet.getSheetByName("共通プロンプト設定");
    if (commonSheet) {
      const lastRow = commonSheet.getLastRow();

      // 4行目以降からプロンプト名を取得
      for (let i = 4; i <= lastRow; i++) {
        const promptName = commonSheet.getRange(i, 1).getValue();

        // 有効な文字列かチェック
        if (promptName && typeof promptName === "string") {
          const cleanName = promptName.toString().trim();

          // 空でなく、重複していない場合のみ追加
          if (cleanName && !options.includes(cleanName)) {
            options.push(cleanName);
          }
        }
      }
    }

    console.log("✅ 共通プロンプト選択肢:", options);
    return options;
  } catch (error) {
    console.error("❌ 共通プロンプト選択肢取得エラー:", error);
    // エラーの場合はデフォルト選択肢のみ返す
    return ["なし"];
  }
}

/**
 * 🚀 全行の結合プロンプト自動初期化（完全自動化）
 * 構造化テーブル作成後に全行の結合プロンプトを自動設定
 */
function initializeAllCombinedPrompts(sheet = null) {
  try {
    if (!sheet) {
      sheet = SpreadsheetApp.getActiveSheet();
    }

    console.log("🔄 全行結合プロンプト自動初期化開始");
    let updatedCount = 0;
    let skippedCount = 0;

    // 2行目から101行目まで全行をチェック
    for (let row = 2; row <= 101; row++) {
      try {
        const individualPrompt = sheet.getRange(row, 2).getValue(); // B列
        const commonPromptName = sheet.getRange(row, 3).getValue(); // C列

        // B列またはC列に値がある場合のみ結合プロンプトを設定
        if (
          (individualPrompt && individualPrompt.toString().trim() !== "") ||
          (commonPromptName &&
            commonPromptName.toString().trim() !== "" &&
            commonPromptName.toString().trim() !== "なし")
        ) {
          console.log(
            `🔄 行${row}結合プロンプト初期化: B="${individualPrompt}" C="${commonPromptName}"`
          );
          updateCombinedPrompt(sheet, row);
          updatedCount++;

          // 10行ごとに進捗表示
          if (updatedCount % 10 === 0) {
            console.log(`📊 進捗: ${updatedCount}行更新完了`);
          }
        } else {
          skippedCount++;
          // 空行は詳細ログなし（スパム防止）
        }
      } catch (rowError) {
        console.error(`❌ 行${row}の結合プロンプト初期化エラー:`, rowError);
        // 個別行のエラーは続行
      }
    }

    console.log(
      `✅ 全行結合プロンプト自動初期化完了: 更新${updatedCount}行, スキップ${skippedCount}行`
    );
    return { updated: updatedCount, skipped: skippedCount };
  } catch (error) {
    console.error("❌ 全行結合プロンプト初期化エラー:", error);
    throw error;
  }
}

/**
 * 共通プロンプトのプルダウンを更新（管理シート変更時）
 */
function updateCommonPromptDropdown() {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();

    // メインシートでない場合は処理しない
    if (sheet.getName() === "共通プロンプト設定") {
      console.log("管理シートの変更を検出 - プルダウンを更新します");

      // 全シートのプルダウンを更新
      const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
      const sheets = spreadsheet.getSheets();

      for (let targetSheet of sheets) {
        // 「共通プロンプト設定」シート以外を更新
        if (
          targetSheet.getName() !== "共通プロンプト設定" &&
          targetSheet.getName() !== "画像生成ライブラリ" &&
          targetSheet.getName() !== "バージョン記録"
        ) {
          updateSheetCommonPromptDropdown(targetSheet);
        }
      }

      return "✅ 全シートのプルダウンを更新しました";
    }

    return null;
  } catch (error) {
    console.error("プルダウン更新エラー:", error);
    return `❌ プルダウン更新に失敗: ${error.message}`;
  }
}

/**
 * 指定シートの共通プロンプトプルダウンを更新
 */
function updateSheetCommonPromptDropdown(targetSheet) {
  try {
    // C列の範囲を確認
    const lastRow = targetSheet.getLastRow();
    if (lastRow < 2) return; // データがない場合はスキップ

    // 最大100行またはデータがある行まで
    const maxRow = Math.min(101, lastRow);
    const validationRange = targetSheet.getRange(2, 3, maxRow - 1, 1);

    // 新しい選択肢を取得
    const dropdownOptions = getCommonPromptOptions();

    if (dropdownOptions.length === 0) return;

    // データ検証ルールを作成
    const rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(dropdownOptions, true)
      .setAllowInvalid(false)
      .setHelpText(
        "💡 共通プロンプトを選択してください。新しいプロンプトは「共通プロンプト設定」シートで追加できます。"
      )
      .build();

    // プルダウンを適用
    validationRange.setDataValidation(rule);

    console.log(
      `✅ ${targetSheet.getName()}シートのプルダウンを更新 (選択肢: ${
        dropdownOptions.length
      }個)`
    );
  } catch (error) {
    console.error(
      `シート「${targetSheet.getName()}」のプルダウン更新エラー:`,
      error
    );
  }
}

/**
 * 選択された画像のみ削除（他のデータは保持）
 */
function deleteSelectedImages() {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();
    const lastRow = sheet.getLastRow();

    if (lastRow < 2) {
      return "❌ データがありません";
    }

    const deletedImages = [];
    const allImages = [];
    let deleteCount = 0;

    // チェックされた行を検索して画像のみ削除
    for (let i = 2; i <= lastRow; i++) {
      const checkboxCell = sheet.getRange(i, 9); // I列（チェックボックス）
      const isChecked = checkboxCell.getValue();
      const imageCell = sheet.getRange(i, 5); // E列（画像列）
      const imageFormula = imageCell.getFormula();

      // 全画像をカウント
      if (imageFormula && imageFormula.includes("=IMAGE(")) {
        allImages.push({ row: i });
      }

      if (isChecked === true) {
        if (imageFormula && imageFormula.includes("=IMAGE(")) {
          // 画像のみを削除（他のデータは保持）
          imageCell.clear();

          // ステータスを「画像削除済み」に更新
          const statusCell = sheet.getRange(i, 7); // G列（ステータス）
          statusCell.setValue("🗑️ 画像削除");
          statusCell.setHorizontalAlignment("center");
          statusCell.setVerticalAlignment("middle");
          statusCell.setFontWeight("bold");
          statusCell.setFontColor("#d32f2f");
          statusCell.setBackground("#ffebee");

          // プロンプト情報を取得（ログ用）
          const promptCell = sheet.getRange(i, 2);
          const promptValue = promptCell.getValue();
          const promptText = promptValue
            ? promptValue.toString().substring(0, 30) + "..."
            : `行${i}`;

          deletedImages.push(promptText);
          deleteCount++;

          // チェックボックスを解除
          checkboxCell.setValue(false);
        } else {
          console.log(`行${i}: 画像が存在しないためスキップ`);
        }
      }
    }

    if (deleteCount === 0) {
      if (allImages.length === 0) {
        return "❌ 削除できる画像がありません。先に画像を生成してください。";
      } else {
        return `⚠️ 画像が選択されていません\n\n📊 利用可能な画像: ${allImages.length}枚\n\n💡 対処方法:\n1️⃣ チェックボックス（I列）で削除したい画像を選択\n2️⃣ 「☑️ 全選択」で全画像を選択\n3️⃣ 再度「🗑️ 選択削除」をクリック\n\n🎯 選択した画像のみが削除されます`;
      }
    }

    console.log(`${deleteCount}枚の画像を削除:`, deletedImages);
    return `✅ ${deleteCount}枚の画像を削除しました！\n他のデータ（プロンプト、日時等）は保持されています。`;
  } catch (error) {
    console.error("選択画像削除エラー:", error);
    throw new Error(`選択画像の削除に失敗しました: ${error.message}`);
  }
}

/**
 * すべての画像を一括削除（他のデータは保持）
 */
function deleteAllImages() {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();
    const lastRow = sheet.getLastRow();

    if (lastRow < 2) {
      return "❌ データがありません";
    }

    let deleteCount = 0;
    const deletedImages = [];

    // すべての行をチェックして画像を削除
    for (let i = 2; i <= lastRow; i++) {
      const imageCell = sheet.getRange(i, 5); // E列（画像列）
      const imageFormula = imageCell.getFormula();

      if (imageFormula && imageFormula.includes("=IMAGE(")) {
        // 画像のみを削除（他のデータは保持）
        imageCell.clear();

        // ステータスを「画像削除済み」に更新
        const statusCell = sheet.getRange(i, 7); // G列（ステータス）
        statusCell.setValue("🗑️ 画像削除");
        statusCell.setHorizontalAlignment("center");
        statusCell.setVerticalAlignment("middle");
        statusCell.setFontWeight("bold");
        statusCell.setFontColor("#d32f2f");
        statusCell.setBackground("#ffebee");

        // プロンプト情報を取得（ログ用）
        const promptCell = sheet.getRange(i, 2);
        const promptValue = promptCell.getValue();
        const promptText = promptValue
          ? promptValue.toString().substring(0, 20) + "..."
          : `行${i}`;

        deletedImages.push(promptText);
        deleteCount++;

        // チェックボックスを解除（選択状態もリセット）
        const checkboxCell = sheet.getRange(i, 9);
        checkboxCell.setValue(false);
      }
    }

    if (deleteCount === 0) {
      return "❌ 削除対象の画像がありません";
    }

    console.log(`${deleteCount}枚の画像を一括削除:`, deletedImages.slice(0, 5)); // 最初の5個のみログ出力
    return `✅ ${deleteCount}枚の画像を一括削除しました！\n他のデータ（プロンプト、日時等）は完全に保持されています。`;
  } catch (error) {
    console.error("画像一括削除エラー:", error);
    throw new Error(`画像の一括削除に失敗しました: ${error.message}`);
  }
}

/**
 * 画像削除後の行整理（オプション機能）
 */
function cleanupAfterImageDeletion() {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();
    const lastRow = sheet.getLastRow();

    if (lastRow < 2) {
      return "❌ データがありません";
    }

    let cleanupCount = 0;

    // 画像削除済みの行の行高を通常サイズに戻す
    for (let i = 2; i <= lastRow; i++) {
      const statusCell = sheet.getRange(i, 7);
      const statusValue = statusCell.getValue();

      if (statusValue && statusValue.toString().includes("🗑️ 画像削除")) {
        // 行高を通常サイズ（30px）に変更
        sheet.setRowHeight(i, 30);
        cleanupCount++;
      }
    }

    if (cleanupCount > 0) {
      return `✅ ${cleanupCount}行の行高を最適化しました`;
    } else {
      return "📝 整理対象の行がありませんでした";
    }
  } catch (error) {
    console.error("削除後整理エラー:", error);
    throw new Error(`削除後の整理に失敗しました: ${error.message}`);
  }
}

/**
 * 削除された画像の復元準備（プロンプトベース）
 */
function prepareImageRestoration() {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();
    const lastRow = sheet.getLastRow();

    if (lastRow < 2) {
      return "❌ データがありません";
    }

    const restorationCandidates = [];

    // 画像削除済みでプロンプトが残っている行を検出
    for (let i = 2; i <= lastRow; i++) {
      const statusCell = sheet.getRange(i, 7);
      const statusValue = statusCell.getValue();
      const promptCell = sheet.getRange(i, 2);
      const promptValue = promptCell.getValue();

      if (
        statusValue &&
        statusValue.toString().includes("🗑️ 画像削除") &&
        promptValue &&
        promptValue.toString().trim() !== ""
      ) {
        restorationCandidates.push({
          row: i,
          prompt: promptValue.toString().substring(0, 50) + "...",
        });

        // ステータスを「復元可能」に更新
        statusCell.setValue("🔄 復元可能");
        statusCell.setFontColor("#1976d2");
        statusCell.setBackground("#e3f2fd");
      }
    }

    if (restorationCandidates.length === 0) {
      return "📝 復元可能な行がありません";
    }

    console.log("復元可能な行:", restorationCandidates);
    return `✅ ${restorationCandidates.length}行が復元可能です。\nプロンプトが保持されているため、再生成で画像を復元できます。`;
  } catch (error) {
    console.error("復元準備エラー:", error);
    throw new Error(`復元準備に失敗しました: ${error.message}`);
  }
}

/**
 * 画像生成予定枚数を取得（プログレスバー用）
 */
function getImageGenerationCount() {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();
    const lastRow = sheet.getLastRow();

    if (lastRow < 2) {
      return 0;
    }

    // B列からプロンプトを検索し、未生成の画像数をカウント
    const promptRange = sheet.getRange(2, 2, Math.min(lastRow - 1, 100), 1);
    const promptValues = promptRange.getValues();

    let imageCount = 0;

    promptValues.forEach((row, index) => {
      const prompt = row[0];
      const actualRow = index + 2;

      if (prompt && typeof prompt === "string" && prompt.trim() !== "") {
        // 既存データ保護：既に画像が生成されている行はスキップ
        const existingImageCell = sheet.getRange(actualRow, 5); // E列（画像列）
        const existingImage = existingImageCell.getFormula();

        if (!existingImage || !existingImage.includes("=IMAGE(")) {
          imageCount++;
        }
      }
    });

    console.log(`画像生成予定枚数: ${imageCount}枚`);
    return imageCount;
  } catch (error) {
    console.error("画像生成枚数取得エラー:", error);
    return 1; // エラーの場合はデフォルト値
  }
}

/**
 * 選択された画像枚数を取得（再生成プログレスバー用）
 */
function getSelectedImageCount() {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();
    const lastRow = sheet.getLastRow();

    if (lastRow < 2) {
      return 0;
    }

    let selectedCount = 0;

    // チェックされた行を検索
    for (let i = 2; i <= lastRow; i++) {
      const checkboxCell = sheet.getRange(i, 9); // I列（チェックボックス）
      const isChecked = checkboxCell.getValue();

      if (isChecked === true) {
        // 完全なプロンプトを取得（省略表示対応）
        const fullPrompt = getFullPrompt(sheet, i);

        if (fullPrompt && fullPrompt.trim() !== "") {
          selectedCount++;
        }
      }
    }

    console.log(`選択された画像枚数: ${selectedCount}枚`);
    return selectedCount;
  } catch (error) {
    console.error("選択画像枚数取得エラー:", error);
    return 0; // エラーの場合は0を返す
  }
}

// 🔧 50,000文字制限対応：ユーザープロンプト完全保持システム（内部処理版のみ省略）
function createSafeComment(originalPrompt, revisedPrompt) {
  const maxSafeLength = 25000; // 25,000文字の究極安全制限（25,000文字の巨大マージン）
  const headerComment = `📝 完全なユーザープロンプト:\n`;

  // ユーザープロンプト部分の安全処理
  let userPromptForComment = originalPrompt || "";
  const maxUserCommentLength = Math.floor(maxSafeLength * 0.6); // 60%をユーザープロンプトに割り当て

  if (userPromptForComment.length > maxUserCommentLength) {
    userPromptForComment =
      userPromptForComment.substring(0, maxUserCommentLength) +
      "\n[ユーザープロンプトが長すぎるため省略...]";
  }

  let combinedComment = headerComment + userPromptForComment;

  // 内部処理版がある場合は追加（残り容量内で）
  if (revisedPrompt && revisedPrompt.trim() !== "") {
    const footerText = `\n\n💡 この情報はAIが自動生成した内部処理版です。`;
    const remainingLength =
      maxSafeLength - combinedComment.length - footerText.length - 500; // 500文字の追加安全マージン

    if (remainingLength > 200) {
      // 最低200文字の余裕がある場合のみ追加
      let revisedPart = revisedPrompt;

      if (revisedPart.length > remainingLength) {
        revisedPart =
          revisedPart.substring(0, remainingLength) +
          "\n[内部処理版が長すぎるため省略...]";
      }

      combinedComment +=
        `\n\n🤖 GPT-Image-1内部処理版:\n${revisedPart}` + footerText;
    } else {
      combinedComment +=
        `\n\n🤖 GPT-Image-1内部処理版: [容量制限のため省略]` + footerText;
    }
  }

  // 最終安全チェック（絶対に25,000文字を超えない）
  if (combinedComment.length > maxSafeLength) {
    combinedComment =
      combinedComment.substring(0, maxSafeLength - 100) +
      "\n[安全制限により省略...]";
  }

  return combinedComment;
}

/**
 * 🔍 デバッグ: 最新のエラーログを直接表示する関数
 * スプレッドシートから直接実行してエラー詳細を確認
 */
function showLatestErrorDebug() {
  try {
    // 最後に画像生成を実行して、デバッグ情報を収集
    const sheet = SpreadsheetApp.getActiveSheet();
    const ui = SpreadsheetApp.getUi();

    // テスト用の短いプロンプトで画像生成を実行
    const testPrompts = ["a simple red apple"];

    console.log("🔍 デバッグテスト開始");
    console.log("- テストプロンプト:", testPrompts[0]);

    try {
      const imageResults = generateImages(testPrompts);
      console.log("✅ 画像生成成功:", imageResults);

      // 結果配置のテスト
      console.log("🔍 結果配置テスト開始");
      const result = populateStructuredTable(imageResults, [2]);
      console.log("✅ 結果配置成功:", result);

      ui.alert(
        "✅ デバッグテスト完了",
        "エラーは発生しませんでした。別のプロンプトで試してください。",
        ui.ButtonSet.OK
      );
    } catch (error) {
      console.error("🚨 デバッグテストでエラー発生:", error);
      console.error("- エラーメッセージ:", error.message);
      console.error("- エラースタック:", error.stack);

      // エラー情報をユーザーに表示
      ui.alert(
        "🚨 エラー詳細",
        `エラーメッセージ: ${error.message}\n\n` +
          `エラータイプ: ${error.name}\n\n` +
          `詳細はコンソールログを確認してください。`,
        ui.ButtonSet.OK
      );

      throw error;
    }
  } catch (error) {
    console.error("🚨 デバッグ関数でエラー:", error);
    throw new Error(`デバッグ実行失敗: ${error.message}`);
  }
}

/**
 * 🔍 デバッグ: セル文字数制限をテストする関数
 */
function testCellCharacterLimits() {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();
    const ui = SpreadsheetApp.getUi();

    console.log("🔍 セル文字数制限テスト開始");

    // 様々な文字数のテストデータを作成
    const testData = [
      { length: 1000, name: "1K文字" },
      { length: 10000, name: "10K文字" },
      { length: 25000, name: "25K文字" },
      { length: 45000, name: "45K文字" },
      { length: 49000, name: "49K文字" },
      { length: 50000, name: "50K文字" },
    ];

    let results = [];

    testData.forEach((test, index) => {
      const testString = "a".repeat(test.length);
      const testCell = sheet.getRange(1, 10 + index); // J列以降を使用

      try {
        console.log(`📝 ${test.name}テスト中...`);
        testCell.setValue(testString);
        console.log(`✅ ${test.name}: 成功`);
        results.push(`✅ ${test.name}: 成功`);

        // テストセルをクリア
        testCell.setValue("");
      } catch (error) {
        console.error(`❌ ${test.name}: 失敗 - ${error.message}`);
        results.push(`❌ ${test.name}: 失敗 - ${error.message}`);
      }
    });

    // 結果をユーザーに表示
    ui.alert(
      "🔍 セル文字数制限テスト結果",
      results.join("\n"),
      ui.ButtonSet.OK
    );

    return results;
  } catch (error) {
    console.error("🚨 文字数制限テストでエラー:", error);
    throw new Error(`文字数制限テスト失敗: ${error.message}`);
  }
}

/**
 * 📁 data URL (base64) 形式の画像を Google Drive に保存し、
 * 共有リンク (https://drive.google.com/uc?id=...) を返す。
 * 長大な data URL を短い URL に変換して 50,000 文字制限を回避する。
 */
function uploadBase64ImageToDrive(dataUrl) {
  try {
    const matches = dataUrl.match(/^data:image\/png;base64,(.+)$/);
    if (!matches || matches.length < 2) {
      throw new Error("無効な data URL 形式です");
    }

    const base64Data = matches[1];
    const blob = Utilities.newBlob(
      Utilities.base64Decode(base64Data),
      "image/png",
      `dalle_${Utilities.getUuid()}.png`
    );

    // 保存先フォルダを取得（無ければ作成）
    const folderName = "DALL-E Generated Images";
    let folder;
    const folders = DriveApp.getFoldersByName(folderName);
    folder = folders.hasNext()
      ? folders.next()
      : DriveApp.createFolder(folderName);

    const file = folder.createFile(blob);

    // 全員閲覧可に設定（IMAGE 関数用URLは認証不要にする）
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    return `https://drive.google.com/uc?id=${file.getId()}`;
  } catch (e) {
    console.error("uploadBase64ImageToDrive エラー:", e);
    throw e;
  }
}

/**
 * ブラウザダウンロード用に選択された画像をBase64で取得（CORS回避）
 */
function downloadSelectedImageUrls() {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();
    const lastRow = sheet.getLastRow();

    if (lastRow < 2) {
      return { images: [], error: "❌ データがありません" };
    }

    const selectedImages = [];
    const allImages = [];

    // 全画像と選択画像を並行して収集
    for (let i = 2; i <= lastRow; i++) {
      const checkboxCell = sheet.getRange(i, 9); // I列（チェックボックス）
      const isChecked = checkboxCell.getValue();
      const imageCell = sheet.getRange(i, 5); // E列（画像列）
      const imageFormula = imageCell.getFormula();

      if (imageFormula && imageFormula.includes("=IMAGE(")) {
        // IMAGE関数からURLを抽出
        const urlMatch = imageFormula.match(/=IMAGE\("([^"]+)"/);
        if (urlMatch && urlMatch[1]) {
          // 完全なプロンプトを取得（省略表示対応）
          const fullPrompt = getFullPrompt(sheet, i);
          const prompt = fullPrompt || `画像_${i}`;

          const imageData = {
            url: urlMatch[1],
            filename: createSimpleFilename(prompt, i),
            row: i,
          };

          // 全画像リストに追加
          allImages.push(imageData);

          // チェックされている場合は選択画像リストにも追加
          if (isChecked === true) {
            selectedImages.push(imageData);
          }
        }
      }
    }

    // 🔧 選択確認ロジック
    if (selectedImages.length === 0) {
      if (allImages.length === 0) {
        return {
          images: [],
          error:
            "❌ ダウンロードできる画像がありません。先に画像を生成してください。",
        };
      } else {
        return {
          images: [],
          error: `⚠️ 画像が選択されていません\n\n📊 利用可能な画像: ${allImages.length}枚\n\n💡 対処方法:\n1️⃣ チェックボックス（I列）で画像を選択\n2️⃣ 「☑️ 全選択」で全画像を選択\n3️⃣ 再度ダウンロードを実行\n\n🎯 選択した画像のみがダウンロードされます`,
        };
      }
    }

    console.log(
      `🖥️ ブラウザダウンロード対象: ${selectedImages.length}枚の画像（全${allImages.length}枚中）`
    );

    // 🔧 サーバーサイドで画像をBase64に変換（CORS回避）
    const base64Images = [];
    for (const imageData of selectedImages) {
      try {
        // URLFetchを使って画像データを取得
        const response = UrlFetchApp.fetch(imageData.url);
        const blob = response.getBlob();

        // Base64に変換
        const base64 = Utilities.base64Encode(blob.getBytes());
        const mimeType = blob.getContentType() || "image/png";

        base64Images.push({
          base64: `data:${mimeType};base64,${base64}`,
          filename: imageData.filename,
          row: imageData.row,
        });

        console.log(`✅ Base64変換完了: ${imageData.filename}`);
      } catch (error) {
        console.error(`❌ Base64変換エラー (行${imageData.row}):`, error);
        // エラーの場合は元のURLを使用（フォールバック）
        base64Images.push({
          base64: imageData.url,
          filename: imageData.filename,
          row: imageData.row,
        });
      }
    }

    return {
      images: base64Images.map((img) => ({
        url: img.base64,
        filename: img.filename,
      })),
      totalCount: allImages.length,
    };
  } catch (error) {
    console.error("選択画像ダウンロード準備エラー:", error);
    return {
      images: [],
      error: `画像ダウンロード準備に失敗しました: ${error.message}`,
    };
  }
}

/**
 * ZIPファイルでまとめてローカルダウンロード（DriveAPI使用）
 */
function downloadSelectedImagesAsZip() {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();
    const lastRow = sheet.getLastRow();

    if (lastRow < 2) {
      return { error: "❌ データがありません" };
    }

    const selectedImages = [];

    // 選択された画像を収集
    for (let i = 2; i <= lastRow; i++) {
      const checkboxCell = sheet.getRange(i, 9); // I列（チェックボックス）
      const isChecked = checkboxCell.getValue();
      const imageCell = sheet.getRange(i, 5); // E列（画像列）
      const imageFormula = imageCell.getFormula();

      if (
        isChecked === true &&
        imageFormula &&
        imageFormula.includes("=IMAGE(")
      ) {
        const urlMatch = imageFormula.match(/=IMAGE\("([^"]+)"/);
        if (urlMatch && urlMatch[1]) {
          const fullPrompt = getFullPrompt(sheet, i);
          const prompt = fullPrompt || `画像_${i}`;

          selectedImages.push({
            url: urlMatch[1],
            filename: createSimpleFilename(prompt, i),
            row: i,
            originalPrompt: prompt,
          });
        }
      }
    }

    if (selectedImages.length === 0) {
      return { error: "❌ 選択された画像がありません" };
    }

    console.log(`📦 ZIP作成対象: ${selectedImages.length}枚の画像`);

    // 各画像をBase64データとして取得
    const imageFiles = [];
    let successCount = 0;

    for (const imageData of selectedImages) {
      try {
        const response = UrlFetchApp.fetch(imageData.url);
        const blob = response.getBlob();
        const base64Data = Utilities.base64Encode(blob.getBytes());

        imageFiles.push({
          filename: imageData.filename,
          data: base64Data,
          mimeType: blob.getContentType() || "image/png",
        });

        successCount++;
        console.log(`✅ 画像取得完了: ${imageData.filename}`);
      } catch (error) {
        console.error(`❌ 画像取得エラー (行${imageData.row}):`, error);
      }
    }

    if (successCount === 0) {
      return { error: "❌ 画像の取得に失敗しました" };
    }

    // ZIPファイル名を生成
    const zipFileName = `DALL-E画像_${Utilities.formatDate(
      new Date(),
      Session.getScriptTimeZone(),
      "yyyyMMdd_HHmmss"
    )}.zip`;

    return {
      success: true,
      zipFileName: zipFileName,
      imageCount: successCount,
      imageFiles: imageFiles,
      message: `✅ ${successCount}枚の画像をZIP準備完了！`,
    };
  } catch (error) {
    console.error("ZIPダウンロードエラー:", error);
    return { error: `ZIPファイル作成に失敗しました: ${error.message}` };
  }
}

/**
 * プレビュー用：全画像のURLとプロンプトを取得
 */
function getAllImagePreviewData() {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();
    const lastRow = sheet.getLastRow();

    if (lastRow < 2) {
      return [];
    }

    const images = [];

    for (let i = 2; i <= lastRow; i++) {
      const imageCell = sheet.getRange(i, 5); // E列（画像列）
      const imageFormula = imageCell.getFormula();

      if (imageFormula && imageFormula.includes("=IMAGE(")) {
        // IMAGE関数からURLを抽出
        const urlMatch = imageFormula.match(/=IMAGE\("([^"]+)"/);
        if (urlMatch && urlMatch[1]) {
          // 完全なプロンプトを取得（省略表示対応）
          const fullPrompt = getFullPrompt(sheet, i);
          const prompt = fullPrompt || `画像_${i}`;

          images.push({
            url: urlMatch[1],
            prompt: prompt,
            row: i,
          });
        }
      }
    }

    return images;
  } catch (error) {
    console.error("画像プレビューデータ取得エラー:", error);
    throw new Error(`画像プレビューデータ取得に失敗しました: ${error.message}`);
  }
}

/**
 * 共通プロンプト設定シートを作成（美しいデザイン版）
 */
function createCommonPromptSheet() {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

    // 既存の共通プロンプト設定シートを削除（あれば）
    const existingSheet = spreadsheet.getSheetByName("共通プロンプト設定");
    if (existingSheet) {
      spreadsheet.deleteSheet(existingSheet);
    }

    // 新しい共通プロンプト設定シートを作成
    const commonSheet = spreadsheet.insertSheet("共通プロンプト設定");

    // 📝 使用説明を最上部に配置
    const instructionRange = commonSheet.getRange(1, 1, 1, 2);
    instructionRange.merge();
    instructionRange.setValue(
      "💡 共通プロンプト管理（補助機能）\n\n" +
        "🎯 プロンプト名：プルダウンに表示される名前\n" +
        "📝 プロンプト内容：実際に使用される英語プロンプト\n\n" +
        "⚠️ メインはB列の個別プロンプト入力です。\n" +
        "共通プロンプトは補助的に使用してください。"
    );
    instructionRange.setBackground("#e8f5e8");
    instructionRange.setFontWeight("bold");
    instructionRange.setWrap(true);
    instructionRange.setVerticalAlignment("top");
    instructionRange.setBorder(
      true,
      true,
      true,
      true,
      false,
      false,
      "#4caf50",
      SpreadsheetApp.BorderStyle.SOLID
    );
    commonSheet.setRowHeight(1, 100);

    // 🎨 シンプルなヘッダー設定（3行目）
    const headers = ["プロンプト名", "プロンプト内容"];
    const headerRange = commonSheet.getRange(3, 1, 1, headers.length);
    headerRange.setValues([headers]);

    // ヘッダーのスタイル設定
    headerRange.setBackground("#1976d2");
    headerRange.setFontColor("white");
    headerRange.setFontWeight("bold");
    headerRange.setHorizontalAlignment("center");
    headerRange.setVerticalAlignment("middle");
    headerRange.setFontSize(12);
    headerRange.setBorder(
      true,
      true,
      true,
      true,
      true,
      true,
      "#0d47a1",
      SpreadsheetApp.BorderStyle.SOLID
    );

    // 列幅の最適化
    commonSheet.setColumnWidth(1, 200); // プロンプト名列
    commonSheet.setColumnWidth(2, 500); // プロンプト内容列
    commonSheet.setRowHeight(3, 45); // ヘッダー行

    // 🌟 基本的なサンプルデータ
    const sampleData = [
      ["高品質写真", "high quality, professional photography"],
      ["アニメ風", "anime style"],
      ["風景", "landscape, nature"],
    ];

    // サンプルデータを4行目から連続配置
    if (sampleData.length > 0) {
      const dataRange = commonSheet.getRange(4, 1, sampleData.length, 2);
      dataRange.setValues(sampleData);

      // サンプル行のスタイル設定
      for (let i = 4; i <= sampleData.length + 3; i++) {
        const rowRange = commonSheet.getRange(i, 1, 1, 2);

        rowRange.setBorder(
          true,
          true,
          true,
          true,
          true,
          true,
          "#d0d0d0",
          SpreadsheetApp.BorderStyle.SOLID
        );
        rowRange.setBackground("#f8f9fa");

        // プロンプト名のスタイル
        commonSheet.getRange(i, 1).setFontWeight("bold");
        commonSheet.getRange(i, 1).setFontColor("#1976d2");

        // プロンプト内容のスタイル
        commonSheet.getRange(i, 2).setWrap(true);
        commonSheet.getRange(i, 2).setVerticalAlignment("top");
      }
    }

    // ✏️ ユーザー入力用の空行を10行準備
    const userInputStartRow = sampleData.length + 4;
    for (let i = userInputStartRow; i < userInputStartRow + 10; i++) {
      const rowRange = commonSheet.getRange(i, 1, 1, 2);

      // 入力しやすいスタイル
      rowRange.setBorder(
        true,
        true,
        true,
        true,
        true,
        true,
        "#d0d0d0",
        SpreadsheetApp.BorderStyle.SOLID
      );
      rowRange.setBackground("#ffffff");

      // プロンプト内容セルのスタイル
      commonSheet.getRange(i, 2).setWrap(true);
      commonSheet.getRange(i, 2).setVerticalAlignment("top");

      // 行の高さを入力しやすく
      commonSheet.setRowHeight(i, 35);
    }

    // 🎨 シート全体の美化
    commonSheet.setTabColor("#1976d2");

    console.log(
      `✅ ユーザー入力対応の共通プロンプト設定シートを作成しました（サンプル${sampleData.length}個 + 入力用10行）`
    );

    // 🔧 重要：シートオブジェクトを返す
    return commonSheet;
  } catch (error) {
    console.error("共通プロンプトシート作成エラー:", error);
    throw new Error(
      `共通プロンプトシートの作成に失敗しました: ${error.message}`
    );
  }
}

/**
 * 🆕 画像生成ライブラリシート管理
 */

/**
 * ライブラリシートを作成または取得
 */
function getOrCreateLibrarySheet() {
  console.log("🔍🔍🔍 ライブラリシート取得開始...");
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    console.log(`📋 スプレッドシート名: ${spreadsheet.getName()}`);
    console.log(`📋 全シート数: ${spreadsheet.getSheets().length}`);

    let librarySheet = spreadsheet.getSheetByName("画像生成ライブラリ");
    console.log(
      `🔍 既存ライブラリシート: ${
        librarySheet ? "見つかりました" : "見つかりません"
      }`
    );

    if (!librarySheet) {
      console.log("🆕🆕🆕 新しいライブラリシートを作成します...");
      try {
        // 💡 改善要求: 新しい改善されたライブラリシート作成関数を使用
        librarySheet = createEmptyLibrarySheet();
        console.log(`✅ ライブラリシート作成完了: ${librarySheet.getName()}`);
        console.log(`📊 作成されたシート行数: ${librarySheet.getLastRow()}`);
        console.log(`📊 作成されたシート列数: ${librarySheet.getLastColumn()}`);
      } catch (createError) {
        console.error("🚨 ライブラリシート作成中にエラー:", createError);
        console.error("🚨 作成エラー詳細:", createError.stack);
        throw createError;
      }
    } else {
      console.log(`📊 既存ライブラリシート行数: ${librarySheet.getLastRow()}`);
      console.log(
        `📊 既存ライブラリシート列数: ${librarySheet.getLastColumn()}`
      );
    }

    console.log(`🎯🎯🎯 ライブラリシート準備完了: ${librarySheet.getName()}`);
    return librarySheet;
  } catch (error) {
    console.error("🚨🚨🚨 ライブラリシート作成エラー:", error);
    console.error("🚨 エラー詳細:", error.stack);
    throw new Error(`ライブラリシートの作成に失敗しました: ${error.message}`);
  }
}

/**
 * ライブラリシートに生成記録を追加（💡 改善要求: 画像確実コピー＆結合プロンプト形式）
 */
function addToImageLibrary(imageData) {
  // 🚨 緊急デバッグ: 関数実行を強制的に記録
  console.log("🚨🚨🚨 CRITICAL: addToImageLibrary関数が実行されました!");
  console.log("🚨🚨🚨 実行時刻:", new Date().toISOString());
  console.log("🚨🚨🚨 呼び出し元:", new Error().stack);

  // UI通知は削除（ユーザーの要求により）

  // スプレッドシートに直接ログを書き込み（デバッグ用）
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    sheet
      .getRange("Z1")
      .setValue(`addToImageLibrary実行: ${new Date().toISOString()}`);
  } catch (e) {
    console.log("デバッグログ書き込みエラー:", e);
  }

  console.log(
    "🔥🔥🔥 addToImageLibrary開始:",
    JSON.stringify({
      prompt: imageData.prompt
        ? imageData.prompt.substring(0, 50) + "..."
        : "なし",
      imageUrl: imageData.imageUrl
        ? imageData.imageUrl.substring(0, 50) + "..."
        : "なし",
      aspectRatio: imageData.aspectRatio,
      originalRow: imageData.originalRow,
    })
  );

  // 🔥 重要修正: 変数スコープ問題解決
  let librarySheet = null;
  let lastRow = 0;
  let newRow = 0;
  let recordNumber = 0;
  let dataRange = null;

  try {
    // 🔥 チェックポイント1: ライブラリシート取得
    console.log("📚 ライブラリシート取得中...");
    try {
      librarySheet = getOrCreateLibrarySheet();
      console.log(`✅ ライブラリシート取得成功: ${librarySheet.getName()}`);
      console.log(`📊 ライブラリシート行数: ${librarySheet.getLastRow()}`);

      lastRow = librarySheet.getLastRow();
      newRow = lastRow + 1;
      console.log(`📊 新規行番号: ${newRow} (最終行: ${lastRow})`);

      // 🔥 チェックポイント1完了通知
      SpreadsheetApp.getActiveSpreadsheet()
        .getActiveSheet()
        .getRange("Z3")
        .setValue(
          `✅ CP1: ライブラリシート取得成功 - ${new Date().toISOString()}`
        );
    } catch (sheetError) {
      console.error("🚨 チェックポイント1エラー:", sheetError);
      SpreadsheetApp.getActiveSpreadsheet()
        .getActiveSheet()
        .getRange("Z3")
        .setValue(`❌ CP1: ライブラリシート取得失敗 - ${sheetError.message}`);
      throw sheetError;
    }

    // 通し番号を計算（ヘッダー除く）
    recordNumber = lastRow > 1 ? lastRow - 1 : 1;
    console.log(`🔢 レコード番号: ${recordNumber}`);

    // 💡 改善要求: プロンプト表示を結合プロンプト形式に変更
    const promptText = imageData.prompt || "プロンプト不明";
    const displayPrompt =
      promptText.length > 80 ? promptText.substring(0, 77) + "..." : promptText;

    const rowData = [
      recordNumber, // A列: No.
      displayPrompt, // B列: プロンプト（💡 改善要求: 結合プロンプト形式）
      "", // C列: 画像（後で確実にコピー設定）
      imageData.aspectRatio || "1024x1024", // D列: 比率
      imageData.timestamp.toLocaleString("ja-JP"), // E列: 日時
      imageData.status || "✅ 生成完了", // F列: ステータス
      imageData.originalRow || "-", // G列: 元行
      false, // H列: チェックボックス（💡 改善要求: ダウンロード機能のため）
    ];

    console.log(`📝 ライブラリ行データ準備完了:`, JSON.stringify(rowData));

    // 🔥 チェックポイント2: データ書き込み
    try {
      dataRange = librarySheet.getRange(newRow, 1, 1, rowData.length);
      dataRange.setValues([rowData]);
      console.log(`✅ 基本データ書き込み完了: 行${newRow}`);

      // チェックポイント2完了通知
      SpreadsheetApp.getActiveSpreadsheet()
        .getActiveSheet()
        .getRange("Z4")
        .setValue(
          `✅ CP2: データ書き込み成功 - 行${newRow} - ${new Date().toISOString()}`
        );
    } catch (dataError) {
      console.error("🚨 チェックポイント2エラー:", dataError);
      SpreadsheetApp.getActiveSpreadsheet()
        .getActiveSheet()
        .getRange("Z4")
        .setValue(`❌ CP2: データ書き込み失敗 - ${dataError.message}`);
      throw dataError;
    }

    // 🔥 チェックポイント3: スタイル設定（dataRange使用）
    try {
      // スタイル設定
      dataRange.setBorder(
        true,
        true,
        true,
        true,
        true,
        true,
        "#e0e0e0",
        SpreadsheetApp.BorderStyle.SOLID
      );

      // 行ごとの色分け（見やすさ向上）
      const bgColor = newRow % 2 === 0 ? "#f8f9fa" : "#ffffff";
      dataRange.setBackground(bgColor);

      // チェックポイント3完了通知
      SpreadsheetApp.getActiveSpreadsheet()
        .getActiveSheet()
        .getRange("Z5")
        .setValue(`✅ CP3: スタイル設定完了 - ${new Date().toISOString()}`);
    } catch (styleError) {
      console.error("🚨 チェックポイント3エラー:", styleError);
      SpreadsheetApp.getActiveSpreadsheet()
        .getActiveSheet()
        .getRange("Z5")
        .setValue(`❌ CP3: スタイル設定失敗 - ${styleError.message}`);
      // スタイル設定エラーは致命的ではないので継続
    }

    // 💡 改善要求: 各列の配置設定
    librarySheet.getRange(newRow, 1).setHorizontalAlignment("center"); // No.

    // 💡 改善要求: プロンプトセルを結合プロンプト形式に統一
    const promptCell = librarySheet.getRange(newRow, 2); // プロンプト
    promptCell.setWrap(true); // 💡 改善要求: 結合プロンプト形式に合わせて折り返し有効
    promptCell.setVerticalAlignment("middle"); // 💡 改善要求: 中央配置
    promptCell.setFontSize(8); // 💡 改善要求: 結合プロンプトと同じ小さなフォント
    // setPaddingはGASでサポートされていないため削除
    promptCell.setFontWeight("normal");
    promptCell.setFontColor("#757575"); // 💡 改善要求: 結合プロンプトと同じグレー文字色
    promptCell.setBackground("#eeeeee"); // 💡 改善要求: 結合プロンプトと同じグレー背景
    promptCell.setBorder(
      true,
      true,
      true,
      true,
      true,
      true,
      "#bdbdbd",
      SpreadsheetApp.BorderStyle.DASHED
    ); // 💡 改善要求: 結合プロンプトと同じ破線境界線

    // 💡 改善要求: 完全なプロンプトをツールチップに保存（結合プロンプト形式）
    promptCell.setNote(
      `📄 完全なプロンプト:\n${promptText}\n\n💡 このセルをクリックして全文を確認できます。`
    );

    // 🎯 最重要: 画像セルに確実に画像を設定
    const imageCell = librarySheet.getRange(newRow, 3);

    // 🔥 個別セルの完全リセットと最適化
    console.log(`🔧 画像セル完全リセット開始: ${imageCell.getA1Notation()}`);

    // セルを完全にクリア
    imageCell.clearFormat();
    imageCell.clearContent();

    // 🔥 診断結果に基づく書式設定修正
    imageCell.setNumberFormat("@"); // テキスト形式（General→@に変更）
    imageCell.setWrap(false);
    imageCell.setHorizontalAlignment("center");
    imageCell.setVerticalAlignment("middle");
    imageCell.setBackground("#ffffff");

    // セル設定後の確認
    Utilities.sleep(100);
    const currentFormat = imageCell.getNumberFormat();
    console.log(`📊 設定後書式確認: ${currentFormat}`);

    // 行の高さを画像表示に最適化
    librarySheet.setRowHeight(newRow, 120);

    console.log(`🔧 画像セル完全リセット完了: ${imageCell.getA1Notation()}`);

    // 🚀 確実な画像設定処理 - 診断結果に基づく改善
    let imageSuccessfullyCopied = false;
    const imageUrl = imageData.imageUrl || imageData.url;
    console.log(
      `🔗 使用する画像URL: ${
        imageUrl ? imageUrl.substring(0, 100) + "..." : "なし"
      }`
    );

    // 🔥 画像転記の根本的改善 - 入力シートから直接コピーを最優先
    console.log(`🚀 入力シートから画像を直接取得開始...`);

    // まず入力シートの画像を直接取得して確実にコピー
    if (imageData.originalRow && imageData.originalRow !== "-") {
      try {
        const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

        // 元シートを特定
        let sourceSheet = null;
        if (imageData.sourceSheet) {
          sourceSheet = spreadsheet.getSheetByName(imageData.sourceSheet);
          console.log(`📋 指定元シート: ${imageData.sourceSheet}`);
        }

        // 元シートが見つからない場合は入力シートを検索
        if (!sourceSheet) {
          const inputSheets = spreadsheet
            .getSheets()
            .filter(
              (s) =>
                s.getName() !== "画像生成ライブラリ" &&
                s.getName() !== "共通プロンプト設定" &&
                s.getName() !== "📋 バージョン記録"
            );

          if (inputSheets.length > 0) {
            sourceSheet = inputSheets[0];
            console.log(`📋 入力シート特定: ${sourceSheet.getName()}`);
          }
        }

        if (sourceSheet) {
          const sourceImageCell = sourceSheet.getRange(
            imageData.originalRow,
            5
          ); // E列
          console.log(
            `📷 元画像セル: ${sourceSheet.getName()}!${sourceImageCell.getA1Notation()}`
          );

          // 🔥 元セルのフォーミュラを取得して直接設定（copyTo使用しない）
          const sourceFormula = sourceImageCell.getFormula();
          const sourceValue = sourceImageCell.getValue();

          console.log(
            `📷 元セル詳細: フォーミュラ="${sourceFormula}", 値="${sourceValue}"`
          );

          if (sourceFormula && sourceFormula.includes("=IMAGE(")) {
            console.log(`🔥 元シートフォーミュラ取得成功: ${sourceFormula}`);

            // 🔥 複数回試行で確実な設定
            let setAttempts = 0;
            let setSuccess = false;

            while (setAttempts < 3 && !setSuccess) {
              setAttempts++;
              console.log(`🔄 フォーミュラ設定試行 ${setAttempts}/3`);

              try {
                // 特別なサイズ設定でIMAGE関数を最適化
                const urlMatch = sourceFormula.match(/=IMAGE\("([^"]+)"/);
                if (urlMatch && urlMatch[1]) {
                  const imageUrl = urlMatch[1];
                  const optimizedFormula = `=IMAGE("${imageUrl}", 1)`;

                  // 書式を再確認して設定
                  imageCell.setNumberFormat("@");
                  imageCell.setFormula(optimizedFormula);

                  console.log(
                    `🔧 最適化フォーミュラ設定試行${setAttempts}: ${optimizedFormula}`
                  );

                  Utilities.sleep(200);
                  const verifyFormula = imageCell.getFormula();

                  if (verifyFormula && verifyFormula.includes("=IMAGE(")) {
                    setSuccess = true;
                    imageSuccessfullyCopied = true;
                    console.log(
                      `✅ フォーミュラ設定成功(試行${setAttempts}): ${verifyFormula.substring(
                        0,
                        50
                      )}...`
                    );
                  } else {
                    console.warn(
                      `⚠️ 試行${setAttempts}失敗: 設定=${optimizedFormula}, 確認=${verifyFormula}`
                    );
                  }
                }
              } catch (setError) {
                console.error(
                  `🚨 フォーミュラ設定試行${setAttempts}エラー:`,
                  setError
                );
              }
            }

            if (!setSuccess) {
              console.error(
                `🚨 ${setAttempts}回試行してもフォーミュラ設定失敗`
              );
            }
          } else {
            console.warn(`⚠️ 元セルに有効なIMAGE関数なし: ${sourceFormula}`);
          }
        }
      } catch (directCopyError) {
        console.error("🚨 入力シートから直接コピーエラー:", directCopyError);
      }
    }

    // フォールバック1: sourceFormulaを使用（複数回試行）
    if (
      !imageSuccessfullyCopied &&
      imageData.sourceFormula &&
      imageData.sourceFormula.includes("=IMAGE(")
    ) {
      console.log(
        `🔄 フォールバック1開始: sourceFormula使用 - ${imageData.sourceFormula.substring(
          0,
          100
        )}...`
      );

      for (let i = 1; i <= 3; i++) {
        try {
          console.log(`🔄 フォールバック1試行 ${i}/3`);

          // 書式を再設定
          imageCell.setNumberFormat("@");
          imageCell.setFormula(imageData.sourceFormula);

          Utilities.sleep(200);
          const verifyFormula = imageCell.getFormula();

          if (verifyFormula && verifyFormula.includes("=IMAGE(")) {
            imageSuccessfullyCopied = true;
            console.log(
              `✅ フォールバック1成功(試行${i}): ${verifyFormula.substring(
                0,
                50
              )}...`
            );
            break;
          } else {
            console.warn(`⚠️ フォールバック1試行${i}失敗: ${verifyFormula}`);
          }
        } catch (formulaError) {
          console.error(`🚨 フォールバック1試行${i}エラー:`, formulaError);
        }
      }
    }

    // フォールバック2: URLから直接画像設定
    if (
      !imageSuccessfullyCopied &&
      imageUrl &&
      (imageUrl.startsWith("http") || imageUrl.startsWith("data:"))
    ) {
      try {
        console.log(
          `🔄 フォールバック2: URL使用 - ${imageUrl.substring(0, 50)}...`
        );

        // サイズパラメータ付きで最適化
        const imageFormula = `=IMAGE("${imageUrl}", 1)`;
        imageCell.setFormula(imageFormula);

        // 追加の書式調整
        imageCell.setNumberFormat("General");
        imageCell.setVerticalAlignment("middle");
        imageCell.setHorizontalAlignment("center");

        Utilities.sleep(300);

        const verifyFormula = imageCell.getFormula();
        if (verifyFormula && verifyFormula.includes("=IMAGE(")) {
          imageSuccessfullyCopied = true;
          console.log(`✅ URL設定成功: ${imageFormula}`);
        }
      } catch (urlError) {
        console.error("🚨 URL設定エラー:", urlError);
      }
    }

    // 最終フォールバック: エラー表示
    if (!imageSuccessfullyCopied) {
      imageCell.setValue("❌ 画像設定失敗");
      imageCell.setBackground("#ffebee");
      imageCell.setFontColor("#d32f2f");
      console.error(`🚨 全ての画像設定方法が失敗: 行${imageData.originalRow}`);
    }

    // 🎯 画像設定完了後の短時間待機
    if (imageSuccessfullyCopied) {
      Utilities.sleep(300); // 0.3秒待機で確実な反映
      console.log(`✅ 画像設定完了 - ${imageCell.getA1Notation()}`);
    }

    librarySheet.getRange(newRow, 4).setHorizontalAlignment("center"); // 比率
    librarySheet.getRange(newRow, 5).setHorizontalAlignment("center"); // 日時
    librarySheet.getRange(newRow, 6).setHorizontalAlignment("center"); // ステータス
    librarySheet.getRange(newRow, 7).setHorizontalAlignment("center"); // 元行

    // 💡 改善要求: チェックボックスの挿入と設定
    const checkboxCell = librarySheet.getRange(newRow, 8);
    checkboxCell.insertCheckboxes();
    checkboxCell.setHorizontalAlignment("center");
    checkboxCell.setVerticalAlignment("middle");
    checkboxCell.setBackground("#e8f5e8"); // 操作エリアを明るい緑色に

    // 🔧 H列にチェックボックスを設定
    const libraryCheckboxCell = librarySheet.getRange(newRow, 8);
    libraryCheckboxCell.insertCheckboxes();
    libraryCheckboxCell.setValue(false); // デフォルトは未選択
    console.log(
      `☑️ チェックボックス設定完了: ${libraryCheckboxCell.getA1Notation()}`
    );

    // 🔥 書式問題修正：行の高さは既にcreateEmptyLibrarySheet()で設定済み（100px）

    console.log(
      `🎉 ライブラリに記録追加完了: 行${newRow} - 画像コピー${
        imageSuccessfullyCopied ? "成功" : "フォールバック"
      } - ${promptText.substring(0, 30)}...`
    );
    console.log("✅✅✅ addToImageLibrary正常終了 - ライブラリ記録成功！");

    // 最終確認: 実際にデータが書き込まれたかチェック
    try {
      const verifyData = librarySheet.getRange(newRow, 1, 1, 8).getValues()[0];
      console.log(
        "🔍 書き込み確認:",
        JSON.stringify({
          no: verifyData[0],
          prompt: verifyData[1]
            ? verifyData[1].toString().substring(0, 30) + "..."
            : "なし",
          hasImage: verifyData[2] ? "あり" : "なし",
          ratio: verifyData[3],
          date: verifyData[4],
          status: verifyData[5],
        })
      );
    } catch (verifyError) {
      console.warn("⚠️ 書き込み確認エラー:", verifyError);
    }

    return true;
  } catch (error) {
    console.error("🚨🚨🚨 ライブラリ記録追加エラー:", error);
    console.error("🚨 エラー詳細:", error.stack);
    console.error("🚨 入力データ:", JSON.stringify(imageData));
    console.error("🚨 エラー発生時点での処理状況を確認してください");

    // 🔥 超強力なエラー詳細出力とユーザー通知
    const errorDetails = {
      message: error.message,
      name: error.name,
      stack: error.stack,
      inputData: JSON.stringify(imageData),
      timestamp: new Date().toISOString(),
    };

    // ユーザーに詳細エラー情報を直接表示
    try {
      SpreadsheetApp.getUi().alert(
        "🚨 addToImageLibrary関数エラー詳細",
        `エラーが発生しました：\n\n` +
          `エラー名: ${error.name}\n` +
          `メッセージ: ${error.message}\n` +
          `発生時刻: ${new Date().toISOString()}\n\n` +
          `詳細はコンソールログを確認してください。`,
        SpreadsheetApp.getUi().ButtonSet.OK
      );
    } catch (uiError) {
      console.error("UI通知エラー:", uiError);
    }

    // Z2セルにエラー詳細を書き込み（確実な記録）
    try {
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
      sheet
        .getRange("Z2")
        .setValue(
          `🚨ERROR: ${error.name} - ${
            error.message
          } - ${new Date().toISOString()}`
        );
    } catch (logError) {
      console.error("ログ書き込みエラー:", logError);
    }

    // エラーでも画像生成を止めない
    return false;
  }
}

/**
 * 💡 改善要求: ライブラリからの選択画像ダウンロード機能
 */
function downloadSelectedLibraryImages() {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const librarySheet = spreadsheet.getSheetByName("画像生成ライブラリ");

    if (!librarySheet) {
      return "❌ 画像生成ライブラリシートが見つかりません";
    }

    const lastRow = librarySheet.getLastRow();
    if (lastRow < 4) {
      // ヘッダー + 説明行 + データ行
      return "❌ ライブラリにデータがありません";
    }

    const selectedImages = [];
    let selectedCount = 0;

    // 4行目以降からデータを収集（ヘッダー・説明行をスキップ）
    for (let i = 4; i <= lastRow; i++) {
      const checkboxCell = librarySheet.getRange(i, 8); // H列（チェックボックス）
      const isChecked = checkboxCell.getValue();

      if (isChecked === true) {
        const imageCell = librarySheet.getRange(i, 3); // C列（画像）
        const imageFormula = imageCell.getFormula();
        const promptCell = librarySheet.getRange(i, 2); // B列（プロンプト）
        const prompt = promptCell.getValue() || `ライブラリ画像_${i}`;

        if (imageFormula && imageFormula.includes("=IMAGE(")) {
          // IMAGE関数からURLを抽出
          const urlMatch = imageFormula.match(/=IMAGE\("([^"]+)"/);
          if (urlMatch && urlMatch[1]) {
            selectedImages.push({
              url: urlMatch[1],
              filename: createSimpleFilename(prompt.toString(), i),
              row: i,
            });
            selectedCount++;
          }
        }
      }
    }

    if (selectedCount === 0) {
      return "❌ ダウンロード対象の画像が選択されていません。チェックボックスを選択してから実行してください。";
    }

    // ダウンロード処理実行
    if (selectedImages.length > 0) {
      // Drive APIを使用してダウンロード
      const driveResults = [];
      selectedImages.forEach((imageData, index) => {
        try {
          const response = UrlFetchApp.fetch(imageData.url);
          const blob = response.getBlob();
          blob.setName(imageData.filename);

          const file = DriveApp.createFile(blob);
          driveResults.push({
            filename: imageData.filename,
            url: file.getDownloadUrl(),
          });
        } catch (error) {
          console.error(`画像ダウンロードエラー (行${imageData.row}):`, error);
        }
      });

      return `✅ ライブラリから${selectedCount}枚の画像をGoogle Driveにダウンロードしました！\n\n📊 ダウンロード詳細:\n• 選択された画像: ${selectedCount}枚\n• Google Drive保存完了: ${driveResults.length}枚\n\n📁 Google Driveの「マイドライブ」をご確認ください。`;
    }

    return "❌ ダウンロードに失敗しました";
  } catch (error) {
    console.error("ライブラリダウンロードエラー:", error);
    throw new Error(
      `ライブラリからのダウンロードに失敗しました: ${error.message}`
    );
  }
}

/**
 * 💡 改善要求: ライブラリの全選択/解除機能
 * ライブラリシートのH列チェックボックスをトグル
 */
function toggleAllLibrarySelection() {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const librarySheet = spreadsheet.getSheetByName("画像生成ライブラリ");

    if (!librarySheet) {
      throw new Error("画像生成ライブラリシートが見つかりません");
    }

    const dataRange = librarySheet.getDataRange();
    const lastRow = dataRange.getLastRow();

    if (lastRow <= 1) {
      return "❌ ライブラリにデータがありません";
    }

    // H列（チェックボックス列）のチェック状態を確認
    const checkboxRange = librarySheet.getRange(2, 8, lastRow - 1, 1); // H列（2行目から最終行まで）
    const checkboxValues = checkboxRange.getValues();

    // チェックされている数をカウント
    let checkedCount = 0;
    checkboxValues.forEach((row) => {
      if (row[0] === true) checkedCount++;
    });

    // 過半数がチェックされていれば全解除、そうでなければ全選択
    const shouldSelectAll = checkedCount < checkboxValues.length / 2;
    const newValues = checkboxValues.map(() => [shouldSelectAll]);

    checkboxRange.setValues(newValues);

    const action = shouldSelectAll ? "全選択" : "全解除";
    const emoji = shouldSelectAll ? "✅" : "❌";
    console.log(
      `${emoji} ライブラリ${action}完了 - 対象行数: ${checkboxValues.length}行`
    );

    return `${emoji} ライブラリ${action}完了 - ${checkboxValues.length}枚の画像を${action}しました`;
  } catch (error) {
    console.error("ライブラリ全選択エラー:", error);
    throw new Error(`ライブラリの全選択に失敗しました: ${error.message}`);
  }
}

/**
 * 🆕 ライブラリ全選択専用関数
 * ライブラリのすべての画像を選択状態にします
 */
function selectAllLibraryImages() {
  try {
    console.log("✅ ライブラリ全選択を開始");
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const librarySheet = spreadsheet.getSheetByName("画像生成ライブラリ");

    if (!librarySheet) {
      throw new Error("画像生成ライブラリシートが見つかりません");
    }

    const dataRange = librarySheet.getDataRange();
    const lastRow = dataRange.getLastRow();

    if (lastRow <= 1) {
      console.log("⚠️ ライブラリにデータがありません");
      return "⚠️ ライブラリにデータがありません";
    }

    // H列（チェックボックス列）をすべてtrueに設定
    const checkboxRange = librarySheet.getRange(2, 8, lastRow - 1, 1); // H列（2行目から最終行まで）
    const checkboxValues = Array(lastRow - 1).fill([true]);

    checkboxRange.setValues(checkboxValues);

    console.log(`✅ ライブラリ全選択完了 - 対象行数: ${lastRow - 1}行`);
    return `✅ ライブラリ全選択完了 - ${
      lastRow - 1
    }枚の画像をすべて選択しました`;
  } catch (error) {
    console.error("ライブラリ全選択エラー:", error);
    throw new Error(`ライブラリ全選択に失敗しました: ${error.message}`);
  }
}

/**
 * 🆕 ライブラリ全選択解除専用関数
 * ライブラリのすべての画像の選択を解除します
 */
function clearAllLibrarySelection() {
  try {
    console.log("❌ ライブラリ全選択解除を開始");
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const librarySheet = spreadsheet.getSheetByName("画像生成ライブラリ");

    if (!librarySheet) {
      throw new Error("画像生成ライブラリシートが見つかりません");
    }

    const dataRange = librarySheet.getDataRange();
    const lastRow = dataRange.getLastRow();

    if (lastRow <= 1) {
      console.log("⚠️ ライブラリにデータがありません");
      return "⚠️ ライブラリにデータがありません";
    }

    // H列（チェックボックス列）をすべてfalseに設定
    const checkboxRange = librarySheet.getRange(2, 8, lastRow - 1, 1); // H列（2行目から最終行まで）
    const checkboxValues = Array(lastRow - 1).fill([false]);

    checkboxRange.setValues(checkboxValues);

    console.log(`❌ ライブラリ全選択解除完了 - 対象行数: ${lastRow - 1}行`);
    return `❌ ライブラリ全選択解除完了 - ${
      lastRow - 1
    }枚の画像の選択をすべて解除しました`;
  } catch (error) {
    console.error("ライブラリ全選択解除エラー:", error);
    throw new Error(`ライブラリ全選択解除に失敗しました: ${error.message}`);
  }
}

/**
 * ライブラリの統計情報を取得
 */
function getLibraryStats() {
  try {
    const librarySheet = getOrCreateLibrarySheet();
    const lastRow = librarySheet.getLastRow();

    if (lastRow < 2) {
      return {
        totalImages: 0,
        lastGenerated: null,
        popularPrompts: [],
      };
    }

    // 統計データを収集
    const data = librarySheet.getRange(2, 1, lastRow - 1, 7).getValues();
    const totalImages = data.length;
    const lastGenerated = data[data.length - 1][4]; // 最新の生成日時

    // プロンプトの使用頻度を分析
    const promptCount = {};
    data.forEach((row) => {
      const prompt = row[1]?.toString().substring(0, 50);
      promptCount[prompt] = (promptCount[prompt] || 0) + 1;
    });

    const popularPrompts = Object.entries(promptCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([prompt, count]) => ({ prompt, count }));

    return {
      totalImages,
      lastGenerated,
      popularPrompts,
    };
  } catch (error) {
    console.error("ライブラリ統計取得エラー:", error);
    return { totalImages: 0, lastGenerated: null, popularPrompts: [] };
  }
}

/**
 * 🆕 バージョン記録シート管理
 */

/**
 * バージョン記録シートを作成または取得
 */
function getOrCreateVersionSheet() {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    let versionSheet = spreadsheet.getSheetByName("📋 バージョン記録");

    if (!versionSheet) {
      // 新規バージョン記録シートを作成
      versionSheet = spreadsheet.insertSheet("📋 バージョン記録");

      // ヘッダー行を設定
      const headers = [
        "バージョン", // A列: バージョン番号
        "📅 リリース日", // B列: リリース日
        "🔧 主要機能", // C列: 主要機能・改善
        "🐛 修正内容", // D列: バグ修正・調整
        "📊 技術情報", // E列: 技術的詳細
        "🔗 関連リンク", // F列: GitHub・ドキュメント
      ];

      const headerRange = versionSheet.getRange(1, 1, 1, headers.length);
      headerRange.setValues([headers]);

      // ヘッダーのスタイル設定
      headerRange.setBackground("#673ab7");
      headerRange.setFontColor("white");
      headerRange.setFontWeight("bold");
      headerRange.setHorizontalAlignment("center");
      headerRange.setVerticalAlignment("middle");
      headerRange.setFontSize(11);
      headerRange.setBorder(
        true,
        true,
        true,
        true,
        true,
        true,
        "#5e35b1",
        SpreadsheetApp.BorderStyle.SOLID
      );

      // 列幅の最適化
      versionSheet.setColumnWidth(1, 100); // バージョン
      versionSheet.setColumnWidth(2, 120); // リリース日
      versionSheet.setColumnWidth(3, 300); // 主要機能
      versionSheet.setColumnWidth(4, 250); // 修正内容
      versionSheet.setColumnWidth(5, 200); // 技術情報
      versionSheet.setColumnWidth(6, 200); // 関連リンク

      // ヘッダー行の高さ
      versionSheet.setRowHeight(1, 45);

      // プロジェクト概要セクション
      const projectInfoRow = 3;
      const projectInfoRange = versionSheet.getRange(
        projectInfoRow,
        1,
        1,
        headers.length
      );
      projectInfoRange.merge();
      projectInfoRange.setValue(
        "🚀 スプレッドシート画像生成ツール - 開発履歴・技術情報\n\n" +
          "🔹 このシートには全てのバージョン履歴と技術情報が記録されています\n" +
          "🔹 GitHubリポジトリやドキュメントへのリンクも含まれています\n" +
          "🔹 開発者・メンテナー向けの詳細情報を確認できます"
      );
      projectInfoRange.setBackground("#e8eaf6");
      projectInfoRange.setFontWeight("bold");
      projectInfoRange.setWrap(true);
      projectInfoRange.setVerticalAlignment("top");
      versionSheet.setRowHeight(projectInfoRow, 80);

      // 現在のバージョン情報を追加
      addVersionRecord({
        version: "2.0.0",
        releaseDate: "2025-01-27",
        majorFeatures:
          "🎯 プロダクト最終仕上げ - 共通プロンプト設定シート2列構造簡素化・ステータス列テキスト折り返し対応・画像生成ライブラリシート自動記録機能追加",
        bugFixes:
          "🔧 初期化エラー修正（clearDataValidations互換性対応）・管理シート自動遷移問題解決・結合プロンプト列幅拡張",
        technicalInfo:
          "📊 9列構造テーブル・視覚改善システム・Git Auto Push汎用ツール統合・GPT-Image-1 API対応",
        links: "https://github.com/daideguchi/spreadsheet-image-generator",
      });

      // 過去のバージョン履歴を追加
      addVersionRecord({
        version: "1.9.0",
        releaseDate: "2025-01-26",
        majorFeatures:
          "🎨 視覚改善システム実装 - ユーザー入力エリアと自動生成エリアの色分け・境界線スタイル統一・UX大幅改善",
        bugFixes:
          "🔧 Google スプレッドシート50,000文字制限エラー解決・null/undefined安全処理・setValue制限緩和",
        technicalInfo:
          "📱 入力エリア（緑・オレンジ・青）・自動生成エリア（グレー）・破線境界線・実線境界線",
        links: "https://github.com/daideguchi/spreadsheet-image-generator",
      });

      addVersionRecord({
        version: "1.8.0",
        releaseDate: "2025-01-25",
        majorFeatures:
          "🚀 Git Auto Push汎用ツール開発・ワンコマンドインストール対応・全プロダクトで使いまわし可能",
        bugFixes:
          "🔧 コミット・プッシュ作業の自動化・エラーハンドリング強化・カラー出力対応",
        technicalInfo:
          "📦 curl -s https://raw.githubusercontent.com/daideguchi/git-autopush/main/install.sh | bash",
        links: "https://github.com/daideguchi/git-autopush",
      });

      addVersionRecord({
        version: "1.7.0",
        releaseDate: "2025-01-24",
        majorFeatures:
          "🔄 再生成機能・選択削除機能・全選択/解除機能・ダウンロード機能強化",
        bugFixes:
          "🔧 選択確認ロジック・統計情報表示・詳細ガイダンス・エラーハンドリング",
        technicalInfo:
          "📊 選択数/全画像数表示・3ステップ解決方法・成功/失敗詳細表示",
        links: "https://github.com/daideguchi/spreadsheet-image-generator",
      });

      addVersionRecord({
        version: "1.6.0",
        releaseDate: "2025-01-23",
        majorFeatures:
          "📋 構造化テーブルシステム・9列構造・共通プロンプト管理・結合プロンプト自動生成",
        bugFixes:
          "🔧 テーブル初期化・ドロップダウン更新・プロンプト結合ロジック・視覚的改善",
        technicalInfo:
          "🎯 A列:No. B列:プロンプト C列:共通プロンプト D列:結合プロンプト E列:画像 F列:比率 G列:日時 H列:ステータス I列:選択",
        links: "https://github.com/daideguchi/spreadsheet-image-generator",
      });

      addVersionRecord({
        version: "1.5.0",
        releaseDate: "2025-01-22",
        majorFeatures:
          "🤖 GPT-Image-1 API対応・最新モデル統合・32,000文字対応・高品質設定",
        bugFixes:
          "🔧 プロンプト完全無改変・自動サイズ判定・リトライ機能・エラーハンドリング強化",
        technicalInfo:
          "🔥 model: gpt-image-1, quality: high, background: auto, output_format: png",
        links: "https://platform.openai.com/docs/models/gpt-image-1",
      });

      addVersionRecord({
        version: "1.0.0",
        releaseDate: "2025-01-21",
        majorFeatures:
          "🎨 DALL-E画像生成ツール初回リリース・スプレッドシート統合・サイドバーUI",
        bugFixes: "🔧 基本機能実装・API連携・権限設定・エラーハンドリング",
        technicalInfo:
          "📱 Google Apps Script・OpenAI API・DALL-E 3・スプレッドシート統合",
        links: "https://github.com/daideguchi/spreadsheet-image-generator",
      });

      console.log("✅ バージョン記録シートを作成しました");
    }

    return versionSheet;
  } catch (error) {
    console.error("バージョン記録シート作成エラー:", error);
    throw new Error(
      `バージョン記録シートの作成に失敗しました: ${error.message}`
    );
  }
}

/**
 * バージョン記録を追加
 */
function addVersionRecord(versionData) {
  try {
    const versionSheet = getOrCreateVersionSheet();
    const lastRow = versionSheet.getLastRow();
    const newRow = lastRow + 1;

    // データを行に追加
    const rowData = [
      versionData.version || "不明", // A列: バージョン
      versionData.releaseDate || new Date().toISOString().split("T")[0], // B列: リリース日
      versionData.majorFeatures || "-", // C列: 主要機能
      versionData.bugFixes || "-", // D列: 修正内容
      versionData.technicalInfo || "-", // E列: 技術情報
      versionData.links || "-", // F列: 関連リンク
    ];

    const dataRange = versionSheet.getRange(newRow, 1, 1, rowData.length);
    dataRange.setValues([rowData]);

    // スタイル設定
    dataRange.setBorder(
      true,
      true,
      true,
      true,
      true,
      true,
      "#e0e0e0",
      SpreadsheetApp.BorderStyle.SOLID
    );

    // 行ごとの色分け（見やすさ向上）
    const bgColor = newRow % 2 === 0 ? "#f8f9fa" : "#ffffff";
    dataRange.setBackground(bgColor);

    // 各列の配置設定
    versionSheet
      .getRange(newRow, 1)
      .setHorizontalAlignment("center")
      .setFontWeight("bold"); // バージョン
    versionSheet.getRange(newRow, 2).setHorizontalAlignment("center"); // リリース日
    versionSheet.getRange(newRow, 3).setWrap(true).setVerticalAlignment("top"); // 主要機能
    versionSheet.getRange(newRow, 4).setWrap(true).setVerticalAlignment("top"); // 修正内容
    versionSheet.getRange(newRow, 5).setWrap(true).setVerticalAlignment("top"); // 技術情報
    versionSheet.getRange(newRow, 6).setHorizontalAlignment("center"); // 関連リンク

    // 行の高さを調整
    versionSheet.setRowHeight(newRow, 120);

    console.log(`✅ バージョン記録追加: ${versionData.version}`);
    return true;
  } catch (error) {
    console.error("バージョン記録追加エラー:", error);
    return false;
  }
}

/**
 * 開発者向け情報を取得
 */
function getDeveloperInfo() {
  try {
    const versionSheet = getOrCreateVersionSheet();
    const lastRow = versionSheet.getLastRow();

    if (lastRow < 2) {
      return {
        currentVersion: "不明",
        totalVersions: 0,
        lastUpdate: null,
        githubLink: null,
      };
    }

    // 最新バージョン情報を取得
    const latestVersion = versionSheet.getRange(lastRow, 1).getValue();
    const latestDate = versionSheet.getRange(lastRow, 2).getValue();
    const githubLink = versionSheet.getRange(lastRow, 6).getValue();

    return {
      currentVersion: latestVersion,
      totalVersions: lastRow - 1,
      lastUpdate: latestDate,
      githubLink: githubLink !== "-" ? githubLink : null,
    };
  } catch (error) {
    console.error("開発者情報取得エラー:", error);
    return {
      currentVersion: "エラー",
      totalVersions: 0,
      lastUpdate: null,
      githubLink: null,
    };
  }
}

/**
 * バージョン記録シートを開く
 */
function openVersionSheet() {
  try {
    const versionSheet = getOrCreateVersionSheet();
    SpreadsheetApp.setActiveSheet(versionSheet);

    // 開発者情報を取得して表示
    const devInfo = getDeveloperInfo();

    const ui = SpreadsheetApp.getUi();
    ui.alert(
      "📋 バージョン記録シート",
      `🚀 スプレッドシート画像生成ツール - 開発履歴\n\n` +
        `📊 現在のバージョン: ${devInfo.currentVersion}\n` +
        `📅 最終更新: ${devInfo.lastUpdate}\n` +
        `📈 総バージョン数: ${devInfo.totalVersions}\n\n` +
        `🔗 GitHub: ${devInfo.githubLink || "リンクなし"}\n\n` +
        `💡 このシートには全ての開発履歴と技術情報が記録されています。\n` +
        `開発者・メンテナー向けの詳細情報を確認できます。`,
      SpreadsheetApp.getUi().ButtonSet.OK
    );

    console.log("✅ バージョン記録シートを開きました");
    return "✅ バージョン記録シートを開きました";
  } catch (error) {
    console.error("バージョン記録シートを開くエラー:", error);
    throw new Error(`バージョン記録シートを開けませんでした: ${error.message}`);
  }
}

/**
 * 共通プロンプト管理シート作成メニュー（ユーザー向け）
 */
function createCommonPromptSheetMenu() {
  try {
    const ui = SpreadsheetApp.getUi();

    // 既存チェック
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const existingSheet = spreadsheet.getSheetByName("共通プロンプト設定");

    if (existingSheet) {
      // 既存シートがある場合の選択肢
      const response = ui.alert(
        "🎯 共通プロンプト管理シート",
        "📋 共通プロンプト設定シートは既に存在しています。\n\n" +
          "✅ このシートでプロンプトを管理できます：\n" +
          "• プロンプト名とプロンプト内容を追加\n" +
          "• 入力シートのプルダウンに自動反映\n\n" +
          "🔄 シートをリセットして新しく作り直しますか？\n" +
          "（はい = リセット、いいえ = 既存シートを開く）",
        ui.ButtonSet.YES_NO
      );

      if (response === ui.Button.YES) {
        // リセットして新規作成
        spreadsheet.deleteSheet(existingSheet);
        const newSheet = createCommonPromptSheet();
        SpreadsheetApp.setActiveSheet(newSheet);

        ui.alert(
          "✅ 管理シート作成完了",
          "🎯 共通プロンプト管理シートを新規作成しました！\n\n" +
            "📋 使い方：\n" +
            "1️⃣ 4行目以降にプロンプトを追加\n" +
            "2️⃣ A列：プロンプト名、B列：プロンプト内容\n" +
            "3️⃣ 入力シートのC列プルダウンに自動反映\n\n" +
            "💡 既にサンプルデータと入力用の空行が準備されています。\n" +
            "自由に編集して独自のプロンプトを追加してください！",
          ui.ButtonSet.OK
        );
      } else {
        // 既存シートを開く
        SpreadsheetApp.setActiveSheet(existingSheet);

        ui.alert(
          "📋 管理シートを開きました",
          "🎯 共通プロンプト管理シートを開きました。\n\n" +
            "📋 プロンプトの追加方法：\n" +
            "1️⃣ 空行を選択（入力用の行が準備されています）\n" +
            "2️⃣ A列にプロンプト名を入力\n" +
            "3️⃣ B列にプロンプト内容を入力\n\n" +
            "🔄 変更は入力シートのプルダウンに自動反映されます！",
          ui.ButtonSet.OK
        );
      }
    } else {
      // 新規作成の場合
      const sheet = createCommonPromptSheet();
      SpreadsheetApp.setActiveSheet(sheet);

      ui.alert(
        "✅ 管理シート作成完了",
        "🎯 共通プロンプト管理シートを作成しました！\n\n" +
          "📋 使い方：\n" +
          "1️⃣ 空行にプロンプトを追加（入力用の行が準備済み）\n" +
          "2️⃣ A列：プロンプト名、B列：プロンプト内容\n" +
          "3️⃣ 入力シートのC列プルダウンに自動反映\n\n" +
          "💡 既にサンプルデータと入力用の空行が準備されています。\n" +
          "自由に編集して独自のプロンプトを追加してください！",
        ui.ButtonSet.OK
      );
    }

    return "✅ 共通プロンプト管理シートの操作完了";
  } catch (error) {
    console.error("共通プロンプト管理シート作成メニューエラー:", error);
    throw new Error(`管理シートの操作に失敗しました: ${error.message}`);
  }
}

/**
 * 💡 改善要求: ライブラリシートのリセット機能
 */
function resetImageLibrary() {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const existingLibrarySheet =
      spreadsheet.getSheetByName("画像生成ライブラリ");

    // 既存のライブラリシートが存在する場合は削除
    if (existingLibrarySheet) {
      spreadsheet.deleteSheet(existingLibrarySheet);
      console.log("📚 既存のライブラリシートを削除しました");
    }

    // 新しい空白のライブラリシートを作成
    const librarySheet = createEmptyLibrarySheet();

    return "✅ 画像生成ライブラリをリセットしました！\n\n📋 新しい空白のライブラリが作成されました。\n🎨 次回の画像生成から新しいライブラリに記録されます。";
  } catch (error) {
    console.error("ライブラリリセットエラー:", error);
    throw new Error(`ライブラリのリセットに失敗しました: ${error.message}`);
  }
}

/**
 * 💡 改善要求: 空白のライブラリシートを作成
 */
function createEmptyLibrarySheet() {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const librarySheet = spreadsheet.insertSheet("画像生成ライブラリ");

    // ヘッダー行を設定（改善されたUI対応）
    const headers = [
      "No.", // A列: 通し番号
      "📝 プロンプト", // B列: 使用プロンプト
      "🖼️ 画像", // C列: 生成画像
      "📐 比率", // D列: 画像比率
      "⏰ 生成日時", // E列: 生成日時
      "✅ ステータス", // F列: 生成ステータス
      "🔗 元行", // G列: 元のシート行番号
      "☑️ 選択", // H列: チェックボックス
    ];

    const headerRange = librarySheet.getRange(1, 1, 1, headers.length);
    headerRange.setValues([headers]);

    // ヘッダーのスタイル設定（改善版）
    headerRange.setBackground("#2196f3");
    headerRange.setFontColor("white");
    headerRange.setFontWeight("bold");
    headerRange.setHorizontalAlignment("center");
    headerRange.setVerticalAlignment("middle");
    headerRange.setFontSize(11);
    headerRange.setBorder(
      true,
      true,
      true,
      true,
      true,
      true,
      "#1976d2",
      SpreadsheetApp.BorderStyle.SOLID
    );

    // 💡 改善要求: 列幅の最適化（結合プロンプト形式対応）
    librarySheet.setColumnWidth(1, 60); // No.
    librarySheet.setColumnWidth(2, 200); // プロンプト（💡 改善要求: 結合プロンプトと同じ200px）
    librarySheet.setColumnWidth(3, 120); // 画像（🔥 書式問題修正：画像表示最適化）
    librarySheet.setColumnWidth(4, 70); // 比率
    librarySheet.setColumnWidth(5, 120); // 日時
    librarySheet.setColumnWidth(6, 90); // ステータス
    librarySheet.setColumnWidth(7, 50); // 元行
    librarySheet.setColumnWidth(8, 50); // チェックボックス

    // 🔥 C列（画像列）の書式問題を根本修正 - 強制的な書式整備
    const imageColumnRange = librarySheet.getRange(1, 3, 1000, 1); // C列全体

    // 画像列の完全な書式リセット
    imageColumnRange.clearFormat(); // 既存書式を完全クリア
    imageColumnRange.clearContent(); // 既存内容も完全クリア

    // 画像表示に最適化された書式を強制設定
    imageColumnRange.setNumberFormat("General"); // 一般形式（IMAGE関数に最適）
    imageColumnRange.setWrap(false); // 折り返し無効
    imageColumnRange.setHorizontalAlignment("center");
    imageColumnRange.setVerticalAlignment("middle");

    // セルの保護と表示設定
    imageColumnRange.setBackground("#ffffff"); // 背景を明示的に白に設定
    imageColumnRange.setBorder(
      true,
      true,
      true,
      true,
      false,
      false,
      "#e0e0e0",
      SpreadsheetApp.BorderStyle.SOLID
    );

    console.log("🔥 C列（画像列）強制書式整備完了");

    // デフォルト行の高さを画像表示に最適化 - より大きく設定
    librarySheet.setRowHeights(4, 997, 120); // 4行目以降を画像表示により適した高さに

    // ヘッダー行の高さ
    librarySheet.setRowHeight(1, 45);

    // 空白行（2行目）を追加
    librarySheet.setRowHeight(2, 10);

    // 💡 改善要求: 使用説明を改善（リセット対応）
    const instructionRow = 3;
    const instructionRange = librarySheet.getRange(
      instructionRow,
      1,
      1,
      headers.length
    );
    instructionRange.merge();
    instructionRange.setValue(
      "📚 画像生成ライブラリ - 全ての生成記録を自動保存\n\n" +
        "🔹 画像が生成される度に自動でここに記録されます\n" +
        "🔹 プロンプト、画像、生成日時などを一覧で確認できます\n" +
        "🔹 H列のチェックボックスで選択してダウンロード可能\n" +
        "🔹 サイドバーの「📚 ライブラリ管理」で操作できます"
    );
    instructionRange.setBackground("#e8f5e8"); // 💡 改善要求: 明るい緑色に変更
    instructionRange.setFontWeight("bold");
    instructionRange.setFontColor("#2e7d32"); // 💡 改善要求: 緑系の文字色
    instructionRange.setFontSize(10); // 💡 改善要求: フォントサイズを小さく
    instructionRange.setWrap(true);
    instructionRange.setVerticalAlignment("top");
    instructionRange.setBorder(
      true,
      true,
      true,
      true,
      false,
      false,
      "#4caf50",
      SpreadsheetApp.BorderStyle.SOLID
    );
    librarySheet.setRowHeight(instructionRow, 90);

    // シートタブの色を設定
    librarySheet.setTabColor("#4caf50");

    console.log("✅ 空白の画像生成ライブラリシートを作成しました");
    return librarySheet;
  } catch (error) {
    console.error("空白ライブラリシート作成エラー:", error);
    throw new Error(
      `空白ライブラリシートの作成に失敗しました: ${error.message}`
    );
  }
}

/**
 * シートにデータが存在するかチェック（緊急修正版）
 */
function checkForAnyData() {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();

    console.log(`📊 シート状態チェック: ${lastRow}行 × ${lastCol}列`);

    // 1行目のみ、または空の場合はデータなし
    if (lastRow <= 1 && lastCol <= 1) {
      console.log("📄 データなし: 空のシート");
      return false;
    }

    // 2行目以降にデータがあるかチェック
    if (lastRow >= 2) {
      // B列（プロンプト列）をチェック
      const promptRange = sheet.getRange(2, 2, Math.min(lastRow - 1, 100), 1);
      const promptValues = promptRange.getValues();

      for (let i = 0; i < promptValues.length; i++) {
        const cellValue = promptValues[i][0];
        if (
          cellValue &&
          typeof cellValue === "string" &&
          cellValue.trim() !== ""
        ) {
          console.log(`📝 プロンプトデータ検出: 行${i + 2}`);
          return true;
        }
      }

      // E列（画像列）をチェック
      const imageRange = sheet.getRange(2, 5, Math.min(lastRow - 1, 100), 1);
      const imageFormulas = imageRange.getFormulas();

      for (let i = 0; i < imageFormulas.length; i++) {
        const formula = imageFormulas[i][0];
        if (formula && formula.includes("=IMAGE(")) {
          console.log(`🖼️ 画像データ検出: 行${i + 2}`);
          return true;
        }
      }
    }

    console.log("📄 有効なデータなし");
    return false;
  } catch (error) {
    console.error("データ検出エラー:", error);
    // エラーの場合は安全側に倒してデータありとする
    return true;
  }
}

/**
 * 🔍 ライブラリシート画像表示問題の詳細診断機能
 */
function diagnoseLibraryImageIssues() {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const librarySheet = spreadsheet.getSheetByName("画像生成ライブラリ");

    if (!librarySheet) {
      return "❌ ライブラリシートが見つかりません";
    }

    const lastRow = librarySheet.getLastRow();
    console.log(`🔍 ライブラリシート診断開始: 最終行 ${lastRow}`);

    const diagnostics = [];
    diagnostics.push("🔍 ライブラリシート画像表示診断レポート");
    diagnostics.push("=".repeat(50));

    // 基本情報
    diagnostics.push(`📊 シート名: ${librarySheet.getName()}`);
    diagnostics.push(`📊 最終行: ${lastRow}`);
    diagnostics.push(`📊 最終列: ${librarySheet.getLastColumn()}`);

    // C列（画像列）の詳細分析
    if (lastRow >= 4) {
      for (let row = 4; row <= Math.min(lastRow, 8); row++) {
        // 最大5行分診断
        const imageCell = librarySheet.getRange(row, 3);
        const cellA1 = imageCell.getA1Notation();

        diagnostics.push(`\n🔍 行${row} (${cellA1}) の診断:`);

        // セルの基本情報
        const cellValue = imageCell.getValue();
        const cellFormula = imageCell.getFormula();
        const cellNote = imageCell.getNote();

        diagnostics.push(`  📄 値: ${cellValue || "空"}`);
        diagnostics.push(`  📄 フォーミュラ: ${cellFormula || "なし"}`);
        diagnostics.push(`  📄 ノート: ${cellNote || "なし"}`);

        // 書式情報
        const numberFormat = imageCell.getNumberFormat();
        const background = imageCell.getBackground();
        const fontColor = imageCell.getFontColor();
        const wrap = imageCell.getWrap();
        const hAlign = imageCell.getHorizontalAlignment();
        const vAlign = imageCell.getVerticalAlignment();

        diagnostics.push(`  🎨 書式: ${numberFormat}`);
        diagnostics.push(`  🎨 背景色: ${background}`);
        diagnostics.push(`  🎨 文字色: ${fontColor}`);
        diagnostics.push(`  🎨 折り返し: ${wrap}`);
        diagnostics.push(`  🎨 水平配置: ${hAlign}`);
        diagnostics.push(`  🎨 垂直配置: ${vAlign}`);

        // サイズ情報
        const rowHeight = librarySheet.getRowHeight(row);
        const colWidth = librarySheet.getColumnWidth(3);

        diagnostics.push(`  📐 行の高さ: ${rowHeight}px`);
        diagnostics.push(`  📐 列の幅: ${colWidth}px`);

        // IMAGE関数の詳細分析
        if (cellFormula && cellFormula.includes("=IMAGE(")) {
          try {
            // URLを抽出
            const urlMatch = cellFormula.match(/=IMAGE\("([^"]+)"/);
            if (urlMatch && urlMatch[1]) {
              const imageUrl = urlMatch[1];
              diagnostics.push(
                `  🔗 画像URL: ${imageUrl.substring(0, 100)}...`
              );
              diagnostics.push(
                `  🔗 URL形式: ${
                  imageUrl.startsWith("http")
                    ? "HTTP"
                    : imageUrl.startsWith("data:")
                    ? "DATA"
                    : "不明"
                }`
              );
            }
          } catch (urlError) {
            diagnostics.push(`  ❌ URL解析エラー: ${urlError.message}`);
          }
        }

        diagnostics.push(
          `  ${
            cellFormula && cellFormula.includes("=IMAGE(") ? "✅" : "❌"
          } IMAGE関数存在`
        );
        diagnostics.push(`  ${cellValue ? "✅" : "❌"} セル値存在`);
      }
    }

    // C列全体の設定確認
    diagnostics.push(`\n🔍 C列全体の設定:`);
    const columnRange = librarySheet.getRange(1, 3, 10, 1);
    const columnFormats = columnRange.getNumberFormats();
    const columnBackgrounds = columnRange.getBackgrounds();

    diagnostics.push(
      `  📊 書式パターン数: ${new Set(columnFormats.flat()).size}`
    );
    diagnostics.push(
      `  📊 背景色パターン数: ${new Set(columnBackgrounds.flat()).size}`
    );

    const report = diagnostics.join("\n");
    console.log(report);

    return report;
  } catch (error) {
    console.error("🚨 診断エラー:", error);
    return `❌ 診断中にエラーが発生しました: ${error.message}`;
  }
}

/**
 * 🔥 ライブラリ管理改善：入力シートでの混乱を解決するための新機能群
 */

/**
 * 現在のシートがライブラリシートかどうかを判定
 */
function isCurrentSheetLibrary() {
  try {
    const currentSheet = SpreadsheetApp.getActiveSheet();
    const isLibrary = currentSheet.getName() === "画像生成ライブラリ";
    console.log(
      `🔍 現在のシート: ${currentSheet.getName()}, ライブラリシート: ${isLibrary}`
    );
    return isLibrary;
  } catch (error) {
    console.error("シート判定エラー:", error);
    return false;
  }
}

/**
 * ライブラリシートに移動
 */
function switchToLibrarySheet() {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    let librarySheet = spreadsheet.getSheetByName("画像生成ライブラリ");

    if (!librarySheet) {
      // ライブラリシートが存在しない場合は作成
      librarySheet = createEmptyLibrarySheet();
      console.log("🆕 ライブラリシートを新規作成しました");
    }

    // ライブラリシートをアクティブにする
    spreadsheet.setActiveSheet(librarySheet);
    console.log("📚 ライブラリシートに移動完了");
    return true;
  } catch (error) {
    console.error("ライブラリシート移動エラー:", error);
    throw new Error(`ライブラリシートへの移動に失敗しました: ${error.message}`);
  }
}

/**
 * ライブラリシートに移動してから全選択を実行
 */
function switchToLibraryAndToggleSelection() {
  try {
    switchToLibrarySheet();
    return toggleAllLibrarySelection();
  } catch (error) {
    console.error("ライブラリ移動＆全選択エラー:", error);
    throw new Error(`ライブラリ移動＆全選択に失敗しました: ${error.message}`);
  }
}

/**
 * ライブラリシートに移動してからダウンロードを実行
 */
function switchToLibraryAndDownload() {
  try {
    switchToLibrarySheet();
    return downloadSelectedLibraryImages();
  } catch (error) {
    console.error("ライブラリ移動＆ダウンロードエラー:", error);
    throw new Error(
      `ライブラリ移動＆ダウンロードに失敗しました: ${error.message}`
    );
  }
}

/**
 * シート状態を取得（改良版）
 */
function getSheetState() {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();
    const lastRow = sheet.getLastRow();

    if (lastRow < 2) {
      return { isEmpty: true, hasPrompt: false, hasImages: false };
    }

    let hasPrompt = false;
    let hasImages = false;

    // プロンプトチェック（B列）
    const promptRange = sheet.getRange(2, 2, Math.min(lastRow - 1, 100), 1);
    const promptValues = promptRange.getValues();

    for (let i = 0; i < promptValues.length; i++) {
      const cellValue = promptValues[i][0];
      if (
        cellValue &&
        typeof cellValue === "string" &&
        cellValue.trim() !== ""
      ) {
        hasPrompt = true;
        break;
      }
    }

    // 画像チェック（E列）
    const imageRange = sheet.getRange(2, 5, Math.min(lastRow - 1, 100), 1);
    const imageFormulas = imageRange.getFormulas();

    for (let i = 0; i < imageFormulas.length; i++) {
      const formula = imageFormulas[i][0];
      if (formula && formula.includes("=IMAGE(")) {
        hasImages = true;
        break;
      }
    }

    const isEmpty = !hasPrompt && !hasImages;

    console.log(
      `📊 シート状態: empty=${isEmpty}, prompt=${hasPrompt}, images=${hasImages}`
    );
    return { isEmpty, hasPrompt, hasImages };
  } catch (error) {
    console.error("シート状態取得エラー:", error);
    return { isEmpty: true, hasPrompt: false, hasImages: false };
  }
}

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
    .addItem("🔧 表を初期化", "initialSetup")
    .addSeparator()
    .addItem("💾 バックアップ作成", "createBackupAndNewTable")
    .addItem("🧹 シートを完全クリア", "clearSheetMenu")
    .addSeparator()
    .addItem("🔐 権限承認を実行", "forcePermissionRequest")
    .addSeparator()
    .addItem("⚙️ 設定を確認", "checkSettings")
    .addToUi();

  // サイドバーを自動で表示（権限チェック付き）
  try {
    Utilities.sleep(100); // 100ms待機で確実な表示

    // 初回使用時は簡潔な使い方を表示
    if (isFirstTimeUser()) {
      console.log("💡 初回使用者: 使い方ガイドを表示します");
      showUsageGuide();
    } else {
      showSidebar();
      console.log("✅ サイドバーを自動表示しました");
    }
  } catch (error) {
    console.log("⚠️ サイドバーの自動表示をスキップ:", error.message);
    // 権限エラーの場合は使い方ガイドを表示
    if (
      error.message.includes("container.ui") ||
      error.message.includes("permissions")
    ) {
      showUsageGuide();
    }
  }
}

/**
 * 初期セットアップ（プロンプト入力エリアを作成）- 常時表示版
 */
function initialSetup() {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();
    const ui = SpreadsheetApp.getUi();

    // シートにデータがあるかチェック
    const hasData = checkForAnyData();

    let setupOption;

    if (hasData) {
      // データがある場合：シンプルな選択
      const response = ui.alert(
        "⚠️ 既存データが検出されました",
        "🔄 バックアップを取って新規作成しますか？\n\n" +
          "✅ はい → 既存データを別シートに保存してから新規作成\n" +
          "❌ いいえ → データを削除して新規作成",
        ui.ButtonSet.YES_NO
      );

      if (response === ui.Button.YES) {
        setupOption = "backup"; // バックアップを取って新規作成
      } else {
        setupOption = "clear"; // 完全クリアして新規作成
      }
    } else {
      // 空のシートの場合も常に実行（確認なし）
      setupOption = "new";
    }

    // セットアップ実行
    return executeSetup(setupOption);
  } catch (error) {
    console.error("表初期化エラー:", error);

    // エラーが発生しても初期化を実行（常に機能させる）
    try {
      return createStructuredTable();
    } catch (fallbackError) {
      console.error("フォールバック初期化エラー:", fallbackError);
      throw new Error(`表の初期化に失敗しました: ${error.message}`);
    }
  }
}

/**
 * サイドバーを表示（シンプル版）
 */
function showSidebar() {
  try {
    // 直接サイドバーを開く（権限エラーが出たら後で処理）
    const html = HtmlService.createHtmlOutputFromFile("Sidebar")
      .setTitle("🎨 DALL-E 画像生成ツール")
      .setWidth(500);
    SpreadsheetApp.getUi().showSidebar(html);

    // 成功したら権限承認済みとして記録
    markPermissionGranted();
  } catch (error) {
    // 権限エラーの場合のみ、サイレント承認を試行
    if (
      error.message.includes("container.ui") ||
      error.message.includes("permissions")
    ) {
      try {
        // サイレント権限承認を試行
        forcePermissionRequest();
        markPermissionGranted();
      } catch (permissionError) {
        // 最後の手段：詳細な開始手順
        SpreadsheetApp.getUi().alert(
          "🚀 ツール開始手順",
          "以下の手順でサイドバーを開いてください：\n\n" +
            "1️⃣ 画面上部のメニューバーから「🎨 画像ツール」をクリック\n" +
            "2️⃣ ドロップダウンメニューから「📱 サイドバーを開く」を選択\n" +
            "3️⃣ 右側にサイドバーが表示されます\n\n" +
            "💡 サイドバーが表示されない場合は、ブラウザをリロードしてから再度お試しください。",
          SpreadsheetApp.getUi().ButtonSet.OK
        );
      }
    } else {
      SpreadsheetApp.getUi().alert(
        "エラー",
        "サイドバーの表示に失敗しました: " + error.message,
        SpreadsheetApp.getUi().ButtonSet.OK
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
 */
function analyzePromptForOptimalSettings(prompt) {
  // サイズ判定のみ（最小限の解析）
  const sizeAnalysis = {
    portrait: /(portrait|vertical|縦|人物|顔|9:16|縦長|ポートレート)/i.test(
      prompt
    ),
    landscape:
      /(landscape|horizontal|横|風景|panorama|16:9|横長|ランドスケープ|wide|panoramic|パノラマ|ワイド)/i.test(
        prompt
      ),
  };

  // 🔥 GPT-Image-1の新サイズオプション復活
  let selectedSize = "1024x1024"; // デフォルト（正方形）

  if (sizeAnalysis.portrait) {
    selectedSize = "1024x1536"; // 縦長（GPT-Image-1対応）
  } else if (sizeAnalysis.landscape) {
    selectedSize = "1536x1024"; // 横長（GPT-Image-1対応）
  }

  // スタイル判定は削除（GPT-Image-1はstyleパラメータなし）
  console.log(`GPT-Image-1サイズ判定結果: size=${selectedSize}`);
  return { size: selectedSize };
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
 * DALL-E APIを使って画像を生成
 */
function generateImages(prompts) {
  if (!prompts || prompts.length === 0) {
    throw new Error("プロンプトが指定されていません");
  }

  const apiKey = getOpenAIApiKey();
  const results = [];
  const errors = [];

  try {
    prompts.forEach((prompt, index) => {
      // スタイル・サイズ判定をtryブロックの外で実行（catchブロックからもアクセス可能）
      const { size: selectedSize } = analyzePromptForOptimalSettings(prompt);

      try {
        console.log(`画像生成中 ${index + 1}/${prompts.length}: ${prompt}`);

        // 🚨 プロンプト完全無改変の実現
        // ユーザーのプロンプトを一切改変せずそのまま使用
        // GPT-Image-1の自動改変を防ぐため、パラメーター側で制御
        const finalPrompt = prompt; // ユーザープロンプトを完全にそのまま使用

        // デバッグ用ログ：送信されるプロンプトを確認
        console.log(`ユーザープロンプト（完全無改変）: ${finalPrompt}`);
        console.log(`自動設定パラメーター - サイズ: ${selectedSize}`);

        // プロンプト無改変 + テクニック的パラメーター最適化
        const payload = {
          prompt: finalPrompt, // ユーザープロンプトを完全にそのまま使用
          n: 1,
          size: selectedSize, // 自動サイズ判定
          model: "gpt-image-1", // 🔥 最新モデル復活（32,000文字対応）
          quality: "high", // 🔥 最新の品質設定（high/medium/low）
          background: "auto", // 🔥 背景自動最適化（新機能）
          output_format: "png", // 🔥 PNG出力（新機能）
          moderation: "auto", // 🔥 モデレーション自動（新機能）
        };

        // リトライ機能付きAPIリクエスト
        let response;
        let lastError;
        const maxRetries = 3;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            console.log(`画像${index + 1}: 試行${attempt}/${maxRetries}`);

            response = UrlFetchApp.fetch(
              "https://api.openai.com/v1/images/generations",
              {
                method: "POST",
                contentType: "application/json",
                headers: {
                  Authorization: `Bearer ${apiKey}`,
                  "Content-Type": "application/json",
                  // テクニック的最適化ヘッダー設定
                  "User-Agent": "SpreadsheetImageGenerator/2.0",
                  Accept: "application/json",
                  "Accept-Language": "en,ja;q=0.9", // 多言語対応
                },
                payload: JSON.stringify(payload),
                muteHttpExceptions: true, // 詳細なエラー情報を取得
              }
            );

            const responseCode = response.getResponseCode();
            const responseText = response.getContentText();

            if (responseCode === 200) {
              console.log(`画像${index + 1}: 生成成功`);
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

        const data = JSON.parse(response.getContentText());
        if (!data.data || !data.data[0]) {
          throw new Error("画像データの取得に失敗しました");
        }

        // 🔥 GPT-Image-1はbase64レスポンスのみ
        const imageData = data.data[0];
        let imageUrl;

        if (imageData.b64_json) {
          // base64データをData URLに変換
          imageUrl = `data:image/png;base64,${imageData.b64_json}`;
        } else if (imageData.url) {
          // 従来のURL形式（フォールバック）
          imageUrl = imageData.url;
        } else {
          throw new Error("画像データの形式が不正です");
        }

        // 🔍 GPT-Image-1の内部処理を監視（ユーザー情報提供用）
        const revisedPrompt = imageData.revised_prompt;
        if (revisedPrompt) {
          console.log(`📝 ユーザー入力プロンプト: ${prompt}`);
          console.log(`🤖 GPT-Image-1内部処理版: ${revisedPrompt}`);

          // 改変度合いを分析
          const originalLength = prompt.length;
          const revisedLength = revisedPrompt.length;
          const lengthDiff = Math.abs(revisedLength - originalLength);
          const changeRatio = (lengthDiff / originalLength) * 100;

          console.log(
            `📊 内部処理変更度: ${changeRatio.toFixed(
              1
            )}% (${lengthDiff}文字差)`
          );

          // 情報提供としての分析
          if (changeRatio > 50) {
            console.log(
              `📈 GPT-Image-1が大幅に内部処理を行いました: ${changeRatio.toFixed(
                1
              )}%`
            );
          } else if (changeRatio > 20) {
            console.log(`📊 GPT-Image-1が中程度の内部処理を行いました`);
          } else {
            console.log(`✅ GPT-Image-1の内部処理は最小限でした`);
          }
        }

        results.push({
          prompt: prompt,
          url: imageUrl,
          size: selectedSize, // 画像サイズ情報を追加
          revised_prompt: revisedPrompt || finalPrompt, // 実際に使用されたプロンプト
          original_prompt: prompt, // 元のプロンプトも保存
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
          prompt: prompt.substring(0, 50) + "...",
          error: imageError.message,
        });

        // エラーでも結果に追加（エラー情報付き）
        results.push({
          prompt: prompt,
          url: null,
          size: selectedSize,
          error: imageError.message,
          original_prompt: prompt,
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
          promptCell.setWrap(false); // 折り返しを無効化
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
 * B列のプロンプトを検出して画像生成（9列構造対応）
 */
function generateImagesFromStructuredTable() {
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

        console.log(
          `行${actualRow}: 完全プロンプト取得: ${fullPrompt.substring(
            0,
            50
          )}...`
        );

        validPrompts.push(fullPrompt);
        promptRows.push(actualRow);
      }
    });

    if (validPrompts.length === 0) {
      throw new Error(
        "有効なプロンプトが見つかりません。B列にプロンプトを入力してください。"
      );
    }

    console.log(`${validPrompts.length}個のプロンプトを検出しました`);

    // 画像を生成
    const imageResults = generateImages(validPrompts);

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
        // 失敗した画像の処理
        const imageCell = sheet.getRange(row, 5); // E列：画像
        imageCell.setValue("❌ 生成失敗");
        imageCell.setHorizontalAlignment("center");
        imageCell.setVerticalAlignment("middle");
        imageCell.setFontWeight("bold");
        imageCell.setFontColor("#d32f2f");
        imageCell.setBackground("#ffebee");
        // エラーメッセージ
        const maxErrorLength = 5000;
        let errorMessage = `エラー詳細:\n${result.error}\n\n再生成するには、この行を選択して「🔄 再生成」ボタンをクリックしてください。`;
        if (errorMessage.length > maxErrorLength) {
          errorMessage =
            errorMessage.substring(0, maxErrorLength - 100) +
            "\n[エラーメッセージが長すぎるため省略...]";
        }
        imageCell.setNote(errorMessage);

        // F列: エラー表示
        const ratioCell = sheet.getRange(row, 6);
        ratioCell.setValue("エラー");
        ratioCell.setHorizontalAlignment("center");
        ratioCell.setVerticalAlignment("middle");
        ratioCell.setFontWeight("bold");
        ratioCell.setFontColor("#d32f2f");
        ratioCell.setBackground("#ffebee");

        // G列: 生成日時
        const timeCell = sheet.getRange(row, 7);
        timeCell.setValue(currentTime);
        timeCell.setHorizontalAlignment("center");
        timeCell.setVerticalAlignment("middle");
        timeCell.setFontSize(9);
        timeCell.setBackground("#ffebee");

        // H列: ステータス
        const statusCell = sheet.getRange(row, 8);
        statusCell.setValue("❌ 生成失敗");
        statusCell.setHorizontalAlignment("center");
        statusCell.setVerticalAlignment("middle");
        statusCell.setFontWeight("bold");
        statusCell.setFontColor("#d32f2f");
        statusCell.setBackground("#ffebee");
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
        ratioCell.setBackground("#e8f5e8");

        // G列: 生成日時
        const timeCell = sheet.getRange(row, 7);
        timeCell.setValue(currentTime);
        timeCell.setHorizontalAlignment("center");
        timeCell.setVerticalAlignment("middle");
        timeCell.setFontSize(9);
        timeCell.setBackground("#f5f5f5");

        // H列: ステータス
        const statusCell = sheet.getRange(row, 8);
        statusCell.setValue("✅ GPT-Image-1");
        statusCell.setHorizontalAlignment("center");
        statusCell.setVerticalAlignment("middle");
        statusCell.setFontWeight("bold");
        statusCell.setFontColor("#2e7d32");
        statusCell.setBackground("#e8f5e8");
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

      // 行の高さを画像に合わせて調整（固定）
      sheet.setRowHeight(row, 180);

      processedCount++;
    });

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
 */
function toggleAllImageSelection() {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();
    const lastRow = sheet.getLastRow();

    if (lastRow < 2) {
      return "❌ データがありません";
    }

    // I列（チェックボックス列）のチェック状態を確認
    const checkboxRange = sheet.getRange(2, 9, lastRow - 1, 1);
    const checkboxValues = checkboxRange.getValues();

    // 現在の状態を確認（true の数を数える）
    const checkedCount = checkboxValues
      .flat()
      .filter((value) => value === true).length;
    const totalCount = checkboxValues.length;

    // 過半数がチェックされていれば全解除、そうでなければ全選択
    const shouldCheck = checkedCount < totalCount / 2;

    // 画像が存在する行のみ対象とする
    for (let i = 2; i <= lastRow; i++) {
      const imageCell = sheet.getRange(i, 5); // E列（画像列）
      const imageFormula = imageCell.getFormula();

      if (imageFormula && imageFormula.includes("=IMAGE(")) {
        const checkboxCell = sheet.getRange(i, 9);
        checkboxCell.setValue(shouldCheck);
      }
    }

    const action = shouldCheck ? "選択" : "解除";
    return `✅ 全画像を${action}しました`;
  } catch (error) {
    console.error("全選択/解除エラー:", error);
    throw new Error(`全選択/解除に失敗しました: ${error.message}`);
  }
}

/**
 * 選択された画像をダウンロード（9列構造対応）
 */
function downloadSelectedImages() {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();
    const lastRow = sheet.getLastRow();

    if (lastRow < 2) {
      return "❌ データがありません";
    }

    const selectedImages = [];
    let downloadCount = 0;

    // チェックされた行を検索
    for (let i = 2; i <= lastRow; i++) {
      const checkboxCell = sheet.getRange(i, 9); // I列（チェックボックス）
      const isChecked = checkboxCell.getValue();

      if (isChecked === true) {
        const imageCell = sheet.getRange(i, 5); // E列（画像列）
        const imageFormula = imageCell.getFormula();

        if (imageFormula && imageFormula.includes("=IMAGE(")) {
          // IMAGE関数からURLを抽出
          const urlMatch = imageFormula.match(/=IMAGE\("([^"]+)"/);
          if (urlMatch && urlMatch[1]) {
            // 完全なプロンプトを取得（省略表示対応）
            const fullPrompt = getFullPrompt(sheet, i);
            const prompt = fullPrompt || `画像_${i}`;

            selectedImages.push({
              url: urlMatch[1],
              filename: `${prompt
                .substring(0, 50)
                .replace(/[^\w\s-]/g, "")}_${i}.png`,
              row: i,
            });
          }
        }
      }
    }

    if (selectedImages.length === 0) {
      return "❌ 選択された画像がありません。チェックボックスを選択してください。";
    }

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

    let message = `✅ ${downloadCount}枚の画像をダウンロードしました！\n`;
    message += `Google Driveの「DALL-E画像ダウンロード」フォルダを確認してください。`;
    if (linkList.length > 0) {
      message += `\n\n🔗 ダウンロードリンク:\n${linkList.join("\n")}`;
    }
    return message;
  } catch (error) {
    console.error("画像ダウンロードエラー:", error);
    throw new Error(`画像ダウンロードに失敗しました: ${error.message}`);
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

    // チェックされた行のプロンプトを収集
    for (let i = 2; i <= lastRow; i++) {
      const checkboxCell = sheet.getRange(i, 9); // I列（チェックボックス）
      const isChecked = checkboxCell.getValue();

      if (isChecked === true) {
        // 完全なプロンプトを取得（省略表示対応）
        const fullPrompt = getFullPrompt(sheet, i);

        if (fullPrompt && fullPrompt.trim() !== "") {
          selectedPrompts.push(fullPrompt.trim());
          selectedRows.push(i);
        }
      }
    }

    if (selectedPrompts.length === 0) {
      return "❌ 選択された有効なプロンプトがありません。チェックボックスを選択してください。";
    }

    console.log(
      `${selectedPrompts.length}個の選択されたプロンプトを再生成します`
    );

    // 選択された行のステータスを「再生成中」に更新
    selectedRows.forEach((row) => {
      const statusCell = sheet.getRange(row, 7); // G列（ステータス）
      statusCell.setValue("🔄 再生成中");
      statusCell.setBackground("#fff3e0");
      statusCell.setFontColor("#ef6c00");
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
 * シート保護機能付き画像生成（プログレスバー対応）
 */
function generateImagesFromStructuredTableWithProgress() {
  let protection = null;
  try {
    const sheet = SpreadsheetApp.getActiveSheet();

    // シートを保護（編集禁止）
    console.log("シートを保護します");
    protection = sheet.protect().setDescription("画像生成中 - 編集禁止");
    protection.setWarningOnly(false);

    // 画像生成処理を実行
    const result = generateImagesFromStructuredTable();

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
        // 進捗を通知（将来的にリアルタイム更新に使用）
        const progress = Math.round((completedSteps / totalSteps) * 100);
        console.log(
          `画像生成進捗: ${progress}% (${completedSteps + 1}/${totalSteps})`
        );

        // 個別画像生成
        const imageResult = generateImages([prompt]);
        results.push(...imageResult);

        completedSteps++;
      } catch (imageError) {
        console.error(`画像${index + 1}の生成エラー:`, imageError);
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
    const range = e.range;
    const sheet = range.getSheet();
    const row = range.getRow();
    const col = range.getColumn();

    // メインシートでの編集のみ処理（共通プロンプト設定シートは除外）
    if (sheet.getName() === "共通プロンプト設定") {
      // 共通プロンプト設定シートが編集された場合、ドロップダウンを更新
      try {
        setupCommonPromptValidation();
        console.log(
          "共通プロンプト設定変更により、ドロップダウンを更新しました"
        );
      } catch (error) {
        console.error("ドロップダウン更新エラー:", error);
      }
      return;
    }

    // B列（個別プロンプト）またはC列（共通プロンプト選択）の編集をチェック
    if ((col === 2 || col === 3) && row >= 2) {
      if (col === 2) {
        // B列（個別プロンプト）の編集
        const promptValue = range.getValue();
        if (
          promptValue &&
          typeof promptValue === "string" &&
          promptValue.trim() !== ""
        ) {
          handleIndividualPromptInput(sheet, row, promptValue.trim());
        }
      }

      if (col === 2 || col === 3) {
        // B列またはC列の編集時、結合プロンプトを更新
        updateCombinedPrompt(sheet, row);
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
    promptCell.setWrap(false); // 縦伸びを防止
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

    ui.alert(
      "✅ 権限承認完了",
      "すべての権限が正常に承認されました！\n\n" +
        "🚀 次の手順でツールを開始してください：\n" +
        "1️⃣ メニューバーの「🎨 画像ツール」をクリック\n" +
        "2️⃣ 「📱 サイドバーを開く」を選択\n" +
        "3️⃣ サイドバーが表示されたら使用開始！\n\n" +
        "💡 サイドバーからすべての機能にアクセスできます。",
      ui.ButtonSet.OK
    );

    return "✅ 権限承認が完了しました";
  } catch (error) {
    console.error("権限承認エラー:", error);

    SpreadsheetApp.getUi().alert(
      "🔐 権限承認が必要です",
      "以下の手順で権限を承認してください：\n\n" +
        "1️⃣ 表示されるダイアログで「許可を確認」をクリック\n" +
        "2️⃣ Googleアカウントを選択\n" +
        "3️⃣ 「安全ではないアプリ」の警告が出た場合：\n" +
        "   ・「詳細」をクリック\n" +
        "   ・「〜に移動（安全ではないページ）」をクリック\n" +
        "4️⃣ 「許可」をクリック\n\n" +
        "✅ 権限承認後の開始手順：\n" +
        "📋 メニューから「🎨 画像ツール」→「📱 サイドバーを開く」\n\n" +
        "エラー詳細: " +
        error.message,
      SpreadsheetApp.getUi().ButtonSet.OK
    );

    throw error; // エラーを再スローして権限ダイアログを表示
  }
}

/**
 * シートを完全クリア（メニューから呼び出し）
 */
function clearSheetMenu() {
  try {
    const ui = SpreadsheetApp.getUi();
    const response = ui.alert(
      "⚠️ シート完全クリア",
      "シート内のすべてのデータを削除します。\n\n" +
        "🗑️ 削除される内容：\n" +
        "• すべてのテキストデータ\n" +
        "• すべての画像\n" +
        "• セルの書式設定\n" +
        "• セルのコメント\n\n" +
        "⚠️ この操作は取り消せません。\n" +
        "💾 重要なデータがある場合は、事前にバックアップを取ることをお勧めします。\n\n" +
        "本当に削除しますか？",
      ui.ButtonSet.YES_NO
    );

    if (response === ui.Button.YES) {
      // 確認のダブルチェック
      const confirmResponse = ui.alert(
        "🚨 最終確認",
        "シートのすべてのデータが完全に削除されます。\n\n" +
          "本当によろしいですか？",
        ui.ButtonSet.YES_NO
      );

      if (confirmResponse === ui.Button.YES) {
        clearAllData();
        ui.alert(
          "✅ クリア完了",
          "シートが完全にクリアされました。\n\n" +
            "🚀 新しく作業を開始するには：\n" +
            "1️⃣ 「🔧 初期セットアップ」を実行\n" +
            "2️⃣ サイドバーから画像生成を開始",
          ui.ButtonSet.OK
        );
        return "✅ シートを完全にクリアしました";
      } else {
        return "クリア操作をキャンセルしました";
      }
    } else {
      return "クリア操作をキャンセルしました";
    }
  } catch (error) {
    console.error("シートクリアエラー:", error);
    SpreadsheetApp.getUi().alert(
      "エラー",
      "シートのクリアに失敗しました: " + error.message,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    throw error;
  }
}

/**
 * シートのすべてのデータを削除（内部関数）
 */
function clearAllData() {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();

    // 1. シート全体をクリア
    sheet.clear();

    // 2. 画像も含めてすべてのコンテンツを削除
    sheet.clearContents();
    sheet.clearFormats();
    sheet.clearNotes();

    // 3. 行と列のサイズをリセット
    const maxRows = sheet.getMaxRows();
    const maxCols = sheet.getMaxColumns();

    // デフォルトサイズに戻す
    if (maxRows > 1000) {
      sheet.deleteRows(1001, maxRows - 1000);
    }
    if (maxCols > 26) {
      sheet.deleteColumns(27, maxCols - 26);
    }

    // 4. 行の高さと列の幅をデフォルトに戻す
    sheet.setRowHeights(1, sheet.getMaxRows(), 21);
    sheet.setColumnWidths(1, sheet.getMaxColumns(), 100);

    // 5. フリーズした行・列を解除
    sheet.setFrozenRows(0);
    sheet.setFrozenColumns(0);

    console.log("✅ シートが完全にクリアされました");
    return true;
  } catch (error) {
    console.error("データクリアエラー:", error);
    throw new Error("データの削除に失敗しました: " + error.message);
  }
}

/**
 * バックアップを作成して新しいテーブルを作成
 */
function createBackupAndNewTable() {
  try {
    const ui = SpreadsheetApp.getUi();
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const currentSheet = spreadsheet.getActiveSheet();

    // データがあるかチェック
    const hasData = checkForAnyData();

    if (!hasData) {
      ui.alert(
        "📝 データなし",
        "バックアップするデータがありません。\n\n" +
          "🚀 「🔧 初期セットアップ」から新しいテーブルを作成してください。",
        ui.ButtonSet.OK
      );
      return "バックアップするデータがありません";
    }

    const response = ui.alert(
      "💾 バックアップ作成",
      "現在のデータをバックアップして新しいテーブルを作成します。\n\n" +
        "📋 実行内容：\n" +
        "1️⃣ 現在のシートを「Backup_日付」として複製\n" +
        "2️⃣ 現在のシートをクリア\n" +
        "3️⃣ 新しい構造化テーブルを作成\n\n" +
        "続行しますか？",
      ui.ButtonSet.YES_NO
    );

    if (response === ui.Button.YES) {
      // バックアップシート名を生成
      const now = new Date();
      const timestamp = Utilities.formatDate(
        now,
        Session.getScriptTimeZone(),
        "yyyy-MM-dd_HH-mm"
      );
      const backupName = `Backup_${timestamp}`;

      // 現在のシートを複製してバックアップを作成
      const backupSheet = currentSheet.copyTo(spreadsheet);
      backupSheet.setName(backupName);

      // 現在のシートをクリア
      clearAllData();

      // 新しい構造化テーブルを作成
      const result = createStructuredTable();

      ui.alert(
        "✅ バックアップ完了",
        `バックアップが正常に作成されました！\n\n` +
          `💾 バックアップシート: 「${backupName}」\n` +
          `🆕 現在のシート: 新しい構造化テーブル\n\n` +
          `🚀 B列にプロンプトを入力して画像生成を開始できます。`,
        ui.ButtonSet.OK
      );

      return `✅ バックアップ「${backupName}」を作成し、新しいテーブルを設定しました`;
    } else {
      return "バックアップ作成をキャンセルしました";
    }
  } catch (error) {
    console.error("バックアップ作成エラー:", error);
    SpreadsheetApp.getUi().alert(
      "エラー",
      "バックアップの作成に失敗しました: " + error.message,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    throw error;
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
      "✅ ステータス", // H列: ステータス
      "☑️ 選択", // I列: チェックボックス
    ];

    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setValues([headers]);

    // ヘッダー行のスタイル設定
    headerRange.setBackground("#1a73e8");
    headerRange.setFontColor("white");
    headerRange.setFontWeight("bold");
    headerRange.setHorizontalAlignment("center");
    headerRange.setVerticalAlignment("middle");
    headerRange.setFontSize(12);
    sheet.setRowHeight(1, 45);

    // 列幅の最適化（9列構造）
    sheet.setColumnWidth(1, 60); // A: No.
    sheet.setColumnWidth(2, 250); // B: 個別プロンプト
    sheet.setColumnWidth(3, 150); // C: 共通プロンプト選択
    sheet.setColumnWidth(4, 80); // D: 結合プロンプト（最小化）
    sheet.setColumnWidth(5, 220); // E: 画像
    sheet.setColumnWidth(6, 100); // F: 比率
    sheet.setColumnWidth(7, 140); // G: 日時
    sheet.setColumnWidth(8, 100); // H: ステータス
    sheet.setColumnWidth(9, 80); // I: 選択

    console.log("ヘッダー行と列幅を設定完了");

    // 100行のデータ行を作成（2-101行目）
    for (let i = 1; i <= 100; i++) {
      const row = i + 1;

      try {
        // A列: 番号
        const numberCell = sheet.getRange(row, 1);
        numberCell.setValue(i);
        numberCell.setHorizontalAlignment("center");
        numberCell.setFontWeight("bold");
        numberCell.setBackground("#f8f9fa");

        // B列: 個別プロンプト入力エリア
        const promptCell = sheet.getRange(row, 2);
        promptCell.setWrap(false); // 🔧 UX改善: 縦伸びを防止
        promptCell.setVerticalAlignment("middle");
        promptCell.setFontSize(11);
        promptCell.setPadding(8, 8, 8, 8);
        promptCell.setNote(
          "個別のプロンプトを入力してください。\n💡 長いプロンプトはセルをクリックして全文確認できます。"
        );

        // C列: 共通プロンプト選択（データ検証付きドロップダウン）
        const commonPromptCell = sheet.getRange(row, 3);
        commonPromptCell.setHorizontalAlignment("center");
        commonPromptCell.setVerticalAlignment("middle");
        commonPromptCell.setFontSize(10);
        commonPromptCell.setBackground("#fff3e0");
        commonPromptCell.setNote(
          "タブから共通プロンプトを選択できます。\n💡 新しい共通プロンプトは設定シートで追加可能です。"
        );

        // D列: 結合プロンプト（最小表示）
        const combinedCell = sheet.getRange(row, 4);
        combinedCell.setValue("🔗"); // アイコンのみ表示
        combinedCell.setHorizontalAlignment("center");
        combinedCell.setVerticalAlignment("middle");
        combinedCell.setFontSize(16);
        combinedCell.setBackground("#f0f8ff");
        combinedCell.setNote(
          "個別プロンプト + 共通プロンプトの結合結果がここに表示されます。\n💡 セルをクリックして完全なプロンプトを確認できます。"
        );

        // I列: チェックボックス
        const checkboxCell = sheet.getRange(row, 9);
        checkboxCell.insertCheckboxes();
        checkboxCell.setHorizontalAlignment("center");
        checkboxCell.setVerticalAlignment("middle");

        // 行の高さを固定（UX改善）
        sheet.setRowHeight(row, 50); // 🔧 固定高さでUX改善

        // 境界線を設定
        const rowRange = sheet.getRange(row, 1, 1, headers.length);
        rowRange.setBorder(true, true, true, true, true, true);

        // 10行ごとに薄い区切り線を追加
        if (i % 10 === 0) {
          rowRange.setBackground("#f0f0f0");
          console.log(`${i}行目まで作成完了`);
        }
      } catch (rowError) {
        console.error(`行${row}の作成でエラー:`, rowError);
        // 個別行のエラーは続行
      }
    }

    console.log("100行のテーブル作成完了");

    // 共通プロンプト設定シートを作成
    createCommonPromptSheet();

    // データ検証（ドロップダウン）を設定
    setupCommonPromptValidation();

    // 完了メッセージを下部に追加
    try {
      const messageRow = 103;
      const messageRange = sheet.getRange(messageRow, 1, 1, 9);
      messageRange.merge();
      messageRange.setValue(
        `✨ 共通プロンプト機能付きテーブルを作成しました！B列に個別プロンプト、C列で共通プロンプトを選択してください。`
      );
      messageRange.setBackground("#e8f5e8");
      messageRange.setFontColor("#2e7d32");
      messageRange.setHorizontalAlignment("center");
      messageRange.setFontWeight("bold");
      messageRange.setFontSize(14);
      sheet.setRowHeight(messageRow, 40);

      console.log("完了メッセージを追加しました");
    } catch (messageError) {
      console.error("完了メッセージの追加でエラー:", messageError);
      // メッセージエラーは無視して続行
    }

    console.log(
      `✅ 改善された共通プロンプト設定シートを作成しました（${defaultPrompts.length}個のプロンプト）`
    );
    return "✅ 共通プロンプト機能付きテーブルを作成しました！B列に個別プロンプト、C列で共通プロンプトを選択してください。";
  } catch (error) {
    console.error("構造化テーブル作成エラー:", error);
    throw new Error(`構造化テーブルの作成に失敗しました: ${error.message}`);
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
    let deleteCount = 0;

    // チェックされた行を検索して画像のみ削除
    for (let i = 2; i <= lastRow; i++) {
      const checkboxCell = sheet.getRange(i, 9); // I列（チェックボックス）
      const isChecked = checkboxCell.getValue();

      if (isChecked === true) {
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
      return "❌ 選択された画像がありません。チェックボックスを選択してください。";
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
 * 画像削除の確認ダイアログ付き一括削除
 */
function deleteAllImagesWithConfirmation() {
  try {
    const ui = SpreadsheetApp.getUi();
    const response = ui.alert(
      "🗑️ 画像一括削除",
      "すべての画像を削除します。\n\n" +
        "📋 削除される内容：\n" +
        "• すべての生成済み画像（D列）\n\n" +
        "📝 保持される内容：\n" +
        "• プロンプト（B列・C列）\n" +
        "• 生成日時（F列）\n" +
        "• その他すべてのデータ\n\n" +
        "💡 プロンプトが残っているため、後で再生成可能です。\n\n" +
        "続行しますか？",
      ui.ButtonSet.YES_NO
    );

    if (response === ui.Button.YES) {
      const result = deleteAllImages();

      // 削除後の整理も実行
      cleanupAfterImageDeletion();
      prepareImageRestoration();

      ui.alert(
        "✅ 削除完了",
        result +
          "\n\n" +
          "🔄 プロンプトが保持されているため、\n" +
          "「🎨 画像生成」で再生成が可能です。",
        ui.ButtonSet.OK
      );

      return result;
    } else {
      return "画像削除をキャンセルしました";
    }
  } catch (error) {
    console.error("確認付き画像削除エラー:", error);
    SpreadsheetApp.getUi().alert(
      "エラー",
      "画像削除に失敗しました: " + error.message,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    throw error;
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
        const existingImageCell = sheet.getRange(actualRow, 4); // D列（画像列）
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
 * ブラウザダウンロード用：選択された画像のURLとファイル名を取得
 */
function getSelectedImageUrls() {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();
    const lastRow = sheet.getLastRow();

    if (lastRow < 2) {
      return [];
    }

    const selectedImages = [];

    // チェックされた行を検索
    for (let i = 2; i <= lastRow; i++) {
      const checkboxCell = sheet.getRange(i, 9); // I列（チェックボックス）
      const isChecked = checkboxCell.getValue();

      if (isChecked === true) {
        const imageCell = sheet.getRange(i, 5); // E列（画像列）
        const imageFormula = imageCell.getFormula();

        if (imageFormula && imageFormula.includes("=IMAGE(")) {
          // IMAGE関数からURLを抽出
          const urlMatch = imageFormula.match(/=IMAGE\("([^"]+)"/);
          if (urlMatch && urlMatch[1]) {
            // 完全なプロンプトを取得（省略表示対応）
            const fullPrompt = getFullPrompt(sheet, i);
            const prompt = fullPrompt || `画像_${i}`;

            selectedImages.push({
              url: urlMatch[1],
              filename: `${prompt
                .substring(0, 50)
                .replace(/[^\w\s-]/g, "")}_${i}.png`,
            });
          }
        }
      }
    }

    return selectedImages;
  } catch (error) {
    console.error("選択画像URL取得エラー:", error);
    throw new Error(`選択画像URL取得に失敗しました: ${error.message}`);
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
 * 共通プロンプト設定シートを作成（改善版）
 */
function createCommonPromptSheet() {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

    // 既存の共通プロンプトシートを削除（更新時）
    const existingSheet = spreadsheet.getSheetByName("共通プロンプト設定");
    if (existingSheet) {
      spreadsheet.deleteSheet(existingSheet);
    }

    // 新しい共通プロンプトシートを作成
    const commonSheet = spreadsheet.insertSheet("共通プロンプト設定");

    // ヘッダー設定
    const headers = [
      "カテゴリ",
      "プロンプト名",
      "プロンプト内容",
      "説明",
      "使用頻度",
    ];
    const headerRange = commonSheet.getRange(1, 1, 1, headers.length);
    headerRange.setValues([headers]);
    headerRange.setBackground("#4a90e2");
    headerRange.setFontColor("white");
    headerRange.setFontWeight("bold");
    headerRange.setHorizontalAlignment("center");
    headerRange.setVerticalAlignment("middle");

    // 列幅設定（改善版）
    commonSheet.setColumnWidth(1, 130); // カテゴリ
    commonSheet.setColumnWidth(2, 180); // プロンプト名
    commonSheet.setColumnWidth(3, 450); // プロンプト内容
    commonSheet.setColumnWidth(4, 220); // 説明
    commonSheet.setColumnWidth(5, 100); // 使用頻度

    // 🔥 大幅に拡張されたデフォルト共通プロンプト（実用的で多様）
    const defaultPrompts = [
      // 🎨 スタイル系（拡張）
      [
        "🎨 スタイル",
        "超リアル写真",
        "photorealistic, ultra realistic, professional photography, DSLR camera, sharp focus, perfect lighting",
        "プロカメラマンが撮影したような超高品質写真",
        "★★★★★",
      ],
      [
        "🎨 スタイル",
        "日本アニメ",
        "anime style, manga style, cel shading, vibrant colors, Japanese animation",
        "日本のアニメ・マンガスタイル",
        "★★★★☆",
      ],
      [
        "🎨 スタイル",
        "スタジオジブリ風",
        "Studio Ghibli style, Hayao Miyazaki art style, whimsical, hand-drawn animation",
        "スタジオジブリの温かみのあるアートスタイル",
        "★★★★☆",
      ],
      [
        "🎨 スタイル",
        "油絵クラシック",
        "oil painting, classical art, renaissance style, detailed brushstrokes, museum quality",
        "ルネサンス期の古典絵画風",
        "★★★☆☆",
      ],
      [
        "🎨 スタイル",
        "水彩画",
        "watercolor painting, soft colors, artistic, flowing brushstrokes, paper texture",
        "柔らかな水彩画タッチ",
        "★★★☆☆",
      ],
      [
        "🎨 スタイル",
        "デジタルアート",
        "digital art, concept art, artstation trending, highly detailed, modern digital painting",
        "現代的なデジタルアート",
        "★★★★☆",
      ],
      [
        "🎨 スタイル",
        "ピクサー3D",
        "Pixar style, 3D animation, Disney Pixar, cute characters, colorful, family-friendly",
        "ピクサー映画のような3Dアニメーション",
        "★★★☆☆",
      ],

      // 🌅 環境・背景系（拡張）
      [
        "🌅 環境",
        "黄金の夕日",
        "beautiful golden sunset, golden hour lighting, warm orange and pink sky, cinematic lighting",
        "映画のような美しい夕日の背景",
        "★★★★★",
      ],
      [
        "🌅 環境",
        "神秘的な森",
        "mystical forest, ancient trees, dappled sunlight, moss-covered ground, magical atmosphere",
        "神秘的で魔法的な森の環境",
        "★★★★☆",
      ],
      [
        "🌅 環境",
        "未来都市",
        "futuristic city, cyberpunk, neon lights, skyscrapers, flying cars, sci-fi architecture",
        "サイバーパンクな未来都市",
        "★★★☆☆",
      ],
      [
        "🌅 環境",
        "美しい海辺",
        "pristine beach, crystal clear turquoise water, white sand, palm trees, tropical paradise",
        "南国の楽園のような美しいビーチ",
        "★★★★☆",
      ],
      [
        "🌅 環境",
        "雪景色",
        "winter wonderland, snow-covered landscape, frozen lake, pine trees, peaceful atmosphere",
        "静寂な雪景色の冬の風景",
        "★★★☆☆",
      ],
      [
        "🌅 環境",
        "桜の季節",
        "cherry blossom season, sakura petals falling, spring in Japan, pink flowers, peaceful",
        "日本の美しい桜の季節",
        "★★★★☆",
      ],
      [
        "🌅 環境",
        "宇宙空間",
        "outer space, stars, galaxies, nebula, cosmic background, infinite universe",
        "壮大な宇宙空間の背景",
        "★★★☆☆",
      ],

      // 📸 品質・技術系（拡張）
      [
        "📸 品質",
        "最高品質8K",
        "8K resolution, ultra high definition, masterpiece, best quality, award winning",
        "最高峰の画質設定",
        "★★★★★",
      ],
      [
        "📸 品質",
        "プロ撮影",
        "professional photography, studio lighting, perfect composition, commercial quality",
        "プロフェッショナルな撮影品質",
        "★★★★☆",
      ],
      [
        "📸 品質",
        "芸術作品",
        "artistic masterpiece, gallery worthy, creative composition, unique perspective",
        "ギャラリーに展示される芸術作品レベル",
        "★★★☆☆",
      ],
      [
        "📸 品質",
        "映画品質",
        "cinematic quality, movie scene, dramatic composition, film grain, color grading",
        "ハリウッド映画のような品質",
        "★★★★☆",
      ],

      // 🎭 ムード・雰囲気系（拡張）
      [
        "🎭 ムード",
        "明るく楽しい",
        "bright, cheerful, joyful, positive energy, vibrant colors, happy atmosphere",
        "明るく前向きで楽しい雰囲気",
        "★★★★★",
      ],
      [
        "🎭 ムード",
        "穏やか癒し",
        "calm, peaceful, serene, relaxing, tranquil atmosphere, zen-like",
        "心が落ち着く癒しの雰囲気",
        "★★★★☆",
      ],
      [
        "🎭 ムード",
        "神秘幻想",
        "mysterious, magical, ethereal, dreamlike, fantasy atmosphere, enchanting",
        "神秘的で幻想的な魔法の世界",
        "★★★★☆",
      ],
      [
        "🎭 ムード",
        "ドラマチック",
        "dramatic lighting, intense atmosphere, powerful emotion, cinematic mood",
        "映画のようなドラマチックな演出",
        "★★★☆☆",
      ],
      [
        "🎭 ムード",
        "ロマンチック",
        "romantic, soft lighting, warm colors, intimate atmosphere, love theme",
        "ロマンチックで温かい恋愛的雰囲気",
        "★★★☆☆",
      ],
      [
        "🎭 ムード",
        "クール・モダン",
        "cool, modern, minimalist, sleek design, contemporary style, sophisticated",
        "洗練されたクールでモダンな雰囲気",
        "★★★☆☆",
      ],

      // 🎯 特殊用途系（新カテゴリ）
      [
        "🎯 特殊用途",
        "商品撮影",
        "product photography, white background, professional lighting, commercial use, clean",
        "ECサイト用の商品撮影スタイル",
        "★★★☆☆",
      ],
      [
        "🎯 特殊用途",
        "SNS映え",
        "Instagram worthy, social media perfect, trendy, aesthetic, eye-catching",
        "SNSでバズりそうなトレンド感のある画像",
        "★★★★☆",
      ],
      [
        "🎯 特殊用途",
        "プレゼン資料",
        "presentation slide, business professional, clean design, infographic style",
        "ビジネスプレゼンテーション用",
        "★★☆☆☆",
      ],
      [
        "🎯 特殊用途",
        "子供向け",
        "child-friendly, cute, colorful, safe for kids, educational, fun characters",
        "子供が喜ぶ安全で楽しい内容",
        "★★★☆☆",
      ],

      // 🌍 文化・地域系（新カテゴリ）
      [
        "🌍 文化・地域",
        "日本文化",
        "Japanese culture, traditional Japan, kimono, temple, zen garden, cultural heritage",
        "日本の伝統文化を表現",
        "★★★★☆",
      ],
      [
        "🌍 文化・地域",
        "ヨーロッパ風",
        "European style, classical architecture, old world charm, historic buildings",
        "ヨーロッパの古典的な雰囲気",
        "★★★☆☆",
      ],
      [
        "🌍 文化・地域",
        "アメリカン",
        "American style, modern lifestyle, urban culture, contemporary design",
        "現代アメリカの文化とライフスタイル",
        "★★☆☆☆",
      ],
    ];

    // データを設定
    const dataRange = commonSheet.getRange(
      2,
      1,
      defaultPrompts.length,
      defaultPrompts[0].length
    );
    dataRange.setValues(defaultPrompts);

    // データ行のスタイル設定（改善版）
    for (let i = 2; i <= defaultPrompts.length + 1; i++) {
      const rowRange = commonSheet.getRange(i, 1, 1, headers.length);
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

      // カテゴリごとに色分け（新カテゴリ対応）
      const category = commonSheet.getRange(i, 1).getValue();
      if (category.includes("🎨")) {
        rowRange.setBackground("#fff3e0"); // オレンジ系（スタイル）
      } else if (category.includes("🌅")) {
        rowRange.setBackground("#e8f5e8"); // 緑系（環境）
      } else if (category.includes("📸")) {
        rowRange.setBackground("#e3f2fd"); // 青系（品質）
      } else if (category.includes("🎭")) {
        rowRange.setBackground("#f3e5f5"); // 紫系（ムード）
      } else if (category.includes("🎯")) {
        rowRange.setBackground("#fff8e1"); // 黄系（特殊用途）
      } else if (category.includes("🌍")) {
        rowRange.setBackground("#f1f8e9"); // 薄緑系（文化・地域）
      }

      // 使用頻度列のスタイル設定
      const frequencyCell = commonSheet.getRange(i, 5);
      frequencyCell.setHorizontalAlignment("center");
      frequencyCell.setFontWeight("bold");
    }

    // 📋 詳細な使用説明を追加（改善版）
    const instructionRow = defaultPrompts.length + 3;
    const instructionRange = commonSheet.getRange(instructionRow, 1, 1, 5);
    instructionRange.merge();
    instructionRange.setValue(
      "💡 共通プロンプト管理システムの使い方\n\n" +
        "🔹 新しい共通プロンプトを追加：上記の表に新しい行を追加してください\n" +
        "🔹 カテゴリ：🎨スタイル、🌅環境、📸品質、🎭ムード、🎯特殊用途、🌍文化・地域\n" +
        "🔹 使用頻度：★の数で人気度を表示（★★★★★が最も人気）\n" +
        "🔹 自動反映：編集するとメインシートのドロップダウンに即座に反映されます\n" +
        "🔹 効率化：よく使うプロンプトを登録することで、毎回入力する手間が省けます"
    );
    instructionRange.setBackground("#fff9c4");
    instructionRange.setFontWeight("bold");
    instructionRange.setWrap(true);
    instructionRange.setVerticalAlignment("top");
    commonSheet.setRowHeight(instructionRow, 120);

    // 📊 統計情報エリアを追加
    const statsRow = instructionRow + 2;
    const statsRange = commonSheet.getRange(statsRow, 1, 1, 5);
    statsRange.merge();
    statsRange.setValue(
      `📊 統計情報：合計${defaultPrompts.length}個の共通プロンプトが登録済み | ` +
        `${
          defaultPrompts.filter((p) => p[0].includes("🎨")).length
        }個のスタイル、` +
        `${
          defaultPrompts.filter((p) => p[0].includes("🌅")).length
        }個の環境、` +
        `${
          defaultPrompts.filter((p) => p[0].includes("📸")).length
        }個の品質設定、` +
        `${
          defaultPrompts.filter((p) => p[0].includes("🎭")).length
        }個のムード、` +
        `${
          defaultPrompts.filter((p) => p[0].includes("🎯")).length
        }個の特殊用途、` +
        `${
          defaultPrompts.filter((p) => p[0].includes("🌍")).length
        }個の文化・地域`
    );
    statsRange.setBackground("#e8f5e8");
    statsRange.setFontStyle("italic");
    statsRange.setHorizontalAlignment("center");
    commonSheet.setRowHeight(statsRow, 40);

    console.log(
      `✅ 改善された共通プロンプト設定シートを作成しました（${defaultPrompts.length}個のプロンプト）`
    );
    return true;
  } catch (error) {
    console.error("共通プロンプトシート作成エラー:", error);
    throw new Error(
      `共通プロンプトシートの作成に失敗しました: ${error.message}`
    );
  }
}

/**
 * 🔧 共通プロンプト管理の便利機能
 */

/**
 * 人気の共通プロンプトを取得（使用頻度順）
 */
function getPopularCommonPrompts() {
  try {
    const commonSheet =
      SpreadsheetApp.getActiveSpreadsheet().getSheetByName(
        "共通プロンプト設定"
      );
    if (!commonSheet) {
      return [];
    }

    const lastRow = commonSheet.getLastRow();
    if (lastRow < 2) {
      return [];
    }

    // データを取得（カテゴリ、名前、内容、説明、使用頻度）
    const data = commonSheet.getRange(2, 1, lastRow - 1, 5).getValues();

    // 使用頻度（★の数）でソート
    const sortedData = data.sort((a, b) => {
      const freqA = (a[4] || "").toString().split("★").length - 1;
      const freqB = (b[4] || "").toString().split("★").length - 1;
      return freqB - freqA; // 降順
    });

    return sortedData.slice(0, 10).map((row) => ({
      category: row[0],
      name: row[1],
      content: row[2],
      description: row[3],
      frequency: row[4],
    }));
  } catch (error) {
    console.error("人気プロンプト取得エラー:", error);
    return [];
  }
}

/**
 * カテゴリ別の共通プロンプトを取得
 */
function getCommonPromptsByCategory(category) {
  try {
    const commonSheet =
      SpreadsheetApp.getActiveSpreadsheet().getSheetByName(
        "共通プロンプト設定"
      );
    if (!commonSheet) {
      return [];
    }

    const lastRow = commonSheet.getLastRow();
    if (lastRow < 2) {
      return [];
    }

    const data = commonSheet.getRange(2, 1, lastRow - 1, 5).getValues();

    return data
      .filter((row) => row[0].includes(category))
      .map((row) => ({
        category: row[0],
        name: row[1],
        content: row[2],
        description: row[3],
        frequency: row[4],
      }));
  } catch (error) {
    console.error("カテゴリ別プロンプト取得エラー:", error);
    return [];
  }
}

/**
 * 共通プロンプトの統計情報を取得
 */
function getCommonPromptStats() {
  try {
    const commonSheet =
      SpreadsheetApp.getActiveSpreadsheet().getSheetByName(
        "共通プロンプト設定"
      );
    if (!commonSheet) {
      return { total: 0, byCategory: {} };
    }

    const lastRow = commonSheet.getLastRow();
    if (lastRow < 2) {
      return { total: 0, byCategory: {} };
    }

    const data = commonSheet.getRange(2, 1, lastRow - 1, 1).getValues();
    const byCategory = {};

    data.forEach((row) => {
      const category = row[0];
      byCategory[category] = (byCategory[category] || 0) + 1;
    });

    return {
      total: data.length,
      byCategory: byCategory,
      lastUpdated: new Date().toLocaleString("ja-JP"),
    };
  } catch (error) {
    console.error("統計情報取得エラー:", error);
    return { total: 0, byCategory: {} };
  }
}

/**
 * 共通プロンプトのデータ検証（ドロップダウン）を設定
 */
function setupCommonPromptValidation() {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();
    const commonSheet =
      SpreadsheetApp.getActiveSpreadsheet().getSheetByName(
        "共通プロンプト設定"
      );

    if (!commonSheet) {
      console.error("共通プロンプト設定シートが見つかりません");
      return;
    }

    // 共通プロンプトのリストを取得
    const lastRow = commonSheet.getLastRow();
    if (lastRow < 2) {
      console.log("共通プロンプトデータがありません");
      return;
    }

    // プロンプト名の列（B列）からドロップダウン用のデータを取得
    const promptNames = commonSheet
      .getRange(2, 2, lastRow - 1, 1)
      .getValues()
      .flat();

    // 空の選択肢を追加
    const dropdownValues = ["（なし）", ...promptNames];

    // C列（共通プロンプト選択列）にデータ検証を設定
    const validationRange = sheet.getRange(2, 3, 100, 1); // 100行分
    const rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(dropdownValues, true)
      .setAllowInvalid(false)
      .setHelpText(
        "共通プロンプトを選択してください。新しいプロンプトは「共通プロンプト設定」シートで追加できます。"
      )
      .build();

    validationRange.setDataValidation(rule);

    console.log(
      `共通プロンプトのドロップダウンを設定しました（${dropdownValues.length}個の選択肢）`
    );
    return true;
  } catch (error) {
    console.error("データ検証設定エラー:", error);
    throw new Error(`データ検証の設定に失敗しました: ${error.message}`);
  }
}

/**
 * 個別プロンプトと共通プロンプトを結合
 */
function combinePrompts(individualPrompt, commonPromptName) {
  try {
    if (!individualPrompt || individualPrompt.trim() === "") {
      return ""; // 個別プロンプトが空の場合
    }

    if (
      !commonPromptName ||
      commonPromptName === "（なし）" ||
      commonPromptName.trim() === ""
    ) {
      return individualPrompt.trim(); // 共通プロンプトが選択されていない場合
    }

    // 共通プロンプトの内容を取得
    const commonPromptContent = getCommonPromptContent(commonPromptName);
    if (!commonPromptContent) {
      return individualPrompt.trim(); // 共通プロンプトが見つからない場合
    }

    // プロンプトを結合（共通プロンプト + 個別プロンプト）
    const combinedPrompt = `${commonPromptContent}, ${individualPrompt.trim()}`;

    console.log(
      `プロンプト結合: "${commonPromptName}" + "${individualPrompt.substring(
        0,
        30
      )}..." = ${combinedPrompt.length}文字`
    );
    return combinedPrompt;
  } catch (error) {
    console.error("プロンプト結合エラー:", error);
    return individualPrompt || ""; // エラーの場合は個別プロンプトのみ返す
  }
}

/**
 * 共通プロンプト名から内容を取得
 */
function getCommonPromptContent(promptName) {
  try {
    const commonSheet =
      SpreadsheetApp.getActiveSpreadsheet().getSheetByName(
        "共通プロンプト設定"
      );
    if (!commonSheet) {
      console.error("共通プロンプト設定シートが見つかりません");
      return null;
    }

    const lastRow = commonSheet.getLastRow();
    if (lastRow < 2) {
      return null;
    }

    // プロンプト名で検索
    const data = commonSheet.getRange(2, 2, lastRow - 1, 2).getValues(); // B列（名前）とC列（内容）

    for (let i = 0; i < data.length; i++) {
      const [name, content] = data[i];
      if (name === promptName) {
        return content;
      }
    }

    console.log(`共通プロンプト "${promptName}" が見つかりませんでした`);
    return null;
  } catch (error) {
    console.error("共通プロンプト取得エラー:", error);
    return null;
  }
}

/**
 * 結合プロンプトを自動更新（編集時トリガー）
 */
function updateCombinedPrompt(sheet, row) {
  try {
    const individualPrompt = sheet.getRange(row, 2).getValue(); // B列
    const commonPromptName = sheet.getRange(row, 3).getValue(); // C列
    const combinedCell = sheet.getRange(row, 4); // D列

    const combinedPrompt = combinePrompts(individualPrompt, commonPromptName);

    if (combinedPrompt && combinedPrompt.trim() !== "") {
      // 結合プロンプトが長い場合は省略表示
      let displayText = "🔗";
      if (combinedPrompt.length > 0) {
        displayText =
          combinedPrompt.length > 30
            ? `🔗 ${combinedPrompt.substring(0, 27)}...`
            : `🔗 ${combinedPrompt}`;
      }

      combinedCell.setValue(displayText);
      combinedCell.setNote(
        `完全な結合プロンプト（${combinedPrompt.length}文字）:\n\n${combinedPrompt}`
      );
      combinedCell.setBackground("#e8f5e8"); // 結合済みを示す緑色
    } else {
      combinedCell.setValue("🔗");
      combinedCell.setNote(
        "個別プロンプト + 共通プロンプトの結合結果がここに表示されます。"
      );
      combinedCell.setBackground("#f0f8ff"); // デフォルト色
    }

    console.log(`行${row}: 結合プロンプトを更新しました`);
  } catch (error) {
    console.error(`行${row}の結合プロンプト更新エラー:`, error);
  }
}

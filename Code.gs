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
    .addItem("🔧 初期セットアップ", "initialSetup")
    .addSeparator()
    .addItem("🔐 権限承認を実行", "forcePermissionRequest")
    .addSeparator()
    .addItem("🧹 シートを完全クリア", "clearSheetMenu")
    .addSeparator()
    .addItem("⚙️ 設定を確認", "checkSettings")
    .addToUi();

  // サイドバーを自動で表示（権限チェック付き）
  try {
    Utilities.sleep(100); // 100ms待機で確実な表示

    // 初回使用時は権限チェックをスキップして安全に実行
    if (isFirstTimeUser()) {
      console.log("💡 初回使用者: 権限承認が必要な場合があります");
      showWelcomeMessage();
    } else {
      showSidebar();
      console.log("✅ サイドバーを自動表示しました");
    }
  } catch (error) {
    console.log("⚠️ サイドバーの自動表示をスキップ:", error.message);
    // 権限エラーの場合は歓迎メッセージを表示
    if (
      error.message.includes("container.ui") ||
      error.message.includes("permissions")
    ) {
      showWelcomeMessage();
    }
  }
}

/**
 * 初期セットアップ（プロンプト入力エリアを作成）- 改良版
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
      // 空のシートの場合
      const response = ui.alert(
        "🚀 初期セットアップ",
        "画像生成用のワークスペースを作成します。\n\n" +
          "📝 プロンプト入力エリア\n" +
          "🎨 見やすいタイトルとガイド\n" +
          "✨ 美しいレイアウト\n\n" +
          "続行しますか？",
        ui.ButtonSet.YES_NO
      );

      if (response === ui.Button.YES) {
        setupOption = "new";
      } else {
        return "初期セットアップをキャンセルしました";
      }
    }

    // セットアップ実行
    return executeSetup(setupOption);
  } catch (error) {
    console.error("初期セットアップエラー:", error);

    // 権限エラーの場合は統一ハンドラーを使用
    if (
      error.message.includes("permissions") ||
      error.message.includes("container.ui") ||
      error.message.includes("spreadsheets")
    ) {
      handlePermissionError("初期セットアップ");
      return;
    }

    throw new Error(`初期セットアップに失敗しました: ${error.message}`);
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
        // 最後の手段：シンプルなエラーメッセージ
        SpreadsheetApp.getUi().alert(
          "権限承認が必要です",
          "メニューから「🔐 権限承認を実行」をクリックしてください。",
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

    // 2. Drive権限をテスト
    const file = DriveApp.getFileById(spreadsheet.getId());

    // 3. UI権限をテスト（これが重要）
    const ui = SpreadsheetApp.getUi();

    // 4. 外部リクエスト権限をテスト
    UrlFetchApp.fetch("https://httpbin.org/get", {
      muteHttpExceptions: true,
      headers: { "User-Agent": "DALL-E Image Generator" },
    });

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
 * 設定確認ダイアログ
 */
function checkSettings() {
  try {
    const apiKey = getOpenAIApiKey();
    const maskedKey =
      apiKey.substring(0, 8) + "..." + apiKey.substring(apiKey.length - 4);
    SpreadsheetApp.getUi().alert(
      "設定確認",
      `OpenAI API キー: ${maskedKey}`,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  } catch (error) {
    SpreadsheetApp.getUi().alert(
      "設定エラー",
      error.message,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  }
}

/**
 * アクティブレンジのA1表記を取得（自動検出機能付き）
 */
function getActiveRangeA1() {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();
    let range = sheet.getActiveRange();

    // 単一セルが選択されている場合、プロンプト入力エリアを自動検出
    if (range.getNumRows() === 1 && range.getNumColumns() === 1) {
      const autoRange = findPromptInputArea();
      if (autoRange) {
        range = autoRange;
        console.log(
          "プロンプト入力エリアを自動検出しました:",
          range.getA1Notation()
        );
      }
    }

    return range.getA1Notation();
  } catch (error) {
    console.error("アクティブレンジの取得エラー:", error);
    throw new Error("アクティブレンジの取得に失敗しました");
  }
}

/**
 * プロンプト入力エリアを自動検出
 */
function findPromptInputArea() {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();
    const dataRange = sheet.getDataRange();

    if (dataRange.getNumRows() < 1) return null;

    // "プロンプト入力エリア" のヘッダーを探す
    for (let row = 1; row <= dataRange.getNumRows(); row++) {
      const cellValue = sheet.getRange(row, 1).getValue().toString();
      if (cellValue.includes("プロンプト入力エリア")) {
        // ヘッダーの下の行から入力データを検索
        const startRow = row + 1;
        let endRow = startRow;

        // 連続するデータ行を検出
        for (let r = startRow; r <= sheet.getLastRow(); r++) {
          const value = sheet.getRange(r, 1).getValue();
          if (value && value.toString().trim() !== "") {
            endRow = r;
          } else if (r > startRow && endRow === r - 1) {
            // 空行が見つかったら終了
            break;
          }
        }

        if (endRow >= startRow) {
          return sheet.getRange(startRow, 1, endRow - startRow + 1, 1);
        }
      }
    }

    return null;
  } catch (error) {
    console.error("プロンプト入力エリア検出エラー:", error);
    return null;
  }
}

/**
 * 既存のプロンプト入力エリアに行を追加
 */
function addPromptRows(numRows = 5) {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();
    const dataRange = sheet.getDataRange();

    if (dataRange.getNumRows() < 1) {
      throw new Error("プロンプト入力エリアが見つかりません");
    }

    // "プロンプト入力エリア" のヘッダーを探す
    let headerRow = -1;
    for (let row = 1; row <= dataRange.getNumRows(); row++) {
      const cellValue = sheet.getRange(row, 1).getValue().toString();
      if (cellValue.includes("プロンプト入力エリア")) {
        headerRow = row;
        break;
      }
    }

    if (headerRow === -1) {
      throw new Error("プロンプト入力エリアのヘッダーが見つかりません");
    }

    // 既存の入力エリアの最後の行を見つける
    let lastInputRow = headerRow;
    for (let r = headerRow + 1; r <= sheet.getLastRow(); r++) {
      const cellValue = sheet.getRange(r, 1).getValue();
      if (cellValue !== null && cellValue !== "") {
        lastInputRow = r;
      } else {
        // 空行が見つかったら、そこまでが入力エリア
        break;
      }
    }

    // 新しい行を追加する位置
    const insertRow = lastInputRow + 1;

    // 新しい入力行を追加
    for (let i = 0; i < numRows; i++) {
      const newRow = insertRow + i;
      const cellRange = sheet.getRange(newRow, 1);

      // 空のセルを作成
      cellRange.setValue("");

      // スタイル設定（既存のスタイルに合わせる）
      cellRange.setBorder(true, true, true, true, true, true);
      sheet.setRowHeight(newRow, 30);
    }

    // 列幅を調整
    sheet.setColumnWidth(1, 400);

    // 新しく追加された範囲を選択
    const newRange = sheet.getRange(insertRow, 1, numRows, 1);
    sheet.setActiveRange(newRange);

    return `プロンプト入力エリアに${numRows}行を追加しました（行 ${insertRow}～${
      insertRow + numRows - 1
    }）`;
  } catch (error) {
    console.error("プロンプト行追加エラー:", error);
    throw new Error(`プロンプト行の追加に失敗しました: ${error.message}`);
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
 * DALL-E APIを使って画像を生成
 */
function generateImages(prompts) {
  if (!prompts || prompts.length === 0) {
    throw new Error("プロンプトが指定されていません");
  }

  const apiKey = getOpenAIApiKey();
  const results = [];

  try {
    prompts.forEach((prompt, index) => {
      console.log(`画像生成中 ${index + 1}/${prompts.length}: ${prompt}`);

      const payload = {
        prompt: prompt,
        n: 1,
        size: "1024x1024",
        model: "dall-e-3",
        quality: "standard",
      };

      const response = UrlFetchApp.fetch(
        "https://api.openai.com/v1/images/generations",
        {
          method: "POST",
          contentType: "application/json",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          payload: JSON.stringify(payload),
        }
      );

      if (response.getResponseCode() !== 200) {
        throw new Error(
          `API エラー: ${response.getResponseCode()} - ${response.getContentText()}`
        );
      }

      const data = JSON.parse(response.getContentText());
      if (!data.data || !data.data[0] || !data.data[0].url) {
        throw new Error("画像URLの取得に失敗しました");
      }

      results.push({
        prompt: prompt,
        url: data.data[0].url,
        revised_prompt: data.data[0].revised_prompt || prompt,
      });

      // API制限を考慮した待機時間
      if (index < prompts.length - 1) {
        Utilities.sleep(1000); // 1秒待機
      }
    });

    console.log(`${results.length}枚の画像を生成完了`);
    return results;
  } catch (error) {
    console.error("画像生成エラー:", error);
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

          // プロンプトセルも見やすく調整
          const promptCell = sheet.getRange(promptRow, promptCol);
          promptCell.setWrap(true);
          promptCell.setVerticalAlignment("middle");

          // さらに隣の列にAI修正プロンプトを配置（オプション）
          if (
            imageResults[imageIndex].revised_prompt &&
            imageResults[imageIndex].revised_prompt !==
              imageResults[imageIndex].prompt
          ) {
            const revisedCol = imageCol + 1;
            const revisedCell = sheet.getRange(promptRow, revisedCol);
            revisedCell.setValue(imageResults[imageIndex].revised_prompt);
            revisedCell.setWrap(true);
            revisedCell.setVerticalAlignment("middle");
            revisedCell.setFontStyle("italic");
            revisedCell.setFontColor("#666666");
            sheet.setColumnWidth(revisedCol, 250);

            // ヘッダーも追加（初回のみ）
            if (imageIndex === 0) {
              const headerRow = Math.max(1, promptRow - 1);
              if (sheet.getRange(headerRow, promptCol).getValue() === "") {
                sheet.getRange(headerRow, promptCol).setValue("📝 プロンプト");
                sheet.getRange(headerRow, imageCol).setValue("🖼️ 生成画像");
                sheet.getRange(headerRow, revisedCol).setValue("🤖 AI修正版");

                // ヘッダーのスタイル設定
                const headerRange = sheet.getRange(headerRow, promptCol, 1, 3);
                headerRange.setBackground("#1a73e8");
                headerRange.setFontColor("white");
                headerRange.setFontWeight("bold");
                headerRange.setHorizontalAlignment("center");
                sheet.setRowHeight(headerRow, 35);
              }
            }
          } else {
            // AI修正プロンプトがない場合は、ヘッダーを2列のみで設定
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

/**
 * シートに見出し付きの表を作成（可視性大幅改善版）
 */
function createImageTable(imageResults) {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();

    // 画像生成結果エリアを明確に分離する
    const lastRow = sheet.getLastRow();
    const startRow = lastRow + 3; // 3行空けて開始

    // 🎯 結果エリアのタイトルを作成
    const titleRange = sheet.getRange(startRow, 1, 1, 5);
    titleRange.merge();
    titleRange.setValue(
      "🎨 画像生成結果 - " + new Date().toLocaleString("ja-JP")
    );
    titleRange.setBackground("#ff6f00");
    titleRange.setFontColor("white");
    titleRange.setFontSize(14);
    titleRange.setFontWeight("bold");
    titleRange.setHorizontalAlignment("center");
    titleRange.setVerticalAlignment("middle");
    sheet.setRowHeight(startRow, 45);

    // 📊 統計情報を表示
    const statsRange = sheet.getRange(startRow + 1, 1, 1, 5);
    statsRange.merge();
    statsRange.setValue(
      `✨ 生成完了: ${imageResults.length}枚の画像 | 📦 ダウンロード準備完了`
    );
    statsRange.setBackground("#e8f5e8");
    statsRange.setFontColor("#2e7d32");
    statsRange.setHorizontalAlignment("center");
    statsRange.setFontWeight("bold");
    sheet.setRowHeight(startRow + 1, 35);

    // 見出し行を作成（行番号を調整）
    const headerRow = startRow + 3;
    const headers = [
      "No.",
      "プロンプト",
      "🖼️ 生成画像",
      "AI修正プロンプト",
      "⏰ 生成時刻",
    ];
    const headerRange = sheet.getRange(headerRow, 1, 1, headers.length);
    headerRange.setValues([headers]);

    // 見出し行のスタイルを設定
    headerRange.setBackground("#1a73e8");
    headerRange.setFontColor("white");
    headerRange.setFontWeight("bold");
    headerRange.setHorizontalAlignment("center");
    headerRange.setVerticalAlignment("middle");
    sheet.setRowHeight(headerRow, 40);

    // データ行を作成
    const currentTime = new Date().toLocaleString("ja-JP");
    const dataRows = imageResults.map((result, index) => [
      `🎯 ${index + 1}`,
      result.prompt,
      `=IMAGE("${result.url}", 1)`,
      result.revised_prompt || result.prompt,
      currentTime,
    ]);

    if (dataRows.length > 0) {
      const dataRange = sheet.getRange(
        headerRow + 1,
        1,
        dataRows.length,
        headers.length
      );
      dataRange.setValues(dataRows);

      // データ行の高度なスタイル設定
      dataRange.setBorder(true, true, true, true, true, true);
      dataRange.setVerticalAlignment("middle");

      // 交互の行色設定
      for (let i = 0; i < dataRows.length; i++) {
        const rowRange = sheet.getRange(
          headerRow + 1 + i,
          1,
          1,
          headers.length
        );
        if (i % 2 === 0) {
          rowRange.setBackground("#f8f9fa");
        } else {
          rowRange.setBackground("#ffffff");
        }
      }

      // 列幅を最適化
      sheet.setColumnWidth(1, 60); // No.
      sheet.setColumnWidth(2, 250); // プロンプト
      sheet.setColumnWidth(3, 200); // 生成画像
      sheet.setColumnWidth(4, 250); // 修正プロンプト
      sheet.setColumnWidth(5, 140); // 生成日時

      // 画像行の高さを調整
      for (let i = 0; i < dataRows.length; i++) {
        sheet.setRowHeight(headerRow + 1 + i, 150);
      }

      // 🎯 結果エリアにスクロール（表示範囲に移動）
      sheet.setActiveRange(sheet.getRange(startRow, 1));
    }

    // 📍 区切り線を追加
    const separatorRow = headerRow + dataRows.length + 1;
    const separatorRange = sheet.getRange(separatorRow, 1, 1, 5);
    separatorRange.merge();
    separatorRange.setValue("═".repeat(50));
    separatorRange.setHorizontalAlignment("center");
    separatorRange.setFontColor("#cccccc");

    return `🎉 ${
      imageResults.length
    }枚の画像を表形式で生成しました！（行 ${startRow}～${
      headerRow + dataRows.length
    }）`;
  } catch (error) {
    console.error("表作成エラー:", error);
    throw new Error(`表の作成に失敗しました: ${error.message}`);
  }
}

/**
 * プロンプト入力テーブルを作成（重複防止機能付き）
 */
function createPromptInputTable() {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();

    // 既存のプロンプト入力エリアをチェック
    const existingArea = findPromptInputArea();

    if (existingArea) {
      // 既存エリアがある場合は追加行を提案
      const ui = SpreadsheetApp.getUi();
      const response = ui.alert(
        "📝 プロンプト入力エリアが既に存在します",
        "既にプロンプト入力エリアがあります。\n\n" +
          "✅ はい：既存エリアに行を追加\n" +
          "❌ いいえ：新しいエリアを下に作成\n" +
          "🚫 キャンセル：操作を中止",
        ui.ButtonSet.YES_NO_CANCEL
      );

      if (response === ui.Button.YES) {
        return addPromptRows();
      } else if (response === ui.Button.NO) {
        // 新しいエリアを作成
        const lastRow = findLastDataRow();
        const startRow = lastRow + 3;
        createPromptInputAreaAt(startRow);
        return `新しいプロンプト入力エリアを作成しました（行 ${startRow}～${
          startRow + 8
        }）`;
      } else {
        return "操作をキャンセルしました";
      }
    } else {
      // 既存エリアがない場合は新規作成
      const lastRow = findLastDataRow();
      const startRow = lastRow + 3;
      createPromptInputAreaAt(startRow);
      return `プロンプト入力エリアを作成しました（行 ${startRow}～${
        startRow + 8
      }）`;
    }
  } catch (error) {
    console.error("入力テーブル作成エラー:", error);
    throw new Error(`入力テーブルの作成に失敗しました: ${error.message}`);
  }
}

/**
 * 改善されたプロンプト入力エリアを作成
 */
function createPromptInputArea() {
  return createPromptInputAreaAt(4);
}

/**
 * 画像生成と隣接配置を同時に実行
 */
function generateImagesAndCreateTable(prompts) {
  try {
    // 画像を生成
    const imageResults = generateImages(prompts);

    // 選択範囲を取得
    const selection = SpreadsheetApp.getSelection();
    const activeRange = selection.getActiveRange();

    if (!activeRange) {
      throw new Error("プロンプト範囲が選択されていません");
    }

    // プロンプトの隣に画像を配置
    const insertResult = insertImages(
      imageResults,
      activeRange.getA1Notation()
    );

    return {
      imageResults: imageResults,
      tableMessage: insertResult,
    };
  } catch (error) {
    console.error("画像生成・配置エラー:", error);
    throw new Error(`処理に失敗しました: ${error.message}`);
  }
}

/**
 * セットアップを実行
 */
function executeSetup(option) {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();

    let startRow = 1;

    switch (option) {
      case "backup":
        // 既存データをバックアップしてクリア
        backupAndClearSheet();
        startRow = 1;
        break;

      case "clear":
        // 完全クリアして新規作成
        clearSheetCompletely();
        startRow = 1;
        break;

      case "new":
        // 新規作成 - シートを完全にクリアしてから作成
        clearSheetCompletely();
        startRow = 1;
        break;
    }

    // ワークスペースを作成
    createWorkspace(startRow);

    return "🎉 セットアップ完了！プロンプト入力エリアを作成しました！\n\n💡 これでプロンプト行追加が正しい位置で機能します！";
  } catch (error) {
    console.error("セットアップ実行エラー:", error);
    throw new Error(`セットアップの実行に失敗しました: ${error.message}`);
  }
}

/**
 * シートを完全にクリア
 */
function clearSheetCompletely() {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();

    // シート全体をクリア
    sheet.clear();

    // フォーマットもクリア
    sheet.clearFormats();

    // 行の高さと列の幅をデフォルトに戻す
    const maxRows = sheet.getMaxRows();
    const maxCols = sheet.getMaxColumns();

    if (maxRows > 0 && maxCols > 0) {
      // 行の高さをデフォルトに
      sheet.setRowHeights(1, maxRows, 21);

      // 列の幅をデフォルトに
      sheet.setColumnWidths(1, maxCols, 100);
    }

    console.log("シートを完全にクリアしました");
  } catch (error) {
    console.error("シートクリアエラー:", error);
    throw new Error(`シートのクリアに失敗しました: ${error.message}`);
  }
}

/**
 * メニューからのシートクリア（確認ダイアログ付き）
 */
function clearSheetMenu() {
  try {
    const ui = SpreadsheetApp.getUi();

    const response = ui.alert(
      "🧹 シートを完全クリア",
      "⚠️ 警告：この操作は元に戻せません！\n\n" +
        "以下の内容が完全に削除されます：\n" +
        "• 全てのデータ\n" +
        "• 全てのフォーマット\n" +
        "• 行の高さと列の幅\n\n" +
        "本当にシートを完全にクリアしますか？",
      ui.ButtonSet.YES_NO
    );

    if (response === ui.Button.YES) {
      clearSheetCompletely();

      ui.alert(
        "✅ クリア完了",
        "シートを完全にクリアしました！\n\n" +
          "💡 新しいワークスペースを作成するには\n" +
          "「🔧 初期セットアップ」をご利用ください。",
        ui.ButtonSet.OK
      );
    } else {
      ui.alert(
        "キャンセル",
        "シートクリアをキャンセルしました。",
        ui.ButtonSet.OK
      );
    }
  } catch (error) {
    console.error("メニュークリアエラー:", error);
    SpreadsheetApp.getUi().alert(
      "エラー",
      `シートクリアに失敗しました: ${error.message}`,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  }
}

/**
 * 最後のデータ行を正確に見つける
 */
function findLastDataRow() {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();
    let lastRow = 0;

    // 各列の最後のデータ行をチェック
    for (let col = 1; col <= Math.max(5, sheet.getLastColumn()); col++) {
      const columnData = sheet
        .getRange(1, col, sheet.getLastRow() || 1, 1)
        .getValues();
      for (let row = columnData.length - 1; row >= 0; row--) {
        if (columnData[row][0] !== "" && columnData[row][0] != null) {
          lastRow = Math.max(lastRow, row + 1);
          break;
        }
      }
    }

    return lastRow || sheet.getLastRow() || 0;
  } catch (error) {
    console.error("最後のデータ行検索エラー:", error);
    return sheet.getLastRow() || 0;
  }
}

/**
 * 既存データをバックアップしてシートをクリア
 */
function backupAndClearSheet() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const currentSheet = ss.getActiveSheet();

    // バックアップシートを作成
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
    const backupName = `バックアップ_${timestamp}`;
    const backupSheet = currentSheet.copyTo(ss);
    backupSheet.setName(backupName);

    // 元のシートを完全にクリア
    clearSheetCompletely();

    SpreadsheetApp.getUi().alert(
      "📁 バックアップ完了",
      `既存データを「${backupName}」シートにバックアップしました。\n元のシートは新しいワークスペースとして利用できます。`,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  } catch (error) {
    console.error("バックアップエラー:", error);
    throw new Error(`データのバックアップに失敗しました: ${error.message}`);
  }
}

/**
 * ワークスペースを作成（新しい構造化テーブルシステム）
 */
function createWorkspace(startRow) {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();

    // タイトルエリアを作成
    const titleRange = sheet.getRange(startRow, 1, 1, 8);
    titleRange.merge();
    titleRange.setValue("🎨 DALL-E 画像生成ツール - プロフェッショナル版");
    titleRange.setBackground("#1a73e8");
    titleRange.setFontColor("white");
    titleRange.setFontSize(18);
    titleRange.setFontWeight("bold");
    titleRange.setHorizontalAlignment("center");
    titleRange.setVerticalAlignment("middle");
    sheet.setRowHeight(startRow, 55);

    // 説明エリア
    const instructionRange = sheet.getRange(startRow + 1, 1, 1, 8);
    instructionRange.merge();
    instructionRange.setValue(
      "📋 B列にプロンプトを入力して、サイドバーから「🎨 画像を生成」をクリック！構造化されたテーブルで管理されます。"
    );
    instructionRange.setBackground("#fff3e0");
    instructionRange.setFontColor("#ef6c00");
    instructionRange.setHorizontalAlignment("center");
    instructionRange.setWrap(true);
    instructionRange.setFontSize(12);
    sheet.setRowHeight(startRow + 1, 45);

    // 構造化テーブルを作成
    return createStructuredTable();
  } catch (error) {
    console.error("ワークスペース作成エラー:", error);
    throw new Error(`ワークスペースの作成に失敗しました: ${error.message}`);
  }
}

/**
 * 指定位置にプロンプト入力エリアを作成
 */
function createPromptInputAreaAt(startRow) {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();

    // プロンプト入力見出し
    const headerRange = sheet.getRange(startRow, 1, 1, 1);
    headerRange.setValue("✨ プロンプト入力エリア");
    headerRange.setBackground("#34a853");
    headerRange.setFontColor("white");
    headerRange.setFontWeight("bold");
    headerRange.setHorizontalAlignment("center");
    headerRange.setVerticalAlignment("middle");
    sheet.setRowHeight(startRow, 35);

    // プロンプト入力例を追加
    const examplePrompts = [
      "a beautiful sunset over the ocean with sailing boats",
      "a cute cat wearing a wizard hat in a magical forest",
      "a futuristic city with flying cars and neon lights",
      "a delicious pizza with colorful vegetables",
      "a peaceful garden with blooming cherry blossoms",
    ];

    // 入力欄を作成（例付き）
    for (let i = 0; i < 8; i++) {
      const row = startRow + 1 + i;
      const cellRange = sheet.getRange(row, 1);

      if (i < examplePrompts.length) {
        cellRange.setValue(examplePrompts[i]);
        cellRange.setFontColor("#666666");
        cellRange.setFontStyle("italic");
      }

      // スタイル設定（エラーを修正）
      cellRange.setBorder(true, true, true, true, true, true);
      sheet.setRowHeight(row, 30);
    }

    // 列幅を調整
    sheet.setColumnWidth(1, 400);

    // 入力範囲を選択状態にする
    const inputRange = sheet.getRange(startRow + 1, 1, 8, 1);
    sheet.setActiveRange(inputRange);

    return `プロンプト入力エリアを作成しました（行 ${startRow}～${
      startRow + 8
    }）`;
  } catch (error) {
    console.error("入力エリア作成エリア:", error);
    throw new Error(`入力エリアの作成に失敗しました: ${error.message}`);
  }
}

/**
 * シートにデータがあるかチェック（統一版）
 */
function checkForAnyData() {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();
    const dataRange = sheet.getDataRange();

    if (dataRange.getNumRows() <= 1 && dataRange.getNumColumns() <= 1) {
      // 空のシートまたは1セルのみ
      const value = sheet.getRange(1, 1).getValue();
      return value !== "" && value != null;
    }

    // 複数セルにデータがある
    return true;
  } catch (error) {
    console.error("データチェックエラー:", error);
    return false;
  }
}

/**
 * 既存のワークスペースをチェック
 */
function checkExistingWorkspace() {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();
    const dataRange = sheet.getDataRange();

    if (dataRange.getNumRows() < 1) return false;

    // タイトル行をチェック
    for (let row = 1; row <= dataRange.getNumRows(); row++) {
      const cellValue = sheet.getRange(row, 1).getValue().toString();
      if (
        cellValue.includes("DALL-E") &&
        cellValue.includes("画像生成ツール")
      ) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error("ワークスペースチェックエラー:", error);
    return false;
  }
}

/**
 * 他のデータをチェック
 */
function checkOtherData() {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();
    const dataRange = sheet.getDataRange();

    if (dataRange.getNumRows() <= 1 && dataRange.getNumColumns() <= 1) {
      const cellValue = sheet.getRange(1, 1).getValue();
      return cellValue !== "" && cellValue != null;
    }

    return dataRange.getNumRows() > 1 || dataRange.getNumColumns() > 1;
  } catch (error) {
    console.error("データチェックエラー:", error);
    return false;
  }
}

/**
 * エラーログを記録
 */
function logError(functionName, error) {
  console.error(`[${functionName}] エラー:`, error);
  // 必要に応じてスプレッドシートにログを記録することも可能
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
 * 歓迎メッセージ表示
 */
function showWelcomeMessage() {
  try {
    const ui = SpreadsheetApp.getUi();
    const response = ui.alert(
      "🎨 DALL-E 画像生成ツールへようこそ！",
      "このツールを使用するには権限承認が必要です。\n\n" +
        "🔧 セットアップ手順:\n" +
        "1️⃣ メニューから「🎨 画像ツール」→「📱 サイドバーを開く」\n" +
        "2️⃣ 権限承認ダイアログで「許可」をクリック\n" +
        "3️⃣ 画像生成開始！（APIキーは既に設定済み）\n\n" +
        "今すぐセットアップを開始しますか？",
      ui.ButtonSet.YES_NO
    );

    if (response === ui.Button.YES) {
      // 権限承認を試行
      try {
        const result = requestPermissions();
        markAsUsed();
        ui.alert(
          "✅ セットアップ完了",
          "権限承認が完了しました！\n" +
            "これでツールを使用できます。\n\n" +
            "メニューから「📱 サイドバーを開く」をクリックして開始してください。",
          ui.ButtonSet.OK
        );
        showSidebar();
      } catch (error) {
        ui.alert(
          "🔐 権限承認が必要です",
          "Google Apps Scriptから権限承認を求められます。\n\n" +
            "📋 詳細手順:\n" +
            "1. 「承認が必要」ダイアログで「権限を確認」をクリック\n" +
            "2. Googleアカウントを選択\n" +
            "3. 「このアプリは確認されていません」→「詳細」をクリック\n" +
            "4. 「〜に移動（安全ではないページ）」をクリック\n" +
            "5. 「許可」をクリック\n\n" +
            "承認後、メニューから「📱 サイドバーを開く」を実行してください。",
          ui.ButtonSet.OK
        );
      }
    }
  } catch (error) {
    console.log("歓迎メッセージの表示に失敗:", error.message);
  }
}

/**
 * 手動で権限承認を実行（メニューから実行可能）
 */
function forcePermissionRequest() {
  try {
    // この関数を直接実行することで確実に権限承認ダイアログを表示
    const ui = SpreadsheetApp.getUi();

    // 全ての必要な権限を順番に要求
    console.log("1. スプレッドシート権限をテスト中...");
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = spreadsheet.getActiveSheet();

    console.log("2. Drive権限をテスト中...");
    const file = DriveApp.getFileById(spreadsheet.getId());

    console.log("3. 外部リクエスト権限をテスト中...");
    UrlFetchApp.fetch("https://httpbin.org/get", {
      muteHttpExceptions: true,
      headers: { "User-Agent": "DALL-E Image Generator Test" },
    });

    console.log("4. UI権限をテスト中...");
    // サイドバー権限をテスト
    const html = HtmlService.createHtmlOutput(
      '<div style="padding:20px;text-align:center;"><h3>✅ 権限承認完了！</h3><p>このメッセージが表示されれば、<br>すべての権限が正常に承認されました。</p><p><strong>メニューから「📱 サイドバーを開く」<br>をクリックしてツールを開始してください。</strong></p></div>'
    )
      .setTitle("🎉 権限承認成功")
      .setWidth(950);
    ui.showSidebar(html);

    console.log("✅ すべての権限承認が完了しました");

    // 権限承認記録を保存
    markPermissionGranted();

    return "✅ 権限承認が完了しました";
  } catch (error) {
    console.error("権限承認エラー:", error);
    const ui = SpreadsheetApp.getUi();
    ui.alert(
      "⚠️ 権限承認が必要です",
      "この関数の実行により権限承認ダイアログが表示されます。\n\n" +
        "表示されたダイアログで「許可」をクリックしてください。\n" +
        "承認後、この関数を再度実行してください。",
      ui.ButtonSet.OK
    );
    throw error;
  }
}

/**
 * 権限エラーを統一的に処理（簡素版）
 */
function handlePermissionError(actionName) {
  try {
    // 自動的に権限承認を試行
    forcePermissionRequest();
    markPermissionGranted();
  } catch (error) {
    // 失敗した場合のみシンプルなメッセージ
    SpreadsheetApp.getUi().alert(
      "権限承認が必要です",
      "メニューから「🔐 権限承認を実行」をクリックしてください。",
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  }
}

/**
 * 構造化テーブルのヘッダーを作成
 */
function createStructuredTable() {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();

    // ヘッダー行を作成（1行目）
    const headers = [
      "No.", // A列
      "📝 プロンプト", // B列 - ユーザー入力
      "📋 画像概要", // C列 - 自動生成
      "🤖 AI変換プロンプト", // D列 - DALL-E変換版
      "🖼️ 生成画像", // E列 - 実際の画像
      "📐 画像比率", // F列 - アスペクト比
      "⏰ 生成日時", // G列 - タイムスタンプ
      "✅ ステータス", // H列 - 生成状況
    ];

    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setValues([headers]);

    // ヘッダーのスタイリング
    headerRange.setBackground("#1a73e8");
    headerRange.setFontColor("white");
    headerRange.setFontWeight("bold");
    headerRange.setHorizontalAlignment("center");
    headerRange.setVerticalAlignment("middle");
    headerRange.setFontSize(12);
    sheet.setRowHeight(1, 45);

    // 列幅の最適化
    sheet.setColumnWidth(1, 60); // A: No.
    sheet.setColumnWidth(2, 300); // B: プロンプト
    sheet.setColumnWidth(3, 200); // C: 概要
    sheet.setColumnWidth(4, 250); // D: AI変換
    sheet.setColumnWidth(5, 220); // E: 画像
    sheet.setColumnWidth(6, 100); // F: 比率
    sheet.setColumnWidth(7, 140); // G: 日時
    sheet.setColumnWidth(8, 100); // H: ステータス

    // サンプル行を追加（2-6行目）
    const samplePrompts = [
      "a beautiful sunset over the ocean with sailing boats",
      "a cute cat wearing a wizard hat in a magical forest",
      "a futuristic city with flying cars and neon lights",
      "a delicious pizza with colorful vegetables",
      "a peaceful garden with blooming cherry blossoms",
    ];

    for (let i = 0; i < samplePrompts.length; i++) {
      const row = i + 2;

      // A列: 番号
      sheet.getRange(row, 1).setValue(i + 1);
      sheet.getRange(row, 1).setHorizontalAlignment("center");
      sheet.getRange(row, 1).setFontWeight("bold");
      sheet.getRange(row, 1).setBackground("#f8f9fa");

      // B列: サンプルプロンプト
      const promptCell = sheet.getRange(row, 2);
      promptCell.setValue(samplePrompts[i]);
      promptCell.setWrap(true);
      promptCell.setVerticalAlignment("middle");
      promptCell.setFontStyle("italic");
      promptCell.setFontColor("#666666");

      // 行の高さを設定
      sheet.setRowHeight(row, 60);

      // 境界線を設定
      const rowRange = sheet.getRange(row, 1, 1, headers.length);
      rowRange.setBorder(true, true, true, true, true, true);
    }

    // 空の行を追加（7-10行目）
    for (let i = 6; i <= 10; i++) {
      const row = i + 1;

      // A列: 番号
      sheet.getRange(row, 1).setValue(i);
      sheet.getRange(row, 1).setHorizontalAlignment("center");
      sheet.getRange(row, 1).setFontWeight("bold");
      sheet.getRange(row, 1).setBackground("#f8f9fa");

      // 行の高さを設定
      sheet.setRowHeight(row, 60);

      // 境界線を設定
      const rowRange = sheet.getRange(row, 1, 1, headers.length);
      rowRange.setBorder(true, true, true, true, true, true);
    }

    return "✨ 構造化テーブルを作成しました！B列にプロンプトを入力してください。";
  } catch (error) {
    console.error("構造化テーブル作成エラー:", error);
    throw new Error(`構造化テーブルの作成に失敗しました: ${error.message}`);
  }
}

/**
 * B列のプロンプトを検出して画像生成
 */
function generateImagesFromStructuredTable() {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();
    const lastRow = sheet.getLastRow();

    if (lastRow < 2) {
      throw new Error("プロンプトが入力されていません");
    }

    // B列からプロンプトを取得（2行目以降）
    const promptRange = sheet.getRange(2, 2, lastRow - 1, 1);
    const promptValues = promptRange.getValues();

    const validPrompts = [];
    const promptRows = [];

    promptValues.forEach((row, index) => {
      const prompt = row[0];
      if (prompt && typeof prompt === "string" && prompt.trim() !== "") {
        validPrompts.push(prompt.trim());
        promptRows.push(index + 2); // 実際の行番号
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
 * 構造化テーブルに画像生成結果を配置
 */
function populateStructuredTable(imageResults, promptRows) {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();
    const currentTime = new Date().toLocaleString("ja-JP");
    let processedCount = 0;

    imageResults.forEach((result, index) => {
      const row = promptRows[index];

      // C列: 画像概要（プロンプトの要約）
      const summaryCell = sheet.getRange(row, 3);
      const summary = generateImageSummary(result.prompt);
      summaryCell.setValue(summary);
      summaryCell.setWrap(true);
      summaryCell.setVerticalAlignment("middle");
      summaryCell.setFontSize(10);
      summaryCell.setBackground("#f0f8ff");

      // D列: AI変換プロンプト
      const aiPromptCell = sheet.getRange(row, 4);
      aiPromptCell.setValue(result.revised_prompt || result.prompt);
      aiPromptCell.setWrap(true);
      aiPromptCell.setVerticalAlignment("middle");
      aiPromptCell.setFontStyle("italic");
      aiPromptCell.setFontColor("#666666");
      aiPromptCell.setFontSize(10);
      aiPromptCell.setBackground("#fff8e1");

      // E列: 生成画像
      const imageCell = sheet.getRange(row, 5);
      imageCell.setFormula(`=IMAGE("${result.url}", 1)`);

      // F列: 画像比率
      const ratioCell = sheet.getRange(row, 6);
      ratioCell.setValue("1:1");
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
      statusCell.setValue("✅ 完了");
      statusCell.setHorizontalAlignment("center");
      statusCell.setVerticalAlignment("middle");
      statusCell.setFontWeight("bold");
      statusCell.setFontColor("#2e7d32");
      statusCell.setBackground("#e8f5e8");

      // 行の高さを画像に合わせて調整
      sheet.setRowHeight(row, 180);

      processedCount++;
    });

    // 完了メッセージを下部に追加
    const lastRow = sheet.getLastRow();
    const messageRow = lastRow + 2;
    const messageRange = sheet.getRange(messageRow, 1, 1, 8);
    messageRange.merge();
    messageRange.setValue(
      `🎉 ${processedCount}枚の画像生成が完了しました！ - ${currentTime}`
    );
    messageRange.setBackground("#e8f5e8");
    messageRange.setFontColor("#2e7d32");
    messageRange.setHorizontalAlignment("center");
    messageRange.setFontWeight("bold");
    messageRange.setFontSize(14);
    sheet.setRowHeight(messageRow, 40);

    return `✅ ${processedCount}枚の画像を構造化テーブルに配置しました！`;
  } catch (error) {
    console.error("構造化テーブル配置エラー:", error);
    throw new Error(`結果の配置に失敗しました: ${error.message}`);
  }
}

/**
 * 画像概要を生成（プロンプトから要約を作成）
 */
function generateImageSummary(prompt) {
  try {
    // プロンプトから主要なキーワードを抽出して概要を作成
    const words = prompt.toLowerCase().split(/[\s,]+/);
    const keyWords = words
      .filter(
        (word) =>
          word.length > 3 &&
          ![
            "with",
            "and",
            "the",
            "for",
            "in",
            "on",
            "at",
            "by",
            "from",
          ].includes(word)
      )
      .slice(0, 3);

    if (keyWords.length > 0) {
      return `${keyWords.join(", ")}の画像`;
    } else {
      return prompt.substring(0, 30) + (prompt.length > 30 ? "..." : "");
    }
  } catch (error) {
    return prompt.substring(0, 30) + (prompt.length > 30 ? "..." : "");
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

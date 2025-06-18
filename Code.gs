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
    .addItem("⚙️ 設定を確認", "checkSettings")
    .addItem("🔧 初期セットアップ", "initialSetup")
    .addToUi();

  // サイドバーを自動で表示
  try {
    showSidebar();
  } catch (error) {
    console.log("サイドバーの自動表示をスキップ:", error.message);
  }
}

/**
 * 初期セットアップ（プロンプト入力エリアを作成）- 改良版
 */
function initialSetup() {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();
    const ui = SpreadsheetApp.getUi();

    // より正確な既存データの確認
    const hasExistingWorkspace = checkExistingWorkspace();
    const hasOtherData = checkOtherData();

    let setupOption;

    if (hasExistingWorkspace) {
      // 既存のワークスペースがある場合
      const response = ui.alert(
        "🎨 画像生成ワークスペースが既に存在します",
        "画像生成ツールのワークスペースが既に作成されています。\n\n" +
          "✅ はい：新しいワークスペースを下に追加\n" +
          "❌ いいえ：既存データをバックアップして再作成\n" +
          "🚫 キャンセル：セットアップを中止",
        ui.ButtonSet.YES_NO_CANCEL
      );

      if (response === ui.Button.YES) {
        setupOption = "append";
      } else if (response === ui.Button.NO) {
        setupOption = "backup";
      } else {
        return "初期セットアップをキャンセルしました";
      }
    } else if (hasOtherData) {
      // 他のデータがある場合
      const response = ui.alert(
        "⚠️ 既存データが検出されました",
        "シートに他のデータが見つかりました。\n\n" +
          "✅ はい：データを保持して下に追加\n" +
          "❌ いいえ：バックアップして新規作成\n" +
          "🚫 キャンセル：セットアップを中止",
        ui.ButtonSet.YES_NO_CANCEL
      );

      if (response === ui.Button.YES) {
        setupOption = "append";
      } else if (response === ui.Button.NO) {
        setupOption = "backup";
      } else {
        return "初期セットアップをキャンセルしました";
      }
    } else {
      // 空のシートの場合
      const response = ui.alert(
        "🚀 初期セットアップ",
        "空のシートに画像生成用のワークスペースを作成します。\n\n" +
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
    throw new Error(`初期セットアップに失敗しました: ${error.message}`);
  }
}

/**
 * サイドバーを表示
 */
function showSidebar() {
  try {
    const html = HtmlService.createHtmlOutputFromFile("Sidebar")
      .setTitle("DALL-E 画像生成ツール")
      .setWidth(350);
    SpreadsheetApp.getUi().showSidebar(html);
  } catch (error) {
    SpreadsheetApp.getUi().alert(
      "エラー",
      "サイドバーの表示に失敗しました: " + error.message,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
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
 * シートに画像を挿入
 */
function insertImages(imageResults, rangeA1) {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();
    const range = sheet.getRange(rangeA1);
    const values = range.getValues();
    const numRows = values.length;
    const numCols = values[0].length;

    let imageIndex = 0;

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
          const targetCell = sheet.getRange(
            range.getRow() + r,
            range.getColumn() + c
          );
          const imageUrl = imageResults[imageIndex].url;

          // IMAGE関数を使用して画像を表示
          targetCell.setFormula(`=IMAGE("${imageUrl}", 1)`);

          // セルのサイズを調整
          sheet.setRowHeight(range.getRow() + r, 200);
          sheet.setColumnWidth(range.getColumn() + c, 200);

          imageIndex++;
        }
      }
    }

    return `${imageIndex}枚の画像をシートに挿入しました`;
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
 * プロンプト入力用の簡単な表を作成
 */
function createPromptInputTable() {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();

    // 空いている行を見つける
    const lastRow = sheet.getLastRow();
    const startRow = lastRow + 2;

    // 見出しを作成
    const headers = ["プロンプト入力欄"];
    const headerRange = sheet.getRange(startRow, 1, 1, 1);
    headerRange.setValues([headers]);
    headerRange.setBackground("#34a853");
    headerRange.setFontColor("white");
    headerRange.setFontWeight("bold");
    headerRange.setHorizontalAlignment("center");

    // 入力欄を5行作成
    const inputRows = Array(5).fill([""]);
    const inputRange = sheet.getRange(startRow + 1, 1, 5, 1);
    inputRange.setValues(inputRows);
    inputRange.setBorder(true, true, true, true, true, true);

    // 列幅を調整
    sheet.setColumnWidth(1, 300);

    // 入力範囲を選択状態にする
    sheet.setActiveRange(inputRange);

    return `プロンプト入力表を作成しました（行 ${startRow}～${startRow + 5}）`;
  } catch (error) {
    console.error("入力表作成エラー:", error);
    throw new Error(`入力表の作成に失敗しました: ${error.message}`);
  }
}

/**
 * 改善されたプロンプト入力エリアを作成
 */
function createPromptInputArea() {
  return createPromptInputAreaAt(4);
}

/**
 * 画像生成と表作成を同時に実行
 */
function generateImagesAndCreateTable(prompts) {
  try {
    // 画像を生成
    const imageResults = generateImages(prompts);

    // 表を作成
    const tableResult = createImageTable(imageResults);

    return {
      imageResults: imageResults,
      tableMessage: tableResult,
    };
  } catch (error) {
    console.error("画像生成・表作成エラー:", error);
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

      case "append":
        // 既存データの下に追加（正確な最終行を検出）
        startRow = findLastDataRow() + 3; // 2行空白を追加
        break;

      case "new":
        // 新規作成
        startRow = 1;
        break;
    }

    // ワークスペースを作成
    createWorkspace(startRow);

    return "🎉 セットアップ完了！プロンプト入力エリアを作成しました！";
  } catch (error) {
    console.error("セットアップ実行エラー:", error);
    throw new Error(`セットアップの実行に失敗しました: ${error.message}`);
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

    // 元のシートをクリア
    currentSheet.clear();

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
 * ワークスペースを作成
 */
function createWorkspace(startRow) {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();

    // タイトルエリアを作成
    const titleRange = sheet.getRange(startRow, 1, 1, 5);
    titleRange.merge();
    titleRange.setValue("🎨 DALL-E 画像生成ツール");
    titleRange.setBackground("#1a73e8");
    titleRange.setFontColor("white");
    titleRange.setFontSize(16);
    titleRange.setFontWeight("bold");
    titleRange.setHorizontalAlignment("center");
    titleRange.setVerticalAlignment("middle");
    sheet.setRowHeight(startRow, 50);

    // 説明エリア
    const instructionRange = sheet.getRange(startRow + 1, 1, 1, 5);
    instructionRange.merge();
    instructionRange.setValue(
      "📝 下記にプロンプトを入力して、範囲選択後にサイドバーから「表形式で生成」をクリック"
    );
    instructionRange.setBackground("#fff3e0");
    instructionRange.setFontColor("#ef6c00");
    instructionRange.setHorizontalAlignment("center");
    instructionRange.setWrap(true);
    sheet.setRowHeight(startRow + 1, 40);

    // プロンプト入力エリアを作成
    createPromptInputAreaAt(startRow + 3);
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

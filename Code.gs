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
 * スプレッドシート起動時にメニューを追加
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu("画像ツール")
    .addItem("サイドバーを開く", "showSidebar")
    .addItem("設定を確認", "checkSettings")
    .addToUi();
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
 * シートに見出し付きの表を作成
 */
function createImageTable(imageResults) {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();

    // 空いている行を見つける（最後のデータの下）
    const lastRow = sheet.getLastRow();
    const startRow = lastRow + 2; // 2行空けて開始

    // 見出し行を作成
    const headers = [
      "No.",
      "プロンプト",
      "生成画像",
      "修正プロンプト",
      "生成日時",
    ];
    const headerRange = sheet.getRange(startRow, 1, 1, headers.length);
    headerRange.setValues([headers]);

    // 見出し行のスタイルを設定
    headerRange.setBackground("#4285f4");
    headerRange.setFontColor("white");
    headerRange.setFontWeight("bold");
    headerRange.setHorizontalAlignment("center");

    // データ行を作成
    const currentTime = new Date().toLocaleString("ja-JP");
    const dataRows = imageResults.map((result, index) => [
      index + 1,
      result.prompt,
      `=IMAGE("${result.url}", 1)`,
      result.revised_prompt || result.prompt,
      currentTime,
    ]);

    if (dataRows.length > 0) {
      const dataRange = sheet.getRange(
        startRow + 1,
        1,
        dataRows.length,
        headers.length
      );
      dataRange.setValues(dataRows);

      // データ行のスタイルを設定
      dataRange.setBorder(true, true, true, true, true, true);
      dataRange.setVerticalAlignment("middle");

      // 列幅を調整
      sheet.setColumnWidth(1, 50); // No.
      sheet.setColumnWidth(2, 200); // プロンプト
      sheet.setColumnWidth(3, 150); // 生成画像
      sheet.setColumnWidth(4, 200); // 修正プロンプト
      sheet.setColumnWidth(5, 120); // 生成日時

      // 画像行の高さを調整
      for (let i = 0; i < dataRows.length; i++) {
        sheet.setRowHeight(startRow + 1 + i, 120);
      }
    }

    return `${
      imageResults.length
    }件のデータを表形式で追加しました（行 ${startRow}～${
      startRow + dataRows.length
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
 * エラーログを記録
 */
function logError(functionName, error) {
  console.error(`[${functionName}] エラー:`, error);
  // 必要に応じてスプレッドシートにログを記録することも可能
}

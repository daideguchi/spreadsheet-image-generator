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
 * エラーログを記録
 */
function logError(functionName, error) {
  console.error(`[${functionName}] エラー:`, error);
  // 必要に応じてスプレッドシートにログを記録することも可能
}

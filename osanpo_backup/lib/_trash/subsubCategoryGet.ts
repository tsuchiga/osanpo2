// subsubCategoryGet.ts
import { chromium, Browser, Page } from 'playwright';
import * as fs from 'fs/promises'; // ファイル操作のためにfsモジュールをインポート

interface Subject {
    value: string;
    label: string;
}

export async function subsubCategoryGet() {
    let browser: Browser | null = null;
    try {
        // ブラウザの起動（ヘッドレスモード）
        browser = await chromium.launch({ headless: true });
        const page: Page = await browser.newPage();

        // ターゲットURLに移動（実際のURLに置き換えてください）
        const TARGET_URL = 'https://www.hellowork.mhlw.go.jp/info/industry_list03.html'; // 実際のURLに変更してください
        await page.goto(TARGET_URL, { waitUntil: 'networkidle' });

        // テーブルのセレクタを定義（クラス名に基づく）
        const tableSelector = 'table.codes.tdw8.green.ta_middle.cell_p05.pcw80p_spw100p';

        // 全ての該当するテーブル要素を取得
        const tables = await page.$$(tableSelector);
        if (tables.length === 0) {
            throw new Error(`指定されたテーブルが見つかりませんでした: ${tableSelector}`);
        }

        // 結果を格納する配列
        const subjects: Subject[] = [];

        // 各テーブルをループ処理
        for (const table of tables) {
            // 全ての行（tr）を取得
            const rows = await table.$$('tbody > tr');

            for (const row of rows) {
                // 各行のtd要素を取得
                const tds = await row.$$('td');
                if (tds.length >= 2) { // 最低2つのtdがあることを確認
                    // 1つ目のtdからvalueを取得
                    const value = (await tds[0].innerText()).trim();

                    // 2つ目のtdからlabelを取得
                    const label = (await tds[1].innerText()).trim();

                    // valueが3桁の数字であることを確認（例: '010'）
                    if (/^\d{3}$/.test(value)) {
                        subjects.push({
                            value,
                            label,
                        });
                    }
                }
            }
        }

        // 取得した配列を表示
        console.log('取得したデータ:', subjects);
        console.log('処理が完了しました');

        // 結果をテキストファイルに出力
        const outputFilePath = 'output.txt';

        // データを整形（各行に "value,label" の形式で出力）
        const fileContent = subjects.map(subject => `value: ${subject.value}, label: ${subject.label}`).join('\n');

        // ファイルに書き込む
        await fs.writeFile(outputFilePath, fileContent, 'utf-8');

        console.log(`データがファイルに保存されました: ${outputFilePath}`);
    } catch (error) {
        console.error('全体の処理中にエラーが発生しました:', error);
    } finally {
        // ブラウザを閉じる
        if (browser) {
            await browser.close();
        }
    }
}
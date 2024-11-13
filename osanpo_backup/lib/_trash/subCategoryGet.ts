// subCategoryGet.ts
import { chromium, Browser, Page } from 'playwright';

interface Subject {
    value: string;
    label: string;
}

export async function subCategoryGet() {
    let browser: Browser | null = null;
    try {
        // ブラウザの起動
        browser = await chromium.launch({ headless: true });
        const page: Page = await browser.newPage();

        // ターゲットURLに移動（実際のURLに置き換えてください）
        const TARGET_URL = 'https://www.hellowork.mhlw.go.jp/info/industry_list02.html#bunrui_top_R'; // 実際のURLに変更してください
        await page.goto(TARGET_URL, { waitUntil: 'networkidle' });

        // 取得したいリンクのセレクタ
        const linkSelector = 'a[href^="../info/industry_list03.html#bunrui_top_"]';

        // 全てのマッチするリンクを取得
        const links = await page.$$(linkSelector);

        // 結果を格納する配列
        const subjects: Subject[] = [];

        for (const link of links) {
            const href = await link.getAttribute('href');
            if (href) {
                // ハッシュ部分が#bunrui_top_01から#bunrui_top_99までかを確認
                const match = href.match(/#bunrui_top_(\d{2})$/);
                if (match) {
                    const num = match[1]; // '01'から'99'の文字列
                    const numInt = parseInt(num, 10);
                    if (numInt >= 1 && numInt <= 99) {
                        const text = await link.innerText();
                        subjects.push({
                            value: num,
                            label: text.trim(),
                        });
                    }
                }
            }
        }

        // 取得した配列を表示
        console.log('取得したデータ:', subjects);

        console.log('処理が完了しました');
    } catch (error) {
        console.error('全体の処理中にエラーが発生しました:', error);
    } finally {
        // ブラウザを閉じる
        if (browser) {
            await browser.close();
        }
    }
}

// 関数を実行する（オプション）
// subjectGet();
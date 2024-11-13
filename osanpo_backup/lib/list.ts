// lib/list.ts

import { chromium, Page, ElementHandle } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs-extra';
import path from 'path';
import { parse } from 'csv-parse/sync';
import iconv from 'iconv-lite';

// 環境変数の読み込み
dotenv.config();

// Supabaseの設定
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';
export const supabase = createClient(supabaseUrl, supabaseKey);

// 青森県以降の都道府県リストを定義
const targetPrefectures = [
  '埼玉県',
  '千葉県',
  '東京都',
  '神奈川県',
  '新潟県',
  '富山県',
  '石川県',
  '福井県',
  '山梨県',
  '長野県',
  '岐阜県',
  '静岡県',
  '愛知県',
  '三重県',
  '滋賀県',
  '京都府',
  '大阪府',
  '兵庫県',
  '奈良県',
  '和歌山県',
  '鳥取県',
  '島根県',
  '岡山県',
  '広島県',
  '山口県',
  '徳島県',
  '香川県',
  '愛媛県',
  '高知県',
  '福岡県',
  '佐賀県',
  '長崎県',
  '熊本県',
  '大分県',
  '宮崎県',
  '鹿児島県',
  '沖縄県',
];

async function getRegions(page: Page): Promise<{
  prefectureName: string;
  regions: { value: string; text: string }[];
}[]> {
  console.log('地域リストを取得しています...');

  // ページの完全な読み込みを待機
  await page.waitForLoadState('domcontentloaded');

  // 'table.col2' が存在するか確認
  const tables = await page.$$('table.col2');
  console.log(`取得したテーブルの数: ${tables.length}`);

  const regionsData = [];

  for (const table of tables) {
    // 都道府県名を取得し、「市区町村」を削除
    const rawPrefectureName = await table.$eval('th', th => th.textContent?.trim() || '');
    const prefectureName = rawPrefectureName.replace('市区町村', '').trim();
    console.log(`都道府県名を取得: ${prefectureName}`);

    // 北海道まで取得済みなので、青森県以降を対象とする
    if (!targetPrefectures.includes(prefectureName)) {
      console.log(`都道府県 "${prefectureName}" は対象外です。`);
      continue;
    }

    // オプションを取得
    const selectElement = await table.$('select[name="global"]');
    if (!selectElement) {
      console.warn(`都道府県 "${prefectureName}" の selectElement が見つかりません。`);
      continue;
    }
    const options = await selectElement.$$eval('option', options =>
      options
        .filter(option => option.getAttribute('value') && option.getAttribute('value') !== '')
        .map(option => ({
          value: option.getAttribute('value') as string,
          text: option.textContent?.trim() || '',
        }))
    );
    console.log(`取得したオプション数: ${options.length}`);

    regionsData.push({
      prefectureName,
      regions: options,
    });
  }

  console.log('地域リストの取得が完了しました。');
  return regionsData;
}

async function selectRegion(
  page: Page,
  prefectureName: string,
  regionValue: string
) {
  console.log(`地域を選択中: ${regionValue}`);

  // 都道府県のテーブルを取得
  const table = await page.$(`table.col2:has(th:has-text("${prefectureName}"))`);
  if (!table) {
    console.error(`都道府県 "${prefectureName}" のテーブルが見つかりません。`);
    return;
  }

  // 最新の selectElement を取得
  const selectElement = await table.$('select[name="global"]');
  if (!selectElement) {
    console.error(`都道府県 "${prefectureName}" の selectElement が見つかりません。`);
    return;
  }

  // 最新の buttonElement を取得
  const buttonElement = await table.$('input[type="submit"][value$="市区町村を選択"]');
  if (!buttonElement) {
    console.error(`都道府県 "${prefectureName}" の buttonElement が見つかりません。`);
    return;
  }

  await selectElement.evaluate((element) => {
    element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
  });
  await selectElement.selectOption(regionValue);
  await page.waitForLoadState('networkidle');
  console.log(`地域を選択しました: ${regionValue}`);

  await buttonElement.evaluate((element) => {
    element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
  });
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle' }),
    buttonElement.click(),
  ]);
  console.log('市区町村選択ボタンをクリックしました。');
}

// CSVをダウンロード
async function downloadCSV(page: Page, regionText: string): Promise<string | null> {
  try {
    console.log(`CSVをダウンロードしています: ${regionText}`);

    // ボタンが表示されるまで待機
    await page.waitForSelector('input[type="submit"][value="CSVダウンロード"]', { timeout: 10000 });

    const downloadButton = await page.$('input[type="submit"][value="CSVダウンロード"]');
    if (!downloadButton) {
      console.error('CSVダウンロードボタンが見つかりません。');
      return null;
    }

    // ボタンをスクロールして表示
    await downloadButton.evaluate((element) => {
      element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    });

    // CSVダウンロードを実行
    const downloadPromise = page.waitForEvent('download');
    await downloadButton.click();
    const download = await downloadPromise;

    // 保存先のディレクトリを作成
    const dirPath = path.join('downloads');
    await fs.mkdirp(dirPath);

    // ダウンロードしたCSVを保存
    const fileName = `${regionText}.csv`;
    const filePath = path.join(dirPath, fileName);
    await download.saveAs(filePath);

    console.log(`CSVをダウンロードしました: ${filePath}`);
    return filePath;
  } catch (error) {
    console.error(`CSVダウンロード中にエラーが発生しました (${regionText}):`, error);
    return null;
  }
}

// 広告を閉じる関数
async function closeAds(page: Page) {
  try {
    console.log('広告を閉じています...');
    // メインページ内の広告を閉じる
    const mainCloseButtons = await page.$$(
      'div[aria-label="Close"], div[aria-label="閉じる"], button[aria-label="Close"], button[aria-label="閉じる"],' +
      ' .ad_close, .ad-close, .popup-close, .modal-close, .lightbox-close, .close-button, .close-btn'
    );
    for (const closeButton of mainCloseButtons) {
      try {
        await closeButton.click({ force: true });
        console.log('メインページの広告を閉じました');
      } catch (error) {
        // クリックできない場合は無視
      }
    }

    // 同一オリジンの iframe を取得
    const frames = page.frames().filter(frame => frame.url().startsWith(page.url()));

    for (const frame of frames) {
      // フレーム内の広告の閉じるボタンを探す
      const closeButtons = await frame.$$(
        'div[aria-label="Close"], div[aria-label="閉じる"], button[aria-label="Close"], button[aria-label="閉じる"],' +
        ' .ad_close, .ad-close, .popup-close, .modal-close, .lightbox-close, .close-button, .close-btn'
      );

      for (const closeButton of closeButtons) {
        try {
          await closeButton.click({ force: true });
          console.log('フレーム内の広告を閉じました');
        } catch (error) {
          // クリックできない場合は無視
        }
      }
    }
  } catch (error) {
    console.log('広告を閉じる処理でエラーが発生しましたが、続行します');
  }
}

// CSVをSupabaseに保存する関数
async function saveCSVToSupabase(filePath: string) {
  try {
    console.log(`CSVデータをSupabaseに保存しています: ${filePath}`);
    // ファイルをバッファとして読み込む
    const fileBuffer = await fs.readFile(filePath);
    // Shift_JIS エンコーディングでデコード
    const fileContent = iconv.decode(fileBuffer, 'Shift_JIS');

    // ファイル内容を行ごとに分割
    const lines = fileContent.split('\n');

    // ヘッダー行のインデックスを検索
    const headerIndex = lines.findIndex(line => line.includes('会社名'));

    if (headerIndex === -1) {
      console.error('CSVファイルにヘッダー行が見つかりませんでした。');
      return;
    }

    // ヘッダー行以降のデータを取得
    const csvContent = lines.slice(headerIndex).join('\n');

    // CSVをパース
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true, // カラム数の不一致を許容
    });

    // テーブル名を指定
    const tableName = 'companies';

    // 'N.A.' を null に変換する関数
    const replaceNA = (value: string): string | null => {
      if (!value || value.trim().toLowerCase() === 'n.a.' || value.trim() === '') {
        return null;
      }
      return value;
    };

    // データをSupabaseに挿入
    for (const record of records) {
      // カラム名を英語にマッピングし、'N.A.' を null に変換
      const data = {
        company_name: replaceNA(record['会社名']),
        postal_code: replaceNA(record['郵便番号']),
        prefecture: replaceNA(record['都道府県']),
        city: replaceNA(record['市区町村']),
        address: replaceNA(record['住所']),
        phone_number: replaceNA(record['電話番号']),
        fax_number: replaceNA(record['FAX番号']),
        source_url: replaceNA(record['出典URL']),
        category: replaceNA(record['カテゴリ']),
      };

      // データを挿入（upsertを使用）
      const { error } = await supabase
        .from(tableName)
        .upsert([data], { onConflict: 'phone_number' });

      if (error) {
        console.error('データの挿入中にエラーが発生しました:', error);
      } else {
        console.log(`データを挿入または更新しました: ${data.company_name}`);
      }
    }
  } catch (error) {
    console.error('CSVファイルの処理中にエラーが発生しました:', error);
  }
}

export async function scrapeListoss() {
  const browser = await chromium.launch({ headless: false });

  const context = await browser.newContext({
    locale: 'ja-JP',
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)' +
      ' Chrome/94.0.4606.81 Safari/537.36',
  });

  // 'navigator.webdriver' を隠す
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', {
      get: () => false,
    });
  });

  const page = await context.newPage();

  // デバッグ情報をキャプチャ
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.error('PAGE ERROR:', error));
  page.on('requestfailed', request =>
    console.error('REQUEST FAILED:', request.url(), request.failure())
  );
  page.on('response', response => {
    if (!response.ok()) {
      console.error(`RESPONSE ERROR: ${response.status()} ${response.url()}`);
    }
  });

  // リソースブロッキングを再有効化
  await page.route('**/*', route => {
    const url = route.request().url();
    const blockedResources = [
      'doubleclick.net',
      'adservice.google.com',
      'adservice.google.co.jp',
      'tpc.googlesyndication.com',
      'googlesyndication.com/pagead',
      'googlesyndication.com/pagead/js/adsbygoogle.js',
      'googlesyndication.com/pagead/gen_204',
      'ads.pubmatic.com',
      'adsafeprotected.com',
      'adnxs.com',
      'adsrvr.org',
      'rfihub.com',
      'facebook.net',
      'facebook.com',
      'analytics.google.com',
      'googletagmanager.com',
      'google-analytics.com',
      'stats.g.doubleclick.net',
      'pixel.mathtag.com',
      'px.ads.linkedin.com',
      'fls.doubleclick.net',
      'cm.g.doubleclick.net',
    ];
    if (blockedResources.some(resource => url.includes(resource))) {
      route.abort();
    } else {
      route.continue();
    }
  });

  // ログインページにアクセス
  console.log('ログインエラーページにアクセスしています...');
  await page.goto('https://listoss.com/user/session/error.php');

  // ログインリンクをクリック
  console.log('ログインリンクを探しています...');
  const loginLink = await page.getByRole('link', { name: 'ログインページに戻る' });
  await loginLink.scrollIntoViewIfNeeded();
  await loginLink.click();
  console.log('ログインリンクをクリックしました。');

  // メールアドレスとパスワードを入力
  const email = process.env.LISTOSS_EMAIL || '';
  const password = process.env.LISTOSS_PASSWORD || '';

  if (!email || !password) {
    console.error('環境変数 LISTOSS_EMAIL と LISTOSS_PASSWORD を設定してください。');
    await browser.close();
    return;
  }

  console.log('メールアドレスとパスワードを入力しています...');
  await page.locator('input[name="mail"]').fill(email);
  await page.locator('input[name="pass"]').fill(password);

  // ログインボタンをクリック
  console.log('ログインボタンをクリックしています...');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle' }),
    page.getByRole('button', { name: 'ログイン' }).click(),
  ]);

  // ログイン成功の確認
  await page.waitForSelector('text=ログアウト', { timeout: 10000 });
  const loginSuccess = await page.$('text=ログアウト');
  if (loginSuccess) {
    console.log('ログインに成功しました');
  } else {
    console.error('ログインに失敗しました。');
    await browser.close();
    return;
  }

  // ページの完全な読み込みを待機
  await page.waitForLoadState('networkidle');

  // 「地域検索」のリンクをクリック
  console.log('「地域検索」のリンクを探しています...');
  await page.waitForSelector('a[href*="data_form.php?category=area"]', {
    state: 'visible',
    timeout: 10000,
  });
  const regionSearchLink = await page.$('a[href*="data_form.php?category=area"]');
  if (regionSearchLink) {
    console.log('「地域検索」のリンクをクリックしています...');
    await Promise.all([
      regionSearchLink.click(),
      page.waitForNavigation({ waitUntil: 'networkidle' }),
    ]);
    console.log('地域検索ページに移動しました');
  } else {
    console.error('地域検索リンクが見つかりません。');
    await browser.close();
    return;
  }

  // 現在の URL を確認
  console.log('現在の URL:', page.url());

  // 地域のセレクトボックスが読み込まれるまで待機
  await page.waitForSelector('select[name="global"]', { timeout: 10000 });

  // 地域リストを取得
  console.log('地域リストを取得しています...');
  const regionsData = await getRegions(page);

  // 取得した地域を確認
  if (regionsData.length === 0) {
    console.error('地域リストが取得できませんでした。スクリプトを終了します。');
    await browser.close();
    return;
  }

  for (const regionData of regionsData) {
    const { prefectureName, regions } = regionData;
    console.log(`都道府県を処理中: ${prefectureName}`);

    for (const region of regions) {
      console.log(`市区町村を処理中: ${region.text}`);

      // 地域を選択
      await selectRegion(page, prefectureName, region.value);

      // 広告を閉じる
      await closeAds(page);

      // CSVをダウンロード
      const filePath = await downloadCSV(page, region.text);

      // 広告を閉じる
      await closeAds(page);

      // CSVファイルを読み込み、Supabaseに保存
      if (filePath) {
        await saveCSVToSupabase(filePath);
      }

      // 元のページに戻る
      await page.goBack({ waitUntil: 'networkidle' });
    }
  }

  await browser.close();
}

// スクリプトを実行
scrapeListoss().catch(console.error);

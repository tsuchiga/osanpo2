import { chromium, Page } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import { subject } from './subject';
import { area, sector } from './select';

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_KEY || "";
export const supabase = createClient(supabaseUrl, supabaseKey);

export async function walk(startS: number, startA: number) {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // 再開地点のインデックスを指定
  const startSIndex = startS;
  const startAIndex = startA;

  for (let sIndex = startSIndex; sIndex < sector.length; sIndex++) {
    const s = sector[sIndex];

    let aStartIndex = 0;
    // 最初の職種の場合、エリアの開始インデックスを調整
    if (sIndex === startSIndex) {
      aStartIndex = startAIndex;
    }

    for (let aIndex = aStartIndex; aIndex < area.length; aIndex++) {
      const a = area[aIndex];

      try {
        await page.goto('https://www.hellowork.mhlw.go.jp/kensaku/GECA110010.do?action=initDisp&screenId=GECA110010');
        await page.waitForTimeout(1000);
        console.log('初期ページにアクセスしました');

        await page.click('a#ID_sksu1ClearBtn');
        await page.waitForTimeout(1000);
        console.log('職種をリセットしました');

        const buttonSelector1 = 'button[onclick*="openShokushuAssist(\'3\',\'kiboSuruSKSU1Hidden\',\'kiboSuruSKSU1Label\')"]';
        await page.click(buttonSelector1);
        await page.waitForTimeout(1000);
        console.log('職種ボタンを押しました');

        const buttonSelector2 = `i.one_i[alt="${s.label} 下位を開く、または閉じる"]`;
        await page.click(buttonSelector2);
        await page.waitForTimeout(1000);
        console.log(`${s.label}を選択しました`);

        await page.click(s.value);
        await page.waitForTimeout(1000);
        console.log('こだわらないにチェックしました');

        await page.click('#ID_ok3');
        await page.waitForTimeout(1000);
        console.log('決定ボタンを押しました');

        await page.locator('select[name="tDFK1CmbBox"]').selectOption(a.value);
        await page.waitForTimeout(1000);
        console.log(`${a.label}を選択しました`);

        await page.click('#ID_searchBtn');
        await page.waitForTimeout(1000);
        console.log('検索ボタンを押しました');

        await page.selectOption('#ID_fwListNaviDispTop', '50');
        await page.waitForTimeout(1000);
        console.log('50件表示にしました');

        await page.selectOption('#ID_fwListNaviSortTop', '2');
        await page.waitForTimeout(1000);
        console.log('紹介期限日順にしました');

        await Scrape(page, a.label, s.label);

      } catch (error) {
        console.error(`${a.label} の処理中にエラーが発生しました:`, error);
        continue;
      }
    }
  }
  await browser.close();
}

export async function Scrape(page: Page, a: string, sector: string) {
  let isDisabled = false;
  while (!isDisabled) {
    try {

      const tdElements = await page.$$('td.fb.in_width_9em');

      // "事業所名" というテキストを持つ要素のみをフィルタリング
      const filteredTdElements = [];
      for (const element of tdElements) {
        const text = await page.evaluate(el => el.textContent?.trim(), element);
        if (text === '事業所名') {
          filteredTdElements.push(element);
        }
      }

      // 全ての<a#ID_dispDetailBtn>要素を取得
      const elements = await page.$$('a#ID_dispDetailBtn');

      for (let i = 0; i < filteredTdElements.length; i++) {
        const td = filteredTdElements[i];

        // テキストが「事業所名」であるかを確認
        const textContent = await td.evaluate(el => el.textContent?.trim());
        if (textContent !== '事業所名') {
          continue;
        }

        // 次の兄弟要素の<td>を取得
        const nextTdHandle = await td.evaluateHandle((el: Element) => el.nextElementSibling);
        const nextTdElement = nextTdHandle.asElement();
        if (!nextTdElement) {
          console.log('次の兄弟<td>要素が見つかりませんでした。次の要素へ移動します。');
          continue;
        }

        // 'div'要素のテキストを取得
        const div = await nextTdElement.$('div');
        const divText = await div?.evaluate(el => el.textContent?.trim());

        if (divText === '（事業所の意向により公開していません）') {
          console.log('会社名が非公開のため、次の要素をチェックします。');
          continue;
        }

        if (!divText) {
          console.log('div要素のテキストを取得できませんでした。次の要素へ移動します。');
          continue;
        }

        try {
          // Supabaseで同じ会社名が存在するかチェック
          const { data: existingData, error: checkError } = await supabase
            .from('Walk')
            .select('CompanyName')
            .eq('CompanyName', divText.trim())
            .limit(1);

          if (checkError) {
            console.error('Supabaseのクエリでエラーが発生しました:', checkError);
            continue;
          }

          if (existingData && existingData.length > 0) {
            console.log(`会社名 ${divText} は既に存在します。次の要素をチェックします。`);
            continue;
          } else {
            console.log(`会社名 ${divText} は存在しません。詳細ページを処理します。`);

            // 同じiを持つ<a#ID_dispDetailBtn>に対して処理
            const detailButton = elements[i];

            // 新しいページ（ポップアップ）を待機してクリック
            const [newPage] = await Promise.all([
              page.waitForEvent('popup'),
              detailButton.click(),
            ]);

            await newPage.waitForLoadState();
            await page.waitForTimeout(1000);

            // 事業所番号が存在するかをチェック
            const jobNumberElement = await newPage.$('div#ID_jgshNo');
            let jobNumber = '';
            if (!jobNumberElement) {
              console.log('このページには事業所番号が存在しません。ページを閉じます。');
              await newPage.close();
              continue;
            } else {
              jobNumber = (await jobNumberElement.textContent())?.trim() || '番号なし';
            }

            // Supabaseで同じ事業所番号が存在するかチェック
            const { data: existingJobData, error: jobCheckError } = await supabase
              .from('Walk')
              .select('CompanyNumber')
              .eq('CompanyNumber', jobNumber)
              .limit(1);

            if (jobCheckError) {
              console.error('Supabaseのクエリでエラーが発生しました:', jobCheckError);
              await newPage.close();
              continue;
            }

            if (existingJobData && existingJobData.length > 0) {
              console.log(`事業所番号 ${jobNumber} は既に存在します。ページを閉じます。`);
              await newPage.close();
              continue;
            }

            // 事業所番号が新規の場合は処理を続行
            console.log(`事業所番号 ${jobNumber} が新規です。データを保存します。`);

            // 変数を定義
            let reception = 'テキストなし';
            let introduction = 'テキストなし';
            let industry = 'テキストなし';
            let companyNumber = 'テキストなし';
            let companyName = 'テキストなし';
            let companyAddress = 'テキストなし';
            let homePage = 'テキストなし';
            let pageState = 'テキストなし'; // ページ検出状況
            let kind = 'テキストなし'; // 職種
            let jobKind = 'テキストなし';
            let jobContent = 'テキストなし';
            let area = 'テキストなし'; // エリア
            let jobAddress = 'テキストなし';
            let employee = 'テキストなし';
            let establishment = 'テキストなし';
            let capital = 'テキストなし';
            let companyContent = 'テキストなし';
            let companyFeature = 'テキストなし';
            let representativePost = 'テキストなし';
            let representativeName = 'テキストなし';
            let corporateNumber = 'テキストなし';
            let chargePost = 'テキストなし';
            let chargeName = 'テキストなし';
            let tel = 'テキストなし';
            let email = 'テキストなし';

            // subject配列をループして全ての項目をチェック
            for (const item of subject) {
              try {
                const element = await newPage.$(item.value);

                let textContent = 'テキストなし';
                if (element) {
                  textContent = await element.textContent() || 'テキストなし';
                }
                // 各項目ごとに対応する変数に保存
                switch (item.label) {
                  case '受付年月日':
                    reception = textContent;
                    break;
                  case '紹介期限日':
                    introduction = textContent;
                    break;
                  case '産業分類':
                    industry = textContent;
                    break;
                  case '事業所番号':
                    companyNumber = textContent;
                    break;
                  case '事業所名':
                    companyName = textContent;
                    break;
                  case '所在地':
                    companyAddress = textContent;
                    break;
                  case 'ホームページ':
                    homePage = textContent.trim();
                    break;
                  case '職種':
                    jobKind = textContent;
                    break;
                  case '仕事内容':
                    jobContent = textContent;
                    break;
                  case '就業場所':
                    jobAddress = textContent;
                    break;
                  case '従業員数(企業全体)':
                    employee = textContent;
                    break;
                  case '設立年':
                    establishment = textContent;
                    break;
                  case '資本金':
                    capital = textContent;
                    break;
                  case '事業内容':
                    companyContent = textContent;
                    break;
                  case '会社の特長':
                    companyFeature = textContent;
                    break;
                  case '役職':
                    representativePost = textContent;
                    break;
                  case '代表者名':
                    representativeName = textContent;
                    break;
                  case '法人番号':
                    corporateNumber = textContent;
                    break;
                  case '課係名、役職名':
                    chargePost = textContent;
                    break;
                  case '担当者':
                    chargeName = textContent;
                    break;
                  case '電話番号':
                    tel = textContent;
                    break;
                  case 'Eメール':
                    email = textContent;
                    break;
                }
                console.log(`${item.label}: ${textContent}`);
              } catch (error) {
                console.error(`項目 ${item.label} の取得中にエラーが発生しました:`, error);
                continue;
              }
            }
            await newPage.close();

            // ページ検出状況
            pageState = homePage === 'テキストなし' ? '無' : 'HP有';
            // 職種
            kind = sector;
            console.log(kind);
            // エリア
            area = a;
            console.log(area);

            // supabaseに保存
            const { error } = await supabase.from("Walk").insert({
              Reception: reception,
              Introduction: introduction,
              Industry: industry,
              CompanyNumber: companyNumber,
              CompanyName: companyName,
              CompanyAddress: companyAddress,
              HomePage: homePage,
              PageState: pageState, // ページ検出状況
              Kind: kind, // 職種
              JobKind: jobKind,
              JobContent: jobContent,
              Area: area, // エリア
              JobAddress: jobAddress,
              Employee: employee,
              Establishment: establishment,
              Capital: capital,
              CompanyContent: companyContent,
              CompanyFeature: companyFeature,
              RepresentativePost: representativePost,
              RepresentativeName: representativeName,
              CorporateNumber: corporateNumber,
              ChargePost: chargePost,
              ChargeName: chargeName,
              Tel: tel,
              Email: email
            });
            if (error) {
              console.error('データベースへの保存中にエラーが発生しました:', error);
            }
          }
        } catch (err) {
          console.error('処理中にエラーが発生しました:', err);
          continue;
        }
      }

      await page.waitForTimeout(5000);
      isDisabled = await page.evaluate(() => {
        const nextButton = document.querySelector('input[name="fwListNaviBtnNext"]');
        return (nextButton as HTMLInputElement)?.disabled ?? true;
      });
      if (!isDisabled) {
        try {
          await page.click('input[name="fwListNaviBtnNext"]');
          await page.waitForTimeout(2000);
          console.log('次のページに移動します');
        } catch (error) {
          console.error('次のページへの移動中にエラーが発生しました:', error);
          break;
        }
      } else {
        console.log('次のページが存在しません。エリアを変えます');
      }
    } catch (error) {
      console.error('検索結果ページの処理中にエラーが発生しました:', error);
      break;
    }
  }
}
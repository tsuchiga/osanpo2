import { chromium } from 'playwright';

export async function walk(area: { value: string, label: string }, sector: { value: string, label: string }) {

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  await page.goto('https://www.hellowork.mhlw.go.jp/kensaku/GECA110010.do?action=initDisp&screenId=GECA110010');
  await page.waitForTimeout(1000);

  await page.locator('select[name="tDFK1CmbBox"]').selectOption(area.value);
  await page.waitForTimeout(1000);

  await page.click('a#ID_sksu1ClearBtn');
  await page.waitForTimeout(1000);
  console.log('クリアボタンを押しました');

  const buttonSelector1 = 'button[onclick*="openShokushuAssist(\'3\',\'kiboSuruSKSU1Hidden\',\'kiboSuruSKSU1Label\')"]';
  await page.click(buttonSelector1);
  await page.waitForTimeout(1000);

  const buttonSelector2 = `i.one_i[alt="${sector.label} 下位を開く、または閉じる"]`
  await page.click(buttonSelector2);
  await page.waitForTimeout(1000);

  await page.click(sector.value);
  await page.waitForTimeout(1000);

  await page.click('#ID_ok3');
  await page.waitForTimeout(1000);

  await page.click('#ID_searchBtn');
  await page.waitForTimeout(1000);

  let isDisabled = false;

  while (!isDisabled) {
    const elements = await page.$$('a#ID_dispDetailBtn');
    for (let i = 0; i < elements.length; i++) {
      const [newPage] = await Promise.all([
        page.waitForEvent('popup'), 
        elements[i].click(), 
        page.waitForTimeout(1000)
      ]);
      await newPage.waitForLoadState();
      await page.waitForTimeout(1000);
    
      // 会社名取得
      const companyNameElement = await newPage.$('div#ID_jgshMei');
      await page.waitForTimeout(1000);
      let companyName = '会社名なし';
      if (companyNameElement) {
        companyName = await companyNameElement.textContent() || '会社名なし';
        console.log('会社名:', companyName);
      } else {
        console.log('会社名なし');
      }
    
      // URL取得
      const linkElement = await newPage.$('a#ID_hp');
      await page.waitForTimeout(1000);
      let url = 'URLなし';
      if (linkElement) {
        url = await linkElement.getAttribute('href') || 'URLなし';
        console.log('リンクのURL:', url);
      } else {
        console.log('URLなし');
      }
    
      // newPageを閉じる
      await newPage.close();
      await page.waitForTimeout(1000);
    }

    isDisabled = await page.evaluate(() => {
      const nextButton = document.querySelector('input[name="fwListNaviBtnNext"]');
      return (nextButton as HTMLInputElement)?.disabled ?? true;
    });

    if (!isDisabled) {
      await page.click('input[name="fwListNaviBtnNext"]');
      await page.waitForTimeout(2000);
    } else {
      console.log('次のページが存在しません。処理を終了します。');
    }
  }
  await browser.close();
}
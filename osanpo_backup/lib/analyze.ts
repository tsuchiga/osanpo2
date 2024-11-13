import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import pLimit from 'p-limit';

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_KEY || "";
export const supabase = createClient(supabaseUrl, supabaseKey);

export async function analyze() {
    try {
        const pageSize = 1000;
        let from = 0;
        let to = pageSize - 1;
        let hasMoreData = true;
        let startFront = true;

        const browser = await chromium.launch();
        const limit = pLimit(5); // 並行処理の制限

        while (hasMoreData) {
            const { data, error } = await supabase
              .from('Walk')
              .select('CompanyNumber, CompanyName, HomePage')
              .in('PageState', ['HP有', 'CP不明'])
              .order('id', { ascending: startFront })
              .range(from, to);
            if (error) {
              console.error('Supabaseからのデータ取得エラー:', error);
              return;
            }

            if (data === null || data.length === 0) {
                console.log('対象データがありません');
                hasMoreData = false;
                break;
            }

            // 並列処理を制限付きで実行
            const processingPromises = data.map(row => limit(() => processRow(browser, row)));
            await Promise.all(processingPromises);

            // 次のバッチのために範囲を更新
            from += pageSize;
            to += pageSize;
        }
        await browser.close();
        console.log('全ての処理が完了しました');
    } catch (error) {
        console.error('全体の処理中にエラーが発生しました:', error);
    }
}

export async function processRow(browser: any, row: any) {
    const page = await browser.newPage();
    const number = row.CompanyNumber;
    const name = row.CompanyName;
    const url = row.HomePage;
    let state = 'string';
    let found = false;
    let foundUrl = '';
    let errorText = 'unknown'

    console.log(`処理開始: ${name} (${url})`);

    try {
        console.log(`HP有効の確認: ${name} (${url})`);
        const topResponse = await page.goto(url, { waitUntil: 'domcontentloaded' });
        if (topResponse && topResponse.status() === 200) {
            console.log('HP有効です')
            // HPの有効の為処理を開始
            try {
                console.log('/contactと/inquiryを確認します')
                const domain = new URL(url).origin;
                const contactUrl = `${domain}/contact`;
                // /contactを検索
                const contactResponse = await page.goto(contactUrl, { waitUntil: 'domcontentloaded' });
                if (contactResponse && contactResponse.status() === 200) {
                    foundUrl = contactUrl;
                    console.log(`${name} の /contact ページが存在します: ${contactUrl}`);
                } else {
                    console.log(`${name} の /contact ページが存在しません: ${contactUrl}`);
                    // /inquiryを検索
                    const inquiryUrl = `${domain}/inquiry`;
                    const inquiryResponse = await page.goto(inquiryUrl, { waitUntil: 'domcontentloaded' });
                    if (inquiryResponse && inquiryResponse.status() === 200) {
                        foundUrl = inquiryUrl;
                        console.log(`${name} の /inquiry ページが存在します: ${inquiryUrl}`);
                    } else {
                        console.log(`${name} の /inquiry ページが存在しません: ${inquiryUrl}`);
                    }
                }

                if (foundUrl) {
                    console.log('/contactと/inquiryの入力フィールドを確認します')
                    // 入力フィールドの取得
                    await page.goto(foundUrl, { waitUntil: 'domcontentloaded' });
                    const inputs = await page.$$('input');
                    const selects = await page.$$('select');
                    const textareas = await page.$$('textarea');
                    // inputフィルタリング
                    const relevantInputs = [];
                    for (const input of inputs) {
                        const inputType = (await input.getAttribute('type')) || '';
                        const inputName = (await input.getAttribute('name')) || '';
                        const inputId = (await input.getAttribute('id')) || '';
                        const inputClass = (await input.getAttribute('class')) || '';
                        const isSearchInput =
                            inputType === 'search' ||
                            inputName.toLowerCase().includes('search') ||
                            inputId.toLowerCase().includes('search') ||
                            inputClass.toLowerCase().includes('search');
                        if (
                            !isSearchInput &&
                            ['text', 'tel', 'email', 'checkbox', 'radio'].includes(inputType)
                        ) {
                            relevantInputs.push(input);
                        }
                    }
                    // textareaフィルタリング
                    const relevantTextareas = [];
                    for (const textarea of textareas) {
                        const textareaName = (await textarea.getAttribute('name')) || '';
                        if (!textareaName.includes('recaptcha')) {
                            relevantTextareas.push(textarea);
                        }
                    }
                    // フィールドの合計
                    const totalFields = relevantInputs.length + selects.length + relevantTextareas.length;
                    if (totalFields < 3 || relevantTextareas.length == 0) {

                        console.log('入力フィールドが３つ以下なのでリンク先に候補がないか探します');
                        const inquiryLinks: string[] = await page.$$eval('a', (anchors: HTMLAnchorElement[]) => 
                            anchors
                                .filter(anchor => {
                                    const text = (anchor.textContent || '').trim();
                                    return text.includes('お問合せ') || text.includes('お問い合わせ') || text.includes('問合せ');
                                })
                                .map(anchor => anchor.href)
                        );
                    
                        if (inquiryLinks.length > 0) {
                            console.log('お問合せに関するリンクを見つけました。リンクをたどって入力フィールドを確認します');
                    
                            for (const link of inquiryLinks) {
                                console.log(`訪問するリンク: ${link}`);
                                await page.goto(link, { waitUntil: 'domcontentloaded' });
                    
                                // 入力フィールドの取得
                                const inputs = await page.$$('input');
                                const selects = await page.$$('select');
                                const textareas = await page.$$('textarea');
                    
                                // inputフィルタリング
                                const relevantInputs = [];
                                for (const input of inputs) {
                                    const inputType = (await input.getAttribute('type')) || '';
                                    const inputName = (await input.getAttribute('name')) || '';
                                    const inputId = (await input.getAttribute('id')) || '';
                                    const inputClass = (await input.getAttribute('class')) || '';
                                    const isSearchInput =
                                        inputType === 'search' ||
                                        inputName.toLowerCase().includes('search') ||
                                        inputId.toLowerCase().includes('search') ||
                                        inputClass.toLowerCase().includes('search');
                                    if (
                                        !isSearchInput &&
                                        ['text', 'tel', 'email', 'checkbox', 'radio'].includes(inputType)
                                    ) {
                                        relevantInputs.push(input);
                                    }
                                }
                    
                                // textareaフィルタリング
                                const relevantTextareas = [];
                                for (const textarea of textareas) {
                                    const textareaName = (await textarea.getAttribute('name')) || '';
                                    if (!textareaName.includes('recaptcha')) {
                                        relevantTextareas.push(textarea);
                                    }
                                }
                    
                                // フィールドの合計
                                const totalFields = relevantInputs.length + selects.length + relevantTextareas.length;
                                if (totalFields >= 3 && relevantTextareas.length > 0) {
                                    console.log('入力フィールドが3つ以上見つかりました');
                                    found = true;
                                    foundUrl = link; // 新たなURLを設定
                                    break;
                                } else {
                                    console.log('入力フィールドが3つ未満です');
                                }
                            }
                        } else {
                            console.log('お問合せに関するリンクが見つかりませんでした');
                        }
                    } else {
                        found = true;
                    }
                }

                if (!found) {
                    console.log('お問合せに関する文字を探します')
                    await page.goto(url, { waitUntil: 'domcontentloaded' });
                    const inquiryLinks: string[] = await page.$$eval('a', (anchors: HTMLAnchorElement[]) => 
                        anchors
                            .filter(anchor => {
                                const text = (anchor.textContent || '').trim();
                                return text.includes('お問合せ') 
                                || text.includes('お問い合わせ') 
                                || text.includes('問合せ')
                                || text.includes('Contact')
                                || text.includes('contact')
                            })
                            .map(anchor => anchor.href)
                    );
                
                    if (inquiryLinks.length > 0) {
                        console.log('お問合せに関するリンクを見つけました。リンクをたどって入力フィールドを確認します');
                
                        for (const link of inquiryLinks) {
                            console.log(`訪問するリンク: ${link}`);
                            await page.goto(link, { waitUntil: 'domcontentloaded' });
                
                            // 入力フィールドの取得
                            const inputs = await page.$$('input');
                            const selects = await page.$$('select');
                            const textareas = await page.$$('textarea');
                
                            // inputフィルタリング
                            const relevantInputs = [];
                            for (const input of inputs) {
                                const inputType = (await input.getAttribute('type')) || '';
                                const inputName = (await input.getAttribute('name')) || '';
                                const inputId = (await input.getAttribute('id')) || '';
                                const inputClass = (await input.getAttribute('class')) || '';
                                const isSearchInput =
                                    inputType === 'search' ||
                                    inputName.toLowerCase().includes('search') ||
                                    inputId.toLowerCase().includes('search') ||
                                    inputClass.toLowerCase().includes('search');
                                if (
                                    !isSearchInput &&
                                    ['text', 'tel', 'email', 'checkbox', 'radio'].includes(inputType)
                                ) {
                                    relevantInputs.push(input);
                                }
                            }
                
                            // textareaフィルタリング
                            const relevantTextareas = [];
                            for (const textarea of textareas) {
                                const textareaName = (await textarea.getAttribute('name')) || '';
                                if (!textareaName.includes('recaptcha')) {
                                    relevantTextareas.push(textarea);
                                }
                            }
                
                            // フィールドの合計
                            const totalFields = relevantInputs.length + selects.length + relevantTextareas.length;
                            if (totalFields >= 3 && relevantTextareas.length > 0) {
                                console.log('入力フィールドが3つ以上見つかりました');
                                found = true;
                                foundUrl = link;
                                break;
                            } else {
                                console.log('入力フィールドが3つ未満です');
                                state = 'CP無';
                            }
                        }
                    } else {
                        console.log('お問合せに関する文字が見つかりませんでした');
                        state = 'CP無';
                    }
                }

                if (found) {
                    console.log('入力フィールドを確認します')
                    await page.goto(foundUrl, { waitUntil: 'domcontentloaded' });
                    const inputs = await page.$$('input');
                    const selects = await page.$$('select');
                    const textareas = await page.$$('textarea');
                    const fieldArray: any[] = [];
                    // input要素
                    const relevantInputs = [];
                    for (const input of inputs) {
                        const inputType = (await input.getAttribute('type')) || '';
                        const inputName = (await input.getAttribute('name')) || '';
                        const inputId = (await input.getAttribute('id')) || '';
                        const inputClass = (await input.getAttribute('class')) || '';
                        const isSearchInput =
                            inputType === 'search' ||
                            inputName.toLowerCase().includes('search') ||
                            inputId.toLowerCase().includes('search') ||
                            inputClass.toLowerCase().includes('search');
                        if (
                            !isSearchInput &&
                            ['text', 'tel', 'email', 'checkbox', 'radio'].includes(inputType)
                        ) {
                            relevantInputs.push(input);
                        }
                    }
                    // textareaフィルタリング
                    const relevantTextareas = [];
                    for (const textarea of textareas) {
                        const textareaName = (await textarea.getAttribute('name')) || '';
                        if (!textareaName.includes('recaptcha')) {
                            relevantTextareas.push(textarea);
                        }
                    }
                    // フィールドの合計
                    const totalFields = relevantInputs.length + selects.length + relevantTextareas.length;
                    if (totalFields < 3 || relevantTextareas.length == 0) {
                        console.log('入力フィールドが3つ未満です');  
                        state = 'CP無';
                    } else {
                        console.log('フィールドが３つ以上なので保存処理に移ります')
                        // input要素
                        for (const input of relevantInputs) {
                            try {
                                const inputType = (await input.getAttribute('type')) || 'text';
                                const inputName = await input.getAttribute('name');
                                const inputPlaceholder = await input.getAttribute('placeholder');
                                // labelの取得
                                const labelElementHandle = await input.evaluateHandle((el: HTMLElement) => {
                                    const id = el.getAttribute('id');
                                    if (id) {
                                        return document.querySelector(`label[for="${id}"]`);
                                    }
                                    return el.closest('label');
                                });
                                const inputLabel = labelElementHandle
                                    ? await labelElementHandle.evaluate((el: any) => el?.textContent || '')
                                    : '';
                                fieldArray.push({
                                    tagName: 'input',
                                    type: inputType,
                                    name: inputName,
                                    placeholder: inputPlaceholder,
                                    label: inputLabel
                                });
                            } catch (error) {
                                console.error('input要素の処理中にエラー:', error);
                            }
                        }

                        // select要素
                        for (const select of selects) {
                            try {
                                const selectName = await select.getAttribute('name');
                                // labelの取得
                                const labelElementHandle = await select.evaluateHandle((el: HTMLElement) => {
                                    const id = el.getAttribute('id');
                                    if (id) {
                                        return document.querySelector(`label[for="${id}"]`);
                                    }
                                    return el.closest('label');
                                });
                                const selectLabel = labelElementHandle
                                    ? await labelElementHandle.evaluate((el: any) => el?.textContent?.trim() || '')
                                    : '';
                                // optionsのvalueを取得してカンマで区切る
                                const options = await select.$$('option');
                                const optionValues = [];
                                for (const option of options) {
                                    const optionValue = await option.getAttribute('value');
                                    if (optionValue !== null) {
                                        optionValues.push(optionValue.trim());
                                    }
                                }
                                const optionsData = optionValues.join(',');
                        
                                fieldArray.push({
                                    tagName: 'select',
                                    name: selectName,
                                    label: selectLabel,
                                    options: optionsData
                                });
                            } catch (error) {
                                console.error('select要素の処理中にエラー:', error);
                            }
                        }

                        // textarea要素
                        for (const textarea of relevantTextareas) {
                            try {
                                const textareaName = await textarea.getAttribute('name');
                                const textareaPlaceholder = await textarea.getAttribute('placeholder');
                
                                // labelの取得
                                const labelElementHandle = await textarea.evaluateHandle((el: HTMLElement) => {
                                    const id = el.getAttribute('id');
                                    if (id) {
                                        return document.querySelector(`label[for="${id}"]`);
                                    }
                                    return el.closest('label');
                                });
                                const textareaLabel = labelElementHandle
                                    ? await labelElementHandle.evaluate((el: any) => el?.textContent?.trim() || '')
                                    : '';
                
                                fieldArray.push({
                                    tagName: 'textarea',
                                    name: textareaName,
                                    placeholder: textareaPlaceholder,
                                    label: textareaLabel
                                });
                            } catch (error) {
                                console.error('textarea要素の処理中にエラー:', error);
                            }
                        }

                        // 営業禁止の検索
                        const noSales = await page.evaluate(() => {
                            const regex = /営業(?=(目的|の|や))/;
                            return regex.test(document.body.innerText);
                        });
                        if (noSales) {
                            state = 'CP営業禁止';
                        } else {
                            state = 'CP有';
                        }

                        // データベースへの保存
                        try {
                            const { error: urlError } = await supabase
                                .from('Walk')
                                .update({
                                    ContactPage: foundUrl,
                                    PageState: state
                                })
                                .eq('CompanyNumber',number)
                            if (urlError) {
                                console.error('テーブルの更新中にエラー:', urlError);
                            } else {
                                console.log('CP有効もしくは営業禁止です。データベースへ保存しました')
                            }
                            if (fieldArray.length > 0) {
                                const { error: inputError } = await supabase
                                    .from('WalkInput')
                                    .insert(fieldArray.map(field => ({
                                        CompanyNumber: number,
                                        CompanyName: name,
                                        ...field
                                    })));
                                if (inputError) {
                                    console.error('テーブルへの挿入中にエラー:', inputError);
                                } else {
                                    console.log('入力フィールドを保存しました')
                                }
                            }
                        } catch (dbError) {
                            console.error('データベースへの保存中にエラー:', dbError);
                        }
                    }
                }
            // エラー発生の場合の処理
            } catch (error) {
                console.error(`${name} の処理中にエラーが発生しました:`, error);
                state = 'CP検出時エラー'
                // errorがErrorオブジェクトかどうかを確認
                if (error instanceof Error) {
                    errorText = error.message.split('\n')[0];
                // Errorオブジェクトでない場合は文字列に変換
                } else {
                    errorText = String(error).split('\n')[0];
                }
            // CP有効出ない場合の保存処理
            } finally {
                if (state == 'CP無' || state == 'CP検出時エラー') {
                    try {
                        const { error } = await supabase
                            .from('Walk')
                            .update({
                                PageState: state,
                                page_error: errorText
                            })
                            .eq('CompanyNumber',number)
                        if (error) {
                            console.error('テーブルの更新中にエラー:', error);
                        } else {
                            console.log('CPは無効です。データベースへ保存しました')
                        }
                    } catch (dbError) {
                        console.error('データベースへの保存中にエラー:', dbError);
                    }
                }
                await page.close();
            }
        // HP無効　エラーハンドリング
        } else {
            console.log('HP無効です')
            state = 'HP無効'
        }
    } catch (error) {
        console.error(`${name} のHPへアクセスできません:`, error);
        state = 'HP無効'
        // errorがErrorオブジェクトかどうかを確認
        if (error instanceof Error) {
            errorText = error.message.split('\n')[0];
        // Errorオブジェクトでない場合は文字列に変換
        } else {
            errorText = String(error).split('\n')[0];
        }
    // HP無効の保存処理
    } finally {
        if (state == 'HP無効') {
            try {
                const { error } = await supabase
                    .from('Walk')
                    .update({
                        PageState: state,
                        page_error: errorText
                    })
                    .eq('CompanyNumber',number)
                if (error) {
                    console.error('テーブルの更新中にエラー:', error);
                } else {
                    console.log('「HP無効」でデータベースへ保存しました')
                }
            } catch (dbError) {
                console.error('データベースへの保存中にエラー:', dbError);
            }
        }
        await page.close();
    }
}
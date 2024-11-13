import { createClient } from '@supabase/supabase-js';
import { subsubCategory } from './category';

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_KEY || "";
export const supabase = createClient(supabaseUrl, supabaseKey);

export async function subjectFix() {
  try {
    // 1. sub_category が空の行を取得
    const { data: rows, error: fetchError } = await supabase
      .from('Walk') // ここを実際のテーブル名に置き換えてください
      .select('*')
      .or('sub_category.is.null,sub_category.eq.'); // sub_category が NULL または 空文字

    if (fetchError) {
      console.error('データ取得時にエラーが発生しました:', fetchError);
      return;
    }

    if (!rows || rows.length === 0) {
      console.log('更新対象の行はありません。');
      return;
    }

    // 2. 各行に対して補正処理
    for (const row of rows) {
      const partialIndustry = row.Industry;

      if (!partialIndustry) {
        console.warn(`行ID ${row.id} の Industry が空です。スキップします。`);
        continue;
      }

      // subsubCategory の label に部分一致するものを検索
      const matchedCategory = subsubCategory.find(category => 
        category.label.includes(partialIndustry) || partialIndustry.includes(category.label)
      );

      if (matchedCategory) {
        // 3. Industryを更新
        const { error: updateError } = await supabase
          .from('Walk') // ここを実際のテーブル名に置き換えてください
          .update({
            Industry: matchedCategory.label,
          })
          .eq('id', row.id); // 行を一意に識別するカラム（例: id）

        if (updateError) {
          console.error(`行ID ${row.id} の更新時にエラーが発生しました:`, updateError);
        } else {
          console.log(`行ID ${row.id} を更新しました。`);
        }
      } else {
        console.warn(`行ID ${row.id} の Industry "${partialIndustry}" に一致するカテゴリが見つかりませんでした。`);
      }
    }

    console.log('subjectFix 処理が完了しました。');

  } catch (err) {
    console.error('subjectFix 処理中に予期しないエラーが発生しました:', err);
  }
}
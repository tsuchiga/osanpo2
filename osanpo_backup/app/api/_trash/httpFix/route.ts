import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST() {
    try {
        const pageSize = 1000;
        let from = 0;
        let to = pageSize - 1;
        let hasMoreData = true;

        // http追加処理
        while (hasMoreData) {
            const { data, error } = await supabase
                .from('Walk')
                .select('id, HomePage')
                .order('id', { ascending: true })
                .neq('PageState', '無')
                .range(from, to);

            if (error) { 
                console.error('Supabaseからのデータ取得エラー:', error);
                return;
            }

            if (!data || data.length === 0) {
                hasMoreData = false;
                break;
            }

            for (const row of data) {
                const url = row.HomePage || "";
                const lowerUrl = url.toLowerCase();
                if (!lowerUrl.startsWith('http')) {
                    const updatedUrl = `http://${url}`;
                    const { error: updateError } = await supabase
                        .from('Walk')
                        .update({ HomePage: updatedUrl })
                        .eq('id', row.id);
                    if (updateError) {
                        console.error(`${row.id} の更新エラー:`, updateError);
                    } else {
                        console.log(`${row.id} を更新しました: ${updatedUrl}`);
                    }
                }
            };
            from += pageSize;
            to += pageSize;
        }
        console.log('次の処理を開始します');

        // 新たな処理開始
        console.log('URLに余分な"//"を持つレコードを修正します');
        from = 0;
        to = pageSize - 1;
        hasMoreData = true;

        while (hasMoreData) {
            const { data, error } = await supabase
                .from('Walk')
                .select('id, HomePage')
                .order('id', { ascending: true })
                .neq('PageState', '無')
                .like('HomePage', 'http://%')
                .range(from, to);

            if (error) { 
                console.error('Supabaseからのデータ取得エラー:', error);
                return;
            }

            if (!data || data.length === 0) {
                hasMoreData = false;
                break;
            }

            for (const row of data) {
                const url = row.HomePage || "";

                // URLが"//"で終わる場合はスキップ
                if (url.endsWith('//')) {
                    continue;
                }

                // "http://"で始まるURLか確認
                if (url.startsWith('http://')) {
                    // "http://"以降で最初に現れる"//"の位置を取得
                    const indexOfDoubleSlash = url.indexOf('//', 7);
                    if (indexOfDoubleSlash !== -1) {
                        // "http://"と"//"の間を削除し、"//"も削除
                        const newUrl = url.substring(0, 7) + url.substring(indexOfDoubleSlash + 2);
                        // データベースを更新
                        const { error: updateError } = await supabase
                            .from('Walk')
                            .update({ HomePage: newUrl })
                            .eq('id', row.id);
                        if (updateError) {
                            console.error(`${row.id} の更新エラー:`, updateError);
                        } else {
                            console.log(`ID: ${row.id} のURLを修正しました: ${newUrl}`);
                        }
                    }
                }
            };
            from += pageSize;
            to += pageSize;
        }
    } catch (err) {
        console.error('予期せぬエラー:', err);
    }
}
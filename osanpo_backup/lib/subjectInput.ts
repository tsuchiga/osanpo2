import { createClient } from '@supabase/supabase-js';
import subjectMappingRaw from './output.json';
import { subCategory } from './category'; 

// 型定義の追加

interface SubjectMapping {
    [key: string]: string[];
}

interface IndustryItem {
    value: string;
    label: string;
}

// Supabaseクライアントの設定
const supabaseUrl: string = process.env.SUPABASE_URL || "";
const supabaseKey: string = process.env.SUPABASE_KEY || "";
export const supabase = createClient(supabaseUrl, supabaseKey);

// subjectMappingの型を指定してインポート
const subjectMapping: SubjectMapping = subjectMappingRaw as SubjectMapping;

// industryMapの型を指定
const industryMap: { [key: string]: string } = subCategory.reduce((map: { [key: string]: string }, item: IndustryItem) => {
    map[item.value] = item.label;
    return map;
}, {} as { [key: string]: string });

/**
 * industryに基づいてsubjectのlabelを決定する関数
 * @param {string} industryValue - Industryカラムの値
 * @returns {string | null} - 対応するsubjectのlabel（例: "農業、林業"）またはnull
 */
function determineSubjectLabel(industryValue: string): string | null {
    for (const [key, industries] of Object.entries(subjectMapping)) {
        if (industries.includes(industryValue)) {
            return industryMap[key] || null;
        }
    }
    return null; // 一致するカテゴリがない場合
}

export async function subjectFix() {
    try {
        const pageSize: number = 1000; // 一度に取得するレコード数
        let from: number = 0;
        let to: number = pageSize - 1;
        let hasMoreData: boolean = true;

        while (hasMoreData) {
            const { data, error } = await supabase
                .from('Walk')
                .select('Industry, sub_category') // 'id'を選択しない
                .order('Industry', { ascending: true }) // 'Industry'でソート
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

            // 更新が必要なIndustryを一意に抽出
            const industriesToUpdate: string[] = [];

            for (const row of data) {
                const industryValue: string = row.Industry;
                const newSubjectLabel: string | null = determineSubjectLabel(industryValue);

                if (newSubjectLabel && newSubjectLabel !== row.sub_category && !industriesToUpdate.includes(industryValue)) { // 変更が必要な場合
                    industriesToUpdate.push(industryValue);
                }
            }

            // 一意なIndustryごとにsubjectを更新
            industriesToUpdate.forEach(async (industryValue) => {
                const newSubjectLabel: string | null = determineSubjectLabel(industryValue);

                if (newSubjectLabel) {
                    const { error: updateError } = await supabase
                        .from('Walk')
                        .update({ sub_category: newSubjectLabel })
                        .eq('Industry', industryValue);

                    if (updateError) {
                        console.error(`Supabaseへのデータ更新エラー (Industry: ${industryValue}):`, updateError);
                    } else {
                        console.log(`Industry "${industryValue}" に対応するレコードのsubjectを "${newSubjectLabel}" に更新しました`);
                    }
                }
            });

            // 次のバッチのために範囲を更新
            from += pageSize;
            to += pageSize;
        }

        console.log('処理が完了しました');
    } catch (error) {
        console.error('全体の処理中にエラーが発生しました:', error);
    }
}
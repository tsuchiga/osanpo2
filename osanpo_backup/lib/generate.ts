// lib/generate.ts
import { createClient } from '@supabase/supabase-js'
import { openai } from './openai';

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_KEY || "";
export const supabase = createClient(supabaseUrl, supabaseKey);

export async function generate(name: string) {

    // 会社情報の取得
    const { data, error } = await supabase
        .from('Walk')
        .select(`
        Industry,
        CompanyAddress,
        HomePage,
        ContactPage,
        Kind,
        JobContent,
        Area,
        JobAddress,
        Employee,
        Establishment,
        Capital,
        CompanyContent,
        CompanyFeature,
        RepresentativePost,
        ChargePost,
        ChargeName,
        Tel,
        Email
        `)
        .eq('CompanyName', name)
        .single();
    if (error) {
        console.error('取得エラー:', error)
        return
    }

    // AI生成
    try {
        const prompt = `
        あなたはエンジニアのメール営業担当です。
        以下は求人情報です。
        この会社に合った貴社のサービスを提案するメール文章を出力してください。
        貴社の情報は適当な値にしてください。

        ${JSON.stringify(data, null, 2)}
        
        貴社情報参考:
        会社名 株式会社ウルトラサポート
        名前 タカハシ
        電話番号 00012345678
        メール takahashi@sample.com
        HP http://taka.com

        `;
        
        let response;
        try {
            response = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 1000,
            });
        } catch (error: any) {
        console.error('OpenAI API呼び出しに失敗しました:', error);
        throw new Error('OpenAI API呼び出しに失敗しました: ' + error.message);
        }
        const generatedValue = response.choices[0].message?.content?.trim() ?? '';
        return generatedValue;
    } catch (error: any) {
        console.error('エラーが発生しました:', error);
        throw error;
    }
}

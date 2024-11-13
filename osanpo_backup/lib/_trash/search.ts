import { createClient } from '@supabase/supabase-js';
import { analayze } from './analyze';

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_KEY || "";
export const supabase = createClient(supabaseUrl, supabaseKey);

export async function search(areas: string[], sectors: string[]) {
  let query = supabase
    .from('Walk')
    .select('CompanyName, HomePage, PageState')
    .neq('PageState', '無');

  // areas が空でない場合のみ、in 条件を追加
  if (areas.length > 0) {
    query = query.in('Area', areas);
  }

  // sectors が空でない場合のみ、in 条件を追加
  if (sectors.length > 0) {
    query = query.in('Kind', sectors);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error('Error fetching data from Supabase: ' + error.message);
  }

  const result = data.map((item) => item.CompanyName);
  const pass = data.map((item) => ({
    companyName: item.CompanyName,
    homePage: item.HomePage,
    pageState: item.PageState,
  }));

  /*setTimeout(() => analayze(pass), 0);*/
  return result;
}
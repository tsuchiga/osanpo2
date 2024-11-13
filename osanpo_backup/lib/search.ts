import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_KEY || "";
export const supabase = createClient(supabaseUrl, supabaseKey);

export async function search(areas: string[], sectors: string[]) {

  let query = supabase
    .from('Walk')
    .select('CompanyName')
    .neq('PageState', '無');
  if (areas.length > 0) {
    query = query.in('Area', areas);
  }
  
  if (sectors.length > 0) {
    query = query.in('Kind', sectors);
  }
  const { data, error } = await query;
  if (error) {
    throw new Error('Error fetching data from Supabase: ' + error.message);
  }

  const result = data.map((item) => item.CompanyName);
  return result;
}
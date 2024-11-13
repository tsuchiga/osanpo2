import { columns } from './subject';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_KEY || "";
export const supabase = createClient(supabaseUrl, supabaseKey);

export async function infoGet(name: string): Promise<columns | null> {
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
    console.error('Error fetching company info:', error);
    return null;
  }

  return data as columns;

}
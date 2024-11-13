import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_KEY || "";
export const supabase = createClient(supabaseUrl, supabaseKey);

export async function analayze(pass: any) {

    const browser = await chromium.launch();
    
    for (const p of pass) {

        const page = await browser.newPage();

        const url = p.homePage;
        await page.goto(url);
        await page.waitForTimeout(1000);

        await page.close();
    }

    await browser.close();
}
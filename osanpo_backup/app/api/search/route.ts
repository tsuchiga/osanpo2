import { NextRequest, NextResponse } from 'next/server';
import { search } from '../../../lib/search';

export async function POST(req: NextRequest) {
  try {
    const { areas, sectors } = await req.json(); // 受け取ったデータを取得
    const result = await search(areas, sectors); // エリアとセクターを引数に渡す
    return NextResponse.json({ message: 'Playwright script executed successfully', result }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error executing Playwright script' }, { status: 500 });
  }
}
// route.ts
import { NextRequest, NextResponse } from 'next/server';
import { walk } from '../../../lib/walk';

export async function POST(req: NextRequest) {
  try {
    // リクエストボディから startS と startA をデストラクチャリング
    const { startS, startA } = await req.json();

    // startS と startA が数値であることを検証
    if (typeof startS !== 'number' || typeof startA !== 'number') {
      return NextResponse.json(
        { message: '無効な入力: startS と startA は数値でなければなりません。' },
        { status: 400 }
      );
    }

    // walk 関数を呼び出し、数値のインデックスを渡す
    const result = await walk(startS, startA);

    return NextResponse.json(
      { message: 'Playwright スクリプトが正常に実行されました。', result },
      { status: 200 }
    );
  } catch (error) {
    console.error('Playwright スクリプトの実行中にエラーが発生しました:', error);
    return NextResponse.json(
      { message: 'Playwright スクリプトの実行中にエラーが発生しました。' },
      { status: 500 }
    );
  }
}
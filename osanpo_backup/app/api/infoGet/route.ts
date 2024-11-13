// app/api/infoGet/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { infoGet } from '../../../lib/infoGet';

export async function POST(req: NextRequest) {
    try {
      const { companyName } = await req.json();
      const result = await infoGet(companyName);
      return NextResponse.json({ message: 'Playwright script executed successfully', result }, { status: 200 });
    } catch (error) {
      console.error(error);
      return NextResponse.json({ message: 'Error executing Playwright script' }, { status: 500 });
    }
  }
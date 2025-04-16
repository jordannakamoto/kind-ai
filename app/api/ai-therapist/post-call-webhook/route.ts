import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json({ status: 'Webhook route is live' });
  }
  
export async function POST(req: NextRequest) {
  console.log('📥 Webhook POST endpoint hit');

  try {
    const rawBody = await req.text();
    console.log('📬 Raw payload received:', rawBody);

    return NextResponse.json({ status: 'received', success: true });
  } catch (err: any) {
    console.error('[Webhook Error]', err.message || err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


export const dynamic = 'force-dynamic';
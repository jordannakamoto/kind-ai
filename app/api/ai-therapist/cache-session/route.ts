// app/api/cache-session/route.ts
import { NextRequest, NextResponse } from 'next/server';

import { redis } from '@/redis/client';

export async function POST(req: NextRequest) {
  try {
    const { conversationId, userId } = await req.json();

    if (!conversationId || !userId) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    await redis.setex(conversationId, 600, { userId });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Redis cache error:', err.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
// app/api/cache-session/route.ts
import { NextRequest, NextResponse } from 'next/server';

import { redis } from '@/redis/client';

export async function POST(req: NextRequest) {
  try {
    const { conversationId, userId, sessionType, moduleName } = await req.json();

    console.log('📝 [CACHE-SESSION] Received request:', { conversationId, userId, sessionType, moduleName });

    if (!conversationId || !userId) {
      console.error('❌ [CACHE-SESSION] Missing parameters:', { conversationId, userId });
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // Store with 10 minute TTL (600 seconds)
    console.log('💾 [CACHE-SESSION] Storing in Redis with key:', conversationId);
    await redis.setex(conversationId, 600, { userId, sessionType, moduleName });
    
    // Verify the storage
    const verifyData = await redis.get(conversationId);
    console.log('✅ [CACHE-SESSION] Verification - Data stored:', verifyData);
    
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Redis cache error:', err.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
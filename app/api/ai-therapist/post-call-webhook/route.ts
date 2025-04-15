import { NextRequest, NextResponse } from 'next/server';

import crypto from 'crypto';
import { redis } from '@/redis/client';
import { supabase } from '@/supabase/client';

const WEBHOOK_SECRET = process.env.ELEVENLABS_WEBHOOK_SECRET;

function isSignatureValid(rawBody: string, signatureHeader: string | null): boolean {
  if (!WEBHOOK_SECRET || !signatureHeader) return false;

  const headers = signatureHeader.split(',');
  const timestamp = headers.find((e) => e.startsWith('t='))?.substring(2);
  const signature = headers.find((e) => e.startsWith('v0='))?.substring(3);

  if (!timestamp || !signature) return false;

  const message = `${timestamp}.${rawBody}`;
  const digest = crypto.createHmac('sha256', WEBHOOK_SECRET).update(message).digest('hex');

  return digest === signature;
}

export async function POST(req: NextRequest) {
  console.log('📥 Webhook POST endpoint hit');

  try {
    const rawBody = await req.text();
    const signatureHeader = req.headers.get('elevenlabs-signature');

    console.log('🔐 Validating webhook signature...');
    if (!isSignatureValid(rawBody, signatureHeader)) {
      console.warn('❌ Invalid or missing webhook signature');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type, data } = JSON.parse(rawBody);
    if (type !== 'post_call_transcription' || !data) {
      console.warn('❌ Invalid webhook event type or data');
      return NextResponse.json({ error: 'Invalid event' }, { status: 400 });
    }

    const {
      conversation_id,
      transcript,
      metadata,
      analysis,
    } = data;

    if (!conversation_id) {
      console.warn('❌ Missing conversation_id');
      return NextResponse.json({ error: 'Missing conversation_id' }, { status: 400 });
    }

    // 🔍 Retrieve user ID from Redis
    type RedisSessionData = { userId: string };
    const redisData = await redis.get<RedisSessionData>(conversation_id);
    const userId = redisData?.userId ?? null;

    if (!userId) {
      console.warn('❌ No user_id found in Redis for conversation:', conversation_id);
      return NextResponse.json({ error: 'Missing user_id from Redis' }, { status: 400 });
    }

    // 📝 Format transcript
    const formattedTranscript = Array.isArray(transcript)
      ? transcript
          .filter((t) => t.message && t.role)
          .map((t) => `${t.role}: ${t.message}`)
          .join('\n')
      : '';

    const sessionPayload = {
      user_id: userId,
      conversation_id,
      summary: analysis?.transcript_summary || '',
      transcript: formattedTranscript,
      duration: metadata?.call_duration_secs ?? null,
      title: `Therapy Session – ${new Date().toLocaleDateString()}`,
    };

    console.log('📝 Inserting session into Supabase...');
    const { error: insertError } = await supabase
      .from('sessions')
      .insert(sessionPayload);

    if (insertError) {
      console.error('❌ Error inserting session:', insertError.message);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    console.log(`✅ Session saved for user: ${userId}, conversation: ${conversation_id}`);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[Webhook Error]', err.message || err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
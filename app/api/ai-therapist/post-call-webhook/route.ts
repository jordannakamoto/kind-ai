// Post-call webhook /api/webhooks/post-call
// •	Verifies signature
// •	Stores transcript & creates placeholder session
// •	Kicks off background synthesis to:
// •	/api/process-transcript
// •	/api/synthesize-therapy-session (after the above finishes)
//

import { NextRequest, NextResponse } from 'next/server';

import OpenAI from 'openai';
import crypto from 'crypto';
import { redis } from '@/redis/client';
import { supabase } from '@/supabase/client';

const WEBHOOK_SECRET = process.env.ELEVENLABS_WEBHOOK_SECRET;
const client = new OpenAI();


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

type TranscriptMessage = { message: string; role: 'agent' | 'user' | string };
function transformTranscript(transcriptArray: TranscriptMessage[]): string {
  return transcriptArray
    .filter((t) => t.message && t.role)
    .map((t) => {
      const speaker = t.role === 'agent' ? 'therapist' : t.role === 'user' ? 'you' : t.role;
      return `${speaker}: ${t.message}`;
    })
    .join('\n');
}

type ParsedTherapyInsights = {
  title: string;
  summary: string;
  goals: string[];
  themes: string[];
  bio: string;
};

// /api/webhooks/post-call.ts
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signatureHeader = req.headers.get('elevenlabs-signature');

    if (!isSignatureValid(rawBody, signatureHeader)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type, data } = JSON.parse(rawBody);
    if (type !== 'post_call_transcription' || !data) {
      return NextResponse.json({ error: 'Invalid event' }, { status: 400 });
    }

    const { conversation_id, transcript, metadata } = data;
    if (!conversation_id || !transcript) {
      return NextResponse.json({ error: 'Missing data' }, { status: 400 });
    }

    const redisData = await redis.get<{ userId: string }>(conversation_id);
    const userId = redisData?.userId;
    if (!userId) {
      return NextResponse.json({ error: 'Missing user_id' }, { status: 400 });
    }

    const transcriptString = transformTranscript(transcript);

    // ✅ Just store the session raw data, for now
    await supabase.from('sessions').insert({
      user_id: userId,
      conversation_id,
      transcript: transcriptString,
      duration: metadata?.call_duration_secs ?? null,
      summary: 'Summarizing...',
      title: 'Recent Session',
    });

    // ✅ Kick off background synthesis task
    await fetch(`/api/ai-therapist/process-transcript`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, conversation_id }),
    });

    await fetch(`/api/ai-therapist/synthesize-therapy-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[Webhook Error]', err.message || err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';

import OpenAI from 'openai';
import crypto from 'crypto';
import { redis } from '@/redis/client';
import { supabase } from '@/supabase/client';

const WEBHOOK_SECRET = process.env.ELEVENLABS_WEBHOOK_SECRET;
const client = new OpenAI(); // Uses process.env.OPENAI_API_KEY


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

type TranscriptMessage = {
  message: string;
  role: 'agent' | 'user' | string;
};

function transformTranscript(transcriptArray: TranscriptMessage[]): string {
  return transcriptArray
    .filter((t) => t.message && t.role)
    .map((t) => {
      const speaker = t.role === 'agent' ? 'therapist' : t.role === 'user' ? 'you' : t.role;
      return `${speaker}: ${t.message}`;
    })
    .join('\n');
}

async function getClientFacingSummary(transcript: string): Promise<string> {
  const input = `Summarize this therapy session for the client to read and get insight from:\n\n${transcript}`;

  const response = await client.responses.create({
    model: 'gpt-4o-mini',
    input,
  });

  return response.output_text.trim();
}

export async function POST(req: NextRequest) {
  console.log('📥 Webhook POST endpoint hit');

  try {
    const rawBody = await req.text();
    const signatureHeader = req.headers.get('elevenlabs-signature');

    if (!isSignatureValid(rawBody, signatureHeader)) {
      console.warn('❌ Invalid webhook signature');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type, data } = JSON.parse(rawBody);
    if (type !== 'post_call_transcription' || !data) {
      return NextResponse.json({ error: 'Invalid event' }, { status: 400 });
    }

    const { conversation_id, transcript, metadata } = data;
    if (!conversation_id) {
      return NextResponse.json({ error: 'Missing conversation_id' }, { status: 400 });
    }

    const redisData = await redis.get<{ userId: string }>(conversation_id);
    const userId = redisData?.userId ?? null;
    if (!userId) {
      return NextResponse.json({ error: 'Missing user_id from Redis' }, { status: 400 });
    }

    // 🧠 Format and summarize transcript
    const transformedTranscript = transformTranscript(transcript);
    const summary = await getClientFacingSummary(transformedTranscript);

    const sessionPayload = {
      user_id: userId,
      conversation_id,
      summary,
      transcript: transformedTranscript,
      duration: metadata?.call_duration_secs ?? null,
      title: `Therapy Session – ${new Date().toLocaleDateString()}`,
    };

    const { error: insertError } = await supabase.from('sessions').insert(sessionPayload);
    if (insertError) {
      console.error('❌ Error inserting session:', insertError.message);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    console.log(`✅ Session saved for user: ${userId}`);
    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error('[Webhook Error]', err.message || err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
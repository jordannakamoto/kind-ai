import { NextRequest, NextResponse } from 'next/server';

import crypto from 'crypto';
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

    const payload = JSON.parse(rawBody);
    console.log('📬 Payload received:', JSON.stringify(payload, null, 2));

    const {
      conversation_id,
      analysis,
      metadata,
      transcript,
      custom,
    } = payload;

    const userEmail = typeof custom?.user_email === 'string' ? custom.user_email : null;
    if (!conversation_id || !userEmail) {
      console.warn('❌ Missing conversation_id or user_email');
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    console.log(`🔍 Looking up user: ${userEmail}`);
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', userEmail)
      .single();

    if (userError || !user) {
      console.warn(`❌ User not found: ${userEmail}`);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const formattedTranscript = (Array.isArray(transcript) ? transcript : [])
      .filter((t) => t.message && t.role)
      .map((t) => `${t.role}: ${t.message}`)
      .join('\n');

    const sessionPayload = {
      user_id: user.id,
      conversation_id,
      summary: analysis?.transcript_summary || '',
      transcript: formattedTranscript,
      duration_minutes: metadata?.call_duration_secs
        ? Math.round(metadata.call_duration_secs / 60)
        : null,
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

    console.log(`✅ Session saved for ${userEmail} (${conversation_id})`);
    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error('[Webhook Error]', err.message || err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
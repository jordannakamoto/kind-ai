import { NextRequest, NextResponse } from 'next/server';

import crypto from 'crypto';
import { supabase } from '@/supabase/client';

const WEBHOOK_SECRET = process.env.ELEVENLABS_WEBHOOK_SECRET || ''; // from your agent dashboard

// Signature verification
function isSignatureValid(payload: string, signature: string): boolean {
  if (!WEBHOOK_SECRET) return false;
  const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
  const digest = hmac.update(payload).digest('hex');
  return digest === signature;
}

export async function POST(req: NextRequest) {
  console.log('📥 Webhook POST endpoint hit');

  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-elevenlabs-signature') || '';

    console.log('🔐 Checking signature...');
    if (!isSignatureValid(rawBody, signature)) {
      console.warn('❌ Invalid signature on webhook');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('✅ Signature valid, parsing payload...');
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
      return NextResponse.json({ error: 'Missing conversation_id or user_email' }, { status: 400 });
    }

    console.log(`👤 Looking up user by email: ${userEmail}`);
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', userEmail)
      .single();

    if (userError || !user) {
      console.warn(`❌ User not found: ${userEmail}`);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log(`📄 Formatting transcript for conversation: ${conversation_id}`);
    const rawTranscript = Array.isArray(transcript) ? transcript : [];
    const formattedTranscript = rawTranscript
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
      console.error('❌ Failed to insert session:', insertError.message);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    console.log(`✅ Session saved successfully: ${conversation_id} for ${userEmail}`);
    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error('[Webhook Error]', err.message || err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
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
  console.log('🚀 POST-CALL WEBHOOK: Starting...');
  
  try {
    console.log('📥 Step 1: Reading request body...');
    const rawBody = await req.text();
    console.log('✅ Step 1 complete. Body length:', rawBody.length);
    
    console.log('🔐 Step 2: Checking signature...');
    const signatureHeader = req.headers.get('elevenlabs-signature');
    console.log('Signature header present:', !!signatureHeader);

    if (!isSignatureValid(rawBody, signatureHeader)) {
      console.log('❌ Step 2 FAILED: Invalid signature');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.log('✅ Step 2 complete: Signature valid');

    console.log('📋 Step 3: Parsing webhook data...');
    const { type, data } = JSON.parse(rawBody);
    console.log('Event type:', type);
    console.log('Data present:', !!data);
    
    if (type !== 'post_call_transcription' || !data) {
      console.log('❌ Step 3 FAILED: Invalid event type or missing data');
      return NextResponse.json({ error: 'Invalid event' }, { status: 400 });
    }
    console.log('✅ Step 3 complete: Valid event data');

    console.log('🔍 Step 4: Extracting conversation data...');
    const { conversation_id, transcript, metadata } = data;
    console.log('Conversation ID:', conversation_id);
    console.log('Transcript present:', !!transcript);
    console.log('Metadata:', metadata);
    
    if (!conversation_id || !transcript) {
      console.log('❌ Step 4 FAILED: Missing conversation_id or transcript');
      return NextResponse.json({ error: 'Missing data' }, { status: 400 });
    }
    console.log('✅ Step 4 complete: All required data present');

    console.log('🔑 Step 5: Looking up session data from Redis...');
    console.log('Looking for conversation_id in Redis:', conversation_id);
    
    const redisData = await redis.get<{ userId: string; sessionType?: string; moduleName?: string }>(conversation_id);
    console.log('Redis response:', redisData);
    
    const userId = redisData?.userId;
    // Default to 'regular' if sessionType is not in Redis (for backwards compatibility)
    const sessionType = redisData?.sessionType || 'regular';
    // Default to 'Default Daily Check In' if moduleName is not in Redis
    const moduleName = redisData?.moduleName || 'Default Daily Check In';
    console.log('Extracted userId:', userId, 'sessionType:', sessionType, 'moduleName:', moduleName);
    console.log('Redis data was:', redisData ? 'present' : 'missing');
    
    if (!userId) {
      console.log('❌ Step 5 FAILED: No userId found in Redis for conversation_id:', conversation_id);
      return NextResponse.json({ error: 'Missing user_id' }, { status: 400 });
    }
    console.log('✅ Step 5 complete: UserID found:', userId, 'SessionType:', sessionType, 'ModuleName:', moduleName);

    console.log('📝 Step 6: Transforming transcript...');
    const transcriptString = transformTranscript(transcript);
    console.log('Transcript length after transformation:', transcriptString.length);
    console.log('✅ Step 6 complete: Transcript transformed');

    console.log('💾 Step 7: Checking session duration and inserting into Supabase...');
    
    // Check session type from Redis data
    // Welcome sessions have no minimum, course and regular sessions require 2 minutes (120 seconds)
    const sessionDuration = metadata?.call_duration_secs ?? 0;
    const isWelcomeSession = sessionType === 'welcome' || moduleName === 'Welcome';
    const MIN_DURATION_SECONDS = 120; // 2 minutes minimum for non-welcome sessions
    
    console.log('=== SESSION DURATION CHECK ===');
    console.log(`Duration from metadata: ${metadata?.call_duration_secs}`);
    console.log(`Session duration (processed): ${sessionDuration} seconds`);
    console.log(`Session type from Redis: ${sessionType}`);
    console.log(`Module name from Redis: ${moduleName}`);
    console.log(`Is Welcome Session: ${isWelcomeSession}`);
    console.log(`Minimum required: ${MIN_DURATION_SECONDS} seconds`);
    console.log(`Will skip: ${!isWelcomeSession && sessionDuration < MIN_DURATION_SECONDS}`);
    console.log('==============================');
    
    // Skip saving if duration is less than minimum for non-welcome sessions
    if (!isWelcomeSession && sessionDuration < MIN_DURATION_SECONDS) {
      console.log(`⏭️ Skipping session: Duration ${sessionDuration}s is less than minimum ${MIN_DURATION_SECONDS}s for non-welcome sessions`);
      console.log('Session type:', sessionType, 'Module name:', moduleName);
      // Don't save to database or trigger any background processes
      return NextResponse.json({ 
        success: true, 
        message: `Session not saved: Duration ${sessionDuration}s is less than minimum ${MIN_DURATION_SECONDS}s for ${sessionType} sessions`,
        skipped: true,
        duration: sessionDuration,
        minimum: MIN_DURATION_SECONDS,
        sessionType: sessionType,
        moduleName: moduleName
      });
    }
    
    const insertResult = await supabase.from('sessions').insert({
      user_id: userId,
      conversation_id,
      transcript: transcriptString,
      duration: metadata?.call_duration_secs ?? null,
      summary: 'Summarizing...',
      title: 'Recent Session',
    });
    
    if (insertResult.error) {
      console.log('❌ Step 7 FAILED: Supabase insert error:', insertResult.error);
      return NextResponse.json({ error: 'Database insert failed' }, { status: 500 });
    }
    console.log('✅ Step 7 complete: Session inserted into database');

    console.log('🚀 Step 8: Triggering background processes...');
    
    console.log('8a: Calling process-transcript...');
    await fetch(`https://kind-nine.vercel.app/api/ai-therapist/process-transcript`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        conversationId: conversation_id,
        transcript: transcriptString,
        duration: metadata?.call_duration_secs ?? null,
      }),
    });
    console.log('✅ 8a complete: process-transcript called');

    console.log('8b: Calling synthesize-therapy-session...');
    await fetch(`https://kind-nine.vercel.app/api/ai-therapist/synthesize-therapy-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    console.log('✅ 8b complete: synthesize-therapy-session called');
    console.log('✅ Step 8 complete: All background processes triggered');

    console.log('🎉 WEBHOOK SUCCESS: All steps completed');
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('💥 WEBHOOK ERROR - Caught exception:', err.message || err);
    console.error('Error stack:', err.stack);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
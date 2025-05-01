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
  summary: string;
  goals: string[];
  themes: string[];
  bio: string;
};

function parseTherapyInsights(raw: string): ParsedTherapyInsights {
  const extract = (label: string) => {
    const match = raw.match(new RegExp(`${label}:\\s*([\\s\\S]*?)(?=\\n\\w+:|$)`, 'i'));
    return match?.[1]?.trim() ?? '';
  };

  return {
    summary: extract('Summary'),
    goals: extract('Goals')
      .split('\n')
      .map((g) => g.replace(/^-/, '').trim())
      .filter(Boolean),
    themes: extract('Themes')
      .split('\n')
      .map((t) => t.replace(/^-/, '').trim())
      .filter(Boolean),
    bio: extract('Bio'),
  };
}

async function getTherapyInsights(transcript: string): Promise<ParsedTherapyInsights> {
  const input = `
You are an AI therapy assistant helping summarize therapy sessions. Analyze the transcript below and return the following four outputs.

1. A brief summary of the session written in a warm, client-facing tone. Avoid headers.
2. A "Goals:" section listing any specific tasks or goals the client expressed. Only include this if applicable.
3. A "Themes:" section listing 3–5 emotional or therapeutic themes discussed (e.g. anxiety, relationships, motivation). Only include this if applicable.
4. A "Bio:" section containing any new biographical information that might enrich the client's bio. Only include this if applicable.

Format the response as:

Summary:
<session summary>

Goals:
- <goal 1>
- <goal 2>

Themes:
- <theme 1>
- <theme 2>

Bio:
<short paragraph about new personal insights>

Transcript:
${transcript}
  `;

  const response = await client.responses.create({
    model: 'gpt-4o-mini',
    input,
  });

  return parseTherapyInsights(response.output_text.trim());
}

async function synthesizeUpdatedProfile({
  oldBio,
  oldSummary,
  oldGoals,
  oldThemes,
  newInsights,
}: {
  oldBio: string;
  oldSummary: string;
  oldGoals: string[];
  oldThemes: string[];
  newInsights: ParsedTherapyInsights;
}) {
  const prompt = `
You are an assistant helping maintain a therapy profile. YDO NOT simply copy the new bio or summary. Instead, use it to improve or subtly extend the existing content.

The **Bio** should be written as a brief descriptive profile. 
It should sound like a therapist’s case summary or intake note, using phrases like:

- “A <descriptive> person who ...”

Avoid first-person phrasing like “I” or “my”. Use clear, concise observations, not speculation or analysis.

The **Therapy Summary** should be a summary of all sessions not just the current one being integrated. reflect overall progress, topics, etc.

The **Themes** should track therapy-relevant recurring themes over time.

Incorporate new insights only if they are not already represented.

Respond with updated values only. Return nothing else.

Format:
Bio:
<updated bio>

TherapySummary:
<updated therapy summary>

Goals:
- <goal 1>
- <goal 2>

Themes:
- <theme 1>
- <theme 2>

Old Data:
Bio: ${oldBio}
TherapySummary: ${oldSummary}
Goals: ${oldGoals.join(', ')}
Themes: ${oldThemes.join(', ')}

New Session Data:
Bio: ${newInsights.bio}
Summary: ${newInsights.summary}
Goals: ${newInsights.goals.join(', ')}
Themes: ${newInsights.themes.join(', ')}
`;

  const response = await client.responses.create({
    model: 'gpt-4o-mini',
    input: prompt,
  });

  return parseTherapyInsights(response.output_text.trim());
}

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
    if (!conversation_id) {
      return NextResponse.json({ error: 'Missing conversation_id' }, { status: 400 });
    }

    const redisData = await redis.get<{ userId: string }>(conversation_id);
    const userId = redisData?.userId;
    if (!userId) {
      return NextResponse.json({ error: 'Missing user_id from Redis' }, { status: 400 });
    }

    const { data: userRecord } = await supabase
      .from('users')
      .select('bio, therapy_summary, themes, goals')
      .eq('id', userId)
      .single();

    const transcriptString = transformTranscript(transcript);
    const newInsights = await getTherapyInsights(transcriptString);

    const synthesized = await synthesizeUpdatedProfile({
      oldBio: userRecord?.bio ?? '',
      oldSummary: userRecord?.therapy_summary ?? '',
      oldGoals: userRecord?.goals?.split('\n') ?? [],
      oldThemes: userRecord?.themes?.split(',')?.map((t: string) => t.trim()) ?? [],      newInsights,
    });

    // Save session
    await supabase.from('sessions').insert({
      user_id: userId,
      conversation_id,
      summary: newInsights.summary,
      transcript: transcriptString,
      duration: metadata?.call_duration_secs ?? null,
      title: `Therapy Session – ${new Date().toLocaleDateString()}`,
    });

    // Update user profile
    await supabase
      .from('users')
      .update({
        bio: synthesized.bio,
        therapy_summary: synthesized.summary,
        goals: synthesized.goals.join('\n'),
        themes: synthesized.themes.join(', '),
      })
      .eq('id', userId);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[Webhook Error]', err.message || err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
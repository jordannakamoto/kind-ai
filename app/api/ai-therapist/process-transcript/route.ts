// /api/process-transcript
// 	•	Extracts insights from the transcript
// 	•	Updates session record
// 	•	Updates user bio, goals, themes, summary

import { NextRequest, NextResponse } from 'next/server';

import OpenAI from 'openai';
import { supabase } from '@/supabase/client';

const client = new OpenAI();

type ParsedTherapyInsights = {
  title: string;
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
    title: extract('Title'),
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
You are an AI therapy assistant helping summarize therapy sessions. Analyze the transcript below and return the following five outputs.

1. A relevant session title (no quotes or emojis, in Title Case).
2. A brief summary in second-person ("you") tone.
3. A "Goals:" section (only if applicable).
4. A "Themes:" section (only if applicable).
5. A "Bio:" section (only if applicable).

Format:
Title:
<session title>

Summary:
<summary>

Goals:
- goal 1
- goal 2

Themes:
- theme 1
- theme 2

Bio:
<new bio insights>

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
You are an assistant maintaining a long-term therapy profile. Merge the old and new data using professional tone and clarity.

**Bio:** Summarize the client's character in 3–4 therapist-style sentences. Avoid first-person.
**Therapy Summary:** Summarize long-term therapy progress in under 4 sentences.
**Goals:** Prepend new goals, keeping older ones lower in priority.
**Themes:** Add any new recurring topics not already listed.

Format:
Title:
<updated session title>

Bio:
<updated bio>

TherapySummary:
<updated summary>

Goals:
- goal 1
- goal 2

Themes:
- theme 1
- theme 2

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
    const { userId, conversationId, transcript, duration } = await req.json();
    if (!userId || !conversationId || !transcript) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data: userRecord } = await supabase
      .from('users')
      .select('bio, therapy_summary, themes, goals')
      .eq('id', userId)
      .single();

    if (!userRecord) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const newInsights = await getTherapyInsights(transcript);

    const synthesized = await synthesizeUpdatedProfile({
      oldBio: userRecord.bio ?? '',
      oldSummary: userRecord.therapy_summary ?? '',
      oldGoals: userRecord.goals?.split('\n') ?? [],
      oldThemes: userRecord.themes?.split(',')?.map((t: string) => t.trim()) ?? [],
      newInsights,
    });

    // Update the session record
    await supabase
      .from('sessions')
      .update({
        title: synthesized.title,
        summary: synthesized.summary,
        transcript,
        duration: duration ?? null,
      })
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);

    // Update the user's profile
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
    console.error('[Process Transcript Error]', err.message || err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
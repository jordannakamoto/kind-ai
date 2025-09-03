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
You are a therapy assistant helping summarize therapy sessions. Analyze the transcript below and return the following five outputs.

1. A relevant session title (no quotes or emojis, in Title Case).
2. A brief summary in second-person ("you") or "we talked about" tone, speaking to the client.
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
You are an assistant helping maintain a therapy profile. YDO NOT simply copy the new bio or summary. Instead, use it to improve or subtly extend the existing content.

The **Bio** should be written as a brief descriptive profile. 
It should sound like a therapist’s case summary or intake note, using phrases like:

- “A <descriptive> person who ...”

Avoid first-person phrasing like “I” or “my”. Use clear, concise observations, not speculation or analysis.
The final compiled bio should be very readable and at maximum 4 sentences.

The **Therapy Summary** should be a therapist's summary/observations of all sessions not just the current one being integrated. reflect overall progress, topics, etc.
The final compiled therapy Summary should be very readable and at maximum 4 sentences.

The **Goals** should move old goals down the list and prepend new ones to the top.

The **Themes** should track therapy-relevant recurring themes over time.

Incorporate new insights only if they are not already represented.

Respond with updated values only. Return nothing else.

Format:

Title:
<a short and relevant session title Avoid quotes or emojis. Use Title Case.>

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

    // Get existing goals from goals table instead of users table
    const { data: existingGoalsData } = await supabase
      .from('goals')
      .select('title')
      .eq('user_id', userId)
      .eq('is_active', true);

    const existingGoalTitles = existingGoalsData?.map(g => g.title) ?? [];

    const synthesized = await synthesizeUpdatedProfile({
      oldBio: userRecord.bio ?? '',
      oldSummary: userRecord.therapy_summary ?? '',
      oldGoals: existingGoalTitles,
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

    // Update the user's profile (excluding goals - they go in separate table now)
    await supabase
      .from('users')
      .update({
        bio: synthesized.bio,
        therapy_summary: synthesized.summary,
        themes: synthesized.themes.join(', '),
      })
      .eq('id', userId);

    // Handle goals separately - add new goals to the goals table if they don't already exist
    if (synthesized.goals.length > 0) {
      // Get existing goals for this user
      const { data: existingGoals } = await supabase
        .from('goals')
        .select('title')
        .eq('user_id', userId)
        .eq('is_active', true);

      const existingGoalTitles = existingGoals?.map(g => g.title.toLowerCase()) || [];
      
      // Insert new goals that don't already exist
      const newGoals = synthesized.goals
        .filter(goal => !existingGoalTitles.includes(goal.toLowerCase()))
        .map(goal => ({
          user_id: userId,
          title: goal,
          is_active: true
        }));

      if (newGoals.length > 0) {
        await supabase
          .from('goals')
          .insert(newGoals);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[Process Transcript Error]', err.message || err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
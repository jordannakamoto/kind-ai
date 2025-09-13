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
    summary: extract('Summary') || extract('TherapySummary'),
    goals: extract('Goals')
      .split('\n')
      .map((g) => g.replace(/^[-•*]/, '').trim())
      .filter(g => g.length > 0),
    themes: extract('Themes')
      .split('\n')
      .map((t) => t.replace(/^[-•*]/, '').trim())
      .filter(t => t.length > 0),
    bio: extract('Bio'),
  };
}

async function getTherapyInsights(transcript: string): Promise<ParsedTherapyInsights> {
  const input = `
You are a therapy assistant helping summarize therapy sessions. Analyze the transcript below and return the following five outputs.

1. A relevant session title (no quotes or emojis, in Title Case).
2. A brief summary in second-person ("you") voice, speaking directly TO the client. Use "you" throughout - for example: "You discussed your anxiety about...", "You explored strategies for...", "You reflected on...". Never use third-person pronouns like "the individual", "they", "the client", etc.
3. A "Goals:" section - Extract any actionable goals, intentions, or things the client wants to work on. Look for statements about what they want to achieve, improve, or change. If no explicit goals, infer from their concerns.
4. A "Themes:" section - Key topics or patterns discussed in the session.
5. A "Bio:" section (only if new information emerges) - This should be in THIRD-PERSON as therapist notes about the client (e.g., "The client is experiencing...", "They mentioned...").

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

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are a therapy assistant helping summarize therapy sessions.',
      },
      {
        role: 'user',
        content: input,
      },
    ],
  });

  const content = response.choices[0]?.message?.content || '';
  return parseTherapyInsights(content.trim());
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
You are an assistant helping maintain a therapy profile. DO NOT simply copy the new bio or summary. Instead, use it to improve or subtly extend the existing content.

The **Bio** should be written in THIRD-PERSON as a therapist's case note about the client. 
It should sound like a therapist's case summary or intake note, using phrases like:
- "A <descriptive> person who ..."
- "They are experiencing..."
- "The client has..."

Avoid first-person phrasing like "I" or "my". Use clear, concise observations, not speculation or analysis.
The final compiled bio should be very readable and at maximum 4 sentences.

CRITICAL: The **Therapy Summary** (different from Bio) MUST be written in second-person ("you") voice throughout. This is text that will be shown TO the client, so speak directly to them using "you", never third-person.

FORBIDDEN WORDS in Therapy Summary: "the individual", "they", "the client", "sessions have", "discussions have". 
REQUIRED WORDS in Therapy Summary: "You have", "Your sessions", "You've", "You are", "You discussed".

The **Therapy Summary** should be written in second-person ("you") voice, speaking directly TO the client. This is a summary of all sessions (not just the current one). Always use "you" throughout - for example: "You have been working on...", "Your sessions have focused on...", "You've made progress in...". 

WRONG EXAMPLE: "Sessions have continued to explore... The individual has acknowledged..."
CORRECT EXAMPLE: "You have continued to explore... You've acknowledged..."

The final compiled therapy Summary should be very readable and at maximum 4 sentences, always in second-person voice.

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

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are an assistant helping maintain a therapy profile.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const content = response.choices[0]?.message?.content || '';
  return parseTherapyInsights(content.trim());
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
    console.log('🔍 [Process Transcript] Initial insights extracted:', {
      title: newInsights.title,
      goalCount: newInsights.goals.length,
      goals: newInsights.goals,
      themeCount: newInsights.themes.length,
      themes: newInsights.themes,
      bio: newInsights.bio?.substring(0, 100) + '...'
    });

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
    
    console.log('🔀 [Process Transcript] Synthesized profile:', {
      title: synthesized.title,
      goalsCount: synthesized.goals?.length || 0,
      goals: synthesized.goals,
      themesCount: synthesized.themes?.length || 0,
      themes: synthesized.themes
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
    console.log('🎯 [Process Transcript] Synthesized goals:', synthesized.goals);
    
    if (synthesized.goals.length > 0) {
      // Get existing goals for this user
      const { data: existingGoals } = await supabase
        .from('goals')
        .select('title')
        .eq('user_id', userId)
        .eq('is_active', true);

      const existingGoalTitles = existingGoals?.map(g => g.title.toLowerCase()) || [];
      console.log('🎯 [Process Transcript] Existing goal titles:', existingGoalTitles);
      
      // Insert new goals that don't already exist
      const newGoals = synthesized.goals
        .filter(goal => !existingGoalTitles.includes(goal.toLowerCase()))
        .map(goal => ({
          user_id: userId,
          title: goal,
          is_active: true
        }));

      console.log('🎯 [Process Transcript] New goals to insert:', newGoals);

      if (newGoals.length > 0) {
        console.log('🎯 [Process Transcript] Attempting to insert goals:', JSON.stringify(newGoals, null, 2));
        
        const { data: insertedGoals, error: goalInsertError } = await supabase
          .from('goals')
          .insert(newGoals)
          .select();
        
        if (goalInsertError) {
          console.error('🎯 [Process Transcript] Error inserting goals:', goalInsertError);
        } else {
          console.log('✅ [Process Transcript] Successfully inserted', newGoals.length, 'new goals:', insertedGoals);
        }
      } else {
        console.log('🎯 [Process Transcript] No new goals to insert (all already exist)');
      }
    } else {
      console.log('🎯 [Process Transcript] No goals extracted from session');
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[Process Transcript Error]', err.message || err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
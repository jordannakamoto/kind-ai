import { NextRequest, NextResponse } from 'next/server';

import OpenAI from 'openai';
import { supabase } from '@/supabase/client';

const client = new OpenAI();

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();
    if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

    // Fetch user profile
    const { data: user } = await supabase
      .from('users')
      .select('bio, goals, themes, therapy_summary')
      .eq('id', userId)
      .single();

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Fetch original module
    const { data: module } = await supabase
      .from('therapy_modules')
      .select('greeting, instructions, agenda')
      .eq('name', 'Default Daily Check In')
      .single();

    if (!module) return NextResponse.json({ error: 'Therapy module not found' }, { status: 404 });

    const input = `
You are a clinical therapy assistant that helps personalize therapy sessions.

Below is the original template:
Greeting: ${module.greeting}
Instructions: ${module.instructions}
Agenda: ${module.agenda}

Here is the client’s profile:
Bio: ${user.bio || '[none]'}
Goals: ${user.goals || '[none]'}
Themes: ${user.themes || '[none]'}
Therapy Summary: ${user.therapy_summary || '[none]'}

Adapt the greeting, instructions, and agenda to feel natural, responsive, and therapist-like. Reflect the client’s current journey and profile and highlight progress or struggles. Preserve structure and length. Use warm, clear language that sounds like a real therapist adapting their usual flow.

Respond in the following format:

Greeting: ...
Instructions: ...
Agenda: ...
    `;

    const response = await client.responses.create({
      model: 'gpt-4o',
      input,
    });

    const raw = response.output_text.trim();

    const greeting = raw.match(/Greeting:\s*([\s\S]*?)Instructions:/)?.[1]?.trim() || '';
    const instructions = raw.match(/Instructions:\s*([\s\S]*?)Agenda:/)?.[1]?.trim() || '';
    const agenda = raw.match(/Agenda:\s*([\s\S]*)$/)?.[1]?.trim() || '';

    console.log( greeting, instructions, agenda )

    return NextResponse.json({ greeting, instructions, agenda });
  } catch (err: any) {
    console.error('[Module Synthesis Error]', err.message || err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


// /api/synthesize-therapy-session
// 	•	Uses updated profile + template to create a personalized next_session
// 	•	Stores in next_sessions table

import { NextRequest, NextResponse } from 'next/server';

import OpenAI from 'openai';
import { supabase } from '@/supabase/client';

const client = new OpenAI();

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    // Fetch user profile
    const { data: user } = await supabase
      .from('users')
      .select('bio, goals, themes, therapy_summary')
      .eq('id', userId)
      .single();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Fetch original module
    const { data: module } = await supabase
      .from('therapy_modules')
      .select('greeting, instructions, agenda')
      .eq('name', 'Default Daily Check In')
      .single();

    if (!module) {
      return NextResponse.json({ error: 'Therapy module not found' }, { status: 404 });
    }

    const input = `
    You are a clinical therapy assistant that personalizes structured session modules based on a client’s current profile.
    
    Below is the original session template:
    Greeting: ${module.greeting}
    Instructions: ${module.instructions}
    Agenda: ${module.agenda}
    
    Here is the client’s current profile:
    Bio: ${user.bio || '[none]'}
    Goals: ${user.goals || '[none]'}
    Themes: ${user.themes || '[none]'}
    Therapy Summary: ${user.therapy_summary || '[none]'}
    
    Please adapt the three fields below using the following guidelines:
    
    • Greeting: Use warm, natural language as a therapist would to begin a session. Mention any progress, concern, or tone that feels relevant.
    • Instructions: Keep brief and clear — this is what the conversational agent will follow structurally. Adjust it only if necessary for flow or pacing.
    • Agenda: Move the macro therapy arc forward. Think like a real therapist: what would be the next step based on their progress, themes, or struggles? Frame the agenda as a sequence of topics or questions the agent should cover, with some flexibility.
    
    Respond using this exact format:
    
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

    // ✅ Upsert next session record in Supabase
    const { error } = await supabase.from('next_sessions').upsert({
      user_id: userId,
      greeting,
      instructions,
      agenda,
      status: 'ready', // ✅ mark it ready
    });

    if (error) {
      console.error('[Supabase Upsert Error]', error);
      return NextResponse.json({ error: 'Failed to store next session' }, { status: 500 });
    }

    return NextResponse.json({ greeting, instructions, agenda });
  } catch (err: any) {
    console.error('[Module Synthesis Error]', err.message || err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
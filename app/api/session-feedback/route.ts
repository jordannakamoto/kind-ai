// app/api/session-feedback/route.ts
import { NextRequest, NextResponse } from 'next/server';

import OpenAI from 'openai';

const client = new OpenAI();

type FeedbackNotes = {
  next_steps: string;
  insight: string;
  challenge: string;
};

function parseTherapistFeedback(raw: string): FeedbackNotes {
  const extract = (label: string) => {
    const match = raw.match(new RegExp(`${label}:\\s*([\\s\\S]*?)(?=\\n\\w+:|$)`, 'i'));
    return match?.[1]?.trim() ?? '';
  };

  return {
    next_steps: extract('Next Steps'),
    insight: extract('Insight'),
    challenge: extract('Challenge'),
  };
}

async function generateFeedbackFromTranscript(transcript: string): Promise<FeedbackNotes> {
  const input = `
You are a therapist reviewing a session transcript. Return a structured analysis in three parts:

1. **Next Steps**: Brief,bulleted 1 sentence practical and helpful next actions or contemplations for the client.
2. **Insight**: A thoughtful reflection or reframe that deepens the client’s self-understanding.
3. **Challenge**: A respectful but direct challenge to a core assumption, belief, or pattern.

Do not use excessive praise or generic validation. Your tone should be intelligent, supportive, and willing to provoke growth. Language should be simple, readable, and brief.

Use this format and do not bold any sections:

Next Steps:
<text>

Insight:
<text>

Challenge:
<text>

Transcript:
${transcript}
`;

  const res = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: input }],
    temperature: 0.65,
  });

  return parseTherapistFeedback(res.choices[0].message.content?.trim() || '');
}

export async function POST(req: NextRequest) {
  try {
    const { transcript } = await req.json();
    if (!transcript) {
      return NextResponse.json({ error: 'Transcript is required.' }, { status: 400 });
    }

    const feedback = await generateFeedbackFromTranscript(transcript);
    return NextResponse.json(feedback);
  } catch (err: any) {
    console.error('[Session Feedback Error]', err.message || err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@/supabase/server';

const client = new OpenAI();

interface CourseBuilderMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface CourseStructure {
  title: string;
  description: string;
  tags: string[];
  themes: string[];
  modules: ModuleStructure[];
}

interface ModuleStructure {
  name: string;
  description: string;
  greeting: string;
  instructions: string;
  agenda: string;
  order: number;
}

// System prompt for the AI course builder
const COURSE_BUILDER_SYSTEM_PROMPT = `You are an expert therapeutic course designer specializing in creating detailed, evidence-based therapy modules. You help create comprehensive therapy courses by engaging in interactive conversations.

Your role is to:
1. Ask clarifying questions about the therapy topic, target audience, and goals
2. Suggest evidence-based therapeutic approaches and techniques (CBT, DBT, ACT, mindfulness, etc.)
3. Help structure courses into logical, progressive modules that build skills step by step
4. Create detailed, rich module content that therapists can immediately implement
5. Ensure courses follow therapeutic best practices and are trauma-informed

Course Structure Guidelines:
- Courses should have 4-8 modules typically, each 45-60 minutes
- Each module should build upon previous ones with clear skill progression
- Modules must be highly detailed and actionable for AI therapists
- Include specific therapeutic techniques, interventions, and exercises
- Consider client readiness, motivation, and potential resistance

Module Components (must be comprehensive and detailed):

NAME: Clear, engaging title that reflects the module's core focus
DESCRIPTION: Rich 2-3 sentence description explaining what the module covers, why it matters, and how it fits into the overall therapeutic journey
GREETING: Warm, personalized opening (2-3 sentences) that:
  - Acknowledges progress from previous sessions
  - Sets a supportive, non-judgmental tone
  - Briefly previews what you'll work on together
  - Uses [User's Name] placeholder
INSTRUCTIONS: Comprehensive therapeutic guidelines (3-4 paragraphs) that include:
  - Primary therapeutic approach and techniques to use
  - How to handle resistance or difficult emotions
  - Specific interventions and when to use them
  - Pacing guidance and session flow
  - Key therapeutic principles to maintain
AGENDA: Detailed session structure with specific activities:
  - Check-in process and what to explore
  - 3-4 main therapeutic activities with specifics
  - Skills practice or exercises to implement
  - Wrap-up and takeaways
  - Bridge to next session

Example Quality Standard:
Name: "Lighten the Load"
Description: "Disorganization is a big part of ADHD, and it adds stress on top of everything else. In this session, we explore how clutter and chaos weigh you down, and practice small, ADHD-friendly ways to lighten the load so life feels more manageable."
Greeting: "Today we bring it all together. You've learned how to ease stress and see time differently — now let's talk about ADHD disorganization and how to make life feel lighter."
Instructions: "Invite clients to reflect on what kind of clutter feels heaviest and give them space to vent. Emphasize that ADHD systems don't have to be perfect. Work together to help reveal stuckness or identify ways out. Use validation and normalization extensively."
Agenda: "• Check-in on stress resets and time strategies • Explore how ADHD disorganization adds pressure • Help the client come up with ideas to 'lighten the load' in their mind or life • Wrap up with encouragement to count small wins"

When the user is ready to finalize a course, provide the complete structure in this exact JSON format:
{
  "title": "Course Title",
  "description": "Comprehensive course description (2-3 sentences)",
  "tags": ["specific", "relevant", "tags"],
  "themes": ["core", "therapeutic", "themes"],
  "modules": [
    {
      "name": "Engaging Module Name",
      "description": "Rich description explaining the module's purpose and relevance (2-3 sentences)",
      "greeting": "Warm, personalized greeting that sets tone and previews the session using [User's Name]",
      "instructions": "Comprehensive therapeutic guidelines with specific techniques, interventions, and approaches (3-4 detailed paragraphs)",
      "agenda": "Detailed bullet-pointed session structure with specific activities and goals",
      "order": 1
    }
  ]
}

Always create rich, detailed, clinically sound content that therapists can immediately use. Focus on practical, evidence-based interventions.

IMPORTANT BEHAVIORAL GUIDELINES:

1. PROACTIVE COURSE SAVING: When you have created a complete course with multiple detailed modules that appears ready for publication, proactively suggest saving it. Use phrases like:
   - "This course looks complete and ready for your therapy library. Shall I save it to the database?"
   - "I've created a comprehensive course that seems ready for publication. Would you like me to save it now?"
   - "This appears to be a well-structured, clinically sound course. Should I go ahead and save it to your database?"

2. AUTOMATIC FUNCTION CALLING: You have access to a save_course_to_database function. Use it automatically when:
   - You've created a complete course with 3+ detailed modules
   - Each module has comprehensive instructions, greetings, and agendas
   - The content is clinically sound and ready for therapist use
   - The user explicitly asks to save, finalize, create, or publish the course
   - The user says phrases like "save it", "finalize", "create the course", "ready to publish"

3. QUALITY ASSURANCE: Only save courses that meet high clinical standards:
   - Evidence-based therapeutic approaches
   - Detailed, actionable instructions for therapists
   - Progressive skill-building structure
   - Appropriate scope and depth for the target population

4. USER EXPERIENCE: Make the process smooth and efficient:
   - When saving automatically, announce what you're doing
   - Provide clear confirmation of successful saves
   - If you can't save due to missing information, ask specific questions to complete the course structure`;

export async function POST(req: NextRequest) {
  try {
    const { action, messages, courseData, content } = await req.json();

    // Create supabase client for server-side auth
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    switch (action) {
      case 'chat':
        return await handleChatMessage(messages);
      case 'save_course':
        return await saveCourse(courseData, supabase);
      case 'save_raw_content':
        return await formatAndSaveCourse(content, supabase);
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('AI Course Builder Error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}

async function handleChatMessage(messages: CourseBuilderMessage[]) {
  try {
    // Prepare messages for OpenAI
    const openaiMessages = [
      { role: 'system' as const, content: COURSE_BUILDER_SYSTEM_PROMPT },
      ...messages.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      }))
    ];

    // Enhanced classifier for user messages that should trigger function calling
    const lastUserMessage = messages[messages.length - 1];
    const userContent = lastUserMessage?.content.toLowerCase() || '';

    const saveKeywords = [
      'save', 'finalize', 'create the course', 'ready to publish', 'publish',
      'add to library', 'complete', 'finish', 'done', 'store', 'submit',
      'looks good', 'approve', 'accept', 'ready', 'go ahead', 'proceed'
    ];

    const shouldUseFunctionCalling = lastUserMessage && (
      saveKeywords.some(keyword => userContent.includes(keyword)) ||
      // Also check for affirmative responses to save suggestions
      (userContent.includes('yes') && userContent.length < 50) ||
      (userContent.includes('ok') && userContent.length < 50) ||
      userContent === 'y' || userContent === 'sure' || userContent === 'please'
    );

    if (shouldUseFunctionCalling) {
      // Use function calling (non-streaming)
      const response = await client.chat.completions.create({
        model: 'gpt-4o',
        messages: openaiMessages,
        temperature: 0.7,
        max_tokens: 3000,
        tools: [
          {
            type: "function",
            function: {
              name: "save_course_to_database",
              description: "Save a complete therapy course with modules to the database. Use this when you have created a complete course structure that is ready for publication.",
              parameters: {
                type: "object",
                properties: {
                  title: {
                    type: "string",
                    description: "Course title"
                  },
                  description: {
                    type: "string",
                    description: "Course description (2-3 sentences)"
                  },
                  tags: {
                    type: "array",
                    items: { type: "string" },
                    description: "Relevant tags for the course"
                  },
                  themes: {
                    type: "array",
                    items: { type: "string" },
                    description: "Core therapeutic themes"
                  },
                  modules: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string", description: "Module name" },
                        description: { type: "string", description: "Module description" },
                        greeting: { type: "string", description: "Session greeting with [User's Name]" },
                        instructions: { type: "string", description: "Detailed therapeutic instructions" },
                        agenda: { type: "string", description: "Session agenda" },
                        order: { type: "number", description: "Module order number" }
                      },
                      required: ["name", "description", "greeting", "instructions", "agenda", "order"]
                    }
                  }
                },
                required: ["title", "description", "tags", "themes", "modules"]
              }
            }
          }
        ],
        tool_choice: "auto"
      });

      const choice = response.choices[0];
      const toolCalls = choice.message?.tool_calls;

      if (toolCalls && toolCalls.length > 0) {
        const toolCall = toolCalls[0];
        if (toolCall.function.name === 'save_course_to_database') {
          try {
            const courseData = JSON.parse(toolCall.function.arguments);
            // Save to database using existing function
            const supabase = await createClient();
            await saveCourse(courseData, supabase);

            return NextResponse.json({
              message: `✅ Perfect! I've successfully saved the course "${courseData.title}" to the database with ${courseData.modules.length} modules. The course is now available in your therapy library and ready for use with clients.`,
              toolCall: true,
              courseData: courseData
            });
          } catch (error: any) {
            return NextResponse.json({
              message: `I attempted to save the course but encountered an error: ${error.message}. Let me provide the course structure so you can save it manually.`,
              toolCall: false
            });
          }
        }
      }

      // If no tool call, return the regular message
      return NextResponse.json({
        message: choice.message?.content || 'No response generated',
        toolCall: false
      });
    }

    // Use streaming for regular responses
    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: openaiMessages,
      temperature: 0.7,
      max_tokens: 3000,
      stream: true,
    });

    // Create a readable stream to send back to the client
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of response) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              const data = encoder.encode(`data: ${JSON.stringify({ content })}\n\n`);
              controller.enqueue(data);
            }
          }

          // Send completion marker
          const endData = encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`);
          controller.enqueue(endData);
          controller.close();
        } catch (error) {
          console.error('Stream error:', error);
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error: any) {
    console.error('Chat Error:', error);
    return NextResponse.json({
      error: 'Failed to get AI response',
      details: error.message
    }, { status: 500 });
  }
}

async function saveCourse(courseData: CourseStructure, supabase: any) {
  try {
    // Validate course data
    if (!courseData.title || !courseData.description || !courseData.modules?.length) {
      return NextResponse.json({
        error: 'Invalid course data. Title, description, and modules are required.'
      }, { status: 400 });
    }

    // Create the course
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .insert({
        title: courseData.title,
        description: courseData.description,
        tags: courseData.tags || [],
        themes: courseData.themes || [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (courseError || !course) {
      throw new Error(`Failed to create course: ${courseError?.message}`);
    }

    // Create the modules
    const modulesToInsert = courseData.modules.map(module => ({
      name: module.name,
      description: module.description,
      greeting: module.greeting,
      instructions: module.instructions,
      agenda: module.agenda,
      course_id: course.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    const { data: modules, error: modulesError } = await supabase
      .from('therapy_modules')
      .insert(modulesToInsert)
      .select();

    if (modulesError) {
      // Try to clean up the course if module creation fails
      await supabase.from('courses').delete().eq('id', course.id);
      throw new Error(`Failed to create modules: ${modulesError.message}`);
    }

    return NextResponse.json({
      success: true,
      course: {
        ...course,
        modules: modules
      }
    });

  } catch (error: any) {
    console.error('Save Course Error:', error);
    return NextResponse.json({
      error: 'Failed to save course',
      details: error.message
    }, { status: 500 });
  }
}

async function formatAndSaveCourse(rawContent: string, supabase: any) {
  try {
    // Use AI to format the raw content into structured course data
    const formatPrompt = `You are a course formatting specialist. Take the following raw course content and format it into a proper JSON structure that matches our therapy course database schema.

Extract and organize the content into:
1. Course title and description
2. Relevant tags and themes
3. Individual modules with detailed fields

Each module must have:
- name: Clear, descriptive module title
- description: 2-3 sentences explaining the module's purpose
- greeting: Warm, personalized opening message (include [User's Name] placeholder)
- instructions: Comprehensive therapeutic guidelines (3-4 detailed paragraphs)
- agenda: Detailed bullet-pointed session structure
- order: Sequential number starting from 1

Return ONLY valid JSON in this exact format:
{
  "title": "Course Title",
  "description": "Course description (2-3 sentences)",
  "tags": ["tag1", "tag2"],
  "themes": ["theme1", "theme2"],
  "modules": [
    {
      "name": "Module Name",
      "description": "Module description",
      "greeting": "Greeting with [User's Name]",
      "instructions": "Detailed therapeutic instructions",
      "agenda": "Detailed agenda",
      "order": 1
    }
  ]
}

Raw content to format:
${rawContent}`;

    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: formatPrompt }],
      temperature: 0.3,
      max_tokens: 3000,
    });

    const formattedContent = response.choices[0]?.message?.content;
    if (!formattedContent) {
      throw new Error('No formatted content received from AI');
    }

    // Extract JSON from the response
    const jsonMatch = formattedContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON structure found in AI response');
    }

    const courseData = JSON.parse(jsonMatch[0]);

    // Validate the structure
    if (!courseData.title || !courseData.description || !courseData.modules?.length) {
      throw new Error('Invalid course structure. Missing required fields.');
    }

    // Save to database using existing saveCourse function
    return await saveCourse(courseData, supabase);

  } catch (error: any) {
    console.error('Format and Save Error:', error);
    return NextResponse.json({
      error: 'Failed to format and save course',
      details: error.message
    }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
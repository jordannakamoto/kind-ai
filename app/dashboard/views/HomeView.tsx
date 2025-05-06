'use client';

import { useEffect, useRef, useState } from 'react';

import { supabase } from '@/supabase/client';
import { useConversation } from '@11labs/react';

export default function UserCheckInConversation() {
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [agentMessage, setAgentMessage] = useState('');
  const [amplitude, setAmplitude] = useState(0);
  const [started, setStarted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [loadingVars, setLoadingVars] = useState(true);
  const [sessionStatus, setSessionStatus] = useState<string | null>(null);
  const [module, setModule] = useState<{ greeting: string; instructions: string; agenda: string } | null>(null);

  const varsRef = useRef<{
    userProfile: string;
    therapyModule: string;
    greeting: string;
    systemPrompt: string;
  }>({
    userProfile: '',
    therapyModule: '',
    greeting: '',
    systemPrompt: '',
  });

  const animationRef = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startSound = useRef<HTMLAudioElement | null>(null);
  const endSound = useRef<HTMLAudioElement | null>(null);

  const conversation = useConversation({
    onMessage: (msg) => {
      if (
        typeof msg === 'object' &&
        msg !== null &&
        'message' in msg &&
        'source' in msg &&
        (msg as any).source === 'agent'
      ) {
        setAgentMessage((msg as any).message);
      }
    },
    onConnect: () => {
      intervalRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
      startSound.current?.play();
    },
    onDisconnect: () => {
      endSound.current?.play();
      if (intervalRef.current) clearInterval(intervalRef.current);
    },
    onError: (err) => console.error('conversation error:', err),
  });
  const fetchUserContext = async () => {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    if (!authUser) return;
  
    setUser({ id: authUser.id, email: authUser.email! });
  
    const { data: profile } = await supabase
      .from('users')
      .select('bio, therapy_summary, themes, goals, email')
      .eq('id', authUser.id)
      .single();
  
    const { data: prompt } = await supabase
      .from('system_prompts')
      .select('prompt')
      .eq('name', 'Conversational 1')
      .single();
  
    const { data: nextSession } = await supabase
      .from('next_sessions')
      .select('greeting, instructions, agenda, status')
      .eq('user_id', authUser.id)
      .single();
  
    let finalModule = null;
  
    if (nextSession && nextSession.status === 'ready') {
      finalModule = nextSession;
      setSessionStatus('ready');
    } else {
      setSessionStatus(nextSession?.status || 'pending');
  
      const { data: fallback } = await supabase
        .from('therapy_modules')
        .select('greeting, instructions, agenda')
        .eq('name', 'Default Daily Check In')
        .single();
  
      finalModule = fallback;
    }
  
    if (!profile || !prompt || !finalModule) {
      console.warn('Missing user context data:', { profile, prompt, module: finalModule });
      return;
    }
  
    varsRef.current = {
      userProfile: `Bio: ${profile.bio}\nTherapy Summary: ${profile.therapy_summary}\nThemes: ${profile.themes}\nGoals: ${profile.goals}`,
      therapyModule: `Instructions: ${finalModule.instructions}\nAgenda: ${finalModule.agenda}`,
      greeting: finalModule.greeting,
      systemPrompt: prompt.prompt,
    };
  
    setModule(finalModule);
    setLoadingVars(false);
  };
  
  useEffect(() => {

    fetchUserContext();
  }, []);

  // Poll for session processing to finish
  useEffect(() => {
    if (sessionStatus !== 'pending') return;
  
    const interval = setInterval(async () => {
      const { data: session } = await supabase
        .from('next_sessions')
        .select('greeting, instructions, agenda, status')
        .eq('user_id', user?.id)
        .single();
  
      if (session?.status === 'ready') {
        setModule(session);
        setSessionStatus('ready');
  
        varsRef.current.therapyModule = `Instructions: ${session.instructions}\nAgenda: ${session.agenda}`;
        varsRef.current.greeting = session.greeting;
  
        clearInterval(interval);
      }
    }, 5000); // every 5 seconds
  
    return () => clearInterval(interval);
  }, [sessionStatus, user?.id]);

  useEffect(() => {
    if (!started) return;

    const animate = () => {
      const vol = conversation.isSpeaking
        ? conversation.getOutputVolume()
        : conversation.getInputVolume();
      setAmplitude((prev) => prev * 0.6 + vol * 0.4);
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [started, conversation.isSpeaking]);

  const startConversation = async () => {
    if (!user || loadingVars) return;

    const res = await fetch(`/api/elevenlabs-connection?user_email=${user.email}`);
    const { signedUrl } = await res.json();

    const id = await conversation.startSession({
      signedUrl,
      dynamicVariables: varsRef.current,
    });

    await fetch('/api/ai-therapist/cache-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId: id, userId: user.id }),
    });

    setStarted(true);
    setDuration(0);
  };

  const stopConversation = async () => {
    await conversation.endSession();
    setStarted(false);
    setAmplitude(0);
    setAgentMessage('');
    setDuration(0);
  
    // Clear vars and set loading state
    varsRef.current = {
      userProfile: '',
      therapyModule: '',
      greeting: '',
      systemPrompt: '',
    };
    setLoadingVars(true);
  
    // Re-fetch context
    await fetchUserContext();
  };

  const orbSize = 120 + amplitude * 40;

  const formatTime = (seconds: number): string =>
    `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60)
      .toString()
      .padStart(2, '0')}`;

  return (
    <div className="w-full max-w-2xl mx-auto py-10 px-4 flex items-center justify-between transition-all duration-300">
      {/* Left Panel */}
      <div className="text-left space-y-1 text-gray-700">
        <p className="text-lg font-semibold">Maya</p>
        <p className="text-sm">{formatTime(duration)}</p>
        <p className="text-sm text-gray-400">
          {conversation.status !== 'connected'
            ? 'Idle'
            : conversation.isSpeaking
            ? 'Speaking...'
            : 'Listening...'}
        </p>
      </div>

      {/* Orb */}
      <div
        className="relative flex items-center justify-center"
        style={{ width: '200px', height: '200px' }}
      >
        <div
          className="absolute rounded-full transition-transform duration-100 ease-in-out"
          style={{
            width: `${orbSize}px`,
            height: `${orbSize}px`,
            transform: `scale(${1 + amplitude * 0.15})`,
          }}
        >
          <div className="absolute inset-0 rounded-full overflow-hidden">
            <div className="absolute w-full h-full bg-gradient-to-br from-[#dbeafe] via-[#e0e7ff] to-[#c7d2fe] opacity-60 blur-2xl" />
            <div className="absolute w-full h-full bg-gradient-to-tl from-[#fdf2f8] via-white to-[#f3f4f6] opacity-30 blur-3xl mix-blend-lighten" />
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex flex-col items-end gap-4 text-gray-600">
        {started && agentMessage && (
          <p className="text-sm max-w-[180px] text-right text-gray-700 leading-snug">{agentMessage}</p>
        )}
        {started && (
          <button className="flex items-center gap-2 hover:text-black">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 1v2m6.364 1.636l-1.414 1.414M21 12h-2m-1.636 6.364l-1.414-1.414M12 21v-2m-6.364-1.636l1.414-1.414M3 12h2m1.636-6.364l1.414 1.414"
              />
            </svg>
            <span className="text-sm">Mute</span>
          </button>
        )}
        {started ? (
          <button onClick={stopConversation} className="flex items-center gap-2 hover:text-black">
            <div className="w-3 h-3 bg-red-500 rounded-sm" />
            <span className="text-sm">End call</span>
          </button>
        ) : (
          <button
            onClick={startConversation}
            className="px-4 py-2 border border-gray-300 rounded-full hover:bg-gray-50 text-sm disabled:opacity-50"
            disabled={loadingVars}
          >
            {loadingVars ? 'Loading...' : 'Start Check-In'}
          </button>
        )}
      </div>
    </div>
  );
}
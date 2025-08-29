'use client';

import { Flag, StickyNote } from 'lucide-react';
import { useEffect, useState } from 'react';

import { ArrowLeft } from 'lucide-react';
import { supabase } from '@/supabase/client';
import LoadingDots from '@/components/LoadingDots';

interface Session {
  id: string;
  created_at: string;
  title: string | null;
  summary: string | null;
  notes: string | null;
  transcript: string | null;
  duration_minutes: number | null;
}

export default function SessionDetailView({
  sessionId,
  onBack,
}: {
  sessionId: string;
  onBack?: () => void;
}) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const [feedback, setFeedback] = useState<{
    next_steps: string;
    insight: string;
    challenge: string;
  } | null>(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  useEffect(() => {
    const fetchSession = async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error) console.error('Failed to load session:', error.message);
      else setSession(data);
      setLoading(false);
    };

    if (sessionId) fetchSession();
  }, [sessionId]);

  useEffect(() => {
    const fetchFeedback = async () => {
      if (!session?.transcript) return;
      setFeedbackLoading(true);
      const res = await fetch('/api/session-feedback', {
        method: 'POST',
        body: JSON.stringify({ transcript: session.transcript }),
        headers: { 'Content-Type': 'application/json' },
      });
      const json = await res.json();
      setFeedback(json);
      setFeedbackLoading(false);
    };

    if (session?.transcript && !isPlaceholder) {
      fetchFeedback();
    }
  }, [session]);

  const extractNoteSection = (label: string): string => {
    const regex = new RegExp(`${label}:\\s*([\\s\\S]*?)(?=\\n\\w+:|$)`, 'i');
    const match = session?.notes?.match(regex);
    return match?.[1]?.trim() || '—';
  };

  if (loading || !session) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        <LoadingDots text="Loading session" />
      </div>
    );
  }

  const { title, summary, transcript, notes, duration_minutes, created_at } = session;
  const isPlaceholder = title === 'Recent Session' && summary === 'Summarizing...';

  return (
    <div className="max-w-3xl mx-auto h-full px-4 py-10 space-y-10 animate-fade-in overflow-scroll bg-gray-50">
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Sessions
        </button>
      )}

      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-neutral-900">{title || 'Untitled Session'}</h1>
        <p className="text-sm text-neutral-500">
          {new Date(created_at).toLocaleString()} • {duration_minutes ?? '0'} min
        </p>
      </div>

      <div className="space-y-4">
        {/* <h2 className="text-lg font-semibold text-neutral-800">Summary</h2> */}
        {isPlaceholder ? (
          <p className="text-sm text-neutral-500 italic">Summarizing...</p>
        ) : (
          <p className="text-sm text-neutral-700 whitespace-pre-line">{summary}</p>
        )}
      </div>

      {/* Feedback Section Wrapper */}
<div className="min-h-[480px] transition-all duration-300 ease-in-out">
  {feedbackLoading && (
    <p className="text-sm text-neutral-400 italic">Analyzing session for insight...</p>
  )}

  {feedback && (
    <div className="space-y-10 animate-fade-slide-in">
      {/* Therapist Notes */}
      <div className="border-t border-neutral-200 pt-6 space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-neutral-800">
          <StickyNote className="w-5 h-5 text-indigo-600" />
          Therapist Notes
        </h2>

        <div className="space-y-6 pl-1 pr-6 md:pr-6">
          <div>
            <h3 className="text-sm font-semibold text-neutral-700 mb-1">Insight</h3>
            <p className="text-sm text-neutral-800 leading-relaxed whitespace-pre-line">
              {feedback.insight}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-neutral-700 mb-1">Challenge</h3>
            <p className="text-sm text-neutral-800 leading-relaxed whitespace-pre-line">
              {feedback.challenge}
            </p>
          </div>
        </div>
      </div>

      {/* Next Steps Section */}
      <div className="border-t border-neutral-200 pt-6 space-y-4 pr-6 md:pr-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-neutral-800">
          <Flag className="w-5 h-5 text-indigo-600" />
          Next Steps
        </h2>
        <p className="text-sm text-neutral-800 leading-relaxed whitespace-pre-line pl-1">
          {feedback.next_steps}
        </p>
      </div>
    </div>
  )}
</div>

      {transcript && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-neutral-800">Transcript</h2>
          <div className="max-h-[500px] overflow-y-auto pr-2 flex flex-col space-y-2">
            {transcript
              .split('\n')
              .filter((line) => line.trim() !== '')
              .map((line, index) => {
                const isUser = line.toLowerCase().startsWith('you:');
                const content = line.replace(/^(you|therapist):/i, '').trim();

                return (
                  <div
                    key={index}
                    className={`max-w-xs md:max-w-sm px-4 py-2 rounded-2xl text-sm transition-opacity duration-300 ${
                      isUser
                        ? 'bg-indigo-100 text-indigo-800 self-end ml-auto'
                        : 'bg-neutral-200 text-neutral-800 self-start mr-auto'
                    }`}
                  >
                    {content}
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
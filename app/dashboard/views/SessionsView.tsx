'use client';

import { useEffect, useState } from 'react';

import { supabase } from '@/supabase/client';

interface Session {
  id: string;
  created_at: string;
  title: string | null;
  summary: string | null;
  notes: string | null;
  transcript: string | null;
  duration_minutes: number | null;
}

export default function UserSessionHistory() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) return;
      setUserId(data.user.id);
    };
    getUser();
  }, []);

  useEffect(() => {
    const fetchSessions = async () => {
      if (!userId) return;
      setLoading(true);
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) console.error('Error loading sessions:', error.message);
      else setSessions(data || []);
      setLoading(false);
    };

    fetchSessions();
  }, [userId]);

  return (
    <div className="max-w-3xl mx-auto px-4 pt-10">
      <h2 className="text-lg font-semibold mb-4">Your Session History</h2>

      {loading ? (
        <p className="text-sm text-gray-500 italic">Loading sessions...</p>
      ) : sessions.length === 0 ? (
        <p className="text-sm text-gray-500 italic">You haven't had any sessions yet.</p>
      ) : (
        <div className="space-y-4">
          {sessions.map(session => (
            <div key={session.id} className="p-4 bg-white rounded-lg shadow border border-gray-100">
              <div className="flex justify-between items-center text-xs text-gray-400 mb-1">
                <span>{new Date(session.created_at).toLocaleString()}</span>
                {session.duration_minutes && <span>{session.duration_minutes} min</span>}
              </div>
              <div className="text-sm font-semibold mb-1">{session.title || 'Untitled Session'}</div>
              {session.summary && (
                <div className="mb-2">
                  <div className="text-sm font-medium text-gray-600">Summary</div>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">{session.summary}</p>
                </div>
              )}
              {session.notes && (
                <div className="mb-2">
                  <div className="text-sm font-medium text-gray-600">Notes</div>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">{session.notes}</p>
                </div>
              )}
              {session.transcript && (
                <details className="text-sm text-gray-700 whitespace-pre-wrap mt-2">
                  <summary className="cursor-pointer text-blue-500 hover:underline">View Transcript</summary>
                  <div className="mt-1">{session.transcript}</div>
                </details>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
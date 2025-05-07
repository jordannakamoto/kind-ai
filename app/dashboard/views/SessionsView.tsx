'use client';

import { sessionCache, setSessionCache } from '@/app/contexts/sessionCache';
import { useEffect, useRef, useState } from 'react';

import { supabase } from '@/supabase/client';
import { useConversationStatus } from '@/app/contexts/ConversationContext';
import { useRouter } from 'next/navigation';

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
  const [sessions, setSessions] = useState(() => sessionCache);
  const [loading, setLoading] = useState(() => sessionCache.length === 0);  
  const [userId, setUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { conversationEnded, pollingStatus, setPollingStatus } = useConversationStatus();
  const router = useRouter();

  const handleSelectSession = (id: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set('sid', id);
    router.replace(url.toString());
  };

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

      if (!error && data) {
        setSessionCache(data);
        setSessions(data); // ← This ensures sessions state is set too
            } else {
        console.error('Error loading sessions:', error?.message);
      }
      setLoading(false);
    };
    fetchSessions();
  }, [userId]);

  useEffect(() => {
    if (!userId || !conversationEnded || pollingStatus.sessionsUpdated) return;

    const interval = setInterval(async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setSessionCache(data);
        setSessions(data);

        const newest = data[0];
        const isPlaceholder =
          newest?.title === 'Recent Session' && newest?.summary === 'Summarizing...';

        if (!isPlaceholder) {
          setPollingStatus({ sessionsUpdated: true });
          clearInterval(interval);
        }
      } else {
        console.error('Polling error:', error?.message);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [conversationEnded, pollingStatus.sessionsUpdated, userId, setPollingStatus]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }) + ' • ' + date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const baseSessions = loading && sessionCache.length > 0
  ? sessionCache
  : sessions;

  const filteredSessions = baseSessions.filter((session) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      session.title?.toLowerCase().includes(q) ||
      session.summary?.toLowerCase().includes(q) ||
      session.notes?.toLowerCase().includes(q)
    );
  });

  const showEmptyMessage = !loading && filteredSessions.length === 0;

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 bg-neutral-50">
      <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-6 bg-white p-4 rounded-xl shadow-sm">
        <div className="relative flex-1 w-full">
          <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search sessions..."
            className="w-full py-2.5 pl-10 pr-4 rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {showEmptyMessage ? (
        <p className="text-sm text-neutral-500 italic">
          {searchQuery ? 'No sessions match your search.' : 'You haven’t had any sessions yet.'}
        </p>
      ) : (
        <div className="space-y-4">
          {filteredSessions.map((session) => {
            const isPlaceholder =
              session.title === 'Recent Session' && session.summary === 'Summarizing...';

            return (
              <div
                key={session.id}
                className={`bg-white rounded-xl overflow-hidden transition-all duration-500 ease-in-out transform hover:shadow-md hover:-translate-y-0.5 relative ${
                  isPlaceholder ? 'opacity-50' : 'opacity-100 shadow-sm'
                }`}
              >
                <button
                  onClick={() => handleSelectSession(session.id)}
                  className="block w-full text-left text-inherit no-underline"
                >
                  <div className="grid grid-cols-[1fr_auto] items-center p-5 w-full">
                    <h2 className="text-base font-semibold text-neutral-900">
                      {session.title || 'Untitled Session'}
                    </h2>
                    <div className="flex items-center gap-2 text-sm text-neutral-500 text-right">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                      {formatDate(session.created_at)}
                    </div>
                  </div>
                  <div className="h-px bg-neutral-100 w-full" />
                  {session.summary && (
                    <div className="flex items-start">
                      <div className="flex-1 p-5 text-sm text-neutral-700 leading-relaxed">
                        {session.summary}
                      </div>
                      <div className="flex items-center justify-center w-10 h-full pt-5">
                        <svg className="w-4 h-4 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </div>
                    </div>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
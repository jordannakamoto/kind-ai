'use client';

import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/supabase/client';
import { useConversationStatus } from '@/app/contexts/ConversationContext';

interface Session {
  id: string;
  user_id: string;
  created_at: string;
  title: string | null;
  transcript: string | null;
  summary: string | null;
  notes: string | null;
  duration_minutes: number | null;
}

interface User {
  id: string;
  email: string;
}

export default function SessionsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Look for state updates
  const { conversationEnded, setPollingStatus, pollingStatus } = useConversationStatus();
  
  const fetchUsers = useCallback(async () => {
    const { data, error } = await supabase.from('users').select('id, email');
    if (error) {
      console.error('Error fetching users:', error.message);
    } else {
      setUsers(data || []);
    }
  }, []);

  const fetchSessions = useCallback(async (userId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
  
    setLoading(false);
  
    if (error) {
      console.error('Error fetching sessions:', error.message);
      return []; // Return empty array on error
    } else {
      setSessions(data || []);
      return data || []; // ✅ Return the session list
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    if (selectedUserId) fetchSessions(selectedUserId);
  }, [selectedUserId, fetchSessions]);

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    if (!selectedUserId || !conversationEnded || pollingStatus.sessionsUpdated) return;
  
    const interval = setInterval(() => {
      fetchSessions(selectedUserId).then((updated) => {
        if (updated.length > sessions.length) {
          // Mark sessions as updated
          setPollingStatus({ sessionsUpdated: true });
          clearInterval(interval);
        }
      });
    }, 3000);
  
    return () => clearInterval(interval);
  }, [conversationEnded, selectedUserId, sessions.length, fetchSessions, pollingStatus.sessionsUpdated]);
  
  return (
    <div className="pt-0">
      <h2 className="text-lg font-medium mb-2">Therapy Sessions</h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {/* Sidebar: User list */}
        <div className="md:col-span-1 space-y-3">
          <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
            <div className="mb-2">
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full p-1.5 text-xs bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-1.5 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
              {filteredUsers.map(user => (
                <div
                  key={user.id}
                  onClick={() => setSelectedUserId(user.id)}
                  className={`p-2 rounded-md cursor-pointer text-xs ${
                    selectedUserId === user.id
                      ? 'bg-blue-50 border border-blue-200'
                      : 'hover:bg-gray-50 border border-gray-100'
                  }`}
                >
                  <div className="font-medium truncate">{user.email}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main content: Sessions */}
        <div className="md:col-span-3 space-y-3">
          {selectedUserId ? (
            <>
              <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                <h3 className="text-sm font-medium mb-2">Session History</h3>
                {loading ? (
                  <p className="text-sm text-gray-500 italic">Loading sessions...</p>
                ) : sessions.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No sessions found for this user.</p>
                ) : (
                  sessions.map(session => (
                    <div key={session.id} className="mb-4 p-3 border border-gray-100 rounded-md bg-gray-50">
                      <div className="flex justify-between items-center text-xs text-gray-400 mb-1">
                        <span>{new Date(session.created_at).toLocaleString()}</span>
                        {session.duration_minutes && (
                          <span>{session.duration_minutes} min</span>
                        )}
                      </div>

                      <div className="text-sm font-semibold mb-1">{session.title || 'Untitled Session'}</div>

                      <div className="mb-2">
                        <div className="text-sm font-medium mb-0.5 text-gray-600">Summary</div>
                        <div className="text-sm text-gray-800 whitespace-pre-wrap">{session.summary || '—'}</div>
                      </div>

                      <div className="mb-2">
                        <div className="text-sm font-medium mb-0.5 text-gray-600">Notes</div>
                        <div className="text-sm text-gray-800 whitespace-pre-wrap">{session.notes || '—'}</div>
                      </div>

                      {session.transcript && (
                        <details className="text-sm text-gray-700 whitespace-pre-wrap mt-2">
                          <summary className="cursor-pointer text-blue-500 hover:underline">View Transcript</summary>
                          <div className="mt-1">{session.transcript}</div>
                        </details>
                      )}
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex flex-col items-center justify-center h-64">
              <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-500 text-sm mb-4">Select a user to view their session history</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
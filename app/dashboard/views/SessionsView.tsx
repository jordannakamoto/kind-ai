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
  const [showCalendar, setShowCalendar] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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

  // Function to format date nicely
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric'
    }) + ' • ' + 
    date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  // Filter sessions based on search query
  const filteredSessions = sessions.filter(session => {
    if (!searchQuery) return true;
    
    const searchLower = searchQuery.toLowerCase();
    return (
      (session.title?.toLowerCase().includes(searchLower) || false) ||
      (session.summary?.toLowerCase().includes(searchLower) || false) ||
      (session.notes?.toLowerCase().includes(searchLower) || false)
    );
  });

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 bg-neutral-50">
      {/* Header */}
      {/* <header className="mb-10">
        <h1 className="text-3xl font-bold text-neutral-900 mb-2">Your Session History</h1>
        <p className="text-neutral-500 text-lg">Review your previous therapy sessions</p>
      </header> */}

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-6 bg-white p-4 rounded-xl shadow-sm">
        {/* Search Input */}
        <div className="relative flex-1 w-full">
          <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-neutral-400" 
               viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input 
            type="text" 
            placeholder="Search sessions..." 
            className="w-full py-2.5 pl-10 pr-4 rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Date Filter Button */}
        <div className="relative w-full md:w-auto">
          <button 
            className="flex items-center gap-2 py-2.5 px-4 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 transition-colors w-full md:w-auto"
            onClick={() => setShowCalendar(!showCalendar)}
          >
            <svg className="w-5 h-5 text-neutral-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            <span className="text-neutral-700">Filter by date</span>
            <svg className="w-3 h-3 text-neutral-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>

          {/* Calendar Dropdown (only shown when showCalendar is true) */}
          {showCalendar && (
            <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-xl shadow-lg p-4 z-10">
              {/* Calendar Header */}
              <div className="flex justify-between items-center mb-4">
                <div className="font-semibold">May 2025</div>
                <div className="flex gap-2">
                  <button className="flex items-center justify-center w-7 h-7 rounded border border-neutral-200 hover:bg-neutral-50">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 18 9 12 15 6"></polyline>
                    </svg>
                  </button>
                  <button className="flex items-center justify-center w-7 h-7 rounded border border-neutral-200 hover:bg-neutral-50">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                  </button>
                </div>
              </div>

              {/* Calendar Weekdays */}
              <div className="grid grid-cols-7 text-center mb-2">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                  <div key={i} className="text-xs font-semibold text-neutral-500 py-1">{day}</div>
                ))}
              </div>

              {/* Calendar Days */}
              <div className="grid grid-cols-7 gap-1">
                {/* Example calendar data - this would be dynamically generated */}
                {[
                  { day: 27, otherMonth: true },
                  { day: 28, otherMonth: true },
                  { day: 29, otherMonth: true },
                  { day: 30, otherMonth: true },
                  { day: 1 },
                  { day: 2, hasSession: true },
                  { day: 3 },
                  // ...more days
                  { day: 16 },
                  { day: 17, active: true, hasSession: true },
                  { day: 18, hasSession: true },
                  // ...more days
                ].map((dayObj, i) => (
                  <button 
                    key={i} 
                    className={`
                      flex items-center justify-center h-9 rounded-md relative 
                      ${dayObj.otherMonth ? 'text-neutral-300' : ''} 
                      ${dayObj.active ? 'bg-indigo-500 text-white' : 'hover:bg-neutral-100'}
                    `}
                  >
                    {dayObj.day}
                    {dayObj.hasSession && (
                      <span className={`absolute bottom-1 w-1 h-1 rounded-full ${dayObj.active ? 'bg-white' : 'bg-emerald-500'}`}></span>
                    )}
                  </button>
                ))}
              </div>

              {/* Calendar Actions */}
              <div className="flex justify-end mt-4 gap-2">
                <button 
                  className="py-2 px-3 text-sm rounded-md border border-neutral-200 hover:bg-neutral-50"
                  onClick={() => setShowCalendar(false)}
                >
                  Cancel
                </button>
                <button 
                  className="py-2 px-3 text-sm rounded-md bg-indigo-500 text-white hover:bg-indigo-600"
                  onClick={() => setShowCalendar(false)}
                >
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sessions List */}
      {loading ? (
        <p className="text-sm text-neutral-500 italic">Loading sessions...</p>
      ) : filteredSessions.length === 0 ? (
        <p className="text-sm text-neutral-500 italic">
          {searchQuery ? 'No sessions match your search.' : 'You haven\'t had any sessions yet.'}
        </p>
      ) : (
        <div className="space-y-4">
          {filteredSessions.map(session => (
            <div
              key={session.id}
              className="bg-white rounded-xl shadow-sm overflow-hidden transition-all hover:shadow-md hover:-translate-y-0.5 relative"
            >
              <a href={`/sessions/${session.id}`} className="block text-inherit no-underline">
                {/* Header section - spans full width */}
                <div className="grid grid-cols-[1fr_auto] items-center p-5 w-full">
                  <h2 className="text-base font-semibold text-neutral-900">
                    {session.title || 'Untitled Session'}
                  </h2>
                  <div className="flex items-center gap-2 text-sm text-neutral-500 text-right">
                    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                    {formatDate(session.created_at)}
                  </div>
                </div>
                
                {/* Border that extends across the whole card */}
                <div className="h-px bg-neutral-100 w-full"></div>
                
                {session.summary && (
                  <div className="flex items-start">
                    <div className="flex-1 p-5 text-sm text-neutral-700 leading-relaxed">
                      {session.summary}
                    </div>
                    {/* Chevron icon in the summary section */}
                    <div className="flex items-center justify-center w-10 h-full pt-5">
                      <svg 
                        className="w-4 h-4 text-neutral-400" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                      >
                        <polyline points="9 18 15 12 9 6"></polyline>
                      </svg>
                    </div>
                  </div>
                )}
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
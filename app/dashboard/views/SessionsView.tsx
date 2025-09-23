'use client';

import { Fragment, useEffect, useMemo, useState, memo } from 'react'; // Fragment might still be useful for list structures
import { sessionCache, setSessionCache } from '@/app/contexts/sessionCache';

import { supabase } from '@/supabase/client';
import { useConversationStatus } from '@/app/contexts/ConversationContext';
import { useRouter } from 'next/navigation';
import LoadingDots from '@/components/LoadingDots';
import { Lightbulb, AlertTriangle, ArrowRight, StickyNote, ListChecks, Clock, List } from 'lucide-react';

const CACHE_VERSION = '1.0';
const CACHE_EXPIRY_HOURS = 24;

const generateHash = (data: string): string => {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString();
};

const getCacheKey = (type: 'session' | 'feedback', id: string): string => {
  return `session_${type}_${id}_${CACHE_VERSION}`;
};

function getCachedData<T>(key: string): T | null {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;

    const { data, timestamp, hash } = JSON.parse(cached);
    const now = Date.now();
    const expiryTime = CACHE_EXPIRY_HOURS * 60 * 60 * 1000;

    if (now - timestamp > expiryTime) {
      localStorage.removeItem(key);
      return null;
    }

    const expectedHash = generateHash(JSON.stringify(data));
    if (hash !== expectedHash) {
      localStorage.removeItem(key);
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

function setCachedData<T>(key: string, data: T): void {
  try {
    const dataStr = JSON.stringify(data);
    const hash = generateHash(dataStr);
    const cacheEntry = { data, timestamp: Date.now(), hash };
    localStorage.setItem(key, JSON.stringify(cacheEntry));
  } catch (error) {
    console.warn('Failed to cache data:', error);
  }
}

interface Session {
  id: string;
  created_at: string;
  title: string | null;
  summary: string | null;
  notes: string | null;
  transcript: string | null;
  duration: number | null; // Duration in seconds
}

interface DayGroup {
  date: string; // YYYY-MM-DD
  sessions: Session[];
}

// --- Helper Functions (largely unchanged from previous, some minor tweaks) ---
const truncateSummary = (summary: string | null, sentenceLimit: number = 3): string => {
  if (!summary) return '';
  const sentences = summary.match(/[^.!?]+[.!?\s]*/g);
  if (!sentences || sentences.length === 0) {
    return summary.length > 200 ? summary.substring(0, 197) + '...' : summary;
  }
  if (sentences.length <= sentenceLimit) return sentences.join('').trim();
  return sentences.slice(0, sentenceLimit).join('').trim() + '...';
};

const getStartOfDay = (date: Date): Date => {
  const newDate = new Date(date);
  newDate.setHours(0, 0, 0, 0);
  return newDate;
};

const getStartOfDayISO = (date: Date): string => {
  const newDate = new Date(date);
  newDate.setHours(0, 0, 0, 0);
  return newDate.toISOString().split('T')[0]; // YYYY-MM-DD
};

const groupSessionsByTimePeriod = (sessions: Session[]): Array<{ title: string; sessions: Session[] }> => {
  if (!sessions || sessions.length === 0) return [];
  const groups: { [key: string]: Session[] } = {};
  const standardGroupKeys = ['Recent', 'Last Week', 'This Month'];
  standardGroupKeys.forEach(key => groups[key] = []);
  const now = new Date();
  const todayDt = getStartOfDay(now);
  const yesterdayDt = new Date(todayDt);
  yesterdayDt.setDate(todayDt.getDate() - 1);
  const currentDayOfWeek = todayDt.getDay();
  const startOfThisWeekDt = new Date(todayDt);
  startOfThisWeekDt.setDate(todayDt.getDate() - currentDayOfWeek);
  const startOfLastWeekDt = new Date(startOfThisWeekDt);
  startOfLastWeekDt.setDate(startOfThisWeekDt.getDate() - 7);
  const endOfLastWeekDt = new Date(startOfThisWeekDt);
  endOfLastWeekDt.setTime(endOfLastWeekDt.getTime() - 1);
  const startOfThisMonthDt = new Date(todayDt.getFullYear(), todayDt.getMonth(), 1);
  const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'long' });
  const yearFormatter = new Intl.DateTimeFormat('en-US', { year: 'numeric' });

  for (const session of sessions) {
    const sessionDate = new Date(session.created_at);
    const sessionDayStart = getStartOfDay(sessionDate);
    if (sessionDayStart.getTime() >= yesterdayDt.getTime()) {
      groups.Recent.push(session);
    } else if (sessionDayStart.getTime() >= startOfLastWeekDt.getTime() && sessionDayStart.getTime() <= endOfLastWeekDt.getTime()) {
      groups['Last Week'].push(session);
    } else if (sessionDayStart.getTime() >= startOfThisMonthDt.getTime()) {
      groups['This Month'].push(session);
    } else {
      const monthName = monthFormatter.format(sessionDate);
      const year = yearFormatter.format(sessionDate);
      const groupKey = `${monthName} ${year}`;
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(session);
    }
  }
  const result: Array<{ title: string; sessions: Session[] }> = [];
  for (const title of standardGroupKeys) {
    if (groups[title] && groups[title].length > 0) {
      result.push({ title, sessions: groups[title] });
    }
  }
  const monthKeys = Object.keys(groups)
    .filter(key => !standardGroupKeys.includes(key))
    .sort((a, b) => new Date(b.replace(/(\w+)\s(\d{4})/, '$1 1, $2')).getTime() - new Date(a.replace(/(\w+)\s(\d{4})/, '$1 1, $2')).getTime());
  for (const monthKey of monthKeys) {
    if (groups[monthKey] && groups[monthKey].length > 0) {
      result.push({ title: monthKey, sessions: groups[monthKey] });
    }
  }
  return result;
};

const groupSessionsWithinPeriodByDay = (sessionsInPeriod: Session[]): DayGroup[] => {
    const sessionsByDayMap: { [key: string]: Session[] } = {};
    sessionsInPeriod.forEach(session => {
        const dayKey = getStartOfDayISO(new Date(session.created_at));
        if (!sessionsByDayMap[dayKey]) sessionsByDayMap[dayKey] = [];
        sessionsByDayMap[dayKey].push(session);
    });
    return Object.keys(sessionsByDayMap)
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
        .map(dayKey => ({
            date: dayKey,
            sessions: sessionsByDayMap[dayKey].sort((sA, sB) => new Date(sB.created_at).getTime() - new Date(sA.created_at).getTime())
        }));
};

const formatListDateParts = (dateStringISO: string): { dayOfWeek: string; dayOfMonth: string; fullDate: string; monthYear: string } => {
  const date = new Date(dateStringISO + 'T00:00:00'); // Ensure parsing as local day
  const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
  const dayOfMonth = date.toLocaleDateString('en-US', { day: 'numeric' });
  const fullDate = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const monthYear = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  return { dayOfWeek, dayOfMonth, fullDate, monthYear };
};

const formatRelativeDateForRecent = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const todayStart = getStartOfDay(now);
    const yesterdayStart = getStartOfDay(new Date(new Date().setDate(now.getDate() - 1)));
    const dateStart = getStartOfDay(date);
    const diffTime = todayStart.getTime() - dateStart.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (dateStart.getTime() === todayStart.getTime()) return "Today";
    if (dateStart.getTime() === yesterdayStart.getTime()) return "Yesterday";
    if (diffDays > 0 && diffDays <= 7) return `${diffDays} days ago`;
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const formatDetailedTimestamp = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const todayStart = getStartOfDay(now);
    const yesterdayStart = getStartOfDay(new Date(new Date().setDate(now.getDate() - 1)));
    const dateStart = getStartOfDay(date);
    const timeFormat: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit', hour12: true };
    if (dateStart.getTime() === todayStart.getTime()) return `Today at ${date.toLocaleTimeString('en-US', timeFormat)}`;
    if (dateStart.getTime() === yesterdayStart.getTime()) return `Yesterday at ${date.toLocaleTimeString('en-US', timeFormat)}`;
    return `${date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at ${date.toLocaleTimeString('en-US', timeFormat)}`;
};

const formatDuration = (seconds: number | null): string => {
  if (seconds === null || seconds === undefined) return 'Processing...';
  const minutes = Math.floor(seconds / 60);
  if (minutes <= 0) return '< 1 min';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) return `${hours} hr`;
  return `${hours} hr ${remainingMinutes} min`;
};

// --- Component ---
export default function UserSessionHistory({
  sidebarCollapsed = false
}: {
  sidebarCollapsed?: boolean;
}) {
  const [allUserSessionsData, setAllUserSessionsData] = useState<Session[]>(() => sessionCache);
  const [loading, setLoading] = useState<boolean>(() => sessionCache.length === 0);  
  const [userId, setUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedDays, setExpandedDays] = useState<{ [key: string]: boolean }>({}); // For expanding day groups
  const [autoExpanded, setAutoExpanded] = useState<boolean>(false); // Track if auto-expansion has been done
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const [confirmDeleteSessionId, setConfirmDeleteSessionId] = useState<string | null>(null);
  const [isSelectMode, setIsSelectMode] = useState<boolean>(false);
  const [selectedSessions, setSelectedSessions] = useState<Set<string>>(new Set());
  const [expandedSessions, setExpandedSessions] = useState<{ [key: string]: boolean }>({});
  const [sessionContentMode, setSessionContentMode] = useState<{ [key: string]: 'transcript' | 'summary' }>({});
  const [viewType, setViewType] = useState<'list-with-timestamps' | 'list-without-timestamps'>(() => {
    // Initialize from localStorage if available
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('sessionsViewMode');
        if (saved && (saved === 'list-with-timestamps' || saved === 'list-without-timestamps')) {
          return saved as 'list-with-timestamps' | 'list-without-timestamps';
        }
      } catch (error) {
        console.warn('Failed to load sessions view mode from localStorage:', error);
      }
    }
    return 'list-with-timestamps'; // Default to date view
  });

  // Derive showTimestamps from viewType
  const showTimestamps = viewType === 'list-with-timestamps';

  // Save viewType to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('sessionsViewMode', viewType);
    } catch (error) {
      console.warn('Failed to save sessions view mode to localStorage:', error);
    }
  }, [viewType]);

  const { conversationEnded, pollingStatus, setPollingStatus } = useConversationStatus();
  const router = useRouter();

  const toggleViewType = () => {
    setViewType(prev => prev === 'list-with-timestamps' ? 'list-without-timestamps' : 'list-with-timestamps');
  };

  const handleSelectSession = (id: string) => {
    if (isSelectMode) {
      toggleSessionSelection(id);
    } else {
      toggleSessionExpansion(id);
    }
  };

  const toggleSessionExpansion = (sessionId: string) => {
    setExpandedSessions(prev => ({
      ...prev,
      [sessionId]: !prev[sessionId]
    }));

    // Initialize content mode to summary if not set
    if (!sessionContentMode[sessionId]) {
      setSessionContentMode(prev => ({
        ...prev,
        [sessionId]: 'summary'
      }));
    }
  };

  const toggleSessionContentMode = (sessionId: string) => {
    setSessionContentMode(prev => ({
      ...prev,
      [sessionId]: prev[sessionId] === 'transcript' ? 'summary' : 'transcript'
    }));
  };

  const toggleExpandedDay = (dayDateISO: string) => {
    setExpandedDays(prev => ({ ...prev, [dayDateISO]: !prev[dayDateISO] }));
  };

  const ExpandedSessionContent = memo(({ session }: { session: Session }) => {
    const [currentMode, setCurrentMode] = useState<'transcript' | 'summary'>('summary');
    const [therapistNotesMode, setTherapistNotesMode] = useState<'insights' | 'next_steps'>('insights');
    // Initialize feedback with cached data if available
    const initialFeedback = useMemo(() => {
      if (!session?.transcript) return null;
      const isPlaceholder = session.title === 'Recent Session' && session.summary === 'Summarizing...';
      if (isPlaceholder) return null;

      const transcriptHash = generateHash(session.transcript);
      const cacheKey = getCacheKey('feedback', `${session.id}_${transcriptHash}`);
      return getCachedData<{
        next_steps: string;
        insight: string;
        challenge: string;
      }>(cacheKey);
    }, [session]);

    const [feedback, setFeedback] = useState<{
      next_steps: string;
      insight: string;
      challenge: string;
    } | null>(initialFeedback);

    // Initialize feedbackLoading to true if we have a transcript that will trigger a fetch, unless cached data exists
    const shouldFetchFeedback = useMemo(() => {
      if (!session?.transcript) return false;
      const isPlaceholder = session.title === 'Recent Session' && session.summary === 'Summarizing...';
      if (isPlaceholder) return false;

      return !initialFeedback; // Only show loading if no cached data
    }, [session, initialFeedback]);

    const [feedbackLoading, setFeedbackLoading] = useState(shouldFetchFeedback);

    const toggleContentMode = () => {
      setCurrentMode(prev => prev === 'transcript' ? 'summary' : 'transcript');
    };

    const toggleTherapistNotesMode = () => {
      setTherapistNotesMode(prev => prev === 'insights' ? 'next_steps' : 'insights');
    };

    // Memoize transcript parsing to prevent re-renders
    const messages = useMemo(() => {
      if (!session.transcript) return [];

      return session.transcript
        .split('\n')
        .filter((line) => line.trim() !== '')
        .map((line, index) => {
          const isUser = line.toLowerCase().startsWith('you:');
          const content = line.replace(/^(you|therapist):/i, '').trim();
          return { isUser, content, index };
        });
    }, [session.transcript]);

    // Fetch feedback when session expands
    useEffect(() => {
      const fetchFeedback = async () => {
        if (!session?.transcript) return;

        const transcriptHash = generateHash(session.transcript);
        const cacheKey = getCacheKey('feedback', `${session.id}_${transcriptHash}`);
        const cachedFeedback = getCachedData<typeof feedback>(cacheKey);

        if (cachedFeedback) {
          console.log('📦 Using cached feedback for:', session.id);
          setFeedback(cachedFeedback);
          return;
        }

        setFeedbackLoading(true);
        try {
          const res = await fetch('/api/session-feedback', {
            method: 'POST',
            body: JSON.stringify({ transcript: session.transcript }),
            headers: { 'Content-Type': 'application/json' },
          });
          const json = await res.json();
          setFeedback(json);
          setCachedData(cacheKey, json);
        } catch (error) {
          console.error('Failed to fetch feedback:', error);
        } finally {
          setFeedbackLoading(false);
        }
      };

      const isPlaceholder = session.title === 'Recent Session' && session.summary === 'Summarizing...';
      if (session?.transcript && !isPlaceholder) {
        fetchFeedback();
      }
    }, [session]);

    return (
      <div className="pt-5 px-5 pb-2 md:pt-6 md:px-7 md:pb-3">
        {/* Therapist Analysis */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-5">
            <StickyNote className="w-4 h-4 text-indigo-600" />
            <h4 className="text-sm font-semibold text-slate-800">Therapist Notes</h4>
          </div>

          {feedbackLoading && (
            <div className="flex items-center gap-2 text-sm text-slate-500 italic py-4">
              <div className="w-4 h-4 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600"></div>
              Analyzing session for insights...
            </div>
          )}

          {feedback ? (
            <div className="space-y-7">
              {/* Key Insight */}
              <div className="space-y-3 animate-fade-in-up" style={{animationDelay: '0.1s', animationFillMode: 'both'}}>
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-slate-600" />
                  <h5 className="text-sm font-semibold text-slate-800">Key Insight</h5>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line pl-6">
                  {feedback.insight.replace(/^[-•*]\s*/, '')}
                </p>
              </div>

              {/* Challenge Identified */}
              <div className="space-y-3 animate-fade-in-up" style={{animationDelay: '0.2s', animationFillMode: 'both'}}>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-slate-600" />
                  <h5 className="text-sm font-semibold text-slate-800">Challenge Identified</h5>
                </div>
                <div className="flex items-start justify-between">
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line pl-6 flex-1">
                    {feedback.challenge.replace(/^[-•*]\s*/, '')}
                  </p>
                  <button
                    onClick={toggleTherapistNotesMode}
                    className="p-1 ml-3 mt-2 hover:bg-slate-50 rounded-md transition-all duration-200 group flex-shrink-0"
                  >
                    <ListChecks className={`w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-all duration-300 ${
                      therapistNotesMode === 'next_steps' ? 'text-slate-600' : ''
                    }`} />
                  </button>
                </div>
              </div>

              {/* Next Steps - Collapsible */}
              <div className="space-y-3">
                <div className={`overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                  therapistNotesMode === 'next_steps'
                    ? 'max-h-96 opacity-100'
                    : 'max-h-0 opacity-0'
                }`}>
                  <div className="pl-6 space-y-2 pt-1">
                    {feedback.next_steps.split('\n').map((step, index) => {
                      const trimmedStep = step.trim();
                      if (!trimmedStep) return null;

                      // Remove leading dashes, bullets, or asterisks
                      const cleanedStep = trimmedStep.replace(/^[-•*]\s*/, '');

                      return (
                        <div
                          key={index}
                          className="flex items-start gap-3 animate-fade-in-up"
                          style={{
                            animationDelay: `${0.1 + (index * 0.1)}s`,
                            animationFillMode: 'both'
                          }}
                        >
                          <div className="w-5 h-5 bg-slate-200 text-slate-700 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">
                            {index + 1}
                          </div>
                          <span className="text-sm text-slate-700 leading-relaxed">{cleanedStep}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ) : !feedbackLoading && (
            <div className="text-center py-8 text-slate-500">
              <StickyNote className="w-8 h-8 mx-auto mb-3 opacity-50" />
              <p className="text-sm italic">No therapist analysis available for this session.</p>
            </div>
          )}
        </div>

        {/* Content Toggle */}
        <div className="border-t border-slate-200 pt-5 animate-fade-in-up" style={{animationDelay: '0.3s', animationFillMode: 'both'}}>
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-slate-800">Session Content</h4>
            <button
              onClick={toggleContentMode}
              className="px-3 py-1.5 text-xs font-medium bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
            >
              {currentMode === 'transcript' ? 'Show Summary' : 'Show Transcript'}
            </button>
          </div>

          <div className={`bg-slate-50 rounded-lg p-4 overflow-y-auto relative transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
            currentMode === 'transcript'
              ? 'max-h-[36rem] min-h-[300px]'
              : 'max-h-80 min-h-[160px]'
          }`}>
            {/* Summary View */}
            <div className={`absolute inset-4 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
              currentMode === 'summary'
                ? 'opacity-100 pointer-events-auto z-10 scale-100'
                : 'opacity-0 pointer-events-none z-0 scale-95'
            }`}>
              <div className="text-sm text-slate-700 leading-relaxed p-4">
                {session.summary || 'Summary not available for this session.'}
              </div>
            </div>

            {/* Transcript View */}
            <div className={`absolute inset-6 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] overflow-y-auto ${
              currentMode === 'transcript'
                ? 'opacity-100 pointer-events-auto z-10 scale-100'
                : 'opacity-0 pointer-events-none z-0 scale-95'
            }`}>
              <div className="flex flex-col space-y-3">
                {messages.length > 0 ? (
                  messages.map(({ isUser, content, index }) => (
                    <div
                      key={index}
                      className={`max-w-xs md:max-w-sm px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                        isUser
                          ? 'bg-indigo-100 text-indigo-800 self-end ml-auto'
                          : 'bg-slate-200 text-slate-800 self-start mr-auto'
                      }`}
                    >
                      {content}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500 italic">Transcript not available for this session.</p>
                )}
              </div>
            </div>
          </div>
        </div>
        {/* Close Button */}
        <div className="mt-4 flex justify-end">
          <button
            onClick={() => toggleSessionExpansion(session.id)}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 transition-colors"
          >
            Close
          </button>
        </div>

        {/* Visual separator at base */}
        <div className="mt-6 h-4 bg-slate-50/80 -mx-5 md:-mx-7"></div>
      </div>
    );
  });

  const handleDeleteSession = async (sessionId: string) => {
    setDeletingSessionId(sessionId);
    
    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete session');
      }

      // Remove session from cache and state
      const updatedSessions = allUserSessionsData.filter(session => session.id !== sessionId);
      setSessionCache(updatedSessions);
      setAllUserSessionsData(updatedSessions);
      
    } catch (error: any) {
      console.error('Error deleting session:', error.message);
      alert('Failed to delete session. Please try again.');
    } finally {
      setDeletingSessionId(null);
      setConfirmDeleteSessionId(null);
    }
  };

  const confirmDelete = (sessionId: string) => {
    setConfirmDeleteSessionId(sessionId);
  };

  const cancelDelete = () => {
    setConfirmDeleteSessionId(null);
  };

  // useEffects for getUser, fetchAndUpdateSessions, polling (same as previous)
  useEffect(() => { getUser(); }, []);
  async function getUser() {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return; setUserId(data.user.id);
  }
  useEffect(() => {
    const fetchAndUpdateSessions = async () => {
      if (!userId) return; setLoading(true);
      const { data, error } = await supabase.from('sessions').select('*').eq('user_id', userId).order('created_at', { ascending: false });
      if (!error && data) { const typedData = data as Session[]; setSessionCache(typedData); setAllUserSessionsData(typedData); } 
      else { console.error('Error loading sessions:', error?.message); }
      setLoading(false);
    };
    if (userId) {
      const cachedSessions = sessionCache;
      if (cachedSessions.length === 0) { fetchAndUpdateSessions(); }
      else { setAllUserSessionsData(cachedSessions); setLoading(false); fetchAndUpdateSessions(); }
    }
  }, [userId]);
  useEffect(() => {
    if (!userId || !conversationEnded || pollingStatus.sessionsUpdated) return;
    const intervalId = setInterval(async () => {
      const { data, error } = await supabase.from('sessions').select('*').eq('user_id', userId).order('created_at', { ascending: false });
      if (!error && data) {
        const typedData = data as Session[]; setSessionCache(typedData); setAllUserSessionsData(typedData);
        const newest = typedData[0]; const isNewestStillPlaceholder = newest?.title === 'Recent Session' && newest?.summary === 'Summarizing...';
        if (!isNewestStillPlaceholder && typedData.length > 0) { setPollingStatus({ sessionsUpdated: true }); clearInterval(intervalId); }
      } else { console.error('Polling error:', error?.message); }
    }, 3000);
    return () => clearInterval(intervalId);
  }, [conversationEnded, pollingStatus.sessionsUpdated, userId, setPollingStatus]);

  const mostRecentSessionActual = useMemo(() => allUserSessionsData.length > 0 ? allUserSessionsData[0] : null, [allUserSessionsData]);
  const sessionsForPrimaryGrouping = useMemo(() => {
    if (searchQuery || !mostRecentSessionActual) return allUserSessionsData;
    return allUserSessionsData.slice(1);
  }, [allUserSessionsData, searchQuery, mostRecentSessionActual]);
  const filteredSessionsForPrimaryGrouping = useMemo(() =>
    sessionsForPrimaryGrouping.filter((session) => {
      if (!searchQuery) return true; const q = searchQuery.toLowerCase();
      return (session.title?.toLowerCase().includes(q) || session.summary?.toLowerCase().includes(q) || session.notes?.toLowerCase().includes(q));
    }), [sessionsForPrimaryGrouping, searchQuery]);
  const timePeriodGroups = useMemo(() => groupSessionsByTimePeriod(filteredSessionsForPrimaryGrouping), [filteredSessionsForPrimaryGrouping]);

  // Auto-expand days with multiple sessions
  useEffect(() => {
    if (!autoExpanded && timePeriodGroups.length > 0) {
      const daysToExpand: { [key: string]: boolean } = {};
      
      timePeriodGroups.forEach(periodGroup => {
        if (periodGroup.title !== 'Recent') {
          const dailyGroups = groupSessionsWithinPeriodByDay(periodGroup.sessions);
          dailyGroups.forEach(dayGroup => {
            // Auto-expand if day has more than one session
            if (dayGroup.sessions.length > 1) {
              daysToExpand[dayGroup.date] = true;
            }
          });
        }
      });
      
      if (Object.keys(daysToExpand).length > 0) {
        setExpandedDays(daysToExpand);
        setAutoExpanded(true);
      }
    }
  }, [timePeriodGroups, autoExpanded]);

  const showSpecialMostRecentView = !searchQuery && mostRecentSessionActual && !loading;
  const isMostRecentActualPlaceholder = mostRecentSessionActual?.title === 'Recent Session' && mostRecentSessionActual?.summary === 'Summarizing...';
  const showEmptyMessage = !loading && allUserSessionsData.length === 0;

  const toggleSelectMode = () => {
    setIsSelectMode(!isSelectMode);
    setSelectedSessions(new Set());
  };

  const toggleSessionSelection = (sessionId: string) => {
    const newSelected = new Set(selectedSessions);
    if (newSelected.has(sessionId)) {
      newSelected.delete(sessionId);
    } else {
      newSelected.add(sessionId);
    }
    setSelectedSessions(newSelected);
  };

  const handleBulkDelete = async () => {
    if (selectedSessions.size === 0) return;
    
    setDeletingSessionId('bulk');
    
    try {
      const deletePromises = Array.from(selectedSessions).map(sessionId =>
        fetch(`/api/sessions/${sessionId}`, { method: 'DELETE' })
      );
      
      const responses = await Promise.all(deletePromises);
      const failedDeletes = responses.filter(response => !response.ok);
      
      if (failedDeletes.length > 0) {
        throw new Error(`Failed to delete ${failedDeletes.length} sessions`);
      }

      // Remove deleted sessions from cache and state
      const updatedSessions = allUserSessionsData.filter(
        session => !selectedSessions.has(session.id)
      );
      setSessionCache(updatedSessions);
      setAllUserSessionsData(updatedSessions);
      
      // Reset selection state
      setSelectedSessions(new Set());
      setIsSelectMode(false);
      
    } catch (error: any) {
      console.error('Error bulk deleting sessions:', error.message);
      alert('Failed to delete some sessions. Please try again.');
    } finally {
      setDeletingSessionId(null);
      setConfirmDeleteSessionId(null);
    }
  };

  return (
    <div className="bg-white min-h-screen py-2 md:py-4 sm:py-6 w-full">
      
      <div className={`hidden max-w-3xl ${sidebarCollapsed ? 'mx-auto' : 'ml-20 lg:ml-24'} px-4 sm:px-6 lg:px-8 mb-6`}> {/* Search Bar */}
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
            <svg className="h-5 w-5 text-slate-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" /></svg>
          </div>
          <input type="text" placeholder="Search sessions..."
            className="block w-full rounded-xl border-0 bg-white py-3.5 pl-11 pr-4 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
      </div>

      {showEmptyMessage ? ( /* Empty State */
        <div className={`text-center py-4 md:py-6 px-4 max-w-md ${sidebarCollapsed ? 'mx-auto' : 'ml-32 lg:ml-40'}`}>
          <svg className="mx-auto h-12 w-12 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 10.5v3.75m-9.303 3.376C1.82 19.513 3.252 21 5.006 21h13.988c1.754 0 3.186-1.487 2.31-3.374L13.949 4.878c-.875-1.887-3.021-1.887-3.896 0L2.697 17.626ZM12 17.25h.007v.008H12v-.008Z" /></svg>
          <h3 className="mt-3 md:mt-4 text-base md:text-lg font-semibold text-slate-700">{searchQuery ? 'No Sessions Found' : 'Your Session History is Empty'}</h3>
          <p className="mt-1 md:mt-1.5 text-xs md:text-sm text-slate-500">{searchQuery ? 'Try different keywords or clear your search.' : 'Once you complete a session, it will appear here.'}</p>
        </div>
      ) : !loading && (
        <div className={`max-w-3xl ${sidebarCollapsed ? 'mx-auto' : 'ml-20 lg:ml-24'} px-4 md:px-6 lg:px-8 mt-6`}>
          {showSpecialMostRecentView && mostRecentSessionActual && ( /* Most Recent Session View */
            <section className="mb-4" aria-labelledby="most-recent-session-title">
              <div className="flex items-center justify-between mb-1 px-1">
                <h2 id="most-recent-session-title" className="text-[10px] md:text-xs font-semibold text-slate-500 uppercase tracking-wider">Latest Session</h2>
                {!loading && !showEmptyMessage && (
                  <div className="flex items-center gap-2">
                    {/* View Type Toggle */}
                    <button
                      onClick={toggleViewType}
                      className="flex items-center bg-slate-50/60 rounded-lg p-1 hover:bg-slate-100/60 transition-all duration-200"
                      title={showTimestamps ? "Switch to simple view" : "Switch to date view"}
                    >
                      <div
                        className={`px-2 py-1.5 rounded text-xs transition-all duration-200 flex items-center gap-1.5 ${
                          viewType === 'list-with-timestamps'
                            ? 'bg-white shadow-sm text-slate-700 border border-slate-200'
                            : 'text-slate-500'
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5" strokeWidth={1.5} />
                      </div>
                      <div
                        className={`px-2 py-1.5 rounded text-xs transition-all duration-200 flex items-center gap-1.5 ${
                          viewType === 'list-without-timestamps'
                            ? 'bg-white shadow-sm text-slate-700 border border-slate-200'
                            : 'text-slate-500'
                        }`}
                      >
                        <List className="w-3.5 h-3.5" strokeWidth={1.5} />
                      </div>
                    </button>
                    {isSelectMode && selectedSessions.size > 0 && (
                      <button
                        onClick={() => setConfirmDeleteSessionId('bulk')}
                        disabled={deletingSessionId === 'bulk'}
                        className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                      >
                        {deletingSessionId === 'bulk' ? 'Deleting...' : `Delete ${selectedSessions.size}`}
                      </button>
                    )}
                    {isSelectMode && (
                      <div className="text-[10px] md:text-xs text-slate-500">
                        {selectedSessions.size} selected
                      </div>
                    )}
                    <button
                      onClick={toggleSelectMode}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                        isSelectMode
                          ? 'text-slate-700 bg-slate-100 border border-slate-200 hover:bg-slate-200'
                          : 'text-slate-600 bg-slate-50 border border-slate-200 hover:text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {isSelectMode ? 'Cancel' : 'Delete sessions'}
                    </button>
                  </div>
                )}
              </div>
              <div className="relative group" data-session-id={mostRecentSessionActual.id}>
                {isSelectMode && !isMostRecentActualPlaceholder && (
                  <div className="absolute top-4 left-4 z-10">
                    <button
                      onClick={() => toggleSessionSelection(mostRecentSessionActual.id)}
                      className={`w-5 h-5 rounded-md border-2 transition-all duration-200 flex items-center justify-center ${
                        selectedSessions.has(mostRecentSessionActual.id)
                          ? 'bg-indigo-50 border-indigo-200'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {selectedSessions.has(mostRecentSessionActual.id) && (
                        <svg className="w-3 h-3 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  </div>
                )}
                <button
                  onClick={() => {
                    if (!isMostRecentActualPlaceholder) {
                      handleSelectSession(mostRecentSessionActual.id);
                    }
                  }}
                  disabled={isMostRecentActualPlaceholder}
                  aria-label={`${isSelectMode ? 'Select' : 'View'} latest session: ${mostRecentSessionActual.title || 'Untitled Session'}`}
                  className={`w-full text-left bg-white p-4 md:p-5 sm:p-6 rounded-xl border-2 transition-all duration-200 ease-in-out ${
                    isMostRecentActualPlaceholder
                      ? 'opacity-70 animate-pulse cursor-default border-slate-200'
                      : expandedSessions[mostRecentSessionActual.id]
                        ? 'border-indigo-200 bg-indigo-50'
                        : isSelectMode
                          ? selectedSessions.has(mostRecentSessionActual.id)
                            ? 'ring-2 ring-indigo-200 bg-indigo-50 border-transparent'
                            : 'hover:ring-2 hover:ring-slate-200 hover:bg-slate-50 border-transparent'
                          : 'hover:border-indigo-300 hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:outline-none border-transparent'
                  }`}>
                {isMostRecentActualPlaceholder ? (<> {/* Placeholder for most recent */}
                  <div className="h-5 bg-slate-300 rounded w-3/5 mb-3"></div> <div className="space-y-2"><div className="h-3 bg-slate-300/80 rounded w-full"></div><div className="h-3 bg-slate-300/80 rounded w-full"></div><div className="h-3 bg-slate-300/80 rounded w-3/4"></div></div> <div className="h-4 bg-slate-300 rounded w-1/3 mt-4"></div>
                </>) : (<>
                  <h3 className="text-base md:text-lg sm:text-xl font-bold text-slate-800 group-hover:text-indigo-700 mb-0.5 md:mb-1 transition-colors">{mostRecentSessionActual.title || 'Untitled Session'}</h3>
                  {showTimestamps && (
                    <p className="text-[10px] md:text-xs text-slate-500 mb-1 md:mb-2">{formatDetailedTimestamp(mostRecentSessionActual.created_at)}{mostRecentSessionActual.duration !== null && ` • ${formatDuration(mostRecentSessionActual.duration)}`}</p>
                  )}
                  {mostRecentSessionActual.summary && (<p className="text-xs md:text-sm text-slate-600 leading-relaxed line-clamp-3 group-hover:text-slate-700">{truncateSummary(mostRecentSessionActual.summary, 3)}</p>)}
                  <div className="mt-2 md:mt-3 flex justify-end">
                    <span className="text-[10px] md:text-xs font-medium text-indigo-600 group-hover:text-indigo-700 flex items-center gap-1">
                      {expandedSessions[mostRecentSessionActual.id] ? 'Hide Details' : 'View Details'}
                      <svg
                        className={`w-3 h-3 transition-transform duration-200 ${expandedSessions[mostRecentSessionActual.id] ? 'rotate-90' : ''}`}
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                      </svg>
                    </span>
                  </div>
                </>)}
                </button>
                {!isMostRecentActualPlaceholder && (
                  <div className={`overflow-hidden transition-all duration-200 ease-out ${
                    expandedSessions[mostRecentSessionActual.id]
                      ? 'max-h-[1000px]'
                      : 'max-h-0'
                  }`}>
                    <div className={`mt-3 bg-white rounded-xl border border-slate-200 transition-transform duration-200 ease-out origin-top ${
                      expandedSessions[mostRecentSessionActual.id] ? 'scale-y-100' : 'scale-y-0'
                    }`}>
                      <div className={`p-4 transition-all duration-150 delay-200 ${
                        expandedSessions[mostRecentSessionActual.id]
                          ? 'opacity-100 blur-0'
                          : 'opacity-0 blur-[1px]'
                      }`}>
                        <ExpandedSessionContent session={mostRecentSessionActual} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {timePeriodGroups.map((periodGroup) => {
            // "Recent" Group: Individual items
            if (periodGroup.title === 'Recent') {
              return (
                periodGroup.sessions.length > 0 && (
                  <section key={periodGroup.title} className="mb-4 last:mb-0" aria-labelledby={`section-title-recent`}>
                    <h2 id="section-title-recent" className="text-[10px] md:text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 md:mb-1.5 px-1">{periodGroup.title}</h2>
                    <ul className="space-y-1">
                      {periodGroup.sessions.map((session) => {
                        const isListItemPlaceholder = session.title === 'Recent Session' && session.summary === 'Summarizing...';
                        return (
                          <li key={session.id}>
                            <div className="relative group" data-session-id={session.id}>
                              {isSelectMode && !isListItemPlaceholder && (
                                <div className="absolute top-3 left-3 z-10">
                                  <button
                                    onClick={() => toggleSessionSelection(session.id)}
                                    className={`w-4 h-4 rounded border-2 transition-all duration-200 flex items-center justify-center ${
                                      selectedSessions.has(session.id)
                                        ? 'bg-indigo-50 border-indigo-200'
                                        : 'bg-white border-slate-200 hover:border-slate-300'
                                    }`}
                                  >
                                    {selectedSessions.has(session.id) && (
                                      <svg className="w-2.5 h-2.5 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                      </svg>
                                    )}
                                  </button>
                                </div>
                              )}
                              <button
                                onClick={() => {
                                  if (!isListItemPlaceholder) {
                                    handleSelectSession(session.id);
                                  }
                                }}
                                disabled={isListItemPlaceholder}
                                aria-label={`${isSelectMode ? 'Select' : 'View'} session: ${session.title || 'Untitled Session'}`}
                                className={`w-full flex items-center bg-white p-3 md:p-3.5 sm:p-4 rounded-xl border-2 transition-all duration-200 ease-in-out ${
                                  isListItemPlaceholder
                                    ? 'opacity-60 animate-pulse cursor-default border-transparent'
                                    : expandedSessions[session.id]
                                      ? 'border-indigo-200 bg-indigo-50'
                                      : isSelectMode
                                        ? selectedSessions.has(session.id)
                                          ? 'ring-2 ring-indigo-200 bg-indigo-50 border-transparent'
                                          : 'hover:ring-2 hover:ring-slate-200 hover:bg-slate-50 border-transparent'
                                        : 'hover:-translate-y-px focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:outline-none border-transparent'
                                }`}>
                              {isListItemPlaceholder ? (<> {/* Placeholder for recent list item */}
                                <div className="mr-4 text-center w-16 h-6 bg-slate-300/70 rounded-md flex-shrink-0"></div> <div className="flex-grow min-w-0"><div className="h-4 bg-slate-300 rounded w-3/4 mb-1.5"></div><div className="h-3 bg-slate-300 rounded w-1/2"></div></div> <div className="h-4 bg-slate-300 rounded w-10 ml-3"></div>
                              </>) : (<>
                                {showTimestamps && (
                                  <div className="mr-2 md:mr-3 sm:mr-4 text-center w-12 md:w-16 sm:w-20 flex-shrink-0 py-0.5 md:py-1 px-0.5 md:px-1">
                                    <span className="text-[9px] md:text-[11px] sm:text-xs font-medium text-slate-500 group-hover:text-slate-600 bg-slate-200/70 group-hover:bg-slate-200 rounded px-1 md:px-1.5 py-0.5">{formatRelativeDateForRecent(session.created_at)}</span>
                                  </div>
                                )}
                                <div className="flex-grow min-w-0">
                                  <h3 className="text-xs md:text-sm sm:text-base font-normal text-slate-800 group-hover:text-indigo-700 truncate transition-colors">{session.title || 'Untitled Session'}</h3>
                                  {showTimestamps && (
                                    <p className="text-[10px] md:text-xs text-slate-500 group-hover:text-slate-600 mt-0.5">{formatDuration(session.duration)}</p>
                                  )}
                                </div>
                                <svg className={`w-5 h-5 text-slate-400 group-hover:text-indigo-600 ml-3 flex-shrink-0 transition-all duration-200 ${expandedSessions[session.id] ? 'rotate-90 text-indigo-600' : ''}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" /></svg>
                              </>)}
                            </button>
                            {!isListItemPlaceholder && (
                              <div className={`overflow-hidden transition-all duration-200 ease-out ${
                                expandedSessions[session.id]
                                  ? 'max-h-[1000px]'
                                  : 'max-h-0'
                              }`}>
                                <div className={`mt-3 bg-white rounded-xl border border-slate-200 transition-transform duration-200 ease-out origin-top ${
                                  expandedSessions[session.id] ? 'scale-y-100' : 'scale-y-0'
                                }`}>
                                  <div className={`p-4 transition-all duration-150 delay-200 ${
                                    expandedSessions[session.id]
                                      ? 'opacity-100 blur-0'
                                      : 'opacity-0 blur-[1px]'
                                  }`}>
                                    <ExpandedSessionContent session={session} />
                                  </div>
                                </div>
                              </div>
                            )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                )
              );
            }
            
            // Older Groups (Last Week, This Month, etc.): Group by day, with expand in place
            const dailyGroups = groupSessionsWithinPeriodByDay(periodGroup.sessions);
            return (
              dailyGroups.length > 0 && (
                <section key={periodGroup.title} className="mb-4 last:mb-0" aria-labelledby={`section-title-${periodGroup.title.replace(/\s+/g, '-').toLowerCase()}`}>
                  <h2 id={`section-title-${periodGroup.title.replace(/\s+/g, '-').toLowerCase()}`} className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 px-1">{periodGroup.title}</h2>
                  <ul className="space-y-0">
                    {dailyGroups.map((dayGroup) => {
                      const { dayOfWeek, dayOfMonth, fullDate } = formatListDateParts(dayGroup.date);
                      const isDayPlaceholder = dayGroup.sessions.some(s => s.title === 'Recent Session' && s.summary === 'Summarizing...');
                      const isExpanded = expandedDays[dayGroup.date] || false;

                      if (dayGroup.sessions.length === 1 && !isDayPlaceholder) {
                        // Single session day - render with date key like multiple sessions
                        const session = dayGroup.sessions[0];
                        return (
                          <li key={session.id}>
                            <div data-session-id={session.id}>
                              {/* Session row */}
                              <div className="flex">
                                {showTimestamps && (
                                  <div className="mr-4 text-center w-10 flex-shrink-0 mt-2" aria-hidden="true">
                                    <div className="text-[10px] text-gray-400 tracking-wide">{dayOfWeek}</div>
                                    <div className="text-sm font-bold text-slate-700">{dayOfMonth}</div>
                                  </div>
                                )}
                                <div className={`flex-1 bg-slate-50/50 pl-4 py-2 ${showTimestamps ? 'border-l-2 border-indigo-200 rounded-r-md' : 'rounded-md'}`}>
                                  <div className="relative group flex items-center">
                                    {isSelectMode && (
                                      <div className="flex-shrink-0 mr-2">
                                        <button
                                          onClick={() => toggleSessionSelection(session.id)}
                                          className={`w-3.5 h-3.5 rounded border-2 transition-all duration-200 flex items-center justify-center ${
                                            selectedSessions.has(session.id)
                                              ? 'bg-indigo-50 border-indigo-200'
                                              : 'bg-white border-slate-200 hover:border-slate-300'
                                          }`}
                                        >
                                          {selectedSessions.has(session.id) && (
                                            <svg className="w-2 h-2 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                          )}
                                        </button>
                                      </div>
                                    )}
                                    <button
                                      onClick={() => handleSelectSession(session.id)}
                                      aria-label={`${isSelectMode ? 'Select' : 'View'} session: ${session.title || 'Untitled Session'} from ${fullDate}`}
                                      className={`flex-1 flex items-center text-left bg-slate-50/50 p-3 rounded-xl border-2 transition-colors group focus-visible:outline-none focus-visible:ring-1 ${
                                        expandedSessions[session.id]
                                          ? 'border-indigo-200 bg-indigo-50'
                                          : isSelectMode
                                            ? selectedSessions.has(session.id)
                                              ? 'bg-indigo-50 hover:bg-indigo-100 focus-visible:ring-indigo-400 border-transparent'
                                              : 'hover:bg-slate-50 focus-visible:ring-slate-400 border-transparent'
                                            : 'hover:bg-slate-100 focus-visible:ring-indigo-400 border-transparent'
                                      }`}>
                                      {showTimestamps && (
                                        <div className="flex-shrink-0 mr-3 w-16">
                                          <p className="text-xs text-slate-500 group-hover:text-indigo-600">
                                            {new Date(session.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                                          </p>
                                        </div>
                                      )}
                                      <div className="flex-grow min-w-0">
                                        <p className="text-sm font-medium text-slate-700 group-hover:text-indigo-700 truncate">{session.title || 'Untitled Session'}</p>
                                        {showTimestamps && (
                                          <p className="text-xs text-slate-500">{formatDuration(session.duration)}</p>
                                        )}
                                      </div>
                                      <svg className={`w-4 h-4 text-slate-400 group-hover:text-indigo-500 ml-2 flex-shrink-0 opacity-70 group-hover:opacity-100 transition-all duration-200 ${expandedSessions[session.id] ? 'rotate-90 text-indigo-500 opacity-100' : ''}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" /></svg>
                                    </button>
                                  </div>
                                </div>
                              </div>
                              {/* Expansion content outside the blue-bordered container */}
                              <div className={`overflow-hidden transition-all duration-200 ease-out ${
                                expandedSessions[session.id]
                                  ? 'max-h-[1000px]'
                                  : 'max-h-0'
                              }`}>
                                <div className={`mt-3 bg-white rounded-xl border border-slate-200 transition-transform duration-200 ease-out origin-top ${
                                  expandedSessions[session.id] ? 'scale-y-100' : 'scale-y-0'
                                }`}>
                                  <div className={`p-4 transition-all duration-150 delay-200 ${
                                    expandedSessions[session.id]
                                      ? 'opacity-100 blur-0'
                                      : 'opacity-0 blur-[1px]'
                                  }`}>
                                    <ExpandedSessionContent session={session} />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </li>
                        );
                      } else {
                        // Multiple sessions day (or placeholder) - render with date key and sessions
                        return (
                          <li key={dayGroup.date}>
                            {isDayPlaceholder ? (
                              <div className="opacity-60 animate-pulse">
                                <div className="mr-4 text-center w-12 h-10 bg-slate-300/70 rounded-md flex-shrink-0"></div>
                              </div>
                            ) : (
                              <div>
                                {dayGroup.sessions.map((session, sessionIndex) => (
                                  <div key={session.id} data-session-id={session.id}>
                                    {/* Session row */}
                                    <div className="flex">
                                      {showTimestamps && (
                                        <div className="mr-4 text-center w-10 flex-shrink-0 mt-2" aria-hidden="true">
                                          {sessionIndex === 0 && (
                                            <>
                                              <div className="text-[10px] text-gray-400 tracking-wide">{dayOfWeek}</div>
                                              <div className="text-sm font-bold text-slate-700">{dayOfMonth}</div>
                                            </>
                                          )}
                                        </div>
                                      )}
                                      <div className={`flex-1 bg-slate-50/50 pl-4 py-2 ${showTimestamps ? 'border-l-2 border-indigo-200 rounded-r-md' : 'rounded-md'}`}>
                                        <div className={`relative group ${sessionIndex > 0 ? 'mt-1' : ''}`}>
                                          <div className="flex items-center">
                                            {isSelectMode && (
                                              <div className="flex-shrink-0 mr-2">
                                                <button
                                                  onClick={() => toggleSessionSelection(session.id)}
                                                  className={`w-3.5 h-3.5 rounded border-2 transition-all duration-200 flex items-center justify-center ${
                                                    selectedSessions.has(session.id)
                                                      ? 'bg-indigo-50 border-indigo-200'
                                                      : 'bg-white border-slate-200 hover:border-slate-300'
                                                  }`}
                                                >
                                                  {selectedSessions.has(session.id) && (
                                                    <svg className="w-2 h-2 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                    </svg>
                                                  )}
                                                </button>
                                              </div>
                                            )}
                                            <button
                                              onClick={() => handleSelectSession(session.id)}
                                              className={`flex-1 flex items-center text-left bg-slate-50/50 p-3 rounded-xl border-2 transition-colors group focus-visible:outline-none focus-visible:ring-1 ${
                                                expandedSessions[session.id]
                                                  ? 'border-indigo-200 bg-indigo-50'
                                                  : isSelectMode
                                                    ? selectedSessions.has(session.id)
                                                      ? 'bg-indigo-50 hover:bg-indigo-100 focus-visible:ring-indigo-400 border-transparent'
                                                      : 'hover:bg-slate-50 focus-visible:ring-slate-400 border-transparent'
                                                    : 'hover:bg-slate-100 focus-visible:ring-indigo-400 border-transparent'
                                              }`}>
                                              {showTimestamps && (
                                                <div className="flex-shrink-0 mr-3 w-16">
                                                  <p className="text-xs text-slate-500 group-hover:text-indigo-600">
                                                    {new Date(session.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                                                  </p>
                                                </div>
                                              )}
                                              <div className="flex-grow min-w-0">
                                                <p className="text-sm font-medium text-slate-700 group-hover:text-indigo-700 truncate">{session.title || 'Untitled Session'}</p>
                                                {showTimestamps && (
                                                  <p className="text-xs text-slate-500">{formatDuration(session.duration)}</p>
                                                )}
                                              </div>
                                              <svg className={`w-4 h-4 text-slate-400 group-hover:text-indigo-500 ml-2 flex-shrink-0 opacity-70 group-hover:opacity-100 transition-all duration-200 ${expandedSessions[session.id] ? 'rotate-90 text-indigo-500 opacity-100' : ''}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" /></svg>
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                    {/* Expansion content directly below this specific session */}
                                    <div className={`overflow-hidden transition-all duration-200 ease-out ${
                                      expandedSessions[session.id]
                                        ? 'max-h-[1000px]'
                                        : 'max-h-0'
                                    }`}>
                                      <div className={`mt-3 bg-white rounded-xl border border-slate-200 transition-transform duration-200 ease-out origin-top ${
                                        expandedSessions[session.id] ? 'scale-y-100' : 'scale-y-0'
                                      }`}>
                                        <div className={`p-4 transition-all duration-150 delay-200 ${
                                          expandedSessions[session.id]
                                            ? 'opacity-100 blur-0'
                                            : 'opacity-0 blur-[1px]'
                                        }`}>
                                          <ExpandedSessionContent session={session} />
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </li>
                        );
                      }
                    })}
                  </ul>
                </section>
              )
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {confirmDeleteSessionId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-100">
            <div className="p-8">
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">
                  {confirmDeleteSessionId === 'bulk' ? 'Delete Sessions' : 'Delete Session'}
                </h3>
                <p className="text-sm text-slate-500">This action cannot be undone.</p>
              </div>
              
              <p className="text-slate-600 mb-8 text-center">
                {confirmDeleteSessionId === 'bulk'
                  ? `Are you sure you want to delete ${selectedSessions.size} session${selectedSessions.size > 1 ? 's' : ''}? All session data will be permanently removed.`
                  : 'Are you sure you want to delete this session? All session data will be permanently removed.'
                }
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={cancelDelete}
                  className="flex-1 px-4 py-3 text-sm font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-slate-300"
                >
                  Cancel
                </button>
                <button
                  onClick={() => confirmDeleteSessionId === 'bulk' ? handleBulkDelete() : handleDeleteSession(confirmDeleteSessionId)}
                  disabled={deletingSessionId === confirmDeleteSessionId || (confirmDeleteSessionId === 'bulk' && deletingSessionId === 'bulk')}
                  className="flex-1 px-4 py-3 text-sm font-medium text-slate-700 bg-slate-100 border border-slate-200 rounded-xl hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-slate-300"
                >
                  {(deletingSessionId === confirmDeleteSessionId || (confirmDeleteSessionId === 'bulk' && deletingSessionId === 'bulk'))
                    ? 'Deleting...'
                    : confirmDeleteSessionId === 'bulk'
                      ? `Delete ${selectedSessions.size}`
                      : 'Delete'
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
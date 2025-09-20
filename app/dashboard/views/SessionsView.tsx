'use client';

import { Fragment, useEffect, useMemo, useState } from 'react'; // Fragment might still be useful for list structures
import { sessionCache, setSessionCache } from '@/app/contexts/sessionCache';

import { supabase } from '@/supabase/client';
import { useConversationStatus } from '@/app/contexts/ConversationContext';
import { useRouter } from 'next/navigation';
import LoadingDots from '@/components/LoadingDots';

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
export default function UserSessionHistory({ sidebarCollapsed = false }: { sidebarCollapsed?: boolean }) {
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

  const { conversationEnded, pollingStatus, setPollingStatus } = useConversationStatus();
  const router = useRouter();

  const handleSelectSession = (id: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set('sid', id);
    router.replace(url.toString());
  };

  const toggleExpandedDay = (dayDateISO: string) => {
    setExpandedDays(prev => ({ ...prev, [dayDateISO]: !prev[dayDateISO] }));
  };

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
  const showInitialLoading = loading && allUserSessionsData.length === 0;

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
      
      <div className={`hidden max-w-2xl ${sidebarCollapsed ? 'mx-auto' : 'ml-32 lg:ml-40'} px-4 sm:px-6 lg:px-8 mb-6`}> {/* Search Bar */}
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
            <svg className="h-5 w-5 text-slate-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" /></svg>
          </div>
          <input type="text" placeholder="Search sessions..."
            className="block w-full rounded-xl border-0 bg-white py-3.5 pl-11 pr-4 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
      </div>

      {showInitialLoading ? ( /* Loading Spinner */
        <div className="text-center py-4 md:py-6">
          <LoadingDots text="Loading your sessions" className="text-sm font-medium text-slate-600" />
        </div>
      ) : showEmptyMessage ? ( /* Empty State */
        <div className={`text-center py-4 md:py-6 px-4 max-w-md ${sidebarCollapsed ? 'mx-auto' : 'ml-32 lg:ml-40'}`}>
          <svg className="mx-auto h-12 w-12 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 10.5v3.75m-9.303 3.376C1.82 19.513 3.252 21 5.006 21h13.988c1.754 0 3.186-1.487 2.31-3.374L13.949 4.878c-.875-1.887-3.021-1.887-3.896 0L2.697 17.626ZM12 17.25h.007v.008H12v-.008Z" /></svg>
          <h3 className="mt-3 md:mt-4 text-base md:text-lg font-semibold text-slate-700">{searchQuery ? 'No Sessions Found' : 'Your Session History is Empty'}</h3>
          <p className="mt-1 md:mt-1.5 text-xs md:text-sm text-slate-500">{searchQuery ? 'Try different keywords or clear your search.' : 'Once you complete a session, it will appear here.'}</p>
        </div>
      ) : (
        <div className={`max-w-2xl ${sidebarCollapsed ? 'mx-auto' : 'ml-32 lg:ml-40'} px-4 md:px-6 lg:px-8`}>
          {showSpecialMostRecentView && mostRecentSessionActual && ( /* Most Recent Session View */
            <section className="mb-4" aria-labelledby="most-recent-session-title">
              <div className="flex items-center justify-between mb-1 px-1">
                <h2 id="most-recent-session-title" className="text-[10px] md:text-xs font-semibold text-slate-500 uppercase tracking-wider">Latest Session</h2>
                {!showInitialLoading && !showEmptyMessage && (
                  <div className="flex items-center gap-2">
                    {isSelectMode && selectedSessions.size > 0 && (
                      <button
                        onClick={() => setConfirmDeleteSessionId('bulk')}
                        disabled={deletingSessionId === 'bulk'}
                        className="px-2 md:px-3 py-1 md:py-1.5 text-[10px] md:text-xs font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                      className={`px-2 md:px-3 py-1 md:py-1.5 text-[10px] md:text-xs font-medium rounded-md transition-colors ${
                        isSelectMode 
                          ? 'text-slate-600 hover:text-slate-700 hover:bg-slate-100' 
                          : 'text-slate-500 hover:text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {isSelectMode ? 'Cancel' : 'Delete sessions'}
                    </button>
                  </div>
                )}
              </div>
              <div className="relative group">
                {isSelectMode && !isMostRecentActualPlaceholder && (
                  <div className="absolute top-4 left-4 z-10">
                    <input
                      type="checkbox"
                      checked={selectedSessions.has(mostRecentSessionActual.id)}
                      onChange={() => toggleSessionSelection(mostRecentSessionActual.id)}
                      className="w-5 h-5 text-red-600 bg-white border-slate-300 rounded focus:ring-red-500 focus:ring-2"
                    />
                  </div>
                )}
                <button 
                  onClick={() => {
                    if (isSelectMode && !isMostRecentActualPlaceholder) {
                      toggleSessionSelection(mostRecentSessionActual.id);
                    } else if (!isMostRecentActualPlaceholder) {
                      handleSelectSession(mostRecentSessionActual.id);
                    }
                  }}
                  disabled={isMostRecentActualPlaceholder}
                  aria-label={`${isSelectMode ? 'Select' : 'View'} latest session: ${mostRecentSessionActual.title || 'Untitled Session'}`}
                  className={`w-full text-left bg-white p-4 md:p-5 sm:p-6 rounded-xl shadow-lg border border-slate-200 transition-all duration-200 ease-in-out ${
                    isMostRecentActualPlaceholder 
                      ? 'opacity-70 animate-pulse cursor-default' 
                      : isSelectMode
                        ? selectedSessions.has(mostRecentSessionActual.id)
                          ? 'ring-2 ring-red-500 bg-red-50 border-red-300'
                          : 'hover:ring-2 hover:ring-red-300 hover:bg-red-50'
                        : 'hover:shadow-xl hover:border-indigo-300 hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:outline-none'
                  }`}>
                {isMostRecentActualPlaceholder ? (<> {/* Placeholder for most recent */}
                  <div className="h-5 bg-slate-300 rounded w-3/5 mb-3"></div> <div className="space-y-2"><div className="h-3 bg-slate-300/80 rounded w-full"></div><div className="h-3 bg-slate-300/80 rounded w-full"></div><div className="h-3 bg-slate-300/80 rounded w-3/4"></div></div> <div className="h-4 bg-slate-300 rounded w-1/3 mt-4"></div>
                </>) : (<>
                  <h3 className="text-base md:text-lg sm:text-xl font-bold text-slate-800 group-hover:text-indigo-700 mb-0.5 md:mb-1 transition-colors">{mostRecentSessionActual.title || 'Untitled Session'}</h3>
                  <p className="text-[10px] md:text-xs text-slate-500 mb-1 md:mb-2">{formatDetailedTimestamp(mostRecentSessionActual.created_at)}{mostRecentSessionActual.duration !== null && ` • ${formatDuration(mostRecentSessionActual.duration)}`}</p>
                  {mostRecentSessionActual.summary && (<p className="text-xs md:text-sm text-slate-600 leading-relaxed line-clamp-3 group-hover:text-slate-700">{truncateSummary(mostRecentSessionActual.summary, 3)}</p>)}
                  <div className="mt-2 md:mt-3 flex justify-end"><span className="text-[10px] md:text-xs font-medium text-indigo-600 group-hover:text-indigo-700">View Details →</span></div>
                </>)}
                </button>
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
                            <div className="relative group">
                              {isSelectMode && !isListItemPlaceholder && (
                                <div className="absolute top-3 left-3 z-10">
                                  <input
                                    type="checkbox"
                                    checked={selectedSessions.has(session.id)}
                                    onChange={() => toggleSessionSelection(session.id)}
                                    className="w-4 h-4 text-red-600 bg-white border-slate-300 rounded focus:ring-red-500 focus:ring-2"
                                  />
                                </div>
                              )}
                              <button 
                                onClick={() => {
                                  if (isSelectMode && !isListItemPlaceholder) {
                                    toggleSessionSelection(session.id);
                                  } else if (!isListItemPlaceholder) {
                                    handleSelectSession(session.id);
                                  }
                                }}
                                disabled={isListItemPlaceholder}
                                aria-label={`${isSelectMode ? 'Select' : 'View'} session: ${session.title || 'Untitled Session'}`}
                                className={`w-full flex items-center bg-white p-3 md:p-3.5 sm:p-4 rounded-xl shadow transition-all duration-200 ease-in-out ${
                                  isListItemPlaceholder 
                                    ? 'opacity-60 animate-pulse cursor-default' 
                                    : isSelectMode
                                      ? selectedSessions.has(session.id)
                                        ? 'ring-2 ring-red-500 bg-red-50 border-red-300'
                                        : 'hover:ring-2 hover:ring-red-300 hover:bg-red-50'
                                      : 'hover:shadow-md hover:border-slate-300 hover:-translate-y-px focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:outline-none'
                                }`}>
                              {isListItemPlaceholder ? (<> {/* Placeholder for recent list item */}
                                <div className="mr-4 text-center w-16 h-6 bg-slate-300/70 rounded-md flex-shrink-0"></div> <div className="flex-grow min-w-0"><div className="h-4 bg-slate-300 rounded w-3/4 mb-1.5"></div><div className="h-3 bg-slate-300 rounded w-1/2"></div></div> <div className="h-4 bg-slate-300 rounded w-10 ml-3"></div>
                              </>) : (<>
                                <div className="mr-2 md:mr-3 sm:mr-4 text-center w-12 md:w-16 sm:w-20 flex-shrink-0 py-0.5 md:py-1 px-0.5 md:px-1">
                                  <span className="text-[9px] md:text-[11px] sm:text-xs font-medium text-slate-500 group-hover:text-slate-600 bg-slate-200/70 group-hover:bg-slate-200 rounded px-1 md:px-1.5 py-0.5">{formatRelativeDateForRecent(session.created_at)}</span>
                                </div>
                                <div className="flex-grow min-w-0">
                                  <h3 className="text-xs md:text-sm sm:text-base font-normal text-slate-800 group-hover:text-indigo-700 truncate transition-colors">{session.title || 'Untitled Session'}</h3>
                                  <p className="text-[10px] md:text-xs text-slate-500 group-hover:text-slate-600 mt-0.5">{formatDuration(session.duration)}</p>
                                </div>
                                <svg className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 ml-3 flex-shrink-0 transition-colors" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" /></svg>
                              </>)}
                            </button>
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
                  <ul className="space-y-1">
                    {dailyGroups.map((dayGroup) => {
                      const { dayOfWeek, dayOfMonth, fullDate } = formatListDateParts(dayGroup.date);
                      const isDayPlaceholder = dayGroup.sessions.some(s => s.title === 'Recent Session' && s.summary === 'Summarizing...');
                      const isExpanded = expandedDays[dayGroup.date] || false;

                      if (dayGroup.sessions.length === 1 && !isDayPlaceholder) {
                        // Single session day - render as individual tile
                        const session = dayGroup.sessions[0];
                        return (
                          <li key={session.id}>
                            <div className="relative group">
                              {isSelectMode && (
                                <div className="absolute top-3 left-3 z-10">
                                  <input
                                    type="checkbox"
                                    checked={selectedSessions.has(session.id)}
                                    onChange={() => toggleSessionSelection(session.id)}
                                    className="w-4 h-4 text-red-600 bg-white border-slate-300 rounded focus:ring-red-500 focus:ring-2"
                                  />
                                </div>
                              )}
                              <button 
                                onClick={() => {
                                  if (isSelectMode) {
                                    toggleSessionSelection(session.id);
                                  } else {
                                    handleSelectSession(session.id);
                                  }
                                }}
                                aria-label={`${isSelectMode ? 'Select' : 'View'} session: ${session.title || 'Untitled Session'} from ${fullDate}`}
                                className={`w-full flex items-center bg-white p-3.5 sm:p-4 rounded-xl shadow transition-all duration-200 ease-in-out group ${
                                  isSelectMode
                                    ? selectedSessions.has(session.id)
                                      ? 'ring-2 ring-red-500 bg-red-50 border-red-300'
                                      : 'hover:ring-2 hover:ring-red-300 hover:bg-red-50'
                                    : 'hover:shadow-md hover:border-slate-300 hover:-translate-y-px focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:outline-none'
                                }`}>
                                <div className="mr-2 sm:mr-3 text-center w-10 flex-shrink-0" aria-hidden="true">
                                  <div className="text-[10px] text-gray-400 tracking-wide">{dayOfWeek}</div>
                                  <div className="text-sm font-bold text-slate-700 group-hover:text-slate-800">{dayOfMonth}</div>
                                </div>
                                <div className="flex-grow min-w-0">
                                  <h3 className="text-xs md:text-sm sm:text-base font-normal text-slate-800 group-hover:text-indigo-700 truncate transition-colors">{session.title || 'Untitled Session'}</h3>
                                  <p className="text-[10px] md:text-xs text-slate-500 group-hover:text-slate-600 mt-0.5">{formatDuration(session.duration)}</p>
                                </div>
                                <svg className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 ml-3 flex-shrink-0 transition-colors" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" /></svg>
                              </button>
                            </div>
                          </li>
                        );
                      } else {
                        // Multiple sessions day (or placeholder) - render as expandable group
                        return (
                          <li key={dayGroup.date}>
                            <button onClick={() => !isDayPlaceholder && toggleExpandedDay(dayGroup.date)} disabled={isDayPlaceholder}
                              aria-expanded={isExpanded} aria-controls={`sessions-for-${dayGroup.date}`}
                              aria-label={`${isExpanded ? 'Collapse' : 'Expand'} sessions from ${fullDate}`}
                              className={`w-full flex items-center bg-white p-3.5 sm:p-4 rounded-xl shadow transition-all duration-200 ease-in-out group ${isDayPlaceholder ? 'opacity-60 animate-pulse cursor-default' : 'hover:shadow-md hover:border-slate-300 hover:-translate-y-px focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:outline-none'}`}>
                              {isDayPlaceholder ? (<> {/* Placeholder for day group tile */}
                                <div className="mr-4 text-center w-12 h-10 bg-slate-300/70 rounded-md flex-shrink-0"></div> <div className="flex-grow min-w-0"><div className="h-4 bg-slate-300 rounded w-3/4 mb-1.5"></div><div className="h-3 bg-slate-300 rounded w-1/2"></div></div> <div className="h-4 bg-slate-300 rounded w-10 ml-3"></div>
                              </>) : (<>
                                <div className="mr-2 sm:mr-3 text-center w-10 flex-shrink-0" aria-hidden="true">
                                  <div className="text-[10px] text-gray-400 tracking-wide">{dayOfWeek}</div>
                                  <div className="text-sm font-bold text-slate-700 group-hover:text-slate-800">{dayOfMonth}</div>
                                </div>
                                <div className="flex-grow min-w-0">
                                  <h3 className="text-xs sm:text-sm font-normal text-slate-800 group-hover:text-indigo-700 truncate transition-colors">
                                    {dayGroup.sessions.length} {dayGroup.sessions.length === 1 ? 'session' : 'sessions'}
                                  </h3>
                                </div>
                                <svg className={`w-5 h-5 text-slate-400 group-hover:text-indigo-600 ml-3 flex-shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" /></svg>
                              </>)}
                            </button>
                            {!isDayPlaceholder && (
                               <div id={`sessions-for-${dayGroup.date}`} className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[1000px] opacity-100 mt-1.5' : 'max-h-0 opacity-0'}`}>
                                <ul className="pl-4 pr-1 py-1 space-y-1.5 bg-slate-50/50 border-l-2 border-indigo-200 ml-[calc(0.75rem+3rem+0.25rem)] rounded-r-md"> {/* Adjust ml based on date block width */}
                                    {dayGroup.sessions.map(session => (
                                    <li key={session.id}>
                                        <div className="relative group flex items-center">
                                        {isSelectMode && (
                                          <div className="flex-shrink-0 mr-2">
                                            <input
                                              type="checkbox"
                                              checked={selectedSessions.has(session.id)}
                                              onChange={() => toggleSessionSelection(session.id)}
                                              className="w-3.5 h-3.5 text-red-600 bg-white border-slate-300 rounded focus:ring-red-500 focus:ring-1"
                                            />
                                          </div>
                                        )}
                                        <button 
                                          onClick={() => {
                                            if (isSelectMode) {
                                              toggleSessionSelection(session.id);
                                            } else {
                                              handleSelectSession(session.id);
                                            }
                                          }}
                                          className={`flex-1 flex items-center text-left p-2 rounded-md transition-colors group focus-visible:outline-none focus-visible:ring-1 ${
                                            isSelectMode
                                              ? selectedSessions.has(session.id)
                                                ? 'bg-red-100 hover:bg-red-200 focus-visible:ring-red-400'
                                                : 'hover:bg-red-50 focus-visible:ring-red-400'
                                              : 'hover:bg-slate-200/60 focus-visible:ring-indigo-400'
                                          }`}>
                                        <div className="flex-shrink-0 mr-2 w-16">
                                            <p className="text-xs text-slate-500 group-hover:text-indigo-600">
                                            {new Date(session.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                                            </p>
                                        </div>
                                        <div className="flex-grow min-w-0">
                                            <p className="text-sm font-medium text-slate-700 group-hover:text-indigo-700 truncate">{session.title || 'Untitled Session'}</p>
                                            <p className="text-xs text-slate-500">{formatDuration(session.duration)}</p>
                                        </div>
                                        <svg className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 ml-2 flex-shrink-0 opacity-70 group-hover:opacity-100" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" /></svg>
                                        </button>
                                        </div>
                                    </li>
                                    ))}
                                </ul>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-4">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {confirmDeleteSessionId === 'bulk' ? 'Delete Sessions' : 'Delete Session'}
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">This action cannot be undone.</p>
                </div>
              </div>
              
              <p className="text-slate-600 mb-6">
                {confirmDeleteSessionId === 'bulk' 
                  ? `Are you sure you want to delete ${selectedSessions.size} session${selectedSessions.size > 1 ? 's' : ''}? All session data including transcripts, summaries, and notes will be permanently removed.`
                  : 'Are you sure you want to delete this session? All session data including the transcript, summary, and notes will be permanently removed.'
                }
              </p>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={cancelDelete}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500"
                >
                  Cancel
                </button>
                <button
                  onClick={() => confirmDeleteSessionId === 'bulk' ? handleBulkDelete() : handleDeleteSession(confirmDeleteSessionId)}
                  disabled={deletingSessionId === confirmDeleteSessionId || (confirmDeleteSessionId === 'bulk' && deletingSessionId === 'bulk')}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  {(deletingSessionId === confirmDeleteSessionId || (confirmDeleteSessionId === 'bulk' && deletingSessionId === 'bulk'))
                    ? 'Deleting...' 
                    : confirmDeleteSessionId === 'bulk' 
                      ? `Delete ${selectedSessions.size} Session${selectedSessions.size > 1 ? 's' : ''}`
                      : 'Delete Session'
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
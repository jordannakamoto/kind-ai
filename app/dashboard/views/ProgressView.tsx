"use client";

import { addDays, eachDayOfInterval, endOfMonth, format, startOfMonth, startOfWeek, endOfWeek, isToday, isSameMonth, isSameDay } from "date-fns";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, FileText, Star } from "lucide-react";
import { supabase } from "@/supabase/client";
import { useRouter } from "next/navigation";
import MoodSelector from "@/app/dashboard/components/MoodSelector";
import MoodCustomizer, { MoodOption } from "@/app/dashboard/components/MoodCustomizer";

// Default mood options as fallback
const defaultMoodOptions: MoodOption[] = [
  {
    id: "default_happy",
    emoji: "😊",
    label: "Happy",
    value: "happy",
    color: "bg-gradient-to-br from-emerald-50 to-green-100",
    borderColor: "border-emerald-300",
    dotColor: "bg-gradient-to-r from-emerald-400 to-green-500",
    shadowColor: "shadow-emerald-200/60"
  },
  {
    id: "default_neutral",
    emoji: "😐",
    label: "Neutral",
    value: "neutral",
    color: "bg-gradient-to-br from-amber-50 to-yellow-100",
    borderColor: "border-amber-300",
    dotColor: "bg-gradient-to-r from-amber-400 to-orange-400",
    shadowColor: "shadow-amber-200/60"
  },
  {
    id: "default_sad",
    emoji: "😢",
    label: "Sad",
    value: "sad",
    color: "bg-gradient-to-br from-sky-50 to-blue-100",
    borderColor: "border-sky-300",
    dotColor: "bg-gradient-to-r from-sky-400 to-blue-500",
    shadowColor: "shadow-sky-200/60"
  },
  {
    id: "default_angry",
    emoji: "😡",
    label: "Angry",
    value: "angry",
    color: "bg-gradient-to-br from-rose-50 to-red-100",
    borderColor: "border-rose-300",
    dotColor: "bg-gradient-to-r from-rose-400 to-red-500",
    shadowColor: "shadow-rose-200/60"
  },
  {
    id: "default_tired",
    emoji: "😴",
    label: "Tired",
    value: "tired",
    color: "bg-gradient-to-br from-violet-50 to-purple-100",
    borderColor: "border-violet-300",
    dotColor: "bg-gradient-to-r from-violet-400 to-purple-500",
    shadowColor: "shadow-violet-200/60"
  },
];

const journalPrompts = [
  "What made you smile today?",
  "What challenged you today?",
  "What are you grateful for?",
  "How did you care for yourself today?",
  "What is something you're looking forward to?",
];

interface Session {
  id: string;
  created_at: string;
  title?: string;
  summary?: string;
  duration?: number;
}

interface Goal {
  id: string;
  title: string;
  description?: string;
  completed_at?: string;
  created_at: string;
  is_active: boolean;
}

export default function ProgressView({ sidebarCollapsed = false }: { sidebarCollapsed?: boolean }) {
  const router = useRouter();
  const [moods, setMoods] = useState<Record<string, string>>({});
  const [journalEntries, setJournalEntries] = useState<Record<string, string>>({});
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [sessions, setSessions] = useState<Record<string, Session[]>>({});
  const [goalCompletions, setGoalCompletions] = useState<Record<string, Goal[]>>({});
  const [moodOptions, setMoodOptions] = useState<MoodOption[]>(defaultMoodOptions);
  const [showMoodCustomizer, setShowMoodCustomizer] = useState(false);
  const [moodOptionsLoading, setMoodOptionsLoading] = useState(true);

  // Generate calendar grid including days from previous/next month
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  
  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate
  });

  const promptIndex = selectedDate.getDate() % journalPrompts.length;
  const prompt = journalPrompts[promptIndex];

  const handleMoodSelect = (date: Date, mood: string) => {
    const formattedDate = format(date, "yyyy-MM-dd");
    setMoods((prev) => ({ ...prev, [formattedDate]: mood }));
  };

  const handleJournalChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const formattedDate = format(selectedDate, "yyyy-MM-dd");
    setJournalEntries((prev) => ({ ...prev, [formattedDate]: value }));
  };

  const changeDayFocus = (date: Date) => {
    setSelectedDate(date);
  };

  const changeMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      newMonth.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1));
      return newMonth;
    });
  };

  // Fetch user's mood options (default + custom)
  const fetchMoodOptions = async () => {
    setMoodOptionsLoading(true);
    try {
      const response = await fetch('/api/moods');
      if (response.ok) {
        const { moods: userMoods } = await response.json();
        setMoodOptions(userMoods.length > 0 ? userMoods : defaultMoodOptions);
      } else {
        console.error('Failed to fetch mood options');
        setMoodOptions(defaultMoodOptions);
      }
    } catch (error) {
      console.error('Error fetching mood options:', error);
      setMoodOptions(defaultMoodOptions);
    } finally {
      setMoodOptionsLoading(false);
    }
  };

  // Handle mood options update from customizer
  const handleMoodOptionsUpdate = async (updatedMoods: MoodOption[]) => {
    setMoodOptions(updatedMoods);

    // Save custom moods to database
    try {
      const customMoods = updatedMoods.filter(mood => mood.isCustom);

      // Here you would typically send the updated moods to your API
      // For now, we'll just update the local state
      console.log('Updated mood options:', updatedMoods);
    } catch (error) {
      console.error('Error saving mood options:', error);
    }
  };

  // Fetch mood options on component mount
  useEffect(() => {
    fetchMoodOptions();
  }, []);

  // Fetch sessions and goals for the current month
  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);
      
      const { data: sessionsData, error } = await supabase
        .from('sessions')
        .select('id, created_at, title, summary, duration')
        .eq('user_id', user.id)
        .gte('created_at', monthStart.toISOString())
        .lte('created_at', monthEnd.toISOString())
        .order('created_at', { ascending: true });

      if (!error && sessionsData) {
        // Group sessions by date
        const sessionsByDate: Record<string, Session[]> = {};
        sessionsData.forEach((session) => {
          const dateKey = format(new Date(session.created_at), 'yyyy-MM-dd');
          if (!sessionsByDate[dateKey]) {
            sessionsByDate[dateKey] = [];
          }
          sessionsByDate[dateKey].push(session);
        });
        setSessions(sessionsByDate);
      }

      // Fetch completed goals for the month
      const { data: goalsData, error: goalsError } = await supabase
        .from('goals')
        .select('id, title, description, completed_at, created_at, is_active')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .not('completed_at', 'is', null)
        .gte('completed_at', monthStart.toISOString())
        .lte('completed_at', monthEnd.toISOString())
        .order('completed_at', { ascending: true });

      if (!goalsError && goalsData) {
        // Group goals by completion date
        const goalsByDate: Record<string, Goal[]> = {};
        goalsData.forEach((goal) => {
          if (goal.completed_at) {
            const dateKey = format(new Date(goal.completed_at), 'yyyy-MM-dd');
            if (!goalsByDate[dateKey]) {
              goalsByDate[dateKey] = [];
            }
            goalsByDate[dateKey].push(goal);
          }
        });
        setGoalCompletions(goalsByDate);
      }
    };

    fetchData();
  }, [currentMonth]);

  // Refetch data when component becomes visible or focused
  useEffect(() => {
    const refetchGoals = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);
      
      // Fetch completed goals for the current month
      const { data: goalsData, error: goalsError } = await supabase
        .from('goals')
        .select('id, title, description, completed_at, created_at, is_active')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .not('completed_at', 'is', null)
        .gte('completed_at', monthStart.toISOString())
        .lte('completed_at', monthEnd.toISOString())
        .order('completed_at', { ascending: true });

      if (!goalsError && goalsData) {
        // Group goals by completion date
        const goalsByDate: Record<string, Goal[]> = {};
        goalsData.forEach((goal) => {
          if (goal.completed_at) {
            const dateKey = format(new Date(goal.completed_at), 'yyyy-MM-dd');
            if (!goalsByDate[dateKey]) {
              goalsByDate[dateKey] = [];
            }
            goalsByDate[dateKey].push(goal);
          }
        });
        setGoalCompletions(goalsByDate);
      }
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        refetchGoals();
      }
    };

    const handleFocus = () => {
      refetchGoals();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [currentMonth]);

  return (
    <div className={`max-w-4xl mt-2 ${sidebarCollapsed ? 'mx-auto' : 'ml-8 lg:ml-16'} p-4 md:pl-20 space-y-2 bg-white min-h-[calc(100vh+200px)]`}>
      {/* Header */}
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-base md:text-lg font-semibold text-gray-800">Your Wellness Journey</h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setCurrentMonth(new Date())}
            className="px-2 md:px-3 py-1 md:py-1.5 text-xs md:text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition"
          >
            Today
          </button>
          <div className="flex items-center space-x-1">
            <button 
              onClick={() => changeMonth('prev')} 
              className="p-1.5 hover:bg-gray-100 rounded-lg transition"
            >
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            </button>
            <span className="px-2 md:px-3 py-1 text-xs md:text-sm font-medium text-gray-700 min-w-[100px] md:min-w-[120px] text-center">
              {format(currentMonth, "MMMM yyyy")}
            </span>
            <button 
              onClick={() => changeMonth('next')} 
              className="p-1.5 hover:bg-gray-100 rounded-lg transition"
            >
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-gradient-to-br from-slate-50 to-blue-50/30 rounded-xl">
        {/* Day Headers */}
        <div className="grid grid-cols-7 border-b border-blue-100 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 rounded-t-xl">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="py-1.5 md:py-2 text-center text-[10px] md:text-xs font-semibold text-gray-600 uppercase tracking-wider">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar Days */}
        <div className="grid grid-cols-7">
          {calendarDays.map((date, index) => {
            const formattedDate = format(date, "yyyy-MM-dd");
            const mood = moods[formattedDate];
            const hasJournal = journalEntries[formattedDate];
            const isSelected = isSameDay(selectedDate, date);
            const isCurrentMonth = isSameMonth(date, currentMonth);
            const isTodayDate = isToday(date);
            const moodOption = mood ? moodOptions.find(m => m.value === mood) : null;
            const daySessions = sessions[formattedDate] || [];
            const dayGoals = goalCompletions[formattedDate] || [];

            return (
              <div
                key={formattedDate}
                onClick={() => changeDayFocus(date)}
                className={`
                  relative min-h-[60px] p-2 cursor-pointer transition-all duration-200
                  ${isSelected 
                    ? 'bg-gradient-to-br from-blue-100 to-indigo-100 border-2 border-blue-400' 
                    : 'border-r border-b border-blue-100/50 ' + 
                      (index % 7 === 0 ? 'border-l' : '') + ' ' +
                      (index % 7 === 6 ? 'border-r' : '')
                  }
                  ${!isCurrentMonth ? 'bg-slate-50/50 text-gray-400' : 'bg-white/70 text-gray-900 hover:bg-blue-50/40'}
                  ${isTodayDate ? 'font-bold' : ''}
                `}
              >
                <div className="flex justify-between items-start">
                  <span className={`
                    text-xs transition-all ${isTodayDate ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-2 py-1 rounded-full shadow-sm' : ''}
                  `}>
                    {format(date, "d")}
                  </span>
                  {mood && (
                    <span className="text-sm drop-shadow-sm">{moodOption?.emoji}</span>
                  )}
                </div>
                
                {/* Indicators */}
                <div className="absolute bottom-1.5 left-2 right-2 flex gap-1">
                  {mood && (
                    <div className={`w-1.5 h-1.5 rounded-full ${moodOption?.dotColor} ${moodOption?.shadowColor} shadow-sm`} />
                  )}
                  {hasJournal && (
                    <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-indigo-400 to-purple-400 shadow-sm" />
                  )}
                  {daySessions.length > 0 && (
                    <div className="flex items-center gap-0.5">
                      <FileText className="w-3.5 h-3.5 text-indigo-500" />
                      {daySessions.length > 1 && (
                        <span className="text-[10px] text-indigo-600 font-semibold">{daySessions.length}</span>
                      )}
                    </div>
                  )}
                  {dayGoals.length > 0 && (
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mood Selector */}
      <div className="mt-4">
        {moodOptionsLoading ? (
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-32 mb-3"></div>
            <div className="flex space-x-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 w-20 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        ) : (
          <MoodSelector
            moods={moodOptions}
            selectedMood={moods[format(selectedDate, "yyyy-MM-dd")]}
            selectedDate={selectedDate}
            onMoodSelect={handleMoodSelect}
            onCustomizeClick={() => setShowMoodCustomizer(true)}
          />
        )}
      </div>

      {/* Journal Entry */}
      <div className="mt-4">
        <div className="flex items-center justify-between mb-2">
          {journalEntries[format(selectedDate, "yyyy-MM-dd")] && (
            <span className="text-[10px] md:text-xs text-green-600 font-medium">Saved ✓</span>
          )}
        </div>
        
        <div className="relative bg-white p-6 rounded-lg border border-gray-100 shadow-sm min-h-[300px] overflow-visible">
          <div className="mb-4 pb-2 border-b border-gray-100">
            <h3 className="text-base font-medium text-gray-800">
              Daily Reflection
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              {format(selectedDate, "EEEE, MMMM d, yyyy")}
            </p>
          </div>
          <textarea
            className="
              w-full px-0 py-0 border-0 bg-transparent
              text-sm focus:outline-none 
              resize-none min-h-[220px] 
              placeholder:text-gray-400 placeholder:italic
              leading-relaxed
              text-gray-700
              font-light
            "
            placeholder={prompt}
            value={journalEntries[format(selectedDate, "yyyy-MM-dd")] || ""}
            onChange={handleJournalChange}
          />
        </div>
      </div>

      {/* Sessions for Selected Date */}
      {sessions[format(selectedDate, "yyyy-MM-dd")]?.length > 0 && (
        <div className="mt-4 p-3 bg-indigo-50/30 rounded-lg border border-indigo-100">
          <div className="flex items-start gap-2 text-sm text-gray-700">
            <FileText className="w-3.5 h-3.5 text-indigo-500 mt-0.5" />
            <div className="space-y-1">
              {sessions[format(selectedDate, "yyyy-MM-dd")].map((session, index) => (
                <button
                  key={session.id}
                  onClick={() => router.push(`/dashboard?tab=sessions&sid=${session.id}`)}
                  className="block text-left font-medium text-gray-700 hover:text-gray-900 hover:underline transition-colors"
                >
                  {session.title || `Therapy Session ${index + 1}`}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Goals for Selected Date */}
      {goalCompletions[format(selectedDate, "yyyy-MM-dd")]?.length > 0 && (
        <div className="mt-4 p-3 bg-amber-50/30 rounded-lg border border-amber-100">
          <div className="flex items-start gap-2 text-sm text-gray-700">
            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400 mt-0.5" />
            <div className="space-y-1">
              {goalCompletions[format(selectedDate, "yyyy-MM-dd")].map((goal) => (
                <div key={goal.id} className="font-medium text-gray-700">
                  {goal.title}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Mood Customizer Modal */}
      {showMoodCustomizer && (
        <MoodCustomizer
          currentMoods={moodOptions}
          onMoodsUpdate={handleMoodOptionsUpdate}
          onClose={() => setShowMoodCustomizer(false)}
        />
      )}

    </div>
  );
}
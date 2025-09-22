"use client";

import { addDays, eachDayOfInterval, endOfMonth, format, startOfMonth, startOfWeek, endOfWeek, isToday, isSameMonth, isSameDay } from "date-fns";
import { useEffect, useState, useRef } from "react";
import { ChevronLeft, ChevronRight, FileText, Star } from "lucide-react";
import { supabase } from "@/supabase/client";
import { useRouter } from "next/navigation";
import MoodSelector from "@/app/dashboard/components/MoodSelector";
import MoodCustomizer, { MoodOption } from "@/app/dashboard/components/MoodCustomizer";
import { useGoalCompletion } from "@/app/contexts/GoalCompletionContext";
import '@/app/dashboard/components/animations.css';

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
  const [celebratingDates, setCelebratingDates] = useState<Set<string>>(new Set());
  const celebrationTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const { newlyCompletedGoals, markGoalCelebrationViewed, getGoalsCompletedOnDate } = useGoalCompletion();

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
    const updatedMoods = { ...moods, [formattedDate]: mood };
    setMoods(updatedMoods);

    // Persist to localStorage
    try {
      localStorage.setItem('userMoods', JSON.stringify(updatedMoods));
    } catch (error) {
      console.warn('Failed to save moods to localStorage:', error);
    }
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

  // Fetch user's mood options (default + custom) from database
  const fetchMoodOptions = async () => {
    setMoodOptionsLoading(true);

    try {
      const response = await fetch('/api/moods');

      if (response.ok) {
        const data = await response.json();
        const moods = data.moods || [];

        // Transform the database format to match our MoodOption interface
        const transformedMoods = moods.map((mood: any) => ({
          id: mood.id,
          emoji: mood.emoji,
          label: mood.label,
          value: mood.value,
          color: mood.color || 'bg-gradient-to-br from-gray-50 to-gray-100',
          borderColor: mood.borderColor || 'border-gray-300',
          dotColor: mood.dotColor || 'bg-gradient-to-r from-gray-400 to-gray-500',
          shadowColor: mood.shadowColor || 'shadow-gray-200/60',
          isCustom: mood.isCustom || false
        }));

        setMoodOptions(transformedMoods.length > 0 ? transformedMoods : defaultMoodOptions);
      } else {
        console.error('Failed to fetch moods, using defaults');
        setMoodOptions(defaultMoodOptions);
      }
    } catch (error) {
      console.error('Error fetching moods:', error);
      setMoodOptions(defaultMoodOptions);
    } finally {
      setMoodOptionsLoading(false);
    }
  };

  // Handle mood options update from customizer (includes reordering, deletions, and additions)
  const handleMoodOptionsUpdate = async (updatedMoods: MoodOption[]) => {
    const previousMoods = moodOptions;
    setMoodOptions(updatedMoods);

    // Check if this is a deletion (mood count decreased)
    if (updatedMoods.length < previousMoods.length) {
      const deletedMood = previousMoods.find(
        prev => !updatedMoods.some(curr => curr.id === prev.id)
      );

      if (deletedMood) {
        if (deletedMood.isCustom) {
          // Delete custom mood from database
          try {
            const response = await fetch('/api/moods', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                action: 'delete_custom_mood',
                moodId: deletedMood.id
              })
            });

            if (!response.ok) {
              console.error('Failed to delete custom mood');
            }
          } catch (error) {
            console.error('Error deleting custom mood:', error);
          }
        } else {
          // For default moods, just save the new order (effectively hiding them)
          const moodOrder = updatedMoods.map(m => m.id);
          try {
            const response = await fetch('/api/moods', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                action: 'update_mood_order',
                moodOrder: moodOrder
              })
            });

            if (!response.ok) {
              console.error('Failed to update mood order');
            }
          } catch (error) {
            console.error('Error updating mood order:', error);
          }
        }
      }
      return;
    }

    // Check if this is a reorder (same moods, different order)
    if (updatedMoods.length === previousMoods.length) {
      const moodOrder = updatedMoods.map(m => m.id);
      console.log('Updating mood order:', moodOrder);

      try {
        const response = await fetch('/api/moods', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'update_mood_order',
            moodOrder: moodOrder
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Failed to update mood order:', errorText);
          console.error('Response status:', response.status);
        } else {
          console.log('Mood order updated successfully');
        }
      } catch (error) {
        console.error('Error updating mood order:', error);
      }
      return;
    }

    // Otherwise, this is a new custom mood addition
    const customMoods = updatedMoods.filter(mood => mood.isCustom);
    const newCustomMood = customMoods[customMoods.length - 1];

    if (newCustomMood) {
      try {
        const response = await fetch('/api/moods', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'create_custom_mood',
            emoji: newCustomMood.emoji,
            label: newCustomMood.label,
            value: newCustomMood.value,
            colorTheme: {
              color: newCustomMood.color,
              borderColor: newCustomMood.borderColor,
              dotColor: newCustomMood.dotColor,
              shadowColor: newCustomMood.shadowColor
            }
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          let error;
          try {
            error = JSON.parse(errorText);
          } catch {
            error = { message: errorText };
          }
          console.error('Failed to save custom mood:', error);
          console.error('Response status:', response.status);
        } else {
          console.log('Custom mood saved successfully');
          // Refresh mood options to get the new mood with proper ID from database
          fetchMoodOptions();
        }
      } catch (error) {
        console.error('Error saving custom mood:', error);
      }
    }
  };

  // Trigger celebration animation for a date
  const triggerCelebration = (dateKey: string, goalId: string) => {
    setCelebratingDates(prev => new Set([...prev, dateKey]));

    // Clear existing timeout for this date if any
    const existingTimeout = celebrationTimeouts.current.get(dateKey);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set new timeout to clear celebration after animation
    const timeout = setTimeout(() => {
      setCelebratingDates(prev => {
        const newSet = new Set(prev);
        newSet.delete(dateKey);
        return newSet;
      });
      markGoalCelebrationViewed(goalId);
      celebrationTimeouts.current.delete(dateKey);
    }, 1500); // 1.5 seconds total celebration time

    celebrationTimeouts.current.set(dateKey, timeout);
  };

  // Load saved moods from localStorage on component mount
  useEffect(() => {
    try {
      const savedMoods = localStorage.getItem('userMoods');
      if (savedMoods) {
        setMoods(JSON.parse(savedMoods));
      }
    } catch (error) {
      console.warn('Failed to load moods from localStorage:', error);
    }
  }, []);

  // Fetch mood options on component mount
  useEffect(() => {
    fetchMoodOptions();
  }, []);

  // Listen for newly completed goals and trigger celebrations immediately
  useEffect(() => {
    newlyCompletedGoals.forEach(goalId => {
      const today = format(new Date(), 'yyyy-MM-dd');
      console.log('🎉 ProgressView: Triggering celebration for goal:', goalId, 'on date:', today);

      triggerCelebration(today, goalId);
    });
  }, [newlyCompletedGoals]);

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

      // Clean up celebration timeouts
      celebrationTimeouts.current.forEach(timeout => clearTimeout(timeout));
      celebrationTimeouts.current.clear();
    };
  }, [currentMonth]);

  return (
    <div className={`max-w-4xl mt-2 ${sidebarCollapsed ? 'mx-auto' : 'ml-8 lg:ml-16'} p-4 md:pl-20 space-y-2 bg-white min-h-[calc(100vh+200px)]`}>
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg md:text-xl font-semibold text-gray-800">{format(currentMonth, "MMMM yyyy")}</h2>
          <div className="flex items-center bg-white/80 backdrop-blur-sm rounded-full border border-white/50">
            <button
              onClick={() => changeMonth('prev')}
              className="p-1.5 hover:bg-white/60 rounded-full transition-colors m-1"
            >
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            </button>
            <button
              onClick={() => changeMonth('next')}
              className="p-1.5 hover:bg-white/60 rounded-full transition-colors m-1"
            >
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>
        <button
          onClick={() => setCurrentMonth(new Date())}
          className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-full transition-colors"
        >
          Today
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="space-y-3">
        {/* Day Headers */}
        <div className="grid grid-cols-7 bg-gray-50 rounded-lg">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="py-1.5 text-center text-xs font-medium text-gray-600 uppercase tracking-wide">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="bg-white overflow-hidden">
          <div className="grid grid-cols-7 border-l border-t border-gray-200">
          {calendarDays.map((date, index) => {
            const formattedDate = format(date, "yyyy-MM-dd");
            const mood = moods[formattedDate];
            const hasJournal = journalEntries[formattedDate];
            const isSelected = isSameDay(selectedDate, date);
            const isCurrentMonth = isSameMonth(date, currentMonth);
            const isTodayDate = isToday(date);
            const moodOption = mood ? moodOptions.find(m => m.value === mood) : null;
            const daySessions = sessions[formattedDate] || [];
            const serverGoals = goalCompletions[formattedDate] || [];
            const contextGoals = getGoalsCompletedOnDate(formattedDate);

            // Combine server goals with context goals, avoid duplicates
            const allGoalIds = new Set([...serverGoals.map(g => g.id), ...contextGoals.map(g => g.goalId)]);
            const dayGoals = [
              ...serverGoals,
              ...contextGoals
                .filter(g => !serverGoals.some(sg => sg.id === g.goalId))
                .map(g => ({ id: g.goalId, title: g.goalTitle, completed_at: g.completedAt }))
            ];
            const dayOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
            const isCelebrating = celebratingDates.has(formattedDate);
            const hasNewlyCompletedGoals = dayGoals.some(goal => newlyCompletedGoals.has(goal.id));

            return (
              <div
                key={formattedDate}
                onClick={() => changeDayFocus(date)}
                className={`
                  relative min-h-[57px] md:min-h-[66px] p-1.5 cursor-pointer transition-all duration-200
                  ${isSelected
                    ? 'bg-blue-50 border-2 border-blue-500 z-10'
                    : 'border-r border-b border-gray-200 hover:bg-gray-50'
                  }
                  ${!isCurrentMonth
                    ? 'bg-gray-50/50 text-gray-400'
                    : !isSelected
                    ? 'bg-white'
                    : ''
                  }
                `}
              >
                {/* Fountain stars celebration */}
                {isCelebrating && (
                  <>
                    <Star className="fountain-star animate-star-fountain-1" size={8} />
                    <Star className="fountain-star animate-star-fountain-2" size={8} />
                    <Star className="fountain-star animate-star-fountain-3" size={8} />
                    <Star className="fountain-star animate-star-fountain-4" size={8} />
                    <Star className="fountain-star animate-star-fountain-5" size={8} />
                    <Star className="fountain-star animate-star-fountain-6" size={8} />
                  </>
                )}
                <div className="flex justify-between items-start">
                  <span className={`
                    text-sm font-medium
                    ${isSelected
                      ? 'text-blue-700 font-semibold'
                      : isCurrentMonth
                      ? 'text-gray-900'
                      : 'text-gray-400'
                    }
                  `}>
                    {format(date, "d")}
                  </span>
                  {mood && (
                    <span className="text-base">
                      {moodOption?.emoji}
                    </span>
                  )}
                </div>

                {/* Indicators */}
                <div className="absolute bottom-2 left-2 right-2 flex items-center gap-1.5">
                  {hasJournal && (
                    <div className="w-2 h-2 rounded-full bg-purple-400 opacity-70" />
                  )}
                  {daySessions.length > 0 && (
                    <div className="flex items-center gap-0.5">
                      <FileText className="w-3 h-3 text-blue-500 opacity-70" />
                      {daySessions.length > 1 && (
                        <span className="text-[9px] font-semibold text-blue-600">{daySessions.length}</span>
                      )}
                    </div>
                  )}
                  {dayGoals.length > 0 && (
                    <div className={`flex items-center gap-0.5 ${isCelebrating ? 'animate-star-bounce' : ''}`}>
                      <Star className={`w-3 h-3 text-amber-500 fill-amber-400 ${isCelebrating ? 'opacity-100 animate-star-glow' : 'opacity-80'}`} />
                      {dayGoals.length > 1 && (
                        <span className={`text-[9px] font-semibold text-amber-600 ${isCelebrating ? 'animate-star-bounce' : ''}`}>{dayGoals.length}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          </div>
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
            onCustomizeClick={() => setShowMoodCustomizer(!showMoodCustomizer)}
            showMoodCustomizer={showMoodCustomizer}
            onMoodsUpdate={(moods) => {
              handleMoodOptionsUpdate(moods);
              setShowMoodCustomizer(false);
            }}
            onCustomizeClose={() => setShowMoodCustomizer(false)}
          />
        )}
      </div>

      {/* Journal Entry */}
      <div className="mt-6">
        <div className="relative bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-50 bg-gradient-to-r from-gray-50/50 to-transparent">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-gray-800">
                  Daily Reflection
                </h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  {format(selectedDate, "EEEE, MMMM d, yyyy")}
                </p>
              </div>
              {journalEntries[format(selectedDate, "yyyy-MM-dd")] && (
                <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded-full">Saved ✓</span>
              )}
            </div>
          </div>
          <div className="p-6 min-h-[280px]">
            <textarea
              className="
                w-full h-full px-0 py-0 border-0 bg-transparent
                text-sm focus:outline-none
                resize-none min-h-[240px]
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
      </div>

      {/* Sessions for Selected Date */}
      {sessions[format(selectedDate, "yyyy-MM-dd")]?.length > 0 && (
        <div className="mt-4 p-4 bg-blue-50/50 rounded-xl border border-blue-100 shadow-sm">
          <div className="flex items-start gap-3 text-sm">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <FileText className="w-4 h-4 text-blue-600" />
            </div>
            <div className="space-y-2 flex-1">
              <h4 className="font-medium text-gray-800">Therapy Sessions</h4>
              {sessions[format(selectedDate, "yyyy-MM-dd")].map((session, index) => (
                <button
                  key={session.id}
                  onClick={() => router.push(`/dashboard?tab=sessions&sid=${session.id}`)}
                  className="block text-left text-gray-600 hover:text-blue-600 hover:underline transition-colors"
                >
                  {session.title || `Session ${index + 1}`}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Goals for Selected Date */}
      {goalCompletions[format(selectedDate, "yyyy-MM-dd")]?.length > 0 && (
        <div className="mt-4 p-4 bg-amber-50/50 rounded-xl border border-amber-100 shadow-sm">
          <div className="flex items-start gap-3 text-sm">
            <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Star className="w-4 h-4 text-amber-600 fill-amber-500" />
            </div>
            <div className="space-y-2 flex-1">
              <h4 className="font-medium text-gray-800">Completed Goals</h4>
              {goalCompletions[format(selectedDate, "yyyy-MM-dd")].map((goal) => (
                <div key={goal.id} className="text-gray-600">
                  {goal.title}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}


    </div>
  );
}
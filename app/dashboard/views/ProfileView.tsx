'use client';

import { AlertTriangle, ChevronRight, Plus, Circle, CheckCircle2, List, LayoutGrid, Minus, Settings, Archive, Target, Hash } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/supabase/client';
import { useConversationStatus } from '@/app/contexts/ConversationContext';
import { useGoalCompletion } from '@/app/contexts/GoalCompletionContext';
import LoadingDots from '@/components/LoadingDots';
import GoalItem from '@/app/dashboard/components/GoalItem';
import CleanupDropdown from '@/app/dashboard/components/CleanupDropdown';
import GoalSettingsTooltip from '@/app/dashboard/components/GoalSettingsTooltip';

const CACHE_VERSION = '1.0';

const generateHash = (data: string): string => {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString();
};

const getProfileCacheKey = (type: 'goals' | 'themes', userId: string): string => {
  return `profile_${type}_${userId}_${CACHE_VERSION}`;
};

function getCachedData<T>(key: string): T | null {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    const { data, hash } = JSON.parse(cached);
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
    const cacheEntry = { data, hash };
    localStorage.setItem(key, JSON.stringify(cacheEntry));
  } catch (error) {
    console.warn('Failed to cache profile data:', error);
  }
}

function findNewItems<T extends { id: string }>(oldItems: T[], newItems: T[]): T[] {
  return newItems.filter(newItem => !oldItems.some(oldItem => oldItem.id === newItem.id));
}

interface UserProfile {
  full_name: string;
  avatar_url: string;
  bio: string;
  goals: string;
  therapy_summary: string;
  themes: string;
  banner_url?: string;
}

interface ListItem {
  id: string;
  value: string;
  timestamp: string;
  notes?: string;
}

interface Goal {
  id: string;
  title: string;
  description?: string;
  completed_at?: string | null;
  created_at: string;
  is_active: boolean;
  goal_type: 'basic' | 'counter' | 'progress' | 'list';
  current_value: number;
  target_value?: number | null;
  list_items?: ListItem[];
  archived_at?: string | null;
  archived_reason?: string | null;
}

export default function ProfileView({ sidebarCollapsed = false }: { sidebarCollapsed?: boolean }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const { conversationEnded, pollingStatus, setPollingStatus } = useConversationStatus();
  const { triggerGoalCompletion, triggerGoalUncompletion } = useGoalCompletion();
  const [initialBio, setInitialBio] = useState<string | null>(null);
  const [profilePicSrc, setProfilePicSrc] = useState<string | null>(null);
  const [bioExpanded, setBioExpanded] = useState(false);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalIds, setNewGoalIds] = useState<Set<string>>(new Set());
  const [newThemes, setNewThemes] = useState<Set<string>>(new Set());
  const [goalsViewMode, setGoalsViewMode] = useState<'list' | 'kanban'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('goalsViewMode');
      return (saved as 'list' | 'kanban') || 'kanban';
    }
    return 'kanban';
  });
  const [showProfilePicModal, setShowProfilePicModal] = useState(false);
  const [profilePicModalVisible, setProfilePicModalVisible] = useState(false);
  const [tempProfilePicUrl, setTempProfilePicUrl] = useState<string>("");
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [settingsTooltip, setSettingsTooltip] = useState<{
    isOpen: boolean;
    goal: Goal | null;
    position: { x: number; y: number };
  }>({ isOpen: false, goal: null, position: { x: 0, y: 0 } });
  const previousGoals = useRef<Goal[]>([]);
  const previousThemes = useRef<string[]>([]);
  const dummyRef = useRef<HTMLElement>(null!);

  useEffect(() => {
    // Load profile picture from localStorage first (TODO: move to database storage)
    const savedProfilePic = localStorage.getItem('profilePicUrl');
    if (savedProfilePic) {
      setProfilePicSrc(savedProfilePic);
    }

    // Listen for storage changes to sync profile pic updates
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'profilePicUrl') {
        setProfilePicSrc(e.newValue || '');
      }
    };

    window.addEventListener('storage', handleStorageChange);

    const fetchUser = async () => {
      setLoading(true);
      const result = await supabase.auth.getUser();
      const authUser = result.data?.user;
      if (!authUser) { setLoading(false); return; }

      setUserId(authUser.id);

      const { data, error } = await supabase
        .from('users')
        .select('full_name, avatar_url, bio, goals, therapy_summary, themes, banner_url')
        .eq('id', authUser.id)
        .single();

      if (!error && data) {
        setUser(data);
        setInitialBio(data.bio);
        // Only use database avatar if no localStorage version exists
        if (data.avatar_url && !savedProfilePic) setProfilePicSrc(data.avatar_url);
      } else {
        console.error("Error fetching user profile:", error?.message);
      }

      const goalsCacheKey = getProfileCacheKey('goals', authUser.id);
      const cachedGoals = getCachedData<Goal[]>(goalsCacheKey);
      
      const { data: goalsData, error: goalsError } = await supabase
        .from('goals')
        .select('id, title, description, completed_at, created_at, is_active, goal_type, current_value, target_value, list_items')
        .eq('user_id', authUser.id)
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (!goalsError && goalsData) {
        if (cachedGoals && cachedGoals.length > 0) {
          const newGoalsList = findNewItems(cachedGoals, goalsData);
          if (newGoalsList.length > 0) {
            console.log('🎯 New goals detected:', newGoalsList.length);
            const newIds = new Set(newGoalsList.map((g: Goal) => g.id));
            setNewGoalIds(newIds);
            setTimeout(() => setNewGoalIds(new Set()), 3000);
          }
        }
        setGoals(goalsData);
        previousGoals.current = goalsData;
        setCachedData(goalsCacheKey, goalsData);
      }

      if (data?.themes) {
        const themesCacheKey = getProfileCacheKey('themes', authUser.id);
        const cachedThemes = getCachedData<string>(themesCacheKey);
        const currentThemes = data.themes.split(',').map((t: string) => t.trim()).filter(Boolean);
        
        if (cachedThemes) {
          const oldThemes = cachedThemes.split(',').map((t: string) => t.trim()).filter(Boolean);
          const newThemesList = currentThemes.filter((theme: string) => !oldThemes.includes(theme));
          if (newThemesList.length > 0) {
            console.log('🏷️ New themes detected:', newThemesList);
            setNewThemes(new Set(newThemesList));
            setTimeout(() => setNewThemes(new Set()), 3000);
          }
        }
        previousThemes.current = currentThemes;
        setCachedData(themesCacheKey, data.themes);
      }

      setLoading(false);
    };
    fetchUser();

    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    if (!conversationEnded || pollingStatus.bioUpdated || !user || !initialBio) return;
    const pollInterval = setInterval(async () => {
      const result = await supabase.auth.getUser();
      const authUser = result.data?.user;
      if (!authUser) return;
      
      const [userResponse, goalsResponse] = await Promise.all([
        supabase.from('users').select('full_name, avatar_url, bio, goals, therapy_summary, themes, banner_url').eq('id', authUser.id).single(),
        supabase.from('goals').select('id, title, description, completed_at, created_at, is_active, goal_type, current_value, target_value, list_items').eq('user_id', authUser.id).eq('is_active', true).order('created_at', { ascending: true })
      ]);
      
      if (userResponse.error || !userResponse.data) return;
      const data = userResponse.data;
      
      if (data.bio !== initialBio) {
        console.log('📊 [ProfileView] Polling detected changes, updating profile and goals');
        setUser(data);
        setInitialBio(data.bio);
        if (data.avatar_url) setProfilePicSrc(data.avatar_url);
        
        if (!goalsResponse.error && goalsResponse.data) {
          const goalsCacheKey = getProfileCacheKey('goals', authUser.id);
          const cachedGoals = getCachedData<Goal[]>(goalsCacheKey);
          if (cachedGoals && cachedGoals.length > 0) {
            // Check for new goals
            const newGoalsList = findNewItems(cachedGoals, goalsResponse.data);
            if (newGoalsList.length > 0) {
              console.log('🎯 New goals detected during polling:', newGoalsList.length);
              const newIds = new Set(newGoalsList.map((g: Goal) => g.id));
              setNewGoalIds(newIds);
              setTimeout(() => setNewGoalIds(new Set()), 3000);
            }

            // Check for newly completed goals
            const newlyCompletedGoals = goalsResponse.data.filter((newGoal: Goal) => {
              const oldGoal = cachedGoals.find(g => g.id === newGoal.id);
              return oldGoal && !oldGoal.completed_at && newGoal.completed_at;
            });

            if (newlyCompletedGoals.length > 0) {
              console.log('🎉 Newly completed goals detected during polling:', newlyCompletedGoals.length);
              newlyCompletedGoals.forEach((goal: Goal) => {
                triggerGoalCompletion(goal.id, goal.title);
              });
            }
          }
          setGoals(goalsResponse.data);
          setCachedData(goalsCacheKey, goalsResponse.data);
        }
        
        if (data.themes && userId) {
          const themesCacheKey = getProfileCacheKey('themes', userId);
          const cachedThemes = getCachedData<string>(themesCacheKey);
          const currentThemes = data.themes.split(',').map((t: string) => t.trim()).filter(Boolean);
          if (cachedThemes) {
            const oldThemes = cachedThemes.split(',').map((t: string) => t.trim()).filter(Boolean);
            const newThemesList = currentThemes.filter((theme: string) => !oldThemes.includes(theme));
            if (newThemesList.length > 0) {
              console.log('🏷️ New themes detected during polling:', newThemesList);
              setNewThemes(new Set(newThemesList));
              setTimeout(() => setNewThemes(new Set()), 3000);
            }
          }
          setCachedData(themesCacheKey, data.themes);
        }
        
        setPollingStatus({ bioUpdated: true });
        clearInterval(pollInterval);
      }
    }, 3000);
    return () => clearInterval(pollInterval);
  }, [conversationEnded, pollingStatus.bioUpdated, user, initialBio, userId]);

  const getInitials = (name: string | null | undefined) => {
    if (!name) return '';
    const names = name.split(' ');
    return names.map((n: string) => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const toggleGoalCompletion = async (goalId: string) => {
    if (!userId) return;
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;
    const isCompleted = !!goal.completed_at;
    const now = new Date().toISOString();

    const { error } = await supabase.from('goals').update({ completed_at: isCompleted ? null : now }).eq('id', goalId).eq('user_id', userId);

    if (!error) {
      const updatedGoals = goals.map((g: Goal) => g.id === goalId ? { ...g, completed_at: isCompleted ? null : now } : g);
      setGoals(updatedGoals);
      if (userId) {
        const goalsCacheKey = getProfileCacheKey('goals', userId);
        setCachedData(goalsCacheKey, updatedGoals);
      }

      // Trigger client-side celebration if goal was just completed
      if (!isCompleted) {
        triggerGoalCompletion(goalId, goal.title);
      } else {
        // Handle goal un-completion (remove from client context)
        triggerGoalUncompletion(goalId);
      }
    }
  };

  const addGoal = async () => {
    if (!userId || !newGoalTitle.trim()) return;

    const { data, error } = await supabase.from('goals').insert({
      user_id: userId,
      title: newGoalTitle.trim(),
      is_active: true,
      goal_type: 'basic',
      current_value: 0
    }).select().single();

    if (!error && data) {
      const updatedGoals = [...goals, data];
      setGoals(updatedGoals);
      setNewGoalIds(new Set([data.id]));
      setTimeout(() => setNewGoalIds(new Set()), 3000);
      if (userId) {
        const goalsCacheKey = getProfileCacheKey('goals', userId);
        setCachedData(goalsCacheKey, updatedGoals);
      }
      setNewGoalTitle('');
      setShowAddGoal(false);
    }
  };

  const handleGoalsViewModeChange = (mode: 'list' | 'kanban') => {
    setGoalsViewMode(mode);
    localStorage.setItem('goalsViewMode', mode);
  };

  const updateGoalProgress = async (goalId: string, increment: number) => {
    if (!userId) return;

    try {
      const response = await fetch('/api/goals/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_progress',
          goalId,
          userId,
          increment
        })
      });

      if (response.ok) {
        const { goal } = await response.json();
        const updatedGoals = goals.map(g => g.id === goalId ? goal : g);
        setGoals(updatedGoals);
        if (userId) {
          const goalsCacheKey = getProfileCacheKey('goals', userId);
          setCachedData(goalsCacheKey, updatedGoals);
        }
      }
    } catch (error) {
      console.error('Error updating goal progress:', error);
    }
  };

  const archiveGoal = async (goalId: string, reason: string = 'completed') => {
    if (!userId) return;

    try {
      const response = await fetch('/api/goals/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'archive_goal',
          goalId,
          userId,
          reason
        })
      });

      if (response.ok) {
        const updatedGoals = goals.filter(g => g.id !== goalId);
        setGoals(updatedGoals);
        if (userId) {
          const goalsCacheKey = getProfileCacheKey('goals', userId);
          setCachedData(goalsCacheKey, updatedGoals);
        }
      }
    } catch (error) {
      console.error('Error archiving goal:', error);
    }
  };

  const cleanupCompletedGoals = async () => {
    if (!userId || isCleaningUp) return;

    setIsCleaningUp(true);
    try {
      console.log('🧹 Starting cleanup process...');
      const response = await fetch('/api/goals/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'cleanup_completed',
          userId
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('🧹 Cleanup result:', result);

        // Show user feedback
        if (result.archivedCount > 0) {
          // Optionally show a toast notification
          console.log(`✅ Archived ${result.archivedCount} completed goals`);
        } else {
          console.log('ℹ️ No completed goals to archive');
        }

        // Refresh goals list
        const { data: goalsData } = await supabase
          .from('goals')
          .select('id, title, description, completed_at, created_at, is_active, goal_type, current_value, target_value, list_items')
          .eq('user_id', userId)
          .eq('is_active', true)
          .order('created_at', { ascending: true });

        if (goalsData) {
          setGoals(goalsData);
          const goalsCacheKey = getProfileCacheKey('goals', userId);
          setCachedData(goalsCacheKey, goalsData);
        }
      } else {
        const errorText = await response.text();
        console.error('🧹 Cleanup failed:', response.status, errorText);
      }
    } catch (error) {
      console.error('🧹 Error cleaning up goals:', error);
    } finally {
      setIsCleaningUp(false);
    }
  };

  const deleteAllCompletedGoals = async () => {
    if (!userId || isCleaningUp) return;

    setIsCleaningUp(true);
    try {
      console.log('🗑️ Deleting all completed goals...');

      // Find all completed goals
      const completedGoals = goals.filter(goal => {
        if (goal.goal_type === 'basic') {
          return !!goal.completed_at;
        }
        if (goal.goal_type === 'progress' && goal.target_value) {
          return goal.current_value >= goal.target_value;
        }
        return false;
      });

      if (completedGoals.length === 0) {
        console.log('ℹ️ No completed goals to delete');
        return;
      }

      // Delete each completed goal
      for (const goal of completedGoals) {
        await fetch('/api/goals/manage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'archive_goal',
            goalId: goal.id,
            userId,
            reason: 'completed'
          })
        });
      }

      console.log(`✅ Deleted ${completedGoals.length} completed goals`);

      // Refresh goals list
      const { data: goalsData } = await supabase
        .from('goals')
        .select('id, title, description, completed_at, created_at, is_active, goal_type, current_value, target_value, list_items')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (goalsData) {
        setGoals(goalsData);
        const goalsCacheKey = getProfileCacheKey('goals', userId);
        setCachedData(goalsCacheKey, goalsData);
      }
    } catch (error) {
      console.error('🗑️ Error deleting completed goals:', error);
    } finally {
      setIsCleaningUp(false);
    }
  };

  const getProgressPercentage = (goal: Goal): number => {
    if (goal.goal_type === 'progress' && goal.target_value && goal.target_value > 0) {
      return Math.min(100, Math.round((goal.current_value / goal.target_value) * 100));
    }
    return 0;
  };

  const isGoalCompleted = (goal: Goal): boolean => {
    if (goal.goal_type === 'basic') {
      return !!goal.completed_at;
    }
    if (goal.goal_type === 'progress' && goal.target_value) {
      return goal.current_value >= goal.target_value;
    }
    return false;
  };

  const updateGoalType = async (goalId: string, updates: {
    goalType: 'basic' | 'counter' | 'progress' | 'list';
    currentValue?: number;
    targetValue?: number;
  }) => {
    if (!userId) return;

    try {
      const response = await fetch('/api/goals/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_goal_type',
          goalId,
          userId,
          goalType: updates.goalType,
          currentValue: updates.currentValue,
          targetValue: updates.targetValue
        })
      });

      if (response.ok) {
        const { goal } = await response.json();
        const updatedGoals = goals.map(g => g.id === goalId ? goal : g);
        setGoals(updatedGoals);
        if (userId) {
          const goalsCacheKey = getProfileCacheKey('goals', userId);
          setCachedData(goalsCacheKey, updatedGoals);
        }
      }
    } catch (error) {
      console.error('Error updating goal type:', error);
    }
  };

  const addListItem = async (goalId: string, value: string, notes?: string) => {
    if (!userId) return;

    try {
      const response = await fetch('/api/goals/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_list_item',
          goalId,
          userId,
          value,
          notes
        })
      });

      if (response.ok) {
        const { goal } = await response.json();
        const updatedGoals = goals.map(g => g.id === goalId ? goal : g);
        setGoals(updatedGoals);
        if (userId) {
          const goalsCacheKey = getProfileCacheKey('goals', userId);
          setCachedData(goalsCacheKey, updatedGoals);
        }
      }
    } catch (error) {
      console.error('Error adding list item:', error);
    }
  };

  const removeListItem = async (goalId: string, itemId: string) => {
    if (!userId) return;

    try {
      const response = await fetch('/api/goals/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'remove_list_item',
          goalId,
          userId,
          itemId
        })
      });

      if (response.ok) {
        const { goal } = await response.json();
        const updatedGoals = goals.map(g => g.id === goalId ? goal : g);
        setGoals(updatedGoals);
        if (userId) {
          const goalsCacheKey = getProfileCacheKey('goals', userId);
          setCachedData(goalsCacheKey, updatedGoals);
        }
      }
    } catch (error) {
      console.error('Error removing list item:', error);
    }
  };

  const handleShowSettings = (goal: Goal, triggerElement: HTMLElement) => {
    const rect = triggerElement.getBoundingClientRect();
    setSettingsTooltip({
      isOpen: true,
      goal,
      position: {
        x: rect.right + 8, // Position to the right of the button with 8px gap
        y: rect.top
      }
    });
  };

  const handleCloseSettings = () => {
    setSettingsTooltip({ isOpen: false, goal: null, position: { x: 0, y: 0 } });
  };

  const updateProfilePicture = (url: string) => {
    setProfilePicSrc(url);
    // TODO: Save to database instead of localStorage
    localStorage.setItem('profilePicUrl', url);
    // Dispatch storage event to sync with sidebar
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'profilePicUrl',
      newValue: url,
      url: window.location.href
    }));
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-white text-slate-700 p-4 md:p-6">
        <LoadingDots />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-white text-slate-700 p-4 md:p-6">
        <AlertTriangle size={48} className="text-red-500 mb-4" />
        <h2 className="text-xl md:text-2xl font-semibold mb-2">Profile Not Found</h2>
        <p className="text-center max-w-md text-sm md:text-base">We couldn't find your profile data. Please check your connection or try again later.</p>
      </div>
    );
  }

  const themeTags = (user.themes || "").split(',').map((t: string) => t.trim()).map((t: string) => t.indexOf(':') > 0 ? t.substring(0, t.indexOf(':')).trim() : t).filter(Boolean);
  const avatarInitial = getInitials(user.full_name);
  const bioSentences = (user.bio || "").split(/(?<=[.!?])\s+/).filter(Boolean);
  const displayBio = bioExpanded || bioSentences.length <= 1 ? user.bio : bioSentences[0] + (bioSentences.length > 1 ? '...' : '');

  return (
    <>
      <style jsx>{`
        @keyframes fadeSlideIn {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        .animate-fadeSlideIn {
          animation: fadeSlideIn 0.5s ease-out;
        }
      `}</style>
    <div className="min-h-screen bg-white">
      <div className={`max-w-4xl ${sidebarCollapsed ? 'mx-auto' : 'ml-8 lg:ml-16'} px-4 md:px-6 py-6 md:py-12 md:pl-12`}>
        <div className="flex items-start gap-3 md:gap-4 mb-6 md:mb-8 relative">
          <div
            className="cursor-pointer rounded-full transition-all duration-200 relative"
            onClick={() => {
              setTempProfilePicUrl(profilePicSrc || "");
              setShowProfilePicModal(true);
              requestAnimationFrame(() => setProfilePicModalVisible(true));
            }}
          >
            {profilePicSrc ? (
              <img src={profilePicSrc} alt={user.full_name || 'User'} className="w-12 md:w-16 h-12 md:h-16 rounded-full object-cover" />
            ) : (
              <div className="w-12 md:w-16 h-12 md:h-16 rounded-full bg-gray-100 flex items-center justify-center">
                <span className="text-lg md:text-xl font-medium text-gray-600">{avatarInitial}</span>
              </div>
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-lg md:text-xl font-bold text-gray-900 mb-1">{user.full_name}</h1>
            {user.bio && (
              <div className="text-gray-600 text-xs md:text-sm leading-relaxed">
                <span>{displayBio}</span>
                {bioSentences.length > 1 && (
                  <button onClick={() => setBioExpanded(!bioExpanded)} className="text-blue-600 hover:text-blue-700 ml-1 text-[10px] md:text-xs font-medium transition-colors">
                    {bioExpanded ? 'Show less' : 'Read more'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-16">
          <section>
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <h2 className="text-base md:text-lg font-semibold text-gray-900">Goals</h2>
              <div className="flex items-center gap-2">
                <CleanupDropdown
                  onCleanupCompleted={cleanupCompletedGoals}
                  onDeleteAllCompleted={deleteAllCompletedGoals}
                  isLoading={isCleaningUp}
                />
                <div className="flex items-center bg-gray-50/60 rounded-2xl p-1">
                  <button
                  onClick={() => handleGoalsViewModeChange('list')}
                  className={`px-3 py-2 rounded-xl transition-all duration-300 ${
                    goalsViewMode === 'list'
                      ? 'bg-white shadow-sm text-gray-500'
                      : 'text-gray-350 hover:text-gray-450 hover:bg-white/40'
                  }`}
                  title="List view"
                >
                  <List className="w-4.5 h-4.5" strokeWidth={1.4} />
                </button>
                <button
                  onClick={() => handleGoalsViewModeChange('kanban')}
                  className={`px-3 py-2 rounded-xl transition-all duration-300 ${
                    goalsViewMode === 'kanban'
                      ? 'bg-white shadow-sm text-gray-500'
                      : 'text-gray-350 hover:text-gray-450 hover:bg-white/40'
                  }`}
                  title="Grid view"
                >
                  <LayoutGrid className="w-4.5 h-4.5" strokeWidth={1.4} />
                </button>
                </div>
              </div>
            </div>
            {goals.length > 0 ? (
              goalsViewMode === 'list' ? (
                <div className="space-y-2">
                  {goals.map((goal) => (
                    <GoalItem
                      key={goal.id}
                      goal={goal}
                      isNew={newGoalIds.has(goal.id)}
                      onToggleComplete={toggleGoalCompletion}
                      onUpdateProgress={updateGoalProgress}
                      onArchive={archiveGoal}
                      onUpdateGoalType={updateGoalType}
                      onAddListItem={addListItem}
                      onRemoveListItem={removeListItem}
                      onShowSettings={handleShowSettings}
                      viewMode="list"
                    />
                  ))}
                  {showAddGoal ? (
                    <div className="flex items-center gap-2 mt-2">
                      <input type="text" value={newGoalTitle} onChange={(e) => setNewGoalTitle(e.target.value)} placeholder="Enter goal title..." className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" autoFocus onKeyPress={(e) => e.key === 'Enter' && addGoal()} />
                      <button onClick={addGoal} className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">Add</button>
                      <button onClick={() => { setShowAddGoal(false); setNewGoalTitle(''); }} className="px-3 py-2 text-gray-600 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => setShowAddGoal(true)} className="flex items-center gap-2 text-gray-400 hover:text-gray-600 transition-colors mt-2">
                      <Plus className="w-4 h-4" />
                      <span className="text-xs">Add a goal</span>
                    </button>
                  )}
                </div>
              ) : (
                <div>
                  {/* Grid/Tile View */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {goals.map((goal) => (
                      <GoalItem
                        key={goal.id}
                        goal={goal}
                        isNew={newGoalIds.has(goal.id)}
                        onToggleComplete={toggleGoalCompletion}
                        onUpdateProgress={updateGoalProgress}
                        onArchive={archiveGoal}
                        onUpdateGoalType={updateGoalType}
                        onAddListItem={addListItem}
                        onRemoveListItem={removeListItem}
                        onShowSettings={handleShowSettings}
                        viewMode="kanban"
                      />
                    ))}

                    {/* Add New Goal Card */}
                    {showAddGoal ? (
                      <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                        <div className="space-y-3">
                          <input
                            type="text"
                            value={newGoalTitle}
                            onChange={(e) => setNewGoalTitle(e.target.value)}
                            placeholder="Enter goal title..."
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                            autoFocus
                            onKeyPress={(e) => e.key === 'Enter' && addGoal()}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={addGoal}
                              className="flex-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              Add
                            </button>
                            <button
                              onClick={() => { setShowAddGoal(false); setNewGoalTitle(''); }}
                              className="flex-1 px-3 py-1.5 text-gray-600 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors bg-white"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowAddGoal(true)}
                        className="p-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-400 hover:text-gray-600 hover:border-gray-400 transition-all duration-200 flex items-center justify-center min-h-[100px]"
                      >
                        <div className="text-center">
                          <Plus className="w-5 h-5 mx-auto mb-1" />
                          <span className="text-sm">Add a goal</span>
                        </div>
                      </button>
                    )}
                  </div>
                </div>
              )
            ) : (
              <div className="py-6">
                {goalsViewMode === 'list' ? (
                  showAddGoal ? (
                    <div className="flex items-center gap-2">
                      <input type="text" value={newGoalTitle} onChange={(e) => setNewGoalTitle(e.target.value)} placeholder="Enter goal title..." className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" autoFocus onKeyPress={(e) => e.key === 'Enter' && addGoal()} />
                      <button onClick={addGoal} className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">Add</button>
                      <button onClick={() => { setShowAddGoal(false); setNewGoalTitle(''); }} className="px-3 py-2 text-gray-600 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => setShowAddGoal(true)} className="flex items-center gap-2 text-gray-400 hover:text-gray-600 transition-colors">
                      <Plus className="w-4 h-4" />
                      <span className="text-xs">Add a goal</span>
                    </button>
                  )
                ) : (
                  /* Grid view empty state */
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {showAddGoal ? (
                      <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                        <div className="space-y-3">
                          <input
                            type="text"
                            value={newGoalTitle}
                            onChange={(e) => setNewGoalTitle(e.target.value)}
                            placeholder="Enter goal title..."
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                            autoFocus
                            onKeyPress={(e) => e.key === 'Enter' && addGoal()}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={addGoal}
                              className="flex-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              Add
                            </button>
                            <button
                              onClick={() => { setShowAddGoal(false); setNewGoalTitle(''); }}
                              className="flex-1 px-3 py-1.5 text-gray-600 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors bg-white"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowAddGoal(true)}
                        className="p-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-400 hover:text-gray-600 hover:border-gray-400 transition-all duration-200 flex items-center justify-center min-h-[100px]"
                      >
                        <div className="text-center">
                          <Plus className="w-5 h-5 mx-auto mb-1" />
                          <span className="text-sm">Add your first goal</span>
                        </div>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </section>

          <section>
            <div className="flex items-center gap-2 mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Emerging Themes</h2>
            </div>
            {themeTags.length > 0 ? (
              <div className="space-y-2">
                {themeTags.map((theme, i) => (
                  <div key={i} className={`flex items-center gap-3 group transition-all duration-500 hover:bg-gray-50 rounded-lg p-1 ${newThemes.has(theme) ? 'animate-fadeSlideIn' : ''}`}>
                    <ChevronRight className="w-4 h-4 text-gray-400 transition-colors" />
                    <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
                      {theme}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6">
                <p className="text-gray-400 text-xs">No themes yet</p>
              </div>
            )}
          </section>

          <div className="h-96"></div>
          
          <section className="border-t pt-8">
            <h3 className="text-base font-medium text-gray-500 mb-4">Progress</h3>
            <div className="grid grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-semibold text-gray-900">{goals.length}</div>
                <div className="text-xs text-gray-500 mt-1">Active Goals</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-semibold text-gray-900">{themeTags.length}</div>
                <div className="text-xs text-gray-500 mt-1">Themes</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-semibold text-gray-900">0</div>
                <div className="text-xs text-gray-500 mt-1">Completed</div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Profile Picture Tooltip */}
      {showProfilePicModal && (
        <>
          <div
            className={`fixed inset-0 z-40 transition-opacity duration-200 ${
              profilePicModalVisible ? 'opacity-100' : 'opacity-0'
            }`}
            onClick={() => {
              setProfilePicModalVisible(false);
              setTimeout(() => setShowProfilePicModal(false), 200);
            }}
          />
          <div className={`absolute left-0 top-20 bg-white rounded-lg shadow-xl border border-gray-200 p-4 w-80 z-50 transition-all duration-200 ${
            profilePicModalVisible
              ? 'opacity-100 scale-100 translate-y-0'
              : 'opacity-0 scale-95 translate-y-2'
          }`}
          >
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Update Profile Picture</h3>
            <div className="space-y-3">
              <input
                type="url"
                value={tempProfilePicUrl}
                onChange={(e) => setTempProfilePicUrl(e.target.value)}
                placeholder="https://example.com/your-photo.jpg"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                autoFocus
              />
              {tempProfilePicUrl && (
                <div className="flex justify-center">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                    <img
                      src={tempProfilePicUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={() => setTempProfilePicUrl("")}
                    />
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setTempProfilePicUrl("");
                    setProfilePicModalVisible(false);
                    setTimeout(() => setShowProfilePicModal(false), 200);
                  }}
                  className="flex-1 px-3 py-1.5 text-xs text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    updateProfilePicture(tempProfilePicUrl);
                    setProfilePicModalVisible(false);
                    setTimeout(() => setShowProfilePicModal(false), 200);
                  }}
                  className="flex-1 px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Global Settings Tooltip */}
      {settingsTooltip.isOpen && settingsTooltip.goal && (
        <div
          className="fixed z-50"
          style={{
            left: `${settingsTooltip.position.x}px`,
            top: `${settingsTooltip.position.y}px`
          }}
        >
          <GoalSettingsTooltip
            goal={settingsTooltip.goal}
            isOpen={settingsTooltip.isOpen}
            onClose={handleCloseSettings}
            onSave={updateGoalType}
            onArchive={archiveGoal}
            triggerRef={dummyRef}
          />
        </div>
      )}
    </div>
    </>
  );
}
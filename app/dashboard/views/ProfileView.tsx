'use client';

import { AlertTriangle, ChevronRight, Plus, Circle, CheckCircle2 } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/supabase/client';
import { useConversationStatus } from '@/app/contexts/ConversationContext';
import LoadingDots from '@/components/LoadingDots';

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

interface Goal {
  id: string;
  title: string;
  description?: string;
  completed_at?: string | null;
  created_at: string;
  is_active: boolean;
}

export default function ProfileView({ sidebarCollapsed = false }: { sidebarCollapsed?: boolean }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const { conversationEnded, pollingStatus, setPollingStatus } = useConversationStatus();
  const [initialBio, setInitialBio] = useState<string | null>(null);
  const [profilePicSrc, setProfilePicSrc] = useState<string | null>(null);
  const [bioExpanded, setBioExpanded] = useState(false);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalIds, setNewGoalIds] = useState<Set<string>>(new Set());
  const [newThemes, setNewThemes] = useState<Set<string>>(new Set());
  const previousGoals = useRef<Goal[]>([]);
  const previousThemes = useRef<string[]>([]);

  useEffect(() => {
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
        if (data.avatar_url) setProfilePicSrc(data.avatar_url);
      } else {
        console.error("Error fetching user profile:", error?.message);
      }

      const goalsCacheKey = getProfileCacheKey('goals', authUser.id);
      const cachedGoals = getCachedData<Goal[]>(goalsCacheKey);
      
      const { data: goalsData, error: goalsError } = await supabase
        .from('goals')
        .select('id, title, description, completed_at, created_at, is_active')
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
  }, []);

  useEffect(() => {
    if (!conversationEnded || pollingStatus.bioUpdated || !user || !initialBio) return;
    const pollInterval = setInterval(async () => {
      const result = await supabase.auth.getUser();
      const authUser = result.data?.user;
      if (!authUser) return;
      
      const [userResponse, goalsResponse] = await Promise.all([
        supabase.from('users').select('full_name, avatar_url, bio, goals, therapy_summary, themes, banner_url').eq('id', authUser.id).single(),
        supabase.from('goals').select('id, title, description, completed_at, created_at, is_active').eq('user_id', authUser.id).eq('is_active', true).order('created_at', { ascending: true })
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
            const newGoalsList = findNewItems(cachedGoals, goalsResponse.data);
            if (newGoalsList.length > 0) {
              console.log('🎯 New goals detected during polling:', newGoalsList.length);
              const newIds = new Set(newGoalsList.map((g: Goal) => g.id));
              setNewGoalIds(newIds);
              setTimeout(() => setNewGoalIds(new Set()), 3000);
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
    }
  };

  const addGoal = async () => {
    if (!userId || !newGoalTitle.trim()) return;

    const { data, error } = await supabase.from('goals').insert({ user_id: userId, title: newGoalTitle.trim(), is_active: true }).select().single();

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
        <div className="flex items-start gap-3 md:gap-4 mb-6 md:mb-8">
          {profilePicSrc ? (
            <img src={profilePicSrc} alt={user.full_name || 'User'} className="w-12 md:w-16 h-12 md:h-16 rounded-full object-cover" />
          ) : (
            <div className="w-12 md:w-16 h-12 md:h-16 rounded-full bg-gray-100 flex items-center justify-center">
              <span className="text-lg md:text-xl font-medium text-gray-600">{avatarInitial}</span>
            </div>
          )}
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
            <div className="flex items-center gap-2 mb-4 md:mb-6">
              <h2 className="text-base md:text-lg font-semibold text-gray-900">Goals</h2>
            </div>
            {goals.length > 0 ? (
              <div className="space-y-2">
                {goals.map((goal) => (
                  <div key={goal.id} className={`flex items-start gap-2 md:gap-3 group cursor-pointer transition-all duration-500 hover:bg-gray-50 rounded-lg p-1 ${newGoalIds.has(goal.id) ? 'animate-fadeSlideIn' : ''}`} onClick={() => toggleGoalCompletion(goal.id)}>
                    <div className="mt-1">
                      {goal.completed_at ? (
                        <CheckCircle2 className="w-3.5 md:w-4 h-3.5 md:h-4 text-green-500 group-hover:text-green-600 transition-colors" />
                      ) : (
                        <Circle className="w-3.5 md:w-4 h-3.5 md:h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
                      )}
                    </div>
                    <span className={`text-xs md:text-sm leading-relaxed flex-1 transition-all ${goal.completed_at ? 'text-gray-400 line-through' : 'text-gray-700 group-hover:text-gray-900'}`}>
                      {goal.title}
                    </span>
                  </div>
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
              <div className="py-6">
                {showAddGoal ? (
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
    </div>
    </>
  );
}
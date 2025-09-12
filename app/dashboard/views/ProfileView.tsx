'use client';

import {
  AlertTriangle,
  ChevronRight,
  Plus,
  Circle,
  CheckCircle2
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { supabase } from '@/supabase/client';
import { useConversationStatus } from '@/app/contexts/ConversationContext';
import LoadingDots from '@/components/LoadingDots';

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

export default function UserFacingProfile() {
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

      // Fetch goals from the goals table
      const { data: goalsData, error: goalsError } = await supabase
        .from('goals')
        .select('id, title, description, completed_at, created_at, is_active')
        .eq('user_id', authUser.id)
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (!goalsError && goalsData) {
        setGoals(goalsData);
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
      const { data, error } = await supabase
        .from('users')
        .select('full_name, avatar_url, bio, goals, therapy_summary, themes, banner_url')
        .eq('id', authUser.id)
        .single();
      if (error || !data) return;
      if (data.bio !== initialBio) {
        setUser(data);
        setInitialBio(data.bio);
        if (data.avatar_url) setProfilePicSrc(data.avatar_url);
        setPollingStatus({ bioUpdated: true });
        clearInterval(pollInterval);
      }
    }, 3000);
    return () => clearInterval(pollInterval);
  }, [conversationEnded, pollingStatus.bioUpdated, user, initialBio]);

  const getInitials = (name: string | null | undefined) => {
    if (!name) return '';
    const names = name.split(' ');
    return names.map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const toggleGoalCompletion = async (goalId: string) => {
    if (!userId) return;

    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;

    const isCompleted = !!goal.completed_at;
    const now = new Date().toISOString();

    const { error } = await supabase
      .from('goals')
      .update({
        completed_at: isCompleted ? null : now
      })
      .eq('id', goalId)
      .eq('user_id', userId);

    if (!error) {
      setGoals(goals.map(g => 
        g.id === goalId 
          ? { ...g, completed_at: isCompleted ? null : now }
          : g
      ));
    }
  };

  const addGoal = async () => {
    if (!userId || !newGoalTitle.trim()) return;

    const { data, error } = await supabase
      .from('goals')
      .insert({
        user_id: userId,
        title: newGoalTitle.trim(),
        is_active: true
      })
      .select()
      .single();

    if (!error && data) {
      setGoals([...goals, data]);
      setNewGoalTitle('');
      setShowAddGoal(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-white text-slate-700 p-6">
        <LoadingDots text="Loading profile" className="text-lg" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-white text-slate-700 p-6">
        <AlertTriangle size={48} className="text-red-500 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Profile Not Found</h2>
        <p className="text-center max-w-md">We couldn't find your profile data. Please check your connection or try again later.</p>
      </div>
    );
  }

  // Remove old goal parsing since we now use the goals state
  // Fixed theme parsing to handle hyphens within words like "well-being"
  const themeTags = (user.themes || "").split(',').map(t => t.trim()).map(t => t.indexOf(':') > 0 ? t.substring(0, t.indexOf(':')).trim() : t).filter(Boolean);
  const avatarInitial = getInitials(user.full_name);
  
  // Parse bio into sentences and handle read more
  const bioSentences = (user.bio || "").split(/(?<=[.!?])\s+/).filter(Boolean);
  const displayBio = bioExpanded || bioSentences.length <= 1 
    ? user.bio 
    : bioSentences[0] + (bioSentences.length > 1 ? '...' : '');

  return (
    <div className="min-h-screen bg-white">
      {/* Notion-style page container */}
      <div className="max-w-4xl mx-auto px-6 py-12 pl-12">
        
        {/* Page header with avatar */}
        <div className="flex items-start gap-4 mb-8">
          {profilePicSrc ? (
            <img 
              src={profilePicSrc} 
              alt={user.full_name || 'User'}
              className="w-16 h-16 rounded-full object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
              <span className="text-xl font-medium text-gray-600">{avatarInitial}</span>
            </div>
          )}
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900 mb-1">{user.full_name}</h1>
            {user.bio && (
              <div className="text-gray-600 text-sm leading-relaxed">
                <span>{displayBio}</span>
                {bioSentences.length > 1 && (
                  <button
                    onClick={() => setBioExpanded(!bioExpanded)}
                    className="text-blue-600 hover:text-blue-700 ml-1 text-xs font-medium transition-colors"
                  >
                    {bioExpanded ? 'Show less' : 'Read more'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Content sections */}
        <div className="space-y-16">
          
          {/* Goals Section - Notion style */}
          <section>
            <div className="flex items-center gap-2 mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Goals</h2>
            </div>
            {goals.length > 0 ? (
              <div className="space-y-2">
                {goals.map((goal) => (
                  <div 
                    key={goal.id} 
                    className="flex items-start gap-3 group cursor-pointer"
                    onClick={() => toggleGoalCompletion(goal.id)}
                  >
                    <div className="mt-1">
                      {goal.completed_at ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500 group-hover:text-green-600 transition-colors" />
                      ) : (
                        <Circle className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
                      )}
                    </div>
                    <span className={`text-sm leading-relaxed flex-1 transition-all ${
                      goal.completed_at 
                        ? 'text-gray-400 line-through' 
                        : 'text-gray-700 group-hover:text-gray-900'
                    }`}>
                      {goal.title}
                    </span>
                  </div>
                ))}
                {showAddGoal ? (
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="text"
                      value={newGoalTitle}
                      onChange={(e) => setNewGoalTitle(e.target.value)}
                      placeholder="Enter goal title..."
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      autoFocus
                      onKeyPress={(e) => e.key === 'Enter' && addGoal()}
                    />
                    <button
                      onClick={addGoal}
                      className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => {
                        setShowAddGoal(false);
                        setNewGoalTitle('');
                      }}
                      className="px-3 py-2 text-gray-600 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => setShowAddGoal(true)}
                    className="flex items-center gap-2 text-gray-400 hover:text-gray-600 transition-colors mt-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="text-xs">Add a goal</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="py-6">
                {showAddGoal ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newGoalTitle}
                      onChange={(e) => setNewGoalTitle(e.target.value)}
                      placeholder="Enter goal title..."
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      autoFocus
                      onKeyPress={(e) => e.key === 'Enter' && addGoal()}
                    />
                    <button
                      onClick={addGoal}
                      className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => {
                        setShowAddGoal(false);
                        setNewGoalTitle('');
                      }}
                      className="px-3 py-2 text-gray-600 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => setShowAddGoal(true)}
                    className="flex items-center gap-2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="text-xs">Add a goal</span>
                  </button>
                )}
              </div>
            )}
          </section>

          {/* Themes Section - Notion style */}
          <section>
            <div className="flex items-center gap-2 mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Emerging Themes</h2>
            </div>
            {themeTags.length > 0 ? (
              <div className="space-y-2">
                {themeTags.map((theme, i) => (
                  <div key={i} className="flex items-center gap-3 group">
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-700 text-sm group-hover:text-gray-900 transition-colors">
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

          {/* Spacer to push progress section down */}
          <div className="h-96"></div>
          
          {/* Progress section - pushed down off initial viewport */}
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
  );
}
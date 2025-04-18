'use client';

import { BookOpen, Lightbulb, Target } from 'lucide-react';
import { useEffect, useState } from 'react';

import { supabase } from '@/supabase/client';

interface UserProfile {
  full_name: string;
  avatar_url: string;
  bio: string;
  goals: string;
  therapy_summary: string;
  themes: string;
}

export default function UserFacingProfile() {
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data, error } = await supabase
        .from('users')
        .select('full_name, avatar_url, bio, goals, therapy_summary, themes')
        .eq('id', authUser.id)
        .single();

      if (!error) setUser(data);
    };
    fetchUser();
  }, []);

  if (!user) return <div className="p-6 text-gray-500">Loading...</div>;


  // Process goal list, truncating at the first colon
  const goalList = user.goals.split('\n')
    .filter(Boolean)
    .map(goal => {
      const colonIndex = goal.indexOf(':');
      return colonIndex > 0 ? goal.substring(0, colonIndex).trim() : goal.trim();
    });

  // Parse theme tags with support for hyphen-separated list
  // Also removes hyphens and truncates at colons
  const themeTags = (user.themes.includes(',') 
    ? user.themes.split(',')
    : user.themes.split('-'))
    .map(tag => {
      // Remove any leading/trailing hyphens and whitespace
      let cleanTag = tag.trim().replace(/^-+|-+$/g, '');
      // Truncate at colon if present
      const colonIndex = cleanTag.indexOf(':');
      return colonIndex > 0 ? cleanTag.substring(0, colonIndex).trim() : cleanTag;
    })
    .filter(Boolean); // Remove any empty strings

  return (
    <div className="max-w-4xl mx-auto p-2 space-y-6 font-sans bg-gray-50">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-5">
        <div className="avatar-gradient w-24 h-24 rounded-full flex-shrink-0" 
             style={{
               background: 'linear-gradient(135deg, #f7d08a 0%, #e3a059 100%)',
               display: 'flex',
               alignItems: 'center',
               justifyContent: 'center',
               boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
             }}>
          {/* Simple avatar character if needed */}
          <span className="text-white text-xl font-bold">
            {/* {user.full_name.charAt(0)} */}
          </span>
        </div>
        <div className="flex-1">
          <p className="text-base text-gray-700 mb-2">{user.bio}</p>
          <h2 className="text-lg font-medium text-gray-900">{user.full_name}</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="flex items-center gap-2 font-semibold text-lg text-gray-900 mb-4">
            <Target size={22} className="text-gray-700" />
            Current Goals
          </h3>
          <ul className="space-y-4 text-gray-700">
            {goalList.map((goal, i) => (
              <li key={i} className="flex items-baseline gap-3">
                <span className="text-gray-500 font-medium">{i + 1}</span>
                <span>{goal}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="flex items-center gap-2 font-semibold text-lg text-gray-900 mb-4">
            <Lightbulb size={22} className="text-gray-700" />
            Key Themes
          </h3>
          <div className="flex flex-wrap gap-2">
            {themeTags.map((theme, i) => (
              <span key={i} className="bg-gray-100 text-gray-700 px-4 py-2 text-sm rounded-full">
                {theme}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="flex items-center gap-2 font-semibold text-lg text-gray-900 mb-4">
          <BookOpen size={22} className="text-gray-700" />
          Therapy Summary
        </h3>
        <div className="space-y-4 text-gray-700">
          <p className="whitespace-pre-line">{user.therapy_summary}</p>
        </div>
      </div>
    </div>
  );
}
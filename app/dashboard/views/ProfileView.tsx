'use client';

import { BookOpen, ChevronDown, Lightbulb, Target } from 'lucide-react';
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
  const [bioExpanded, setBioExpanded] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const result = await supabase.auth.getUser();
      const authUser = result.data?.user;
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

  if (!user) return

  const goalList = user.goals.split('\n')
    .filter(Boolean)
    .map(goal => {
      const colonIndex = goal.indexOf(':');
      return colonIndex > 0 ? goal.substring(0, colonIndex).trim() : goal.trim();
    });

  const themeTags = (user.themes.includes(',') 
    ? user.themes.split(',')
    : user.themes.split('-'))
    .map(tag => {
      let cleanTag = tag.trim().replace(/^-+|-+$/g, '');
      const colonIndex = cleanTag.indexOf(':');
      return colonIndex > 0 ? cleanTag.substring(0, colonIndex).trim() : cleanTag;
    })
    .filter(Boolean);

  const bioSentences = user.bio.split(/(?<=[.!?])\s+/).filter(Boolean);
  const shortBio = bioSentences.slice(0, 1).join(' ');
  const remainingBio = bioSentences.slice(1).join(' ');

  return (
    <div className="max-w-4xl mx-auto p-2 space-y-6 font-sans bg-neutral-50">
      
      {/* Bio Card */}
      <div className=" border-neutral-100">
        <div className="flex items-start gap-6 px-6 pt-6">
          <div 
            className="w-24 h-24 rounded-full flex-shrink-0" 
            style={{
              background: 'linear-gradient(135deg, #f0c689 0%, #e4a951 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
            }}
          >
            <span className="text-white text-xl font-bold">
              {user?.full_name?.charAt(0) ?? ''}
            </span>
          </div>

          <div className="flex-1 p-6">
            <p className="text-neutral-700 mb-2">
              {shortBio}
              {bioExpanded && remainingBio && ' ' + remainingBio}
            </p>

            {remainingBio && (
              <div className="flex justify-end">
                <button 
                  onClick={() => setBioExpanded(!bioExpanded)} 
                  className="flex items-center gap-2 text-gray-600 text-sm font-medium mt-1 hover:text-gray-800 transition-colors"
                >
                  <span>{bioExpanded ? 'less' : '...'}</span>
                  {/* <ChevronDown 
                    size={16} 
                    className={`transition-transform duration-300 ${bioExpanded ? 'rotate-180' : ''}`} 
                  /> */}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Goals & Themes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
{/* Goals */}
<div className="p-5">
  <h3 className="flex items-center gap-3 font-semibold text-lg text-neutral-900 mb-5">
    <Target size={22} className="text-gray-600" />
    Current Goals
  </h3>
  <ul className="space-y-4">
    {goalList.map((goal, i) => (
      <li key={i} className="flex items-baseline gap-3">
        <span className="text-gray-500 font-medium text-sm w-4">{i + 1}</span>
        <span className="text-neutral-700">{goal}</span>
      </li>
    ))}
  </ul>
</div>


        {/* Themes */}
        <div className=" p-5 border-neutral-100">
          <h3 className="flex items-center gap-3 font-semibold text-lg text-neutral-900 mb-5">
            <Lightbulb size={22} className="text-gray-600" />
            Key Themes
          </h3>
          <div className="flex flex-wrap gap-2 overflow-y-auto max-h-75 pr-1">
            {themeTags.map((theme, i) => (
              <span 
                key={i} 
                className="bg-neutral-100 text-neutral-700 px-4 py-2 text-sm rounded-full hover:bg-gray-100 transition-colors"
              >
                {theme}
              </span>
            ))}
          </div>
        </div>

      </div>

      {/* Therapy Summary */}
      <div className="p-6">
        <h3 className="flex items-center gap-3 font-semibold text-lg text-neutral-900 mb-5">
          <BookOpen size={22} className="text-gray-600" />
          Therapy Summary
        </h3>
        <div className="space-y-4 text-neutral-700">
          <p className="whitespace-pre-line">{user.therapy_summary}</p>
        </div>
      </div>
    </div>
  );
}
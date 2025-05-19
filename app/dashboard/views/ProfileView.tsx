'use client';

import {
  AlertTriangle,
  Camera,
  ChevronDown,
  ChevronUp,
  Edit3,
  Image as ImageIcon,
  Lightbulb,
  Loader2,
  Palette,
  Star,
  Target,
  UploadCloud,
  UserCircle2
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { supabase } from '@/supabase/client';
import { useConversationStatus } from '@/app/contexts/ConversationContext';

interface UserProfile {
  full_name: string;
  avatar_url: string; // Will be used if available, otherwise initials
  bio: string;
  goals: string;
  therapy_summary: string; // Kept in interface, but not displayed
  themes: string;
  banner_url?: string; // New: For user's selected banner
}

// Dummy Banner Options (in a real app, these would come from a library or allow upload)
const bannerOptions = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', // Purple-Blue
  'linear-gradient(135deg, #f6d365 0%, #fda085 100%)', // Orange-Yellow
  'linear-gradient(135deg, #56ab2f 0%, #a8e063 100%)', // Green
  'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)', // Pink
  'bg-slate-200', // Simple Grey
];

export default function UserFacingProfile() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [bioExpanded, setBioExpanded] = useState(false);
  const { conversationEnded, pollingStatus, setPollingStatus } = useConversationStatus();
  const [initialBio, setInitialBio] =useState<string | null>(null);
  
  // UI State for customization placeholders
  const [selectedBanner, setSelectedBanner] = useState<string>(bannerOptions[0]); // Default banner
  const [profilePicSrc, setProfilePicSrc] = useState<string | null>(null); // For uploaded pic

  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true);
      const result = await supabase.auth.getUser();
      const authUser = result.data?.user;
      if (!authUser) { setLoading(false); return; }

      const { data, error } = await supabase
        .from('users')
        .select('full_name, avatar_url, bio, goals, therapy_summary, themes, banner_url') // Added banner_url
        .eq('id', authUser.id)
        .single();

      if (!error && data) {
        setUser(data);
        setInitialBio(data.bio);
        if (data.avatar_url) setProfilePicSrc(data.avatar_url);
        if (data.banner_url) setSelectedBanner(data.banner_url); // Use saved banner if available
      } else {
        console.error("Error fetching user profile:", error?.message);
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
      if (data.bio !== initialBio) { // Simplified polling for now
        setUser(data);
        setInitialBio(data.bio);
        if (data.avatar_url) setProfilePicSrc(data.avatar_url);
        if (data.banner_url) setSelectedBanner(data.banner_url);
        setPollingStatus({ bioUpdated: true });
        clearInterval(pollInterval);
      }
    }, 3000);
    return () => clearInterval(pollInterval);
  }, [conversationEnded, pollingStatus.bioUpdated, user, initialBio, setPollingStatus]);


  const getInitials = (name: string | null | undefined) => {
    if (!name) return '';
    const names = name.split(' ');
    return names.map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };
  
  const handleBannerChange = (newBanner: string) => {
    setSelectedBanner(newBanner);
    // In a real app: await supabase.from('users').update({ banner_url: newBanner }).eq('id', user.id);
    alert(`Banner changed to: ${newBanner.startsWith('linear-gradient') ? 'Gradient' : 'Color'}. This is a visual demo.`);
  };

  const handleProfilePicUpload = () => {
    // This would open a file dialog and handle upload
    alert("Profile picture upload functionality would be here. For demo, initials or a placeholder are used.");
    // Example: Simulate an upload
    // const newPic = "https://via.placeholder.com/150/007bff/FFFFFF?Text=NewPic";
    // setProfilePicSrc(newPic);
    // In a real app: upload to Supabase Storage, then update user.avatar_url
  };


  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-gray-50 text-slate-700 p-6">
        <Loader2 size={48} className="animate-spin text-blue-600 mb-4" />
        <p className="text-lg">Crafting your profile space...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-gray-50 text-slate-700 p-6">
        <AlertTriangle size={48} className="text-red-500 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Profile Not Found</h2>
        <p className="text-center max-w-md">We couldn't find your profile data. Please check your connection or try again later.</p>
      </div>
    );
  }

  const goalList = (user.goals || "").split('\n').filter(Boolean).map(g => g.indexOf(':') > 0 ? g.substring(0, g.indexOf(':')).trim() : g.trim());
  const themeTags = (user.themes || "").split(/[,-]+/).map(t => t.trim().replace(/^-+|-+$/g, '')).map(t => t.indexOf(':') > 0 ? t.substring(0, t.indexOf(':')).trim() : t).filter(Boolean);
  const bioSentences = (user.bio || "").split(/(?<=[.!?])\s+/).filter(Boolean);
  const bioIsShort = bioSentences.length <= 2;
  const displayBio = bioExpanded || bioIsShort ? user.bio : bioSentences.slice(0, 2).join(' ') + (bioSentences.length > 2 ? '...' : '');
  const avatarInitial = getInitials(user.full_name);

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* Banner Section */}
      <div 
        className="h-48 sm:h-48 w-full relative group transition-all duration-500 ease-in-out"
        style={{ background: selectedBanner.startsWith('linear-gradient') ? selectedBanner : undefined }}
        // For solid colors, Tailwind class is preferred if banner_url stores class names
        // className={`h-48 sm:h-64 w-full relative group ${!selectedBanner.startsWith('linear-gradient') ? selectedBanner : ''}`}
      >
        {/* Placeholder for actual image banner if banner_url points to an image */}
        {/* <img src={user.banner_url} alt="Profile banner" className="w-full h-full object-cover" /> */}
        
        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex gap-2">
            <button 
                onClick={() => {/* Open banner library modal */ alert("Banner library would open here.");}}
                className="p-2 bg-white/80 hover:bg-white rounded-full shadow-lg backdrop-blur-sm"
                title="Choose from library"
            >
                <Palette size={20} className="text-slate-700" />
            </button>
             <button 
                onClick={() => {/* Open banner upload */ alert("Banner upload would open here.");}}
                className="p-2 bg-white/80 hover:bg-white rounded-full shadow-lg backdrop-blur-sm"
                title="Upload banner"
            >
                <UploadCloud size={20} className="text-slate-700" />
            </button>
        </div>
        {/* Demo: Cycle through banner options (remove in real app) */}
        <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <select 
                onChange={(e) => handleBannerChange(e.target.value)} 
                value={selectedBanner}
                className="p-1.5 text-xs rounded-md shadow-lg bg-white/80 backdrop-blur-sm text-slate-700 focus:ring-2 focus:ring-blue-500"
            >
                {bannerOptions.map((banner, index) => (
                    <option key={index} value={banner}>
                        Banner {index + 1}
                    </option>
                ))}
            </select>
        </div>
      </div>

      {/* Profile Info Section */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="-mt-16 sm:-mt-20 flex flex-col items-center text-center">
          <div className="relative group/avatar">
            {profilePicSrc ? (
              <img 
                src={profilePicSrc} 
                alt={user.full_name || 'User'}
                className="w-32 h-32 sm:w-40 sm:h-40 rounded-full object-cover border-4 border-slate-100 shadow-xl"
              />
            ) : (
              <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center border-4 border-slate-100 shadow-xl">
                <span className="text-4xl sm:text-5xl font-semibold text-white">{avatarInitial}</span>
              </div>
            )}
            <button 
              onClick={handleProfilePicUpload}
              className="absolute bottom-1 right-1 p-2 bg-white hover:bg-slate-200 rounded-full shadow-md opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-300"
              title="Change profile picture"
            >
              <Camera size={18} className="text-slate-700" />
            </button>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 mt-5 mb-1">{user.full_name}</h1>
          
          <div className="max-w-xl mx-auto text-slate-600 text-sm sm:text-base leading-relaxed mb-4">
            <p className={`transition-all duration-300 ease-in-out`}>
              {displayBio || "Tell us a bit about yourself..."}
            </p>
            {(bioSentences.length > 2 && !bioIsShort || (user.bio && user.bio.length === 0)) && (
              <button
                onClick={() => setBioExpanded(!bioExpanded)}
                className="group/readmore inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 mt-2 transition-colors"
              >
                {bioExpanded ? 'Show less' : (user.bio && user.bio.length > 0 ? 'Read more' : 'Add bio')}
                {bioExpanded 
                  ? <ChevronUp size={16} className="transition-transform duration-200 group-hover/readmore:-translate-y-0.5" /> 
                  : <ChevronDown size={16} className="transition-transform duration-200 group-hover/readmore:translate-y-0.5" />
                }
              </button>
            )}
          </div>
        </div>

        {/* Content Sections: Goals & Themes */}
        <div className="mt-10 sm:mt-12 grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          {/* Goals Section */}
          <section className="bg-white p-6 rounded-xl shadow-lg hover:shadow-blue-500/10 transition-shadow duration-300">
            <h2 className="flex items-center gap-3 text-xl font-semibold text-slate-800 mb-5">
              <Target size={24} className="text-blue-600" />
              Your Goals
            </h2>
            {goalList.length > 0 ? (
              <ul className="space-y-3">
                {goalList.map((goal, i) => (
                  <li key={i} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-blue-50 transition-colors group/goalitem">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mt-0.5 ring-1 ring-blue-200">
                      <Star size={14} className="text-blue-600" />
                    </div>
                    <span className="text-slate-700 text-sm group-hover/goalitem:text-blue-700 transition-colors">{goal}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500 italic">Set some goals to light your path!</p>
            )}
          </section>

          {/* Themes Section */}
          <section className="bg-white p-6 rounded-xl shadow-lg hover:shadow-purple-500/10 transition-shadow duration-300">
            <h2 className="flex items-center gap-3 text-xl font-semibold text-slate-800 mb-5">
              <Lightbulb size={24} className="text-purple-600" />
              Emerging Themes
            </h2>
            {themeTags.length > 0 ? (
              <div className="flex flex-wrap gap-2.5">
                {themeTags.map((theme, i) => (
                  <span 
                    key={i} 
                    className="bg-purple-50 text-purple-700 px-3.5 py-1.5 text-xs font-medium rounded-full border border-purple-200 hover:bg-purple-100 hover:border-purple-300 transition-all cursor-default shadow-sm"
                  >
                    {theme}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 italic">Insights will crystallize here as you explore.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
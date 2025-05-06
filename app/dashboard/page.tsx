'use client';

import { CalendarCheck, Compass, Home, LineChart, User } from 'lucide-react';
import { useEffect, useState } from 'react';

import DiscoverView from './views/DiscoverView';
import HomeView from './views/HomeView';
import ProfileView from './views/ProfileView';
import ProgressView from './views/ProgressView';
import SessionsView from './views/SessionsView';
import { supabase } from '@/supabase/client';
import { useRouter } from 'next/navigation';
import { type ReactElement } from 'react';

export default function UserDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [activeView, setActiveView] = useState<'home' | 'discover' | 'bio' | 'sessions' | 'progress'>('home');

  useEffect(() => {
    const validateSession = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        await supabase.auth.signOut();
        router.push('/');
      } else {
        setUser(user);
      }
    };
    validateSession();
  }, [router]);
  

  const renderView = () => {
    switch (activeView) {
      case 'home':
        return <HomeView />;
      case 'discover':
          return <DiscoverView />;
      case 'bio':
        return <ProfileView/>;
      case 'sessions':
        return <SessionsView />;
      case 'progress':
          return <ProgressView />;
      default:
        return <div>Welcome</div>;
    }
  };

  const viewIcons: Record<string, ReactElement> = {
    home: <Home className="w-4 h-4" />,
    discover: <Compass className="w-4 h-4" />,
    bio: <User className="w-4 h-4" />,
    sessions: <CalendarCheck className="w-4 h-4" />,
    progress: <LineChart className="w-4 h-4" />,
  };

  return (
    <main className="h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-60 bg-neutral-50 flex flex-col ">
        <div className="pl-4 mt-6 mb-2">
          <h2 className="text-xl font-bold pl-4 pt-4 text-gray-800">kind</h2>
        </div>
        <nav className="space-y-1 p-5 flex-1">
        {['home', 'discover', 'bio', 'sessions', 'progress'].map(view => (
          <button
            key={view}
            onClick={() => setActiveView(view as any)}
            className={`w-full flex items-center gap-2 text-left py-2 px-3 rounded-lg transition-all duration-200 ${
              activeView === view ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            {viewIcons[view]}
            <span>{view.charAt(0).toUpperCase() + view.slice(1)}</span>
          </button>
        ))}
        </nav>
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center mb-3 px-1">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-medium mr-2">
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-medium text-gray-800 truncate">
                {user?.email || 'User'}
              </p>
              <p className="text-xs text-gray-500">{user?.subscription || 'Professional'}</p>
            </div>
          </div>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              router.push('/');
            }}
            className="w-full bg-white border border-gray-200 text-gray-700 py-2 px-3 rounded-lg hover:bg-gray-50 transition text-sm"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <section className="flex-1 p-8 overflow-y-auto relative">
  {['home', 'discover', 'bio', 'sessions', 'progress'].map((view) => (
    <div
      key={view}
      className={`absolute inset-0 transition-all duration-300 ease-in-out
        ${activeView === view ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none z-0'}
      `}
    >
      {view === 'home' && <HomeView />}
      {view === 'discover' && <DiscoverView />}
      {view === 'bio' && <ProfileView />}
      {view === 'sessions' && <SessionsView />}
      {view === 'progress' && <ProgressView />}
    </div>
  ))}
</section>  </main>
  );
}
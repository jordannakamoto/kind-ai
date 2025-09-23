'use client';

import { useEffect, useState } from 'react';

import AIChatView from './views/AIChatView'; // Import AIChatView
import AICourseBuilderView from './views/AICourseBuilderView'; // Import AI Course Builder
import LogsView from './views/LogsView';
import SessionView from './views/SessionView';
import SystemPromptsView from './views/SystemPromptsView'; // Import SystemPromptsView
import TherapyModulesView from './views/TherapyModulesView';
import UserProfileView from './views/UserProfileView';
import UsersView from './views/UsersView';
import { supabase } from '@/supabase/client';
import { useRouter } from 'next/navigation';

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [activeView, setActiveView] = useState<'users' | 'logs' | 'ai-chat' | 'ai-course-builder' | 'therapy-modules' | 'sessions' | 'system-prompts'>('users'); // Add AI Course Builder
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  useEffect(() => {
    const validateSession = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        console.warn("Invalid or expired session. Logging out...");
        await supabase.auth.signOut();
        router.push('/'); // Redirect to login/home
      } else {
        setUser(user);
      }
    };
    validateSession();
  }, [router]);

  const renderView = () => {
    if (selectedUserId) {
      return <UserProfileView userId={selectedUserId} onBack={() => setSelectedUserId(null)} />;
    }
    switch (activeView) {
      case 'users':
        return <UsersView onSelectUser={(id: string) => setSelectedUserId(id)} />;
      case 'logs':
        return <LogsView />;
      case 'sessions':
        return <SessionView />;
      case 'ai-chat': // Add AIChatView to the switch case
        return <AIChatView />;
      case 'ai-course-builder': // Add AI Course Builder to the switch case
        return <AICourseBuilderView />;
      case 'therapy-modules': // Add this case
        return <TherapyModulesView />;
      case 'system-prompts': // Add SystemPromptsView to the switch case
        return <SystemPromptsView />;
      default:
        return <div>Select a view from the sidebar</div>;
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-60 bg-white shadow-lg p-4 flex flex-col border-r border-gray-100">
        <div className="mb-5">
          <h2 className="text-xl font-bold text-gray-800">kind</h2>
        </div>
        
        <nav className="space-y-1 flex-1">
        <button
            onClick={() => {
              setActiveView('ai-chat');
              setSelectedUserId(null);
            }}
            className={`w-full text-left py-2 px-3 rounded-lg flex items-center space-x-2 transition-all duration-200 ${
              activeView === 'ai-chat' 
                ? 'bg-indigo-50 text-indigo-700 font-medium' 
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
{/* Beaker SVG icon */}
<svg 
        className="w-4 h-4" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
        />
      </svg>
            <span>ElevenLabs</span>
          </button>
          
          <button
            onClick={() => {
              setActiveView('users');
              setSelectedUserId(null);
            }}
            className={`w-full text-left py-2 px-3 rounded-lg flex items-center space-x-2 transition-all duration-200 ${
              activeView === 'users' && !selectedUserId 
                ? 'bg-indigo-50 text-indigo-700 font-medium' 
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <span>Users</span>
          </button>
          
          <button
            onClick={() => {
              setActiveView('ai-course-builder');
              setSelectedUserId(null);
            }}
            className={`w-full text-left py-2 px-3 rounded-lg flex items-center space-x-2 transition-all duration-200 ${
              activeView === 'ai-course-builder'
                ? 'bg-indigo-50 text-indigo-700 font-medium'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <span>AI Course Builder</span>
          </button>

          <button
            onClick={() => {
              setActiveView('therapy-modules');
              setSelectedUserId(null);
            }}
            className={`w-full text-left py-2 px-3 rounded-lg flex items-center space-x-2 transition-all duration-200 ${
              activeView === 'therapy-modules'
                ? 'bg-indigo-50 text-indigo-700 font-medium'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Therapy Modules</span>
          </button>
          
          <button
            onClick={() => {
              setActiveView('system-prompts');
              setSelectedUserId(null);
            }}
            className={`w-full text-left py-2 px-3 rounded-lg flex items-center space-x-2 transition-all duration-200 ${
              activeView === 'system-prompts' 
                ? 'bg-indigo-50 text-indigo-700 font-medium' 
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>System Prompts</span>
          </button>

          <button
            onClick={() => {
              setActiveView('sessions');
              setSelectedUserId(null);
            }}
            className={`w-full text-left py-2 px-3 rounded-lg flex items-center space-x-2 transition-all duration-200 ${
              activeView === 'sessions' 
                ? 'bg-indigo-50 text-indigo-700 font-medium' 
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span>Sessions</span>
          </button>
          
          <button
            onClick={() => {
              setActiveView('logs');
              setSelectedUserId(null);
            }}
            className={`w-full text-left py-2 px-3 rounded-lg flex items-center space-x-2 transition-all duration-200 ${
              activeView === 'logs' 
                ? 'bg-indigo-50 text-indigo-700 font-medium' 
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span>Logs</span>
          </button>
          
        </nav>
        
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center mb-3 px-1">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-medium mr-2">
              {user?.email?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-medium text-gray-800 truncate">
                {user?.email || 'Admin User'}
              </p>
              <p className="text-xs text-gray-500">Administrator</p>
            </div>
          </div>
          
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              router.push('/');
            }}
            className="w-full bg-white border border-gray-200 text-gray-700 py-2 px-3 rounded-lg hover:bg-gray-50 transition flex items-center justify-center space-x-2 text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <section className="flex-1 p-8 overflow-auto">
        <div className="">
          {renderView()}
        </div>
      </section>
    </main>
  );
}
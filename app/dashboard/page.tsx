"use client";

import {
  CalendarCheck,
  Compass,
  Home,
  LineChart,
  User,
  PanelLeft,
} from "lucide-react";
import { useEffect, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import DiscoverView from "./views/DiscoverView";
import HomeView from "./views/HomeView";
import ProfileView from "./views/ProfileView";
import ProgressView from "./views/ProgressView";
import type { ReactElement } from "react";
import SessionDetailView from "./views/SessionDetailView";
import SessionsView from "./views/SessionsView";
import { supabase } from "@/supabase/client";
import { ActiveSessionProvider, useActiveSession } from "@/app/contexts/ActiveSessionContext";
import MiniSessionPlayer from "./components/MiniSessionPlayer";

function DashboardInner() {
  const { isSessionActive } = useActiveSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<any>(null);
  const [activeView, setActiveView] = useState<
    "home" | "discover" | "bio" | "sessions" | "progress"
  >("home");
  const [visibleView, setVisibleView] = useState(activeView);
  const [viewVisible, setViewVisible] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isFromOnboarding, setIsFromOnboarding] = useState(false);
  const [shouldAnimate, setShouldAnimate] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  const sessionId = searchParams.get("sid");

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (
      tab === "home" ||
      tab === "discover" ||
      tab === "bio" ||
      tab === "sessions" ||
      tab === "progress"
    ) {
      setActiveView(tab);
    } else {
      setActiveView("home");
    }
  }, [searchParams]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTo({ top: 0, behavior: "auto" });
      }
    }, 30); // Delay must match your fade transition duration

    return () => clearTimeout(timeout);
  }, [activeView, sessionId]);

  useEffect(() => {
    setViewVisible(false);
    const frame = requestAnimationFrame(() => {
      setVisibleView(activeView);
      setViewVisible(true);
    });

    return () => cancelAnimationFrame(frame);
  }, [activeView]);

  useEffect(() => {
    const validateSession = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (error || !user) {
        await supabase.auth.signOut();
        router.push("/");
      } else {
        setUser(user);
      }
    };
    validateSession();
  }, [router]);

  // Handle onboarding flow
  useEffect(() => {
    const referrer = document.referrer;
    const fromOnboarding = referrer.includes('/onboarding') || 
                          window.location.search.includes('from=onboarding');
    
    if (fromOnboarding) {
      setIsFromOnboarding(true);
      
      // Start animation sequence after delay
      const timer = setTimeout(() => {
        setShouldAnimate(true);
        
        // Complete animation
        setTimeout(() => {
          setIsFromOnboarding(false);
        }, 300); // Match transition duration
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, []);

  const viewIcons: Record<string, ReactElement> = {
    home: <Home className="w-4 h-4" />,
    discover: <Compass className="w-4 h-4" />,
    bio: <User className="w-4 h-4" />,
    sessions: <CalendarCheck className="w-4 h-4" />,
    progress: <LineChart className="w-4 h-4" />,
  };

  const handleSidebarNav = (view: typeof activeView) => {
    setActiveView(view);
    if (view === "home") router.push("/dashboard");
    else router.push(`/dashboard?tab=${view}`);
  };

  return (
    <>
      <style jsx global>{`
        .hide-orb canvas {
          opacity: 0 !important;
          visibility: hidden;
          transition: none !important;
        }
        .show-orb-delayed canvas {
          opacity: 1;
          visibility: visible;
          transition: opacity 200ms ease-in-out 150ms !important;
        }
        .sidebar-hidden-for-onboarding {
          transform: translateX(-100%) !important;
          transition: none !important;
        }
      `}</style>
      <main className="h-full bg-gray-50 flex">
      {/* Sidebar */}
      <aside className={`fixed z-30 h-screen flex flex-col bg-neutral-50 border-r border-gray-100 w-60 ${
        isFromOnboarding && !shouldAnimate 
          ? "sidebar-hidden-for-onboarding"
          : shouldAnimate || !isFromOnboarding
            ? "transition-all duration-300 ease-in-out"
            : ""
      } ${
        isFromOnboarding && !shouldAnimate
          ? ""
          : sidebarOpen ? "translate-x-0" : "-translate-x-full"
      }`}>
          {/* Header */}
          <div className="group flex items-center justify-between p-4 pt-5">
            <button 
              onClick={() => window.location.reload()}
              className="text-xl font-bold text-gray-800 hover:text-gray-600 transition-colors cursor-pointer"
            >
              kind
            </button>
            {sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-200 opacity-0 group-hover:opacity-100"
                aria-label="Toggle sidebar"
              >
                <PanelLeft className="w-4 h-4" />
              </button>
            )}
          </div>
          
          {/* Sidebar content */}
            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto p-2">
              <div className="space-y-1">
                {["home", "discover", "bio", "sessions", "progress"].map(
                  (view) => (
                    <button
                      key={view}
                      onClick={() => handleSidebarNav(view as any)}
                      className={`w-full flex items-center gap-3 text-left py-2 px-2 rounded-lg transition-all duration-200 ${
                        activeView === view
                          ? "bg-indigo-50 text-indigo-700 font-medium"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <span className="flex-shrink-0">{viewIcons[view]}</span>
                      <span className="ml-2">
                        {view.charAt(0).toUpperCase() + view.slice(1)}
                      </span>
                    </button>
                  )
                )}
              </div>
            </nav>
            {/* Footer */}
            <div className="mt-auto border-t border-gray-100 p-2 transition-all duration-200">
              {/* User Profile */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-700 font-medium flex-shrink-0">
                  {user?.email?.charAt(0).toUpperCase() || "U"}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {user?.email || "User"}
                  </p>
                  <p className="text-xs text-gray-500">
                    3/3 sessions
                  </p>
                </div>
              </div>
              {/* Sign Out */}
              <div className="space-y-2">
                <button
                  onClick={async () => {
                    await supabase.auth.signOut();
                    router.push("/");
                  }}
                  className="w-full flex items-center gap-3 text-left py-2 px-3 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="flex-shrink-0"
                  >
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
                  <span className="text-sm">Sign Out</span>
                </button>
              </div>
            </div>
        </aside>
      
      {/* Floating toggle button when sidebar is closed */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className={`fixed top-5 left-4 z-30 p-2 rounded-lg bg-white border border-gray-200 text-gray-600 hover:text-gray-800 hover:bg-gray-50 transition-all ${
          sidebarOpen ? "opacity-0 pointer-events-none delay-0" : "opacity-100 delay-300"
        }`}
        style={{ transitionDuration: "200ms" }}
        aria-label="Toggle sidebar"
      >
        <PanelLeft className="w-4 h-4 rotate-180" />
      </button>
      
      {/* Main Content */}
      <section
        ref={scrollRef}
        className="flex-1 relative h-screen transition-all duration-300 ease-in-out"
        style={{ 
          paddingBottom: isSessionActive && activeView !== 'home' ? '60px' : '0'
        }}
      >
        {/* View Transitions */}
        {["home", "discover", "bio", "sessions", "progress"].map((view) => {
          const isVisible = view === visibleView && !sessionId;
          return (
            <div
              key={view}
              className={`absolute h-full bg-white inset-0 transition-opacity duration-300 ease-in-out ${
                isVisible && viewVisible
                  ? "opacity-100 z-10"
                  : "opacity-0 pointer-events-none z-0"
              } ${view === "home" ? (activeView !== "home" || !viewVisible ? "hide-orb" : "show-orb-delayed") : ""}`}
            >
               <div className="w-full h-full overflow-y-auto">
              {view === "home" && <HomeView />}
              {view === "discover" && <DiscoverView />}
              {view === "bio" && <ProfileView />}
              {view === "sessions" && !sessionId && <SessionsView />}
              {view === "progress" && <ProgressView />}
              </div>
            </div>
          );
        })}
        {/* Session detail overlay */}
        {activeView === "sessions" && sessionId && (
          <div className="absolute inset-0 z-20">
            <SessionDetailView
              sessionId={sessionId}
              onBack={() => {
                const newUrl = new URL(window.location.href);
                newUrl.searchParams.delete("sid");
                window.history.replaceState({}, "", newUrl.toString());
              }}
            />
          </div>
        )}
      </section>
      {/* Mini Player - Only show when session is active and not on home view */}
      {isSessionActive && activeView !== 'home' && <MiniSessionPlayer />}
    </main>
    </>
  );
}

function UserDashboardContent() {
  return (
    <ActiveSessionProvider>
      <DashboardInner />
    </ActiveSessionProvider>
  );
}

export default function UserDashboard() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <UserDashboardContent />
    </Suspense>
  );
}

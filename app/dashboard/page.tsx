"use client";

import { ActiveSessionProvider, useActiveSession } from "@/app/contexts/ActiveSessionContext";
import {
  CalendarCheck,
  Compass,
  Home,
  LineChart,
  PanelLeft,
  User,
} from "lucide-react";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import DiscoverView from "./views/DiscoverView";
import HomeView from "./views/HomeView";
import MiniSessionPlayer from "./components/MiniSessionPlayer";
import MobileBottomNav from "./components/MobileBottomNav";
import ProfileView from "./views/ProfileView";
import AccountView from "./views/AccountView";
import ProgressView from "./views/ProgressView";
import type { ReactElement } from "react";
import SessionDetailView from "./views/SessionDetailView";
import SessionsView from "./views/SessionsView";
import { supabase } from "@/supabase/client";

function DashboardInner() {
  const { isSessionActive } = useActiveSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<any>(null);
  const [activeView, setActiveView] = useState<
    "home" | "discover" | "bio" | "sessions" | "progress" | "account"
  >("home");
  const [visibleView, setVisibleView] = useState(activeView);
  const [viewVisible, setViewVisible] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [hideToggleButton, setHideToggleButton] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [isFromOnboarding, setIsFromOnboarding] = useState(false);
const [shouldAnimate, setShouldAnimate] = useState(false);
  const [profilePicUrl, setProfilePicUrl] = useState<string>("");
  const [showProfilePicModal, setShowProfilePicModal] = useState(false);
  const [profilePicModalVisible, setProfilePicModalVisible] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  const sessionId = searchParams.get("sid");

  useEffect(() => {
    // Handle hydration and load saved states from localStorage
    setIsHydrated(true);

    // Load sidebar state from localStorage
    const savedSidebarState = localStorage.getItem('sidebarOpen');
    if (savedSidebarState) {
      setSidebarOpen(JSON.parse(savedSidebarState));
    }

    // Load profile picture from localStorage first (TODO: move to database storage)
    const savedProfilePic = localStorage.getItem('profilePicUrl');
    if (savedProfilePic) {
      setProfilePicUrl(savedProfilePic);
    }

    // Listen for storage changes to sync profile pic updates
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'profilePicUrl') {
        setProfilePicUrl(e.newValue || '');
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    // Persist sidebar state only after hydration
    if (isHydrated) {
      localStorage.setItem('sidebarOpen', JSON.stringify(sidebarOpen));
    }
  }, [sidebarOpen, isHydrated]);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (
      tab === "home" ||
      tab === "discover" ||
      tab === "bio" ||
      tab === "sessions" ||
      tab === "progress" ||
      tab === "account"
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

  // Handle screen size changes and touch detection
  useEffect(() => {
    const checkScreenSize = () => {
      const isSmall = window.innerWidth < 1024; // lg breakpoint
      setIsSmallScreen(isSmall);
    };

    const checkTouchDevice = () => {
      const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isMobileUserAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setIsTouchDevice(hasTouchScreen && isMobileUserAgent);
    };

    checkScreenSize();
    checkTouchDevice();
    window.addEventListener('resize', checkScreenSize);

    return () => {
      window.removeEventListener('resize', checkScreenSize);
    };
  }, []);

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
      {/* Sidebar - Hidden on touch devices */}
      {!isTouchDevice && (
      <aside className={`fixed h-screen flex flex-col bg-neutral-50 border-r border-gray-100 flex z-30 transition-[width] duration-200 ease-out overflow-visible ${
        isSmallScreen || !sidebarOpen ? "w-16" : "w-60"
      } ${
        isFromOnboarding && !shouldAnimate
          ? "sidebar-hidden-for-onboarding"
          : shouldAnimate || !isFromOnboarding
            ? "transition-transform duration-200 ease-out"
            : ""
      } ${
        isFromOnboarding && !shouldAnimate
          ? ""
          : "translate-x-0"
      }`}>
          {/* Header */}
          <div className="group flex items-center justify-between px-2 py-4">
            <button
              onClick={() => window.location.reload()}
              className="text-xl font-bold text-gray-800 hover:text-gray-600 transition-colors cursor-pointer ml-1"
            >
              kind
            </button>

            {/* Toggle button */}
            {!isSmallScreen && !hideToggleButton && (
              <button
                onClick={() => {
                  setSidebarOpen(!sidebarOpen);
                  setHideToggleButton(true);
                  setTimeout(() => setHideToggleButton(false), 250);
                }}
                className={`p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 hover:shadow-md transition-all duration-200 ${
                  sidebarOpen ? 'opacity-0 group-hover:opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}
                aria-label="Toggle sidebar"
              >
                <PanelLeft className={`w-4 h-4 ${!sidebarOpen ? 'rotate-180' : ''}`} />
              </button>
            )}
          </div>

          {/* Sidebar content */}
            {/* Navigation */}
            <nav className="flex-1 p-2 overflow-visible">
              <div className="space-y-1">
                {["home", "discover", "bio", "sessions", "progress"].map(
                  (view) => (
                    <button
                      key={view}
                      onClick={() => handleSidebarNav(view as any)}
                      className={`w-full flex items-center text-left rounded-lg transition-all duration-200 group relative py-2 px-3 ${
                        isSmallScreen || !sidebarOpen ? "justify-center" : "gap-3"
                      } ${
                        activeView === view
                          ? "bg-indigo-50 text-indigo-700 font-medium"
                          : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                      }`}
                    >
                      <span className="flex-shrink-0 transition-all duration-200">{viewIcons[view]}</span>
                      <span className={`ml-2 transition-all duration-200 ${isSmallScreen || !sidebarOpen ? "opacity-0 w-0 overflow-hidden" : "opacity-100"}`}>
                        {view.charAt(0).toUpperCase() + view.slice(1)}
                      </span>
                      {(isSmallScreen || !sidebarOpen) && (
                        <div className="absolute left-full top-1/2 transform -translate-y-1/2 ml-2 px-3 py-2 bg-white text-gray-900 text-sm font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap z-[9999] shadow-2xl border border-gray-200 pointer-events-none">
                          {view.charAt(0).toUpperCase() + view.slice(1)}
                        </div>
                      )}
                    </button>
                  )
                )}
              </div>
            </nav>
            {/* Footer */}
            <div className="mt-auto border-t border-gray-100 p-2 transition-all duration-200 relative">
              {/* User Profile */}
              <button
                onClick={() => handleSidebarNav("account")}
                className={`flex items-center mb-4 group relative w-full rounded-lg p-2 transition-all duration-200 ${
                  isSmallScreen || !sidebarOpen ? "justify-center" : "gap-3"
                } ${
                  activeView === "account"
                    ? "bg-indigo-50 text-indigo-700 font-medium"
                    : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-sm font-medium flex-shrink-0 transition-all duration-200 relative ${
                    !isSmallScreen && sidebarOpen ? "cursor-pointer" : ""
                  }`}
                  onClick={(e) => {
                    if (!isSmallScreen && sidebarOpen) {
                      e.stopPropagation();
                      setShowProfilePicModal(true);
                      requestAnimationFrame(() => setProfilePicModalVisible(true));
                    }
                  }}
                >
                  {profilePicUrl ? (
                    <img
                      src={profilePicUrl}
                      alt="Profile"
                      className="w-full h-full rounded-full object-cover"
                      onError={() => setProfilePicUrl("")}
                    />
                  ) : (
                    user?.email?.charAt(0).toUpperCase() || "U"
                  )}
                </div>
                {!isSmallScreen && sidebarOpen && (
                  <div className="min-w-0 text-left transition-all duration-200 flex-1">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {user?.email || "User"}
                    </p>
                    <p className="text-xs text-gray-500">
                      3/3 sessions
                    </p>
                  </div>
                )}
                {!isSmallScreen && sidebarOpen && (
                  <div className="opacity-0 group-hover:opacity-30 transition-opacity duration-300">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                )}
                {(isSmallScreen || !sidebarOpen) && (
                  <div className="absolute left-full top-1/2 transform -translate-y-1/2 ml-2 px-3 py-2 bg-white text-gray-900 text-sm font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap z-[9999] shadow-2xl border border-gray-200 pointer-events-none">
                    Account Settings
                  </div>
                )}
              </button>
              {/* Sign Out */}
              <div className="space-y-2">
                <button
                  onClick={async () => {
                    await supabase.auth.signOut();
                    router.push("/");
                  }}
                  className={`w-full flex items-center rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-800 transition-all duration-200 group relative py-2 ${
                    isSmallScreen || !sidebarOpen ? "justify-center px-1" : "gap-3 px-3"
                  }`}
                  title={isSmallScreen || !sidebarOpen ? "Sign Out" : undefined}
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
                    className="flex-shrink-0 transition-all duration-200"
                  >
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
                  {!isSmallScreen && sidebarOpen && <span className="text-sm transition-transform duration-200">Sign Out</span>}
                  {(isSmallScreen || !sidebarOpen) && (
                    <div className="absolute left-full top-1/2 transform -translate-y-1/2 ml-2 px-3 py-2 bg-white text-gray-900 text-sm font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap z-[9999] shadow-2xl border border-gray-200 pointer-events-none">
                      Sign Out
                    </div>
                  )}
                </button>
              </div>
            </div>
        </aside>
      )}

      {/* Main Content */}
      <section
        ref={scrollRef}
        className={`flex-1 relative h-screen transition-[margin] duration-200 ease-out pb-16 md:pb-0 ${
          !isTouchDevice ? (isSmallScreen || !sidebarOpen ? 'ml-16' : 'ml-60') : 'ml-0'
        }`}
        style={{
          paddingBottom: isSessionActive && activeView !== 'home' ? '120px' : undefined
        }}
      >
        {/* View Transitions */}
        {["home", "discover", "bio", "sessions", "progress", "account"].map((view) => {
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
              {view === "home" && <HomeView sidebarCollapsed={isSmallScreen || !sidebarOpen} />}
              {view === "discover" && <DiscoverView sidebarCollapsed={isSmallScreen || !sidebarOpen} />}
              {view === "bio" && <ProfileView sidebarCollapsed={isSmallScreen || !sidebarOpen} />}
              {view === "sessions" && !sessionId && <SessionsView sidebarCollapsed={isSmallScreen || !sidebarOpen} />}
              {view === "progress" && <ProgressView sidebarCollapsed={isSmallScreen || !sidebarOpen} />}
              {view === "account" && <AccountView sidebarCollapsed={isSmallScreen || !sidebarOpen} />}
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
      
      {/* Mobile Bottom Navigation */}
      <MobileBottomNav
        activeView={activeView}
        onViewChange={(view) => handleSidebarNav(view as any)}
      />

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
          <div className={`absolute left-0 bottom-16 bg-white rounded-lg shadow-xl border border-gray-200 p-4 w-80 z-50 transition-all duration-200 ${
            profilePicModalVisible
              ? 'opacity-100 scale-100 translate-y-0'
              : 'opacity-0 scale-95 translate-y-2'
          }`}
          >
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Update Profile Picture</h3>
            <div className="space-y-3">
              <input
                type="url"
                value={profilePicUrl}
                onChange={(e) => setProfilePicUrl(e.target.value)}
                placeholder="https://example.com/your-photo.jpg"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                autoFocus
              />
              {profilePicUrl && (
                <div className="flex justify-center">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                    <img
                      src={profilePicUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={() => setProfilePicUrl("")}
                    />
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setProfilePicUrl("");
                    setProfilePicModalVisible(false);
                    setTimeout(() => setShowProfilePicModal(false), 200);
                  }}
                  className="flex-1 px-3 py-1.5 text-xs text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    // TODO: Save to database instead of localStorage
                    localStorage.setItem('profilePicUrl', profilePicUrl);
                    // Dispatch storage event to sync with ProfileView
                    window.dispatchEvent(new StorageEvent('storage', {
                      key: 'profilePicUrl',
                      newValue: profilePicUrl,
                      url: window.location.href
                    }));
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
    <Suspense fallback={<div></div>}>
      <UserDashboardContent />
    </Suspense>
  );
}

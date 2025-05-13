"use client";

import {
  CalendarCheck,
  Compass,
  Home,
  LineChart,
  PanelLeft,
  User,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import DiscoverView from "./views/DiscoverView";
import HomeView from "./views/HomeView";
import ProfileView from "./views/ProfileView";
import ProgressView from "./views/ProgressView";
import type { ReactElement } from "react";
import SessionDetailView from "./views/SessionDetailView";
import SessionsView from "./views/SessionsView";
import { Suspense } from "react";
import { supabase } from "@/supabase/client";

export default function UserDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<any>(null);
  const [activeView, setActiveView] = useState<
    "home" | "discover" | "bio" | "sessions" | "progress"
  >("home");
  const [visibleView, setVisibleView] = useState(activeView);
  const [viewVisible, setViewVisible] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null
  );
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sessionCount, setSessionCount] = useState(0);
  const [monthlySessionCount, setMonthlySessionCount] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);

  const sessionId = searchParams.get("sid");

  // Function to determine subscription status based on session count
  const getSubscriptionStatus = (count: number, monthlyCount: number) => {
    if (monthlyCount >= 20) return "Pro";
    if (monthlyCount >= 8) return "Plus";
    if (count >= 3) return "Free";
    return "Free";
  };

  // Function to calculate progress percentage
  const getProgressPercentage = (count: number, monthlyCount: number) => {
    const status = getSubscriptionStatus(count, monthlyCount);
    if (status === "Pro") return 100;
    if (status === "Plus") return (monthlyCount / 20) * 100;
    return (count / 3) * 100;
  };

  // Function to get session limit for current tier
  const getSessionLimit = (status: string) => {
    switch (status) {
      case "Pro":
        return "20/month";
      case "Plus":
        return "8/month";
      case "Free":
        return "3 total";
      default:
        return "3 total";
    }
  };

  useEffect(() => {
    const fetchSessionCount = async () => {
      if (!user?.id) return;

      // Get total sessions
      const { data: totalData, error: totalError } = await supabase
        .from("sessions")
        .select("id", { count: "exact" })
        .eq("user_id", user.id);

      // Get monthly sessions
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const { data: monthlyData, error: monthlyError } = await supabase
        .from("sessions")
        .select("id", { count: "exact" })
        .eq("user_id", user.id)
        .gte("created_at", firstDayOfMonth.toISOString());

      if (!totalError && totalData) {
        setSessionCount(totalData.length);
      }

      if (!monthlyError && monthlyData) {
        setMonthlySessionCount(monthlyData.length);
      }
    };

    fetchSessionCount();
  }, [user?.id]);

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
    <main className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside
        className={`relative transition-all duration-300 ease-in-out h-screen bg-neutral-50 border-r border-gray-100 flex flex-col z-20 ${
          sidebarOpen ? "w-60" : "w-0"
        }`}
      >
        {/* Only render sidebar content if open */}
        {sidebarOpen && (
          <>
            {/* Header (no toggle button here) */}
            <div className="flex items-center p-4 pt-5">
              <h2 className="text-xl font-bold text-gray-800">kind</h2>
            </div>
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
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-medium flex-shrink-0">
                  {user?.email?.charAt(0).toUpperCase() || "U"}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {user?.email || "User"}
                  </p>
                  <p className="text-xs text-gray-500">
                    {getSubscriptionStatus(sessionCount, monthlySessionCount)}
                  </p>
                </div>
              </div>
              {/* Subscription Status */}
              <div className="mb-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-600">
                      Subscription
                    </span>
                    <span className="text-xs font-medium text-indigo-600">
                      {getSubscriptionStatus(sessionCount, monthlySessionCount)}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 rounded-full"
                      style={{
                        width: `${getProgressPercentage(
                          sessionCount,
                          monthlySessionCount
                        )}%`,
                      }}
                    ></div>
                  </div>
                  <div className="mt-1 text-xs text-gray-500 text-right">
                    {getSubscriptionStatus(
                      sessionCount,
                      monthlySessionCount
                    ) === "Free"
                      ? `${sessionCount} / 3 sessions`
                      : `${monthlySessionCount} / ${getSessionLimit(
                          getSubscriptionStatus(
                            sessionCount,
                            monthlySessionCount
                          )
                        )}`}
                  </div>
                </div>
              </div>
              {/* Settings & Sign Out */}
              <div className="space-y-2">
                <button
                  onClick={() => router.push("/settings")}
                  className="w-full flex items-center gap-3 text-left py-2 px-3 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="flex-shrink-0"
                  >
                    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                  <span>Settings</span>
                </button>
                <button
                  onClick={async () => {
                    await supabase.auth.signOut();
                    router.push("/");
                  }}
                  className="w-full flex items-center gap-3 text-left py-2.5 px-3 rounded-lg text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 transition-colors border border-indigo-100 hover:border-indigo-200 font-medium"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
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
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </>
        )}
      </aside>
      {/* Sidebar Toggle Button (always visible, outside sidebar) */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className={`fixed top-6 z-30 p-2 rounded-lg bg-white border border-gray-200 shadow hover:bg-gray-100 transition-colors ${
          sidebarOpen ? "left-65" : "left-4"
        }`}
        style={{ transition: "left 0.3s cubic-bezier(0.4,0,0.2,1)" }}
      >
        <PanelLeft
          className={`w-5 h-5 transition-transform ${
            !sidebarOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      {/* Main Content */}
      <section
        ref={scrollRef}
        className="flex-1 relative p-8 h-screen overflow-hidden transition-all duration-300 ease-in-out"
      >
        {/* View Transitions */}
        {["home", "discover", "bio", "sessions", "progress"].map((view) => {
          const isVisible = view === visibleView && !sessionId;
          return (
            <div
              key={view}
              className={`absolute inset-0 transition-opacity duration-300 ease-in-out ${
                isVisible && viewVisible
                  ? "opacity-100 z-10"
                  : "opacity-0 pointer-events-none z-0"
              }`}
            >
              {view === "home" && <HomeView />}
              {view === "discover" && <DiscoverView />}
              {view === "bio" && <ProfileView />}
              {view === "sessions" && !sessionId && <SessionsView />}
              {view === "progress" && <ProgressView />}
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
    </main>
  );
}

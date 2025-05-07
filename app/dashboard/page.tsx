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
        className={`w-60 bg-neutral-50 flex flex-col transition-transform duration-300 ease-in-out transform ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {" "}
        <div className="pl-4 mt-16 mb-2">
          <h2 className="text-xl font-bold pl-4 pt-4 text-gray-800">kind</h2>
        </div>
        <nav className="space-y-1 p-5 flex-1">
          {["home", "discover", "bio", "sessions", "progress"].map((view) => (
            <button
              key={view}
              onClick={() => handleSidebarNav(view as any)}
              className={`w-full flex items-center gap-2 text-left py-2 px-3 rounded-lg transition-all duration-200 ${
                activeView === view
                  ? "bg-indigo-50 text-indigo-700 font-medium"
                  : "text-gray-700 hover:bg-gray-50"
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
              {user?.email?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-medium text-gray-800 truncate">
                {user?.email || "User"}
              </p>
              <p className="text-xs text-gray-500">
                {user?.subscription || "Professional"}
              </p>
            </div>
          </div>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              router.push("/");
            }}
            className="w-full bg-white border border-gray-200 text-gray-700 py-2 px-3 rounded-lg hover:bg-gray-50 transition text-sm"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main View */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className={`absolute bottom-30 z-30 p-2 rounded-md text-gray-600 hover:text-indigo-600 transition-all duration-300
      ${
        sidebarOpen
          ? "left-4 text-gray-400 opacity-60"
          : "left-4 text-gray-600 hover:text-indigo-600 opacity-100"
      }

  }`}
      >
        <PanelLeft className="w-5 h-5" />
      </button>
      <section
        ref={scrollRef}
        className={`transition-transform duration-300 ease-in-out transform flex-1 relative p-8 h-screen overflow-hidden ${
          sidebarOpen ? "-translate-x-30" : "-translate-x-30"
        }`}
      >
        {" "}
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

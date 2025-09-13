"use client";

import {
  Home,
  Compass,
  CalendarCheck,
  MoreHorizontal,
  User,
  LineChart,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface MobileBottomNavProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

export default function MobileBottomNav({ activeView, onViewChange }: MobileBottomNavProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const router = useRouter();

  const handleNavClick = (view: string) => {
    onViewChange(view);
    setShowMenu(false);
    if (view === "home") {
      router.push("/dashboard");
    } else {
      router.push(`/dashboard?tab=${view}`);
    }
  };

  useEffect(() => {
    const checkTouchDevice = () => {
      const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isMobileUserAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setIsTouchDevice(hasTouchScreen && isMobileUserAgent);
    };

    checkTouchDevice();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.mobile-menu-container')) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showMenu]);

  if (!isTouchDevice) return null;

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 block lg:hidden">
        <div className="flex items-center justify-around h-16 px-2">
          {/* Home */}
          <button
            onClick={() => handleNavClick("home")}
            className={`flex flex-col items-center justify-center flex-1 py-2 ${
              activeView === "home" ? "text-indigo-600" : "text-gray-500"
            }`}
          >
            <Home className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-medium">Home</span>
          </button>

          {/* Discover */}
          <button
            onClick={() => handleNavClick("discover")}
            className={`flex flex-col items-center justify-center flex-1 py-2 ${
              activeView === "discover" ? "text-indigo-600" : "text-gray-500"
            }`}
          >
            <Compass className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-medium">Discover</span>
          </button>

          {/* Progress */}
          <button
            onClick={() => handleNavClick("progress")}
            className={`flex flex-col items-center justify-center flex-1 py-2 ${
              activeView === "progress" ? "text-indigo-600" : "text-gray-500"
            }`}
          >
            <LineChart className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-medium">Progress</span>
          </button>

          {/* Profile */}
          <button
            onClick={() => handleNavClick("bio")}
            className={`flex flex-col items-center justify-center flex-1 py-2 ${
              activeView === "bio" ? "text-indigo-600" : "text-gray-500"
            }`}
          >
            <User className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-medium">Profile</span>
          </button>

          {/* More Menu */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className={`mobile-menu-container flex flex-col items-center justify-center flex-1 py-2 relative ${
              activeView === "sessions" ? "text-indigo-600" : "text-gray-500"
            }`}
          >
            <MoreHorizontal className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-medium">More</span>
          </button>
        </div>
      </nav>

      {/* More Menu Popup */}
      {showMenu && (
        <div className="mobile-menu-container fixed bottom-20 right-4 bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden z-50 block lg:hidden">
          <div className="py-2">
            <button
              onClick={() => handleNavClick("sessions")}
              className={`flex items-center gap-3 w-full px-4 py-3 hover:bg-gray-50 transition-colors ${
                activeView === "sessions" ? "text-indigo-600 bg-indigo-50" : "text-gray-700"
              }`}
            >
              <CalendarCheck className="w-5 h-5" />
              <span className="text-sm font-medium">Sessions</span>
            </button>
          </div>
        </div>
      )}

      {/* Backdrop blur for menu */}
      {showMenu && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 block lg:hidden"
             onClick={() => setShowMenu(false)} />
      )}
    </>
  );
}
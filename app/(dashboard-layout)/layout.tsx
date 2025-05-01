"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/supabase/client";
import { useEffect, useState } from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

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

  return (
    <main className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-60 bg-white shadow-lg p-4 flex flex-col border-r border-gray-100">
        <div className="mb-5">
          <h2 className="text-xl font-bold text-gray-800">kind</h2>
        </div>
        <nav className="space-y-1 flex-1">
          {[
            { href: "/dashboard", label: "Home" },
            { href: "/discover", label: "Discover" },
            { href: "/bio", label: "Bio" },
            { href: "/sessions", label: "Sessions" },
            { href: "/progress", label: "Progress" },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`w-full block py-2 px-3 rounded-lg transition-all duration-200 text-gray-700 hover:bg-gray-50`}
              prefetch={false}
            >
              {label}
            </Link>
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
      {/* Main Content */}
      <section className="flex-1 p-8 overflow-auto">{children}</section>
    </main>
  );
}

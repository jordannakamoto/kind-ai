'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/supabase/client';
import { useRouter } from 'next/navigation';
import { FcGoogle } from 'react-icons/fc';

export default function HomePage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // User is authenticated, redirect to dashboard
        router.push('/dashboard');
      } else {
        // User is not authenticated, show login page
        setIsAuthenticated(false);
      }
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        router.push('/dashboard');
      } else {
        setIsAuthenticated(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return alert(error.message);
    router.push('/dashboard');
  };

  const handleOAuth = async () => {
    const { error } = await supabase.auth.signInWithOAuth({ 
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });
    if (error) return alert(error.message);
  };

  const handleSignup = async () => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) return alert(error.message);
    router.push('/dashboard');
  };

  // Show loading during auth check
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Show login form for non-authenticated users
  return (
    <main className="min-h-screen flex">
      {/* Left Panel */}
      <div
        className="w-1/2 hidden md:block bg-cover bg-center relative"
        style={{
          backgroundBlendMode: 'overlay',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-300 via-blue-300 to-transparent opacity-80" />
      </div>

      {/* Auth Form */}
      <div className="w-full md:w-1/2 flex items-center justify-center px-6 bg-white">
        <div className="w-full max-w-sm space-y-6">
          {/* Logo */}
          <div className="flex justify-center">
            <div className="bg-indigo-100 text-indigo-700 rounded-xl w-12 h-12 flex items-center justify-center text-xl font-bold shadow-sm">
              K
            </div>
          </div>

          {/* Heading */}
          <h2 className="text-2xl font-semibold text-center text-gray-800">Sign In</h2>
          <p className="text-sm text-center text-gray-500">Logging into the Kind Demo</p>
          
          {/* Google Sign In */}
          <button
            onClick={handleOAuth}
            className="w-full flex items-center justify-center gap-2 bg-white border border-gray-200 py-2 rounded-md hover:bg-gray-50 transition text-sm"
          >
            <FcGoogle size={20} />
            Continue with Google
          </button>

          {/* Toggle email sign-in */}
          {!showEmailForm && (
            <button
              onClick={() => setShowEmailForm(true)}
              className="w-full border border-gray-300 text-sm mb-15 text-gray-700 py-2 rounded-md hover:bg-gray-100 transition"
            >
              Sign in with Email
            </button>
          )}

          {/* Email form */}
          {showEmailForm && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <label className="text-sm text-gray-700 font-medium">Email</label>
                <input
                  type="email"
                  className="w-full bg-blue-50 border border-gray-200 text-sm rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  placeholder="you@example.com"
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm text-gray-700 font-medium">Password</label>
                <input
                  type="password"
                  className="w-full bg-blue-50 border border-gray-200 text-sm rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  placeholder="••••••••"
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <button
                onClick={handleLogin}
                className="w-full bg-slate-400 text-white py-2 rounded-md hover:bg-slate-500 transition text-sm"
              >
                Sign In
              </button>

              <div className="flex items-center justify-between text-sm text-gray-500">
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" />
                  Remember me
                </label>
                <a href="#" className="text-indigo-500 hover:underline">
                  Forgot password?
                </a>
              </div>

              <p className="text-xs text-center text-gray-400">
                No account?{' '}
                <button
                  onClick={handleSignup}
                  className="text-indigo-500 font-medium hover:underline"
                >
                  Register here
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
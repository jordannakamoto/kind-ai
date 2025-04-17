'use client';

import { useEffect, useState } from 'react';

import { FcGoogle } from 'react-icons/fc';
import { supabase } from '@/supabase/client';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showEmailForm, setShowEmailForm] = useState(false);
  const router = useRouter();

  // OAuth Callback
  useEffect(() => {
    const handleOAuthCallback = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) return console.error('Error fetching session:', error.message);
      if (data.session) {
        router.push('/dashboard'); // Redirect to dashboard if session exists
      }
    };

    handleOAuthCallback();
  }, [router]);

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return alert(error.message);
    router.push('/dashboard');
  };

  const handleOAuth = async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
    if (error) return alert(error.message);
  };

  const handleSignup = async () => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) return alert(error.message);
    router.push('/dashboard');
  };
// 
  return (
    <main className="min-h-screen flex">
      {/* Left Panel */}
      <div
        className="w-1/2 hidden md:block bg-cover bg-center relative"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1620003245355-b4469e9d6734?q=80&w=3087&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D')",
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
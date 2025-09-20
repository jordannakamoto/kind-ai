"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/supabase/client";
import { useRouter } from "next/navigation";
import {
  User,
  CreditCard,
  Trash2,
  LogOut,
  AlertTriangle,
  Check,
  X,
  Loader2
} from "lucide-react";

interface AccountViewProps {
  sidebarCollapsed?: boolean;
}

export default function AccountView({ sidebarCollapsed }: AccountViewProps) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteDataConfirmOpen, setDeleteDataConfirmOpen] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        router.push("/");
        return;
      }
      setUser(user);
      setEmail(user.email || "");
      setFullName(user.user_metadata?.full_name || "");
    } catch (error) {
      console.error("Error loading user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    setUpdating(true);
    setMessage({ type: "", text: "" });

    try {
      const { error } = await supabase.auth.updateUser({
        email: email,
        data: { full_name: fullName }
      });

      if (error) throw error;

      setMessage({ type: "success", text: "Profile updated successfully!" });
      await loadUserData();
    } catch (error: any) {
      setMessage({ type: "error", text: error.message || "Failed to update profile" });
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteData = async () => {
    if (deleteInput !== "DELETE MY DATA") return;

    setUpdating(true);
    try {
      // Add your data deletion logic here
      // This would typically involve calling a server function to delete user data

      setMessage({ type: "success", text: "Your data has been deleted" });
      setDeleteDataConfirmOpen(false);
      setDeleteInput("");
    } catch (error) {
      setMessage({ type: "error", text: "Failed to delete data" });
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteInput !== "DELETE MY ACCOUNT") return;

    setUpdating(true);
    try {
      // Add your account deletion logic here
      // This would typically involve calling a server function to delete the account
      await supabase.auth.signOut();
      router.push("/");
    } catch (error) {
      setMessage({ type: "error", text: "Failed to delete account" });
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50/50 via-white to-stone-50/30">
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">

        {message.text && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${
            message.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}>
            {message.type === "success" ? (
              <Check className="w-5 h-5" />
            ) : (
              <X className="w-5 h-5" />
            )}
            {message.text}
          </div>
        )}

        {/* Hero Premium Card */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Enjoying Kind?</h1>
          <p className="text-gray-500 text-base">Your free trial expires in 14 days</p>
        </div>

        <div className="relative group cursor-pointer mb-12 max-w-lg mx-auto">
          <div className="absolute -inset-4 bg-gradient-to-r from-violet-400/40 via-purple-400/35 to-blue-400/40 rounded-[2rem] blur-2xl opacity-30 group-hover:opacity-45 transition duration-700"></div>
          <div className="relative bg-gradient-to-br from-white via-slate-50/50 to-stone-50/60 border border-slate-200/60 rounded-3xl p-7 hover:shadow-xl hover:shadow-slate-200/40 transition-shadow duration-300">

            <div className="relative">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl shadow-sm border border-blue-100">
                    <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center relative">
                      <div className="w-3 h-3 bg-white rounded-full"></div>
                      <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                  <div>
                    <h2 className="text-gray-900 font-medium text-lg">Kind</h2>
                    <p className="text-gray-500 text-xs">your journey, elevated</p>
                  </div>
                </div>
                <div className="text-xs font-medium px-2.5 py-1 bg-gradient-to-r from-slate-100 to-stone-100 text-slate-600 rounded-full border border-slate-200">
                  most popular
                </div>
              </div>

              <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-5 mb-5 border border-slate-200/50 shadow-lg">
                <div className="text-center space-y-2">
                  <div className="flex items-baseline justify-center gap-1.5">
                    <span className="text-2xl font-semibold text-gray-900">$8.99</span>
                    <span className="text-sm text-gray-500">/month</span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed max-w-xs mx-auto">
                    3 hours of sessions monthly — perfect for regular check-ins + deeper exploration when you need it most
                  </p>
                  <p className="text-xs text-slate-500 font-medium">
                    more plans available for extra usage
                  </p>
                </div>
              </div>

              <button
                onClick={async () => {
                  try {
                    setUpdating(true);

                    // Create checkout session
                    const response = await fetch('/api/create-checkout-session', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID || 'price_1234567890', // Fallback for testing
                      }),
                    });

                    const { sessionId } = await response.json();

                    // Check if we have the Stripe publishable key
                    const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

                    if (!stripePublishableKey) {
                      throw new Error('Stripe publishable key is not configured');
                    }

                    // Redirect to Stripe Checkout
                    const { loadStripe } = await import('@stripe/stripe-js');
                    const stripeInstance = await loadStripe(stripePublishableKey);

                    if (stripeInstance) {
                      await stripeInstance.redirectToCheckout({ sessionId });
                    } else {
                      throw new Error('Failed to initialize Stripe');
                    }
                  } catch (error) {
                    console.error('Error:', error);
                    setMessage({ type: "error", text: "Failed to start checkout process" });
                  } finally {
                    setUpdating(false);
                  }
                }}
                disabled={updating}
                className="w-full relative overflow-hidden group/btn mb-4 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ borderRadius: '4px' }}
              >
                {/* Animated background gradient */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 opacity-90 group-hover/btn:opacity-100 transition-opacity duration-300"></div>

                {/* Shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700 ease-out"></div>

                {/* Glass overlay */}
                <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>

                {/* Button content */}
                <div className="relative px-6 py-3 text-white font-medium text-sm tracking-wide flex items-center justify-center gap-2">
                  {updating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <span>Get Kind</span>
                      <div className="w-1.5 h-1.5 bg-white/80 rounded-full animate-pulse"></div>
                    </>
                  )}
                </div>

                {/* Rounded corners */}
                <div className="absolute inset-0" style={{ borderRadius: '4px' }}></div>
              </button>

              <p className="text-xs text-center text-gray-500">
                Cancel anytime • No long-term commitment
              </p>
            </div>
          </div>
        </div>

        {/* Current Plan Summary */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 mb-8 max-w-lg mx-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-50 rounded-xl">
                  <CreditCard className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Current Plan</h3>
                  <p className="text-xs text-gray-500">Free Trial</p>
                </div>
              </div>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                Active
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">Usage</p>
                <p className="text-sm font-semibold text-gray-900">0 / 3 sessions</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">Expires</p>
                <p className="text-sm font-semibold text-gray-900">14 days</p>
              </div>
            </div>
          </div>
        </div>

        {/* Profile */}
        <div className="bg-white rounded-2xl border border-gray-200/60 mb-6">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 bg-gray-50 rounded-xl">
                <User className="w-5 h-5 text-gray-600" />
              </div>
              <h2 className="text-lg font-medium text-gray-900">Profile</h2>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-gray-50/50"
                    placeholder="Enter your name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-gray-50/50"
                    placeholder="Enter your email"
                  />
                </div>
              </div>
              <button
                onClick={handleUpdateProfile}
                disabled={updating}
                className="px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {updating && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Changes
              </button>
            </div>
          </div>
        </div>

        {/* Account Actions */}
        <div className="bg-white rounded-2xl border border-red-200/60 ">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 bg-red-50 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <h2 className="text-lg font-medium text-gray-900">Account Actions</h2>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-3 px-4 bg-gray-50/50 rounded-xl">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Delete Data</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Remove all sessions and progress
                  </p>
                </div>
                <button
                  onClick={() => setDeleteDataConfirmOpen(true)}
                  className="px-3 py-2 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-all duration-200"
                >
                  Delete
                </button>
              </div>
              <div className="flex items-center justify-between py-3 px-4 bg-red-50/50 rounded-xl border border-red-100">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Delete Account</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Permanently remove your account
                  </p>
                </div>
                <button
                  onClick={() => setDeleteConfirmOpen(true)}
                  className="px-3 py-2 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-all duration-200"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Delete Data Confirmation Modal */}
      {deleteDataConfirmOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Delete All Data
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              This action cannot be undone. All your data will be permanently deleted,
              but your account will remain active.
            </p>
            <p className="text-sm font-medium text-gray-900 mb-2">
              Type "DELETE MY DATA" to confirm:
            </p>
            <input
              type="text"
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="DELETE MY DATA"
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setDeleteDataConfirmOpen(false);
                  setDeleteInput("");
                }}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteData}
                disabled={deleteInput !== "DELETE MY DATA" || updating}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Delete Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Confirmation Modal */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Delete Account
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              This action cannot be undone. Your account and all associated data
              will be permanently deleted.
            </p>
            <p className="text-sm font-medium text-gray-900 mb-2">
              Type "DELETE MY ACCOUNT" to confirm:
            </p>
            <input
              type="text"
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="DELETE MY ACCOUNT"
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  setDeleteInput("");
                }}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteInput !== "DELETE MY ACCOUNT" || updating}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
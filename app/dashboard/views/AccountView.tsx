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
    <div className="min-h-screen bg-gray-50/20">
      <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Account</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your subscription and profile
          </p>
        </div>

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

        {/* Subscription Card */}
        <div className="relative overflow-hidden rounded-2xl mb-6">
          {/* Subtle gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-indigo-500/10"></div>

          <div className="relative bg-white/80 backdrop-blur-sm border border-white/60">
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-xl">
                    <CreditCard className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-medium text-gray-900">Subscription</h2>
                    <p className="text-xs text-gray-500">Free Trial • 3 sessions remaining</p>
                  </div>
                </div>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Active
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-5">
                <div className="bg-white/70 rounded-xl p-4 border border-gray-100">
                  <p className="text-xs text-gray-500 mb-1">Usage</p>
                  <p className="text-sm font-semibold text-gray-900">0 / 3 sessions</p>
                </div>
                <div className="bg-white/70 rounded-xl p-4 border border-gray-100">
                  <p className="text-xs text-gray-500 mb-1">Expires</p>
                  <p className="text-sm font-semibold text-gray-900">14 days</p>
                </div>
              </div>

              <div className="relative group cursor-pointer">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-slate-200 to-gray-300 rounded-2xl blur-sm opacity-0 group-hover:opacity-30 transition duration-500"></div>
                <div className="relative bg-gradient-to-br from-slate-50 to-gray-100 border border-gray-200/50 rounded-2xl p-5 hover:shadow-lg transition-all duration-300">

                  <div className="relative">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2.5 bg-white rounded-xl shadow-sm border border-gray-100">
                        <div className="w-5 h-5 bg-gradient-to-br from-gray-600 to-slate-700 rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                      </div>
                      <div>
                        <h3 className="text-gray-900 font-medium text-base">Premium</h3>
                        <p className="text-gray-500 text-xs">Unlimited sessions and insights</p>
                      </div>
                    </div>

                    <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 mb-4 border border-gray-100/50 space-y-2">
                      <div className="flex items-center justify-between text-gray-700">
                        <span className="text-xs font-medium">Unlimited sessions</span>
                        <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></div>
                      </div>
                      <div className="flex items-center justify-between text-gray-700">
                        <span className="text-xs font-medium">Priority support</span>
                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                      </div>
                      <div className="flex items-center justify-between text-gray-700">
                        <span className="text-xs font-medium">Advanced insights</span>
                        <div className="w-1.5 h-1.5 bg-amber-400 rounded-full"></div>
                      </div>
                    </div>

                    <button className="w-full bg-gray-900 text-white font-medium py-3 rounded-xl hover:bg-gray-800 transition-all duration-200 text-sm">
                      Upgrade
                    </button>
                  </div>
                </div>
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
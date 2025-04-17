'use client';

import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/supabase/client';

interface UserProfile {
  id: string;
  email: string;
  username: string;
  full_name: string;
  avatar_url: string;
  joined_at: string;
  role: string;
  bio: string;
  therapy_summary: string;
  themes: string;
  goals: string;
  settings: any;
  is_active: boolean;
  subscription: string;
  admin_notes: string;
  user_subscriptions?: { plan_id: string; status: string };
  sessions?: { id: string; title: string; duration_minutes: number }[];
  logs?: { id: string; action: string; created_at: string }[];
}

interface UserProfileViewProps {
  userId: string;
  onBack: () => void;
}

export default function UserProfileView({ userId, onBack }: UserProfileViewProps) {
  const [originalUser, setOriginalUser] = useState<UserProfile | null>(null);
  const [editableUser, setEditableUser] = useState<Partial<UserProfile>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Function to check if there are unsaved changes
  const checkForChanges = useCallback((original: any, editable: any) => {
    if (!original) return false;

    for (const key in editable) {
      if (['user_subscriptions', 'sessions', 'logs'].includes(key)) continue;

      if (key === 'settings' && typeof editable[key] === 'object') {
        const originalSettings = original[key] || {};
        const editableSettings = editable[key] || {};
        if (JSON.stringify(originalSettings) !== JSON.stringify(editableSettings)) {
          return true;
        }
        continue;
      }

      if (editable[key] !== original[key]) {
        return true;
      }
    }

    return false;
  }, []);

  // Check for changes whenever editableUser is updated
  useEffect(() => {
    const changed = checkForChanges(originalUser, editableUser);
    setHasChanges(changed);
  }, [editableUser, originalUser, checkForChanges]);

  // Fetch user data
  useEffect(() => {
    const fetchUser = async () => {
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          user_subscriptions(*),
          sessions(*),
          logs(*)
        `)
        .eq('id', userId)
        .single();
      
      if (error) console.error('Error fetching user:', error.message);
      else {
        setOriginalUser(data || null);
        setEditableUser(data ? { ...data } : {});
      }
      setLoading(false);
    };
    
    fetchUser();
  }, [userId]);

  // Auto-resize textareas on initial render
  useEffect(() => {
    if (editableUser) {
      // Select all textareas in the component and adjust their heights
      const textareas = document.querySelectorAll('textarea');
      textareas.forEach(textarea => {
        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight}px`;
      });
    }
  }, [editableUser]);

  // Function to auto-resize textareas
  const autoResizeTextarea = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = 'auto';
    // Set the height to scrollHeight to fit all content
    textarea.style.height = `${textarea.scrollHeight}px`;
  };

  // Handle input change
  const handleInputChange = (field: string, value: any) => {
    setEditableUser(prev => ({ ...prev, [field]: value }));
    
    // Clear success message when making changes
    if (success) setSuccess(null);
  };

  // Handle textarea change with auto-resize
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>, field: string) => {
    handleInputChange(field, e.target.value);
    autoResizeTextarea(e);
  };

  // Save changes
  const handleSave = async () => {
    if (!hasChanges) return;

    setSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      const { error } = await supabase
        .from('users')
        .update({
          role: editableUser.role,
          bio: editableUser.bio,
          therapy_summary: editableUser.therapy_summary,
          themes: editableUser.themes,
          goals: editableUser.goals,
          settings: editableUser.settings,
          is_active: editableUser.is_active,
          subscription: editableUser.subscription,
          admin_notes: editableUser.admin_notes
        })
        .eq('id', userId);
      
      if (error) throw error;
      
      // Refresh user data
      const { data: updatedUser } = await supabase
        .from('users')
        .select(`
          *,
          user_subscriptions(*),
          sessions(*),
          logs(*)
        `)
        .eq('id', userId)
        .single();
        
      setOriginalUser(updatedUser);
      setEditableUser(updatedUser ? { ...updatedUser } : {});
      setSuccess("User profile updated successfully");
      setHasChanges(false);
    } catch (err: any) {
      setError(err.message || "Failed to update user");
    } finally {
      setSaving(false);
    }
  };

  // Reset editable user to original
  const handleReset = () => {
    setEditableUser(originalUser ? { ...originalUser } : {});
    setError(null);
    setSuccess(null);
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div className="pt-0">
      <div className="flex justify-between items-center mb-2">
        <button onClick={onBack} className="text-blue-500 hover:underline text-sm">
          ← Back to Users
        </button>
        <div className="flex space-x-1">
          <button 
            onClick={handleReset}
            className={`px-2 py-1 text-xs rounded-md transition ${
              hasChanges 
                ? "bg-gray-300 text-gray-700 hover:bg-gray-400" 
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
            disabled={!hasChanges || saving}
          >
            Reset
          </button>
          <button 
            onClick={handleSave}
            className={`px-2 py-1 text-xs rounded-md transition ${
              hasChanges 
                ? "bg-green-500 text-white hover:bg-green-600" 
                : "bg-gray-200 text-gray-500 cursor-not-allowed"
            }`}
            disabled={!hasChanges || saving}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-2 p-1 text-xs bg-red-100 border border-red-200 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-2 p-1 text-xs bg-green-100 border border-green-200 text-green-700 rounded-md">
          {success}
        </div>
      )}

      <h2 className="text-lg font-medium mb-2">{editableUser.email || 'User Profile'}</h2>
        
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {/* Left Column */}
        <div className="md:col-span-1 space-y-3">
          {/* Basic Information */}
          <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
            <h3 className="text-sm font-medium mb-2 border-b pb-1">Basic Information</h3>
            
            <div className="space-y-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                <input 
                  type="email" 
                  value={editableUser.email || ''} 
                  readOnly
                  className="w-full p-1.5 text-sm bg-gray-100 text-gray-700 rounded-md cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Role</label>
                <select 
                  value={editableUser.role || 'user'} 
                  onChange={(e) => handleInputChange('role', e.target.value)}
                  className="w-full p-1.5 text-sm bg-white rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                  <option value="therapist">Therapist</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Active Status</label>
                <div className="flex items-center">
                  <input 
                    type="checkbox" 
                    checked={editableUser.is_active || false} 
                    onChange={(e) => handleInputChange('is_active', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-xs text-gray-700">
                    User is {editableUser.is_active ? 'active' : 'inactive'}
                  </span>
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Joined</label>
                <p className="text-xs text-gray-900">
                  {editableUser.joined_at ? new Date(editableUser.joined_at).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Subscription Information */}
          <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
            <h3 className="text-sm font-medium mb-2 border-b pb-1">Subscription</h3>
            
            <div className="space-y-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Current Plan</label>
                <select 
                  value={editableUser.subscription || ''}
                  onChange={(e) => handleInputChange('subscription', e.target.value)}
                  className="w-full p-1.5 text-sm bg-white rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">No Plan</option>
                  <option value="free">Free</option>
                  <option value="basic">Basic</option>
                  <option value="premium">Premium</option>
                  <option value="professional">Professional</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                <p className="text-xs text-gray-900">{originalUser?.user_subscriptions?.status || 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="md:col-span-3 space-y-3">
          {/* Therapy Progress */}
          <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
            <h3 className="text-sm font-medium mb-2 border-b pb-1">Therapy Progress</h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Bio</label>
                <textarea 
                  value={editableUser.bio || ''} 
                  onChange={(e) => handleTextareaChange(e, 'bio')}
                  className="w-full p-1.5 text-sm bg-white rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 overflow-hidden resize-none"
                  style={{ minHeight: '60px' }}
                  placeholder="User bio"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Therapy Summary</label>
                <textarea 
                  value={editableUser.therapy_summary || ''} 
                  onChange={(e) => handleTextareaChange(e, 'therapy_summary')}
                  className="w-full p-1.5 text-sm bg-white rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 overflow-hidden resize-none"
                  style={{ minHeight: '60px' }}
                  placeholder="Summary of therapy progress"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Themes</label>
                <textarea 
                  value={editableUser.themes || ''} 
                  onChange={(e) => handleTextareaChange(e, 'themes')}
                  className="w-full p-1.5 text-sm bg-white rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 overflow-hidden resize-none"
                  style={{ minHeight: '60px' }}
                  placeholder="Recurring themes in therapy"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Goals</label>
                <textarea 
                  value={editableUser.goals || ''} 
                  onChange={(e) => handleTextareaChange(e, 'goals')}
                  className="w-full p-1.5 text-sm bg-white rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 overflow-hidden resize-none"
                  style={{ minHeight: '60px' }}
                  placeholder="Therapy goals"
                />
              </div>
            </div>
          </div>

          {/* Admin Notes */}
          <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
            <h3 className="text-sm font-medium mb-2 border-b pb-1">Admin Notes</h3>
            
            <div>
              <textarea 
                value={editableUser.admin_notes || ''} 
                onChange={(e) => handleTextareaChange(e, 'admin_notes')}
                className="w-full p-1.5 text-sm bg-white rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 overflow-hidden resize-none"
                style={{ minHeight: '80px' }}
                placeholder="Add administrative notes here"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Activity Sections */}
      <div className="mt-3 space-y-3">
        {/* Sessions Section */}
        <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
          <h3 className="text-sm font-medium mb-2 border-b pb-1">Sessions</h3>
          
          {originalUser?.sessions && originalUser.sessions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {originalUser.sessions.map((session) => (
                    <tr key={session.id}>
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">{session.title}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">{session.duration_minutes} mins</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-gray-500 italic">No sessions recorded</p>
          )}
        </div>

        {/* Activity Logs Section */}
        <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
          <h3 className="text-sm font-medium mb-2 border-b pb-1">Activity Logs</h3>
          
          {originalUser?.logs && originalUser.logs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {originalUser.logs.map((log) => (
                    <tr key={log.id}>
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">{log.action}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-gray-500 italic">No activity logs recorded</p>
          )}
        </div>
      </div>
    </div>
  );
}
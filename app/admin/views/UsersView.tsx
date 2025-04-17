'use client';

import { useEffect, useState } from 'react';

import { supabase } from '@/supabase/client';

interface User {
  id: string;
  email: string;
  username: string;
  user_subscriptions?: { plan_id: string };
  sessions?: { id: string }[];
}

interface UsersViewProps {
  onSelectUser: (id: string) => void;
}

export default function UsersView({ onSelectUser }: UsersViewProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          user_subscriptions(*),
          sessions(*)
        `);
      if (error) console.error('Error fetching users:', error.message);
      else setUsers(data || []);
      setLoading(false);
    };

    fetchUsers();
  }, []);

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">Users</h2>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <table className="w-full border-collapse border border-gray-200">
          <thead>
            <tr>
              <th className="border border-gray-200 px-4 py-2">ID</th>
              <th className="border border-gray-200 px-4 py-2">Email</th>
              <th className="border border-gray-200 px-4 py-2">Username</th>
              <th className="border border-gray-200 px-4 py-2">Subscription</th>
              <th className="border border-gray-200 px-4 py-2">Sessions</th>
              <th className="border border-gray-200 px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td className="border border-gray-200 px-4 py-2">{user.id}</td>
                <td className="border border-gray-200 px-4 py-2">{user.email}</td>
                <td className="border border-gray-200 px-4 py-2">{user.username}</td>
                <td className="border border-gray-200 px-4 py-2">{user.user_subscriptions?.plan_id || 'None'}</td>
                <td className="border border-gray-200 px-4 py-2">{user.sessions?.length || 0}</td>
                <td className="border border-gray-200 px-4 py-2">
                  <button
                    onClick={() => onSelectUser(user.id)}
                    className="text-blue-500 hover:underline mr-2"
                  >
                    View Profile
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

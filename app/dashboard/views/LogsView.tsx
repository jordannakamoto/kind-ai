'use client';

import { useEffect, useState } from 'react';

import { supabase } from '@/supabase/client';

interface Log {
  id: string;
  action: string;
  created_at: string;
}

export default function LogsView() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      const { data, error } = await supabase.from('logs').select('*');
      if (error) {
        console.error('Error fetching logs:', error.message);
      } else {
        setLogs(data as Log[]);
      }
      setLoading(false);
    };

    fetchLogs();
  }, []);

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">Logs</h2>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <table className="w-full border-collapse border border-gray-200">
          <thead>
            <tr>
              <th className="border border-gray-200 px-4 py-2">ID</th>
              <th className="border border-gray-200 px-4 py-2">Action</th>
              <th className="border border-gray-200 px-4 py-2">Created At</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td className="border border-gray-200 px-4 py-2">{log.id}</td>
                <td className="border border-gray-200 px-4 py-2">{log.action}</td>
                <td className="border border-gray-200 px-4 py-2">
                  {new Date(log.created_at).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
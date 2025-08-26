'use client';

import { Mic, MicOff, Phone, X } from 'lucide-react';
import { useActiveSession } from '@/app/contexts/ActiveSessionContext';
import { useRouter } from 'next/navigation';

export default function MiniSessionPlayer() {
  const { isSessionActive, sessionData, endSession, toggleMute } = useActiveSession();
  const router = useRouter();

  if (!isSessionActive || !sessionData) return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleReturnToSession = () => {
    router.push('/dashboard?tab=home');
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50 transition-transform duration-300 ease-in-out">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Left Section - Session Info */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                <div className={`w-2 h-2 rounded-full ${sessionData.isSpeaking ? 'bg-indigo-600 animate-pulse' : 'bg-gray-400'}`} />
              </div>
              {isSessionActive && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
              )}
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-900">Active Session</p>
              <p className="text-xs text-gray-500">
                {sessionData.isSpeaking ? 'Speaking...' : 'Listening...'} • {formatTime(sessionData.duration)}
              </p>
            </div>
          </div>

          {/* Center Section - Agent Message */}
          {sessionData.agentMessage && (
            <div className="flex-1 max-w-md mx-4">
              <p className="text-xs text-gray-600 truncate">{sessionData.agentMessage}</p>
            </div>
          )}

          {/* Right Section - Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleMute}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              aria-label={sessionData.isMuted ? 'Unmute' : 'Mute'}
              disabled={!toggleMute}
            >
              {sessionData.isMuted ? (
                <MicOff className="w-4 h-4 text-gray-600" />
              ) : (
                <Mic className="w-4 h-4 text-gray-600" />
              )}
            </button>
            
            <button
              onClick={handleReturnToSession}
              className="px-3 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            >
              Return to Session
            </button>
            
            <button
              onClick={endSession}
              className="p-2 rounded-full hover:bg-red-50 transition-colors group"
              aria-label="End session"
            >
              <Phone className="w-4 h-4 text-red-600 rotate-135" style={{ transform: 'rotate(135deg)' }} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
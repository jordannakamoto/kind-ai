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
    <div className="fixed bottom-4 left-4 right-4 z-50 flex justify-center">
      <div className="bg-gray-50/50 border border-gray-100 rounded-lg shadow-lg backdrop-blur-sm max-w-2xl w-full transition-all duration-300 hover:bg-gray-50 hover:border-gray-200">
        <div className="px-5 py-4">
          <div className="flex items-center justify-between">
            {/* Left Section - Session Info */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                  <div className={`w-2 h-2 rounded-full ${sessionData.isSpeaking ? 'bg-gray-600 animate-pulse' : 'bg-gray-400'}`} />
                </div>
                {isSessionActive && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
                )}
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-700">Active Session</p>
                <p className="text-xs text-gray-400">
                  {sessionData.isSpeaking ? 'Speaking...' : 'Listening...'} • {formatTime(sessionData.duration)}
                </p>
              </div>
            </div>

            {/* Center Section - Agent Message */}
            {sessionData.agentMessage && (
              <div className="flex-1 max-w-xs mx-4">
                <p className="text-xs text-gray-500 truncate">{sessionData.agentMessage}</p>
              </div>
            )}

            {/* Right Section - Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleMute}
                className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-gray-200 transition-all duration-300"
                aria-label={sessionData.isMuted ? 'Unmute' : 'Mute'}
                disabled={!toggleMute}
              >
                {sessionData.isMuted ? (
                  <MicOff className="w-4 h-4 text-gray-500" />
                ) : (
                  <Mic className="w-4 h-4 text-gray-500" />
                )}
              </button>
              
              <button
                onClick={handleReturnToSession}
                className="px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-300 border border-gray-200"
              >
                Return to Session
              </button>
              
              <button
                onClick={endSession}
                className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-red-50 hover:border-red-200 transition-all duration-300 group"
                aria-label="End session"
              >
                <Phone className="w-4 h-4 text-gray-500 group-hover:text-red-600 rotate-135" style={{ transform: 'rotate(135deg)' }} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
'use client';

import { ReactNode, createContext, useContext, useState } from 'react';

type ActiveSessionContextType = {
  isSessionActive: boolean;
  sessionData: {
    duration: number;
    status: string;
    isMuted: boolean;
    isSpeaking: boolean;
    agentMessage: string;
  } | null;
  setSessionActive: (active: boolean) => void;
  updateSessionData: (data: Partial<ActiveSessionContextType['sessionData']>) => void;
  endSession: () => void;
  toggleMute?: () => void;
  setToggleMute: (fn: () => void) => void;
};

const ActiveSessionContext = createContext<ActiveSessionContextType | undefined>(undefined);

export function ActiveSessionProvider({ children }: { children: ReactNode }) {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionData, setSessionData] = useState<ActiveSessionContextType['sessionData']>(null);
  const [toggleMute, setToggleMuteInternal] = useState<(() => void) | undefined>(undefined);

  const setSessionActive = (active: boolean) => {
    setIsSessionActive(active);
    if (active && !sessionData) {
      setSessionData({
        duration: 0,
        status: 'connected',
        isMuted: false,
        isSpeaking: false,
        agentMessage: '',
      });
    }
  };

  const updateSessionData = (data: Partial<ActiveSessionContextType['sessionData']>) => {
    setSessionData(prev => prev ? { ...prev, ...data } : null);
  };

  const endSession = () => {
    setIsSessionActive(false);
    setSessionData(null);
    setToggleMuteInternal(undefined);
  };

  const setToggleMute = (fn: () => void) => {
    setToggleMuteInternal(() => fn);
  };

  return (
    <ActiveSessionContext.Provider
      value={{
        isSessionActive,
        sessionData,
        setSessionActive,
        updateSessionData,
        endSession,
        toggleMute,
        setToggleMute,
      }}
    >
      {children}
    </ActiveSessionContext.Provider>
  );
}

export function useActiveSession() {
  const context = useContext(ActiveSessionContext);
  if (!context) {
    throw new Error('useActiveSession must be used within an ActiveSessionProvider');
  }
  return context;
}
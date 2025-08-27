'use client';

import { ReactNode, createContext, useContext, useEffect, useState, useCallback } from 'react';

// Define the context type
type ConversationContextType = {
  conversationEnded: boolean;
  setConversationEnded: (val: boolean) => void;
  pollingStatus: {
    sessionsUpdated: boolean;
    bioUpdated: boolean;
  };
  setPollingStatus: (updates: Partial<{ sessionsUpdated: boolean; bioUpdated: boolean }>) => void;
};

// Create and export the context
export const ConversationContext = createContext<ConversationContextType | undefined>(undefined);

// Provider component
export function ConversationProvider({ children }: { children: ReactNode }) {
  const [conversationEnded, setConversationEnded] = useState(false);
  const [pollingStatus, setPollingStatusInternal] = useState({
    sessionsUpdated: false,
    bioUpdated: false,
  });

  // Wrapper to allow partial updates
  const setPollingStatus = useCallback((updates: Partial<typeof pollingStatus>) => {
    setPollingStatusInternal((prev) => ({ ...prev, ...updates }));
  }, []);

  // Automatically reset state when both polling targets are updated
  useEffect(() => {
    if (pollingStatus.sessionsUpdated && pollingStatus.bioUpdated) {
      setConversationEnded(false);
      setPollingStatusInternal({ sessionsUpdated: false, bioUpdated: false });
    }
  }, [pollingStatus]);

  return (
    <ConversationContext.Provider
      value={{
        conversationEnded,
        setConversationEnded,
        pollingStatus,
        setPollingStatus,
      }}
    >
      {children}
    </ConversationContext.Provider>
  );
}

// Custom hook to use the context
export function useConversationStatus() {
  const context = useContext(ConversationContext);
  if (!context) {
    throw new Error('useConversationStatus must be used within a ConversationProvider');
  }
  return context;
}
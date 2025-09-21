'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { format } from 'date-fns';

interface GoalCompletionEvent {
  goalId: string;
  goalTitle: string;
  completedAt: string;
  dateKey: string; // YYYY-MM-DD format
}

interface GoalCompletionContextType {
  completedGoals: GoalCompletionEvent[];
  newlyCompletedGoals: Set<string>;
  triggerGoalCompletion: (goalId: string, goalTitle: string) => void;
  triggerGoalUncompletion: (goalId: string) => void;
  markGoalCelebrationViewed: (goalId: string) => void;
  clearAllCelebrations: () => void;
  getGoalsCompletedOnDate: (dateKey: string) => GoalCompletionEvent[];
}

const GoalCompletionContext = createContext<GoalCompletionContextType | undefined>(undefined);

export function GoalCompletionProvider({ children }: { children: ReactNode }) {
  const [completedGoals, setCompletedGoals] = useState<GoalCompletionEvent[]>([]);
  const [newlyCompletedGoals, setNewlyCompletedGoals] = useState<Set<string>>(new Set());

  // Function to trigger a goal completion celebration
  const triggerGoalCompletion = (goalId: string, goalTitle: string) => {
    // Prevent duplicate celebrations
    if (newlyCompletedGoals.has(goalId)) {
      console.log('🚫 Goal already celebrating:', goalId);
      return;
    }

    const now = new Date();
    const completedAt = now.toISOString();
    const dateKey = format(now, 'yyyy-MM-dd');

    const newGoalEvent: GoalCompletionEvent = {
      goalId,
      goalTitle,
      completedAt,
      dateKey
    };

    setCompletedGoals(prev => [...prev, newGoalEvent]);
    setNewlyCompletedGoals(prev => new Set([...prev, goalId]));

    // Broadcast to other tabs/windows
    localStorage.setItem('goalCompletionEvent', JSON.stringify({
      ...newGoalEvent,
      timestamp: Date.now()
    }));

    console.log('🎉 Goal completed!', newGoalEvent);
  };

  // Function to handle goal un-completion (unchecking a completed goal)
  const triggerGoalUncompletion = (goalId: string) => {
    // Remove from completed goals
    setCompletedGoals(prev => prev.filter(goal => goal.goalId !== goalId));

    // Remove from newly completed goals (stop any ongoing celebrations)
    setNewlyCompletedGoals(prev => {
      const newSet = new Set(prev);
      newSet.delete(goalId);
      return newSet;
    });

    console.log('↩️ Goal uncompleted:', goalId);
  };

  // Mark a goal's celebration as viewed (to stop the animation)
  const markGoalCelebrationViewed = (goalId: string) => {
    setNewlyCompletedGoals(prev => {
      const newSet = new Set(prev);
      newSet.delete(goalId);
      return newSet;
    });
  };

  // Clear all celebrations
  const clearAllCelebrations = () => {
    setNewlyCompletedGoals(new Set());
  };

  // Get goals completed on a specific date
  const getGoalsCompletedOnDate = (dateKey: string): GoalCompletionEvent[] => {
    return completedGoals.filter(goal => goal.dateKey === dateKey);
  };

  // Listen for goal completion events from other tabs/windows
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'goalCompletionEvent' && e.newValue) {
        try {
          const eventData = JSON.parse(e.newValue);
          // Only process events from the last 5 seconds to avoid old events
          if (Date.now() - eventData.timestamp < 5000) {
            const goalEvent: GoalCompletionEvent = {
              goalId: eventData.goalId,
              goalTitle: eventData.goalTitle,
              completedAt: eventData.completedAt,
              dateKey: eventData.dateKey
            };

            setCompletedGoals(prev => [...prev, goalEvent]);
            setNewlyCompletedGoals(prev => new Set([...prev, eventData.goalId]));
          }
        } catch (error) {
          console.error('Error parsing goal completion event:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const contextValue: GoalCompletionContextType = {
    completedGoals,
    newlyCompletedGoals,
    triggerGoalCompletion,
    triggerGoalUncompletion,
    markGoalCelebrationViewed,
    clearAllCelebrations,
    getGoalsCompletedOnDate
  };

  return (
    <GoalCompletionContext.Provider value={contextValue}>
      {children}
    </GoalCompletionContext.Provider>
  );
}

export function useGoalCompletion() {
  const context = useContext(GoalCompletionContext);
  if (context === undefined) {
    throw new Error('useGoalCompletion must be used within a GoalCompletionProvider');
  }
  return context;
}
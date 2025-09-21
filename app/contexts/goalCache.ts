// Goal cache for tracking completed goals and newly completed ones
interface Goal {
  id: string;
  title: string;
  description?: string;
  completed_at?: string | null;
  created_at: string;
  is_active: boolean;
  goal_type: 'basic' | 'counter' | 'progress' | 'list';
  current_value: number;
  target_value?: number | null;
  archived_at?: string | null;
  archived_reason?: string | null;
}

interface GoalCacheState {
  goals: Goal[];
  lastChecked: number;
  newlyCompletedGoalIds: Set<string>;
}

let goalCache: GoalCacheState = {
  goals: [],
  lastChecked: Date.now(),
  newlyCompletedGoalIds: new Set()
};

export function getGoalCache(): GoalCacheState {
  return goalCache;
}

export function setGoalCache(goals: Goal[]) {
  const previouslyCompletedIds = new Set(
    goalCache.goals
      .filter(goal => goal.completed_at)
      .map(goal => goal.id)
  );

  const currentlyCompletedIds = new Set(
    goals
      .filter(goal => goal.completed_at)
      .map(goal => goal.id)
  );

  // Find newly completed goals
  const newlyCompleted = new Set<string>();
  currentlyCompletedIds.forEach(id => {
    if (!previouslyCompletedIds.has(id)) {
      newlyCompleted.add(id);
    }
  });

  goalCache = {
    goals,
    lastChecked: Date.now(),
    newlyCompletedGoalIds: newlyCompleted
  };
}

export function getNewlyCompletedGoals(): Goal[] {
  return goalCache.goals.filter(goal =>
    goalCache.newlyCompletedGoalIds.has(goal.id)
  );
}

export function clearNewlyCompletedGoal(goalId: string) {
  goalCache.newlyCompletedGoalIds.delete(goalId);
}

export function clearAllNewlyCompletedGoals() {
  goalCache.newlyCompletedGoalIds.clear();
}

// Get goals completed on a specific date
export function getGoalsCompletedOnDate(date: string): Goal[] {
  return goalCache.goals.filter(goal => {
    if (!goal.completed_at) return false;
    const goalDate = new Date(goal.completed_at).toISOString().split('T')[0];
    return goalDate === date;
  });
}

// Check if a goal was newly completed on a specific date
export function isGoalNewlyCompletedOnDate(goalId: string, date: string): boolean {
  if (!goalCache.newlyCompletedGoalIds.has(goalId)) return false;

  const goal = goalCache.goals.find(g => g.id === goalId);
  if (!goal?.completed_at) return false;

  const goalDate = new Date(goal.completed_at).toISOString().split('T')[0];
  return goalDate === date;
}
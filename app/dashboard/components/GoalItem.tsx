import { Circle, CheckCircle2, Plus, Minus, Target, Hash, MoreHorizontal, List, Clock } from 'lucide-react';
import { useState } from 'react';

interface ListItem {
  id: string;
  value: string;
  timestamp: string;
  notes?: string;
}

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
  list_items?: ListItem[];
  archived_at?: string | null;
  archived_reason?: string | null;
}

interface GoalItemProps {
  goal: Goal;
  isNew: boolean;
  onToggleComplete: (goalId: string) => void;
  onUpdateProgress: (goalId: string, increment: number) => void;
  onArchive: (goalId: string, reason: string) => void;
  onUpdateGoalType: (goalId: string, updates: {
    goalType: 'basic' | 'counter' | 'progress' | 'list';
    currentValue?: number;
    targetValue?: number;
  }) => void;
  onAddListItem: (goalId: string, value: string, notes?: string) => void;
  onRemoveListItem: (goalId: string, itemId: string) => void;
  viewMode: 'list' | 'kanban';
  onShowSettings: (goal: Goal, triggerElement: HTMLElement) => void;
}

export default function GoalItem({
  goal,
  isNew,
  onToggleComplete,
  onUpdateProgress,
  onArchive,
  onUpdateGoalType,
  onAddListItem,
  onRemoveListItem,
  viewMode,
  onShowSettings
}: GoalItemProps) {
  const [isEditingCounter, setIsEditingCounter] = useState(false);
  const [editCounterValue, setEditCounterValue] = useState(goal.current_value.toString());
  const [isEditingProgress, setIsEditingProgress] = useState<'current' | 'target' | null>(null);
  const [editProgressValue, setEditProgressValue] = useState('');
  const [isAddingListItem, setIsAddingListItem] = useState(false);
  const [newListItem, setNewListItem] = useState('');
  const getProgressPercentage = (): number => {
    if (goal.goal_type === 'progress' && goal.target_value && goal.target_value > 0) {
      return Math.min(100, Math.round((goal.current_value / goal.target_value) * 100));
    }
    return 0;
  };

  const isCompleted = (): boolean => {
    if (goal.goal_type === 'basic') {
      return !!goal.completed_at;
    }
    if (goal.goal_type === 'progress' && goal.target_value) {
      return goal.current_value >= goal.target_value;
    }
    return false;
  };

  const getGoalIcon = () => {
    if (goal.goal_type === 'basic') {
      return isCompleted() ? (
        <CheckCircle2 className="w-4 h-4 text-green-500" />
      ) : (
        <Circle className="w-4 h-4 text-gray-300 hover:text-gray-400 transition-colors" />
      );
    }
    if (goal.goal_type === 'list') {
      return <List className="w-4 h-4 text-indigo-500" />;
    }
    return null;
  };

  const renderProgressBar = () => {
    if (goal.goal_type !== 'progress' || !goal.target_value) return null;

    const percentage = getProgressPercentage();

    const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
      e.stopPropagation();
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const newPercentage = Math.max(0, Math.min(100, (clickX / rect.width) * 100));
      const newValue = Math.round((newPercentage / 100) * goal.target_value!);

      onUpdateProgress(goal.id, newValue - goal.current_value);
    };

    return (
      <div className="mt-3 relative">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs text-gray-500 flex items-center gap-1">
            {isEditingProgress === 'current' ? (
              <input
                type="number"
                value={editProgressValue}
                onChange={(e) => setEditProgressValue(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    const newValue = parseInt(editProgressValue) || 0;
                    onUpdateProgress(goal.id, newValue - goal.current_value);
                    setIsEditingProgress(null);
                  }
                }}
                onBlur={() => setIsEditingProgress(null)}
                className="w-12 text-center bg-transparent border-b border-gray-300 focus:border-gray-500 focus:outline-none text-xs"
                autoFocus
              />
            ) : (
              <span
                className="cursor-pointer hover:bg-gray-100 rounded px-1 py-0.5"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditProgressValue(goal.current_value.toString());
                  setIsEditingProgress('current');
                }}
              >
                {goal.current_value}
              </span>
            )}
            <span>/</span>
            {isEditingProgress === 'target' ? (
              <input
                type="number"
                value={editProgressValue}
                onChange={(e) => setEditProgressValue(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    const newValue = parseInt(editProgressValue) || 1;
                    onUpdateGoalType(goal.id, {
                      goalType: 'progress',
                      currentValue: goal.current_value,
                      targetValue: newValue
                    });
                    setIsEditingProgress(null);
                  }
                }}
                onBlur={() => setIsEditingProgress(null)}
                className="w-12 text-center bg-transparent border-b border-gray-300 focus:border-gray-500 focus:outline-none text-xs"
                autoFocus
              />
            ) : (
              <span
                className="cursor-pointer hover:bg-gray-100 rounded px-1 py-0.5"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditProgressValue(goal.target_value?.toString() || '100');
                  setIsEditingProgress('target');
                }}
              >
                {goal.target_value}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUpdateProgress(goal.id, -1);
              }}
              className="w-5 h-5 rounded bg-gray-100 hover:bg-gray-200 transition-colors flex items-center justify-center disabled:opacity-50 text-xs font-mono"
              disabled={goal.current_value <= 0}
            >
              &lt;
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUpdateProgress(goal.id, 1);
              }}
              className="w-5 h-5 rounded bg-gray-100 hover:bg-gray-200 transition-colors flex items-center justify-center text-xs font-mono"
            >
              &gt;
            </button>
          </div>
        </div>
        <div
          className="w-full bg-gray-100 rounded-full h-2 cursor-pointer relative group"
          onClick={handleProgressClick}
          title={`Click to set progress: ${percentage}%`}
        >
          <div
            className="bg-indigo-500 h-full rounded-full transition-all duration-300 relative"
            style={{ width: `${percentage}%` }}
          >
            <div className="absolute right-0 top-1/2 transform translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-indigo-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing" />
          </div>
        </div>
      </div>
    );
  };

  const renderListItems = () => {
    if (goal.goal_type !== 'list') return null;

    const items = goal.list_items || [];
    const recentItems = items.slice(-3); // Show only the 3 most recent items

    const handleAddItem = () => {
      if (newListItem.trim()) {
        onAddListItem(goal.id, newListItem.trim());
        setNewListItem('');
        setIsAddingListItem(false);
      }
    };

    return (
      <div className="mt-3 space-y-2">
        {recentItems.length > 0 && (
          <div className="space-y-1">
            {recentItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between text-xs bg-slate-50 rounded-lg px-2 py-1.5">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Clock className="w-3 h-3 text-slate-400 flex-shrink-0" />
                  <span className="text-slate-700 truncate">{item.value}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-slate-400 text-xs">
                    {new Date(item.timestamp).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit'
                    })}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveListItem(goal.id, item.id);
                    }}
                    className="opacity-0 hover:opacity-100 w-4 h-4 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all flex items-center justify-center"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {isAddingListItem ? (
          <div className="flex gap-1">
            <input
              type="text"
              value={newListItem}
              onChange={(e) => setNewListItem(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleAddItem();
                }
                if (e.key === 'Escape') {
                  setIsAddingListItem(false);
                  setNewListItem('');
                }
              }}
              placeholder="e.g. 10:30 PM, Workout completed..."
              className="flex-1 text-xs px-2 py-1.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              autoFocus
            />
            <button
              onClick={handleAddItem}
              className="px-2 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-xs"
            >
              Add
            </button>
          </div>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsAddingListItem(true);
            }}
            className="w-full flex items-center justify-center gap-1 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg py-1.5 border border-dashed border-slate-300 hover:border-slate-400 transition-all"
          >
            <Plus className="w-3 h-3" />
            Add Entry
          </button>
        )}

        {items.length > 3 && (
          <div className="text-center">
            <span className="text-xs text-slate-400">
              +{items.length - 3} more entries
            </span>
          </div>
        )}
      </div>
    );
  };

  const renderControls = () => {
    if (goal.goal_type === 'basic') {
      return (
        <div className="flex items-center">
          {getGoalIcon()}
        </div>
      );
    }

    if (goal.goal_type === 'list') {
      return (
        <div className="flex items-center">
          {getGoalIcon()}
        </div>
      );
    }

    if (goal.goal_type === 'counter') {
      return (
        <div className="flex items-center gap-1">
          <div className="p-4 -m-4">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUpdateProgress(goal.id, -1);
              }}
              className="opacity-0 hover:opacity-100 w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 transition-all flex items-center justify-center disabled:opacity-50"
              disabled={goal.current_value <= 0}
            >
              <Minus className="w-4 h-4 text-gray-600" />
            </button>
          </div>
          {isEditingCounter ? (
            <input
              type="number"
              value={editCounterValue}
              onChange={(e) => setEditCounterValue(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  const newValue = parseInt(editCounterValue) || 0;
                  onUpdateProgress(goal.id, newValue - goal.current_value);
                  setIsEditingCounter(false);
                }
              }}
              onBlur={() => setIsEditingCounter(false)}
              className="text-sm font-medium text-gray-900 w-12 text-center bg-transparent border-b border-gray-300 focus:border-gray-500 focus:outline-none"
              autoFocus
            />
          ) : (
            <span
              className="text-sm font-medium text-gray-900 min-w-[2.5rem] text-center cursor-pointer hover:bg-gray-100 rounded px-1 py-0.5"
              onClick={(e) => {
                e.stopPropagation();
                setEditCounterValue(goal.current_value.toString());
                setIsEditingCounter(true);
              }}
            >
              {goal.current_value}
            </span>
          )}
          <div className="p-4 -m-4">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUpdateProgress(goal.id, 1);
              }}
              className="opacity-0 hover:opacity-100 w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 transition-all flex items-center justify-center"
            >
              <Plus className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>
      );
    }

    // Progress type - no icon needed
    return null;
  };

  if (viewMode === 'list') {
    return (
      <div
        key={goal.id}
        className={`group flex items-center gap-4 py-3 px-4 hover:bg-gray-50/50 rounded-lg transition-all ${
          isNew ? 'animate-fadeSlideIn' : ''
        } ${isCompleted() ? 'opacity-60' : ''}`}
        onClick={() => goal.goal_type === 'basic' && onToggleComplete(goal.id)}
      >
        {renderControls()}
        <div className="flex-1 min-w-0">
          <div
            className={`text-sm font-medium transition-all ${
              isCompleted()
                ? 'text-gray-400 line-through'
                : 'text-gray-900'
            }`}
          >
            {goal.title}
          </div>
          {renderProgressBar()}
          {renderListItems()}
        </div>
        <div className="relative -mr-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onShowSettings(goal, e.currentTarget);
            }}
            className="opacity-0 hover:opacity-100 p-3 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Kanban/Grid view
  return (
    <div
      key={goal.id}
      className={`group p-4 rounded-xl bg-white border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all cursor-pointer ${
        isNew ? 'animate-fadeSlideIn' : ''
      } ${isCompleted() ? 'opacity-60' : ''}`}
      onClick={() => goal.goal_type === 'basic' && onToggleComplete(goal.id)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {(goal.goal_type === 'basic' || goal.goal_type === 'list') && getGoalIcon()}
          <h3
            className={`text-sm font-medium ${
              isCompleted() ? 'text-gray-400 line-through' : 'text-gray-900'
            }`}
          >
            {goal.title}
          </h3>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onShowSettings(goal, e.currentTarget);
          }}
          className="opacity-0 hover:opacity-100 p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      {goal.goal_type === 'counter' && (
        <div className="flex items-center justify-center gap-2 mt-3">
          <div className="p-6 -m-6">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUpdateProgress(goal.id, -1);
              }}
              className="opacity-0 hover:opacity-100 w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 hover:scale-105 transition-all flex items-center justify-center disabled:opacity-50"
              disabled={goal.current_value <= 0}
            >
              <Minus className="w-5 h-5 text-gray-600" />
            </button>
          </div>
          {isEditingCounter ? (
            <input
              type="number"
              value={editCounterValue}
              onChange={(e) => setEditCounterValue(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  const newValue = parseInt(editCounterValue) || 0;
                  onUpdateProgress(goal.id, newValue - goal.current_value);
                  setIsEditingCounter(false);
                }
              }}
              onBlur={() => setIsEditingCounter(false)}
              className="text-xl font-semibold text-gray-900 w-16 text-center bg-transparent border-b border-gray-300 focus:border-gray-500 focus:outline-none"
              autoFocus
            />
          ) : (
            <span
              className="text-xl font-semibold text-gray-900 min-w-[3rem] text-center cursor-pointer hover:bg-gray-100 rounded px-2 py-1"
              onClick={(e) => {
                e.stopPropagation();
                setEditCounterValue(goal.current_value.toString());
                setIsEditingCounter(true);
              }}
            >
              {goal.current_value}
            </span>
          )}
          <div className="p-6 -m-6">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUpdateProgress(goal.id, 1);
              }}
              className="opacity-0 hover:opacity-100 w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 hover:scale-105 transition-all flex items-center justify-center"
            >
              <Plus className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      )}
      {goal.goal_type === 'progress' && (
        <div className="mt-3">
          {renderProgressBar()}
        </div>
      )}
      {goal.goal_type === 'list' && (
        <div className="mt-3">
          {renderListItems()}
        </div>
      )}
    </div>
  );
}
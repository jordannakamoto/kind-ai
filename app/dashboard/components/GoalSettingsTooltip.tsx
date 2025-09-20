import { useState, useRef, useEffect } from 'react';
import { X, Hash, Target, Circle, Trash2, List } from 'lucide-react';

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

interface GoalSettingsTooltipProps {
  goal: Goal;
  isOpen: boolean;
  onClose: () => void;
  onSave: (goalId: string, updates: {
    goalType: 'basic' | 'counter' | 'progress' | 'list';
    currentValue?: number;
    targetValue?: number;
  }) => void;
  onArchive: (goalId: string, reason: string) => void;
  triggerRef: React.RefObject<HTMLElement>;
}

export default function GoalSettingsTooltip({
  goal,
  isOpen,
  onClose,
  onSave,
  onArchive,
  triggerRef
}: GoalSettingsTooltipProps) {
  const [goalType, setGoalType] = useState<'basic' | 'counter' | 'progress' | 'list'>(goal.goal_type);
  const [currentValue, setCurrentValue] = useState(goal.current_value || 0);
  const [targetValue, setTargetValue] = useState(goal.target_value || 100);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleTypeChange = (newType: 'basic' | 'counter' | 'progress' | 'list') => {
    onSave(goal.id, {
      goalType: newType,
      currentValue: newType === 'basic' || newType === 'list' ? 0 : currentValue,
      targetValue: newType === 'progress' ? targetValue : undefined
    });
    onClose();
  };

  const handleArchive = (reason: string) => {
    onArchive(goal.id, reason);
    onClose();
  };

  return (
    <div
      ref={tooltipRef}
      className="bg-white rounded-lg shadow-lg border border-gray-100 p-3 w-44"
    >
      <div className="space-y-2">
        <div className="grid grid-cols-1 gap-1">
          <button
            onClick={() => handleTypeChange('basic')}
            className={`p-2 rounded text-left text-sm transition-all flex items-center gap-2 ${
              goalType === 'basic'
                ? 'bg-gray-100 text-gray-900'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Circle className="w-3 h-3 text-gray-600" />
            Basic
          </button>
          <button
            onClick={() => handleTypeChange('counter')}
            className={`p-2 rounded text-left text-sm transition-all flex items-center gap-2 ${
              goalType === 'counter'
                ? 'bg-gray-100 text-gray-900'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Hash className="w-3 h-3 text-blue-600" />
            Counter
          </button>
          <button
            onClick={() => handleTypeChange('progress')}
            className={`p-2 rounded text-left text-sm transition-all flex items-center gap-2 ${
              goalType === 'progress'
                ? 'bg-gray-100 text-gray-900'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Target className="w-3 h-3 text-indigo-600" />
            Progress
          </button>
          <button
            onClick={() => handleTypeChange('list')}
            className={`p-2 rounded text-left text-sm transition-all flex items-center gap-2 ${
              goalType === 'list'
                ? 'bg-gray-100 text-gray-900'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <List className="w-3 h-3 text-green-600" />
            List
          </button>
        </div>


      </div>

      <div className="pt-2 border-t border-gray-100">
        <button
          onClick={() => handleArchive('abandoned')}
          className="w-full flex items-center gap-2 px-2 py-2 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
        >
          <Trash2 className="w-3 h-3" />
          Delete
        </button>
      </div>
    </div>
  );
}
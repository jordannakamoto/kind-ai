'use client';

import { useState } from 'react';
import { Settings, ChevronDown, ChevronUp } from 'lucide-react';
import { MoodOption } from './MoodCustomizer';

interface MoodSelectorProps {
  moods: MoodOption[];
  selectedMood: string | undefined;
  selectedDate: Date;
  onMoodSelect: (date: Date, mood: string) => void;
  onCustomizeClick: () => void;
}

export default function MoodSelector({
  moods,
  selectedMood,
  selectedDate,
  onMoodSelect,
  onCustomizeClick
}: MoodSelectorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAll, setShowAll] = useState(false);

  // Show first 5 moods by default, with option to expand
  const visibleMoods = showAll ? moods : moods.slice(0, 5);
  const hasMore = moods.length > 5;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-base md:text-lg font-semibold text-gray-800">Today's Mood</h3>
        <button
          onClick={onCustomizeClick}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-all"
          title="Customize moods"
        >
          <Settings className="w-4 h-4" />
          <span className="hidden sm:inline">Customize</span>
        </button>
      </div>

      {/* Mood Options */}
      <div className="space-y-3">
        {/* Primary Row */}
        <div className="flex items-center space-x-3 overflow-x-auto pb-2">
          {visibleMoods.map((option) => (
            <button
              key={option.id}
              onClick={() => onMoodSelect(selectedDate, option.value)}
              className={`
                flex flex-col items-center space-y-1 px-4 py-3 rounded-lg transition-all duration-200 transform hover:scale-105 flex-shrink-0 border-2
                ${selectedMood === option.value
                  ? "font-semibold bg-blue-50 border-blue-300"
                  : "hover:bg-gray-50 border-transparent"}
              `}
            >
              <div className="flex items-center space-x-2">
                <span className="text-lg md:text-xl">{option.emoji}</span>
                <span className="text-xs md:text-sm capitalize font-medium whitespace-nowrap">{option.label}</span>
              </div>
              <div className={`w-12 h-0.5 rounded-full transition-opacity duration-300 ${option.dotColor.replace('bg-gradient-to-r', 'bg-gradient-to-r')} ${selectedMood === option.value ? 'opacity-100' : 'opacity-0'}`} />
            </button>
          ))}
        </div>

        {/* Expand/Collapse Button */}
        {hasMore && (
          <div className="flex justify-center">
            <button
              onClick={() => setShowAll(!showAll)}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-all"
            >
              {showAll ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  Show Less
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  Show More ({moods.length - 5} more)
                </>
              )}
            </button>
          </div>
        )}

        {/* Additional Moods (when expanded) */}
        {showAll && hasMore && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 pt-2 border-t border-gray-100">
            {moods.slice(5).map((option) => (
              <button
                key={option.id}
                onClick={() => onMoodSelect(selectedDate, option.value)}
                className={`
                  flex flex-col items-center space-y-2 px-3 py-3 rounded-lg transition-all duration-200 transform hover:scale-105 border-2
                  ${selectedMood === option.value
                    ? "font-semibold bg-blue-50 border-blue-300"
                    : "hover:bg-gray-50 border-transparent"}
                `}
              >
                <span className="text-2xl">{option.emoji}</span>
                <div className="text-center">
                  <div className="text-xs font-medium text-gray-700 capitalize">{option.label}</div>
                  <div className={`w-8 h-0.5 rounded-full mx-auto mt-1 transition-opacity duration-300 ${option.dotColor} ${selectedMood === option.value ? 'opacity-100' : 'opacity-0'}`} />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="text-xs text-gray-500 text-center">
        {moods.length} mood{moods.length !== 1 ? 's' : ''} available
        {moods.some(m => m.isCustom) && (
          <span className="ml-2 px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full">
            {moods.filter(m => m.isCustom).length} custom
          </span>
        )}
      </div>
    </div>
  );
}
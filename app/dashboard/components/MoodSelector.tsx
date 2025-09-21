'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus } from 'lucide-react';
import { MoodOption } from './MoodCustomizer';
import MoodCustomizer from './MoodCustomizer';

interface MoodSelectorProps {
  moods: MoodOption[];
  selectedMood: string | undefined;
  selectedDate: Date;
  onMoodSelect: (date: Date, mood: string) => void;
  onCustomizeClick: () => void;
  showMoodCustomizer: boolean;
  onMoodsUpdate: (moods: MoodOption[]) => void;
  onCustomizeClose: () => void;
}

export default function MoodSelector({
  moods,
  selectedMood,
  selectedDate,
  onMoodSelect,
  onCustomizeClick,
  showMoodCustomizer,
  onMoodsUpdate,
  onCustomizeClose
}: MoodSelectorProps) {
  const [customizerPosition, setCustomizerPosition] = useState({ x: 0, y: 0 });
  const plusButtonRef = useRef<HTMLButtonElement>(null);

  // Update position when customizer opens
  useEffect(() => {
    if (showMoodCustomizer && plusButtonRef.current) {
      const rect = plusButtonRef.current.getBoundingClientRect();
      setCustomizerPosition({
        x: rect.left,
        y: rect.top
      });
    }
  }, [showMoodCustomizer]);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-base md:text-lg font-semibold text-gray-800">Today's Mood</h3>
      </div>


      {/* Mood Options */}
      <div className="space-y-3">
        {/* Primary Row */}
        <div className="flex items-center space-x-3 overflow-x-auto pb-2 w-fit">
          {moods.map((option) => (
            <button
              key={option.id}
              onClick={() => onMoodSelect(selectedDate, option.value)}
              className={`
                flex flex-col items-center space-y-1 px-3 py-2 rounded-lg transition-all duration-200 transform hover:scale-105 flex-shrink-0 border-2
                ${selectedMood === option.value
                  ? "font-semibold border-transparent"
                  : "hover:bg-gray-50 border-transparent"}
              `}
            >
              <div className="flex items-center space-x-2">
                <span className="text-lg md:text-xl">{option.emoji}</span>
                <span className="text-xs md:text-sm capitalize font-medium whitespace-nowrap">{option.label}</span>
              </div>
              <div
                className={`w-12 h-0.5 rounded-full transition-opacity duration-300 ${selectedMood === option.value ? 'opacity-100' : 'opacity-0'} ${!option.isCustom ? option.dotColor : ''}`}
                style={option.isCustom && option.dotColor.includes('from-[') ? {
                  background: option.dotColor.match(/from-\[([^\]]+)\]/)?.[1] || '#10b981'
                } : {}}
              />
            </button>
          ))}

          {/* Morphing Plus Button / Customizer */}
          <div className="relative flex-shrink-0">
            <button
              ref={plusButtonRef}
              onClick={onCustomizeClick}
              className={`flex flex-col items-center space-y-1 px-3 py-2 rounded-lg transition-all duration-300 transform hover:scale-105 flex-shrink-0 border-2 border-dashed border-gray-300 hover:border-gray-400 text-gray-400 hover:text-gray-600 group ${
                showMoodCustomizer ? 'opacity-0 pointer-events-none' : ''
              }`}
              title="Customize moods"
            >
              <div className="flex items-center space-x-2">
                <Plus className="w-4 h-4" />
              </div>
              <div className="w-12 h-0.5 rounded-full bg-transparent" />
            </button>
          </div>

          {/* Portal the mood customizer to avoid container constraints */}
          {showMoodCustomizer && typeof window !== 'undefined' && createPortal(
            <div
              className="mood-morphing-container fixed z-50"
              style={{
                left: `${customizerPosition.x}px`,
                top: `${customizerPosition.y}px`
              }}
            >
              <MoodCustomizer
                currentMoods={moods}
                onMoodsUpdate={onMoodsUpdate}
                onClose={onCustomizeClose}
              />
            </div>,
            document.body
          )}
        </div>

      </div>

    </div>
  );
}
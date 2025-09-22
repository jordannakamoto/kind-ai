'use client';

import { useState, useRef, useEffect, Fragment } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X } from 'lucide-react';
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
  const [isEditMode, setIsEditMode] = useState(false);
  const [draggedMood, setDraggedMood] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [localMoods, setLocalMoods] = useState<MoodOption[]>(moods);
  const plusButtonRef = useRef<HTMLButtonElement>(null);

  // Update position when customizer opens
  useEffect(() => {
    if (showMoodCustomizer && plusButtonRef.current) {
      const rect = plusButtonRef.current.getBoundingClientRect();
      setCustomizerPosition({
        x: rect.left,
        y: rect.top
      });
      // Enter edit mode when customizer is shown
      setIsEditMode(true);
    } else {
      // Exit edit mode when customizer is closed
      setIsEditMode(false);
    }
  }, [showMoodCustomizer]);

  // Sync local moods with props
  useEffect(() => {
    setLocalMoods(moods);
  }, [moods]);


  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (!isEditMode) {
      e.preventDefault();
      return;
    }

    const moodId = localMoods[index].id;
    setDraggedMood(moodId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!isEditMode) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e: React.DragEvent, index: number) => {
    if (!isEditMode || !draggedMood) return;
    e.preventDefault();

    // Only update if different to reduce re-renders
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    // Simple leave handler
  };

  const handleDragEnd = () => {
    setDraggedMood(null);
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedMood || !isEditMode) return;

    const draggedIndex = localMoods.findIndex(m => m.id === draggedMood);
    if (draggedIndex === -1) return;

    // Calculate the actual drop position
    let targetIndex = dropIndex;
    if (draggedIndex < dropIndex) {
      targetIndex = dropIndex - 1;
    }

    if (draggedIndex === targetIndex) {
      setDraggedMood(null);
      setDragOverIndex(null);
      return;
    }

    const newMoods = [...localMoods];
    const [removed] = newMoods.splice(draggedIndex, 1);
    newMoods.splice(targetIndex, 0, removed);

    setLocalMoods(newMoods);
    onMoodsUpdate(newMoods);
    setDraggedMood(null);
    setDragOverIndex(null);
  };


  const handleDeleteMood = (moodId: string) => {
    const updatedMoods = localMoods.filter(m => m.id !== moodId);
    setLocalMoods(updatedMoods);
    onMoodsUpdate(updatedMoods);
  };

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
          {localMoods.map((option, index) => (
            <div
              key={option.id}
              className={`relative transition-all duration-200 ${
                isEditMode ? 'cursor-move' : ''
              } ${
                draggedMood === option.id ? 'opacity-50' : ''
              } ${
                dragOverIndex === index && draggedMood && draggedMood !== option.id ? 'transform translate-x-2' : ''
              }`}
              draggable={isEditMode}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => {
                if (!isEditMode || !draggedMood) return;
                e.preventDefault();
                if (dragOverIndex !== index) {
                  setDragOverIndex(index);
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                handleDrop(e, index);
              }}
              onDragEnd={handleDragEnd}
            >
              {/* Delete badge - show for all moods in edit mode */}
              {isEditMode && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleDeleteMood(option.id);
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDragStart={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  draggable={false}
                  className="mood-delete-button absolute -top-1 -left-1 z-20 w-5 h-5 bg-gray-400/80 rounded-full flex items-center justify-center shadow-sm hover:bg-red-500 transition-colors cursor-pointer"
                >
                  <X className="w-2.5 h-2.5 text-white pointer-events-none" />
                </button>
              )}

              <button
                onClick={() => !isEditMode && onMoodSelect(selectedDate, option.value)}
                disabled={isEditMode}
                className={`
                  flex flex-col items-center space-y-1 px-3 py-2 rounded-lg transition-all duration-200 transform flex-shrink-0 border-2
                  ${!isEditMode && 'hover:scale-105'}
                  ${isEditMode ? 'cursor-move' : 'cursor-pointer'}
                  ${selectedMood === option.value && !isEditMode
                    ? "font-semibold border-transparent"
                    : "hover:bg-gray-50 border-transparent"}
                `}
              >
                <div className="flex items-center space-x-2">
                  <span className="text-lg md:text-xl">{option.emoji}</span>
                  <span className="text-xs md:text-sm capitalize font-medium whitespace-nowrap">{option.label}</span>
                </div>
                <div
                  className={`w-12 h-0.5 rounded-full transition-opacity duration-300 ${selectedMood === option.value && !isEditMode ? 'opacity-100' : 'opacity-0'} ${!option.isCustom ? option.dotColor : ''}`}
                  style={option.isCustom && option.dotColor.includes('from-[') ? {
                    background: option.dotColor.match(/from-\[([^\]]+)\]/)?.[1] || '#10b981'
                  } : {}}
                />
              </button>
            </div>
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
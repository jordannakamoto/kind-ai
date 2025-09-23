'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
import { Plus, X } from 'lucide-react';

import MoodCustomizer from './MoodCustomizer';
import { MoodOption } from './MoodCustomizer';
import { createPortal } from 'react-dom';

interface MoodSelectorProps {
  moods: MoodOption[];
selectedMoods: string[]; // Changed from single to array
  selectedDate: Date;
  onMoodToggle: (date: Date, mood: string) => void; // Changed from select to toggle
  onCustomizeClick: () => void;
  showMoodCustomizer: boolean;
  onMoodsUpdate: (moods: MoodOption[]) => void;
  onCustomizeClose: () => void;
}

export default function MoodSelector({
  moods,
  selectedMoods,
  selectedDate,
  onMoodToggle,
  onCustomizeClick,
  showMoodCustomizer,
  onMoodsUpdate,
  onCustomizeClose
}: MoodSelectorProps) {
  const [customizerPosition, setCustomizerPosition] = useState({ x: 0, y: 0 });
  const [isEditMode, setIsEditMode] = useState(false);
  const [draggedMood, setDraggedMood] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [localMoods, setLocalMoods] = useState<MoodOption[]>(() => {
    // Initialize with localStorage if available, fallback to props
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('cachedMoodOptions');
        if (cached) {
          const parsedMoods = JSON.parse(cached);
          // Check if old format (has borderColor/dotColor/shadowColor) and clear cache if so
          if (parsedMoods.some((mood: any) => mood.borderColor || mood.dotColor || mood.shadowColor)) {
            localStorage.removeItem('cachedMoodOptions');
            return moods;
          }
          return parsedMoods;
        }
        return moods;
      } catch {
        return moods;
      }
    }
    return moods;
  });
  const [reorderSuccess, setReorderSuccess] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const plusButtonRef = useRef<HTMLButtonElement>(null);
  const successTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update position when customizer opens
  useEffect(() => {
    if (showMoodCustomizer && plusButtonRef.current) {
      const rect = plusButtonRef.current.getBoundingClientRect();
      setCustomizerPosition({
        x: rect.left,
        y: rect.bottom
      });
      // Enter edit mode when customizer is shown
      setIsEditMode(true);
    }
    // Don't automatically exit edit mode - let user exit manually
  }, [showMoodCustomizer]);

  // Exit edit mode only when customizer closes AND user isn't actively editing
  useEffect(() => {
    if (!showMoodCustomizer && !draggedMood && !reorderSuccess) {
      // Small delay to allow for quick successive operations
      const timer = setTimeout(() => {
        setIsEditMode(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [showMoodCustomizer, draggedMood, reorderSuccess]);

  // Sync local moods with props and cache them
  useEffect(() => {
    setLocalMoods(moods);
    // Cache to localStorage for next load
    try {
      localStorage.setItem('cachedMoodOptions', JSON.stringify(moods));
    } catch (error) {
      console.warn('Failed to cache mood options:', error);
    }

    // Enable transitions after props have loaded and settled
    if (!isHydrated) {
      const timer = setTimeout(() => {
        setIsHydrated(true);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [moods, isHydrated]);

  // Cleanup success timeout on unmount
  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
    };
  }, []);



  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (!isEditMode) {
      e.preventDefault();
      return;
    }

    const moodId = localMoods[index].id;
    setDraggedMood(moodId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());

    // Create a 1x1 transparent image to hide the drag ghost
    const img = new Image();
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=';
    e.dataTransfer.setDragImage(img, 0, 0);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedMood || dragOverIndex === null) return;

    const draggedIndex = localMoods.findIndex(m => m.id === draggedMood);
    if (draggedIndex === -1 || draggedIndex === dragOverIndex) {
      setDraggedMood(null);
      setDragOverIndex(null);
      return;
    }

    const newMoods = [...localMoods];
    const [removed] = newMoods.splice(draggedIndex, 1);

    if (dragOverIndex >= localMoods.length) {
      newMoods.push(removed);
    } else {
      const targetIndex = draggedIndex < dragOverIndex ? dragOverIndex - 1 : dragOverIndex;
      newMoods.splice(targetIndex, 0, removed);
    }

    setLocalMoods(newMoods);
    onMoodsUpdate(newMoods);

    // Update cache immediately for next load
    try {
      localStorage.setItem('cachedMoodOptions', JSON.stringify(newMoods));
    } catch (error) {
      console.warn('Failed to cache reordered moods:', error);
    }

    // Trigger success animation on the moved item
    const movedMoodId = localMoods[draggedIndex].id;
    setReorderSuccess(movedMoodId);

    // Clear success animation after a brief moment
    if (successTimeoutRef.current) {
      clearTimeout(successTimeoutRef.current);
    }
    successTimeoutRef.current = setTimeout(() => {
      setReorderSuccess(null);
    }, 500);

    setDraggedMood(null);
    setDragOverIndex(null);
  };

  const handleDragEnter = (e: React.DragEvent, index: number) => {
    if (!draggedMood) return;
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    // Always commit the current state, regardless of where drag ended
    if (draggedMood) {
      // If we have a dragged mood but no valid drop occurred,
      // the item should stay in its original position
      setDraggedMood(null);
      setDragOverIndex(null);
    }
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
        <div
          className={`flex items-center space-x-3 overflow-x-auto pb-2 ${isEditMode ? 'pr-12 pt-2 pl-2' : 'w-fit'}`}
          style={draggedMood ? { cursor: 'grabbing !important' } : {}}
        >
          {localMoods.map((option, index) => (
            <div
              key={option.id}
              className={`relative ${isHydrated ? 'transition-all duration-200' : ''} ${
                isEditMode ? 'cursor-grab select-none' : ''
              } ${
                draggedMood === option.id ? 'opacity-50' : ''
              } ${
                dragOverIndex === index && draggedMood && draggedMood !== option.id ? 'transform translate-x-2' : ''
              }`}
              style={draggedMood === option.id ? { cursor: 'grabbing !important' } : {}}
              draggable={isEditMode}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={handleDragOver}
              onDragEnter={(e) => handleDragEnter(e, index)}
              onDrop={handleDrop}
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
                onClick={() => !isEditMode && onMoodToggle(selectedDate, option.value)}
                disabled={isEditMode}
                className={`
                  flex flex-col items-center space-y-1 px-3 py-2 rounded-lg transition-all duration-200 transform flex-shrink-0 border-2
                  ${!isEditMode && 'hover:scale-105'}
                  ${isEditMode ? 'cursor-move' : 'cursor-pointer'}
                  ${selectedMoods.includes(option.value) && !isEditMode
                    ? "font-semibold border-transparent"
                    : "hover:bg-gray-50 border-transparent"}
                `}
              >
                <div className={`flex items-center space-x-2 ${isHydrated ? 'transition-all duration-300' : ''} ${
                  reorderSuccess === option.id ? 'scale-110 drop-shadow-md' : ''
                }`}>
                  <span className="text-lg md:text-xl">{option.emoji}</span>
                  <span className="text-xs md:text-sm capitalize font-medium whitespace-nowrap">{option.label}</span>
                </div>
                <div
                  className={`w-2 h-2 rounded-full transition-opacity duration-300 ${selectedMoods.includes(option.value) && !isEditMode ? 'opacity-100' : 'opacity-0'}`}
                  style={{
                    background: option.color || '#3b82f6'
                  }}
                />
              </button>
            </div>
          ))}

          {/* Drop zone at the end for last position */}
          {draggedMood && isEditMode && (
            <div
              className={`transition-all duration-200 ${
                dragOverIndex === localMoods.length
                  ? 'w-12 bg-blue-300/70 rounded-lg border-2 border-blue-400 border-dashed'
                  : 'w-8 bg-gray-200/50 rounded-lg border border-gray-300 border-dashed'
              }`}
              style={{ minHeight: '60px' }}
              onDragOver={handleDragOver}
              onDragEnter={(e) => {
                e.preventDefault();
                setDragOverIndex(localMoods.length);
              }}
              onDrop={handleDrop}
            />
          )}

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
                bottom: `${window.innerHeight - customizerPosition.y}px`
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
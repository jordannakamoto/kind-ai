'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus } from 'lucide-react';
import './animations.css';

export interface MoodOption {
  id: string;
  emoji: string;
  label: string;
  value: string;
  color: string;
  borderColor: string;
  dotColor: string;
  shadowColor: string;
  isCustom?: boolean;
}

interface MoodCustomizerProps {
  currentMoods: MoodOption[];
  onMoodsUpdate: (moods: MoodOption[]) => void;
  onClose?: () => void;
}

const defaultColors = [
  {
    name: 'Green',
    color: 'bg-gradient-to-br from-emerald-50 to-green-100',
    borderColor: 'border-emerald-300',
    dotColor: 'bg-gradient-to-r from-emerald-400 to-green-500',
    shadowColor: 'shadow-emerald-200/60'
  },
  {
    name: 'Blue',
    color: 'bg-gradient-to-br from-sky-50 to-blue-100',
    borderColor: 'border-sky-300',
    dotColor: 'bg-gradient-to-r from-sky-400 to-blue-500',
    shadowColor: 'shadow-sky-200/60'
  },
  {
    name: 'Purple',
    color: 'bg-gradient-to-br from-violet-50 to-purple-100',
    borderColor: 'border-violet-300',
    dotColor: 'bg-gradient-to-r from-violet-400 to-purple-500',
    shadowColor: 'shadow-violet-200/60'
  },
  {
    name: 'Pink',
    color: 'bg-gradient-to-br from-pink-50 to-rose-100',
    borderColor: 'border-pink-300',
    dotColor: 'bg-gradient-to-r from-pink-400 to-rose-500',
    shadowColor: 'shadow-pink-200/60'
  },
  {
    name: 'Orange',
    color: 'bg-gradient-to-br from-orange-50 to-amber-100',
    borderColor: 'border-orange-300',
    dotColor: 'bg-gradient-to-r from-orange-400 to-amber-500',
    shadowColor: 'shadow-orange-200/60'
  },
  {
    name: 'Red',
    color: 'bg-gradient-to-br from-rose-50 to-red-100',
    borderColor: 'border-rose-300',
    dotColor: 'bg-gradient-to-r from-rose-400 to-red-500',
    shadowColor: 'shadow-rose-200/60'
  }
];

// Comprehensive emoji categories
const emojiCategories = {
  'Smileys': [
    '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃',
    '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '☺️', '😚',
    '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭',
    '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄',
    '😬', '🤥', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢',
    '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '🥸',
    '😎', '🤓', '🧐', '😕', '😟', '🙁', '☹️', '😮', '😯', '😲',
    '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱',
    '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠'
  ],
  'Animals': [
    '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯',
    '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🐣',
    '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛',
    '🦋', '🐌', '🐞', '🐜', '🦟', '🦗', '🕷️', '🦂', '🐢', '🐍',
    '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠',
    '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍',
    '🦧', '🐘', '🦣', '🦏', '🦛', '🐪', '🐫', '🦒', '🦘', '🐃'
  ],
  'Food': [
    '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈',
    '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦',
    '🥬', '🥒', '🌶️', '🫑', '🌽', '🥕', '🫒', '🧄', '🧅', '🥔',
    '🍠', '🥐', '🥖', '🍞', '🥨', '🥯', '🧀', '🥚', '🍳', '🧈',
    '🥞', '🧇', '🥓', '🥩', '🍗', '🍖', '🌭', '🍔', '🍟', '🍕',
    '🥪', '🥙', '🧆', '🌮', '🌯', '🫔', '🥗', '🥘', '🫕', '🍝',
    '🍜', '🍲', '🍛', '🍣', '🍱', '🥟', '🦪', '🍤', '🍙', '🍚'
  ],
  'Nature': [
    '🌱', '🌿', '🍀', '🍃', '🍂', '🍁', '🌾', '🌵', '🌲', '🌳',
    '🌴', '🌊', '🌋', '🏔️', '⛰️', '🗻', '🏕️', '🏖️', '🏜️', '🏝️',
    '🌅', '🌄', '🌠', '🎆', '🎇', '🌈', '☀️', '🌤️', '⛅', '🌦️',
    '🌧️', '⛈️', '🌩️', '🌨️', '❄️', '☃️', '⛄', '🌬️', '💨', '🌪️',
    '🌫️', '🌙', '🌛', '🌜', '🌚', '🌝', '🌞', '⭐', '🌟', '💫',
    '✨', '☄️', '🪐', '🌍', '🌎', '🌏', '🌑', '🌒', '🌓', '🌔',
    '🌕', '🌖', '🌗', '🌘', '🔥', '💧', '🌊'
  ],
  'Objects': [
    '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱',
    '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🪃', '🥅', '⛳',
    '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛷', '⛸️',
    '🥌', '🎿', '⛷️', '🏂', '🪂', '🏋️', '🤼', '🤸', '⛹️', '🤺',
    '🏇', '🧘', '🏄', '🏊', '🤽', '🚣', '🧗', '🚵', '🚴', '🏆',
    '🥇', '🥈', '🥉', '🏅', '🎖️', '🏵️', '🎗️', '🎫', '🎟️', '🎪',
    '🤹', '🎭', '🩰', '🎨', '🎬', '🎤', '🎧', '🎼', '🎵', '🎶'
  ],
  'Hearts': [
    '❤️', '🧡', '💛', '💚', '💙', '💜', '🤎', '🖤', '🤍', '💔',
    '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '♥️'
  ]
};

export default function MoodCustomizer({ currentMoods, onMoodsUpdate, onClose }: MoodCustomizerProps) {
  const [moods, setMoods] = useState<MoodOption[]>(currentMoods);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [activeEmojiTab, setActiveEmojiTab] = useState('Smileys');
  const [selectedHue, setSelectedHue] = useState(0);
  const [selectedSaturation, setSelectedSaturation] = useState(50);
  const [selectedLightness, setSelectedLightness] = useState(50);
  const colorWheelRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const [newMood, setNewMood] = useState({
    emoji: '😊',
    label: '',
    value: '',
    colorTheme: defaultColors[0]
  });

  // Close pickers when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.emoji-picker-container')) {
        setShowEmojiPicker(false);
      }
      if (!target.closest('.color-picker-container')) {
        setShowColorPicker(false);
      }
    };

    if (showEmojiPicker || showColorPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEmojiPicker, showColorPicker]);

  // Close mood customizer when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.mood-customizer-morphed') && !target.closest('.mood-morphing-container')) {
        onClose?.();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Convert HSL to hex
  const hslToHex = (h: number, s: number, l: number) => {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  };

  // Handle color wheel interaction
  const handleColorWheelInteraction = (event: React.MouseEvent | MouseEvent) => {
    if (!colorWheelRef.current) return;

    const rect = colorWheelRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const x = event.clientX - centerX;
    const y = event.clientY - centerY;

    const angle = Math.atan2(y, x) * 180 / Math.PI;
    const distance = Math.sqrt(x * x + y * y);
    const radius = rect.width / 2;

    // Calculate hue from angle
    const hue = ((angle + 90) % 360 + 360) % 360;

    // Calculate saturation from distance (0 = center, 100 = edge)
    const saturation = Math.min(100, (distance / radius) * 100);

    setSelectedHue(hue);
    setSelectedSaturation(saturation);

    // Update color theme
    const hexColor = hslToHex(hue, saturation, selectedLightness);
    setNewMood({
      ...newMood,
      colorTheme: {
        name: 'Custom',
        color: `bg-gray-50`,
        borderColor: `border-gray-300`,
        dotColor: `bg-blue-500`,
        shadowColor: `shadow-gray-200/60`
      }
    });
  };

  const handleAddMoodAndSave = () => {
    if (!newMood.label.trim()) return;

    const customColor = hslToHex(selectedHue, selectedSaturation, selectedLightness);

    const newMoodOption: MoodOption = {
      id: `custom_${Date.now()}`,
      emoji: newMood.emoji,
      label: newMood.label.trim(),
      value: newMood.value.trim().toLowerCase(),
      color: `bg-gray-50`,
      borderColor: `border-gray-300`,
      dotColor: `bg-gradient-to-r from-[${customColor}] to-[${customColor}]`,
      shadowColor: `shadow-gray-200/60`,
      isCustom: true
    };

    const updatedMoods = [...moods, newMoodOption];
    setMoods(updatedMoods);
    onMoodsUpdate(updatedMoods);
    setNewMood({ emoji: '😊', label: '', value: '', colorTheme: defaultColors[0] });
    setSelectedHue(0);
    setSelectedSaturation(50);
    setSelectedLightness(50);
  };


  return (
    <div
      className="mood-customizer-morphed flex-shrink-0"
      style={{
        animation: 'moodCustomizerMorph 0.15s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards'
      }}
    >
      <div
        className="flex gap-3 items-center"
        style={{
          opacity: 0,
          animation: 'moodContentFadeIn 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards',
          animationDelay: '0.15s'
        }}
      >
        {/* Input */}
        <input
          type="text"
          placeholder="Add new mood..."
          value={newMood.label}
          onChange={(e) => {
            const label = e.target.value;
            setNewMood({
              ...newMood,
              label,
              value: label.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '_')
            });
          }}
          className="flex-1 px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400/40 transition-all bg-white placeholder-gray-400 shadow-sm"
        />

        {/* Emoji Picker */}
        <div className="relative emoji-picker-container">
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="w-10 h-10 text-lg border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all bg-white cursor-pointer flex items-center justify-center shadow-sm"
          >
            {newMood.emoji}
          </button>
          {showEmojiPicker && (
            <div className="fixed bottom-20 right-4 z-[60] bg-white rounded-xl border border-gray-200 shadow-xl w-80">
              {/* Tabs */}
              <div className="flex border-b border-gray-100 p-3 gap-1">
                {Object.keys(emojiCategories).map((category) => (
                  <button
                    key={category}
                    onClick={() => setActiveEmojiTab(category)}
                    className={`px-2 py-1 text-xs font-medium rounded-lg transition-colors ${
                      activeEmojiTab === category
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
              {/* Emoji Grid */}
              <div className="p-4 max-h-48 overflow-y-auto">
                <div className="grid grid-cols-8 gap-1">
                  {emojiCategories[activeEmojiTab as keyof typeof emojiCategories].map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => {
                        setNewMood({ ...newMood, emoji });
                        setShowEmojiPicker(false);
                      }}
                      className="w-8 h-8 text-lg hover:bg-gray-100/80 rounded-lg transition-colors flex items-center justify-center"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Color Picker */}
        <div className="relative color-picker-container">
          <button
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="w-10 h-10 border border-gray-200 rounded-xl hover:border-gray-300 transition-all cursor-pointer flex items-center justify-center shadow-sm"
            style={{ backgroundColor: hslToHex(selectedHue, selectedSaturation, selectedLightness) }}
          />
          {showColorPicker && (
            <div className="absolute bottom-12 right-0 z-[60] bg-white rounded-xl border border-gray-200 shadow-xl p-4">
              <div className="flex items-center gap-3">
                {/* Interactive HSV Color Wheel */}
                <div
                  ref={colorWheelRef}
                  className="relative w-32 h-32 cursor-crosshair"
                  onMouseDown={(e) => {
                    isDragging.current = true;
                    handleColorWheelInteraction(e);
                  }}
                  onMouseMove={(e) => {
                    if (isDragging.current) {
                      handleColorWheelInteraction(e);
                    }
                  }}
                  onMouseUp={() => isDragging.current = false}
                  onMouseLeave={() => isDragging.current = false}
                >
                  {/* HSV Color wheel background */}
                  <div className="absolute inset-0 rounded-full" style={{
                    background: `conic-gradient(
                      from 0deg,
                      hsl(0, 100%, 50%),
                      hsl(60, 100%, 50%),
                      hsl(120, 100%, 50%),
                      hsl(180, 100%, 50%),
                      hsl(240, 100%, 50%),
                      hsl(300, 100%, 50%),
                      hsl(360, 100%, 50%)
                    )`
                  }} />

                  {/* Saturation gradient overlay */}
                  <div className="absolute inset-0 rounded-full" style={{
                    background: `radial-gradient(circle, white 0%, transparent 70%)`
                  }} />

                  {/* Color picker indicator */}
                  <div
                    className="absolute w-3 h-3 border-2 border-white rounded-full pointer-events-none transform -translate-x-1/2 -translate-y-1/2"
                    style={{
                      left: `calc(50% + ${Math.cos((selectedHue - 90) * Math.PI / 180) * (selectedSaturation / 100) * 64}px)`,
                      top: `calc(50% + ${Math.sin((selectedHue - 90) * Math.PI / 180) * (selectedSaturation / 100) * 64}px)`,
                      backgroundColor: hslToHex(selectedHue, selectedSaturation, selectedLightness)
                    }}
                  />
                </div>

                {/* Vertical Lightness slider */}
                <div className="relative h-32 w-4">
                  {/* Slider track with color gradient */}
                  <div
                    className="absolute inset-0 w-4 rounded-full"
                    style={{
                      background: `linear-gradient(to top,
                        hsl(${selectedHue}, ${selectedSaturation}%, 0%),
                        hsl(${selectedHue}, ${selectedSaturation}%, 50%),
                        hsl(${selectedHue}, ${selectedSaturation}%, 100%))`
                    }}
                  />

                  {/* Clickable area for slider */}
                  <div
                    className="absolute inset-0 w-4 h-32 cursor-pointer"
                    onMouseDown={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const y = e.clientY - rect.top;
                      const percentage = ((rect.height - y) / rect.height) * 100;
                      setSelectedLightness(Math.max(0, Math.min(100, percentage)));

                      const handleMouseMove = (moveEvent: MouseEvent) => {
                        const newY = moveEvent.clientY - rect.top;
                        const newPercentage = ((rect.height - newY) / rect.height) * 100;
                        setSelectedLightness(Math.max(0, Math.min(100, newPercentage)));
                      };

                      const handleMouseUp = () => {
                        document.removeEventListener('mousemove', handleMouseMove);
                        document.removeEventListener('mouseup', handleMouseUp);
                      };

                      document.addEventListener('mousemove', handleMouseMove);
                      document.addEventListener('mouseup', handleMouseUp);
                    }}
                  />

                  {/* Slider thumb */}
                  <div
                    className="absolute w-4 h-2 border-2 border-white rounded-sm pointer-events-none shadow-sm"
                    style={{
                      top: `${100 - selectedLightness}%`,
                      backgroundColor: hslToHex(selectedHue, selectedSaturation, selectedLightness),
                      transform: 'translateY(-50%)'
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Add Button */}
        <button
          onClick={handleAddMoodAndSave}
          disabled={!newMood.label.trim()}
          className="px-4 py-2.5 bg-blue-500 text-white text-sm font-medium rounded-xl hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
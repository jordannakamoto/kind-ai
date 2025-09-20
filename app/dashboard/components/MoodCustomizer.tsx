'use client';

import { useState, useEffect } from 'react';
import { Plus, Settings, X, Palette, Save, Smile } from 'lucide-react';
import EmojiPicker from './EmojiPicker';
import ColorPicker from './ColorPicker';

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
  onClose: () => void;
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

const popularEmojis = [
  '😊', '😢', '😡', '😴', '😐', '🤗', '😍', '🤔', '😅', '😎',
  '🥳', '😌', '😤', '🙃', '😬', '🤯', '🥺', '😭', '🔥', '💪',
  '❤️', '🌟', '✨', '🌈', '☀️', '🌙', '⭐', '💫', '🎉', '🎊'
];

export default function MoodCustomizer({ currentMoods, onMoodsUpdate, onClose }: MoodCustomizerProps) {
  const [moods, setMoods] = useState<MoodOption[]>(currentMoods);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [newMood, setNewMood] = useState({
    emoji: '😊',
    label: '',
    value: '',
    colorTheme: defaultColors[0]
  });

  const handleAddMood = () => {
    if (!newMood.label.trim()) return;

    const newMoodOption: MoodOption = {
      id: `custom_${Date.now()}`,
      emoji: newMood.emoji,
      label: newMood.label.trim(),
      value: newMood.value.trim().toLowerCase(),
      color: newMood.colorTheme.color,
      borderColor: newMood.colorTheme.borderColor,
      dotColor: newMood.colorTheme.dotColor,
      shadowColor: newMood.colorTheme.shadowColor,
      isCustom: true
    };

    setMoods([...moods, newMoodOption]);
    setNewMood({ emoji: '😊', label: '', value: '', colorTheme: defaultColors[0] });
    setIsAddingNew(false);
  };

  const handleRemoveMood = (moodId: string) => {
    setMoods(moods.filter(mood => mood.id !== moodId));
  };

  const handleSave = () => {
    onMoodsUpdate(moods);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-100 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center">
              <Palette className="w-4 h-4 text-slate-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">Customize Moods</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-4 h-4 text-slate-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Current Moods */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">Your Moods <span className="text-slate-500 font-normal">({moods.length})</span></h3>
              {!isAddingNew && (
                <button
                  onClick={() => setIsAddingNew(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Mood
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3">
              {moods.map((mood) => (
                <div key={mood.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors">
                  <span className="text-2xl">{mood.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-slate-900 truncate">{mood.label}</div>
                    <div className="text-xs text-slate-500">{mood.value}</div>
                  </div>
                  <div className={`w-4 h-4 rounded-full ${mood.dotColor || 'bg-indigo-500'}`} />
                  {mood.isCustom && (
                    <button
                      onClick={() => handleRemoveMood(mood.id)}
                      className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4 text-slate-400 hover:text-slate-600" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Add New Mood */}
          {isAddingNew && (
            <div className="mt-6 space-y-4 p-5 bg-slate-50 rounded-xl border border-slate-200">
              <h3 className="text-sm font-semibold text-slate-800">Add New Mood</h3>

              {/* Emoji and Input */}
              <div className="flex gap-4 items-end">
                <div>
                  <label className="text-sm text-slate-600 font-medium">Emoji</label>
                  <button
                    onClick={() => setShowEmojiPicker(true)}
                    className="w-14 h-14 text-2xl border border-slate-300 rounded-xl hover:bg-slate-100 hover:border-slate-400 flex items-center justify-center transition-colors"
                  >
                    {newMood.emoji}
                  </button>
                </div>
                <div className="flex-1">
                  <label className="text-sm text-slate-600 font-medium">Mood Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Excited, Calm, Focused"
                    value={newMood.label}
                    onChange={(e) => {
                      const label = e.target.value;
                      setNewMood({
                        ...newMood,
                        label,
                        value: label.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '_')
                      });
                    }}
                    className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>

              {/* Color */}
              <div>
                <label className="text-sm text-slate-600 font-medium">Color Theme</label>
                <button
                  onClick={() => setShowColorPicker(true)}
                  className="w-full flex items-center gap-3 p-3 border border-slate-300 rounded-lg hover:bg-slate-100 hover:border-slate-400 transition-colors"
                >
                  <div className={`w-5 h-5 rounded-full ${newMood.colorTheme.dotColor}`} />
                  <span className="text-sm text-slate-700 font-medium">{newMood.colorTheme.name}</span>
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleAddMood}
                  disabled={!newMood.label.trim()}
                  className="flex-1 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Add Mood
                </button>
                <button
                  onClick={() => {
                    setIsAddingNew(false);
                    setNewMood({ emoji: '😊', label: '', value: '', colorTheme: defaultColors[0] });
                  }}
                  className="px-4 py-2.5 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-slate-200 bg-slate-50">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-slate-700 text-sm font-medium hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Save className="w-4 h-4" />
            Save Changes
          </button>
        </div>

        {/* Emoji Picker Modal */}
        {showEmojiPicker && (
          <EmojiPicker
            selectedEmoji={newMood.emoji}
            onEmojiSelect={(emoji) => setNewMood({ ...newMood, emoji })}
            onClose={() => setShowEmojiPicker(false)}
          />
        )}

        {/* Color Picker Modal */}
        {showColorPicker && (
          <ColorPicker
            selectedTheme={newMood.colorTheme}
            onColorSelect={(colorTheme) => setNewMood({ ...newMood, colorTheme })}
            onClose={() => setShowColorPicker(false)}
          />
        )}
      </div>
    </div>
  );
}
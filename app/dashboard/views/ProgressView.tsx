"use client";

import { addDays, eachDayOfInterval, endOfMonth, format, startOfMonth, startOfWeek, endOfWeek, isToday, isSameMonth, isSameDay } from "date-fns";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const moodOptions = [
  { 
    label: "😊", 
    value: "happy", 
    color: "bg-gradient-to-br from-emerald-50 to-green-100", 
    borderColor: "border-emerald-300", 
    dotColor: "bg-gradient-to-r from-emerald-400 to-green-500",
    shadowColor: "shadow-emerald-200/60"
  },
  { 
    label: "😐", 
    value: "neutral", 
    color: "bg-gradient-to-br from-amber-50 to-yellow-100", 
    borderColor: "border-amber-300", 
    dotColor: "bg-gradient-to-r from-amber-400 to-orange-400",
    shadowColor: "shadow-amber-200/60"
  },
  { 
    label: "😢", 
    value: "sad", 
    color: "bg-gradient-to-br from-sky-50 to-blue-100", 
    borderColor: "border-sky-300", 
    dotColor: "bg-gradient-to-r from-sky-400 to-blue-500",
    shadowColor: "shadow-sky-200/60"
  },
  { 
    label: "😡", 
    value: "angry", 
    color: "bg-gradient-to-br from-rose-50 to-red-100", 
    borderColor: "border-rose-300", 
    dotColor: "bg-gradient-to-r from-rose-400 to-red-500",
    shadowColor: "shadow-rose-200/60"
  },
  { 
    label: "😴", 
    value: "tired", 
    color: "bg-gradient-to-br from-violet-50 to-purple-100", 
    borderColor: "border-violet-300", 
    dotColor: "bg-gradient-to-r from-violet-400 to-purple-500",
    shadowColor: "shadow-violet-200/60"
  },
];

const journalPrompts = [
  "What made you smile today?",
  "What challenged you today?",
  "What are you grateful for?",
  "How did you care for yourself today?",
  "What is something you're looking forward to?",
];

export default function ProgressView() {
  const [moods, setMoods] = useState<Record<string, string>>({});
  const [journalEntries, setJournalEntries] = useState<Record<string, string>>({});
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  // Generate calendar grid including days from previous/next month
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  
  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate
  });

  const promptIndex = selectedDate.getDate() % journalPrompts.length;
  const prompt = journalPrompts[promptIndex];

  const handleMoodSelect = (date: Date, mood: string) => {
    const formattedDate = format(date, "yyyy-MM-dd");
    setMoods((prev) => ({ ...prev, [formattedDate]: mood }));
  };

  const handleJournalChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const formattedDate = format(selectedDate, "yyyy-MM-dd");
    setJournalEntries((prev) => ({ ...prev, [formattedDate]: value }));
  };

  const changeDayFocus = (date: Date) => {
    setSelectedDate(date);
  };

  const changeMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      newMonth.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1));
      return newMonth;
    });
  };

  return (
    <div className="max-w-4xl mt-2 mx-auto p-4 pl-20 space-y-2 bg-white min-h-[calc(100vh+200px)]">
      {/* Header */}
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-semibold text-gray-800">Your Wellness Journey</h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setCurrentMonth(new Date())}
            className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition"
          >
            Today
          </button>
          <div className="flex items-center space-x-1">
            <button 
              onClick={() => changeMonth('prev')} 
              className="p-1.5 hover:bg-gray-100 rounded-lg transition"
            >
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            </button>
            <span className="px-3 py-1 text-sm font-medium text-gray-700 min-w-[120px] text-center">
              {format(currentMonth, "MMMM yyyy")}
            </span>
            <button 
              onClick={() => changeMonth('next')} 
              className="p-1.5 hover:bg-gray-100 rounded-lg transition"
            >
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-gradient-to-br from-slate-50 to-blue-50/30 rounded-xl">
        {/* Day Headers */}
        <div className="grid grid-cols-7 border-b border-blue-100 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 rounded-t-xl">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar Days */}
        <div className="grid grid-cols-7">
          {calendarDays.map((date, index) => {
            const formattedDate = format(date, "yyyy-MM-dd");
            const mood = moods[formattedDate];
            const hasJournal = journalEntries[formattedDate];
            const isSelected = isSameDay(selectedDate, date);
            const isCurrentMonth = isSameMonth(date, currentMonth);
            const isTodayDate = isToday(date);
            const moodOption = mood ? moodOptions.find(m => m.value === mood) : null;

            return (
              <div
                key={formattedDate}
                onClick={() => changeDayFocus(date)}
                className={`
                  relative min-h-[60px] p-2 cursor-pointer transition-all duration-200
                  ${isSelected 
                    ? 'bg-gradient-to-br from-blue-100 to-indigo-100 border-2 border-blue-400' 
                    : 'border-r border-b border-blue-100/50 ' + 
                      (index % 7 === 0 ? 'border-l' : '') + ' ' +
                      (index % 7 === 6 ? 'border-r' : '')
                  }
                  ${!isCurrentMonth ? 'bg-slate-50/50 text-gray-400' : 'bg-white/70 text-gray-900 hover:bg-blue-50/40'}
                  ${isTodayDate ? 'font-bold' : ''}
                `}
              >
                <div className="flex justify-between items-start">
                  <span className={`
                    text-xs transition-all ${isTodayDate ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-2 py-1 rounded-full shadow-sm' : ''}
                  `}>
                    {format(date, "d")}
                  </span>
                  {mood && (
                    <span className="text-sm drop-shadow-sm">{moodOption?.label}</span>
                  )}
                </div>
                
                {/* Indicators */}
                <div className="absolute bottom-1.5 left-2 right-2 flex gap-1">
                  {mood && (
                    <div className={`w-1.5 h-1.5 rounded-full ${moodOption?.dotColor} ${moodOption?.shadowColor} shadow-sm`} />
                  )}
                  {hasJournal && (
                    <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-indigo-400 to-purple-400 shadow-sm" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mood Selector */}
      <div className="mt-4">
        <div className="mb-2 ml-2">
          <span className="text-xs font-medium text-gray-600">mood</span>
        </div>
        <div className="flex items-center space-x-3">
          {moodOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => handleMoodSelect(selectedDate, option.value)}
              className={`
                flex flex-col items-center space-y-1 px-4 py-3 transition-all duration-200 transform hover:scale-105
                ${moods[format(selectedDate, "yyyy-MM-dd")] === option.value 
                  ? "font-semibold" 
                  : ""}
              `}
            >
              <div className="flex items-center space-x-2">
                <span className="text-xl">{option.label}</span>
                <span className="text-sm capitalize font-medium">{option.value}</span>
              </div>
              <div className={`w-12 h-0.5 rounded-full transition-opacity duration-300 ${option.dotColor.replace('bg-gradient-to-r', 'bg-gradient-to-r')} ${moods[format(selectedDate, "yyyy-MM-dd")] === option.value ? 'opacity-100' : 'opacity-0'}`} />
            </button>
          ))}
        </div>
      </div>

      {/* Journal Entry */}
      <div className="mt-4">
        <div className="flex items-center justify-between mb-2">
          {journalEntries[format(selectedDate, "yyyy-MM-dd")] && (
            <span className="text-xs text-green-600 font-medium">Saved ✓</span>
          )}
        </div>
        
        <div className="relative bg-white p-6 rounded-lg border border-gray-100 shadow-sm min-h-[300px] overflow-visible">
          <div className="mb-4 pb-2 border-b border-gray-100">
            <h3 className="text-base font-medium text-gray-800">
              Daily Reflection
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              {format(selectedDate, "EEEE, MMMM d, yyyy")}
            </p>
          </div>
          <textarea
            className="
              w-full px-0 py-0 border-0 bg-transparent
              text-sm focus:outline-none 
              resize-none min-h-[220px] 
              placeholder:text-gray-400 placeholder:italic
              leading-relaxed
              text-gray-700
              font-light
            "
            placeholder={prompt}
            value={journalEntries[format(selectedDate, "yyyy-MM-dd")] || ""}
            onChange={handleJournalChange}
          />
        </div>
      </div>

    </div>
  );
}
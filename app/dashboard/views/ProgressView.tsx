"use client";

import { addDays, eachDayOfInterval, endOfMonth, format, startOfMonth, startOfWeek, endOfWeek, isToday, isSameMonth, isSameDay } from "date-fns";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const moodOptions = [
  { label: "😊", value: "happy", color: "bg-green-100", borderColor: "border-green-300", dotColor: "bg-green-500" },
  { label: "😐", value: "neutral", color: "bg-yellow-100", borderColor: "border-yellow-300", dotColor: "bg-yellow-500" },
  { label: "😢", value: "sad", color: "bg-blue-100", borderColor: "border-blue-300", dotColor: "bg-blue-500" },
  { label: "😡", value: "angry", color: "bg-red-100", borderColor: "border-red-300", dotColor: "bg-red-500" },
  { label: "😴", value: "tired", color: "bg-purple-100", borderColor: "border-purple-300", dotColor: "bg-purple-500" },
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
    <div className="max-w-4xl mt-4 mx-auto p-6 pl-20 space-y-4 bg-white min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Your Wellness Journey</h2>
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
      <div className="bg-gradient-to-br from-slate-50 to-blue-50/30 rounded-xl shadow-md border border-blue-100">
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
                  relative min-h-[60px] p-2 border-r border-b border-blue-100/50 cursor-pointer transition-all duration-200
                  ${index % 7 === 6 ? 'border-r-0' : ''}
                  ${!isCurrentMonth ? 'bg-slate-50/50 text-gray-400' : 'bg-white/70 text-gray-900 hover:bg-blue-50/40'}
                  ${isSelected ? 'bg-gradient-to-br from-blue-100 to-indigo-100 ring-2 ring-blue-300 shadow-sm' : ''}
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
                    <div className={`w-1.5 h-1.5 rounded-full ${moodOption?.dotColor} shadow-sm`} />
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
      <div className="mt-6">
        <h3 className="text-sm font-medium text-gray-700 mb-3">
          How are you feeling on {format(selectedDate, "MMM d")}?
        </h3>
        <div className="flex items-center space-x-4">
          {moodOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => handleMoodSelect(selectedDate, option.value)}
              className={`
                flex items-center space-x-2 px-3 py-2 rounded-lg transition-all
                ${moods[format(selectedDate, "yyyy-MM-dd")] === option.value 
                  ? `${option.color} ${option.borderColor} border-2 font-medium` 
                  : "hover:bg-gray-50 border border-gray-200"}
              `}
            >
              <span className="text-lg">{option.label}</span>
              <span className="text-sm capitalize">{option.value}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Journal Entry */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-700">
            Daily Reflection - {format(selectedDate, "EEEE, MMMM d, yyyy")}
          </h3>
          {journalEntries[format(selectedDate, "yyyy-MM-dd")] && (
            <span className="text-xs text-green-600 font-medium">Saved ✓</span>
          )}
        </div>
        
        <p className="text-sm text-gray-600 italic mb-2">
          Today's prompt: {prompt}
        </p>
        
        <textarea
          className="
            w-full p-3 border border-gray-300 rounded-lg 
            text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 
            focus:border-blue-500 transition-all
            resize-none min-h-[100px] bg-gray-50 focus:bg-white
            placeholder:text-gray-400
          "
          placeholder="Write your thoughts here..."
          value={journalEntries[format(selectedDate, "yyyy-MM-dd")] || ""}
          onChange={handleJournalChange}
        />
      </div>

    </div>
  );
}
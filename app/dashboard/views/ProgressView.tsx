"use client";

import { addDays, eachDayOfInterval, endOfMonth, format, startOfMonth } from "date-fns";
import { useEffect, useState } from "react";

const moodOptions = [
  { label: "😊", value: "happy", color: "bg-green-100" },
  { label: "😐", value: "neutral", color: "bg-yellow-100" },
  { label: "😢", value: "sad", color: "bg-blue-100" },
  { label: "😡", value: "angry", color: "bg-red-100" },
  { label: "😴", value: "tired", color: "bg-purple-100" },
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

  // Generate days for the current month
  const monthDays = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
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
    <div className="max-w-4xl mt-4 mx-auto p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-900">Your Wellness Journey</h2>
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => changeMonth('prev')} 
            className="p-2 rounded-full hover:bg-gray-200 transition"
          >
            ←
          </button>
          <span className="text-lg font-medium text-gray-700">
            {format(currentMonth, "MMMM yyyy")}
          </span>
          <button 
            onClick={() => changeMonth('next')} 
            className="p-2 rounded-full hover:bg-gray-200 transition"
          >
            →
          </button>
        </div>
      </div>

      {/* Mood Calendar */}
      <div className="grid grid-cols-7 gap-2 bg-white rounded-xl shadow-md p-4">
        {monthDays.map((date) => {
          const formattedDate = format(date, "yyyy-MM-dd");
          const mood = moods[formattedDate];
          const isSelected = format(selectedDate, "yyyy-MM-dd") === formattedDate;

          return (
            <div
              key={formattedDate}
              onClick={() => changeDayFocus(date)}
              className={`
                relative p-2 rounded-lg cursor-pointer transition-all duration-300 
                ${isSelected ? "ring-2 ring-blue-500 scale-105" : "hover:bg-gray-100"}
                ${mood ? moodOptions.find(m => m.value === mood)?.color : ""}
              `}
            >
              <div className="text-xs text-gray-500 text-center mb-1">
                {format(date, "d")}
              </div>
              {mood && (
                <div className="absolute top-0 right-0 text-xs">
                  {moodOptions.find(m => m.value === mood)?.label}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Mood Selector */}
      <div className="flex justify-center space-x-4 py-4">
        {moodOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => handleMoodSelect(selectedDate, option.value)}
            className={`
              text-4xl transition-all duration-300 
              ${moods[format(selectedDate, "yyyy-MM-dd")] === option.value 
                ? "scale-125 shadow-lg" 
                : "opacity-50 hover:opacity-100 hover:scale-110"}
            `}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Journal Prompt */}
      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-semibold text-gray-800 mb-1">
              Mini Journal – {format(selectedDate, "MMM d, yyyy")}
            </h3>
            <p className="text-sm text-gray-500 italic">
              {prompt}
            </p>
          </div>
          {journalEntries[format(selectedDate, "yyyy-MM-dd")] && (
            <span className="text-green-600 font-medium text-sm">
              Saved ✓
            </span>
          )}
        </div>
        <textarea
          className="
            w-full p-4 border-2 border-gray-200 rounded-lg 
            text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 
            focus:border-transparent transition duration-300
            resize-none min-h-[150px]
          "
          placeholder="Write your thoughts here..."
          value={journalEntries[format(selectedDate, "yyyy-MM-dd")] || ""}
          onChange={handleJournalChange}
        />
      </div>
    </div>
  );
}
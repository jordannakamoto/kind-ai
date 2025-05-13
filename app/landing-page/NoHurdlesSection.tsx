"use client";

import { CalendarX, Clock, PiggyBank } from 'lucide-react';

import React from 'react';

const benefitsData = [
  {
    id: 1,
    iconElement: <CalendarX />, // Icon component
    title: "No Appointments",
    rotation: "-rotate-1.5 group-hover:rotate-0", // Slightly more distinct rotation
    type: "edge", // To identify edge boxes
    hoverAccentColor: "group-hover:text-indigo-500",
    hoverBorderColor: "hover:border-indigo-300/80",
  },
  {
    id: 2,
    iconElement: <Clock />,
    title: "No Scheduling",
    rotation: "rotate-1 group-hover:rotate-0",
    type: "center", // Central box
    hoverAccentColor: "group-hover:text-teal-500",
    hoverBorderColor: "hover:border-teal-300/80",
  },
  {
    id: 3,
    iconElement: <PiggyBank />,
    title: "No Expensive Visits",
    rotation: "rotate-1.5 group-hover:rotate-0",
    type: "edge",
    hoverAccentColor: "group-hover:text-amber-500",
    hoverBorderColor: "hover:border-amber-300/80",
  },
];

export const NoHurdlesSection: React.FC = () => {
  const iconSizeClass = "w-5 h-5 sm:w-6 sm:h-6"; // Reduced icon size
  const iconStrokeWidth = 1.25; // Thinner stroke for understatement

  return (
    <section className="py-20 md:py-28 bg-gradient-to-b from-white via-slate-50 to-white"> {/* Lighter gradient */}
      <div className="container mx-auto px-6 text-center">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 md:gap-6 mb-12 md:mb-16 max-w-4xl mx-auto">
          {benefitsData.map((benefit) => {
            let boxBaseClasses = `group bg-white p-6 py-8 sm:p-7 sm:py-9 rounded-xl 
                                  border-2 transform transition-all duration-300 ease-in-out ${benefit.rotation} ${benefit.hoverBorderColor}`;
            let iconContainerClasses = `mx-auto mb-3 flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gray-100 group-hover:bg-gray-200/70 transition-colors`;
            let titleClasses = "text-md sm:text-lg font-medium text-gray-600 group-hover:text-gray-800 transition-colors";


            if (benefit.type === "edge") {
              boxBaseClasses += " opacity-80 group-hover:opacity-100 scale-95 group-hover:scale-100 border-gray-200/60 shadow-lg group-hover:shadow-xl";
              // Edge boxes start slightly faded and smaller, come into focus on hover
            } else { // center
              boxBaseClasses += " opacity-100 scale-100 group-hover:scale-105 border-gray-300/70 shadow-xl group-hover:shadow-2xl z-10";
              // Center box is prominent, slightly larger hover effect
            }

            return (
              <div key={benefit.id} className={boxBaseClasses}>
                <div className={iconContainerClasses}>
                  {React.cloneElement(benefit.iconElement, {
                    className: `${iconSizeClass} text-gray-400 ${benefit.hoverAccentColor} transition-colors`,
                    strokeWidth: iconStrokeWidth,
                  })}
                </div>
                <h3 className={titleClasses}>
                  {benefit.title}
                </h3>
              </div>
            );
          })}
        </div>

        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-5 tracking-tight leading-tight">
            Find Time To Work On You.
          </h2>
          <p className="text-lg md:text-xl text-gray-600 leading-relaxed">
            Get started on your mental wellness without the common hurdles. Kind AI is available whenever and wherever you need it.
          </p>
        </div>
      </div>
    </section>
  );
};
// src/components/CapabilitiesSection.tsx
"use client";

import { Brain, Cpu, Sparkles, Target, ThumbsUp, Voicemail } from 'lucide-react'; // Adjust icons as needed
import { useEffect, useRef, useState } from 'react';

import Image from 'next/image';

// --- Data for the Capabilities Section ---
// You can pass this data as a prop or define it within the component if it's static
const capabilitiesData = [
  {
    id: 1,
    titleLeft: "Advanced AI Core",
    titleRight: "Powered by Gemini & ElevenLabs",
    descriptionRight: "Kind AI leverages Google's cutting-edge Gemini models for deep contextual understanding and ElevenLabs' industry-leading voice synthesis for remarkably natural and empathetic conversations. This powerful combination forms the heart of our intelligent support system.",
    imageRightSrc: "/images/capabilities/ai-core-conceptual.jpg", // Abstract AI graphic or logos
    logosRight: [
      { src: "/logos/google-gemini-logo.svg", alt: "Google Gemini Logo", width: 100, height: 30 },
      { src: "/logos/elevenlabs-logo.svg", alt: "ElevenLabs Logo", width: 100, height: 30 }
    ]
  },
  {
    id: 2,
    titleLeft: "Goal & Theme Tracking",
    titleRight: "Track Your Journey, Identify Themes",
    descriptionRight: "Set personal wellness goals and let Kind AI help you monitor your progress. Our system is designed to identify recurring themes in your conversations, offering insights into your emotional patterns and areas for growth. (Feature in Alpha development)",
    imageRightSrc: "/images/capabilities/goals-themes-screenshot.png",
    logosRight: []
  },
  {
    id: 3,
    titleLeft: "Insightful AI Feedback",
    titleRight: "Receive Gentle, Constructive Insights",
    descriptionRight: "Kind AI is being trained to provide thoughtful feedback based on your dialogue. Discover new perspectives, identify cognitive patterns, and receive AI-generated prompts to deepen self-understanding and foster positive change. (Feature in Alpha development)",
    imageRightSrc: "/images/capabilities/feedback-screenshot.png",
    logosRight: []
  }
];

interface Capability {
  id: number;
  titleLeft: string;
  titleRight?: string;
  descriptionRight: string;
  imageRightSrc?: string;
  logosRight?: { src: string; alt: string; width: number; height: number }[];
}

interface CapabilitiesSectionProps {
  // You can add props here if you want to customize it, e.g., pass capabilitiesData
  // capabilities?: Capability[];
}

export default function CapabilitiesSection({ /* capabilities = capabilitiesData */ }: CapabilitiesSectionProps) {
  const [currentCapabilityIndex, setCurrentCapabilityIndex] = useState(0);
  const capabilityIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const leftTitleRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Data to use (either from props or defined internally)
  const dataToUse = capabilitiesData; // Or: props.capabilities || capabilitiesData;

  useEffect(() => {
    capabilityIntervalRef.current = setInterval(() => {
      setCurrentCapabilityIndex((prevIndex) => (prevIndex + 1) % dataToUse.length);
    }, 5000); // Change capability every 5 seconds

    return () => {
      if (capabilityIntervalRef.current) clearInterval(capabilityIntervalRef.current);
    };
  }, [dataToUse.length]); // Re-run if data length changes

  useEffect(() => {
    if (leftTitleRefs.current[currentCapabilityIndex]) {
      leftTitleRefs.current[currentCapabilityIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [currentCapabilityIndex]);

  const handleTitleClick = (index: number) => {
    setCurrentCapabilityIndex(index);
    if (capabilityIntervalRef.current) clearInterval(capabilityIntervalRef.current);
    // Optionally restart the interval after a manual click and a delay:
    // capabilityIntervalRef.current = setInterval(() => { ... }, 5000);
  };

  return (
    <section className="py-20 md:py-28 bg-white"> {/* Or bg-gray-50/70 for slight contrast */}
      <div className="container mx-auto px-6">
        <div className="text-center mb-16 md:mb-20">
          <div className="inline-block p-3 mb-4 bg-indigo-100 rounded-full">
            <Sparkles className="w-9 h-9 text-indigo-600" strokeWidth={1.5} />
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-5 tracking-tight">
            Key Capabilities, Unveiled.
          </h2>
          <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
            Discover the core functionalities that make Kind AI a unique companion for your mental wellness journey.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-10 lg:gap-16 items-start">
          {/* Left Side: Vertical Title Scroller */}
          <div className="lg:w-1/3 w-full lg:sticky lg:top-28 self-start"> {/* self-start for sticky behavior */}
            <div className="space-y-3 lg:max-h-[calc(100vh-12rem)] lg:overflow-y-auto pr-4 soft-scrollbar">
              {dataToUse.map((cap, index) => (
                <button
                  key={cap.id}
                  ref={el => { leftTitleRefs.current[index] = el; }}
                  onClick={() => handleTitleClick(index)}
                  className={`w-full text-left p-4 rounded-lg transition-all duration-300 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500
                              ${currentCapabilityIndex === index
                                ? 'bg-indigo-600 text-white shadow-lg scale-105'
                                : 'bg-gray-100 hover:bg-indigo-50 text-gray-700 hover:text-indigo-700'}`}
                >
                  <h3 className="text-lg font-semibold">{cap.titleLeft}</h3>
                </button>
              ))}
            </div>
          </div>

          {/* Right Side: Content Display */}
          <div className="lg:w-2/3 w-full min-h-[350px] md:min-h-[450px] relative"> {/* Increased min-height */}
            {dataToUse.map((cap, index) => (
              <div
                key={cap.id}
                className={`absolute inset-0 transition-opacity duration-700 ease-in-out flex flex-col
                            ${currentCapabilityIndex === index ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}
              >
                <div className="bg-white p-6 md:p-8 rounded-xl shadow-2xl w-full flex flex-col flex-grow"> {/* flex-grow for bottom content */}
                  <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4 tracking-tight">{cap.titleRight || cap.titleLeft}</h3>
                  <p className="text-gray-700 leading-relaxed mb-6">{cap.descriptionRight}</p>
                  {cap.imageRightSrc && (
                    <div className="mb-6 rounded-lg overflow-hidden shadow-lg aspect-video relative">
                      <Image
                        src={cap.imageRightSrc}
                        alt={cap.titleRight || cap.titleLeft}
                        fill // Use fill with a positioned parent
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" // Example sizes
                        className="object-cover"
                      />
                    </div>
                  )}
                  {cap.logosRight && cap.logosRight.length > 0 && (
                    <div className="flex items-center gap-4 sm:gap-6 opacity-80 mt-auto pt-4 border-t border-gray-200"> {/* Changed to gap-4 or sm:gap-6 */}
                      <span className="text-xs text-gray-500 uppercase font-semibold">Powered by:</span>
                      {cap.logosRight.map(logo => (
                        <div key={logo.alt} className="relative h-6 sm:h-7 md:h-8" style={{width: logo.width * ( (window.innerWidth < 640 ? 0.7 : window.innerWidth < 768 ? 0.8 : 1) * (logo.height / (window.innerWidth < 640 ? 24 : window.innerWidth < 768 ? 28 : 32))) }}> {/* Dynamic width based on aspect ratio & height */}
                           <Image src={logo.src} alt={logo.alt} layout="fill" objectFit="contain" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Simple CSS for custom scrollbar (optional, add to global CSS or <style jsx global>) */}
      <style jsx global>{`
        .soft-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .soft-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .soft-scrollbar::-webkit-scrollbar-thumb {
          background: #e0e7ff; // indigo-100
          border-radius: 10px;
        }
        .soft-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #c7d2fe; // indigo-200
        }
      `}</style>
    </section>
  );
}
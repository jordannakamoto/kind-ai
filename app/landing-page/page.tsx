"use client";

import {
  BarChart3,
  Brain,
  CalendarX,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Headphones,
  Lock,
  PiggyBank,
  Sparkles,
  ThumbsUp,
  Zap,
  MessageCircle,
  Shield,
  Heart
} from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { FcGoogle } from 'react-icons/fc';
import { supabase } from '@/supabase/client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { NoHurdlesSection } from './NoHurdlesSection';
import {TestimonialsSection} from './TestimonialsSection';

// --- Data for "What You'll Experience" cards ---
const alphaExperiencePillars = [
  {
    icon: <Headphones className="w-6 h-6 text-gray-700" strokeWidth={1.5} />,
    title: "Voice-First Therapy",
    description: "Natural conversations that flow like speaking with a trusted friend who truly listens."
  },
  {
    icon: <Brain className="w-6 h-6 text-gray-700" strokeWidth={1.5} />,
    title: "Personalized Understanding",
    description: "AI that learns your patterns, remembers your journey, and adapts to your unique needs."
  },
  {
    icon: <Lock className="w-6 h-6 text-gray-700" strokeWidth={1.5} />,
    title: "Complete Confidentiality",
    description: "Your thoughts remain private. No data sharing, no judgment, just support."
  }
];

// --- Data for Asymmetric Tiles ---
const mentalHealthTiles = [
  {
    id: 1,
    title: "Anxiety & Overwhelm",
    imageSrc: "https://images.unsplash.com/photo-1594751439417-df8aab2a0c11?q=80&w=2940&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    gridSpanDesktop: "lg:col-span-2 lg:row-span-1",
    aspectRatio: "aspect-[2/1]",
    textPosition: "bottom-right",
  },
  {
    id: 2,
    title: "Relationship Dynamics",
    imageSrc: "https://images.unsplash.com/photo-1696457155539-411a72d08d4a?q=80&w=2940&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    gridSpanDesktop: "lg:col-span-1 lg:row-span-2",
    aspectRatio: "aspect-[2/3]",
    textPosition: "center",
  },
  {
    id: 3,
    title: "Stress & Burnout",
    imageSrc: "https://plus.unsplash.com/premium_photo-1733342579090-03fc5560cc6f?q=80&w=2940&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    gridSpanDesktop: "lg:col-span-1 lg:row-span-1",
    aspectRatio: "aspect-square",
    textPosition: "bottom-right",
  },
  {
    id: 4,
    title: "Self-Doubt",
    imageSrc: "https://images.unsplash.com/photo-1727863239911-66ace0856002?q=80&w=3137&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    gridSpanDesktop: "lg:col-span-1 lg:row-span-1",
    aspectRatio: "aspect-square",
    textPosition: "top-left",
  },
  {
    id: 5,
    title: "Finding Focus",
    imageSrc: "https://images.unsplash.com/photo-1569908687465-12cfceb6dead?q=80&w=3087&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    gridSpanDesktop: "lg:col-span-2 lg:row-span-1",
    aspectRatio: "aspect-[2/1]",
    textPosition: "center-left",
  },
  {
    id: 6,
    title: "Emotional Processing",
    imageSrc: "https://plus.unsplash.com/premium_photo-1661670037438-c7cbcb35a025?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MjgxfHx0cnVzdHdvcnRoeXxlbnwwfHwwfHx8MA%3D%3D",
    gridSpanDesktop: "lg:col-span-1 lg:row-span-1",
    aspectRatio: "aspect-square",
    textPosition: "center",
  }
];

// --- Data for FAQ explaining how the AI works ---
const faqDataAlpha = [
  {
    question: "How does Kind understand what I'm saying?",
    answer: "Kind uses advanced language models (like having a smart conversation partner) that have learned from millions of conversations. When you speak, the AI processes your words in context of your conversation and generates a thoughtful response that's spoken back to you. These large language models (LLMs) can solve problems, recognize ideas, and understand patterns in language. The AI remembers what you've been talking about throughout your session."
  },
  {
    question: "Why does it feel like I'm talking to a real person?",
    answer: "We use natural voice technology that adds human-like pauses, emotions, and inflections. The AI understands context and responds with appropriate tone and empathy. It's trained to listen actively, ask clarifying questions, and remember important details from your conversation."
  },
  {
    question: "What happens to my conversations?",
    answer: "Your conversations are encrypted and stored securely on your account. It's like a private journal that only you can access. The AI uses your conversation history to provide continuity (like remembering you mentioned feeling stressed last week), but this information is never shared with others or used to train our models. You can delete your data anytime."
  },
  {
    question: "How does Kind know what advice to give?",
    answer: "Kind doesn't give medical advice – instead, it uses evidence-based therapeutic techniques like CBT and active listening. It suggests coping techniques, helps you process emotions, and guides self-reflection, but always encourages professional help when needed."
  }
];


// --- Main Page Component ---
export default function AlphaLandingPageClone() {
  const [activeFAQ, setActiveFAQ] = useState<number | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [reachedWhySection, setReachedWhySection] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [activeCarouselSlide, setActiveCarouselSlide] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setScrollY(currentScrollY);
      setScrolled(currentScrollY > 10);

      // Check if user has scrolled to the "Why we built kind" section
      const whySection = document.querySelector('#why-section');
      if (whySection) {
        const rect = whySection.getBoundingClientRect();
        setReachedWhySection(rect.top <= 0);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const toggleFAQ = (index: number) => setActiveFAQ(activeFAQ === index ? null : index);

  // Carousel data
  const carouselFeatures = [
    {
      title: "Voice-First Therapy",
      description: "Have natural, spoken conversations with AI that responds with human-like voice and empathy.",
      iconType: "headphones"
    },
    {
      title: "Goals & Insights",
      description: "Kind incorporates your goals and insights directly into your conversations, creating a seamless therapy experience.",
      iconType: "barchart"
    },
    {
      title: "Complete Privacy",
      description: "Your conversations are encrypted and private. No data sharing, no judgment, just support.",
      iconType: "shield"
    }
  ];

  const getCarouselIcon = (iconType: string) => {
    switch (iconType) {
      case "headphones":
        return <Headphones className="w-5 h-5 text-gray-700" />;
      case "barchart":
        return <BarChart3 className="w-5 h-5 text-gray-700" />;
      case "shield":
        return <Shield className="w-5 h-5 text-gray-700" />;
      default:
        return <Headphones className="w-5 h-5 text-gray-700" />;
    }
  };

  // Auto-advance carousel
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveCarouselSlide((prev) => (prev + 1) % carouselFeatures.length);
    }, 4000); // Change slide every 4 seconds

    return () => clearInterval(interval);
  }, [carouselFeatures.length]);

  const handleGetStarted = () => {
    setIsTransitioning(true);
    // Wait for expansion animation to complete before navigating
    setTimeout(() => {
      router.push('/onboarding?from=landing');
    }, 800); // Match the animation duration
  };

  // Helper function to get text alignment classes based on textPosition
  const getTextPositionClasses = (position?: string) => { // Made position optional
    switch (position) {
      case 'bottom-left': return 'justify-end items-start text-left';
      case 'bottom-right': return 'justify-end items-end text-right';
      case 'top-left': return 'justify-start items-start text-left';
      case 'top-right': return 'justify-start items-end text-right';
      case 'center-left': return 'justify-center items-start text-left';
      case 'center-right': return 'justify-center items-end text-right';
      case 'center': return 'justify-center items-center text-center';
      default: return 'justify-end items-start text-left'; // Default to bottom-left
    }
  };


  return (
    <div className="min-h-screen bg-white text-gray-800 font-sans antialiased relative overflow-hidden">
      {/* Expanding white overlay from hero section */}
      <div className={`fixed inset-0 bg-white z-40 transition-all duration-1000 ease-in-out ${
        isTransitioning 
          ? 'opacity-100' 
          : 'opacity-0 pointer-events-none'
      }`}
        style={{
          clipPath: isTransitioning 
            ? 'circle(200% at 50% 40%)' 
            : 'circle(0% at 50% 40%)'
        }}
      />


      {/* --- Hero Section (Soft & Classy) --- */}
      <header className={`min-h-screen flex transition-all duration-800 ${
        isTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
      }`}>
        {/* Left Panel - Visual Elements */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 relative overflow-hidden group">
          {/* Floating soft visual elements representing mental health topics */}
          <div className="absolute inset-0 p-16">
            {/* Anxiety & Overwhelm - top left */}
            <div className="absolute top-12 left-16 w-40 h-24 rounded-2xl overflow-hidden shadow-2xl opacity-90 transform -rotate-3 hover:scale-110 hover:shadow-2xl transition-all duration-700 ease-out group-hover:translate-x-2 group-hover:-translate-y-1 group-hover:rotate-1">
              <Image
                src={mentalHealthTiles[0].imageSrc}
                alt="Anxiety & Overwhelm"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/15 via-purple-600/15 to-black/60"></div>
              <div className="absolute bottom-3 left-3 text-white text-sm font-bold drop-shadow-2xl">
                Anxiety & Overwhelm
              </div>
            </div>

            {/* Relationship Dynamics - center right */}
            <div className="absolute top-24 right-20 w-28 h-40 rounded-2xl overflow-hidden shadow-2xl opacity-85 transform rotate-6 hover:scale-110 hover:shadow-2xl transition-all duration-700 ease-out group-hover:-translate-x-3 group-hover:translate-y-2 group-hover:rotate-12">
              <Image
                src={mentalHealthTiles[1].imageSrc}
                alt="Relationship Dynamics"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-br from-pink-500/15 via-rose-600/15 to-black/60"></div>
              <div className="absolute bottom-3 left-3 text-white text-sm font-bold drop-shadow-2xl writing-mode-vertical">
                Relationships
              </div>
            </div>

            {/* Stress & Burnout - middle left */}
            <div className="absolute top-1/2 left-8 transform -translate-y-1/2 w-32 h-32 rounded-2xl overflow-hidden shadow-2xl opacity-75 rotate-12 hover:scale-110 hover:shadow-2xl transition-all duration-700 ease-out group-hover:translate-x-4 group-hover:-translate-y-2 group-hover:rotate-6">
              <Image
                src={mentalHealthTiles[2].imageSrc}
                alt="Stress & Burnout"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/15 via-red-600/15 to-black/60"></div>
              <div className="absolute bottom-3 left-3 text-white text-sm font-bold drop-shadow-2xl">
                Stress
              </div>
            </div>

            {/* Self-Doubt - bottom center */}
            <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2 w-36 h-24 rounded-2xl overflow-hidden shadow-2xl opacity-85 -rotate-6 hover:scale-110 hover:shadow-2xl transition-all duration-700 ease-out group-hover:-translate-x-2 group-hover:translate-y-3 group-hover:-rotate-12">
              <Image
                src={mentalHealthTiles[3].imageSrc}
                alt="Self-Doubt"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/15 via-indigo-600/15 to-black/60"></div>
              <div className="absolute bottom-3 left-3 text-white text-sm font-bold drop-shadow-2xl">
                Self-Doubt
              </div>
            </div>

            {/* Finding Focus - top center */}
            <div className="absolute top-16 left-1/2 transform -translate-x-1/2 w-44 h-20 rounded-2xl overflow-hidden shadow-2xl opacity-80 rotate-2 hover:scale-110 hover:shadow-2xl transition-all duration-700 ease-out group-hover:translate-y-4 group-hover:rotate-6">
              <Image
                src={mentalHealthTiles[4].imageSrc}
                alt="Finding Focus"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/15 via-emerald-600/15 to-black/60"></div>
              <div className="absolute bottom-3 left-3 text-white text-sm font-bold drop-shadow-2xl">
                Finding Focus
              </div>
            </div>

            {/* Emotional Processing - bottom right */}
            <div className="absolute bottom-20 right-12 w-32 h-32 rounded-2xl overflow-hidden shadow-2xl opacity-70 rotate-45 hover:scale-110 hover:shadow-2xl transition-all duration-700 ease-out group-hover:-translate-x-1 group-hover:-translate-y-3 group-hover:rotate-30">
              <Image
                src={mentalHealthTiles[5].imageSrc}
                alt="Emotional Processing"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/15 via-violet-600/15 to-black/60"></div>
              <div className="absolute bottom-3 left-3 text-white text-sm font-bold drop-shadow-2xl">
                Emotions
              </div>
            </div>
          </div>

          {/* Main content overlay */}
          <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20">
            <div className="text-gray-800 bg-white/90 backdrop-blur-sm rounded-3xl p-8 shadow-xl group-hover:scale-105 group-hover:shadow-2xl transition-all duration-500 ease-out">
              <h2 className="text-4xl font-light mb-2 leading-tight">
                Talk it through
                <span className="block font-medium text-gray-900">with Kind</span>
              </h2>
              <div className="mb-4">
                <span className="text-sm text-gray-500 tracking-wide">Kind is your <span className="text-indigo-600">AI voice therapist and mental health journal</span> that's available 24/7</span>
              </div>
            </div>
          </div>

          {/* Subtle background gradients */}
          <div className="absolute top-20 left-20 w-96 h-96 bg-slate-200/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-gray-200/10 rounded-full blur-3xl"></div>
        </div>

        {/* Right Panel - Auth Section */}
        <div className="w-full lg:w-1/2 flex items-center justify-center px-6 sm:px-12 bg-white relative">
          <div className="w-full max-w-md">
            {/* Logo */}
            <div className="mb-12">
              <div className="flex items-center gap-3 justify-center">
                <div className="w-12 h-12 bg-gray-900 rounded-xl flex items-center justify-center">
                  <span className="text-white text-xl font-semibold">K</span>
                </div>
                <span className="text-2xl font-light text-gray-900">Kind</span>
              </div>
            </div>

            {/* Main content */}
            <div className="space-y-8">
              <div className="text-center">
                <h1 className="text-3xl font-light text-gray-900 mb-4">
                  Start here
                </h1>
              </div>

              {/* Google Sign In */}
              <div className="space-y-4">
                <button
                  onClick={async () => {
                    const { error } = await supabase.auth.signInWithOAuth({
                      provider: 'google',
                      options: {
                        redirectTo: `${window.location.origin}/auth/callback`
                      }
                    });
                    if (error) console.error(error);
                  }}
                  className="w-full flex items-center justify-center gap-3 py-4 px-6 bg-white text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors duration-200 border border-gray-300 shadow-sm"
                >
                  <FcGoogle size={20} />
                  Sign up with Google
                </button>

              </div>

              {/* Simple benefits */}
              <div className="pt-8">
                <div className="text-center space-y-3">
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>3 free sessions</span>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>No scheduling required</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Learn More / Scroll Indicator */}
          <div
            className="absolute bottom-8 right-8 z-20 transition-opacity duration-300 hover:!opacity-100"
            style={{
              opacity: typeof window !== 'undefined' ? Math.max(0, 1 - (scrollY / (window.innerHeight * 0.8))) : 1
            }}
          >
            <button
              onClick={() => typeof window !== 'undefined' && window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}
              className="group flex items-center gap-3 px-6 py-3 bg-gray-50/90 backdrop-blur-sm rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:bg-gray-50 border border-gray-200/50"
            >
              <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">Learn more</span>
              <div className="w-6 h-6 rounded-full bg-gray-100 group-hover:bg-indigo-100 flex items-center justify-center transition-colors duration-300">
                <svg className="w-3 h-3 text-gray-600 group-hover:text-indigo-600 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* --- Autoplay Demo Section (Claude-inspired) --- */}
      <section className="py-20 md:py-32 bg-gray-50">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-light text-gray-900 mb-4">
                See Kind in action
              </h2>
              <p className="text-lg text-gray-600">
                Actually talk it out instead of typing
              </p>
            </div>

            {/* Demo container */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className="grid lg:grid-cols-2">
                {/* Left side - Screenshot of talking homepage */}
                <div className="p-8 lg:p-12 bg-gradient-to-br from-gray-50 to-white">
                  <div className="max-w-md mx-auto">
                    {/* Browser mockup */}
                    <div className="bg-gray-100 rounded-lg overflow-hidden shadow-lg">
                      {/* Browser header */}
                      <div className="bg-gray-200 px-4 py-3 flex items-center gap-2">
                        <div className="flex gap-2">
                          <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                          <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                          <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                        </div>
                        <div className="flex-1 text-center">
                          <div className="bg-white rounded px-3 py-1 text-xs text-gray-600 max-w-48 mx-auto">
                            kindtherapy.app
                          </div>
                        </div>
                      </div>

                      {/* App screenshot area */}
                      <div className="bg-white overflow-hidden">
                        <Image
                          src="/screenshot.png"
                          alt="Kind AI voice interface screenshot"
                          width={400}
                          height={600}
                          className="w-full h-auto object-cover"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right side - Feature Carousel */}
                <div className="p-8 lg:p-12 flex flex-col justify-center relative">
                  <div className="space-y-8">
                    {/* Current Feature Display */}
                    <div className="min-h-[300px] flex flex-col justify-center py-8">
                      <div className="flex items-start gap-4 mb-8">
                        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          {getCarouselIcon(carouselFeatures[activeCarouselSlide].iconType)}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-4 text-xl transition-all duration-500">
                            {carouselFeatures[activeCarouselSlide].title}
                          </h3>
                          <p className="text-gray-600 leading-relaxed transition-all duration-500">
                            {carouselFeatures[activeCarouselSlide].description}
                          </p>
                        </div>
                      </div>

                      {/* Carousel Controls */}
                      <div className="flex items-center justify-center gap-6 mt-8">
                        {/* Navigation Arrows */}
                        <button
                          onClick={() => setActiveCarouselSlide((prev) =>
                            prev === 0 ? carouselFeatures.length - 1 : prev - 1
                          )}
                          className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors group"
                        >
                          <ChevronLeft className="w-4 h-4 text-gray-600 group-hover:text-gray-800" />
                        </button>

                        {/* Indicator Dots */}
                        <div className="flex gap-2">
                          {carouselFeatures.map((_, index) => (
                            <button
                              key={index}
                              onClick={() => setActiveCarouselSlide(index)}
                              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                                index === activeCarouselSlide
                                  ? 'bg-gray-600 w-6'
                                  : 'bg-gray-300 hover:bg-gray-400'
                              }`}
                            />
                          ))}
                        </div>

                        <button
                          onClick={() => setActiveCarouselSlide((prev) =>
                            (prev + 1) % carouselFeatures.length
                          )}
                          className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors group"
                        >
                          <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-800" />
                        </button>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>


           {/* --- Hidden Section --- */}
           {false && <section className="py-20 md:py-28 bg-white">
        <div className="container mx-auto px-6">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-12 tracking-tight leading-tight text-center">
              Find Time To Work On You.
            </h2>
            
            <div className="grid md:grid-cols-2 gap-8 md:gap-12">
              {/* Left side - Track your goals */}
              <div className="text-center md:text-left">
                <div className="inline-block p-3 mb-5 bg-indigo-100/80 rounded-full shadow">
                  <BarChart3 className="w-8 h-8 text-indigo-600" strokeWidth={1.5} />
                </div>
                <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                  Track your goals
                </h3>
                <p className="text-lg text-gray-600 leading-relaxed mb-6">
                  Set personal milestones and monitor your progress with guided insights tailored to your journey.
                </p>
              </div>
              
              {/* Right side - Courses for everything */}
              <div className="text-center md:text-left">
                <div className="inline-block p-3 mb-5 bg-indigo-100/80 rounded-full shadow">
                  <Sparkles className="w-8 h-8 text-indigo-600" strokeWidth={1.5} />
                </div>
                <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                  Courses for everything
                </h3>
                <p className="text-lg text-gray-600 leading-relaxed mb-6">
                  Access personalized mental wellness programs to hit what you've been struggling with. Build resilience and develop healthy habits.
                </p>
              </div>
            </div>

            <div className="mt-12 text-center">
              <Link
                href="/onboarding"
                className="inline-block px-8 py-3 border border-indigo-600 text-base font-medium rounded-md text-indigo-600 hover:bg-indigo-50 transition-colors duration-300 ease-in-out shadow-sm hover:shadow-md"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </section>}

      {/* --- Modern Page Break --- */}
      <section className="py-20 bg-gradient-to-br from-indigo-50 via-white to-purple-50 overflow-hidden">
        <div className="container mx-auto px-6">
          <div className="max-w-5xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left side - Modern visual */}
              <div className="relative">
                <div className="aspect-square rounded-3xl overflow-hidden bg-gradient-to-br from-indigo-100 to-purple-100 p-8">
                  <div className="h-full flex flex-col justify-center space-y-6">
                    {/* Floating cards representing therapy barriers */}
                    <div className="space-y-4">
                      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-lg transform rotate-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                            <span className="text-red-600 font-bold text-lg">$</span>
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">$200+ per session</div>
                            <div className="text-xs text-gray-500">Traditional therapy cost</div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-lg transform -rotate-1">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                            <CalendarX className="w-5 h-5 text-orange-600" />
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">Skip the 2-hour process</div>
                            <div className="text-xs text-gray-500">No waiting rooms or scheduling</div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-lg transform rotate-1">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                            <span className="text-indigo-600 font-bold">✓</span>
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">Available 24/7</div>
                            <div className="text-xs text-gray-500">Kind is always here</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Decorative elements */}
                <div className="absolute -top-4 -right-4 w-20 h-20 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full opacity-20 blur-xl"></div>
                <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full opacity-20 blur-xl"></div>
              </div>

              {/* Right side - Content */}
              <div className="space-y-8">
                <div>
                  <h2 className="text-3xl md:text-4xl font-light text-gray-900 mb-6 leading-tight">
                    Support when you need it
                  </h2>
                  <div className="text-lg text-gray-600 leading-relaxed">
                    <p>
                      Getting help shouldn't be complicated. No waitlists, no scheduling conflicts, no high costs.
                    </p>
                    <p className="font-medium text-gray-900 mt-4">
                      Just open the app and start talking.
                    </p>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-6">
                  <div className="text-center space-y-4">
                    <div>
                      <div className="text-2xl font-light text-gray-900 mb-2">Ready when you are</div>
                      <div className="text-sm text-gray-600">Available 24/7. No appointments needed.</div>
                    </div>
                    <button
                      onClick={handleGetStarted}
                      className="group relative px-8 py-4 bg-white border-2 border-gray-200 text-gray-700 font-medium rounded-2xl hover:border-gray-300 hover:shadow-lg transition-all duration-300 overflow-hidden"
                    >
                      <span className="relative z-10 flex items-center gap-2">
                        Open Kind
                        <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                      </span>
                      <div className="absolute inset-0 bg-gradient-to-r from-indigo-50 to-purple-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- Features Showcase Section --- */}
      <section className="py-20 md:py-32 bg-white">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-light text-gray-900 mb-4 tracking-tight">
              More than just talking
            </h2>
            <p className="text-lg text-gray-600">
              Kind tracks your progress and helps you build lasting habits
            </p>
          </div>

          {/* Photography Section - Different Layout */}
          <div className="mb-20">
            <div className="flex flex-col lg:flex-row items-center gap-12 max-w-6xl mx-auto">
              {/* Large hero image */}
              <div className="lg:w-1/2">
                <div className="relative">
                  <img
                    src="https://images.unsplash.com/photo-1594751439417-df8aab2a0c11?w=600&h=700&fit=crop&crop=face"
                    alt="Person in peaceful moment of reflection"
                    className="w-full h-96 lg:h-[500px] object-cover rounded-3xl shadow-2xl"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-3xl"></div>
                </div>
              </div>

              {/* Text and smaller images */}
              <div className="lg:w-1/2 space-y-8">
                <div className="text-center lg:text-left">
                  <h3 className="text-2xl font-light text-gray-900 mb-4">Real people, real progress</h3>
                  <p className="text-gray-600 leading-relaxed">
                    Kind is helping thousands find clarity, process emotions, and build healthier thought patterns through natural conversation.
                  </p>
                </div>

                {/* Join Discord community */}
                <div className="space-y-4">
                  <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-semibold text-lg">Join our community</h4>
                        <p className="text-white/80 text-sm">500+ members</p>
                      </div>
                    </div>
                    <p className="text-white/90 text-sm leading-relaxed mb-4">
                      Connect with others on their mental health journey. Share experiences, get support, and stay updated on new features.
                    </p>
                    <div className="flex justify-end">
                      <button className="bg-white text-indigo-600 px-4 py-2 rounded-lg font-medium text-sm hover:bg-gray-50 transition-colors">
                        Join Discord →
                      </button>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-2xl p-5 text-left border border-gray-100">
                    <div className="flex items-start gap-3 mb-3">
                      <img
                        src="https://i.pravatar.cc/40?img=44"
                        alt="moonchild profile"
                        className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                      />
                      <div>
                        <div className="font-semibold text-gray-900 text-sm mb-1">moonchild</div>
                        <div className="flex text-yellow-400 text-xs">
                          {"★".repeat(5)}
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      "Finally found something that actually helps with my anxiety. It's like having a therapist who actually gets it."
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Full-Width Three Screenshots Section */}
      <section className="w-full bg-gray-50">
        <div className="grid lg:grid-cols-3 min-h-[600px]">
          {/* AI Journaling Screenshot */}
          <div className="relative bg-gradient-to-br from-indigo-50 to-indigo-100 flex items-center justify-center p-8">
            <div className="w-full max-w-sm">
              {/* Phone mockup for AI Journaling */}
              <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border-8 border-gray-800">
                {/* Phone header */}
                <div className="bg-indigo-600 px-4 py-3 flex items-center justify-between">
                  <span className="text-white font-medium text-sm">AI Journaling</span>
                  <div className="flex gap-1">
                    <div className="w-1 h-1 bg-white/60 rounded-full"></div>
                    <div className="w-1 h-1 bg-white/60 rounded-full"></div>
                    <div className="w-1 h-1 bg-white rounded-full"></div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 space-y-3 h-80">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-xs text-gray-500 mb-1">Today's reflection</div>
                    <p className="text-xs text-gray-700 leading-relaxed">"You mentioned feeling overwhelmed about work three times this week. Let's explore what specific triggers..."</p>
                  </div>

                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-xs text-gray-500 mb-1">Pattern identified</div>
                    <p className="text-xs text-gray-700 leading-relaxed">"I notice you often feel stressed on Monday mornings. This could be related to..."</p>
                  </div>

                  <div className="bg-indigo-50 p-3 rounded-lg">
                    <div className="text-xs text-gray-500 mb-1">Weekly summary</div>
                    <p className="text-xs text-gray-700 leading-relaxed">"Your emotional awareness has grown significantly this week..."</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Overlay text */}
            <div className="absolute bottom-8 left-8 right-8 text-center">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">AI Journaling</h3>
              <p className="text-gray-700 text-sm">Conversations become insights automatically</p>
            </div>
          </div>

          {/* Personal Goals Screenshot */}
          <div className="relative bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-8 border-x border-gray-200">
            <div className="w-full max-w-sm">
              {/* Phone mockup for Personal Goals */}
              <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border-8 border-gray-800">
                {/* Phone header */}
                <div className="bg-green-600 px-4 py-3 flex items-center justify-between">
                  <span className="text-white font-medium text-sm">Personal Goals</span>
                  <div className="flex gap-1">
                    <div className="w-1 h-1 bg-white/60 rounded-full"></div>
                    <div className="w-1 h-1 bg-white/60 rounded-full"></div>
                    <div className="w-1 h-1 bg-white rounded-full"></div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 space-y-3 h-80">
                  <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-xs font-medium text-gray-900">Practice mindfulness daily</span>
                    </div>
                    <div className="text-xs text-gray-500">5 days streak • 73% this month</div>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      <span className="text-xs font-medium text-gray-900">Exercise 3x per week</span>
                    </div>
                    <div className="text-xs text-gray-500">2/3 this week • On track</div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                    <p className="text-xs text-gray-700 italic">"How did your mindfulness practice feel yesterday?"</p>
                    <div className="text-xs text-gray-500 mt-1">Kind's check-in</div>
                  </div>

                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-xs text-gray-500 mb-1">Goal suggestion</div>
                    <p className="text-xs text-gray-700">"Consider adding a gratitude practice to your routine"</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Overlay text */}
            <div className="absolute bottom-8 left-8 right-8 text-center">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Personal Goals</h3>
              <p className="text-gray-700 text-sm">Gentle accountability through conversation</p>
            </div>
          </div>

          {/* Session Insights Screenshot */}
          <div className="relative bg-gradient-to-br from-purple-50 to-purple-100 flex items-center justify-center p-8">
            <div className="w-full max-w-sm">
              {/* Phone mockup for Session Insights */}
              <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border-8 border-gray-800">
                {/* Phone header */}
                <div className="bg-purple-600 px-4 py-3 flex items-center justify-between">
                  <span className="text-white font-medium text-sm">Session Insights</span>
                  <div className="flex gap-1">
                    <div className="w-1 h-1 bg-white/60 rounded-full"></div>
                    <div className="w-1 h-1 bg-white/60 rounded-full"></div>
                    <div className="w-1 h-1 bg-white rounded-full"></div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 space-y-3 h-80">
                  <div className="bg-purple-50 p-3 rounded-lg">
                    <div className="text-xs text-gray-500 mb-1">This week's insight</div>
                    <p className="text-xs text-gray-700 leading-relaxed">"Your stress levels tend to peak on Tuesdays. Consider scheduling self-care on Monday evenings."</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-gray-50 p-2 rounded text-center">
                      <div className="text-lg font-semibold text-gray-900">12</div>
                      <div className="text-xs text-gray-500">sessions</div>
                    </div>
                    <div className="bg-gray-50 p-2 rounded text-center">
                      <div className="text-lg font-semibold text-gray-900">4.3</div>
                      <div className="text-xs text-gray-500">avg mood</div>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-xs text-gray-500 mb-1">Progress trend</div>
                    <p className="text-xs text-gray-700">"Your emotional regulation has improved 23% this month"</p>
                  </div>

                  <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
                    <div className="text-xs text-gray-500 mb-1">Breakthrough moment</div>
                    <p className="text-xs text-gray-700">"Yesterday's session: Major insight about work boundaries"</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Overlay text */}
            <div className="absolute bottom-8 left-8 right-8 text-center">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Session Insights</h3>
              <p className="text-gray-700 text-sm">Track patterns and breakthrough moments</p>
            </div>
          </div>
        </div>
      </section>




      

      {/* --- FAQ Section --- */}
      <section id="faq" className="py-20 md:py-32 bg-gray-50">
        <div className="container mx-auto px-6 max-w-4xl">
          <div className="text-center mb-16">
            <span className="text-sm font-medium text-gray-500 tracking-wide uppercase">How it works</span>
            <h2 className="text-4xl md:text-5xl font-light text-gray-900 mt-4">Understanding Kind AI</h2>
          </div>
          <div className="space-y-6">
            {faqDataAlpha.map((faq, index) => (
              <FAQItem
                key={index}
                question={faq.question}
                answer={faq.answer}
                isOpen={activeFAQ === index}
                onClick={() => toggleFAQ(index)}
              />
            ))}
          </div>
        </div>
      </section>


{/* --- NEW: Powered By Section --- */}
<div className="max-w-md mx-auto">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">
              Powered By
            </p>
            <div className="flex justify-center items-center gap-6 sm:gap-8 opacity-30">
              {/* Replace with your actual logo images using Next/Image */}
              <div className="relative h-7 sm:h-8 md:h-9 w-auto"> {/* Adjust height as needed */}
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Claude_AI_logo.svg/1280px-Claude_AI_logo.svg.png"
                  alt="Claude AI Logo"
                  width={80}
                  height={16}
                  // objectFit="contain"
                />
              </div>
              {/* <div className="text-gray-300 text-xl">&</div> Simple separator */}
              <div className="pt-1 relative h-7 sm:h-8 md:h-9 w-auto"> {/* Adjust height */}
                <img
                  src="https://eleven-public-cdn.elevenlabs.io/payloadcms/8xden71nndm-ElevenLabs_Grants_Dark.webp" // Use a version suitable for light backgrounds
                  alt="ElevenLabs Logo"
                  width={160} // Example width
                  height={36}
                  // objectFit="contain"
                />
              </div>
              <div className="pt-2 relative h-7 sm:h-8 md:h-9 w-auto"> {/* Adjust height */}
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Vercel_logo_black.svg/2560px-Vercel_logo_black.svg.png" // Use a version suitable for light backgrounds
                  alt="Vercel Logo"
                  width={60} // Example width
                  height={36}
                  // objectFit="contain"
                />
              </div>              <div className="pt-2 relative h-7 sm:h-8 md:h-9 w-auto"> {/* Adjust height */}
                <img
                  src="https://miro.medium.com/v2/resize:fit:1400/format:webp/0*KyMeuRwaprE-47HY.png" // Use a version suitable for light backgrounds
                  alt="Spuabase Logo"
                  width={80} // Example width
                  height={36}
                  // objectFit="contain"
                />
              </div>
            </div>
            {/* <p className="mt-6 text-sm text-gray-600">
              Leveraging cutting-edge technology for truly empathetic and natural conversations.
            </p>
             <div className="mt-8">
                <Link
                    href="#faq" // Or your primary CTA to join waitlist / learn more
                    className="inline-block px-8 py-3 bg-gray-800 text-white rounded-lg font-semibold text-md hover:bg-gray-900 transition-colors duration-300 shadow-md hover:shadow-lg transform hover:scale-105"
                >
                    Join Early Access Waitlist
                </Link>
            </div> */}
          </div>

       {/* --- Simple Footer (Styled like example's simplicity) --- */}
      <footer className="py-12 md:py-16 bg-white text-center border-t border-gray-200">
        <div className="container mx-auto px-6">
          <Link href="/" className="text-2xl font-bold text-gray-800 hover:text-indigo-600 transition-colors tracking-tight">
            Kind
          </Link>
          <p className="text-sm text-gray-600 mt-3 mb-2 max-w-md mx-auto">
            Co-creating the future of empathetic AI support. Thank you for being part of our Alpha journey.
          </p>
          <p className="text-xs text-gray-500">
            © {new Date().getFullYear()} Kind AI. Early Alpha Program.
          </p>
           <p className="text-xs text-gray-500 mt-3">
            Important: Kind AI Alpha is for exploratory and feedback purposes and is not a substitute for professional mental health services.
          </p>
        </div>
      </footer>
    </div>
  );
}

// --- Helper Components ---
const FAQItem = ({ question, answer, isOpen, onClick }: { question: string, answer: string, isOpen: boolean, onClick: () => void }) => (
  <div className="border-b border-gray-200 last:border-b-0">
    <button
      className="w-full text-left py-6 focus:outline-none flex justify-between items-start group"
      onClick={onClick}
      aria-expanded={isOpen}
    >
      <span className="font-medium text-lg text-gray-900 pr-8 leading-relaxed group-hover:text-gray-700 transition-colors">{question}</span>
      <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform duration-300 flex-shrink-0 mt-1 ${isOpen ? 'transform rotate-180' : ''}`} strokeWidth={2}/>
    </button>
    {isOpen && (
      <div className="pb-6 pr-8">
        <p className="text-gray-600 leading-relaxed text-base">{answer}</p>
      </div>
    )}
  </div>
);
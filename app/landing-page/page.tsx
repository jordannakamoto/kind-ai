"use client";

import {
  BarChart3,
  Brain,
  CalendarX,
  ChevronDown,
  Clock,
  Headphones,
  Lock,
  PiggyBank,
  Sparkles,
  ThumbsUp,
  Zap
} from 'lucide-react';
import { useEffect, useState } from 'react';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { NoHurdlesSection } from './NoHurdlesSection';
import {TestimonialsSection} from './TestimonialsSection';

// --- Data for "What You'll Experience" cards (mimicking the 3-card layout) ---
const alphaExperiencePillars = [
  {
    icon: <Headphones className="w-8 h-8 text-indigo-600" strokeWidth={1.5} />,
    title: "Natural Voice Interaction",
    description: "Engage with our advanced AI through fluid, empathetic voice conversations designed to feel genuinely understanding."
  },
  {
    icon: <Brain className="w-8 h-8 text-indigo-600" strokeWidth={1.5} />,
    title: "Reflective Dialogue Space",
    description: "Kind AI serves as your personal sounding board, helping you process thoughts, explore emotions, and gain new perspectives."
  },
  {
    icon: <Lock className="w-8 h-8 text-indigo-600" strokeWidth={1.5} />,
    title: "Confidential & Secure Alpha",
    description: "Experience the core of Kind AI in a private environment, built with your data security as a top priority from day one."
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
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setScrolled(scrollY > 10);
      
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

      {/* --- Simple Navigation (Styled like example) --- */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-in-out
              ${scrolled ? 'py-3 bg-white/80 backdrop-blur-lg shadow-md' : 'py-4 bg-transparent'}`}
      >
        <div className="container mx-auto px-6 flex justify-between items-center">
          <Link href="/" className={`text-2xl md:text-3xl font-bold text-gray-800 hover:text-indigo-600 transition-all duration-300 tracking-tight z-50 relative ${
            isTransitioning ? 'opacity-0' : 'opacity-100'
          }`}>
            kind
            <span className={`ml-2 text-xs font-normal uppercase px-2 py-1 rounded-full tracking-wider align-middle transition-colors duration-300
                              ${scrolled ? 'bg-indigo-100 text-indigo-700' : 'bg-white/30 text-gray-700 backdrop-blur-sm'}`}
            >
              Early Access
            </span>
          </Link>
          {reachedWhySection ? (
            <button 
              onClick={handleGetStarted}
              className={`text-sm font-medium transition-all duration-500 px-4 py-2 rounded-lg bg-black text-white hover:bg-gray-800 ${
                isTransitioning ? 'opacity-0' : 'opacity-100'
              }`}
            >
              <span className="transition-opacity duration-300">
                Get Started
              </span>
            </button>
          ) : (
            <Link 
              href="#faq"
              className={`text-sm font-medium transition-all duration-500 px-4 py-2 rounded-lg ${
                scrolled 
                  ? 'text-gray-600 hover:text-indigo-600' 
                  : 'text-gray-700 hover:text-indigo-500'
              } ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}
            >
              <span className="transition-opacity duration-300">
                How Does This AI Work?
              </span>
            </Link>
          )}
        </div>
      </nav>

      {/* --- Hero Section --- */}
      <header
        className={`relative pt-32 pb-20 md:pt-48 md:pb-32 text-center overflow-hidden transition-all duration-800 ${
          isTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
        }`}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-100/70 via-pink-50/50 to-white -z-10"></div>
        <div className="container mx-auto px-6 relative z-10 mt-8 md:mt-6">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-gray-900 mb-5 md:mb-6 leading-tight tracking-tight">
            Talk Therapy
          </h1>
          <p className="text-lg md:text-xl text-gray-700 mb-10 md:mb-12 max-w-2xl mx-auto leading-relaxed">
            An AI app for mental health. Have a conversation — and get started on feeling better.
          </p>

          {/* Primary CTA Section */}
          <div className="max-w-sm mx-auto">
            <button
              onClick={handleGetStarted}
              className="inline-block px-6 py-3 bg-indigo-600 text-white font-semibold text-base rounded-lg hover:bg-indigo-700 transition-colors duration-200 shadow-md hover:shadow-lg"
            >
              Get Started
            </button>
            <p className="text-xs text-gray-500 text-center mt-4 leading-relaxed">
              3 free conversations on us.
            </p>
          </div>
        </div>
      </header>


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

      {/* --- Features & Video Section --- */}
      <section className="py-16 md:py-20 bg-gray-50">
        <div className="container mx-auto px-6">
          {/* YouTube Video with Custom Thumbnail */}
          <div className="max-w-3xl mx-auto px-4 mb-16">
            <div className="bg-white rounded-xl shadow-2xl p-3 md:p-4 transform transition-all hover:scale-[1.01] duration-500">
              <div className="relative overflow-hidden rounded-lg aspect-video cursor-pointer group" onClick={() => setVideoLoaded(true)}>
                {!videoLoaded ? (
                  <>
                    <img
                      src="https://img.youtube.com/vi/QF2wIywvDhk/maxresdefault.jpg"
                      alt="Kind AI Demo Video Thumbnail"
                      className="w-full h-full object-cover"
                    />
                    {/* Play Button Overlay */}
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center group hover:bg-black/30 transition-colors">
                      <div className="w-16 h-16 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                        <svg className="w-6 h-6 ml-1 text-gray-800" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z"/>
                        </svg>
                      </div>
                    </div>
                  </>
                ) : (
                  <iframe
                    src="https://www.youtube.com/embed/QF2wIywvDhk?autoplay=1"
                    title="Kind AI Demo Video"
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                )}
              </div>
            </div>
          </div>

          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-12 tracking-tight">
              Find Time To Work On You
            </h2>
            
            {/* Social Proof Section */}
            <div className="grid md:grid-cols-3 gap-3 mb-12 max-w-3xl mx-auto">
              {/* Testimonial 1 */}
              <div className="bg-white rounded-2xl px-4 py-3 shadow-sm text-left">
                <div className="flex items-start">
                  <img 
                    src="https://i.pravatar.cc/24?img=44"
                    alt="moonchild profile"
                    className="w-6 h-6 min-w-[24px] rounded-full object-cover flex-shrink-0"
                  />
                  <div className="ml-2 text-left">
                    <div className="font-medium text-gray-900 text-xs mb-1 text-left">moonchild</div>
                    <p className="text-gray-600 text-xs leading-tight text-left">
                      "ngl this AI actually gets it... been using for 2 weeks"
                    </p>
                  </div>
                </div>
              </div>

              {/* Testimonial 2 */}
              <div className="bg-white rounded-2xl px-4 py-3 shadow-sm text-left">
                <div className="flex items-start">
                  <img 
                    src="https://i.pravatar.cc/24?img=12"
                    alt="dev_marcus profile"
                    className="w-6 h-6 min-w-[24px] rounded-full object-cover flex-shrink-0"
                  />
                  <div className="ml-2 text-left">
                    <div className="font-medium text-gray-900 text-xs mb-1 text-left">dev_marcus</div>
                    <p className="text-gray-600 text-xs leading-tight text-left">
                      "was skeptical af but it's lowkey helpful for work stress"
                    </p>
                  </div>
                </div>
              </div>

              {/* Testimonial 3 */}
              <div className="bg-white rounded-2xl px-4 py-3 shadow-sm text-left">
                <div className="flex items-start">
                  <img 
                    src="https://i.pravatar.cc/24?img=68"
                    alt="pixelwanderer profile"
                    className="w-6 h-6 min-w-[24px] rounded-full object-cover flex-shrink-0"
                  />
                  <div className="ml-2 text-left">
                    <div className="font-medium text-gray-900 text-xs mb-1 text-left">pixelwanderer</div>
                    <p className="text-gray-600 text-xs leading-tight text-left">
                      "better than paying $200/hr tbh... voice feels real too"
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- Enhanced Problem/Solution Section --- */}
      <section id="why-section" className="py-16 md:py-20 bg-gray-100 overflow-hidden">
        <div className="container mx-auto px-6">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16 xl:gap-20">
            <div className="lg:w-5/12 xl:w-4/12 text-center mb-20 lg:text-left">
              <div className="bg-white rounded-xl p-6 md:p-8 shadow-lg">
                <div className="inline-block p-3 mb-5 bg-indigo-100/80 rounded-full shadow">
                    <Zap className="w-9 h-9 text-indigo-600" strokeWidth={1.5} />
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 tracking-tight leading-tight">
                  Why we built kind
                </h2>
                
                <p className="text-lg text-gray-700 mb-6 leading-relaxed">
                Therapy is costly. Chat feels limited. Kind delivers a new type of support for the first steps in mental health.
                </p>

                <p className="text-lg text-gray-700 mb-6 leading-relaxed">
                Powered by Claude, it's the same AI you use everyday - just tuned to help your days get a bit better.
                </p>
              </div>
            </div>

            <div className="lg:w-4/12 xl:w-6/12 w-full opacity-90">
              <div className="grid grid-cols-2 gap-4 md:gap-5 lg:grid-cols-3 auto-rows-fr">
                {mentalHealthTiles.map((tile) => (
                  <div
                    key={tile.id}
                    className={`group relative rounded-xl md:rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300
                                ${tile.gridSpanDesktop || 'lg:col-span-1 lg:row-span-1'} ${tile.aspectRatio || 'aspect-square'}`}
                    style={{ minHeight: '150px' }}
                  >
                    <img
                      src={tile.imageSrc}
                      alt={tile.title}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 ease-in-out group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-75 group-hover:opacity-90 transition-opacity duration-300"></div>
                    <div className={`absolute inset-0 p-4 md:p-5 flex ${getTextPositionClasses(tile.textPosition)}`}>
                      <h3 className="text-white text-lg md:text-xl font-semibold tracking-tight drop-shadow-md">
                        {tile.title}
                      </h3>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
           



      

      {/* --- FAQ Section --- */}
      <section id="faq" className="py-16 md:py-24 bg-gray-50">
        <div className="container mx-auto px-6 max-w-3xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-gray-900 tracking-tight">How Does This AI Work?</h2>
          <div className="space-y-4">
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
  <div className="bg-white border border-gray-200/90 rounded-lg shadow-sm overflow-hidden transition-all hover:shadow-md">
    <button
      className="w-full text-left p-4 md:p-5 focus:outline-none flex justify-between items-center hover:bg-gray-50/70 "
      onClick={onClick}
      aria-expanded={isOpen}
    >
      <span className="font-medium text-md text-gray-800">{question}</span>
      <ChevronDown className={`h-5 w-5 text-indigo-500 transition-transform duration-300 ${isOpen ? 'transform rotate-180' : ''}`} strokeWidth={2.5}/>
    </button>
    {isOpen && (
      <div className="p-4 md:p-5 pt-2 md:pt-3 border-t border-gray-200/90 bg-gray-50/30">
        <p className="text-gray-600 leading-relaxed text-sm">{answer}</p>
      </div>
    )}
  </div>
);
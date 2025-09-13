'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

import Link from 'next/link';
import { supabase } from "@/supabase/client";

// Topic categories (removed popular)
const topicCategories = [
  {
    name: 'Emotional Well-being',
    topics: [
      { name: 'Anxiety' }, { name: 'Depression' }, { name: 'Grief' }, { name: 'Trauma' },
      { name: 'Stress' }, { name: 'Burnout' }, { name: 'Loneliness' }, { name: 'Anger' }, { name: 'Social anxiety' }
    ]
  },
  {
    name: 'Self-Development',
    topics: [
      { name: 'ADHD' }, { name: 'Body image' }, { name: 'Self-esteem' }, { name: 'Chronic illness' },
      { name: 'Addiction' }, { name: 'Motivation' }, { name: 'Confidence' }
    ]
  },
  {
    name: 'Relationships',
    topics: [
      { name: 'Relationships' }, { name: 'Boundaries' }, { name: 'Parenting' },
      { name: 'Conflict resolution' }, { name: 'Attachment patterns' }
    ]
  },
  {
    name: 'Growth & Meaning',
    topics: [
      { name: 'Life transitions' }, { name: 'Identity exploration' }, { name: 'Decision making' }, { name: 'Creativity' },
      { name: 'Communication skills' }, { name: 'Purpose and meaning' }, { name: 'Mindfulness' },
      { name: 'Personal growth' }, { name: 'Emotional awareness' }, { name: 'Inner child work' }, { name: 'Resilience' },
      { name: 'Joy and playfulness' }, { name: 'Spirituality' }
    ]
  }
];

const experienceOptions = [
  'None', 'Just a little', 'Some familiarity', 'Pretty comfortable', 'Very experienced',
];

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const slideIn = {
  hidden: { x: 10, opacity: 0 },
  visible: { x: 0, opacity: 1 },
};

// Helper SVG Icons
const CheckIcon = ({ className = "w-5 h-5", color = "currentColor" }: { className?: string, color?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

const MicIcon = ({ className = "w-8 h-8", color = "currentColor" }: { className?: string, color?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill={color}>
        <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"></path>
    </svg>
);


export default function OnboardingForm() {
  const [name, setName] = useState('');
  const [experience, setExperience] = useState('');
  const [topics, setTopics] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 5;
  const nameInputRef = useRef<HTMLInputElement>(null);
  
  // Transition states
  const [isFromLanding, setIsFromLanding] = useState(false);
  const [showContent, setShowContent] = useState(false);

  const [selfCommitment, setSelfCommitment] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const [showAudioSetup, setShowAudioSetup] = useState(false);
  const [readiness, setReadiness] = useState({
    quietSpace: false,
    micTested: false
  });
  const [showMicTestAnimation, setShowMicTestAnimation] = useState(false);
  const [audioLevels, setAudioLevels] = useState<number[]>([0, 0, 0]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const allReadyForAudio = Object.values(readiness).every(value => value === true);

  const startAudioAnalysis = (stream: MediaStream) => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    const microphone = audioContext.createMediaStreamSource(stream);
    
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.3;
    microphone.connect(analyser);
    
    audioContextRef.current = audioContext;
    analyserRef.current = analyser;
    micStreamRef.current = stream;
    
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    let detectedSound = false;
    let soundTimeout: NodeJS.Timeout;
    let waveTime = 0;
    
    const updateLevels = () => {
      if (!analyserRef.current) return;
      
      waveTime += 0.1; // Increment wave time for smooth animation
      
      analyserRef.current.getByteTimeDomainData(dataArray);
      
      // Calculate average amplitude
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += Math.abs(dataArray[i] - 128);
      }
      const average = sum / dataArray.length;
      
      // Much more sensitive normalization
      const normalizedVolume = Math.min(average / 8, 1);
      
      // Create wave pattern with audio responsiveness
      const baseHeight = Math.max(0.3, normalizedVolume * 4);
      
      // Wave pattern with different phases for each bar
      const wave1 = Math.sin(waveTime) * 0.2 + 0.8;
      const wave2 = Math.sin(waveTime + Math.PI / 3) * 0.3 + 1.0;
      const wave3 = Math.sin(waveTime + (2 * Math.PI) / 3) * 0.25 + 0.9;
      
      const newLevels = [
        Math.max(0.3, Math.min(1, baseHeight * wave1 * 0.8)),
        Math.max(0.3, Math.min(1, baseHeight * wave2 * 1.2)),
        Math.max(0.3, Math.min(1, baseHeight * wave3 * 0.9))
      ];
      
      setAudioLevels(newLevels);
      
      // Check if we've detected sound (lower threshold, easier to pass)
      if (average > 2 && !detectedSound) {
        detectedSound = true;
        clearTimeout(soundTimeout);
        soundTimeout = setTimeout(() => {
          stopAudioAnalysis();
          setShowMicTestAnimation(false);
          setReadiness(prev => ({...prev, micTested: true}));
        }, 1000); // Reduce time to 1 second
      }
      
      animationFrameRef.current = requestAnimationFrame(updateLevels);
    };
    
    updateLevels();
  };

  const stopAudioAnalysis = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    analyserRef.current = null;
    setAudioLevels([0, 0, 0]);
  };

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      stopAudioAnalysis();
    };
  }, []);

  // Handle landing page transition
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const fromLanding = urlParams.has('from') && urlParams.get('from') === 'landing';
    
    if (fromLanding) {
      setIsFromLanding(true);
      // Start the reveal animation after the white expansion completes
      setTimeout(() => {
        setShowContent(true);
      }, 800);
      
      // Clean up URL parameter
      const url = new URL(window.location.href);
      url.searchParams.delete('from');
      window.history.replaceState({}, '', url.toString());
    } else {
      setShowContent(true);
    }
  }, []);


  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        const activeElement = document.activeElement as HTMLElement;
        if (activeElement?.tagName === 'BUTTON' || activeElement?.tagName === 'TEXTAREA') return;
        if (isStepComplete()) {
          e.preventDefault(); 
          nextStep();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStep, name, experience, topics, selfCommitment, agreed, totalSteps]);

  useEffect(() => {
    if (currentStep === 1 && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [currentStep]);

  const toggleTopic = (topic: string) => {
    setTopics((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
    );
  };

  const isStepComplete = () => {
    switch (currentStep) {
      case 1: return name.trim() !== '';
      case 2: return experience !== '';
      case 3: return topics.length >= 2;
      case 4: return selfCommitment;
      case 5: return agreed;
      default: return false;
    }
  };

  const [onboardingDataSaved, setOnboardingDataSaved] = useState(false);

  const handleSubmit = async () => {
    if (currentStep !== totalSteps || !isStepComplete()) { 
        console.warn("handleSubmit called prematurely or final step not complete.");
        return;
    }
    
    // If we've already saved the data, just show the audio setup again
    if (onboardingDataSaved) {
      setShowAudioSetup(true);
      return;
    }
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError?.message || 'No user found.');
      return;
    }
    const onboardingData = {
      user_id: user.id,
      experience_level: experience,
      topics: topics,
      agreed_to_terms: agreed,
      agreed_to_commitment: selfCommitment
    };
    const { error: onboardingError } = await supabase
      .from('user_onboarding')
      .upsert(onboardingData, { onConflict: 'user_id' });
    if (onboardingError) {
      console.error('Failed to save onboarding:', onboardingError.message);
      return;
    }
    const { error: stageError } = await supabase
    .from('users')
    .update({ app_stage: 'post-onboarding', full_name: name })
    .eq('id', user.id);
    if (stageError) {
      console.error('Failed to update user stage:', stageError.message);
      return;
    }
    console.log('Onboarding data saved, proceeding to audio setup.');
    setOnboardingDataSaved(true);
    setShowAudioSetup(true);
  };

  const nextStep = () => {
    if (isStepComplete()) {
        if (currentStep < totalSteps) {
          setCurrentStep((prev) => prev + 1);
        } else {
          handleSubmit();
        }
    }
  };
  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };
  const startSession = () => {
    window.location.href = '/dashboard';
  };

  const renderExperienceTimeline = () => {
    const expIndex = experience ? experienceOptions.indexOf(experience) : -1;
    return (
      <div className="relative flex items-center justify-between mt-8 mb-10 w-full max-w-xl mx-auto">
        {experienceOptions.map((opt, idx) => {
          const isSelected = experience === opt;
          const isPastSelected = expIndex >= 0 && idx < expIndex;
          return (
            <div key={opt} className="relative flex flex-col items-center flex-1 text-center">
              {idx < experienceOptions.length - 1 && (
                <div
                  className={`absolute top-3.5 left-1/2 h-0.5 w-full -z-10 transition-colors duration-500 ${
                    isPastSelected ? 'bg-indigo-300' : 'bg-gray-200'
                  }`}
                />
              )}
              <div className="min-h-[128px] flex flex-col items-center justify-start">
                <button
                  type="button"
                  onClick={() => setExperience(opt)}
                  className={`relative z-10 w-7 h-7 rounded-full border transition-all duration-500 ${
                    isSelected
                      ? 'bg-indigo-100 border-indigo-500 ring-4 ring-indigo-100 scale-110'
                      : idx <= expIndex
                      ? 'bg-indigo-50 border-indigo-300'
                      : 'bg-white border-gray-200 hover:border-indigo-200 hover:bg-indigo-50/30'
                  }`}
                  aria-label={`Select experience level: ${opt}`}
                />
                <span className={`mt-3 text-sm text-center transition-colors duration-300 max-w-[80px] break-words ${
                  isSelected ? 'text-indigo-700 font-medium' : 'text-gray-500'
                }`}>
                  {opt}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <motion.div key="step1" variants={fadeIn} initial="hidden" animate="visible" exit="hidden" transition={{ duration: 0.6, ease: "easeOut" }} className="space-y-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 px-9">What's your name?</label>
              <div className="relative px-8">
                <input
                  ref={nameInputRef}
                  type="text"
                  placeholder="e.g. Jordan"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400 text-gray-700 transition-all duration-300 text-sm"
                />
                {name.trim() && (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="absolute right-10 top-1/2 transform -translate-y-1/2 text-green-500"
                  >
                    <CheckIcon className="w-5 h-5" color="rgb(34 197 94)" />
                  </motion.div>
                )}
              </div>
            </div>
            <div className="mt-6 text-center px-9">
              <p className="text-sm text-gray-500">Join 1+ people finding clarity through Kind</p>
            </div>
          </motion.div>
        );
      case 2:
        return (
          <motion.div key="step2" variants={fadeIn} initial="hidden" animate="visible" exit="hidden" transition={{ duration: 0.6, ease: "easeOut" }} className="w-full">
            <div className="max-w-full space-y-5">
              <div className="w-full max-w-md px-9">
                <label className="block text-sm font-medium text-gray-700 leading-snug">What's your therapy background?</label>
              </div>
              <div className="w-full overflow-x-auto px-2">
                <div className="min-w-[500px]">{renderExperienceTimeline()}</div>
              </div>
            </div>
          </motion.div>
        );
      case 3: // Removed popular feature
        return (
          <motion.div 
            key="step3"
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="w-full flex flex-col relative h-[460px] px-3"
          >
            <div className="flex justify-between items-center mb-4 px-6">
              <label className="block text-sm font-medium text-gray-700">
                What topics are most important to you?
              </label>
              <span className={`text-sm font-medium ${
                topics.length >= 2 ? 'text-green-600' : 'text-gray-500'
              }`}>
                {topics.length} selected {topics.length >= 2 ? '✓' : `(min. 2)`}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-4 px-3 pb-8 custom-scrollbar">
              {topicCategories.map((category) => (
                <div key={category.name} className="bg-gray-50/50 p-4 rounded-xl">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">{category.name}</h3>
                  <div className="flex flex-wrap gap-2">
                    {category.topics.map((topic) => (
                      <button
                        key={topic.name}
                        type="button"
                        onClick={() => toggleTopic(topic.name)}
                        className={`px-3.5 py-2 rounded-full text-sm transition-all duration-300 ${
                          topics.includes(topic.name)
                            ? 'bg-indigo-100 text-indigo-800 border border-indigo-200 shadow-sm'
                            : 'bg-white text-gray-600 border border-gray-200 hover:border-indigo-200 hover:bg-indigo-50/50'
                        }`}
                      >
                        {topic.name}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white to-transparent z-10 mx-3" />
          </motion.div>
        );
      case 4:
        return (
          <motion.div key="step4-letter" variants={fadeIn} initial="hidden" animate="visible" exit="hidden" transition={{ duration: 0.6, ease: "easeOut" }} className="space-y-6 px-8 text-gray-700 text-sm leading-relaxed">
            <p>Hi {name?.split(' ')[0] || "there"},</p>
            {/* with a simple belief: everyone deserves access to mental well-being support that is flexible, affordable, and genuinely helpful. */}
            <p>
              Welcome to Kind! We're thrilled to have you join our community.
            </p>
            <p>
            Our app isn't perfect, and you shouldn't have to be either. What matters most is your mental well-being and feeling better out in the real world.
            </p>
            <div className="bg-gray-100 p-4 rounded-lg border border-gray-200 mt-4">
              <h3 className="font-semibold text-gray-800 mb-2 text-sm">Our Commitment to You</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                {[
                  "Your data stays yours — secure, private, and never shared.",
                  "Mindful app design to support real mental health journeys.",
                  "Continuous improvement of our product and services based on your feedback."
                ].map(item => (
                  <li key={item} className="flex items-start gap-2.5">
                    <CheckIcon className="w-4 h-4 mt-0.5 shrink-0" color="rgb(74 123 204)" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <p className="mt-4">
              To make the most of this platform, we ask for a small commitment from you:
            </p>
            <label className="flex items-start gap-3 text-sm text-gray-700 hover:bg-gray-50 p-3.5 rounded-lg transition-colors cursor-pointer border border-gray-200 hover:border-gray-300">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 shrink-0"
                checked={selfCommitment}
                onChange={(e) => setSelfCommitment(e.target.checked)}
                id="self-commitment-checkbox"
              />
              <span className="flex-1">
                I commit to respecting the Kind platform, myself, and my goals for using it.
              </span>
            </label>
            <div className="text-sm text-gray-500 text-center pt-2">
              You can always review our <Link href="/terms" className="text-indigo-600 hover:underline">Terms</Link>
              {', '}
              <Link href="/privacy" className="text-indigo-600 hover:underline">Privacy Policy</Link>
              {', and '}
              <Link href="/user-agreement" className="text-indigo-600 hover:underline">User Agreement</Link>.
            </div>
          </motion.div>
        );
      case 5:
        return (
          <motion.div key="step5-notice" variants={fadeIn} initial="hidden" animate="visible" exit="hidden" transition={{ duration: 0.6, ease: "easeOut" }} className="space-y-6 px-8 py-4">
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 text-sm">
              <h3 className="font-semibold text-yellow-800 mb-2 flex items-center gap-2">
                <svg className="h-5 w-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Important Notice
              </h3>
              <p className="text-yellow-700">
                Kind is not a replacement for professional therapy or medical care. If you need urgent mental health support, please reach out to a licensed provider.
              </p>
            </div>
            <label className="flex items-start gap-3 text-sm text-gray-700 hover:bg-gray-50 p-3.5 rounded-lg transition-colors cursor-pointer border border-gray-200 hover:border-gray-300">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 shrink-0"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                id="agreement-checkbox"
              />
              <span className="flex-1">
                I acknowledge that Kind is an AI support tool and not a substitute for professional mental health services.
              </span>
            </label>
          </motion.div>
        );
      default:
        return null;
    }
  };

  // Audio Setup Screen: Purple Mic/Animation/Button, Pastel Green Steps
  if (showAudioSetup) {
    return (
      <div className="min-h-screen bg-white flex flex-col relative overflow-hidden">
        {/* Header with logo */}
        <div className="fixed top-0 left-0 right-0 z-50">
          <nav className="py-4 bg-transparent">
            <div className="container mx-auto px-6 flex justify-center">
              <div className="text-2xl md:text-3xl font-bold text-gray-800 tracking-tight">
                kind
              </div>
            </div>
          </nav>
        </div>
        
        <div className="flex-1 flex items-start justify-center px-4 pt-20 sm:px-6 font-sans">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="bg-white rounded-xl shadow-m w-full max-w-lg overflow-hidden mt-8"
          >
          <div className="p-6 md:p-8 text-center">
            <div className="mb-4 flex justify-center">
                <div className={`relative w-24 h-24 flex items-center justify-center rounded-full transition-colors duration-300 ${showMicTestAnimation ? 'bg-indigo-100' : 'bg-gray-100'}`}> {/* Purple when testing */}
                    <MicIcon className={`w-12 h-12 transition-colors duration-300 ${readiness.micTested ? 'text-indigo-500' : 'text-gray-400'}`} color={readiness.micTested ? 'rgb(99 102 241)' : 'rgb(156 163 175)'} /> {/* Purple when tested */}
                </div>
            </div>

            <h1 className="text-2xl md:text-3xl font-semibold text-gray-800 mb-2">Ready Your Space</h1>
            <p className="text-gray-600 text-sm mb-4">
              A few quick steps to ensure the best experience for your voice session.
            </p>
          </div>

          <div className="px-6 md:px-10 pb-8 md:pb-10 space-y-4">
            {/* Step 1: Quiet Space (Pastel Green) */}
            <button
              type="button"
              onClick={() => setReadiness(prev => ({...prev, quietSpace: !prev.quietSpace}))}
              className={`w-full flex items-center p-4 rounded-lg border-2 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-300
                ${readiness.quietSpace ? 'border-green-400 bg-green-50 shadow-md' : 'border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50'}`}
            >
              <div className={`w-7 h-7 rounded-full flex items-center justify-center mr-4 shrink-0 transition-colors duration-300 text-white text-sm font-semibold
                ${readiness.quietSpace ? 'bg-green-300' : 'bg-gray-300'}`}
              >
                {readiness.quietSpace ? <CheckIcon className="w-4 h-4" /> : '1'}
              </div>
              <div className="text-left">
                <h3 className={`font-medium text-sm ${readiness.quietSpace ? 'text-green-700' : 'text-gray-700'}`}>Find a quiet space</h3>
                <p className={`text-sm ${readiness.quietSpace ? 'text-green-600' : 'text-gray-500'}`}>Minimize background noise and distractions.</p>
              </div>
              {readiness.quietSpace && <div className="ml-auto shrink-0"><CheckIcon className="w-5 h-5" color="rgb(74 222 128)" /></div>} {/* Pastel Green Check */}
            </button>

            {/* Step 2: Test Microphone (Pastel Green Step, Purple Animation) */}
            <button
              type="button"
              onClick={async () => { 
                if (!readiness.micTested && !showMicTestAnimation) {
                  setShowMicTestAnimation(true);
                  try {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    // Permission granted, start audio analysis
                    startAudioAnalysis(stream);
                  } catch (error) {
                    console.error("Microphone permission denied:", error);
                    setShowMicTestAnimation(false);
                    alert("Microphone access is required for voice sessions. Please allow microphone access and try again.");
                    return;
                  }
                }
              }}
              disabled={readiness.micTested || showMicTestAnimation}
              className={`w-full flex items-center p-4 rounded-lg border-2 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-300
                ${readiness.micTested ? 'border-green-400 bg-green-50 shadow-md' : 'border-gray-200 bg-white'}
                ${!readiness.micTested && !showMicTestAnimation ? 'hover:border-gray-300 hover:bg-gray-50' : ''}
                ${showMicTestAnimation ? 'cursor-default' : 'cursor-pointer'}`}
            >
              <div className={`w-7 h-7 rounded-full flex items-center justify-center mr-4 shrink-0 transition-colors duration-300 text-white text-sm font-semibold
                ${readiness.micTested ? 'bg-green-300' : (showMicTestAnimation ? 'bg-indigo-400 animate-pulse' : 'bg-gray-300')}`} /* Purple for animation active */
              >
                {readiness.micTested ? <CheckIcon className="w-4 h-4" /> : '2'}
              </div>
              <div className="text-left flex-1">
                <h3 className={`font-medium text-sm ${readiness.micTested ? 'text-green-700' : 'text-gray-700'}`}>Test your microphone</h3>
                <p className={`text-sm ${readiness.micTested ? 'text-green-600' : 'text-gray-500'}`}>
                  {showMicTestAnimation ? "Speak to test your microphone..." : readiness.micTested ? "Microphone working great!" : "Click here to test your mic."}
                </p>
              </div>
              {/* Mic Test Animation (Purple Bars - Real Audio Levels) */}
              {showMicTestAnimation && (
                <div className="ml-auto flex space-x-1 items-end h-6">
                  <div 
                    className="w-1.5 bg-indigo-400 rounded-full transition-all duration-75 ease-out" 
                    style={{ 
                      height: `${Math.max(4, Math.min(24, audioLevels[0] * 24))}px`,
                    }}
                  ></div>
                  <div 
                    className="w-1.5 bg-indigo-500 rounded-full transition-all duration-75 ease-out" 
                    style={{ 
                      height: `${Math.max(4, Math.min(24, audioLevels[1] * 24))}px`,
                    }}
                  ></div>
                  <div 
                    className="w-1.5 bg-indigo-400 rounded-full transition-all duration-75 ease-out" 
                    style={{ 
                      height: `${Math.max(4, Math.min(24, audioLevels[2] * 24))}px`,
                    }}
                  ></div>
                </div>
              )}
              {readiness.micTested && <div className="ml-auto shrink-0"><CheckIcon className="w-5 h-5" color="rgb(74 222 128)" /></div>} {/* Pastel Green Check */}
            </button>
          </div>

          <div className="px-6 md:px-10 pb-8 md:pb-10 pt-4">
            <div className="flex flex-col sm:flex-row-reverse gap-3">
              {/* Final Button (Purple) */}
              <button
                disabled={!allReadyForAudio}
                onClick={startSession}
                className={`w-full sm:w-auto px-8 py-3 rounded-lg text-sm font-semibold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2
                  ${allReadyForAudio
                    ? 'bg-neutral-500 text-white hover:bg-neutral-700 focus:ring-neutral-500 shadow-md hover:shadow-lg'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
              >
                {allReadyForAudio ? "I'm Ready to Begin" : "Complete All Steps"}
              </button>
              <button
                onClick={() => {
                    setShowAudioSetup(false);
                    // Reset mic test state when going back
                    setReadiness({ quietSpace: false, micTested: false });
                    setShowMicTestAnimation(false);
                    stopAudioAnalysis();
                }}
                className="w-full sm:w-auto px-8 py-3 rounded-lg text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
              >
                Back
              </button>
            </div>
          </div>
        </motion.div>
        </div>
      </div>
    );
  }

  // Main Onboarding Form
  return (
    <div className="min-h-screen bg-white flex flex-col relative overflow-hidden">
      {/* Header with logo that matches landing page position */}
      <div className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-in-out ${
        isFromLanding && !showContent ? 'opacity-0' : 'opacity-100'
      }`}>
        <nav className="py-4 bg-transparent">
          <div className="container mx-auto px-6 flex justify-center">
            <div className="text-2xl md:text-3xl font-bold text-gray-800 tracking-tight">
              kind
            </div>
          </div>
        </nav>
      </div>
      
      <div className="flex-1 flex items-center justify-center px-4 py-12 sm:px-6 pt-20">
        <motion.div 
          initial={isFromLanding ? { opacity: 0, y: 30 } : { opacity: 0, y: 60 }} 
          animate={showContent ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ 
            duration: isFromLanding ? 1.0 : 0.6, 
            ease: "easeOut",
            delay: isFromLanding ? 0.5 : 0
          }}
          className="max-w-[38rem] w-full flex flex-col bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-gray-100"
        >
        <div className="flex justify-between items-center mb-6 px-6 sm:px-8 pt-8 ">
          <motion.h1 className="text-xl sm:text-2xl font-semibold text-gray-800" key={`title-${currentStep}`} initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: 'easeOut' }}>
            {currentStep === 1 && 'Welcome'}
            {currentStep === 2 && 'Your Therapy Journey'}
            {currentStep === 3 && 'What Matters to You'}
            {currentStep === 4 && 'A Note From Us'}
            {currentStep === 5 && 'Important Acknowledgement'}
          </motion.h1>
          <div className="flex items-center">
            {[1, 2, 3, 4, 5].map((step) => (
              <div key={step} className="relative mx-1 sm:mx-1.5">
                <div className={`h-1.5 w-5 sm:w-7 rounded-full transition-all duration-500 ${step < currentStep ? 'bg-indigo-500' : step === currentStep ? 'bg-indigo-400' : 'bg-gray-200'}`} />
              </div>
            ))}
          </div>
        </div>

        {currentStep <= 3 && (
          <motion.div 
            className="mx-6 sm:mx-8 bg-gradient-to-r from-indigo-50 to-purple-50 p-4 sm:p-5 rounded-xl border border-indigo-100/60 mb-4" 
            key={`context-${currentStep}`} 
            variants={slideIn} 
            initial="hidden" 
            animate="visible"
            exit="hidden"
          >
            <p className="text-gray-700 text-sm leading-relaxed">
              {currentStep === 1 && "Your own therapy space, no stress. Up and running in under 3 minutes."}
              {currentStep === 2 && "Tell us where you’re at so we can tailor things to your experience."}
              {currentStep === 3 && "Select a few topics that resonate with your therapy journey. This is your starting point."}
            </p>
          </motion.div>
        )}
        
        <div className={`flex-1 overflow-y-auto min-h-[320px] sm:min-h-[360px] custom-scrollbar ${currentStep > 3 ? 'pt-4' : ''}`}>
          <AnimatePresence mode="wait">{renderStepContent()}</AnimatePresence>
        </div>

        <div className="flex justify-between items-center pt-5 pb-6 px-6 sm:px-8">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: currentStep > 1 ? 1 : 0 }} transition={{ duration: 0.5 }} className="min-w-[80px]">
            {currentStep > 1 ? (
              <button onClick={prevStep} className="px-4 py-2.5 text-sm text-gray-500 hover:text-indigo-600 transition-colors duration-300 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
                Back
              </button>
            ) : (
              <div></div>
            )}
          </motion.div>
          <motion.button 
            onClick={nextStep} 
            disabled={!isStepComplete()} 
            className={`px-6 py-3 rounded-lg text-white text-sm font-medium transition-all duration-300 shadow-sm hover:shadow-md ${isStepComplete() ? 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500' : 'bg-gray-300 cursor-not-allowed'}`}
            whileTap={isStepComplete() ? { scale: 0.98 } : {}}
          >
            {currentStep < totalSteps ? 'Continue' : "Complete & Prepare for Session"}
          </motion.button>
        </div>
        <div className="pt-3 mb-2 border-t border-gray-100 mt-4">
        </div>
      </motion.div>
      </div>
    </div>
  );
}
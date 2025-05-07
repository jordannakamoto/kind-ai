'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

// Refined topic categories with popular tags
const topicCategories = [
  {
    name: 'Emotional Well-being',
    topics: [
      { name: 'Anxiety', popular: true },
      { name: 'Depression', popular: true },
      { name: 'Grief' },
      { name: 'Trauma' },
      { name: 'Stress', popular: true },
      { name: 'Burnout' },
      { name: 'Loneliness' },
      { name: 'Anger' },
      { name: 'Social anxiety' }
    ]
  },
  {
    name: 'Self-Development',
    topics: [
      { name: 'ADHD', popular: true },
      { name: 'Body image' },
      { name: 'Self-esteem', popular: true },
      { name: 'Chronic illness' },
      { name: 'Addiction' },
      { name: 'Motivation' },
      { name: 'Confidence' }
    ]
  },
  {
    name: 'Relationships',
    topics: [
      { name: 'Relationships', popular: true },
      { name: 'Boundaries', popular: true },
      { name: 'Parenting' },
      { name: 'Conflict resolution' },
      { name: 'Attachment patterns' }
    ]
  },
  {
    name: 'Growth & Meaning',
    collapsed: true, // Start collapsed to reduce overwhelming options
    topics: [
      { name: 'Life transitions' },
      { name: 'Identity exploration' },
      { name: 'Decision making' },
      { name: 'Creativity' },
      { name: 'Communication skills' },
      { name: 'Purpose and meaning' },
      { name: 'Mindfulness', popular: true },
      { name: 'Personal growth' },
      { name: 'Emotional awareness' },
      { name: 'Inner child work' },
      { name: 'Resilience' },
      { name: 'Joy and playfulness' },
      { name: 'Spirituality' }
    ]
  }
];


const experienceOptions = [
  'None',
  'Just a little',
  'Some familiarity',
  'Pretty comfortable',
  'Very experienced',
];

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.6, ease: 'easeOut' } },
};

const slideIn = {
  hidden: { x: 10, opacity: 0 },
  visible: { x: 0, opacity: 1, transition: { duration: 0.5, ease: 'easeOut' } },
};

export default function OnboardingForm() {
  const [name, setName] = useState('');
  const [experience, setExperience] = useState('');
  const [topics, setTopics] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;
  const nameInputRef = useRef<HTMLInputElement>(null);

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
      case 1:
        return name.trim() !== '';
      case 2:
        return experience !== '';
      case 3:
        return topics.length >= 2;
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleSubmit();
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSubmit = () => {
    if (topics.length < 2) return;
    const payload = { name, experience, topics };
    console.log('Submitting onboarding:', payload);
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
                <span className={`mt-3 text-xs text-center transition-colors duration-300 max-w-[80px] break-words ${
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
          <motion.div key="step1" variants={fadeIn} initial="hidden" animate="visible" exit="hidden" className="space-y-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 px-9">What's your name?</label>
              <div className="relative px-8">
                <input
                  ref={nameInputRef}
                  type="text"
                  placeholder="e.g. Jordan"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400 text-gray-700 transition-all duration-300"
                />
                {name && (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-500"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </motion.div>
                )}
              </div>
            </div>
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500">Join 10,000+ people finding clarity through Kind</p>
            </div>
          </motion.div>
        );
      case 2:
        return (
          <motion.div key="step2" variants={fadeIn} initial="hidden" animate="visible" exit="hidden" className="w-full">
            <div className="max-w-full space-y-5">
              <div className="w-full max-w-md">
                <label className="block text-sm font-medium text-gray-700 leading-snug px-9">What's your therapy background?</label>
              </div>
              <div className="w-full overflow-x-auto">
                <div className="min-w-[500px]">{renderExperienceTimeline()}</div>
              </div>
            </div>
          </motion.div>
        );
        case 3:
          return (
            <motion.div 
              key="step3"
              variants={fadeIn}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="w-full flex flex-col relative h-[460px]" // force height to allow inner scroll
            >
              {/* <div className="flex justify-between items-center mb-4 px-9">
                <label className="block text-sm font-medium text-gray-700">
                  What topics are most important to you?
                </label>
                <span className={`text-sm font-medium ${
                  topics.length >= 2 ? 'text-green-600' : 'text-gray-500'
                }`}>
                  {topics.length} selected {topics.length >= 2 ? '✓' : `(select at least 2)`}
                </span>
              </div> */}
        
              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto space-y-4 px-6 pb-8">
                {topicCategories.map((category) => (
                  <div key={category.name} className="space-y-3 bg-gray-50/50 p-4 rounded-xl">
                    <h3 className="text-sm font-medium text-gray-700">{category.name}</h3>
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
        
              {/* Optional scroll hint gradient */}
              <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white to-transparent z-10" />
            </motion.div>
          );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50/30 via-white to-purple-50/20 flex items-center justify-center px-6 py-12">
      <div className="max-w-[38rem] w-full flex flex-col bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-100">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 px-8 pt-8 ">
          <motion.h1 className="text-2xl font-medium text-gray-800" key={`title-${currentStep}`} initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: 'easeOut' }}>
            {currentStep === 1 && 'Welcome to Kind'}
            {currentStep === 2 && 'Your Therapy Journey'}
            {currentStep === 3 && 'What Matters to You'}
          </motion.h1>
          <div className="flex items-center">
            {[1, 2, 3].map((step) => (
              <div key={step} className="relative mx-1.5">
                <div className={`h-1.5 w-7 rounded-full transition-all duration-500 ${step < currentStep ? 'bg-indigo-500' : step === currentStep ? 'bg-indigo-400' : 'bg-gray-200'}`} />
                <div className={`absolute -bottom-4 left-1/2 transform -translate-x-1/2 text-xs ${step === currentStep ? 'text-indigo-600 font-medium' : 'text-gray-400'}`}>{step}</div>
              </div>
            ))}
          </div>
        </div>
        <motion.div className="mx-8  bg-gradient-to-r from-indigo-50 to-purple-50 p-5 rounded-xl border border-indigo-100/60 mb-4" key={`context-${currentStep}`} variants={slideIn} initial="hidden" animate="visible">
          <p className="text-gray-700 text-sm leading-relaxed">
            {currentStep === 1 && "We're creating your personalized therapy experience. It takes less than 2 minutes to get started."}
            {currentStep === 2 && "Understanding your background helps us tailor content to your experience level."}
            {currentStep === 3 && "Select a few topics that resonate with your therapy journey."}
          </p>
        </motion.div>
        <div className="flex-1 overflow-y-auto min-h-[240px]">
          <AnimatePresence mode="wait">{renderStepContent()}</AnimatePresence>
        </div>
        <div className="flex justify-between items-center pt-5 px-8">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: currentStep > 1 ? 1 : 0 }} transition={{ duration: 0.5 }}>
            {currentStep > 1 ? (
              <button onClick={prevStep} className="px-4 py-2 text-sm text-gray-500 hover:text-indigo-600 transition-colors duration-300 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
                Back
              </button>
            ) : (
              <div></div>
            )}
          </motion.div>
          <motion.button onClick={nextStep} disabled={!isStepComplete()} className={`px-6 py-2.5 rounded-lg text-white text-sm font-medium transition-all duration-300 ${isStepComplete() ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-gray-300 cursor-not-allowed'}`} whileTap={isStepComplete() ? { scale: 0.98 } : {}}>
            {currentStep < totalSteps ? 'Continue' : "Let's Begin Your Journey"}
          </motion.button>
        </div>
        {/* <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6, duration: 0.6 }} className="text-center mt-5">
          <button className="text-sm text-gray-500 hover:text-indigo-600 transition-colors duration-300 flex items-center mx-auto">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Save and continue later
          </button>
        </motion.div> */}
        <div className="pt-4 mb-3 border-t border-gray-100 mt-6">
          {/* <p className="text-xs text-center text-gray-400">We're here to help</p> */}
        </div>
      </div>
    </div>
  );
}

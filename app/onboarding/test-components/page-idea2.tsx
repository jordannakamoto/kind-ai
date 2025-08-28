  'use client';

import { useEffect, useState } from 'react';

import Link from 'next/link';

export default function ConsentAndPreparePage() {
  // State for agreement section
  const [agreed, setAgreed] = useState(false);
  const [selfCommitment, setSelfCommitment] = useState(false);
  
  // State for audio setup section
  const [showAudioSetup, setShowAudioSetup] = useState(false);
  const [readiness, setReadiness] = useState({
    quietSpace: false,
    micTested: false
  });
  
  const [showAnimation, setShowAnimation] = useState(false);
  
  // Check if all readiness criteria are met
  const allReady = Object.values(readiness).every(value => value === true);
  
  // For mic test animation
  useEffect(() => {
    let timer: any;
    if (showAnimation) {
      timer = setTimeout(() => {
        setShowAnimation(false);
        setReadiness(prev => ({...prev, micTested: true}));
      }, 3000);
    }
    
    return () => clearTimeout(timer);
  }, [showAnimation]);
  
  const handleContinue = () => {
    if (!agreed || !selfCommitment) return;
    setShowAudioSetup(true);
  };
  
  const startSession = () => {
    window.location.href = '/session/start';
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-3xl bg-white rounded-xl shadow-sm border border-gray-200 text-gray-800 font-sans relative">
        {!showAudioSetup ? (
          // Consent Agreement Section
          <div className="p-8">
           
            
            {/* Title */}
            <h1 className="text-2xl font-semibold text-center mb-6">Thanks For Joining Kind</h1>
            
            {/* Content */}
            <div className="space-y-6">
              <p className="text-gray-600">
                Your first <span className="font-medium text-black">3 voice sessions</span> are on us.
              </p>
              
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-100">
                <h2 className="font-medium text-gray-800 mb-3">Our Commitment</h2>
                <p className="text-sm text-gray-600 mb-4">
                  We are building Kind to make mental health support more accessible, flexible, and affordable. Here’s what matters most to us:
                </p>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <svg className="h-5 w-5 text-indigo-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Your data stays yours — secure, private, and never shared</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="h-5 w-5 text-indigo-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Our approaches are designed to support real mental health journeys</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="h-5 w-5 text-indigo-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Continuous improvement of our product and services</span>
                  </li>
                </ul>
              </div>
              
              <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-100">
                <h2 className="font-medium text-gray-800 mb-2 flex items-center gap-2">
                  <svg className="h-5 w-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>Important Notice</span>
                </h2>
                <p className="text-sm text-gray-600">
                  Kind is not a replacement for professional therapy or medical care. If you need urgent mental health support, please reach out to a licensed provider.
                </p>
              </div>
              
              <div className="space-y-3 pt-2">
                <label className="flex items-start gap-2 text-sm text-gray-700 hover:bg-gray-50 p-2 rounded transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                  />
                  <span>
                    I acknowledge that Kind is an AI support tool and not a substitute for professional mental health services.
                  </span>
                </label>
                
                <label className="flex items-start gap-2 text-sm text-gray-700 hover:bg-gray-50 p-2 rounded transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={selfCommitment}
                    onChange={(e) => setSelfCommitment(e.target.checked)}
                  />
                  <span>
                    I commit to respecting the Kind platform, myself, and my goals.
                  </span>
                </label>
              </div>
              
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
                <div className="text-sm text-gray-500 space-x-4">
                  <Link href="/terms" className="text-indigo-600 hover:underline">Terms of Service</Link>
                  <Link href="/privacy" className="text-indigo-600 hover:underline">Privacy Policy</Link>
                  <Link href="/user-agreement" className="text-indigo-600 hover:underline">User Agreement</Link>
                </div>
                
                <button
                  disabled={!agreed || !selfCommitment}
                  onClick={handleContinue}
                  className={`px-6 py-2 text-sm rounded-md transition font-medium ${
                    agreed && selfCommitment
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        ) : (
          // Audio Setup Section
          <div>
            <div className="md:flex">
              {/* Left: Audio Setup Image - with pastel colors */}
              <div className="md:w-1/2 bg-indigo-100 p-8 flex flex-col justify-center items-center text-indigo-900 text-center">
                <div className={`w-48 h-48 rounded-full bg-white flex items-center justify-center mb-6 shadow-inner ${showAnimation ? 'animate-pulse' : ''}`}>
                  <span className="text-7xl">🎤</span>
                </div>
                <h2 className="text-2xl font-bold mb-2">Let's set up your space</h2>
                <p className="text-indigo-700">
                  Create your perfect environment for a meaningful voice session
                </p>
              </div>
              
              {/* Right: Setup Steps */}
              <div className="p-8 md:w-1/2">
                <h2 className="text-2xl font-semibold mb-6 text-gray-800">Ready your environment</h2>
                
                <div className="space-y-6">                  
                  {/* Quiet Space Step */}
                  <div 
                    className={`p-4 rounded-lg border transition-colors cursor-pointer ${
                      readiness.quietSpace 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                    onClick={() => setReadiness(prev => ({...prev, quietSpace: !prev.quietSpace}))}
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          readiness.quietSpace ? 'bg-green-500 text-white' : 'bg-gray-200'
                        }`}
                      >
                        {readiness.quietSpace ? (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                        ) : '1'}
                      </div>
                      
                      <div>
                        <h3 className="font-medium text-gray-800">Find a quiet space</h3>
                        <p className="text-sm text-gray-600">Minimize distractions for better focus</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Test Mic Step */}
                  <div 
                    className={`p-4 rounded-lg border transition-colors ${
                      readiness.micTested 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100 cursor-pointer'
                    }`}
                    onClick={() => {
                      if (!readiness.micTested) {
                        setShowAnimation(true);
                      }
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          readiness.micTested ? 'bg-green-500 text-white' : 'bg-gray-200'
                        }`}
                      >
                        {readiness.micTested ? (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                        ) : '2'}
                      </div>
                      
                      <div>
                        <h3 className="font-medium text-gray-800">Test your microphone</h3>
                        <p className="text-sm text-gray-600">
                          {showAnimation 
                            ? "Listening..." 
                            : readiness.micTested 
                              ? "Microphone working well!" 
                              : "Click to test your mic"}
                        </p>
                      </div>
                      
                      {showAnimation && (
                        <div className="ml-auto flex space-x-1">
                          <div className="w-2 h-6 bg-indigo-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                          <div className="w-2 h-8 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                          <div className="w-2 h-4 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '600ms' }}></div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="mt-8 flex justify-between">
                  <button
                    onClick={() => setShowAudioSetup(false)}
                    className="px-4 py-2 rounded-md transition font-medium text-sm border border-gray-300 text-gray-600 hover:bg-gray-50"
                  >
                    Back
                  </button>
                
                  <button
                    disabled={!allReady}
                    onClick={startSession}
                    className={`px-6 py-2 rounded-md transition font-medium text-sm ${
                      allReady
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {allReady ? "I'm Ready to Begin" : "Complete All Steps"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
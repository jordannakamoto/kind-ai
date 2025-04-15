'use client';

import * as React from 'react';

import { useEffect, useRef, useState } from 'react';

import { ElevenLabsClient } from "elevenlabs";
import {redis} from '@/redis/client';
import { supabase } from '@/supabase/client';
import { useConversation } from '@11labs/react';

// Helper function to request microphone permission
async function requestMicrophonePermission() {
  try {
    await navigator.mediaDevices.getUserMedia({ audio: true });
    return true;
  } catch {
    console.error("Microphone permission denied");
    return false;
  }
}

// Function to get signed URL
// Function to get signed URL
async function getSignedUrl(userEmail: string) {
  const res = await fetch(`/api/elevenlabs-connection?user_email=${encodeURIComponent(userEmail)}`);
  
  if (!res.ok) {
    throw Error("Failed to get signed url");
  }

  const { signedUrl } = await res.json();
  return signedUrl;
}

interface User {
  id: string;
  bio: string;
  therapy_summary: string;
  themes: string;
  goals: string;
  email: string;
}

interface TherapyModule {
  name: string;
  greeting: string;
  instructions: string;
  agenda: string;
}

interface SystemPrompt {
  name: string;
  prompt: string;
}

// Function to compile user profile as plain text
function compileUserProfile(user: User): string {
  return `Bio: ${user.bio}
Therapy Summary: ${user.therapy_summary}
Themes: ${user.themes}
Goals: ${user.goals}`;
}

// Function to compile therapy module as plain text (excluding greeting)
function compileTherapyModule(module: TherapyModule): string {
  return `
Instructions: ${module.instructions}
Agenda: ${module.agenda}`;
}

export default function ElevenLabsConversation() {
  // State for user, module, and system prompt selection
  const [users, setUsers] = useState<User[]>([]);
  const [modules, setModules] = useState<TherapyModule[]>([]);
  const [systemPrompts, setSystemPrompts] = useState<SystemPrompt[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedModule, setSelectedModule] = useState<TherapyModule | null>(null);
  const [selectedPrompt, setSelectedPrompt] = useState<SystemPrompt | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  
  // Editable variables
  const [userProfileVar, setUserProfileVar] = useState<string>('');
  const [therapyModuleVar, setTherapyModuleVar] = useState<string>('');
  const [greetingVar, setGreetingVar] = useState<string>('');
  const [systemPromptVar, setSystemPromptVar] = useState<string>('');
  
  // Track if variables have been manually edited
  const [userProfileEdited, setUserProfileEdited] = useState(false);
  const [therapyModuleEdited, setTherapyModuleEdited] = useState(false);
  const [greetingEdited, setGreetingEdited] = useState(false);
  const [systemPromptEdited, setSystemPromptEdited] = useState(false);

  // Initialize conversation hook
  const conversation = useConversation({
    onConnect: () => {
      console.log("connected");
    },
    onDisconnect: () => {
      console.log("disconnected");
    },
    onError: error => {
      console.log(error);
      alert("An error occurred during the conversation");
    },
    onMessage: message => {
      console.log(message);
    },
  });


  // Fetch users, modules, and system prompts on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch users
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, bio, therapy_summary, themes, goals, email')
          .order('bio');
        
        if (userError) throw userError;
        setUsers(userData || []);
        
        // Fetch therapy modules
        const { data: moduleData, error: moduleError } = await supabase
          .from('therapy_modules')
          .select('name, greeting, instructions, agenda')
          .order('updated_at', { ascending: false });
        
        if (moduleError) throw moduleError;
        setModules(moduleData || []);

        // Fetch system prompts
        const { data: promptData, error: promptError } = await supabase
          .from('system_prompts')
          .select('name, prompt')
          .order('name');
        if (promptError) throw promptError;
        setSystemPrompts(promptData || []);
      } catch (err: any) {
        console.error("Error fetching data:", err);
        setError(`Error loading data: ${err.message}`);
      }
    };
    
    fetchData();
  }, []);

  // Update variables when selections change (if not manually edited)
  useEffect(() => {
    if (!userProfileEdited && selectedUser) {
      setUserProfileVar(compileUserProfile(selectedUser));
    }
  }, [selectedUser, userProfileEdited]);

  useEffect(() => {
    if (!therapyModuleEdited && selectedModule) {
      setTherapyModuleVar(compileTherapyModule(selectedModule));
    }
    if (!greetingEdited && selectedModule) {
      setGreetingVar(selectedModule.greeting || '');
    }
  }, [selectedModule, therapyModuleEdited, greetingEdited]);

  useEffect(() => {
    if (!systemPromptEdited && selectedPrompt) {
      setSystemPromptVar(selectedPrompt.prompt || '');
    }
  }, [selectedPrompt, systemPromptEdited]);

  // Store current values for conversation
  const varsRef = useRef({ 
    userProfile: '', 
    therapyModule: '', 
    greeting: '', 
    systemPrompt: '' 
  });

  // Update ref when starting conversation
  useEffect(() => {
    if (conversation.status !== 'connected') {
      varsRef.current = {
        userProfile: userProfileVar,
        therapyModule: therapyModuleVar,
        greeting: greetingVar,
        systemPrompt: systemPromptVar,
      };
    }
  }, [userProfileVar, therapyModuleVar, greetingVar, systemPromptVar, conversation.status]);
  
  async function startConversation() {
    if (!selectedUser) {
      alert("Please select a user before starting the session.");
      return;
    }
  
    const hasPermission = await requestMicrophonePermission();
    if (!hasPermission) {
      alert("Microphone access is required to begin.");
      return;
    }
  
    try {
      const signedUrl = await getSignedUrl(selectedUser.email); // ✅ safe now
      const dynamicVariables = varsRef.current;
  
      const conversationId = await conversation.startSession({
        signedUrl,
        dynamicVariables,
      });
  
      setConversationId(conversationId);

      // Redis record lasts for 10 minutes
      await fetch('/api/ai-therapist/cache-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, userId: selectedUser.id }),
      });
            
      console.log("Conversation started:", conversationId);
    } catch (err) {
      console.error("Error starting conversation:", err);
      alert("There was an error starting the session.");
    }
  }

  async function stopConversation() {
    try {
      await conversation.endSession();
      console.log("Conversation ended");
    } catch (err) {
      console.error("Error ending conversation:", err);
      alert("There was an error ending the session.");
    }
  }

  // Auto resize textarea
  const autoResizeTextarea = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  };

  return (
    <div className="space-y-2 w-full mx-auto">
      {/* Selection Section - More Compact */}
      <div className="bg-white p-2 rounded-lg shadow-sm border border-gray-100">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-700 mb-0.5">User</label>
            <select 
              className="w-full py-1 px-2 text-sm bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={selectedUser?.email || ''}
              onChange={(e) => {
                const userEmail = e.target.value;
                const user = users.find(u => u.email === userEmail);
                setSelectedUser(user || null);
                setUserProfileEdited(false);
              }}
              disabled={conversation.status === 'connected'}
            >
              <option value="">Select user</option>
              {users.map((user) => (
                <option key={user.email} value={user.email}>
                  {user.email}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-700 mb-0.5">Module</label>
            <select 
              className="w-full py-1 px-2 text-sm bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={selectedModule?.name || ''}
              onChange={(e) => {
                const moduleName = e.target.value;
                const module = modules.find(m => m.name === moduleName);
                setSelectedModule(module || null);
                setTherapyModuleEdited(false);
                setGreetingEdited(false);
              }}
              disabled={conversation.status === 'connected'}
            >
              <option value="">Select module</option>
              {modules.map((module) => (
                <option key={module.name} value={module.name}>
                  {module.name?.substring(0, 50) || 'Untitled Module'}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-700 mb-0.5">System Prompt</label>
            <select 
              className="w-full py-1 px-2 text-sm bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={selectedPrompt?.name || ''}
              onChange={(e) => {
                const promptName = e.target.value;
                const prompt = systemPrompts.find(p => p.name === promptName);
                setSelectedPrompt(prompt || null);
                setSystemPromptEdited(false);
              }}
              disabled={conversation.status === 'connected'}
            >
              <option value="">Select prompt</option>
              {systemPrompts.map((prompt) => (
                <option key={prompt.name} value={prompt.name}>
                  {prompt.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      
      {/* Editable Variables Section - More Efficient Space Usage */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white p-2 rounded-lg shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-1">
            <h3 className="text-sm font-medium">User Profile</h3>
            {userProfileEdited && 
              <span className="text-xs text-blue-600 italic">(Edited)</span>
            }
          </div>
          <textarea 
            className="w-full p-2 bg-white border border-gray-200 rounded-md font-mono text-sm min-h-[180px] focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={userProfileVar}
            onChange={(e) => {
              setUserProfileVar(e.target.value);
              setUserProfileEdited(true);
              autoResizeTextarea(e);
            }}
            onInput={autoResizeTextarea}
            disabled={conversation.status === 'connected'}
          />
        </div>
        
        <div className="bg-white p-2 rounded-lg shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-1">
            <h3 className="text-sm font-medium">System Prompt</h3>
            {systemPromptEdited && 
              <span className="text-xs text-blue-600 italic">(Edited)</span>
            }
          </div>
          <textarea 
            className="w-full p-2 bg-white border border-gray-200 rounded-md font-mono text-sm min-h-[180px] focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={systemPromptVar}
            onChange={(e) => {
              setSystemPromptVar(e.target.value);
              setSystemPromptEdited(true);
              autoResizeTextarea(e);
            }}
            onInput={autoResizeTextarea}
            disabled={conversation.status === 'connected'}
          />
        </div>
        
        <div className="bg-white p-2 rounded-lg shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-1">
            <h3 className="text-sm font-medium">Therapy Module</h3>
            {therapyModuleEdited && 
              <span className="text-xs text-blue-600 italic">(Edited)</span>
            }
          </div>
          <textarea 
            className="w-full p-2 bg-white border border-gray-200 rounded-md font-mono text-sm min-h-[180px] focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={therapyModuleVar}
            onChange={(e) => {
              setTherapyModuleVar(e.target.value);
              setTherapyModuleEdited(true);
              autoResizeTextarea(e);
            }}
            onInput={autoResizeTextarea}
            disabled={conversation.status === 'connected'}
          />
        </div>

        <div className="bg-white p-2 rounded-lg shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-1">
            <h3 className="text-sm font-medium">Greeting</h3>
            {greetingEdited && 
              <span className="text-xs text-blue-600 italic">(Edited)</span>
            }
          </div>
          <textarea 
            className="w-full p-2 bg-white border border-gray-200 rounded-md font-mono text-sm min-h-[180px] focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={greetingVar}
            onChange={(e) => {
              setGreetingVar(e.target.value);
              setGreetingEdited(true);
              autoResizeTextarea(e);
            }}
            onInput={autoResizeTextarea}
            disabled={conversation.status === 'connected'}
          />
        </div>
      </div>
      
      {/* Error Display */}
      {error && (
        <div className="p-2 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}
      
      {/* Conversation Controls - More Compact */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`orb ${
                conversation.status === "connected" && conversation.isSpeaking
                  ? "orb-active animate-orb"
                  : conversation.status === "connected"
                  ? "animate-orb-slow orb-inactive"
                  : "orb-inactive"
              }`}
            ></div>
            <div className="text-base font-medium">
              {conversation.status === "connected"
                ? conversation.isSpeaking
                  ? "Agent is speaking"
                  : "Agent is listening"
                : "Disconnected"}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              className={`py-2 px-4 rounded-md border text-sm font-medium transition-colors ${
                conversation !== null && conversation.status === "connected"
                  ? "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "border-indigo-200 bg-white text-indigo-600 hover:bg-indigo-50"
              }`}
              disabled={conversation !== null && conversation.status === "connected"}
              onClick={startConversation}
            >
              Start conversation
            </button>
            <button
              className={`py-2 px-4 rounded-md border text-sm font-medium transition-colors ${
                conversation === null || conversation.status !== "connected"
                  ? "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "border-red-200 bg-white text-red-600 hover:bg-red-50"
              }`}
              disabled={conversation === null || conversation.status !== "connected"}
              onClick={stopConversation}
            >
              End conversation
            </button>
          </div>
        </div>
      </div>
      
      {/* CSS for animations */}
      <style jsx>{`
        .orb {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        
        .orb-inactive {
          background-color: #e5e7eb;
        }
        
        .orb-active {
          background-color: #4f46e5;
        }
        
        @keyframes orb {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(0.95); }
        }
        
        @keyframes orb-slow {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(0.98); }
        }
        
        .animate-orb {
          animation: orb 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        
        .animate-orb-slow {
          animation: orb-slow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </div>
  );
}
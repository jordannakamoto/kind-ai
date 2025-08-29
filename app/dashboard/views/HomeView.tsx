"use client";

import { Mic, MicOff, PlayCircle, BookOpen, Sparkles, Heart } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import MysticalOrb from "@/app/dashboard/aiorb"; // Assuming this component exists
import { supabase } from "@/supabase/client";
import LoadingDots from '@/components/LoadingDots';
import { useConversation } from "@11labs/react"; // Hook uses micMuted prop
import { useConversationStatus } from "@/app/contexts/ConversationContext"; // Assuming this context exists
import { useActiveSession } from "@/app/contexts/ActiveSessionContext";

// Define types for modules for better clarity
interface TherapyModule {
  greeting: string;
  instructions: string;
  agenda: string;
  name?: string; // Add name to identify the module
}

interface NextSessionModule extends TherapyModule {
  status: string;
}


interface Course {
  id: string;
  title: string;
  description: string;
  image_path?: string;
  therapy_modules?: any[];
}

interface UserCourseProgress {
  id: string;
  course_id: string;
  current_module_index: number;
  completed_modules: string[];
  is_completed: boolean;
  courses?: Course;
}

export default function UserCheckInConversation() {
  const [user, setUser] = useState<{ id: string; email: string, app_stage?: string } | null>(null);
  const [agentMessage, setAgentMessage] = useState("");
  const [amplitude, setAmplitude] = useState(0);
  const [started, setStarted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [loadingVars, setLoadingVars] = useState(true);
  const [sessionStatus, setSessionStatus] = useState<string | null>(null);
  const [module, setModule] = useState<TherapyModule | null>(null);
  const [autoStartWelcome, setAutoStartWelcome] = useState(false);
  const [isMuted, setIsMuted] = useState(false); // Local state to control micMuted prop
  const [inProgressCourses, setInProgressCourses] = useState<UserCourseProgress[]>([]);
  const [recommendedSessions, setRecommendedSessions] = useState<any[]>([]);
  
  const { setSessionActive, updateSessionData, endSession: endActiveSession, setToggleMute } = useActiveSession();

  const {
    conversationEnded,
    setConversationEnded,
    pollingStatus,
  } = useConversationStatus();

  const varsRef = useRef<{
    userProfile: string;
    therapyModule: string;
    greeting: string;
    systemPrompt: string;
  }>({
    userProfile: "",
    therapyModule: "",
    greeting: "",
    systemPrompt: "",
  });

  const pollingComplete = pollingStatus.sessionsUpdated && pollingStatus.bioUpdated;
  const canManuallyStart = !loadingVars && (!conversationEnded || pollingComplete) && !autoStartWelcome;

  const animationRef = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startSound = useRef<HTMLAudioElement | null>(null);
  const endSound = useRef<HTMLAudioElement | null>(null);

  // Pass isMuted to the hook
  const conversation = useConversation({
    micMuted: isMuted, // Controlled prop
    onMessage: (msg) => {
      if (
        typeof msg === "object" &&
        msg !== null &&
        "message" in msg &&
        "source" in msg &&
        (msg as any).source === "agent"
      ) {
        const message = (msg as any).message;
        setAgentMessage(message);
        updateSessionData({ agentMessage: message });
      }
    },
    onConnect: () => {
      intervalRef.current = setInterval(() => {
        setDuration((d) => {
          const newDuration = d + 1;
          updateSessionData({ duration: newDuration });
          return newDuration;
        });
      }, 1000);
      startSound.current?.play();
      setIsMuted(false); // Ensure conversation starts unmuted
      setSessionActive(true);
      updateSessionData({ status: 'connected', isMuted: false });
    },
    onDisconnect: () => {
      endSound.current?.play();
      if (intervalRef.current) clearInterval(intervalRef.current);
      setIsMuted(false); // Reset mute state on disconnect
      endActiveSession();
    },
    onError: (err) => console.error("conversation error:", err),
  });

  const fetchUserContext = async () => {
    setLoadingVars(true);
    setAutoStartWelcome(false);

    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authUser) {
      console.error("Auth error or no user:", authError?.message);
      setLoadingVars(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("bio, therapy_summary, themes, goals, email, app_stage, full_name")
      .eq("id", authUser.id)
      .single();

    if (profileError || !profile) {
      console.error("Profile error or no profile:", profileError?.message);
      setLoadingVars(false);
      return;
    }

    setUser({ id: authUser.id, email: authUser.email!, app_stage: profile.app_stage });

    if (profile.app_stage === "post-onboarding") {
      const { data: welcomePromptData, error: welcomePromptError } = await supabase
        .from("system_prompts")
        .select("prompt")
        .eq("name", "Welcome")
        .single();

      const { data: welcomeModuleData, error: welcomeModuleError } = await supabase
        .from("therapy_modules")
        .select("greeting, instructions, agenda, name")
        .eq("name", "Welcome")
        .single();

      if (welcomePromptError || !welcomePromptData || welcomeModuleError || !welcomeModuleData) {
        console.warn("Missing welcome module or prompt:", { welcomePromptError, welcomeModuleError });
        setLoadingVars(false);
        return;
      }

      const personalizedGreeting = welcomeModuleData.greeting.replace("[User's Name]", profile.full_name || "there");

      varsRef.current = {
        userProfile: `Name: ${profile.full_name}\nBio: ${profile.bio || 'Not provided'}\nTherapy Summary: ${profile.therapy_summary || 'Not provided'}\nThemes: ${profile.themes || 'Not provided'}\nGoals: ${profile.goals || 'Not provided'}`,
        therapyModule: `Instructions: ${welcomeModuleData.instructions}\nAgenda: ${welcomeModuleData.agenda}`,
        greeting: personalizedGreeting,
        systemPrompt: welcomePromptData.prompt,
      };
      setModule({...welcomeModuleData, greeting: personalizedGreeting });
      setSessionStatus("welcome_ready");
      setLoadingVars(false);
      setAutoStartWelcome(true);
      return;
    }

    const { data: defaultPrompt, error: defaultPromptError } = await supabase
      .from("system_prompts")
      .select("prompt")
      .eq("name", "Conversational 1")
      .single();

    if (defaultPromptError || !defaultPrompt) {
        console.warn("Missing default system prompt (Conversational 1):", defaultPromptError?.message);
        setLoadingVars(false);
        return;
    }

    const { data: nextSessionData, error: nextSessionError } = await supabase
      .from("next_sessions")
      .select("greeting, instructions, agenda, status")
      .eq("user_id", authUser.id)
      .single();

    let finalModule: TherapyModule | null = null;

    if (nextSessionData && nextSessionData.status === "ready") {
      finalModule = nextSessionData;
      setSessionStatus("ready");
    } else {
      setSessionStatus(nextSessionData?.status || "pending_regular");

      const { data: fallbackModule, error: fallbackError } = await supabase
        .from("therapy_modules")
        .select("greeting, instructions, agenda")
        .eq("name", "Default Daily Check In")
        .single();

      if (fallbackError || !fallbackModule) {
        console.warn("Missing fallback daily check-in module:", fallbackError?.message);
        setLoadingVars(false);
        return;
      }
      finalModule = fallbackModule;
    }

    if (!finalModule) {
      console.warn("Could not determine a module for the session.");
      setLoadingVars(false);
      return;
    }

    varsRef.current = {
      userProfile: `Name: ${profile.full_name}\nBio: ${profile.bio || 'Not provided'}\nTherapy Summary: ${profile.therapy_summary || 'Not provided'}\nThemes: ${profile.themes || 'Not provided'}\nGoals: ${profile.goals || 'Not provided'}`,
      therapyModule: `Instructions: ${finalModule.instructions}\nAgenda: ${finalModule.agenda}`,
      greeting: finalModule.greeting,
      systemPrompt: defaultPrompt.prompt,
    };

    setModule(finalModule);
    setLoadingVars(false);
  };

  const fetchCourseProgress = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;

    // Fetch in-progress courses
    const { data: progressData } = await supabase
      .from("user_course_progress")
      .select(`
        *,
        courses (
          id, title, description, image_path,
          therapy_modules (id, name)
        )
      `)
      .eq("user_id", authUser.id)
      .eq("is_completed", false)
      .order("updated_at", { ascending: false });

    if (progressData) {
      setInProgressCourses(progressData);
    }

    // Fetch recommended sessions (you can customize this logic)
    const { data: modulesData } = await supabase
      .from("therapy_modules")
      .select("id, name, description")
      .in("name", ["Anxiety Management", "Mindfulness Practice", "Sleep Hygiene"])
      .limit(3);

    if (modulesData) {
      setRecommendedSessions(modulesData);
    }
  };

  useEffect(() => {
    fetchUserContext();
    fetchCourseProgress();
    // startSound.current = new Audio('/path/to/start-sound.mp3');
    // endSound.current = new Audio('/path/to/end-sound.mp3');
  }, []);

  useEffect(() => {
    if (autoStartWelcome && !loadingVars && !started) {
      console.log("Auto-starting welcome session...");
      startConversation();
    }
  }, [autoStartWelcome, loadingVars, started]);

  useEffect(() => {
    if (sessionStatus !== "pending_regular" || !user?.id || user?.app_stage === "post-onboarding") {
      return;
    }

    console.log("Polling for regular session readiness...");
    const interval = setInterval(async () => {
      const { data: sessions, error } = await supabase
        .from("next_sessions")
        .select("greeting, instructions, agenda, status")
        .eq("user_id", user.id)
        .eq("status", "ready")
        .limit(1);

      if (error) {
        console.error("Error polling next_session:", error.message);
        clearInterval(interval);
        return;
      }

      const session = sessions?.[0];

      if (session?.status === "ready") {
        console.log("Regular session is now ready.");
        setModule(session);
        setSessionStatus("ready");

        const { data: defaultPrompt, error: promptError } = await supabase
            .from("system_prompts")
            .select("prompt")
            .eq("name", "Conversational 1")
            .single();

        if(promptError || !defaultPrompt){
            console.error("Failed to reload default prompt for ready session", promptError?.message);
        } else {
            varsRef.current.systemPrompt = defaultPrompt.prompt;
        }

        varsRef.current.therapyModule = `Instructions: ${session.instructions}\nAgenda: ${session.agenda}`;
        varsRef.current.greeting = session.greeting;
        clearInterval(interval);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [sessionStatus, user?.id, user?.app_stage]);

  useEffect(() => {
    if (!started) return;

    const animate = () => {
      const vol = conversation.isSpeaking
        ? conversation.getOutputVolume()
        // If the hook provides a way to know if the mic is *actually* muted by it, use that.
        // Otherwise, rely on our `isMuted` state for visual feedback.
        : isMuted ? 0 : conversation.getInputVolume();
      setAmplitude((prev) => prev * 0.6 + vol * 0.4);
      
      // Update the active session context with speaking state
      updateSessionData({ isSpeaking: conversation.isSpeaking });
      
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [started, conversation.isSpeaking, conversation, isMuted, updateSessionData]); // Added conversation to dependency array

  const startConversation = async () => {
    if (!user || loadingVars || !varsRef.current.greeting) {
        console.warn("Cannot start conversation: User not loaded, vars loading, or greeting missing.");
        return;
    }
    
    try {
      // Request microphone permission first
      await navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          // Stop the stream immediately, we just needed permission
          stream.getTracks().forEach(track => track.stop());
        })
        .catch(err => {
          console.error("Microphone permission denied:", err);
          alert("Microphone access is required for this session. Please allow microphone access and try again.");
          throw err;
        });

      setConversationEnded(false);
      setIsMuted(false); // Ensure mic is unmuted (by prop) when starting

      const res = await fetch(
        `/api/elevenlabs-connection?user_email=${user.email}`
      );
      if (!res.ok) {
          console.error("Failed to get signed URL for ElevenLabs connection", await res.text());
          return;
      }
      const { signedUrl } = await res.json();

      if (!signedUrl) {
          console.error("Signed URL is missing from API response");
          return;
      }

      const id = await conversation.startSession({
        signedUrl,
        dynamicVariables: varsRef.current,
      });

      await fetch("/api/ai-therapist/cache-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: id, userId: user.id }),
      });

      setStarted(true);
      setDuration(0);
      setAutoStartWelcome(false);
    } catch (error: any) {
      console.error("Failed to start conversation:", error);
      // Don't show another alert if we already showed the microphone permission alert
      if (error?.name !== 'NotAllowedError' && error?.name !== 'NotFoundError') {
        alert("Failed to start session. Please check your connection and try again.");
      }
    }
  };

  const stopConversation = async () => {
    const wasWelcomeSession = module?.name === "Welcome";

    await conversation.endSession();
    setStarted(false);
    setAmplitude(0);
    setAgentMessage("");
    setDuration(0);
    setConversationEnded(true);
    setIsMuted(false); // Reset mute state

    varsRef.current = { userProfile: "", therapyModule: "", greeting: "", systemPrompt: "" };
    setLoadingVars(true);
    setModule(null);

    if (wasWelcomeSession && user?.id) {
      console.log("Welcome session ended. Updating app_stage to dashboard for user:", user.id);
      const { error: updateError } = await supabase
        .from("users")
        .update({ app_stage: "dashboard" })
        .eq("id", user.id);
      if (updateError) {
        console.error("Failed to update user app_stage:", updateError.message);
      }
      setUser(prev => prev ? {...prev, app_stage: "dashboard"} : null);
    }

    console.log("Conversation stopped. Re-fetching user context...");
    await fetchUserContext();
  };

  const toggleMute = useCallback(() => {
    setIsMuted(prevMutedState => {
      const newMutedState = !prevMutedState;
      updateSessionData({ isMuted: newMutedState });
      return newMutedState;
    });
  }, [updateSessionData]);

  // Register toggleMute function with context when component mounts or toggleMute changes
  useEffect(() => {
    setToggleMute(toggleMute);
  }, [setToggleMute, toggleMute]);

  const orbSize = 160;

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
    const secs = (seconds % 60).toString().padStart(2, "0");
    return `${minutes}:${secs}`;
  };

  return (
    <div className="w-full max-w-4xl h-screen mx-auto flex flex-col px-4 transition-all duration-300">
      {/* Main AI Therapist Section - Moved Up */}
      <div className="flex flex-col items-center pt-28 pb-8">
        <div className="mb-6 text-center">
          <p className="text-lg font-semibold">Mira</p>
          <p className="text-sm">{formatTime(duration)}</p>
          <p className="text-sm text-gray-400">
            {loadingVars && !started ? <LoadingDots className="text-sm" /> :
             !started && sessionStatus === "welcome_ready" ? "Welcome session ready." :
             !started && sessionStatus === "pending_regular" && module?.name !== "Welcome" ? "Preparing your check-in..." :
             !started && sessionStatus === "ready" && module?.name !== "Welcome" ? "Check-in ready." :
             conversation.status !== "connected" && !started ? "Idle" :
             conversation.isSpeaking
             ? isMuted
               ? "Speaking... (Muted)"
               : "Speaking..."
             : isMuted
               ? "Listening... (Muted)"
               : "Listening..."
            }
          </p>
        </div>

        <div
          className="relative flex items-center justify-center mb-6 transition-opacity duration-300"
          style={{ width: "200px", height: "200px" }}
        >
          <div
            className="absolute rounded-full transition-transform duration-100 ease-in-out"
            style={{
              width: `${orbSize}px`,
              height: `${orbSize}px`,
              transform: `scale(${1 + amplitude * 0.35})`,
              transformOrigin: 'center center',
              left: '50%',
              top: '50%',
              marginLeft: `-${orbSize/2}px`,
              marginTop: `-${orbSize/2}px`,
            }}
          >
            <MysticalOrb />
          </div>
        </div>

        {started && agentMessage && (
          <p className="text-sm max-w-[320px] text-center text-gray-700 leading-snug mb-4 p-3 bg-gray-100 rounded-lg shadow">
            {agentMessage}
          </p>
        )}

        <div className="flex items-center justify-center gap-3 text-gray-600">
          {started && (
            <button
              onClick={toggleMute}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full text-gray-700 bg-white hover:bg-gray-100 border border-gray-100 transition-colors shadow hover:shadow-md text-sm font-medium"
              aria-label={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? (
    <>
      <MicOff className="w-5 h-5" />
    </>
  ) : (
    <>
      <Mic className="w-5 h-5" />
    </>
  )}
            </button>
          )}
          {started ? (
            <button
              onClick={stopConversation}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full text-gray-700 bg-white hover:bg-gray-100 border border-gray-100 transition-colors shadow hover:shadow-md"
            >
              <svg className="w-4 h-4 fill-current text-gray-600" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M5 5h10v10H5V5z" clipRule="evenodd"></path>
              </svg>
              <span className="text-sm font-medium">End Session</span>
            </button>
          ) : (
            <button
              disabled={!canManuallyStart && !autoStartWelcome}
              onClick={startConversation}
              className="px-6 py-3 border border-gray-300 rounded-full hover:bg-gray-100 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow hover:shadow-md"
            >
              {loadingVars ? <LoadingDots className="text-sm" /> :
               sessionStatus === "welcome_ready" ? "Start Welcome Session" :
               sessionStatus === "pending_regular" ? "Processing previous session..." :
               "Start Check-In"}
            </button>
          )}
        </div>
      </div>

      {/* Microsoft Copilot-Style Activity Cards */}
      {!started && (
        <div className="flex-1 flex flex-col items-center justify-start max-w-4xl mx-auto mt-10">
          <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Continue Course Card */}
            {inProgressCourses.length > 0 && (
              <div className="group cursor-pointer bg-gray-50/50 border border-gray-100 rounded-lg p-5 hover:bg-gray-50 hover:border-gray-200 transition-all duration-300 min-h-[72px] relative">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                    <PlayCircle className="w-4 h-4 text-gray-500" />
                  </div>
                  <div className="flex-1 pr-6">
                    <p className="text-sm font-medium text-gray-700">Continue {inProgressCourses[0].courses?.title || 'Course'}</p>
                    <p className="text-xs text-gray-400">Pick up where you left off</p>
                  </div>
                </div>
                <div className="absolute right-5 top-1/2 transform -translate-y-1/2 text-xs text-gray-300 group-hover:text-gray-400 transition-colors duration-300">→</div>
              </div>
            )}

            {/* Browse Courses Card */}
            <div className="group cursor-pointer bg-gray-50/50 border border-gray-100 rounded-lg p-5 hover:bg-gray-50 hover:border-gray-200 transition-all duration-300 min-h-[72px] relative">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-4 h-4 text-gray-500" />
                </div>
                <div className="flex-1 pr-6">
                  <p className="text-sm font-medium text-gray-700">Browse courses</p>
                  <p className="text-xs text-gray-400">Explore therapy modules</p>
                </div>
              </div>
              <div className="absolute right-5 top-1/2 transform -translate-y-1/2 text-xs text-gray-300 group-hover:text-gray-400 transition-colors duration-300">→</div>
            </div>

            {/* Recommended Sessions */}
            {recommendedSessions.length > 0 && (
              <div className="group cursor-pointer bg-gray-50/50 border border-gray-100 rounded-lg p-5 hover:bg-gray-50 hover:border-gray-200 transition-all duration-300 min-h-[72px] relative">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-gray-500" />
                  </div>
                  <div className="flex-1 pr-6">
                    <p className="text-sm font-medium text-gray-700">Try {recommendedSessions[0].name}</p>
                    <p className="text-xs text-gray-400">Recommended for you</p>
                  </div>
                </div>
                <div className="absolute right-5 top-1/2 transform -translate-y-1/2 text-xs text-gray-300 group-hover:text-gray-400 transition-colors duration-300">→</div>
              </div>
            )}

            {/* Mindful Moments Card */}
            <div className="group cursor-pointer bg-gray-50/50 border border-gray-100 rounded-lg p-5 hover:bg-gray-50 hover:border-gray-200 transition-all duration-300 min-h-[72px] relative">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Heart className="w-4 h-4 text-gray-500" />
                </div>
                <div className="flex-1 pr-6">
                  <p className="text-sm font-medium text-gray-700">Mindful moments</p>
                  <p className="text-xs text-gray-400">Quick wellness check-ins</p>
                </div>
              </div>
              <div className="absolute right-5 top-1/2 transform -translate-y-1/2 text-xs text-gray-300 group-hover:text-gray-400 transition-colors duration-300">→</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
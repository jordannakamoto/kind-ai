"use client";

import { Mic, MicOff } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import MysticalOrb from "@/app/dashboard/aiorb"; // Assuming this component exists
import { supabase } from "@/supabase/client";
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

  useEffect(() => {
    fetchUserContext();
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

  const orbSize = 160 + amplitude * 50;

  const formatTime = (seconds: number): string =>
    `${Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;

  return (
    <div className="w-full max-w-2xl h-screen mx-auto flex flex-col items-center justify-center  px-4 transition-all duration-300">
      <div className="mb-6 text-center">
        <p className="text-lg font-semibold">Mira</p>
        <p className="text-sm">{formatTime(duration)}</p>
        <p className="text-sm text-gray-400">
          {loadingVars && !started ? "Loading session..." :
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
        className="relative flex items-center justify-center mb-8"
        style={{ width: "200px", height: "200px" }}
      >
        <div
          className="absolute rounded-full transition-transform duration-100 ease-in-out"
          style={{
            width: `${orbSize}px`,
            height: `${orbSize}px`,
            transform: `scale(${1 + amplitude * 0.15})`,
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
            className="px-6 py-3 border mb-36 border-gray-300 rounded-full hover:bg-gray-100 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow hover:shadow-md"
          >
            {loadingVars ? "Loading..." :
             sessionStatus === "welcome_ready" ? "Start Welcome Session" :
             sessionStatus === "pending_regular" ? "Processing previous session..." :
             "Start Check-In"}
          </button>
        )}
      </div>
    </div>
  );
}
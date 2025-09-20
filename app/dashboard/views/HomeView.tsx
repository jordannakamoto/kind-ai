"use client";

import { Mic, MicOff, PlayCircle, BookOpen, Sparkles, Heart, MessageCircle, Palette } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import MysticalOrb from "@/app/dashboard/aiorb"; // Assuming this component exists
import { supabase } from "@/supabase/client";
import LoadingDots from '@/components/LoadingDots';
import { useConversation } from "@11labs/react"; // Hook uses micMuted prop
import { useConversationStatus } from "@/app/contexts/ConversationContext"; // Assuming this context exists
import { useActiveSession } from "@/app/contexts/ActiveSessionContext";
import { useRouter, useSearchParams } from "next/navigation";

// Define types for modules for better clarity
interface TherapyModule {
  greeting: string;
  instructions: string;
  agenda: string;
  name?: string; // Add name to identify the module
  description?: string; // Add description to show in course indicator
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

export default function UserCheckInConversation({ sidebarCollapsed = false }: { sidebarCollapsed?: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
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
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [enrolling, setEnrolling] = useState<string | null>(null);
  const [activeCourse, setActiveCourse] = useState<Course | null>(null);
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);
  const [cardsDataLoaded, setCardsDataLoaded] = useState(false);
  const [cardsVisible, setCardsVisible] = useState(true);
  // Check URL params immediately on mount to set loading state
  const [loadingCourseFromUrl, setLoadingCourseFromUrl] = useState(false);
  const [startingSession, setStartingSession] = useState(false); // Loading state for any session start
  const [isClient, setIsClient] = useState(false);
  const [activeTab, setActiveTab] = useState<'voice' | 'appearance'>('voice');
  const [voiceSettings, setVoiceSettings] = useState({
    name: 'Mira', // AI therapist name
    voice: 'Mira', // Default voice
    personality: 'Empathetic', // Default personality
    primaryColor: '#4f46e5', // Default primary color (indigo)
    secondaryColor: '#10b981', // Default secondary color (emerald)
    accentColor: '#f59e0b' // Default accent color (amber)
  });
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);
  
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
        setTimeout(() => updateSessionData({ agentMessage: message }), 0);
      }
    },
    onConnect: () => {
      intervalRef.current = setInterval(() => {
        setDuration((d) => {
          const newDuration = d + 1;
          setTimeout(() => updateSessionData({ duration: newDuration }), 0);
          return newDuration;
        });
      }, 1000);
      startSound.current?.play();
      setIsMuted(false); // Ensure conversation starts unmuted
      setSessionActive(true);
      // Set started and clear all loading states when conversation actually connects
      setStarted(true);
      setLoadingCourseFromUrl(false);
      setStartingSession(false);
      setTimeout(() => updateSessionData({ status: 'connected', isMuted: false }), 0);
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
        .select("greeting, instructions, agenda, name")
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

    setCardsDataLoaded(false);

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

    // Fetch available courses (not enrolled yet)
    const enrolledCourseIds = progressData?.map(p => p.course_id) || [];
    const { data: availableCoursesData } = await supabase
      .from("courses")
      .select(`
        id, title, description, image_path,
        therapy_modules (id, name)
      `)
      .not("id", "in", `(${enrolledCourseIds.join(",") || "null"})`)
      .order("updated_at", { ascending: false })
      .limit(6);

    if (availableCoursesData) {
      setAvailableCourses(availableCoursesData);
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

    // Mark cards data as loaded after all fetches are complete
    setCardsDataLoaded(true);
    setCardsVisible(true);
  };

  useEffect(() => {
    setIsClient(true);
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
      
      // Update the active session context with speaking state - defer to avoid render-time updates
      setTimeout(() => updateSessionData({ isSpeaking: conversation.isSpeaking }), 0);
      
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [started, conversation.isSpeaking, conversation, isMuted, updateSessionData]); // Added conversation to dependency array


  const checkMicrophonePermission = async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop the stream immediately, we just needed to check permission
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      console.error("Microphone permission denied:", error);
      alert("Microphone access is required for this session. Please allow microphone access and try again.");
      return false;
    }
  };

  const startConversation = async () => {
    if (!user || loadingVars || !varsRef.current.greeting) {
        console.warn("Cannot start conversation: User not loaded, vars loading, or greeting missing.");
        return;
    }
    
    // Set loading state for session start
    setStartingSession(true);
    
    try {
      // Don't clear loading state here if we're loading from URL
      // It will be cleared when conversation actually connects
      
      // Check microphone permission first
      const hasPermission = await checkMicrophonePermission();
      if (!hasPermission) {
        setLoadingCourseFromUrl(false);
        setStartingSession(false);
        return;
      }

      // Fade out cards before starting session
      setCardsVisible(false);
      
      // Wait for fade-out animation to complete before hiding cards
      setTimeout(() => {
        setCardsDataLoaded(false);
      }, 400);

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

      // Determine session type for metadata
      const sessionType = module?.name === "Welcome" ? "welcome" : 
                          activeCourse ? "course" : "regular";
      
      // Ensure module name is always set
      const moduleName = module?.name || (activeCourse ? "Course Module" : "Default Daily Check In");
      
      console.log("Caching session metadata - Type:", sessionType, "Module:", moduleName, "ActiveCourse:", !!activeCourse);
      
      await fetch("/api/ai-therapist/cache-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          conversationId: id, 
          userId: user.id,
          sessionType,
          moduleName
        }),
      });

      // Don't set started to true yet - wait for onConnect to avoid UI flash
      setDuration(0);
      setAutoStartWelcome(false);
      // Don't clear startingSession here - wait for onConnect
    } catch (error: any) {
      console.error("Failed to start conversation:", error);
      setLoadingCourseFromUrl(false); // Clear loading state on error
      setStartingSession(false); // Clear session loading state on error
      alert("Failed to start session. Please check your connection and try again.");
    }
  };

  const updateCourseProgress = async () => {
    if (!user || !activeCourse || !module) return;

    try {
      // First, get the current progress to understand where we are
      const { data: currentProgress, error: progressError } = await supabase
        .from('user_course_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('course_id', activeCourse.id)
        .single();

      if (progressError || !currentProgress) {
        console.error('Error fetching current progress:', progressError);
        return;
      }

      // Get the module ID we just completed
      const { data: moduleData, error: moduleError } = await supabase
        .from('therapy_modules')
        .select('id')
        .eq('course_id', activeCourse.id)
        .eq('name', module.name)
        .single();

      if (moduleError || !moduleData) {
        console.error('Error finding module ID:', moduleError);
        return;
      }

      // Update completed modules and current index
      const completedModules = [...(currentProgress.completed_modules || [])];
      if (!completedModules.includes(moduleData.id)) {
        completedModules.push(moduleData.id);
      }

      // Get total modules in course to check if complete
      const { data: allModules, error: allModulesError } = await supabase
        .from('therapy_modules')
        .select('id')
        .eq('course_id', activeCourse.id)
        .order('created_at', { ascending: true });

      if (allModulesError || !allModules) {
        console.error('Error fetching all modules:', allModulesError);
        return;
      }

      const isCompleted = completedModules.length >= allModules.length;
      const nextModuleIndex = Math.min(currentProgress.current_module_index + 1, allModules.length - 1);

      // Update the progress
      const { error: updateError } = await supabase
        .from('user_course_progress')
        .update({
          completed_modules: completedModules,
          current_module_index: isCompleted ? currentProgress.current_module_index : nextModuleIndex,
          is_completed: isCompleted,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentProgress.id);

      if (updateError) {
        console.error('Error updating course progress:', updateError);
      } else {
        console.log(`Course progress updated - completed: ${completedModules.length}/${allModules.length}`);
        // Refresh course data to show updated progress
        await fetchCourseProgress();
      }

    } catch (error: any) {
      console.error('Error updating course progress:', error.message);
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
    setActiveCourse(null);

    // Update course progress if we were working on a course
    if (activeCourse && module && user?.id && !wasWelcomeSession) {
      await updateCourseProgress();
    }

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
    
    // Refresh course data to show updated progress
    await fetchCourseProgress();
  };

  const toggleMute = useCallback(() => {
    setIsMuted(prevMutedState => {
      const newMutedState = !prevMutedState;
      setTimeout(() => updateSessionData({ isMuted: newMutedState }), 0);
      return newMutedState;
    });
  }, [updateSessionData]);

  // Handle starting a new course
  const handleStartCourse = async (course: Course) => {
    if (!user || !course.therapy_modules?.length) return;
    setEnrolling(course.id);

    try {
      // Enroll user in the course
      const { error: enrollError } = await supabase
        .from('user_course_progress')
        .insert({
          user_id: user.id,
          course_id: course.id,
          current_module_index: 0,
          completed_modules: [],
          is_completed: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (enrollError) throw enrollError;

      // Get the first module of the course
      const { data: firstModule, error: moduleError } = await supabase
        .from('therapy_modules')
        .select('greeting, instructions, agenda, name, description')
        .eq('course_id', course.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      if (moduleError || !firstModule) {
        console.error('Error fetching first module:', moduleError);
        throw new Error('Could not load course module');
      }

      // Set the active course
      setActiveCourse(course);
      
      // Load the module into varsRef and start session
      await initializeSessionWithModule(firstModule);
      
      // Refresh course data
      await fetchCourseProgress();
      console.log('Starting course:', course.title);
    } catch (err: any) {
      console.error('Error starting course:', err.message);
    } finally {
      setEnrolling(null);
    }
  };

  // Handle continuing a course 
  const handleContinueCourse = async (courseProgress: UserCourseProgress) => {
    if (!user || !courseProgress.courses?.therapy_modules?.length) return;

    try {
      // Get the current module based on progress
      const currentModuleIndex = courseProgress.current_module_index;
      const { data: currentModule, error: moduleError } = await supabase
        .from('therapy_modules')
        .select('greeting, instructions, agenda, name, description')
        .eq('course_id', courseProgress.course_id)
        .order('created_at', { ascending: true })
        .limit(1)
        .range(currentModuleIndex, currentModuleIndex)
        .single();

      if (moduleError || !currentModule) {
        console.error('Error fetching current module:', moduleError);
        return;
      }

      // Set the active course
      if (courseProgress.courses) {
        setActiveCourse(courseProgress.courses);
      }
      
      // Load the module and start session
      await initializeSessionWithModule(currentModule);
      console.log('Continuing course:', courseProgress.courses?.title);
    } catch (err: any) {
      console.error('Error continuing course:', err.message);
    }
  };

  // Helper function to initialize session with a specific module
  const initializeSessionWithModule = async (module: TherapyModule) => {
    if (!user) return;

    setLoadingVars(true);
    
    try {
      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("full_name, bio, therapy_summary, themes, goals")
        .eq("id", user.id)
        .single();

      if (profileError || !profile) {
        console.error("Error fetching user profile:", profileError);
        return;
      }

      // Get system prompt
      const { data: defaultPrompt, error: promptError } = await supabase
        .from("system_prompts")
        .select("prompt")
        .eq("name", "Conversational 1")
        .single();

      if (promptError || !defaultPrompt) {
        console.error("Error fetching system prompt:", promptError);
        return;
      }

      // Set up the session variables
      varsRef.current = {
        userProfile: `Name: ${profile.full_name}\nBio: ${profile.bio || 'Not provided'}\nTherapy Summary: ${profile.therapy_summary || 'Not provided'}\nThemes: ${profile.themes || 'Not provided'}\nGoals: ${profile.goals || 'Not provided'}`,
        therapyModule: `Instructions: ${module.instructions}\nAgenda: ${module.agenda}`,
        greeting: module.greeting,
        systemPrompt: defaultPrompt.prompt,
      };

      setModule(module);
      setSessionStatus("ready");
      setLoadingVars(false);

      // Auto-start the conversation after a brief delay
      // Don't clear loading state here - let it clear when conversation connects
      setTimeout(() => {
        startConversation();
      }, 500);

    } catch (error: any) {
      console.error("Error initializing session:", error.message);
      setLoadingVars(false);
      setLoadingCourseFromUrl(false);
    }
  };

  // Set initial loading state based on URL params when component mounts
  useEffect(() => {
    const startCourseId = searchParams.get('startCourse');
    const continueCourseId = searchParams.get('continueCourse');
    
    // Set loading state if URL has course params
    if ((startCourseId || continueCourseId) && !loadingCourseFromUrl) {
      setLoadingCourseFromUrl(true);
    }
  }, []); // Run once on mount

  // Handle URL parameters to auto-start courses
  useEffect(() => {
    const startCourseId = searchParams.get('startCourse');
    const continueCourseId = searchParams.get('continueCourse');

    const handleCourseFromUrl = async (courseId: string, isNew: boolean) => {
      if (!user || started) return;

      setLoadingCourseFromUrl(true);
      try {
        // Fetch the course progress for this specific course
        const { data: progressData, error: progressError } = await supabase
          .from('user_course_progress')
          .select(`
            *,
            courses (
              id, title, description, image_path,
              therapy_modules (id, name, description, greeting, instructions, agenda, course_id, created_at, updated_at)
            )
          `)
          .eq('user_id', user.id)
          .eq('course_id', courseId)
          .single();

        if (progressError || !progressData) {
          console.error('Error fetching course progress:', progressError);
          setLoadingCourseFromUrl(false);
          // Clear the URL parameter even on error
          router.replace('/dashboard?tab=home');
          return;
        }

        console.log(isNew ? 'Auto-starting newly enrolled course:' : 'Auto-continuing course:', progressData.courses?.title);
        
        // Handle the course continuation
        await handleContinueCourse(progressData);
        
        // Clear the URL parameter
        router.replace('/dashboard?tab=home');
      } catch (error: any) {
        console.error('Error loading course from URL:', error.message);
        setLoadingCourseFromUrl(false);
        // Clear the URL parameter even on error
        router.replace('/dashboard?tab=home');
      }
    };

    // Check immediately when user is available, don't wait for loadingVars
    if (startCourseId && user && !started) {
      handleCourseFromUrl(startCourseId, true);
    } else if (continueCourseId && user && !started) {
      handleCourseFromUrl(continueCourseId, false);
    } else if (!startCourseId && !continueCourseId && loadingCourseFromUrl) {
      // No course parameters but loading state is true, reset it
      setLoadingCourseFromUrl(false);
    }
  }, [searchParams, user, started, router]);

  // Handle browsing courses
  const handleBrowseCourses = () => {
    router.push('/dashboard?tab=discover');
  };

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
    <>
      {/* Personalize Button - Fixed to top right of entire window */}
      <button
        onClick={() => setShowCustomizeModal(true)}
        className="fixed top-4 right-4 md:top-6 md:right-6 z-50 flex items-center gap-1 md:gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-white/90 backdrop-blur-sm border border-gray-200/60 rounded-lg text-gray-600 hover:text-gray-800 hover:bg-white hover:border-gray-300 transition-all duration-200 shadow-lg hover:shadow-xl"
      >
        <Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4" />
        <span className="text-xs md:text-sm font-medium">Personalize</span>
      </button>

    <div className={`w-full max-w-4xl h-screen ${sidebarCollapsed ? 'mx-auto' : 'ml-8 lg:ml-16'} flex flex-col px-4 md:px-6 transition-all duration-300 relative`}>

      {/* Main AI Therapist Section - Moved Up */}
      <div className="flex flex-col items-center pt-20 md:pt-28 pb-6 md:pb-8">
        <div className="mb-4 md:mb-6 text-center">
          <p className="text-base md:text-lg font-semibold">{voiceSettings.name}</p>
          <p className="text-xs md:text-sm">{formatTime(duration)}</p>
          <p className="text-xs md:text-sm text-gray-400 transition-opacity duration-500 h-5 flex items-center justify-center">
            <span className={loadingVars && !started ? "opacity-0" : "opacity-100"}>
              {!started && sessionStatus === "welcome_ready" ? "Welcome session ready." :
               !started && sessionStatus === "pending_regular" && module?.name !== "Welcome" ? "Preparing your check-in..." :
               !started && sessionStatus === "ready" && module?.name !== "Welcome" ? "Check-in ready." :
             conversation.isSpeaking
             ? isMuted
               ? "Speaking... (Muted)"
               : "Speaking..."
             : isMuted
               ? "Listening... (Muted)"
               : "Listening..."
            }
            </span>
          </p>
        </div>

        <div
          className="relative flex items-center justify-center mb-4 md:mb-6 transition-opacity duration-300"
          style={{ width: "160px", height: "160px" }}
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

        {started && !startingSession && agentMessage && (
          <p className="text-xs md:text-sm max-w-[280px] md:max-w-[320px] text-center text-gray-700 leading-snug mb-3 md:mb-4 p-2 md:p-3 bg-gray-100 rounded-lg shadow">
            {agentMessage}
          </p>
        )}

        <div className="flex items-center justify-center gap-2 md:gap-3 text-gray-600">
          {started && !startingSession && (
            <button
              onClick={toggleMute}
              className="flex items-center gap-1.5 md:gap-2 px-3 py-2 md:px-4 md:py-2.5 rounded-full text-gray-700 bg-white hover:bg-gray-100 border border-gray-100 transition-colors shadow hover:shadow-md text-xs md:text-sm font-medium"
              aria-label={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? (
    <>
      <MicOff className="w-4 h-4 md:w-5 md:h-5" />
    </>
  ) : (
    <>
      <Mic className="w-4 h-4 md:w-5 md:h-5" />
    </>
  )}
            </button>
          )}
          {started && !startingSession ? (
            <button
              onClick={stopConversation}
              className="flex items-center gap-1.5 md:gap-2 px-4 py-2 md:px-5 md:py-2.5 rounded-full text-gray-700 bg-white hover:bg-gray-100 border border-gray-100 transition-colors shadow hover:shadow-md"
            >
              <svg className="w-4 h-4 fill-current text-gray-600" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M5 5h10v10H5V5z" clipRule="evenodd"></path>
              </svg>
              <span className="text-xs md:text-sm font-medium">End Session</span>
            </button>
          ) : (
            <button
              disabled={(!canManuallyStart && !autoStartWelcome) || loadingCourseFromUrl || startingSession || started}
              onClick={startConversation}
              className="px-5 py-2.5 md:px-6 md:py-3 border border-gray-300 rounded-full hover:bg-gray-100 text-xs md:text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow hover:shadow-md"
            >
              {startingSession || loadingCourseFromUrl ? <LoadingDots className="text-sm" /> :
               loadingVars ? <LoadingDots className="text-sm" /> :
               sessionStatus === "welcome_ready" ? "Start Welcome Session" :
               sessionStatus === "pending_regular" ? "Processing previous session..." :
               "Start Check-In"}
            </button>
          )}
        </div>

        {/* Course Indicator - Show when session is active and course is selected */}
        {started && !startingSession && activeCourse && (
          <div className="mt-8 flex items-center justify-center">
            <div className="flex items-center gap-3 px-4 py-2 bg-gray-50/50 border border-gray-100 rounded-lg">
              <div className="w-8 h-8 rounded-md overflow-hidden bg-gray-200">
                {activeCourse.image_path ? (
                  <img 
                    src={activeCourse.image_path} 
                    alt={activeCourse.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                    <BookOpen className="w-4 h-4 text-gray-400" />
                  </div>
                )}
              </div>
              <div className="text-left">
                <p className="text-xs font-medium text-gray-700">{activeCourse.title}</p>
                <p className="text-xs text-gray-400">{module?.name || "Therapy session in progress"}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Microsoft Copilot-Style Activity Cards */}
      {!started && cardsDataLoaded && (
        <div className={`flex-1 flex flex-col items-center justify-start max-w-4xl ${sidebarCollapsed ? 'mx-auto' : 'ml-8 lg:ml-16'} mt-6 md:mt-10`}>
          <div className={`w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6 transition-all duration-400 ${!cardsVisible ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
            {/* Continue Course Cards - Show all in-progress courses */}
            {inProgressCourses.map((courseProgress, index) => (
              <div 
                key={courseProgress.id}
                onClick={() => handleContinueCourse(courseProgress)}
                className="group cursor-pointer bg-gray-50/50 border border-gray-100 rounded-lg p-4 md:p-5 hover:bg-gray-50 hover:border-gray-200 transition-all duration-300 min-h-[64px] md:min-h-[72px] relative opacity-0 animate-fade-in"
                style={{ animationDelay: `${200 + index * 100}ms` }}
              >
                    <div className="flex items-start gap-2 md:gap-3">
                      <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                        <PlayCircle className="w-4 h-4 text-gray-500" />
                      </div>
                      <div className="flex-1 pr-6">
                        <p className="text-xs md:text-sm font-medium text-gray-700">Continue {courseProgress.courses?.title || 'Course'}</p>
                        <p className="text-[10px] md:text-xs text-gray-400">
                          {courseProgress.completed_modules?.length || 0} of {courseProgress.courses?.therapy_modules?.length || 0} modules completed
                        </p>
                      </div>
                    </div>
                <div className="absolute right-5 top-1/2 transform -translate-y-1/2 text-xs text-gray-300 group-hover:text-gray-400 transition-colors duration-300">→</div>
              </div>
            ))}

            {/* Recommended Course Card - Show one available course as recommendation */}
            {availableCourses.length > 0 && (
              <div 
                key={`recommended-${availableCourses[0].id}`}
                onClick={() => handleStartCourse(availableCourses[0])}
                className={`group cursor-pointer bg-gray-50/50 border border-gray-100 rounded-lg p-5 hover:bg-gray-50 hover:border-gray-200 transition-all duration-300 min-h-[72px] relative opacity-0 animate-fade-in ${
                  enrolling === availableCourses[0].id ? 'opacity-50 cursor-wait' : ''
                }`}
                style={{ animationDelay: `${200 + inProgressCourses.length * 100}ms` }}
              >
                    <div className="flex items-start gap-2 md:gap-3">
                      <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                        <BookOpen className="w-4 h-4 text-gray-500" />
                      </div>
                      <div className="flex-1 pr-6">
                        <p className="text-xs md:text-sm font-medium text-gray-700">
                          {enrolling === availableCourses[0].id ? 'Starting...' : `Try ${availableCourses[0].title}`}
                        </p>
                        <p className="text-[10px] md:text-xs text-gray-400">
                          Recommended for you
                        </p>
                      </div>
                    </div>
                <div className="absolute right-5 top-1/2 transform -translate-y-1/2 text-xs text-gray-300 group-hover:text-gray-400 transition-colors duration-300">→</div>
              </div>
            )}

            {/* Mindful Moments Card - Keep as a standalone quick session option */}
            <div 
              className="group cursor-pointer bg-gray-50/50 border border-gray-100 rounded-lg p-4 md:p-5 hover:bg-gray-50 hover:border-gray-200 transition-all duration-300 min-h-[64px] md:min-h-[72px] relative opacity-0 animate-fade-in"
              style={{ animationDelay: `${200 + (inProgressCourses.length + (availableCourses.length > 0 ? 1 : 0)) * 100}ms` }}
            >
                  <div className="flex items-start gap-2 md:gap-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                      <Heart className="w-4 h-4 text-gray-500" />
                    </div>
                    <div className="flex-1 pr-6">
                      <p className="text-xs md:text-sm font-medium text-gray-700">Mindful moments</p>
                      <p className="text-[10px] md:text-xs text-gray-400">Quick wellness check-ins</p>
                    </div>
                  </div>
              <div className="absolute right-5 top-1/2 transform -translate-y-1/2 text-xs text-gray-300 group-hover:text-gray-400 transition-colors duration-300">→</div>
            </div>
          </div>
        </div>
      )}

      {/* Customize Modal */}
      {showCustomizeModal && isClient && createPortal(
        <div className="fixed inset-0 flex items-center justify-center p-12 z-[100000]">
          {/* Glass backdrop */}
          <div
            className="absolute inset-0 bg-white/80 backdrop-blur-sm animate-backdrop"
            onClick={() => setShowCustomizeModal(false)}
          />

          {/* Modal content */}
          <div className="relative bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden animate-slideUp z-[100001]">
            {/* Modal Header with Inline Tabs */}
            <div className="px-16 py-3 border-b border-gray-100 bg-gray-50/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <h2 className="text-base font-semibold text-gray-900">Personalize</h2>
                  <div className="h-4 w-px bg-gray-300"></div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setActiveTab('voice')}
                      className={`p-3 rounded-xl transition-all duration-300 ${
                        activeTab === 'voice'
                          ? 'bg-gradient-to-r from-blue-100 to-indigo-100 text-indigo-600 shadow-md shadow-indigo-100/50'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700'
                      }`}
                      title="Voice & Identity"
                    >
                      <MessageCircle className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setActiveTab('appearance')}
                      className={`p-3 rounded-xl transition-all duration-300 ${
                        activeTab === 'appearance'
                          ? 'bg-gradient-to-r from-purple-100 to-pink-100 text-purple-600 shadow-md shadow-purple-100/50'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700'
                      }`}
                      title="Theme & Colors"
                    >
                      <Palette className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => setShowCustomizeModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-full"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="px-16 py-6 pb-8 overflow-y-auto h-[75vh]">
              {activeTab === 'voice' && (
                <div className="space-y-8 h-full">
                  {/* Voice and Personality Side by Side */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* Voice Selection with Name */}
                <div className="space-y-8">
                  {/* Name Customization */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <label className="text-sm font-medium text-gray-800 whitespace-nowrap">AI Therapist Name</label>
                      <input
                        type="text"
                        value={voiceSettings.name}
                        onChange={(e) => {
                          const newSettings = { ...voiceSettings, name: e.target.value };
                          setVoiceSettings(newSettings);
                          // Auto-save
                          console.log('Auto-saved name:', newSettings);
                        }}
                        placeholder="Enter a name..."
                        className="flex-1 px-4 py-3 border border-gray-200 rounded-lg text-sm text-center transition-all duration-300 bg-white focus:outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 hover:border-gray-300"
                      />
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200"></div>
                    </div>
                  </div>

                  {/* Voice Section */}
                  <div className="space-y-4 pt-4">
                    <div className="text-center">
                      <label className="block text-sm font-medium text-gray-800 mb-4">Voice</label>
                    </div>
                <div className="space-y-2">
                  {[
                    { name: 'Mira', description: 'Warm & Professional', gradient: 'from-rose-200 to-pink-300' },
                    { name: 'Alex', description: 'Natural Conversational', gradient: 'from-slate-200 to-gray-300' },
                    { name: 'Emma', description: 'Young & Casual', gradient: 'from-purple-200 to-violet-300' },
                    { name: 'David', description: 'Deep & Calm', gradient: 'from-emerald-200 to-teal-300' }
                  ].map((voice) => (
                    <label key={voice.name} className="flex items-center cursor-pointer group">
                      <div className={`w-full p-3 rounded-xl border transition-all duration-200 hover:shadow-md hover:bg-white ${
                        voiceSettings.voice === voice.name
                          ? 'border-indigo-200 bg-indigo-50/50 shadow-md'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}>
                        <input
                          type="radio"
                          name="voice"
                          value={voice.name}
                          checked={voiceSettings.voice === voice.name}
                          onChange={(e) => {
                            const newSettings = { ...voiceSettings, voice: e.target.value };
                            setVoiceSettings(newSettings);
                            // Auto-save
                            console.log('Auto-saved voice:', newSettings);
                          }}
                          className="sr-only"
                        />
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${voice.gradient} shadow-sm`}>
                            </div>
                            <div>
                              <div className={`text-xs font-medium ${
                                voiceSettings.voice === voice.name ? 'text-gray-900' : 'text-gray-800'
                              }`}>
                                {voice.name}
                              </div>
                              <div className="text-xs text-gray-500">
                                {voice.description}
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              if (previewingVoice === voice.name) {
                                setPreviewingVoice(null);
                              } else {
                                setPreviewingVoice(voice.name);
                                // Simulate preview duration
                                setTimeout(() => setPreviewingVoice(null), 3000);
                              }
                              console.log(`Playing preview for ${voice.name}`);
                            }}
                            className={`w-6 h-6 rounded-full transition-all duration-200 flex items-center justify-center hover:scale-110 ${
                              previewingVoice === voice.name
                                ? 'bg-white text-gray-700 shadow-sm'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                            title={`Preview ${voice.name}`}
                          >
                            {previewingVoice === voice.name ? (
                              <svg className="w-3.5 h-3.5 animate-pulse-gentle" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                              </svg>
                            ) : (
                              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z"/>
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
                  </div>
                </div>

                {/* Personality Selection */}
                <div className="space-y-4">
                  <div className="text-center">
                    <label className="block text-sm font-medium text-gray-800 mb-3">Personality</label>
                  </div>
                  <div className="relative p-4 rounded-lg bg-white">
                    {/* Subtle background texture */}
                    <div className="absolute inset-0 bg-gradient-to-br from-stone-50/30 via-transparent to-stone-100/20 opacity-40 rounded-xl"></div>

                    <div className="relative z-10 space-y-3">
                      {[
                        {
                          name: 'Empathetic',
                          description: 'Deeply understanding and emotionally attuned',
                          behavior: 'Will validate your feelings and provide compassionate support'
                        },
                        {
                          name: 'Professional',
                          description: 'Structured, evidence-based approach',
                          behavior: 'Will offer therapeutic techniques and clinical insights'
                        },
                        {
                          name: 'Warm',
                          description: 'Friendly and nurturing communication',
                          behavior: 'Will create a safe, comforting space for open dialogue'
                        },
                        {
                          name: 'Direct',
                          description: 'Clear, straightforward guidance',
                          behavior: 'Will give honest, actionable advice without sugarcoating'
                        }
                      ].map((personality) => (
                        <label key={personality.name} className="cursor-pointer group block">
                          <div className={`flex items-center justify-between p-5 rounded-xl transition-all duration-150 hover:shadow-md ${
                            voiceSettings.personality === personality.name
                              ? 'bg-white border border-indigo-200 shadow-sm'
                              : 'hover:bg-gray-50/50 border border-transparent hover:border-gray-200'
                          }`}>

                            <div className="flex-1">
                              <div className="flex items-center gap-4">
                                {/* Selection Indicator - Enhanced */}
                                <div className={`w-1.5 h-10 rounded-full transition-all duration-150 ${
                                  voiceSettings.personality === personality.name
                                    ? 'bg-gradient-to-b from-indigo-400 to-indigo-600 shadow-md shadow-indigo-200'
                                    : 'bg-gray-200 group-hover:bg-indigo-200'
                                }`}></div>

                                <input
                                  type="radio"
                                  name="personality"
                                  value={personality.name}
                                  checked={voiceSettings.personality === personality.name}
                                  onChange={(e) => {
                                    const newSettings = { ...voiceSettings, personality: e.target.value };
                                    setVoiceSettings(newSettings);
                                    // Auto-save
                                    console.log('Auto-saved personality:', newSettings);
                                  }}
                                  className="sr-only"
                                />

                                <div className="flex-1">
                                  <h3 className={`text-sm font-semibold leading-tight ${
                                    voiceSettings.personality === personality.name ? 'text-stone-800' : 'text-gray-800'
                                  }`}>
                                    {personality.name}
                                  </h3>
                                  <p className="text-xs text-gray-600 leading-relaxed mt-0.5">
                                    {personality.description}
                                  </p>
                                  <p className="text-xs text-gray-500 leading-relaxed mt-1 italic">
                                    {personality.behavior}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

              </div>
                </div>
              )}

              {activeTab === 'appearance' && (
                <div className="space-y-6 h-full">
                  {/* Color Customization */}
                  <div className="space-y-4">
                    <div className="text-center">
                      <label className="block text-sm font-medium text-gray-800 mb-3">Theme Colors</label>
                    </div>

                    <div className="bg-gray-50/50 rounded-lg p-4 border border-gray-100">
                      <div className="grid grid-cols-3 gap-4">
                        {/* Primary Color */}
                        <div className="space-y-2">
                          <div className="text-center">
                            <span className="text-xs font-medium text-gray-700 uppercase tracking-wide">Primary</span>
                          </div>
                          <div className="relative group">
                            <input
                              type="color"
                              value={voiceSettings.primaryColor}
                              onChange={(e) => {
                                const newSettings = { ...voiceSettings, primaryColor: e.target.value };
                                setVoiceSettings(newSettings);
                                // Auto-save
                                console.log('Auto-saved primary color:', newSettings);
                              }}
                              className="w-full h-12 rounded-lg border-2 border-white shadow-lg cursor-pointer group-hover:shadow-xl transition-all duration-200"
                              style={{ backgroundColor: voiceSettings.primaryColor }}
                            />
                            <div className="absolute inset-0 rounded-lg border border-gray-200 pointer-events-none"></div>
                          </div>
                          <div className="text-center">
                            <span className="text-xs text-gray-500 font-mono bg-white px-1.5 py-0.5 rounded text-xs">{voiceSettings.primaryColor}</span>
                          </div>
                        </div>

                        {/* Secondary Color */}
                        <div className="space-y-2">
                          <div className="text-center">
                            <span className="text-xs font-medium text-gray-700 uppercase tracking-wide">Secondary</span>
                          </div>
                          <div className="relative group">
                            <input
                              type="color"
                              value={voiceSettings.secondaryColor}
                              onChange={(e) => {
                                const newSettings = { ...voiceSettings, secondaryColor: e.target.value };
                                setVoiceSettings(newSettings);
                                // Auto-save
                                console.log('Auto-saved secondary color:', newSettings);
                              }}
                              className="w-full h-12 rounded-lg border-2 border-white shadow-lg cursor-pointer group-hover:shadow-xl transition-all duration-200"
                              style={{ backgroundColor: voiceSettings.secondaryColor }}
                            />
                            <div className="absolute inset-0 rounded-lg border border-gray-200 pointer-events-none"></div>
                          </div>
                          <div className="text-center">
                            <span className="text-xs text-gray-500 font-mono bg-white px-1.5 py-0.5 rounded text-xs">{voiceSettings.secondaryColor}</span>
                          </div>
                        </div>

                        {/* Accent Color */}
                        <div className="space-y-2">
                          <div className="text-center">
                            <span className="text-xs font-medium text-gray-700 uppercase tracking-wide">Accent</span>
                          </div>
                          <div className="relative group">
                            <input
                              type="color"
                              value={voiceSettings.accentColor}
                              onChange={(e) => {
                                const newSettings = { ...voiceSettings, accentColor: e.target.value };
                                setVoiceSettings(newSettings);
                                // Auto-save
                                console.log('Auto-saved accent color:', newSettings);
                              }}
                              className="w-full h-12 rounded-lg border-2 border-white shadow-lg cursor-pointer group-hover:shadow-xl transition-all duration-200"
                              style={{ backgroundColor: voiceSettings.accentColor }}
                            />
                            <div className="absolute inset-0 rounded-lg border border-gray-200 pointer-events-none"></div>
                          </div>
                          <div className="text-center">
                            <span className="text-xs text-gray-500 font-mono bg-white px-1.5 py-0.5 rounded text-xs">{voiceSettings.accentColor}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>,
        document.body
      )}

      {/* CSS for slider styling and animations */}
      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #4f46e5;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
        }

        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #4f46e5;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
        }

        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideUp {
          from { 
            opacity: 0;
            transform: translateY(20px) scale(0.95); 
          }
          to { 
            opacity: 1;
            transform: translateY(0) scale(1); 
          }
        }

        @keyframes backdropFadeIn {
          from {
            opacity: 0;
            backdrop-filter: blur(0px);
          }
          to {
            opacity: 1;
            backdrop-filter: blur(4px);
          }
        }

        @keyframes pulse-gentle {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.7;
            transform: scale(1.05);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
        }

        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }

        .animate-backdrop {
          animation: backdropFadeIn 0.15s ease-out;
        }

        .animate-pulse-gentle {
          animation: pulse-gentle 1.5s ease-in-out infinite;
        }
      `}</style>
    </div>
    </>
  );
}
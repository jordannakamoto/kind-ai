'use client';

import { useCallback, useEffect, useState, useMemo } from 'react';

import Image from 'next/image';
import { supabase } from '@/supabase/client';
import { useRouter } from 'next/navigation';
import LoadingDots from '@/components/LoadingDots';

// 1. Define module type
type ModuleSize = 'square' | 'tall' | 'wide';

interface Course {
  id: string;
  title: string;
  description: string;
  image_path?: string;
  tags?: string[];
  themes?: string[];
  created_at: string;
  updated_at: string;
  modules?: TherapyModule[];
  user_progress?: UserCourseProgress;
}

interface TherapyModule {
  id: string;
  name: string;
  description: string;
  greeting: string;
  instructions: string;
  agenda: string;
  course_id: string | null;
  created_at: string;
  updated_at: string;
}

interface UserCourseProgress {
  id: string;
  user_id: string;
  course_id: string;
  current_module_index: number;
  completed_modules: string[];
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

// Default fallback image
const DEFAULT_COURSE_IMAGE = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=2940&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D';

// Helper function to convert number to roman numerals
const toRoman = (num: number): string => {
  const romanNumerals: [number, string][] = [
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I']
  ];

  let result = '';
  let n = num;

  for (const [value, symbol] of romanNumerals) {
    while (n >= value) {
      result += symbol;
      n -= value;
    }
  }

  return result;
};

// 3. Size styling - Made smaller and responsive
const sizeClass: Record<ModuleSize, string> = {
  square: 'row-span-1 h-[140px] md:h-[180px]',
  tall: 'row-span-2 h-[300px] md:h-[380px]',
  wide: 'col-span-2 row-span-1 h-[140px] md:h-[180px]',
};

// Helper function to determine course size based on index
const getCourseSize = (index: number): ModuleSize => {
  const sizePattern: ModuleSize[] = ['tall', 'wide', 'square', 'wide', 'tall', 'square'];
  return sizePattern[index % sizePattern.length];
};

// 4. Main component
export default function TherapyLibraryFeed({ sidebarCollapsed = false }: { sidebarCollapsed?: boolean }) {
  const router = useRouter();
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [enrolling, setEnrolling] = useState<string | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllTags, setShowAllTags] = useState(false);
  const [panelWidth, setPanelWidth] = useState(512); // 32rem in pixels
  const [isDragging, setIsDragging] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(64); // Default to mobile width

  // Single source of truth for layout metrics
  const layoutMetrics = useMemo(() => {
    if (!showModal) return {
      cardSize: 'full',
      contentWidth: 'auto',
      cardsPerRow: 3,
      leftPadding: 6,
      rightPadding: 6
    };

    // Calculate total available width including full window
    const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const sidebarWidth = sidebarCollapsed ? 16 : (typeof window !== 'undefined' && window.innerWidth >= 1024 ? 256 : 64);

    // Content pane gets remaining width after panel and sidebar
    const minPaneWidth = sidebarWidth + 10;
    const contentPaneWidth = Math.max(minPaneWidth, windowWidth - panelWidth - sidebarWidth);

    // Dynamic padding based on available width - increased margins
    const leftPadding = Math.max(24, Math.min(48, contentPaneWidth / 25));
    const rightPadding = Math.max(32, Math.min(64, contentPaneWidth / 20)); // More right padding
    const usableContentWidth = contentPaneWidth - leftPadding - rightPadding;

    // Target card size and calculate columns
    const targetCardSize = 160;
    const gap = 12;
    const cardsPerRow = Math.max(2, Math.floor((usableContentWidth + gap) / (targetCardSize + gap)));

    // Calculate actual card size
    const actualCardSize = (usableContentWidth - (cardsPerRow - 1) * gap) / cardsPerRow;

    // Determine size category based on actual card size
    let cardSize = 'small';
    if (actualCardSize >= 180) cardSize = 'large';
    else if (actualCardSize >= 160) cardSize = 'medium';
    else if (actualCardSize >= 120) cardSize = 'small';
    else cardSize = 'tiny';

    return {
      cardSize,
      contentWidth: contentPaneWidth,
      cardsPerRow,
      leftPadding,
      rightPadding,
      actualCardSize
    };
  }, [showModal, panelWidth, sidebarCollapsed]);

  // Fetch courses and user progress
  const fetchCoursesWithProgress = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Get current user
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        setError('Please log in to view courses');
        return;
      }
      setUser(authUser);

      // Fetch courses with their modules
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select(`
          *,
          therapy_modules (
            id, name, description, greeting, instructions, agenda, course_id, created_at, updated_at
          )
        `)
        .order('updated_at', { ascending: false });

      if (coursesError) throw coursesError;

      // Fetch user progress for these courses
      const courseIds = coursesData?.map(course => course.id) || [];
      const { data: progressData, error: progressError } = await supabase
        .from('user_course_progress')
        .select('*')
        .eq('user_id', authUser.id)
        .in('course_id', courseIds);

      if (progressError) {
        console.warn('Could not fetch progress:', progressError.message);
      }

      // Combine courses with progress data
      const coursesWithProgress = coursesData?.map(course => ({
        ...course,
        modules: course.therapy_modules || [],
        user_progress: progressData?.find(p => p.course_id === course.id)
      })) || [];

      setCourses(coursesWithProgress);
    } catch (err: any) {
      console.error('Error fetching courses:', err.message);
      setError('Could not load courses');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCoursesWithProgress();
  }, [fetchCoursesWithProgress]);

  // Update sidebar width based on screen size
  useEffect(() => {
    const updateSidebarWidth = () => {
      if (sidebarCollapsed) {
        setSidebarWidth(16);
      } else {
        setSidebarWidth(window.innerWidth >= 1024 ? 256 : 64);
      }
    };

    updateSidebarWidth();
    window.addEventListener('resize', updateSidebarWidth);
    return () => window.removeEventListener('resize', updateSidebarWidth);
  }, [sidebarCollapsed]);

  // Handle escape key to close modal and tag dropdown
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showAllTags) {
          setShowAllTags(false);
        } else if (showModal) {
          setShowModal(false);
        }
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (showAllTags) {
        const target = e.target as Element;
        if (!target.closest('[data-tag-dropdown]')) {
          setShowAllTags(false);
        }
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.addEventListener('click', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showModal, showAllTags]);

  const allTags = ['All', ...new Set(courses.flatMap((course) => course.tags || []))];

  const filteredCourses = courses.filter((course) => {
    // Filter by tag
    const matchesTag = !selectedTag || selectedTag === 'All' || course.tags?.includes(selectedTag);

    // Filter by search query
    const matchesSearch = !searchQuery ||
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesTag && matchesSearch;
  });

  // Function to open modal with course preview
  const handleCourseClick = (course: Course) => {
    setSelectedCourse(course);
    if (!showModal) {
      setShowModal(true);
    }
    // Always expand a module - current module if progress exists, otherwise first module
    if (course.modules && course.modules.length > 0) {
      if (course.user_progress) {
        const currentModule = course.modules[course.user_progress.current_module_index];
        setExpandedModule(currentModule?.id || course.modules[0].id);
      } else {
        setExpandedModule(course.modules[0].id);
      }
    } else {
      setExpandedModule(null);
    }
  };

  // Function to toggle module expansion (always keep one expanded)
  const handleModuleClick = (moduleId: string) => {
    // Don't allow collapsing if this is the only expanded module
    if (expandedModule === moduleId) {
      return; // Do nothing - keep it expanded
    }
    setExpandedModule(moduleId);
  };

  // Function to handle course action (review completed course)
  const handleCourseAction = async (course: Course) => {
    if (course.user_progress?.is_completed && course.modules && course.modules.length > 0) {
      // Start from the first module for review
      await supabase
        .from('user_course_progress')
        .update({
          current_module_index: 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', course.user_progress.id);

      router.push(`/dashboard?tab=home&startModule=${course.modules[0].id}&courseId=${course.id}`);
    }
  };

  // Handle panel resizing
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    const newWidth = window.innerWidth - e.clientX;
    setPanelWidth(Math.max(320, Math.min(800, newWidth))); // Min 320px, max 800px
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Function to enroll in course and navigate to home
  const handleStartCourse = async () => {
    if (!user || !selectedCourse) {
      setError('Please log in to start a course');
      return;
    }

    setEnrolling(selectedCourse.id);

    try {
      // Check if user is already enrolled
      if (selectedCourse.user_progress) {
        // User already has progress, navigate to home and continue course
        router.push(`/dashboard?tab=home&continueCourse=${selectedCourse.id}`);
        return;
      }

      // Enroll user in the course
      const { error: enrollError } = await supabase
        .from('user_course_progress')
        .insert({
          user_id: user.id,
          course_id: selectedCourse.id,
          current_module_index: 0,
          completed_modules: [],
          is_completed: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (enrollError) {
        throw enrollError;
      }

      console.log('User enrolled in course:', selectedCourse.title);
      
      // Navigate to home view to start the course
      router.push(`/dashboard?tab=home&startCourse=${selectedCourse.id}`);
      
    } catch (err: any) {
      console.error('Error enrolling in course:', err.message);
      setError('Could not start course. Please try again.');
    } finally {
      setEnrolling(null);
      setShowModal(false);
    }
  };

  if (loading) {
    return (
      <div
        className={`w-full max-w-4xl px-6 py-6 md:py-10 ${sidebarCollapsed ? 'mx-auto' : ''}`}
        style={sidebarCollapsed ? {} : {
          marginLeft: typeof window !== 'undefined' && window.innerWidth >= 1024 ? '80px' : '24px'
        }}
      >
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingDots className="text-lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`w-full max-w-4xl px-6 py-6 md:py-10 ${sidebarCollapsed ? 'mx-auto' : ''}`}
        style={sidebarCollapsed ? {} : {
          marginLeft: typeof window !== 'undefined' && window.innerWidth >= 1024 ? '80px' : '24px'
        }}
      >
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-red-600 mb-2">{error}</p>
            <button
              onClick={fetchCoursesWithProgress}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`transition-all duration-300 ${
        showModal
          ? 'h-screen overflow-auto'
          : sidebarCollapsed
            ? 'w-full max-w-4xl mx-auto px-6 py-6 md:py-10'
            : 'w-full max-w-4xl px-6 py-6 md:py-10'
      }`}
      style={showModal ? {
        position: 'fixed',
        left: `${sidebarCollapsed ? 16 : (typeof window !== 'undefined' && window.innerWidth >= 1024 ? 256 : 64)}px`,
        width: `${layoutMetrics.contentWidth}px`,
        paddingLeft: `${layoutMetrics.leftPadding}px`,
        paddingRight: `${layoutMetrics.rightPadding}px`,
        paddingTop: `${layoutMetrics.leftPadding}px`,
        paddingBottom: `${layoutMetrics.leftPadding}px`,
        top: 0,
        zIndex: 30
      } : sidebarCollapsed ? {} : {
        marginLeft: typeof window !== 'undefined' && window.innerWidth >= 1024 ? '80px' : '24px'
      }}
    >
      {/* LEFT SIDE - BROWSER VIEW */}
      {/* BROWSER - Header Section */}
      <div className="mb-6">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">Therapy Library</h2>

        {/* Search Bar */}
        <div className="mb-3 relative">
          <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search courses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Enhanced Tag Filter with Dropdown */}
        <div className="relative" data-tag-dropdown>
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-2 overflow-hidden">
              {allTags.slice(0, 4).map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(tag === 'All' ? null : tag)}
                  className={`
                    px-3 py-1 text-sm rounded-full whitespace-nowrap transition duration-300
                    ${selectedTag === tag || (tag === 'All' && !selectedTag)
                      ? 'bg-black text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}
                  `}
                >
                  {tag}
                </button>
              ))}
            </div>

            {allTags.length > 4 && (
              <button
                onClick={() => setShowAllTags(!showAllTags)}
                className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 border border-gray-300 rounded-full transition-colors whitespace-nowrap"
              >
                {showAllTags ? 'Less' : `+${allTags.length - 4}`}
              </button>
            )}
          </div>

          {/* Expanded Tag Dropdown */}
          {showAllTags && allTags.length > 4 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 p-2 animate-fadeIn max-h-64 overflow-y-auto">
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1">
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => {
                      setSelectedTag(tag === 'All' ? null : tag);
                      setShowAllTags(false);
                    }}
                    className={`
                      px-2 py-1 text-xs rounded text-left transition-colors
                      ${selectedTag === tag || (tag === 'All' && !selectedTag)
                        ? 'bg-black text-white'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <span className="truncate">{tag}</span>
                      {tag !== 'All' && (
                        <span className="text-[10px] opacity-60 ml-1 flex-shrink-0">
                          {courses.filter(course => course.tags?.includes(tag)).length}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              <div className="pt-2 border-t border-gray-100 flex justify-between items-center mt-2">
                <button
                  onClick={() => {
                    setSelectedTag(null);
                    setShowAllTags(false);
                  }}
                  className="text-[10px] text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Clear
                </button>
                <button
                  onClick={() => setShowAllTags(false)}
                  className="text-[10px] text-gray-500 hover:text-gray-700 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {filteredCourses.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600">No courses available yet.</p>
        </div>
      ) : (
        <div
          className={`transition-all duration-300 gap-3 ${
            showModal
              ? 'grid'
              : 'grid grid-cols-2 md:grid-cols-3 md:gap-4'
          }`}
          style={showModal ? {
            gridTemplateColumns: `repeat(${layoutMetrics.cardsPerRow}, 1fr)`
          } : {}}
        >
          {/* BROWSER - Course Grid */}
          {filteredCourses.map((course) => {
            const progress = course.user_progress;
            const completedCount = progress?.completed_modules?.length || 0;
            const totalModules = course.modules?.length || 0;
            const progressPercentage = totalModules > 0 ? (completedCount / totalModules) * 100 : 0;

            // Get layout metrics
            const { cardSize } = layoutMetrics;

            return (
              <div
                key={course.id}
                className={`relative group overflow-hidden rounded-lg shadow-md transition-all duration-300 hover:shadow-lg cursor-pointer ${
                  showModal
                    ? 'aspect-square hover:scale-[1.02]'
                    : 'h-[280px] md:h-[320px] lg:h-[380px]'
                } ${
                  enrolling === course.id ? 'opacity-50 cursor-wait' : ''
                } ${
                  selectedCourse?.id === course.id ? 'ring-2 ring-blue-500 ring-offset-1' : ''
                }`}
                style={showModal ? {} : {}}
                onClick={() => handleCourseClick(course)}
              >
                {/* Image */}
                <div className="absolute inset-0 z-0">
                  <Image
                    src={course.image_path || DEFAULT_COURSE_IMAGE}
                    alt={course.title}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black opacity-20 group-hover:opacity-30 transition-opacity duration-300" />
                </div>

                {/* Progress Indicator - Hide on tiny and minimal sizes */}
                {totalModules > 0 && cardSize !== 'tiny' && cardSize !== 'minimal' && (
                  <div className="absolute top-3 right-3 z-20">
                    <div className={`bg-white/90 backdrop-blur-sm rounded-full font-medium text-gray-800 ${
                      cardSize === 'small' ? 'px-1 py-0.5 text-[9px]' : 'px-1.5 py-0.5 md:px-2 md:py-1 text-[10px] md:text-xs'
                    }`}>
                      {cardSize === 'small' ? `${completedCount}/${totalModules}` : `${completedCount}/${totalModules}`}
                    </div>
                  </div>
                )}



                {/* Overlay Content */}
                <div className={`relative z-10 flex flex-col justify-end h-full text-white ${
                  showModal ? (cardSize === 'minimal' ? 'p-1' : 'p-2') : 'p-2 md:p-3'
                }`}>
                  <div className="space-y-1 transition-transform duration-300 group-hover:-translate-y-1">
                    <h3 className={`font-bold drop-shadow-lg ${
                      cardSize === 'minimal' ? 'text-[10px] leading-tight' :
                      cardSize === 'tiny' ? 'text-[11px]' :
                      cardSize === 'small' ? 'text-xs' :
                      showModal ? 'text-xs sm:text-sm' : 'text-sm md:text-base'
                    }`}>{cardSize === 'minimal' ? course.title.split(' ').slice(0, 2).join(' ') : course.title}</h3>

                    {/* Session Count - Hide on minimal */}
                    {cardSize !== 'minimal' && (
                      <div className={`opacity-70 ${
                        cardSize === 'tiny' ? 'text-[8px]' :
                        cardSize === 'small' ? 'text-[9px]' :
                        showModal ? 'text-[9px] sm:text-[10px]' : 'text-[10px] md:text-xs'
                      }`}>
                        {totalModules} {totalModules === 1 ? 'session' : 'sessions'}
                        {progress?.is_completed && cardSize !== 'tiny' && (
                          <span className={`text-white font-medium ${
                            showModal ? 'ml-1' : 'ml-1 md:ml-2'
                          }`}>
                            - ✓ Completed
                          </span>
                        )}
                      </div>
                    )}

                    {/* Progress Bar - Only show on large cards */}
                    {totalModules > 0 && progressPercentage > 0 && cardSize === 'large' && (
                      <div className="mt-2 w-full h-1 bg-white/20 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-white/80 transition-all duration-300 rounded-full"
                          style={{ width: `${progressPercentage}%` }}
                        />
                      </div>
                    )}

                    {/* Tags - Only show on large cards */}
                    {cardSize === 'large' && (
                      <div className="flex gap-1 flex-wrap pt-1">
                        {course.tags?.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="text-[9px] bg-white/20 backdrop-blur-sm text-white rounded-full px-1.5 py-0.5"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* RIGHT SIDE - COURSE DETAILS PANEL */}
      {showModal && selectedCourse && (
        <>
          <style jsx global>{`
            .course-content-scrollbar {
              scrollbar-width: thin;
              scrollbar-color: rgba(156, 163, 175, 0.4) rgba(243, 244, 246, 0.3);
            }
            .course-content-scrollbar::-webkit-scrollbar {
              width: 6px;
            }
            .course-content-scrollbar::-webkit-scrollbar-track {
              background: rgba(243, 244, 246, 0.3);
              border-radius: 3px;
            }
            .course-content-scrollbar::-webkit-scrollbar-thumb {
              background: rgba(156, 163, 175, 0.4);
              border-radius: 3px;
            }
            .course-content-scrollbar::-webkit-scrollbar-thumb:hover {
              background: rgba(156, 163, 175, 0.6);
            }
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes slideInFromRight {
              0% {
                transform: translateX(100%);
              }
              100% {
                transform: translateX(0);
              }
            }
            @keyframes slideInFromLeft {
              0% {
                transform: translateX(-100%);
              }
              100% {
                transform: translateX(0);
              }
            }
            @keyframes backdropFadeIn {
              from {
                opacity: 0;
                backdrop-filter: blur(0px) brightness(1);
              }
              to {
                opacity: 1;
                backdrop-filter: blur(12px) brightness(0.97);
              }
            }
            @keyframes progressFill {
              from { width: 0%; }
              to { width: var(--progress-width); }
            }
            @keyframes pulseGlow {
              0%, 100% {
                box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4);
              }
              50% {
                box-shadow: 0 0 0 8px rgba(59, 130, 246, 0);
              }
            }
            @keyframes staggerFadeIn {
              from {
                opacity: 0;
                transform: translateY(10px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
            .animate-fadeIn {
              animation: fadeIn 0.3s ease-out;
            }
            .animate-slideInFromRight {
              animation: slideInFromRight 0.4s cubic-bezier(0.16, 1, 0.3, 1);
            }
            .animate-slideInFromLeft {
              animation: slideInFromLeft 0.4s cubic-bezier(0.16, 1, 0.3, 1);
            }
            .animate-backdrop {
              animation: backdropFadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            }
            .animate-progressFill {
              animation: progressFill 1.2s ease-out 0.5s both;
            }
            .animate-pulseGlow {
              animation: pulseGlow 2s infinite;
            }
            .animate-staggerFadeIn {
              animation: staggerFadeIn 0.4s ease-out both;
            }
            .stagger-1 { animation-delay: 0.1s; }
            .stagger-2 { animation-delay: 0.2s; }
            .stagger-3 { animation-delay: 0.3s; }
            .stagger-4 { animation-delay: 0.4s; }
            .glass-effect {
              background: rgba(255, 255, 255, 0.95);
              backdrop-filter: blur(12px);
              border: 1px solid rgba(255, 255, 255, 0.2);
            }
          `}</style>
          <div className="fixed inset-0 z-40 pointer-events-none">
            {/* Non-clickable backdrop - browsing keeps panel open */}
            <div className="absolute inset-0 bg-transparent" />

            {/* Subtle Resizable Divider */}
            <div
              className="fixed top-0 h-full w-0.5 bg-gray-200 hover:bg-gray-300 cursor-ew-resize transition-colors duration-200 z-50 pointer-events-auto"
              style={{ right: `${panelWidth}px` }}
              onMouseDown={handleMouseDown}
            />

            {/* Course Details Panel */}
            <div
              className="fixed top-0 right-0 h-full bg-white shadow-2xl overflow-hidden animate-slideInFromRight pointer-events-auto border-l border-gray-100"
              style={{
                width: `${panelWidth}px`,
                borderLeft: '1px solid #e5e7eb'
              }}
            >
              {/* COURSE DETAILS - Header Section */}
              <div className="relative h-32 overflow-hidden bg-gradient-to-br from-gray-700 to-gray-800 border-b border-gray-300">
                <Image
                  src={selectedCourse.image_path || DEFAULT_COURSE_IMAGE}
                  alt={selectedCourse.title}
                  fill
                  className="object-cover opacity-20"
                />

                {/* Close button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowModal(false);
                  }}
                  className="absolute top-4 right-4 w-8 h-8 bg-white/10 hover:bg-white/20 rounded flex items-center justify-center text-white/70 hover:text-white transition-all duration-200 z-50 pointer-events-auto"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                {/* Course header content */}
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <div className="flex items-end justify-between">
                    <div>
                      <h1 className="text-2xl font-light text-white mb-2">
                        {selectedCourse.title}
                      </h1>
                      <div className="flex items-center gap-6 text-gray-300 text-xs uppercase tracking-wider">
                        <span>{selectedCourse.modules?.length || 0} Modules</span>
                        {selectedCourse.user_progress && (
                          <>
                            <span>•</span>
                            <span>{Math.round(((selectedCourse.user_progress.completed_modules?.length || 0) / ((selectedCourse.modules?.length || 1))) * 100)}% Complete</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* COURSE DETAILS - Content Section */}
              <div className="h-[calc(100vh-8rem)] bg-gray-50 flex flex-col">
                <div className="p-3 flex-1 overflow-hidden">

                  {/* COURSE DETAILS - Overview */}
                  <div className="bg-white rounded-lg p-3 mb-3 border border-gray-200">
                    <div className="flex-1">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Overview</h3>
                      <p className="text-gray-600 text-sm leading-relaxed">{selectedCourse.description}</p>
                    </div>
                  </div>

                  {/* COURSE DETAILS - Sessions List */}
                  {selectedCourse.modules && selectedCourse.modules.length > 0 && (
                    <div className="bg-white rounded-lg border border-gray-200">
                      <div className="px-4 py-1.5 border-b border-gray-200">
                        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Sessions</h2>
                      </div>
                      <div className="overflow-y-auto max-h-[calc(100vh-26rem)] course-content-scrollbar p-4">
                        <div className="space-y-2">
                        {selectedCourse.modules.map((module, index) => {
                          const isCompleted = selectedCourse.user_progress?.completed_modules?.includes(module.id) || false;
                          const isCurrent = !selectedCourse.user_progress?.is_completed && index === selectedCourse.user_progress?.current_module_index;
                          const isAccessible = !selectedCourse.user_progress || index <= (selectedCourse.user_progress?.current_module_index || 0);
                          const isExpanded = expandedModule === module.id;

                          return (
                            <div
                              key={module.id}
                              className={`group transition-all duration-200 cursor-pointer border-l-2 ${
                                isCurrent
                                  ? 'border-l-blue-500 bg-blue-50/30'
                                  : isCompleted
                                    ? 'border-l-green-500 bg-white'
                                    : 'border-l-gray-300 bg-white hover:bg-gray-50'
                              }`}
                              onClick={() => handleModuleClick(module.id)}
                            >
                              <div className="py-3 px-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className={`text-sm font-mono ${
                                      isCompleted
                                        ? 'text-green-600'
                                        : isCurrent
                                          ? 'text-blue-600'
                                          : 'text-gray-400'
                                    }`}>
                                      {String(index + 1).padStart(2, '0')}
                                    </div>
                                    <h4 className={`font-medium transition-colors ${
                                      isCurrent
                                        ? 'text-gray-900'
                                        : isCompleted
                                          ? 'text-gray-700'
                                          : 'text-gray-700 group-hover:text-gray-900'
                                    }`}>
                                      {module.name}
                                    </h4>
                                  </div>
                                  {isCompleted && (
                                    <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  )}
                                </div>

                                {/* Expandable description */}
                                {isExpanded && (
                                  <div className="mt-3 ml-9 animate-fadeIn">
                                    <p className="text-gray-600 text-sm leading-relaxed mb-4">
                                      {module.description}
                                    </p>
                                    {isAccessible && (
                                      <div className="flex justify-end">
                                        <button
                                          onClick={async (e) => {
                                            e.stopPropagation();

                                            // Update the current module index if needed
                                            if (!selectedCourse.user_progress) {
                                              // First time starting - enroll in course first
                                              await handleStartCourse();
                                            } else if (index !== selectedCourse.user_progress.current_module_index) {
                                              // Update current module to the one being started
                                              await supabase
                                                .from('user_course_progress')
                                                .update({
                                                  current_module_index: index,
                                                  updated_at: new Date().toISOString()
                                                })
                                                .eq('id', selectedCourse.user_progress.id);
                                            }

                                            // Navigate to home with the specific module
                                            router.push(`/dashboard?tab=home&startModule=${module.id}&courseId=${selectedCourse.id}`);
                                          }}
                                          className="px-2 py-1 bg-gray-50 hover:bg-blue-50 text-gray-500 hover:text-blue-600 text-xs font-normal rounded transition-colors duration-200 flex items-center gap-1"
                                        >
                                        {isCompleted ? (
                                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                                          </svg>
                                        ) : isCurrent ? (
                                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
                                          </svg>
                                        ) : (
                                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M8 5v14l11-7z"/>
                                          </svg>
                                        )}
                                          {isCompleted ? 'Replay' : isCurrent ? 'Continue' : 'Start'}
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                        </div>
                      </div>
                    </div>
                  )}

                </div>

                {/* COURSE DETAILS - Bottom Action Section */}
                <div className="border-t border-gray-200 bg-white p-4">
                  <div className="flex justify-center">
                    <button
                      onClick={selectedCourse.user_progress?.is_completed ? () => handleCourseAction(selectedCourse) : handleStartCourse}
                      disabled={enrolling === selectedCourse.id}
                      className={`px-8 py-3 rounded-lg font-medium text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-[1.02] ${
                      enrolling === selectedCourse.id
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : selectedCourse.user_progress?.is_completed
                          ? 'bg-gray-700 text-white hover:bg-gray-800'
                          : selectedCourse.user_progress
                            ? 'bg-gray-700 text-white hover:bg-gray-800'
                            : 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600'
                    }`}
                  >
                    {enrolling === selectedCourse.id ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent"></div>
                        <span>Starting...</span>
                      </>
                    ) : selectedCourse.user_progress?.is_completed ? (
                      <>
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                        </svg>
                        <span>Review Course</span>
                      </>
                    ) : selectedCourse.user_progress ? (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        <span>Continue Course</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        <span>Start Course</span>
                      </>
                    )}
                  </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
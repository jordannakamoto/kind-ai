'use client';

import { useCallback, useEffect, useState } from 'react';

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

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showModal) {
        setShowModal(false);
      }
    };

    if (showModal) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [showModal]);

  const allTags = ['All', ...new Set(courses.flatMap((course) => course.tags || []))];

  const filteredCourses = selectedTag && selectedTag !== 'All'
    ? courses.filter((course) => course.tags?.includes(selectedTag))
    : courses;

  // Function to open modal with course preview
  const handleCourseClick = (course: Course) => {
    setSelectedCourse(course);
    setShowModal(true);
  };

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
      <div className={`w-full max-w-4xl ${sidebarCollapsed ? 'mx-auto' : 'ml-8 lg:ml-16'} px-4 py-6 md:py-10 md:pl-10`}>
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingDots className="text-lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`w-full max-w-4xl ${sidebarCollapsed ? 'mx-auto' : 'ml-8 lg:ml-16'} px-4 py-6 md:py-10 md:pl-10`}>
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
    <div className={`w-full max-w-3xl ${sidebarCollapsed ? 'mx-auto' : 'ml-8 lg:ml-16'} px-4 py-6 md:py-10 md:pl-10`}>
      <div className="mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 md:mb-4">Therapy Library</h2>

        <div className="flex items-center space-x-2 overflow-x-auto pb-2">
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag === 'All' ? null : tag)}
              className={`
                px-3 py-1 text-sm rounded-full transition duration-300 
                ${selectedTag === tag || (tag === 'All' && !selectedTag)
                  ? 'bg-black text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}
              `}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {filteredCourses.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600">No courses available yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          {filteredCourses.map((course, index) => {
            const progress = course.user_progress;
            const completedCount = progress?.completed_modules?.length || 0;
            const totalModules = course.modules?.length || 0;
            const progressPercentage = totalModules > 0 ? (completedCount / totalModules) * 100 : 0;
            
            return (
              <div
                key={course.id}
                className={`relative group overflow-hidden rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl cursor-pointer h-[380px] ${enrolling === course.id ? 'opacity-50 cursor-wait' : ''}`}
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

                {/* Progress Indicator */}
                {totalModules > 0 && (
                  <div className="absolute top-3 right-3 z-20">
                    <div className="bg-white/90 backdrop-blur-sm rounded-full px-1.5 py-0.5 md:px-2 md:py-1 text-[10px] md:text-xs font-medium text-gray-800">
                      {completedCount}/{totalModules}
                    </div>
                  </div>
                )}



                {/* Overlay Content */}
                <div className="relative z-10 flex flex-col justify-end h-full p-2 md:p-3 text-white">
                  <div className="space-y-1 transition-transform duration-300 group-hover:-translate-y-1">
                    <h3 className="text-sm md:text-base font-bold drop-shadow-lg">{course.title}</h3>
                    
                    {/* Session Count */}
                    <div className="text-[10px] md:text-xs opacity-70 mt-0.5 md:mt-1">
                      {totalModules} {totalModules === 1 ? 'session' : 'sessions'}
                      {progress?.is_completed && (
                        <span className="ml-1 md:ml-2 text-white font-medium">
                          - ✓ Completed
                        </span>
                      )}
                    </div>
                    
                    {/* Progress Bar - Below module count */}
                    {totalModules > 0 && progressPercentage > 0 && (
                      <div className="mt-2 w-full h-1 bg-white/20 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-white/80 transition-all duration-300 rounded-full"
                          style={{ width: `${progressPercentage}%` }}
                        />
                      </div>
                    )}
                    
                    {/* Tags */}
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
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {/* Course Preview Modal */}
      {showModal && selectedCourse && (
        <>
          <style jsx global>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
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
            .animate-fadeIn {
              animation: fadeIn 0.2s ease-out;
            }
            .animate-slideUp {
              animation: slideUp 0.3s ease-out;
            }
            .animate-backdrop {
              animation: backdropFadeIn 0.15s ease-out;
            }
          `}</style>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Glass backdrop */}
            <div 
              className="absolute inset-0 bg-white/80 backdrop-blur-sm animate-backdrop"
              onClick={() => setShowModal(false)}
            />
            
            {/* Modal content */}
            <div className="relative bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden animate-slideUp">
            {/* Split Layout with Full Height Image */}
            <div className="flex">
              {/* Left side - Course Image - Spans to modules */}
              <div className="relative w-1/3 overflow-hidden rounded-tl-xl">
                <Image
                  src={selectedCourse.image_path || DEFAULT_COURSE_IMAGE}
                  alt={selectedCourse.title}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/10 to-transparent" />
              </div>
              
              {/* Right side - Course Info */}
              <div className="flex-1 p-6 relative">
                <button
                  onClick={() => setShowModal(false)}
                  className="absolute top-2 right-2 w-6 h-6 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-600 transition"
                >
                  ✕
                </button>
                
                <div className="pr-2">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2 pr-6">{selectedCourse.title}</h2>
                  <p className="text-gray-600 text-sm mb-3 leading-relaxed pr-6">{selectedCourse.description}</p>
                  
                  {/* Tags and Action Button Row */}
                  <div className="flex items-start justify-between">
                    <div className="flex gap-2 flex-wrap">
                      {selectedCourse.tags && selectedCourse.tags.length > 0 && selectedCourse.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-xs bg-blue-100 text-blue-700 rounded-full px-3 py-1 font-medium"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    
                    {/* Action Button - Inline with Tags */}
                    <button
                      onClick={handleStartCourse}
                      disabled={enrolling === selectedCourse.id}
                      className={`px-6 py-3 mt-6 ml-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 w-[160px] h-[44px] shadow-lg hover:shadow-xl transition-shadow duration-200 ${
                        enrolling === selectedCourse.id
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : selectedCourse.user_progress?.is_completed
                            ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600'
                            : selectedCourse.user_progress
                              ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600'
                              : 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600'
                      }`}
                    >
                      {enrolling === selectedCourse.id ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent"></div>
                          <span>Starting...</span>
                        </>
                      ) : selectedCourse.user_progress?.is_completed ? (
                        'Review Course'
                      ) : selectedCourse.user_progress ? (
                        'Continue'
                      ) : (
                        'Start Course'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Modules Section */}
            {selectedCourse.modules && selectedCourse.modules.length > 0 && (
              <div className="px-6 py-4 pb-10 border-t border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Sessions</h3>
                <div className="space-y-2">
                  {selectedCourse.modules.map((module, index) => {
                    const isCompleted = selectedCourse.user_progress?.completed_modules?.includes(module.id);
                    const isCurrent = index === selectedCourse.user_progress?.current_module_index;
                    
                    return (
                      <div
                        key={module.id}
                        className="flex items-center gap-3 py-2"
                      >
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium ${
                          isCompleted 
                            ? 'bg-green-100 text-green-700' 
                            : isCurrent
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-500'
                        }`}>
                          {isCompleted ? '✓' : index + 1}
                        </div>
                        <span className="text-gray-900 font-medium">{module.name}</span>
                        {isCurrent && (
                          <span className="text-xs text-blue-600 font-medium ml-auto">← Current</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
        </>
      )}
    </div>
  );
}
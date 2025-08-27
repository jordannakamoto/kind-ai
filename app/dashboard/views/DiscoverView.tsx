'use client';

import { useCallback, useEffect, useState } from 'react';

import Image from 'next/image';
import { supabase } from '@/supabase/client';
import { useRouter } from 'next/navigation';

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

// 3. Size styling
const sizeClass: Record<ModuleSize, string> = {
  square: 'row-span-1 h-[220px]',
  tall: 'row-span-2 h-[460px]',
  wide: 'col-span-2 row-span-1 h-[220px]',
};

// Helper function to determine course size based on index
const getCourseSize = (index: number): ModuleSize => {
  const sizePattern: ModuleSize[] = ['tall', 'wide', 'square', 'wide', 'tall', 'square'];
  return sizePattern[index % sizePattern.length];
};

// 4. Main component
export default function TherapyLibraryFeed() {
  const router = useRouter();
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [enrolling, setEnrolling] = useState<string | null>(null);

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

  const allTags = ['All', ...new Set(courses.flatMap((course) => course.tags || []))];

  const filteredCourses = selectedTag && selectedTag !== 'All'
    ? courses.filter((course) => course.tags?.includes(selectedTag))
    : courses;

  // Function to enroll in course and navigate to home
  const handleCourseClick = async (course: Course) => {
    if (!user) {
      setError('Please log in to start a course');
      return;
    }

    setEnrolling(course.id);

    try {
      // Check if user is already enrolled
      if (course.user_progress) {
        // User already has progress, just navigate to home
        router.push('/dashboard?tab=home');
        return;
      }

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

      if (enrollError) {
        throw enrollError;
      }

      console.log('User enrolled in course:', course.title);
      
      // Navigate to home view to start the course
      router.push('/dashboard?tab=home');
      
    } catch (err: any) {
      console.error('Error enrolling in course:', err.message);
      setError('Could not start course. Please try again.');
    } finally {
      setEnrolling(null);
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 py-10 pl-10">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading courses...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 py-10 pl-10">
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
    <div className="w-full max-w-4xl mx-auto px-4 py-10 pl-10">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Therapy Library</h2>

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
        <div className="grid grid-cols-3 grid-rows-2 gap-4">
          {filteredCourses.map((course, index) => {
            const courseSize = getCourseSize(index);
            const progress = course.user_progress;
            const completedCount = progress?.completed_modules?.length || 0;
            const totalModules = course.modules?.length || 0;
            const progressPercentage = totalModules > 0 ? (completedCount / totalModules) * 100 : 0;
            
            return (
              <div
                key={course.id}
                className={`relative group overflow-hidden rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl cursor-pointer ${sizeClass[courseSize]} ${enrolling === course.id ? 'opacity-50 cursor-wait' : ''}`}
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
                    <div className="bg-white/90 backdrop-blur-sm rounded-full px-2 py-1 text-xs font-medium text-gray-800">
                      {completedCount}/{totalModules}
                    </div>
                  </div>
                )}

                {/* Progress Bar */}
                {totalModules > 0 && progressPercentage > 0 && (
                  <div className="absolute top-0 left-0 right-0 z-10 h-1 bg-black/20">
                    <div 
                      className="h-full bg-green-400 transition-all duration-300"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                )}

                {/* Course Status Badge */}
                {progress?.is_completed && (
                  <div className="absolute top-3 left-3 z-20">
                    <div className="bg-green-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                      ✓ Completed
                    </div>
                  </div>
                )}

                {/* Enrollment Loading Indicator */}
                {enrolling === course.id && (
                  <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/20 backdrop-blur-sm">
                    <div className="bg-white rounded-lg p-4 flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      <span className="text-sm font-medium text-gray-700">Starting course...</span>
                    </div>
                  </div>
                )}

                {/* Overlay Content */}
                <div className="relative z-10 flex flex-col justify-end h-full p-4 text-white">
                  <div className="space-y-1 transition-transform duration-300 group-hover:-translate-y-1">
                    <h3 className="text-lg font-bold drop-shadow-lg">{course.title}</h3>
                    <p className="text-xs opacity-80 line-clamp-2 drop-shadow-md">
                      {course.description}
                    </p>
                    
                    {/* Module Count */}
                    <div className="text-xs opacity-70 mt-1">
                      {totalModules} {totalModules === 1 ? 'module' : 'modules'}
                    </div>
                    
                    {/* Tags */}
                    <div className="flex gap-1 flex-wrap pt-1 mb-2">
                      {course.tags?.map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] bg-white/20 backdrop-blur-sm text-white rounded-full px-2 py-0.5 hover:bg-white/30 transition"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    
                    {/* Action Button */}
                    <div className="text-center">
                      <span className="inline-block bg-white/90 text-gray-800 text-xs px-3 py-1 rounded-full font-medium transition-all group-hover:bg-white group-hover:scale-105">
                        {progress?.is_completed ? 'Review Course' : 
                         progress ? 'Continue Course' : 'Start Course'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
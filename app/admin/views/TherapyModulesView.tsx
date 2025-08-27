'use client';

import { ChangeEvent, useCallback, useEffect, useState } from 'react';

import { supabase } from '@/supabase/client'; // Ensure this path is correct

interface Course {
  id: string;
  title: string;
  description: string;
  image_path?: string;
  tags?: string[];
  themes?: string[];
  created_at: string;
  updated_at: string;
}

interface TherapyModule {
  id: string;
  name: string;
  description: string;ma
  greeting: string;
  instructions: string;
  agenda: string;
  course_id: string | null; // Added for relationship
  created_at: string;
  updated_at: string;
}

// Type for course being edited (with tags/themes as strings for input)
type EditableCourse = Omit<Partial<Course>, 'tags' | 'themes'> & {
  tags?: string;
  themes?: string;
}

export default function ComprehensiveTherapyEditor() {
  // --- Course State ---
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [editableCourse, setEditableCourse] = useState<EditableCourse>({});
  const [isCreatingCourse, setIsCreatingCourse] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [savingCourse, setSavingCourse] = useState(false);
  const [courseError, setCourseError] = useState<string | null>(null);
  const [courseSuccess, setCourseSuccess] = useState<string | null>(null);
  const [hasCourseChanges, setHasCourseChanges] = useState(false);
  // const [searchCourseQuery, setSearchCourseQuery] = useState(''); // Can be added later

  // --- Module State ---
  const [modules, setModules] = useState<TherapyModule[]>([]);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [editableModule, setEditableModule] = useState<Partial<TherapyModule>>({});
  const [isCreatingModule, setIsCreatingModule] = useState(false);
  const [loadingModules, setLoadingModules] = useState(false);
  const [savingModule, setSavingModule] = useState(false);
  const [moduleError, setModuleError] = useState<string | null>(null);
  const [moduleSuccess, setModuleSuccess] = useState<string | null>(null);
  const [hasModuleChanges, setHasModuleChanges] = useState(false);
  const [searchModuleQuery, setSearchModuleQuery] = useState('');

  // --- View State ---
  const [viewingUnassignedModules, setViewingUnassignedModules] = useState(false);

  const clearNotifications = () => {
    setCourseError(null);
    setCourseSuccess(null);
    setModuleError(null);
    setModuleSuccess(null);
  };

  const promptUnsavedChanges = (actionDescription: string): boolean => {
    if (hasCourseChanges || hasModuleChanges) {
      const changes = [];
      if (hasCourseChanges) changes.push('course');
      if (hasModuleChanges) changes.push('module');
      return window.confirm(
        `You have unsaved ${changes.join(' and ')} changes. Are you sure you want to ${actionDescription} without saving?`
      );
    }
    return true;
  };

  // --- Course Functions ---
  const fetchCourses = useCallback(async () => {
    setLoadingCourses(true);
    clearNotifications();
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      setCourses(data || []);
    } catch (err: any) {
      console.error('Error fetching courses:', err.message);
      setCourseError('Could not load courses.');
    } finally {
      setLoadingCourses(false);
    }
  }, []);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const fetchModulesForContext = useCallback(async () => {
    if (!selectedCourseId && !viewingUnassignedModules) {
      setModules([]);
      return;
    }
    setLoadingModules(true);
    clearNotifications();
    try {
      let query = supabase.from('therapy_modules').select('*').order('updated_at', { ascending: false });
      if (viewingUnassignedModules) {
        query = query.is('course_id', null);
      } else if (selectedCourseId) {
        query = query.eq('course_id', selectedCourseId);
      } else {
         setModules([]);
         setLoadingModules(false);
         return;
      }

      const { data, error } = await query;
      if (error) throw error;
      setModules(data || []);
    } catch (err: any) {
      console.error('Error fetching modules:', err.message);
      setModuleError('Could not load modules for the current context.');
    } finally {
      setLoadingModules(false);
    }
  }, [selectedCourseId, viewingUnassignedModules]);

  useEffect(() => {
    fetchModulesForContext();
  }, [fetchModulesForContext]);


  // Calculate hasCourseChanges
  useEffect(() => {
    if (isCreatingCourse) {
      setHasCourseChanges(
        !!editableCourse.title?.trim() ||
        !!editableCourse.description?.trim() ||
        !!editableCourse.image_path?.trim() ||
        !!editableCourse.tags?.trim() ||
        !!editableCourse.themes?.trim()
      );
      return;
    }
    if (!selectedCourseId) {
      setHasCourseChanges(false);
      return;
    }
    const originalCourse = courses.find(c => c.id === selectedCourseId);
    if (!originalCourse) {
      setHasCourseChanges(false);
      return;
    }
    const changed =
      editableCourse.title !== originalCourse.title ||
      editableCourse.description !== originalCourse.description ||
      editableCourse.image_path !== (originalCourse.image_path || '') ||
      (editableCourse.tags || '') !== (originalCourse.tags?.join(', ') || '') ||
      (editableCourse.themes || '') !== (originalCourse.themes?.join(', ') || '')
    setHasCourseChanges(changed);
  }, [editableCourse, selectedCourseId, courses, isCreatingCourse]);

  // Calculate hasModuleChanges
  useEffect(() => {
    if (isCreatingModule) {
      setHasModuleChanges(
        !!editableModule.name?.trim() ||
        !!editableModule.description?.trim() ||
        !!editableModule.greeting?.trim() ||
        !!editableModule.instructions?.trim() ||
        !!editableModule.agenda?.trim()
      );
      return;
    }
    if (!selectedModuleId) {
      setHasModuleChanges(false);
      return;
    }
    const originalModule = modules.find(m => m.id === selectedModuleId);
    if (!originalModule) {
      setHasModuleChanges(false);
      return;
    }
    const changed =
      editableModule.name !== originalModule.name ||
      editableModule.description !== originalModule.description ||
      editableModule.greeting !== originalModule.greeting ||
      editableModule.instructions !== originalModule.instructions ||
      editableModule.agenda !== originalModule.agenda;
    setHasModuleChanges(changed);
  }, [editableModule, selectedModuleId, modules, isCreatingModule]);


  const handleCourseInputChange = (field: keyof EditableCourse, value: string) => {
    setEditableCourse(prev => ({ ...prev, [field]: value }));
    if (courseSuccess) setCourseSuccess(null);
    clearNotifications();
  };

  const parseList = (input?: string): string[] => (input || '').split(',').map(item => item.trim()).filter(Boolean);

  const selectCourse = (id: string) => {
    if (!promptUnsavedChanges('select a different course')) return;

    const courseToEdit = courses.find(c => c.id === id);
    if (!courseToEdit) return;

    setSelectedCourseId(id);
    setEditableCourse({ 
      ...courseToEdit, 
      tags: courseToEdit.tags?.join(', ') || '', // Store as string for input
      themes: courseToEdit.themes?.join(', ') || '' // Store as string for input
    });
    setIsCreatingCourse(false);
    setViewingUnassignedModules(false);
    
    // Reset module states
    setSelectedModuleId(null);
    setEditableModule({});
    setIsCreatingModule(false);
    setSearchModuleQuery('');
    clearNotifications();
  };

  const createNewCourse = () => {
    if (!promptUnsavedChanges('create a new course')) return;

    setSelectedCourseId(null);
    setEditableCourse({ title: '', description: '', image_path: '', tags: '', themes: '' });
    setIsCreatingCourse(true);
    setViewingUnassignedModules(false);

    // Reset module states
    setModules([]);
    setSelectedModuleId(null);
    setEditableModule({});
    setIsCreatingModule(false);
    clearNotifications();
  };

  const selectUnassignedModulesView = () => {
    if (!promptUnsavedChanges('view unassigned modules')) return;

    setSelectedCourseId(null);
    setEditableCourse({});
    setIsCreatingCourse(false);
    setViewingUnassignedModules(true);

    // Reset module states
    setSelectedModuleId(null);
    setEditableModule({});
    setIsCreatingModule(false);
    setSearchModuleQuery('');
    clearNotifications();
  };

  const handleSaveCourse = async () => {
    if (!hasCourseChanges) return;
    setSavingCourse(true);
    clearNotifications();

    const payload: Partial<Course> & { tags?: string[]; themes?: string[] } = { // Ensure tags/themes are string[] for DB
      ...editableCourse,
      title: editableCourse.title || 'Untitled Course',
      description: editableCourse.description || '',
      image_path: editableCourse.image_path || undefined,
      tags: parseList(editableCourse.tags as string), // Parse back to array
      themes: parseList(editableCourse.themes as string), // Parse back to array
      updated_at: new Date().toISOString(),
    };
    // Remove id from payload if it's undefined (especially for insert)
    if (!payload.id) delete payload.id;


    try {
      if (isCreatingCourse) {
        const { data, error } = await supabase
          .from('courses')
          .insert(payload as Omit<Course, 'id' | 'created_at'>) // Type assertion for insert
          .select();
        if (error) throw error;
        if (data && data.length > 0) {
          const newCourse = data[0] as Course;
          setCourses([newCourse, ...courses]);
          setSelectedCourseId(newCourse.id);
          setEditableCourse({ // Update editableCourse with the saved data, including stringified tags/themes
            ...newCourse,
            tags: newCourse.tags?.join(', ') || '',
            themes: newCourse.themes?.join(', ') || ''
          });
          setIsCreatingCourse(false);
          setCourseSuccess("New course created successfully.");
        }
      } else if (selectedCourseId) {
         const { data, error } = await supabase
          .from('courses')
          .update(payload)
          .eq('id', selectedCourseId)
          .select();
        if (error) throw error;
        if (data && data.length > 0) {
          const updatedCourse = data[0] as Course;
          setCourses(courses.map(c => c.id === selectedCourseId ? updatedCourse : c));
           setEditableCourse({ // Update editableCourse with the saved data
            ...updatedCourse,
            tags: updatedCourse.tags?.join(', ') || '',
            themes: updatedCourse.themes?.join(', ') || ''
          });
          setCourseSuccess("Course updated successfully.");
        }
      }
      setHasCourseChanges(false);
    } catch (err: any) {
      console.error('Error saving course:', err.message);
      setCourseError(err.message || "Failed to save course.");
    } finally {
      setSavingCourse(false);
    }
  };

  const handleDeleteCourse = async () => {
    if (!selectedCourseId || isCreatingCourse) return;
    if (!confirm('Are you sure you want to delete this course? Modules associated with this course will be unassigned. This action cannot be undone.')) return;

    setSavingCourse(true); // Use savingCourse as a general "processing" state for delete too
    clearNotifications();

    try {
      // 1. Unassign modules associated with this course
      const { error: updateModulesError } = await supabase
        .from('therapy_modules')
        .update({ course_id: null, updated_at: new Date().toISOString() })
        .eq('course_id', selectedCourseId);

      if (updateModulesError) throw updateModulesError;

      // 2. Delete the course
      const { error: deleteCourseError } = await supabase
        .from('courses')
        .delete()
        .eq('id', selectedCourseId);

      if (deleteCourseError) throw deleteCourseError;

      setCourses(courses.filter(c => c.id !== selectedCourseId));
      setSelectedCourseId(null);
      setEditableCourse({});
      setIsCreatingCourse(false); // Ensure this is reset
      setModules([]); // Clear modules as the context is gone
      setCourseSuccess("Course deleted and its modules unassigned.");
    } catch (err: any) {
      console.error('Error deleting course:', err.message);
      setCourseError(err.message || "Failed to delete course.");
    } finally {
      setSavingCourse(false);
    }
  };


  // --- Module Functions ---
  const autoResizeTextarea = (textarea: HTMLTextAreaElement) => {
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  };

  useEffect(() => {
    // Auto-resize for currently edited module's textareas
    if (selectedModuleId || isCreatingModule) {
      document.querySelectorAll('textarea.module-field').forEach(textarea => {
        autoResizeTextarea(textarea as HTMLTextAreaElement);
      });
    }
  }, [editableModule, selectedModuleId, isCreatingModule]);


  const handleModuleTextareaChange = (e: ChangeEvent<HTMLTextAreaElement>, field: keyof TherapyModule) => {
    setEditableModule(prev => ({ ...prev, [field]: e.target.value }));
    autoResizeTextarea(e.target);
    if (moduleSuccess) setModuleSuccess(null);
    clearNotifications();
  };

  const selectModule = (id: string) => {
    if (hasModuleChanges && selectedModuleId !== id && !confirm('You have unsaved module changes. Continue without saving?')) return;
    
    const moduleToEdit = modules.find(m => m.id === id);
    if (!moduleToEdit) return;

    setSelectedModuleId(id);
    setEditableModule({ ...moduleToEdit });
    setIsCreatingModule(false);
    clearNotifications();
  };

  const createNewModule = () => {
    if (hasModuleChanges && !confirm('You have unsaved module changes. Continue without saving?')) return;

    setSelectedModuleId(null);
    setEditableModule({
      name: '',
      description: '',
      greeting: '',
      instructions: '',
      agenda: '',
      course_id: viewingUnassignedModules ? null : selectedCourseId, // Assign current course_id or null
    });
    setIsCreatingModule(true);
    clearNotifications();
  };

  const handleSaveModule = async () => {
    if (!hasModuleChanges) return;
    setSavingModule(true);
    clearNotifications();

    const modulePayload: Partial<TherapyModule> = {
      ...editableModule,
      name: editableModule.name || 'Untitled Module',
      updated_at: new Date().toISOString(),
      // course_id is already part of editableModule, set during createNewModule or when loading existing
    };
     if (!modulePayload.id) delete modulePayload.id; // for inserts

    try {
      if (isCreatingModule) {
        const { data, error } = await supabase
          .from('therapy_modules')
          .insert(modulePayload as Omit<TherapyModule, 'id' | 'created_at'>)
          .select();

        if (error) throw error;
        if (data && data.length > 0) {
          const newModule = data[0] as TherapyModule;
          setModules([newModule, ...modules].sort((a,b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()));
          setSelectedModuleId(newModule.id);
          setEditableModule(newModule); // Update editable module with saved data
          setIsCreatingModule(false);
          setModuleSuccess("New therapy module created.");
        }
      } else if (selectedModuleId) {
        const { data, error } = await supabase
          .from('therapy_modules')
          .update(modulePayload)
          .eq('id', selectedModuleId)
          .select();
        if (error) throw error;
        if (data && data.length > 0) {
          const updatedModule = data[0] as TherapyModule;
          setModules(modules.map(m => m.id === selectedModuleId ? updatedModule : m).sort((a,b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()));
          setEditableModule(updatedModule); // Update editable module
          setModuleSuccess("Therapy module updated.");
        }
      }
      setHasModuleChanges(false);
       // Re-fetch modules for context to ensure list is accurate if course_id changed (though not expected here)
      // await fetchModulesForContext(); // May be redundant if client-side updates are solid
    } catch (err: any) {
      console.error('Error saving module:', err.message);
      setModuleError(err.message || "Failed to save module.");
    } finally {
      setSavingModule(false);
    }
  };

  const handleDeleteModule = async () => {
    if (!selectedModuleId || isCreatingModule) return;
    if (!confirm('Are you sure you want to delete this module? This action cannot be undone.')) return;

    setSavingModule(true); // Use savingModule as general processing state
    clearNotifications();

    try {
      const { error } = await supabase
        .from('therapy_modules')
        .delete()
        .eq('id', selectedModuleId);

      if (error) throw error;

      setModules(modules.filter(m => m.id !== selectedModuleId));
      setSelectedModuleId(null);
      setEditableModule({});
      setIsCreatingModule(false); // Reset creation state
      setModuleSuccess("Therapy module deleted.");
    } catch (err: any) {
      console.error('Error deleting module:', err.message);
      setModuleError(err.message || "Failed to delete module.");
    } finally {
      setSavingModule(false);
    }
  };

  const filteredModules = modules.filter(module => {
    const searchLower = searchModuleQuery.toLowerCase();
    return (
      module.name?.toLowerCase().includes(searchLower) ||
      module.description?.toLowerCase().includes(searchLower) ||
      module.greeting?.toLowerCase().includes(searchLower) ||
      module.instructions?.toLowerCase().includes(searchLower) ||
      module.agenda?.toLowerCase().includes(searchLower)
    );
  });

  // --- Render ---
  return (
    <div className="pt-0">
      <h2 className="text-xl font-semibold mb-6">Therapy Content Editor</h2>
      
      {/* Global Notifications */}
      {courseError && <div className="mb-4 p-3 bg-red-100 text-red-700 border border-red-300 rounded-md text-sm">{courseError}</div>}
      {courseSuccess && <div className="mb-4 p-3 bg-green-100 text-green-700 border border-green-300 rounded-md text-sm">{courseSuccess}</div>}
      {moduleError && <div className="mb-4 p-3 bg-red-100 text-red-700 border border-red-300 rounded-md text-sm">Module Error: {moduleError}</div>}
      {moduleSuccess && <div className="mb-4 p-3 bg-green-100 text-green-700 border border-green-300 rounded-md text-sm">Module Success: {moduleSuccess}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* --- LEFT PANE: Courses & Unassigned --- */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-md font-medium text-gray-800">Courses</h3>
              <button 
                onClick={createNewCourse} 
                className="px-3 py-1.5 text-xs bg-blue-500 text-white rounded-md hover:bg-blue-600 transition"
                disabled={savingCourse || savingModule}
              >
                New Course
              </button>
            </div>
            {/* Course Search (Future enhancement) */}
            {loadingCourses ? <p className="text-xs text-gray-500 italic">Loading courses...</p> : courses.length === 0 ? <p className="text-xs text-gray-500 italic">No courses found. Create one!</p> : (
              <div className="space-y-2 max-h-[calc(100vh-350px)] overflow-y-auto pr-1">
                {courses.map(course => (
                  <div 
                    key={course.id} 
                    onClick={() => selectCourse(course.id)} 
                    className={`p-3 rounded-md cursor-pointer text-sm transition-colors border ${selectedCourseId === course.id && !viewingUnassignedModules ? 'bg-blue-50 border-blue-300' : 'hover:bg-gray-50 border-gray-200'}`}
                  >
                    <div className="font-medium truncate text-gray-700">{course.title || 'Untitled Course'}</div>
                    <div className="text-xs text-gray-500 truncate">{course.description?.substring(0,50) || 'No description'}...</div>
                  </div>
                ))}
              </div>
            )}
             <div
                onClick={selectUnassignedModulesView}
                className={`p-3 mt-4 rounded-md cursor-pointer text-sm transition-colors border ${viewingUnassignedModules ? 'bg-indigo-50 border-indigo-300' : 'hover:bg-gray-50 border-gray-200 '}`}
            >
                <div className="font-medium text-gray-700">Unassigned Modules</div>
                <div className="text-xs text-gray-500">Modules not linked to any course.</div>
            </div>
          </div>
        </div>

        {/* --- RIGHT PANE: Editor Area --- */}
        <div className="lg:col-span-2 space-y-6">
          {/* Course Editor */}
          {(selectedCourseId || isCreatingCourse) && !viewingUnassignedModules && (
            <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-md font-medium text-gray-800">{isCreatingCourse ? 'Create New Course' : `Edit Course: ${editableCourse.title || ''}`}</h3>
                <div className="flex space-x-2">
                  {!isCreatingCourse && selectedCourseId && (
                    <button 
                      onClick={handleDeleteCourse} 
                      className="px-3 py-1.5 text-xs bg-red-500 text-white rounded-md hover:bg-red-600 transition" 
                      disabled={savingCourse}
                    >
                      Delete Course
                    </button>
                  )}
                  <button 
                    onClick={handleSaveCourse} 
                    className={`px-3 py-1.5 text-xs rounded-md transition ${hasCourseChanges ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`} 
                    disabled={!hasCourseChanges || savingCourse}
                  >
                    {savingCourse ? 'Saving...' : 'Save Course'}
                  </button>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Title</label>
                  <input type="text" value={editableCourse.title || ''} onChange={e => handleCourseInputChange('title', e.target.value)} className="w-full p-2 text-sm bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Course Title" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                  <textarea value={editableCourse.description || ''} onChange={e => handleCourseInputChange('description', e.target.value)} className="w-full p-2 text-sm bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500" rows={3} placeholder="Course Description" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Image Path (URL)</label>
                  <input type="text" value={editableCourse.image_path || ''} onChange={e => handleCourseInputChange('image_path', e.target.value)} className="w-full p-2 text-sm bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="e.g., /images/course.jpg or https://example.com/image.png" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Tags (comma-separated)</label>
                  <input type="text" value={editableCourse.tags as string || ''} onChange={e => handleCourseInputChange('tags', e.target.value)} className="w-full p-2 text-sm bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="e.g., anxiety, mindfulness, cbt" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Themes (comma-separated, internal)</label>
                  <input type="text" value={editableCourse.themes as string || ''} onChange={e => handleCourseInputChange('themes', e.target.value)} className="w-full p-2 text-sm bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="e.g., coping_strategies, self_reflection" />
                </div>
              </div>
            </div>
          )}

          {/* Module Section (if a course is selected AND not creating a new course OR viewing unassigned modules) */}
          {((selectedCourseId && !isCreatingCourse) || viewingUnassignedModules) && (
            <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
              <div className="flex justify-between items-center mb-1">
                <h3 className="text-md font-medium text-gray-800">
                  {viewingUnassignedModules ? "Unassigned Modules" : `Modules for "${courses.find(c => c.id === selectedCourseId)?.title || '...'}"`}
                </h3>
                {/* New Module button is now inside the module list panel */}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3">
                {/* Module List */}
                <div className="md:col-span-1 space-y-3">
                    <div className="flex justify-between items-center mb-2">
                        <h4 className="text-sm font-medium text-gray-700">Module List</h4>
                        <button 
                            onClick={createNewModule} 
                            className="px-2 py-1 text-xs bg-teal-500 text-white rounded-md hover:bg-teal-600 transition"
                            disabled={savingCourse || savingModule}
                        >
                            New Module
                        </button>
                    </div>
                    <div className="mb-2">
                        <input type="text" placeholder="Search modules..." value={searchModuleQuery} onChange={(e) => setSearchModuleQuery(e.target.value)} className="w-full p-1.5 text-xs bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    </div>
                    {loadingModules ? <p className="text-xs text-gray-500 italic">Loading modules...</p> : filteredModules.length === 0 ? <p className="text-xs text-gray-500 italic">No modules found for this context.</p> : (
                    <div className="space-y-1.5 max-h-[calc(100vh-450px)] overflow-y-auto pr-1">
                        {filteredModules.map(module => (
                        <div 
                            key={module.id} 
                            onClick={() => selectModule(module.id)} 
                            className={`p-2 rounded-md cursor-pointer text-xs border ${selectedModuleId === module.id ? 'bg-teal-50 border-teal-200' : 'hover:bg-gray-50 border-gray-100'}`}
                        >
                            <div className="font-medium truncate text-gray-700">{module.name?.substring(0, 35) || 'Untitled Module'}</div>
                            <div className="text-gray-500 text-[11px]">Updated: {new Date(module.updated_at).toLocaleDateString()}</div>
                        </div>
                        ))}
                    </div>
                    )}
                </div>

                {/* Module Editor */}
                <div className="md:col-span-2 space-y-3">
                  {(selectedModuleId || isCreatingModule) ? (
                    <>
                      <div className="flex justify-between items-center pb-1 border-b border-gray-200 mb-2">
                        <h4 className="text-sm font-medium text-gray-700">{isCreatingModule ? 'Create New Module' : 'Edit Module'}</h4>
                        <div className="flex space-x-1">
                          {!isCreatingModule && selectedModuleId && (
                            <button 
                                onClick={handleDeleteModule} 
                                className="px-2 py-1 text-xs bg-red-500 text-white rounded-md hover:bg-red-600 transition" 
                                disabled={savingModule || loadingModules}
                            >
                                Delete
                            </button>
                          )}
                          <button 
                            onClick={handleSaveModule} 
                            className={`px-2 py-1 text-xs rounded-md transition ${hasModuleChanges ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`} 
                            disabled={!hasModuleChanges || savingModule}
                          >
                            {savingModule ? 'Saving...' : 'Save Module'}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
                          <textarea value={editableModule.name || ''} onChange={(e) => handleModuleTextareaChange(e, 'name')} className="module-field w-full p-1.5 text-sm bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none" style={{ minHeight: '40px' }} placeholder="Module name" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                          <textarea value={editableModule.description || ''} onChange={(e) => handleModuleTextareaChange(e, 'description')} className="module-field w-full p-1.5 text-sm bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none" style={{ minHeight: '60px' }} placeholder="Brief module description" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Greeting</label>
                          <textarea value={editableModule.greeting || ''} onChange={(e) => handleModuleTextareaChange(e, 'greeting')} className="module-field w-full p-1.5 text-sm bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none" style={{ minHeight: '60px' }} placeholder="Enter greeting message" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Instructions</label>
                          <textarea value={editableModule.instructions || ''} onChange={(e) => handleModuleTextareaChange(e, 'instructions')} className="module-field w-full p-1.5 text-sm bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none" style={{ minHeight: '100px' }} placeholder="Enter instructions for this module" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Agenda</label>
                          <textarea value={editableModule.agenda || ''} onChange={(e) => handleModuleTextareaChange(e, 'agenda')} className="module-field w-full p-1.5 text-sm bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none" style={{ minHeight: '100px' }} placeholder="Enter agenda for this module" />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 flex flex-col items-center justify-center h-64">
                      <svg className="w-12 h-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      <p className="text-gray-500 text-sm text-center">Select a module to edit, or create a new one for {viewingUnassignedModules ? 'unassigned modules' : 'this course'}.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Placeholder if no course/unassigned is selected and not creating a course */}
          {!selectedCourseId && !isCreatingCourse && !viewingUnassignedModules && (
            <div className="bg-white p-6 rounded-lg shadow border border-gray-200 flex flex-col items-center justify-center h-96">
               <svg className="w-20 h-20 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
              <p className="text-gray-500 text-md mb-2">Welcome to the Therapy Content Editor</p>
              <p className="text-gray-400 text-sm">Select a course to edit its details and modules,</p>
              <p className="text-gray-400 text-sm">view unassigned modules, or create a new course to get started.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
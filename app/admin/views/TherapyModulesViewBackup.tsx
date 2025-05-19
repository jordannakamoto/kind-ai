'use client';

import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/supabase/client';

interface TherapyModule {
  id: string;
  name: string;
  description: string;
  greeting: string;
  instructions: string;
  agenda: string;
  created_at: string;
  updated_at: string;
}

export default function TherapyModulesEditor() {
  const [modules, setModules] = useState<TherapyModule[]>([]);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [editableModule, setEditableModule] = useState<Partial<TherapyModule>>({});
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchModules = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('therapy_modules')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setModules(data || []);
    } catch (err: any) {
      console.error('Error fetching modules:', err.message);
      setError('Could not load therapy modules');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchModules();
  }, [fetchModules]);

  useEffect(() => {
    const textareas = document.querySelectorAll('textarea');
    textareas.forEach(textarea => {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    });
  }, [editableModule]);

  useEffect(() => {
    if (isCreating) {
      setHasChanges(
        !!editableModule.name?.trim() ||
        !!editableModule.description?.trim() ||
        !!editableModule.greeting?.trim() || 
        !!editableModule.instructions?.trim() || 
        !!editableModule.agenda?.trim()
      );
      return;
    }

    if (!selectedModuleId) return;

    const originalModule = modules.find(m => m.id === selectedModuleId);
    if (!originalModule) return;

    const changed = 
      editableModule.name !== originalModule.name ||
      editableModule.description !== originalModule.description ||
      editableModule.greeting !== originalModule.greeting ||
      editableModule.instructions !== originalModule.instructions ||
      editableModule.agenda !== originalModule.agenda;

    setHasChanges(changed);
  }, [editableModule, selectedModuleId, modules, isCreating]);

  const autoResizeTextarea = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>, field: string) => {
    setEditableModule(prev => ({ ...prev, [field]: e.target.value }));
    autoResizeTextarea(e);
    if (success) setSuccess(null);
  };

  const selectModule = (id: string) => {
    if (hasChanges && !confirm('You have unsaved changes. Continue without saving?')) return;

    const moduleToEdit = modules.find(m => m.id === id);
    if (!moduleToEdit) return;

    setSelectedModuleId(id);
    setEditableModule({ ...moduleToEdit });
    setIsCreating(false);
    setError(null);
    setSuccess(null);
  };

  const createNewModule = () => {
    if (hasChanges && !confirm('You have unsaved changes. Continue without saving?')) return;

    setSelectedModuleId(null);
    setEditableModule({
      name: '',
      description: '',
      greeting: '',
      instructions: '',
      agenda: ''
    });
    setIsCreating(true);
    setError(null);
    setSuccess(null);
  };

  const handleSave = async () => {
    if (!hasChanges) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      if (isCreating) {
        const { data, error } = await supabase
          .from('therapy_modules')
          .insert(editableModule)
          .select();

        if (error) throw error;

        if (data && data.length > 0) {
          setModules([data[0], ...modules]);
          setSelectedModuleId(data[0].id);
          setIsCreating(false);
          setSuccess("New therapy module created");
        }
      } else if (selectedModuleId) {
        const { data, error } = await supabase
          .from('therapy_modules')
          .update({ ...editableModule, updated_at: new Date().toISOString() })
          .eq('id', selectedModuleId)
          .select();

        if (error) throw error;

        if (data && data.length > 0) {
          setModules(modules.map(m => m.id === selectedModuleId ? data[0] : m));
          setSuccess("Therapy module updated");
        }
      }

      setHasChanges(false);
    } catch (err: any) {
      console.error('Error saving module:', err.message);
      setError(err.message || "Failed to save module");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedModuleId || isCreating) return;
    if (!confirm('Are you sure you want to delete this module? This action cannot be undone.')) return;

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('therapy_modules')
        .delete()
        .eq('id', selectedModuleId);

      if (error) throw error;

      setModules(modules.filter(m => m.id !== selectedModuleId));
      setSelectedModuleId(null);
      setEditableModule({});
      setSuccess("Therapy module deleted");
    } catch (err: any) {
      console.error('Error deleting module:', err.message);
      setError(err.message || "Failed to delete module");
    } finally {
      setLoading(false);
    }
  };

  const filteredModules = modules.filter(module => {
    const searchLower = searchQuery.toLowerCase();
    return (
      module.name?.toLowerCase().includes(searchLower) ||
      module.description?.toLowerCase().includes(searchLower) ||
      module.greeting?.toLowerCase().includes(searchLower) ||
      module.instructions?.toLowerCase().includes(searchLower) ||
      module.agenda?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="pt-0">
      <h2 className="text-lg font-medium mb-2">Therapy Modules</h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="md:col-span-1 space-y-3">
          <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-medium">Modules</h3>
              <button onClick={createNewModule} className="px-2 py-1 text-xs bg-blue-500 text-white rounded-md hover:bg-blue-600 transition">New Module</button>
            </div>
            <div className="mb-2">
              <input type="text" placeholder="Search modules..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full p-1.5 text-xs bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500" />
            </div>
            {loading && modules.length === 0 ? <p className="text-xs text-gray-500 italic">Loading modules...</p> : filteredModules.length === 0 ? <p className="text-xs text-gray-500 italic">No modules found</p> : (
              <div className="space-y-1.5 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
                {filteredModules.map(module => (
                  <div key={module.id} onClick={() => selectModule(module.id)} className={`p-2 rounded-md cursor-pointer text-xs ${selectedModuleId === module.id ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50 border border-gray-100'}`}>
                    <div className="font-medium truncate">{module.name?.substring(0, 35) || 'Untitled Module'}</div>
                    <div className="text-gray-500 text-xs">Updated: {new Date(module.updated_at).toLocaleDateString()}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="md:col-span-3 space-y-3">
          {(selectedModuleId || isCreating) ? (
            <>
              <div className="bg-white p-0 rounded-lg shadow-sm border border-gray-100 flex justify-between items-center">
                <div className="p-3">
                  <h3 className="text-sm font-medium">{isCreating ? 'Create New Module' : 'Edit Module'}</h3>
                </div>
                <div className="flex space-x-1 p-2">
                  {!isCreating && <button onClick={handleDelete} className="px-2 py-1 text-xs bg-red-500 text-white rounded-md hover:bg-red-600 transition" disabled={loading}>Delete</button>}
                  <button onClick={handleSave} className={`px-2 py-1 text-xs rounded-md transition ${hasChanges ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`} disabled={!hasChanges || saving}>{saving ? 'Saving...' : 'Save'}</button>
                </div>
              </div>

              <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
                <textarea value={editableModule.name || ''} onChange={(e) => handleTextareaChange(e, 'name')} className="w-full p-1.5 text-sm bg-white rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none" style={{ minHeight: '40px' }} placeholder="Module name" />
              </div>

              <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                <textarea value={editableModule.description || ''} onChange={(e) => handleTextareaChange(e, 'description')} className="w-full p-1.5 text-sm bg-white rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none" style={{ minHeight: '60px' }} placeholder="Brief module description" />
              </div>

              <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                <label className="block text-xs font-medium text-gray-700 mb-1">Greeting</label>
                <textarea value={editableModule.greeting || ''} onChange={(e) => handleTextareaChange(e, 'greeting')} className="w-full p-1.5 text-sm bg-white rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 overflow-hidden resize-none" style={{ minHeight: '60px' }} placeholder="Enter greeting message" />
              </div>

              <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                <label className="block text-xs font-medium text-gray-700 mb-1">Instructions</label>
                <textarea value={editableModule.instructions || ''} onChange={(e) => handleTextareaChange(e, 'instructions')} className="w-full p-1.5 text-sm bg-white rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 overflow-hidden resize-none" style={{ minHeight: '100px' }} placeholder="Enter instructions for this module" />
              </div>

              <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                <label className="block text-xs font-medium text-gray-700 mb-1">Agenda</label>
                <textarea value={editableModule.agenda || ''} onChange={(e) => handleTextareaChange(e, 'agenda')} className="w-full p-1.5 text-sm bg-white rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 overflow-hidden resize-none" style={{ minHeight: '100px' }} placeholder="Enter agenda for this module" />
              </div>
            </>
          ) : (
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex flex-col items-center justify-center h-64">
              <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-500 text-sm mb-4">Select a module to edit or create a new one</p>
              <button onClick={createNewModule} className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition text-sm">Create New Module</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

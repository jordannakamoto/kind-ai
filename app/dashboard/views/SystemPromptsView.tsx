'use client';

import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/supabase/client';

interface SystemPrompt {
  id: string;
  name: string;
  description: string;
  prompt: string;
  created_at: string;
  updated_at: string;
}

export default function SystemPromptsEditor() {
  const [prompts, setPrompts] = useState<SystemPrompt[]>([]);
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
  const [editablePrompt, setEditablePrompt] = useState<Partial<SystemPrompt>>({});
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchPrompts = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('system_prompts')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setPrompts(data || []);
    } catch (err: any) {
      console.error('Error fetching prompts:', err.message);
      setError('Could not load system prompts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrompts();
  }, [fetchPrompts]);

  useEffect(() => {
    const textareas = document.querySelectorAll('textarea');
    textareas.forEach(textarea => {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    });
  }, [editablePrompt]);

  useEffect(() => {
    if (isCreating) {
      setHasChanges(
        !!editablePrompt.name?.trim() ||
        !!editablePrompt.description?.trim() ||
        !!editablePrompt.prompt?.trim()
      );
      return;
    }

    if (!selectedPromptId) return;

    const originalPrompt = prompts.find(p => p.id === selectedPromptId);
    if (!originalPrompt) return;

    const changed = 
      editablePrompt.name !== originalPrompt.name ||
      editablePrompt.description !== originalPrompt.description ||
      editablePrompt.prompt !== originalPrompt.prompt;

    setHasChanges(changed);
  }, [editablePrompt, selectedPromptId, prompts, isCreating]);

  const autoResizeTextarea = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>, field: string) => {
    setEditablePrompt(prev => ({ ...prev, [field]: e.target.value }));
    autoResizeTextarea(e);
    if (success) setSuccess(null);
  };

  const selectPrompt = (id: string) => {
    if (hasChanges && !confirm('You have unsaved changes. Continue without saving?')) return;

    const promptToEdit = prompts.find(p => p.id === id);
    if (!promptToEdit) return;

    setSelectedPromptId(id);
    setEditablePrompt({ ...promptToEdit });
    setIsCreating(false);
    setError(null);
    setSuccess(null);
  };

  const createNewPrompt = () => {
    if (hasChanges && !confirm('You have unsaved changes. Continue without saving?')) return;

    setSelectedPromptId(null);
    setEditablePrompt({
      name: '',
      description: '',
      prompt: ''
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
          .from('system_prompts')
          .insert(editablePrompt)
          .select();

        if (error) throw error;

        if (data && data.length > 0) {
          setPrompts([data[0], ...prompts]);
          setSelectedPromptId(data[0].id);
          setIsCreating(false);
          setSuccess("New system prompt created");
        }
      } else if (selectedPromptId) {
        const { data, error } = await supabase
          .from('system_prompts')
          .update({ ...editablePrompt, updated_at: new Date().toISOString() })
          .eq('id', selectedPromptId)
          .select();

        if (error) throw error;

        if (data && data.length > 0) {
          setPrompts(prompts.map(p => p.id === selectedPromptId ? data[0] : p));
          setSuccess("System prompt updated");
        }
      }

      setHasChanges(false);
    } catch (err: any) {
      console.error('Error saving prompt:', err.message);
      setError(err.message || "Failed to save prompt");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedPromptId || isCreating) return;
    if (!confirm('Are you sure you want to delete this prompt? This action cannot be undone.')) return;

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('system_prompts')
        .delete()
        .eq('id', selectedPromptId);

      if (error) throw error;

      setPrompts(prompts.filter(p => p.id !== selectedPromptId));
      setSelectedPromptId(null);
      setEditablePrompt({});
      setSuccess("System prompt deleted");
    } catch (err: any) {
      console.error('Error deleting prompt:', err.message);
      setError(err.message || "Failed to delete prompt");
    } finally {
      setLoading(false);
    }
  };

  const filteredPrompts = prompts.filter(prompt => {
    const searchLower = searchQuery.toLowerCase();
    return (
      prompt.name?.toLowerCase().includes(searchLower) ||
      prompt.description?.toLowerCase().includes(searchLower) ||
      prompt.prompt?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="pt-0">
      <h2 className="text-lg font-medium mb-2">System Prompts</h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="md:col-span-1 space-y-3">
          <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-medium">Prompts</h3>
              <button onClick={createNewPrompt} className="px-2 py-1 text-xs bg-blue-500 text-white rounded-md hover:bg-blue-600 transition">New Prompt</button>
            </div>
            <div className="mb-2">
              <input type="text" placeholder="Search prompts..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full p-1.5 text-xs bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500" />
            </div>
            {loading && prompts.length === 0 ? <p className="text-xs text-gray-500 italic">Loading prompts...</p> : filteredPrompts.length === 0 ? <p className="text-xs text-gray-500 italic">No prompts found</p> : (
              <div className="space-y-1.5 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
                {filteredPrompts.map(prompt => (
                  <div key={prompt.id} onClick={() => selectPrompt(prompt.id)} className={`p-2 rounded-md cursor-pointer text-xs ${selectedPromptId === prompt.id ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50 border border-gray-100'}`}>
                    <div className="font-medium truncate">{prompt.name?.substring(0, 35) || 'Untitled Prompt'}</div>
                    <div className="text-gray-500 text-xs">Updated: {new Date(prompt.updated_at).toLocaleDateString()}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="md:col-span-3 space-y-3">
          {(selectedPromptId || isCreating) ? (
            <>
              <div className="bg-white p-0 rounded-lg shadow-sm border border-gray-100 flex justify-between items-center">
                <div className="p-3">
                  <h3 className="text-sm font-medium">{isCreating ? 'Create New Prompt' : 'Edit Prompt'}</h3>
                </div>
                <div className="flex space-x-1 p-2">
                  {!isCreating && <button onClick={handleDelete} className="px-2 py-1 text-xs bg-red-500 text-white rounded-md hover:bg-red-600 transition" disabled={loading}>Delete</button>}
                  <button onClick={handleSave} className={`px-2 py-1 text-xs rounded-md transition ${hasChanges ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`} disabled={!hasChanges || saving}>{saving ? 'Saving...' : 'Save'}</button>
                </div>
              </div>

              <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
                <textarea value={editablePrompt.name || ''} onChange={(e) => handleTextareaChange(e, 'name')} className="w-full p-1.5 text-sm bg-white rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none" style={{ minHeight: '40px' }} placeholder="Prompt name" />
              </div>

              <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                <textarea value={editablePrompt.description || ''} onChange={(e) => handleTextareaChange(e, 'description')} className="w-full p-1.5 text-sm bg-white rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none" style={{ minHeight: '60px' }} placeholder="Brief prompt description" />
              </div>

              <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                <label className="block text-xs font-medium text-gray-700 mb-1">Prompt</label>
                <textarea value={editablePrompt.prompt || ''} onChange={(e) => handleTextareaChange(e, 'prompt')} className="w-full p-1.5 text-sm bg-white rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 overflow-hidden resize-none" style={{ minHeight: '200px' }} placeholder="Enter system prompt content" />
              </div>
            </>
          ) : (
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex flex-col items-center justify-center h-64">
              <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-500 text-sm mb-4">Select a prompt to edit or create a new one</p>
              <button onClick={createNewPrompt} className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition text-sm">Create New Prompt</button>
            </div>
          )}
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-2 rounded-md text-xs">
              {error}
            </div>
          )}
          
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 p-2 rounded-md text-xs">
              {success}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
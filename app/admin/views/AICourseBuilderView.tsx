'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import LoadingDots from '@/components/LoadingDots';
import ImageSelector from '../components/ImageSelector';
import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

interface CourseStructure {
  title: string;
  description: string;
  tags: string[];
  themes: string[];
  modules: ModuleStructure[];
}

interface ModuleStructure {
  name: string;
  description: string;
  greeting: string;
  instructions: string;
  agenda: string;
  order: number;
}

export default function AICourseBuilderView() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [extractedCourse, setExtractedCourse] = useState<CourseStructure | null>(null);
  const [showCoursePreview, setShowCoursePreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [streamingContent, setStreamingContent] = useState('');
  const [pendingCourseContent, setPendingCourseContent] = useState<string | null>(null);
  const [showImageSelector, setShowImageSelector] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Cache the initial welcome message to avoid API calls
  const INITIAL_WELCOME_MESSAGE = `Hi! I'm your AI course builder, ready to help create therapeutic content.

I can help you build:
• Complete therapy courses with multiple modules
• Individual session plans and interventions
• Evidence-based content (CBT, DBT, ACT, mindfulness)
• Age-appropriate materials for different populations

What would you like to create? Just describe your idea - for example:
"A 6-session anxiety course for teens" or "DBT skills training for adults"

You can also use the image tool (📷) to add visual elements to your courses.`;

  // Auto-scroll to bottom when new messages arrive or streaming content updates
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent]);

  // Initialize with cached welcome message
  useEffect(() => {
    setMessages([{
      role: 'assistant',
      content: INITIAL_WELCOME_MESSAGE,
      timestamp: new Date()
    }]);
  }, []);

  const sendMessage = async () => {
    if (!currentMessage.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: currentMessage.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');
    setIsLoading(true);
    setError(null);
    setStreamingContent('');

    try {
      const response = await fetch('/api/admin/ai-course-builder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          action: 'chat',
          messages: [...messages, userMessage].map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get AI response');
      }

      // Check if response is JSON (function call) or streaming
      const contentType = response.headers.get('content-type');

      if (contentType?.includes('application/json')) {
        // Handle function call response (non-streaming)
        const data = await response.json();

        const assistantMessage: Message = {
          role: 'assistant',
          content: data.message,
          timestamp: new Date()
        };

        setMessages(prev => [...prev, assistantMessage]);

        // If it was a successful tool call, show success
        if (data.toolCall && data.courseData) {
          setSuccess(`Course "${data.courseData.title}" saved successfully!`);
        }

        // Try to extract course structure
        tryExtractCourseStructure(data.message);

      } else {
        // Handle streaming response
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let fullContent = '';

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));
                  if (data.content) {
                    fullContent += data.content;
                    setStreamingContent(fullContent);
                  } else if (data.done) {
                    // Streaming complete
                    const assistantMessage: Message = {
                      role: 'assistant',
                      content: fullContent,
                      timestamp: new Date()
                    };

                    setMessages(prev => [...prev, assistantMessage]);
                    setStreamingContent('');

                    // Try to extract course structure
                    tryExtractCourseStructure(fullContent);
                  }
                } catch (e) {
                  // Ignore JSON parse errors for partial chunks
                }
              }
            }
          }
        }
      }

    } catch (err: any) {
      console.error('Chat error:', err);
      setError(err.message || 'Failed to send message');
      setStreamingContent('');
    } finally {
      setIsLoading(false);
    }
  };

  const tryExtractCourseStructure = (content: string) => {
    try {
      // Look for JSON structure in the message
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        const courseData = JSON.parse(jsonMatch[1]);
        if (courseData.title && courseData.modules) {
          setExtractedCourse(courseData);
          setShowCoursePreview(true);
        }
      }
    } catch (error) {
      // Ignore JSON parsing errors - not all messages will contain course structure
    }
  };

  const saveContentAsCourse = async (content: string) => {
    setPendingCourseContent(content);
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/ai-course-builder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          action: 'save_raw_content',
          content: content
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save course');
      }

      const data = await response.json();
      setSuccess('Course content saved successfully!');
      setPendingCourseContent(null);

    } catch (err: any) {
      console.error('Save error:', err);
      setError(err.message || 'Failed to save course');
    } finally {
      setIsSaving(false);
    }
  };

  const shouldShowSaveButton = (content: string) => {
    // Never show save button on the initial welcome message
    if (content === INITIAL_WELCOME_MESSAGE) return false;

    // Show save button if content mentions course, modules, therapy, etc.
    const courseKeywords = ['course', 'module', 'session', 'therapy', 'therapeutic', 'intervention', 'agenda'];
    const lowerContent = content.toLowerCase();
    return courseKeywords.some(keyword => lowerContent.includes(keyword)) && content.length > 200;
  };

  const saveCourse = async () => {
    if (!extractedCourse) return;

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/admin/ai-course-builder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for authentication
        body: JSON.stringify({
          action: 'save_course',
          courseData: extractedCourse
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save course');
      }

      const data = await response.json();

      setSuccess(`Course "${extractedCourse.title}" created successfully with ${extractedCourse.modules.length} modules!`);
      setShowCoursePreview(false);
      setExtractedCourse(null);

      // Add success message to chat
      const successMessage: Message = {
        role: 'assistant',
        content: `✅ Great! I've successfully created the course "${extractedCourse.title}" with ${extractedCourse.modules.length} modules. The course is now available in your therapy library.

Would you like to create another course or make any modifications to this one?`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, successMessage]);

    } catch (err: any) {
      console.error('Save error:', err);
      setError(err.message || 'Failed to save course');
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([{
      role: 'assistant',
      content: INITIAL_WELCOME_MESSAGE,
      timestamp: new Date()
    }]);
    setExtractedCourse(null);
    setShowCoursePreview(false);
    setError(null);
    setSuccess(null);
    setStreamingContent('');
    setPendingCourseContent(null);
  };

  const handleImageSelect = (imageUrl: string) => {
    const imageText = `[Selected Image: ${imageUrl}]\n\n`;
    setCurrentMessage(prev => imageText + prev);
    setShowImageSelector(false);
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex bg-white">
      {/* Error Display */}
      {error && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 p-3 bg-red-100 border border-red-200 rounded-lg text-red-700 text-sm">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        </div>
      )}

      {/* Success Display */}
      {success && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 p-3 bg-green-100 border border-green-200 rounded-lg text-green-700 text-sm">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {success}
          </div>
        </div>
      )}

      {/* Chat Container */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Messages Area */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Clear chat button */}
          <div className="absolute top-4 right-4 z-10">
            <button
              onClick={clearChat}
              className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-md transition-colors"
            >
              Clear
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-2 max-h-full scroll-smooth">
            {messages.map((message, index) => (
              <div key={index} className="hover:bg-gray-50 px-3 py-2 group">
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-white text-sm font-medium ${
                    message.role === 'user' ? 'bg-blue-500' : 'bg-purple-500'
                  }`}>
                    {message.role === 'user' ? 'U' : 'AI'}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Username and timestamp */}
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900 text-sm">
                        {message.role === 'user' ? 'You' : 'AI Assistant'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {message.timestamp.toLocaleTimeString()}
                      </span>
                    </div>

                    {/* Message content */}
                    <div className="text-sm text-gray-900 leading-relaxed prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-900 prose-strong:text-gray-900 prose-code:text-blue-600 prose-code:bg-blue-50 prose-code:px-1 prose-code:rounded prose-pre:bg-gray-50 prose-pre:border prose-pre:border-gray-200">
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    </div>

                    {/* Save button for AI messages with course content */}
                    {message.role === 'assistant' && shouldShowSaveButton(message.content) && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <button
                          onClick={() => saveContentAsCourse(message.content)}
                          disabled={isSaving && pendingCourseContent === message.content}
                          className="px-3 py-1.5 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md transition-colors disabled:opacity-50 flex items-center gap-1.5"
                        >
                          {isSaving && pendingCourseContent === message.content ? (
                            <>
                              <div className="w-3 h-3 border border-blue-300 border-t-blue-600 rounded-full animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
                              </svg>
                              Save as Course
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {(isLoading || streamingContent) && (
              <div className="hover:bg-gray-50 px-3 py-2 group">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-white text-sm font-medium bg-purple-500">
                    AI
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900 text-sm">AI Assistant</span>
                      <span className="text-xs text-gray-500">
                        {new Date().toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-sm text-gray-900 leading-relaxed prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-900 prose-strong:text-gray-900 prose-code:text-blue-600 prose-code:bg-blue-50 prose-code:px-1 prose-code:rounded prose-pre:bg-gray-50 prose-pre:border prose-pre:border-gray-200">
                      {streamingContent ? (
                        <>
                          <ReactMarkdown>{streamingContent}</ReactMarkdown>
                          <span className="inline-block w-0.5 h-4 bg-purple-500 ml-1 animate-pulse" />
                        </>
                      ) : (
                        <div className="flex items-center gap-2">
                          <LoadingDots className="text-sm" />
                          <span className="text-gray-600">Thinking...</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="flex-shrink-0 p-4 border-t border-gray-200">
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <textarea
                  ref={textareaRef}
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Message AI Assistant..."
                  className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  rows={1}
                  disabled={isLoading}
                  style={{ minHeight: '44px', maxHeight: '120px' }}
                />
              </div>
              <button
                onClick={() => setShowImageSelector(true)}
                disabled={isLoading}
                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                title="Select Image"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </button>
              <button
                onClick={sendMessage}
                disabled={!currentMessage.trim() || isLoading}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
                Send
              </button>
            </div>

            {/* Quick suggestions */}
            {messages.length <= 1 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  "Create a course on anxiety management",
                  "Build a depression support program",
                  "Design a mindfulness training course"
                ].map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentMessage(suggestion)}
                    className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Course Preview Panel */}
        {showCoursePreview && extractedCourse && (
          <div className="w-96 bg-white border-l border-gray-200 overflow-y-auto">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Course Preview</h2>
                <button
                  onClick={() => setShowCoursePreview(false)}
                  className="w-6 h-6 text-gray-400 hover:text-gray-600 flex items-center justify-center"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-900 mb-1">{extractedCourse.title}</h3>
                  <p className="text-sm text-gray-600">{extractedCourse.description}</p>
                </div>

                {extractedCourse.tags.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Tags</h4>
                    <div className="flex flex-wrap gap-1">
                      {extractedCourse.tags.map((tag, index) => (
                        <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Modules ({extractedCourse.modules.length})
                  </h4>
                  <div className="space-y-2">
                    {extractedCourse.modules.map((module, index) => (
                      <div key={index} className="p-3 bg-gray-50 rounded-lg">
                        <h5 className="font-medium text-sm text-gray-900">{module.name}</h5>
                        <p className="text-xs text-gray-600 mt-1">{module.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <button
                    onClick={saveCourse}
                    disabled={isSaving}
                    className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    {isSaving ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Saving...</span>
                      </div>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Save Course
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Image Selector Modal */}
      <ImageSelector
        isOpen={showImageSelector}
        onClose={() => setShowImageSelector(false)}
        onSelect={handleImageSelect}
      />
    </div>
  );
}
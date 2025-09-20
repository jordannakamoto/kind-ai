import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Archive, Trash2 } from 'lucide-react';

interface CleanupDropdownProps {
  onCleanupCompleted: () => void;
  onDeleteAllCompleted: () => void;
  isLoading: boolean;
}

export default function CleanupDropdown({
  onCleanupCompleted,
  onDeleteAllCompleted,
  isLoading
}: CleanupDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className={`px-4 py-2 text-sm text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-2 ${
          isLoading ? 'opacity-50 cursor-not-allowed' : ''
        }`}
        title="Cleanup options"
      >
        <Archive className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        {isLoading ? 'Cleaning...' : 'Cleanup'}
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-10 bg-white rounded-xl shadow-lg border border-gray-100 py-2 w-52 z-50">
          <button
            onClick={() => {
              onCleanupCompleted();
              setIsOpen(false);
            }}
            className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
          >
            <Archive className="w-4 h-4" />
            Archive old completed goals
          </button>
          <button
            onClick={() => {
              onDeleteAllCompleted();
              setIsOpen(false);
            }}
            className="w-full px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete all completed goals
          </button>
        </div>
      )}
    </div>
  );
}
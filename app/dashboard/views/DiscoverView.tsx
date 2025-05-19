'use client';

import Image from 'next/image';
import { useState } from 'react';

// 1. Define module type
type ModuleSize = 'square' | 'tall' | 'wide';

interface TherapyModule {
  id: number;
  title: string;
  description: string;
  tags: string[];
  image: string;
  size: ModuleSize;
}

// 2. Module data
const modules: TherapyModule[] = [
  {
    id: 1,
    title: 'Emotional Regulation',
    description: 'Learn to manage intense emotions with calm and clarity.',
    tags: ['Mood', 'Coping'],
    image: 'https://plus.unsplash.com/premium_photo-1692504791832-b66fa54ad6b9?q=80&w=3118&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    size: 'tall',
  },
  {
    id: 2,
    title: 'ADHD Focus Toolkit',
    description: 'Strategies and tools for staying focused with ADHD.',
    tags: ['ADHD', 'Productivity'],
    image: 'https://images.unsplash.com/photo-1500904156668-758cff89dcff?q=80&w=2940&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    size: 'wide',
  },
  {
    id: 3,
    title: 'Inner Child Healing',
    description: 'Reparent yourself with love, forgiveness, and care.',
    tags: ['Healing', 'Self-esteem'],
    image: 'https://plus.unsplash.com/premium_photo-1671599010192-23b6bfd6fb6e?q=80&w=3087&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    size: 'square',
  },
  {
    id: 4,
    title: 'Mindfulness Reset',
    description: 'Cultivate awareness and presence in daily life.',
    tags: ['Mindfulness', 'Anxiety'],
    image: 'https://plus.unsplash.com/premium_photo-1664378616928-dc6842677183?q=80&w=2940&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    size: 'wide',
  },
  {
    id: 5,
    title: 'Conflict to Connection',
    description: 'Turn difficult conversations into healing moments.',
    tags: ['Relationships', 'Communication'],
    image: 'https://images.unsplash.com/photo-1483137140003-ae073b395549?q=80&w=2940&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    size: 'tall',
  },
  {
    id: 6,
    title: 'Body & Somatic Safety',
    description: 'Feel safe and grounded in your body again.',
    tags: ['Trauma', 'Body-based'],
    image: 'https://images.unsplash.com/photo-1578264085899-43ae0b44649f?q=80&w=3087&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    size: 'square',
  },
];

// 3. Size styling
const sizeClass: Record<ModuleSize, string> = {
  square: 'row-span-1 h-[300px]',
  tall: 'row-span-2 h-[620px]',
  wide: 'col-span-2 row-span-1 h-[300px]',
};

// 4. Main component
export default function TherapyLibraryFeed() {
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const allTags = ['All', ...new Set(modules.flatMap((mod) => mod.tags))];

  const filteredModules = selectedTag && selectedTag !== 'All'
    ? modules.filter((mod) => mod.tags.includes(selectedTag))
    : modules;

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

      {/* Grid */}
      <div className="grid grid-cols-3 grid-rows-2 gap-6">
        {filteredModules.map((mod) => (
          <div
            key={mod.id}
            className={`relative group overflow-hidden rounded-2xl shadow-lg transition-all duration-300 hover:shadow-xl ${sizeClass[mod.size]}`}
          >
            {/* Image */}
            <div className="absolute inset-0 z-0">
              <Image
                src={mod.image}
                alt={mod.title}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black opacity-20 group-hover:opacity-30 transition-opacity duration-300" />
            </div>

            {/* Overlay Content */}
            <div className="relative z-10 flex flex-col justify-end h-full p-6 text-white">
              <div className="space-y-2 transition-transform duration-300 group-hover:-translate-y-2">
                <h3 className="text-2xl font-bold drop-shadow-lg">{mod.title}</h3>
                <p className="text-sm opacity-80 line-clamp-2 drop-shadow-md">
                  {mod.description}
                </p>
                <div className="flex gap-2 flex-wrap pt-2">
                  {mod.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs bg-white/20 backdrop-blur-sm text-white rounded-full px-2.5 py-1 hover:bg-white/30 transition"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
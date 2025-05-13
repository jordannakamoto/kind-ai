// components/TestimonialsSection.tsx
"use client";

import { Heart, MessageCircle, Repeat, UserCircle2, Verified } from 'lucide-react';

import React from 'react';

// --- Data for Testimonials ---
const testimonialData = [
  {
    id: 1,
    name: "Alex Miller",
    username: "@alex_codes",
    avatarInitial: "A",
    avatarColor: "bg-blue-500", // Example, can be dynamic or image
    verified: true,
    timestamp: "3h ago",
    text: "Was pretty unsure if an AI could *actually* help with feeling overwhelmed. But Kind AI? It's surprisingly... understanding. No judgment, just a space to get my thoughts out. Already feeling a bit lighter. #MentalWellness #AISupport",
    replies: "18",
    retweets: "42",
    likes: "230",
  },
  {
    id: 2,
    name: "Jamie B.",
    username: "@jamie_b_creative",
    avatarInitial: "J",
    avatarColor: "bg-pink-500",
    verified: false,
    timestamp: "1d ago",
    text: "I usually just bottle things up. Scheduling therapy is a whole thing. Kind AI is just... there. Whenever. It doesn't try to 'fix' me, just helps me process. The reflective dialogue is genuinely insightful. #SelfCareJourney #KindAI",
    replies: "25",
    retweets: "55",
    likes: "310",
  },
  {
    id: 3,
    name: "Dr. Evelyn Reed (PhD)",
    username: "@DocEvelyn",
    avatarInitial: "E",
    avatarColor: "bg-indigo-500",
    verified: true,
    timestamp: "5h ago",
    text: "As a researcher, I'm cautious about AI in mental health. But the privacy-first approach of Kind AI is commendable. And the conversational flow feels more natural than I expected. It's a useful tool for self-reflection, not a replacement for clinical care, but valuable. #AIethics #MentalHealthTech",
    replies: "30",
    retweets: "78",
    likes: "450",
  },
  {
    id: 4,
    name: "Samira K.",
    username: "@MindfulSamira",
    avatarInitial: "S",
    avatarColor: "bg-teal-500",
    verified: false,
    timestamp: "Nov 12",
    text: "It's like having a thought partner that's always available and never gets tired of listening. I was worried it'd be generic, but it remembers our conversations (securely!) and builds on them. Feeling more understood. #AccessibleSupport #TechForGood",
    replies: "22",
    retweets: "61",
    likes: "380",
  },
];

interface TestimonialCardProps {
  name: string;
  username: string;
  avatarInitial: string;
  avatarColor: string;
  verified: boolean;
  timestamp: string;
  text: string;
  replies: string;
  retweets: string;
  likes: string;
}

const TestimonialCard: React.FC<TestimonialCardProps> = ({
  name,
  username,
  avatarInitial,
  avatarColor,
  verified,
  timestamp,
  text,
  replies,
  retweets,
  likes,
}) => {
  // Function to process text and bold hashtags
  const formatTextWithHashtags = (inputText: string) => {
    const parts = inputText.split(/(#\w+)/g); // Split by hashtag
    return parts.map((part, index) => {
      if (part.startsWith("#")) {
        return <strong key={index} className="text-indigo-600 font-normal">{part}</strong>;
      }
      return part;
    });
  };

  return (
    <div className="bg-white border border-gray-200/90 rounded-xl p-5 sm:p-6 shadow-lg hover:shadow-xl transition-shadow duration-300">
      <div className="flex items-start space-x-3">
        <div className={`w-10 h-10 rounded-full ${avatarColor} flex items-center justify-center text-white font-semibold text-lg`}>
          {avatarInitial}
        </div>
        <div className="flex-1">
          <div className="flex items-center space-x-1">
            <span className="font-semibold text-gray-800 text-sm sm:text-base">{name}</span>
            {verified && <Verified className="w-4 h-4 text-blue-500 fill-current" />}
            <span className="text-gray-500 text-xs sm:text-sm">{username}</span>
            <span className="text-gray-400 text-xs sm:text-sm">· {timestamp}</span>
          </div>
        </div>
      </div>
      <p className="mt-3 text-gray-700 text-sm sm:text-base leading-relaxed">
        {formatTextWithHashtags(text)}
      </p>
      <div className="mt-4 flex items-center space-x-6 text-gray-500">
        <div className="flex items-center space-x-1.5 hover:text-blue-500 transition-colors cursor-pointer">
          <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="text-xs sm:text-sm">{replies}</span>
        </div>
        <div className="flex items-center space-x-1.5 hover:text-green-500 transition-colors cursor-pointer">
          <Repeat className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="text-xs sm:text-sm">{retweets}</span>
        </div>
        <div className="flex items-center space-x-1.5 hover:text-pink-500 transition-colors cursor-pointer">
          <Heart className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="text-xs sm:text-sm">{likes}</span>
        </div>
      </div>
    </div>
  );
};


export const TestimonialsSection: React.FC = () => {
  return (
    <section className="py-20 md:py-28 bg-gray-50/70">
      <div className="container mx-auto px-6">
        {/* <div className="max-w-3xl mx-auto text-center mb-12 md:mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 tracking-tight">
            Hear From Our Early Explorers
          </h2>
          <p className="text-lg text-gray-600 leading-relaxed">
            Real experiences from individuals finding new ways to support their well-being with Kind AI.
          </p>
        </div> */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 max-w-5xl mx-auto">
          {testimonialData.map((testimonial) => (
            <TestimonialCard key={testimonial.id} {...testimonial} />
          ))}
        </div>
      </div>
    </section>
  );
};
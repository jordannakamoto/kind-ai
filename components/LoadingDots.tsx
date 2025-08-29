'use client';

import React from 'react';

interface LoadingDotsProps {
  className?: string;
  text?: string;
}

const LoadingDots: React.FC<LoadingDotsProps> = ({ className = '', text }) => {
  return (
    <span className={`inline-flex items-center justify-center ${className}`}>
      {text && <span className="text-gray-500 mr-2">{text}</span>}
      <span className="loading-dots inline-flex space-x-1">
        <span className="dot">•</span>
        <span className="dot animation-delay-200">•</span>
        <span className="dot animation-delay-400">•</span>
      </span>
      <style jsx>{`
        .loading-dots .dot {
          animation: pulse 1.4s ease-in-out infinite;
          font-size: 16px;
          color: #6b7280;
          display: inline-block;
          transform-origin: center;
        }
        
        .loading-dots .animation-delay-200 {
          animation-delay: 0.2s;
        }
        
        .loading-dots .animation-delay-400 {
          animation-delay: 0.4s;
        }
        
        @keyframes pulse {
          0%, 80%, 100% {
            transform: scale(1);
            opacity: 0.3;
          }
          40% {
            transform: scale(1.2);
            opacity: 1;
          }
        }
      `}</style>
    </span>
  );
};

export default LoadingDots;
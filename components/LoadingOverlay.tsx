'use client';

import { useEffect, useState, useMemo } from 'react';
import { Search, Sparkles, Paintbrush, Zap, TrendingUp, Eye, Brain, Palette } from 'lucide-react';

type LoadingType = 'photo' | 'roast' | 'fbi' | 'osint';
type PhotoStage = 'analyze' | 'image';

interface LoadingOverlayProps {
  type: LoadingType;
  stage?: PhotoStage;
  username?: string;
}

// Messages for each loading type and stage
const PHOTO_ANALYZE_MESSAGES = [
  { text: 'Searching through posts...', icon: Search },
  { text: 'Finding viral content...', icon: TrendingUp },
  { text: 'Analyzing media & aesthetics...', icon: Eye },
  { text: 'Hunting for greatest hits...', icon: Zap },
  { text: 'Studying the vibe...', icon: Brain },
  { text: 'Decoding the personality...', icon: Sparkles },
];

const PHOTO_IMAGE_MESSAGES = [
  { text: 'Mixing the colors...', icon: Palette },
  { text: 'Sketching the scene...', icon: Paintbrush },
  { text: 'Adding satirical details...', icon: Sparkles },
  { text: 'Perfecting the caricature...', icon: Eye },
  { text: 'Almost there...', icon: Zap },
];

const ROAST_MESSAGES = [
  { text: 'Reading your timeline...', icon: Search },
  { text: 'Finding your weak spots...', icon: Eye },
  { text: 'Sharpening the wit...', icon: Zap },
  { text: 'Crafting devastating burns...', icon: Sparkles },
  { text: 'Adding a pinch of love...', icon: Brain },
];

const FBI_MESSAGES = [
  { text: 'Accessing public records...', icon: Search },
  { text: 'Analyzing behavioral patterns...', icon: Brain },
  { text: 'Cross-referencing data points...', icon: Eye },
  { text: 'Building psychological profile...', icon: Sparkles },
  { text: 'Classifying threat level...', icon: Zap },
];

const OSINT_MESSAGES = [
  { text: 'Initiating reconnaissance...', icon: Search },
  { text: 'Gathering intelligence...', icon: Eye },
  { text: 'Mapping social connections...', icon: TrendingUp },
  { text: 'Analyzing engagement patterns...', icon: Brain },
  { text: 'Compiling comprehensive dossier...', icon: Sparkles },
];

// Estimated durations in seconds
const DURATIONS: Record<LoadingType, number> = {
  photo: 45,  // 2 stages combined
  roast: 30,
  fbi: 30,
  osint: 90,
};

export function LoadingOverlay({ type, stage, username }: LoadingOverlayProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);

  // Get messages based on type and stage
  const messages = useMemo(() => {
    if (type === 'photo') {
      return stage === 'image' ? PHOTO_IMAGE_MESSAGES : PHOTO_ANALYZE_MESSAGES;
    }
    if (type === 'roast') return ROAST_MESSAGES;
    if (type === 'fbi') return FBI_MESSAGES;
    return OSINT_MESSAGES;
  }, [type, stage]);

  // Calculate progress percentage
  const progress = useMemo(() => {
    const baseDuration = DURATIONS[type];
    let adjustedProgress = (elapsedSeconds / baseDuration) * 100;

    // For photo type, adjust based on stage
    if (type === 'photo') {
      if (stage === 'analyze') {
        adjustedProgress = Math.min((elapsedSeconds / 30) * 70, 70); // 0-70% for analyze
      } else {
        adjustedProgress = 70 + Math.min((elapsedSeconds / 20) * 30, 29); // 70-99% for image
      }
    }

    // Cap at 99% - never show 100% until actually done
    return Math.min(adjustedProgress, 99);
  }, [elapsedSeconds, type, stage]);

  // Elapsed time counter
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Reset elapsed time and message index when stage changes
  useEffect(() => {
    if (type === 'photo' && stage === 'image') {
      setElapsedSeconds(0);
    }
    // Reset message index when messages change to avoid out-of-bounds
    setMessageIndex(0);
  }, [stage, type]);

  // Cycle through messages
  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % messages.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [messages.length]);

  // Safely get current message with fallback
  const currentMessage = messages[messageIndex] || messages[0];
  const IconComponent = currentMessage.icon;

  // Get step info for photo type
  const stepInfo = type === 'photo' ? (stage === 'analyze' ? 'Step 1 of 2' : 'Step 2 of 2') : null;

  // Get title based on type
  const getTitle = () => {
    if (type === 'photo') {
      return stage === 'analyze' ? 'Analyzing Profile' : 'Generating Artwork';
    }
    if (type === 'roast') return 'Crafting Your Roast';
    if (type === 'fbi') return 'Building Profile';
    return 'Compiling Dossier';
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-50 flex items-center justify-center">
      <div className="text-center space-y-8 max-w-md px-6">
        {/* Username badge */}
        {username && (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10">
            <span className="text-neutral-400 text-sm">Analyzing</span>
            <span className="text-white font-semibold">@{username}</span>
          </div>
        )}

        {/* Animated spinner with icon */}
        <div className="relative w-24 h-24 mx-auto">
          {/* Outer spinning ring */}
          <div className="absolute inset-0 rounded-full border-4 border-white/10" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#ff4d4d] border-r-[#f9cb28] animate-spin" />

          {/* Inner pulsing glow */}
          <div className="absolute inset-2 rounded-full bg-gradient-to-br from-rose-500/20 to-orange-500/20 animate-pulse" />

          {/* Center icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <IconComponent className="w-8 h-8 text-white animate-pulse" />
          </div>
        </div>

        {/* Title and step */}
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white">{getTitle()}</h2>
          {stepInfo && (
            <p className="text-neutral-500 text-sm font-medium">{stepInfo}</p>
          )}
        </div>

        {/* Animated message */}
        <div className="h-8 flex items-center justify-center">
          <p className="text-lg text-neutral-300 animate-fade-in" key={messageIndex}>
            {currentMessage.text}
          </p>
        </div>

        {/* Progress bar */}
        <div className="w-full space-y-2">
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-rose-500 to-orange-500 rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-neutral-500">
            <span>{Math.round(progress)}%</span>
            <span>{elapsedSeconds}s elapsed</span>
          </div>
        </div>

        {/* Fun tip */}
        <p className="text-neutral-600 text-xs max-w-xs mx-auto">
          {type === 'photo' && stage === 'analyze' && 'Searching 100+ posts to understand your unique style...'}
          {type === 'photo' && stage === 'image' && 'Creating a one-of-a-kind satirical masterpiece...'}
          {type === 'roast' && 'Finding the perfect balance of savage and affectionate...'}
          {type === 'fbi' && 'All information is sourced from public posts only...'}
          {type === 'osint' && 'Building the most comprehensive profile possible...'}
        </p>
      </div>
    </div>
  );
}


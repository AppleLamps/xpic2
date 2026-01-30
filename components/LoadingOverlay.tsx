'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Search, Sparkles, Paintbrush, Zap, TrendingUp, Eye, Brain, Palette, Check } from 'lucide-react';

type LoadingType = 'photo' | 'roast' | 'fbi' | 'osint' | 'caricature' | 'jointpic' | 'video';
type PhotoStage = 'analyze' | 'image' | 'video';

interface LoadingOverlayProps {
  type: LoadingType;
  stage?: PhotoStage;
  username?: string;
  username2?: string;
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

const CARICATURE_MESSAGES = [
  { text: 'Studying your features...', icon: Eye },
  { text: 'Finding your best angle...', icon: Search },
  { text: 'Exaggerating the good stuff...', icon: Sparkles },
  { text: 'Sketching with marker...', icon: Paintbrush },
  { text: 'Adding comedic flair...', icon: Zap },
  { text: 'Almost done with your portrait...', icon: Palette },
];

const JOINTPIC_ANALYZE_MESSAGES = [
  { text: 'Searching first profile...', icon: Search },
  { text: 'Searching second profile...', icon: Search },
  { text: 'Analyzing both timelines...', icon: Eye },
  { text: 'Finding common ground...', icon: TrendingUp },
  { text: 'Spotting contrasts...', icon: Zap },
  { text: 'Crafting the crossover...', icon: Brain },
  { text: 'Building the scene...', icon: Sparkles },
];

const JOINTPIC_IMAGE_MESSAGES = [
  { text: 'Merging two worlds...', icon: Palette },
  { text: 'Sketching the duo...', icon: Paintbrush },
  { text: 'Adding satirical details...', icon: Sparkles },
  { text: 'Perfecting the crossover...', icon: Eye },
  { text: 'Almost there...', icon: Zap },
];

const VIDEO_ANALYZE_MESSAGES = [
  { text: 'Searching through posts...', icon: Search },
  { text: 'Finding viral moments...', icon: TrendingUp },
  { text: 'Analyzing motion & energy...', icon: Eye },
  { text: 'Studying the vibe...', icon: Brain },
  { text: 'Crafting the narrative...', icon: Sparkles },
];

const VIDEO_GENERATION_MESSAGES = [
  { text: 'Setting up the scene...', icon: Palette },
  { text: 'Animating the story...', icon: Paintbrush },
  { text: 'Adding motion effects...', icon: Zap },
  { text: 'Rendering 10 seconds of magic...', icon: Sparkles },
  { text: 'Encoding the video...', icon: Eye },
  { text: 'Almost there...', icon: Check },
];

// Activity log entries for joint pic (simulated search queries)
const ACTIVITY_LOG_ENTRIES = [
  { query: 'from:{user1}', status: 'searching' },
  { query: 'from:{user1} min_faves:100', status: 'pending' },
  { query: 'from:{user2}', status: 'pending' },
  { query: 'from:{user2} min_faves:100', status: 'pending' },
  { query: 'from:{user1} filter:media', status: 'pending' },
  { query: 'from:{user2} filter:media', status: 'pending' },
  { query: '@{user1} @{user2}', status: 'pending' },
  { query: 'Analyzing themes...', status: 'pending' },
  { query: 'Finding connections...', status: 'pending' },
  { query: 'Generating prompt...', status: 'pending' },
];

// Estimated durations in seconds
const DURATIONS: Record<LoadingType, number> = {
  photo: 45,
  roast: 30,
  fbi: 30,
  osint: 90,
  caricature: 45,
  jointpic: 60,
  video: 90,
};

// Particle component for the orb trails
interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  color: string;
}

export function LoadingOverlay({ type, stage, username, username2 }: LoadingOverlayProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [activityIndex, setActivityIndex] = useState(0);
  const [gradientAngle, setGradientAngle] = useState(0);

  // Get messages based on type and stage
  const messages = useMemo(() => {
    if (type === 'photo') {
      return stage === 'image' ? PHOTO_IMAGE_MESSAGES : PHOTO_ANALYZE_MESSAGES;
    }
    if (type === 'jointpic') {
      return stage === 'image' ? JOINTPIC_IMAGE_MESSAGES : JOINTPIC_ANALYZE_MESSAGES;
    }
    if (type === 'video') {
      return stage === 'video' ? VIDEO_GENERATION_MESSAGES : VIDEO_ANALYZE_MESSAGES;
    }
    if (type === 'roast') return ROAST_MESSAGES;
    if (type === 'fbi') return FBI_MESSAGES;
    if (type === 'caricature') return CARICATURE_MESSAGES;
    return OSINT_MESSAGES;
  }, [type, stage]);

  // Calculate progress percentage
  const progress = useMemo(() => {
    const baseDuration = DURATIONS[type];
    let adjustedProgress = (elapsedSeconds / baseDuration) * 100;

    if (type === 'photo') {
      if (stage === 'analyze') {
        adjustedProgress = Math.min((elapsedSeconds / 30) * 70, 70);
      } else {
        adjustedProgress = 70 + Math.min((elapsedSeconds / 20) * 30, 29);
      }
    }

    if (type === 'jointpic') {
      if (stage === 'analyze') {
        adjustedProgress = Math.min((elapsedSeconds / 45) * 70, 70);
      } else {
        adjustedProgress = 70 + Math.min((elapsedSeconds / 20) * 30, 29);
      }
    }

    if (type === 'video') {
      if (stage === 'analyze') {
        adjustedProgress = Math.min((elapsedSeconds / 20) * 30, 30);
      } else {
        adjustedProgress = 30 + Math.min((elapsedSeconds / 60) * 69, 69);
      }
    }

    return Math.min(adjustedProgress, 99);
  }, [elapsedSeconds, type, stage]);

  // Generate activity log with replaced usernames
  const activityLog = useMemo(() => {
    return ACTIVITY_LOG_ENTRIES.map((entry, idx) => ({
      ...entry,
      query: entry.query
        .replace('{user1}', username || 'user1')
        .replace('{user2}', username2 || 'user2'),
      status: idx < activityIndex ? 'done' : idx === activityIndex ? 'searching' : 'pending',
    }));
  }, [username, username2, activityIndex]);

  // Elapsed time counter
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Gradient animation
  useEffect(() => {
    const timer = setInterval(() => {
      setGradientAngle(prev => (prev + 1) % 360);
    }, 50);
    return () => clearInterval(timer);
  }, []);

  // Activity log progression
  useEffect(() => {
    if (type === 'jointpic' && stage === 'analyze') {
      const timer = setInterval(() => {
        setActivityIndex(prev => Math.min(prev + 1, ACTIVITY_LOG_ENTRIES.length - 1));
      }, 3500);
      return () => clearInterval(timer);
    }
  }, [type, stage]);

  // Generate particles
  const generateParticle = useCallback(() => {
    const colors = ['#f59e0b', '#eab308', '#fbbf24', '#fcd34d', '#fef3c7'];
    return {
      id: Date.now() + Math.random(),
      x: 50 + (Math.random() - 0.5) * 30,
      y: 50 + (Math.random() - 0.5) * 30,
      size: 2 + Math.random() * 4,
      opacity: 0.3 + Math.random() * 0.7,
      color: colors[Math.floor(Math.random() * colors.length)],
    };
  }, []);

  // Particle spawning - more particles as progress increases
  useEffect(() => {
    const spawnRate = Math.max(100, 500 - progress * 4);
    const timer = setInterval(() => {
      setParticles(prev => {
        const newParticles = [...prev, generateParticle()];
        // Keep max 30 particles
        if (newParticles.length > 30) {
          return newParticles.slice(-30);
        }
        return newParticles;
      });
    }, spawnRate);
    return () => clearInterval(timer);
  }, [progress, generateParticle]);

  // Particle cleanup
  useEffect(() => {
    const timer = setInterval(() => {
      setParticles(prev => prev.slice(1));
    }, 200);
    return () => clearInterval(timer);
  }, []);

  // Reset message index when stage changes (but NOT elapsed time - timer should be continuous)
  useEffect(() => {
    if ((type === 'photo' || type === 'jointpic') && stage === 'image') {
      // Reset activity index for joint pic, but keep elapsed seconds running
      setActivityIndex(0);
    }
    setMessageIndex(0);
  }, [stage, type]);

  // Cycle through messages
  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % messages.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [messages.length]);

  const currentMessage = messages[messageIndex] || messages[0];
  const IconComponent = currentMessage.icon;
  const stepInfo = (type === 'photo' || type === 'jointpic' || type === 'video') ? (stage === 'analyze' ? 'Step 1 of 2' : 'Step 2 of 2') : null;
  const isJointPic = type === 'jointpic';
  const progressDots = 12;
  const filledDots = Math.floor((progress / 100) * progressDots);

  const getTitle = () => {
    if (type === 'photo') {
      return stage === 'analyze' ? 'Analyzing Profile' : 'Generating Artwork';
    }
    if (type === 'jointpic') {
      return stage === 'analyze' ? 'Analyzing Both Profiles' : 'Generating Joint Picture';
    }
    if (type === 'video') {
      return stage === 'analyze' ? 'Analyzing Profile' : 'Generating Video';
    }
    if (type === 'roast') return 'Crafting Your Roast';
    if (type === 'fbi') return 'Building Profile';
    if (type === 'caricature') return 'Drawing Your Caricature';
    return 'Compiling Dossier';
  };

  // Get initials from username
  const getInitials = (name: string) => {
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
      style={{
        background: `linear-gradient(${gradientAngle}deg, 
          rgba(0,0,0,0.97) 0%, 
          rgba(20,10,30,0.98) 25%, 
          rgba(10,20,40,0.98) 50%, 
          rgba(30,15,20,0.98) 75%, 
          rgba(0,0,0,0.97) 100%)`,
      }}
    >
      {/* Animated background grid */}
      <div className="absolute inset-0 opacity-[0.03]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
            animation: 'grid-move 20s linear infinite',
          }}
        />
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 pointer-events-none">
        {particles.map(particle => (
          <div
            key={particle.id}
            className="absolute rounded-full animate-float-up"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              width: particle.size,
              height: particle.size,
              backgroundColor: particle.color,
              opacity: particle.opacity,
              boxShadow: `0 0 ${particle.size * 2}px ${particle.color}`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 text-center max-w-xl px-6">
        {/* Dual Orbs for Joint Pic */}
        {isJointPic && username && username2 ? (
          <div className="relative flex items-center justify-center gap-16 h-56 mb-6">
            {/* Connection beam - positioned absolutely between orbs */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-44 flex items-center justify-center pointer-events-none">
              {/* Base track */}
              <div
                className="absolute w-full h-1.5 rounded-full"
                style={{
                  background: 'linear-gradient(90deg, transparent 0%, rgba(245,158,11,0.15) 20%, rgba(245,158,11,0.2) 50%, rgba(245,158,11,0.15) 80%, transparent 100%)',
                }}
              />
              {/* Energy core */}
              <div
                className="absolute w-full h-2 rounded-full"
                style={{
                  background: `linear-gradient(90deg,
                    transparent 0%,
                    rgba(251,191,36,${0.4 + progress * 0.006}) 15%,
                    rgba(245,158,11,${0.7 + progress * 0.003}) 50%,
                    rgba(251,191,36,${0.4 + progress * 0.006}) 85%,
                    transparent 100%)`,
                  boxShadow: `0 0 ${15 + progress * 0.25}px rgba(245,158,11,0.6)`,
                  animation: 'pulse-fast 1.5s ease-in-out infinite',
                }}
              />
              {/* Bidirectional particles - left to right */}
              {[...Array(4)].map((_, i) => (
                <div
                  key={`ltr-${i}`}
                  className="absolute w-2.5 h-2.5 rounded-full"
                  style={{
                    background: 'radial-gradient(circle, #fef3c7 0%, #fbbf24 60%, transparent 100%)',
                    boxShadow: '0 0 10px #fbbf24',
                    animation: `energy-ltr 2.5s ease-in-out infinite`,
                    animationDelay: `${i * 0.6}s`,
                  }}
                />
              ))}
              {/* Bidirectional particles - right to left */}
              {[...Array(4)].map((_, i) => (
                <div
                  key={`rtl-${i}`}
                  className="absolute w-2 h-2 rounded-full"
                  style={{
                    background: 'radial-gradient(circle, #fef3c7 0%, #eab308 60%, transparent 100%)',
                    boxShadow: '0 0 8px #eab308',
                    animation: `energy-rtl 2.5s ease-in-out infinite`,
                    animationDelay: `${i * 0.6 + 0.3}s`,
                  }}
                />
              ))}
              {/* Center merge point */}
              <div className="absolute w-4 h-4">
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: 'radial-gradient(circle, rgba(251,191,36,0.8) 0%, transparent 70%)',
                    animation: 'ping-slow 2s ease-out infinite',
                  }}
                />
                <div
                  className="absolute inset-0.5 rounded-full"
                  style={{
                    background: 'radial-gradient(circle, #fef3c7 0%, #fbbf24 100%)',
                    boxShadow: '0 0 12px rgba(251,191,36,0.8)',
                  }}
                />
              </div>
            </div>

            {/* Left Orb */}
            <div className="relative" style={{ animation: 'orb-breathe 4s ease-in-out infinite' }}>
              {/* Outer pulsing aura */}
              <div
                className="absolute -inset-6 rounded-full"
                style={{
                  background: 'radial-gradient(circle, rgba(245,158,11,0.25) 0%, rgba(245,158,11,0.1) 40%, transparent 70%)',
                  filter: 'blur(8px)',
                  animation: 'pulse-slow 3s ease-in-out infinite',
                }}
              />
              {/* Orbital ring */}
              <div
                className="absolute -inset-2 rounded-full"
                style={{
                  background: 'conic-gradient(from 0deg, transparent 0%, rgba(245,158,11,0.5) 25%, transparent 50%, rgba(251,191,36,0.5) 75%, transparent 100%)',
                  mask: 'radial-gradient(transparent 65%, black 67%, black 73%, transparent 75%)',
                  WebkitMask: 'radial-gradient(transparent 65%, black 67%, black 73%, transparent 75%)',
                  animation: 'spin-slow 8s linear infinite',
                }}
              />
              {/* Glass border */}
              <div
                className="absolute -inset-0.5 rounded-full"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 100%)',
                }}
              />
              {/* Main orb */}
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center relative overflow-hidden"
                style={{
                  background: `
                    radial-gradient(circle at 30% 30%, rgba(255,255,255,0.2) 0%, transparent 50%),
                    radial-gradient(circle at 70% 70%, rgba(0,0,0,0.3) 0%, transparent 50%),
                    linear-gradient(135deg, #fbbf24 0%, #f59e0b 30%, #d97706 60%, #b45309 100%)
                  `,
                  boxShadow: `
                    0 0 40px rgba(245,158,11,0.5),
                    0 8px 24px rgba(0,0,0,0.3),
                    inset 0 2px 10px rgba(255,255,255,0.2),
                    inset 0 -5px 20px rgba(0,0,0,0.4)
                  `,
                }}
              >
                {/* Animated shine sweep */}
                <div
                  className="absolute inset-0 overflow-hidden rounded-full"
                  style={{ animation: 'shine-sweep 3s ease-in-out infinite' }}
                >
                  <div
                    className="absolute inset-0"
                    style={{
                      background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.25) 45%, rgba(255,255,255,0.1) 50%, transparent 55%)',
                    }}
                  />
                </div>
                <span className="text-white font-bold text-xl z-10 drop-shadow-lg">{getInitials(username)}</span>
              </div>
              {/* Username label */}
              <div className="absolute -bottom-9 left-1/2 -translate-x-1/2 whitespace-nowrap">
                <span className="text-amber-400 text-sm font-semibold tracking-wide">@{username}</span>
              </div>
            </div>

            {/* Right Orb */}
            <div className="relative" style={{ animation: 'orb-breathe 4s ease-in-out infinite', animationDelay: '0.5s' }}>
              {/* Outer pulsing aura */}
              <div
                className="absolute -inset-6 rounded-full"
                style={{
                  background: 'radial-gradient(circle, rgba(234,179,8,0.25) 0%, rgba(234,179,8,0.1) 40%, transparent 70%)',
                  filter: 'blur(8px)',
                  animation: 'pulse-slow 3s ease-in-out infinite',
                  animationDelay: '0.5s',
                }}
              />
              {/* Orbital ring */}
              <div
                className="absolute -inset-2 rounded-full"
                style={{
                  background: 'conic-gradient(from 180deg, transparent 0%, rgba(234,179,8,0.5) 25%, transparent 50%, rgba(251,191,36,0.5) 75%, transparent 100%)',
                  mask: 'radial-gradient(transparent 65%, black 67%, black 73%, transparent 75%)',
                  WebkitMask: 'radial-gradient(transparent 65%, black 67%, black 73%, transparent 75%)',
                  animation: 'spin-slow 8s linear infinite reverse',
                }}
              />
              {/* Glass border */}
              <div
                className="absolute -inset-0.5 rounded-full"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 100%)',
                }}
              />
              {/* Main orb */}
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center relative overflow-hidden"
                style={{
                  background: `
                    radial-gradient(circle at 30% 30%, rgba(255,255,255,0.2) 0%, transparent 50%),
                    radial-gradient(circle at 70% 70%, rgba(0,0,0,0.3) 0%, transparent 50%),
                    linear-gradient(135deg, #fcd34d 0%, #eab308 30%, #ca8a04 60%, #a16207 100%)
                  `,
                  boxShadow: `
                    0 0 40px rgba(234,179,8,0.5),
                    0 8px 24px rgba(0,0,0,0.3),
                    inset 0 2px 10px rgba(255,255,255,0.2),
                    inset 0 -5px 20px rgba(0,0,0,0.4)
                  `,
                }}
              >
                {/* Animated shine sweep */}
                <div
                  className="absolute inset-0 overflow-hidden rounded-full"
                  style={{ animation: 'shine-sweep 3s ease-in-out infinite', animationDelay: '1.5s' }}
                >
                  <div
                    className="absolute inset-0"
                    style={{
                      background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.25) 45%, rgba(255,255,255,0.1) 50%, transparent 55%)',
                    }}
                  />
                </div>
                <span className="text-white font-bold text-xl z-10 drop-shadow-lg">{getInitials(username2)}</span>
              </div>
              {/* Username label */}
              <div className="absolute -bottom-9 left-1/2 -translate-x-1/2 whitespace-nowrap">
                <span className="text-yellow-400 text-sm font-semibold tracking-wide">@{username2}</span>
              </div>
            </div>
          </div>
        ) : (
          /* Single orb for other types */
          <div className="relative w-28 h-28 mx-auto mb-8">
            {/* Outer glow */}
            <div
              className="absolute -inset-4 rounded-full animate-pulse"
              style={{
                background: 'radial-gradient(circle, rgba(244,63,94,0.3) 0%, transparent 70%)',
              }}
            />
            {/* Spinning rings */}
            <div className="absolute inset-0 rounded-full border-4 border-white/5" />
            <div
              className="absolute inset-0 rounded-full border-4 border-transparent"
              style={{
                borderTopColor: '#f43f5e',
                borderRightColor: '#f97316',
                animation: 'spin 2s linear infinite',
              }}
            />
            <div
              className="absolute inset-2 rounded-full border-2 border-transparent"
              style={{
                borderTopColor: '#fb923c',
                borderLeftColor: '#fbbf24',
                animation: 'spin 3s linear infinite reverse',
              }}
            />
            {/* Inner orb */}
            <div
              className="absolute inset-4 rounded-full flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #f43f5e 0%, #f97316 100%)',
                boxShadow: '0 0 40px rgba(244,63,94,0.5)',
              }}
            >
              <IconComponent className="w-8 h-8 text-white" />
            </div>
          </div>
        )}

        {/* Title */}
        <div className="space-y-2 mb-6">
          <h2 className="text-2xl font-bold text-white">{getTitle()}</h2>
          {stepInfo && (
            <p className="text-neutral-500 text-sm font-medium">{stepInfo}</p>
          )}
        </div>

        {/* Simplified Status Indicator for Joint Pic */}
        {isJointPic && stage === 'analyze' && (
          <div className="mb-4 flex items-center justify-center gap-2.5 text-sm text-neutral-400">
            <div className="relative">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <div className="absolute inset-0 w-2 h-2 rounded-full bg-green-500 animate-ping opacity-75" />
            </div>
            <span className="font-mono tracking-wide">{activityLog[activityIndex]?.query || 'Searching...'}</span>
          </div>
        )}

        {/* Animated message */}
        <div className="h-8 flex items-center justify-center mb-6">
          <p className="text-lg text-neutral-300" key={messageIndex}>
            <span className="inline-flex items-center gap-2">
              <IconComponent className="w-5 h-5 text-amber-500" />
              {currentMessage.text}
            </span>
          </p>
        </div>

        {/* Progress Indicator */}
        {isJointPic ? (
          /* Merging Arcs Progress for Joint Pic */
          <div className="space-y-3">
            <div className="relative w-52 h-2 mx-auto">
              {/* Background track */}
              <div className="absolute inset-0 rounded-full bg-neutral-800/50" />
              {/* Left arc growing from left */}
              <div
                className="absolute left-0 top-0 h-full rounded-l-full transition-all duration-500 ease-out"
                style={{
                  width: `${Math.min(progress, 50)}%`,
                  background: 'linear-gradient(90deg, #f59e0b, #fbbf24)',
                  boxShadow: progress > 0 ? '0 0 12px rgba(245,158,11,0.5)' : 'none',
                }}
              />
              {/* Right arc growing from right */}
              <div
                className="absolute right-0 top-0 h-full rounded-r-full transition-all duration-500 ease-out"
                style={{
                  width: `${Math.max(0, progress - 50)}%`,
                  background: 'linear-gradient(270deg, #eab308, #fbbf24)',
                  boxShadow: progress > 50 ? '0 0 12px rgba(234,179,8,0.5)' : 'none',
                }}
              />
              {/* Center merge indicator */}
              {progress >= 45 && (
                <div
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full transition-all duration-300"
                  style={{
                    background: 'radial-gradient(circle, #fef3c7 0%, #fbbf24 100%)',
                    boxShadow: '0 0 12px rgba(251,191,36,0.8)',
                    opacity: Math.min(1, (progress - 45) / 10),
                    transform: `translate(-50%, -50%) scale(${0.5 + Math.min(0.5, (progress - 45) / 20)})`,
                  }}
                />
              )}
            </div>
            <div className="flex justify-center text-xs text-neutral-500 font-medium">
              <span>{Math.round(progress)}% complete</span>
            </div>
          </div>
        ) : (
          /* Segmented progress dots for other types */
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2">
              {[...Array(progressDots)].map((_, i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full transition-all duration-500 ${i < filledDots
                    ? 'scale-100'
                    : i === filledDots
                      ? 'scale-110 animate-pulse'
                      : 'scale-75 opacity-30'
                    }`}
                  style={{
                    background: i < filledDots
                      ? `linear-gradient(135deg, #f59e0b, #eab308)`
                      : i === filledDots
                        ? '#fbbf24'
                        : '#374151',
                    boxShadow: i <= filledDots ? '0 0 8px rgba(245,158,11,0.5)' : 'none',
                  }}
                />
              ))}
            </div>
            <div className="flex justify-between text-xs text-neutral-500 max-w-xs mx-auto">
              <span>{Math.round(progress)}%</span>
              <span>{elapsedSeconds}s elapsed</span>
            </div>
          </div>
        )}
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes orb-breathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.03); }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
        }
        @keyframes pulse-fast {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }
        @keyframes shine-sweep {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        @keyframes energy-ltr {
          0% { transform: translateX(-80px); opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { transform: translateX(80px); opacity: 0; }
        }
        @keyframes energy-rtl {
          0% { transform: translateX(80px); opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { transform: translateX(-80px); opacity: 0; }
        }
        @keyframes ping-slow {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        @keyframes float-up {
          0% { transform: translateY(0) scale(1); opacity: var(--opacity); }
          100% { transform: translateY(-50px) scale(0.5); opacity: 0; }
        }
        @keyframes grid-move {
          0% { transform: translate(0, 0); }
          100% { transform: translate(50px, 50px); }
        }
        @keyframes spin {
          100% { transform: rotate(360deg); }
        }
        .animate-float-up {
          animation: float-up 2s ease-out forwards;
        }
      `}</style>
    </div>
  );
}


import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  X,
  Sparkles,
} from 'lucide-react';
import { AILoaderOrb, type OrbStateMode } from '../ui/ai-loader';
import { useTheme } from '../../context/ThemeContext';

export type VoiceState = 'idle' | 'listening' | 'thinking' | 'speaking';

interface InChatVoiceStageProps {
  voiceState: VoiceState;
  isMuted: boolean;
  onToggleMute: () => void;
  transcript: string;
  assistantResponse: string;
  onStartListening: () => void;
  onStopListening: () => void;
  onClose: () => void;
  userName?: string;
}

export const InChatVoiceStage: React.FC<InChatVoiceStageProps> = ({
  voiceState,
  isMuted,
  onToggleMute,
  transcript,
  assistantResponse,
  onStartListening,
  onStopListening,
  onClose,
  userName = 'You',
}) => {
  const { theme } = useTheme();
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const animationFrameRef = useRef<number | null>(null);

  // Audio waveform calculation for smooth ripple waves
  useEffect(() => {
    let base = 0;
    const updateWaves = () => {
      base += 0.08;
      if (voiceState === 'listening') {
        setAudioLevel(0.45 + 0.45 * Math.sin(base * 3) * Math.cos(base * 2));
      } else if (voiceState === 'speaking') {
        setAudioLevel(0.5 + 0.4 * Math.sin(base * 2.5));
      } else if (voiceState === 'thinking') {
        setAudioLevel(0.25 + 0.15 * Math.sin(base * 1.5));
      } else {
        setAudioLevel(0.08);
      }
      animationFrameRef.current = requestAnimationFrame(updateWaves);
    };

    animationFrameRef.current = requestAnimationFrame(updateWaves);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [voiceState]);

  // Escape key to exit voice mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const stateLabel =
    voiceState === 'listening'
      ? 'Listening...'
      : voiceState === 'thinking'
      ? 'Thinking...'
      : voiceState === 'speaking'
      ? 'Speaking...'
      : 'Ready...';

  const loaderState: OrbStateMode =
    voiceState === 'listening'
      ? 'listening'
      : voiceState === 'thinking'
      ? 'thinking'
      : voiceState === 'speaking'
      ? 'speaking'
      : 'idle';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: 'easeInOut' }}
      className="fixed inset-0 z-[300] h-[100dvh] w-screen overflow-hidden select-none flex flex-col justify-between items-center p-6 sm:p-10"
      style={{
        background:
          theme === 'dark'
            ? `
              radial-gradient(circle at 50% 35%, rgba(56, 189, 248, 0.22) 0%, rgba(90, 37, 235, 0.18) 35%, transparent 65%),
              radial-gradient(circle at 80% 80%, rgba(139, 92, 246, 0.12), transparent 50%),
              #070712
            `
            : `
              radial-gradient(circle at 50% 35%, rgba(180, 210, 255, 0.55) 0%, rgba(220, 205, 255, 0.35) 35%, transparent 65%),
              radial-gradient(circle at 80% 80%, rgba(210, 225, 255, 0.25), transparent 50%),
              #f8f9ff
            `,
      }}
    >
      {/* Top Bar with Minimal Close Exit Button */}
      <div className="w-full flex items-center justify-between z-20 max-w-5xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-[#5a25eb]/15 dark:bg-white/10 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-[#5a25eb] dark:text-[#cbbeff]" />
          </div>
          <span className="text-xs font-bold text-zinc-900 dark:text-white tracking-wide">
            SYNDEO Voice Mode
          </span>
          <span className="text-[9px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
            LIVE
          </span>
        </div>

        <button
          onClick={onClose}
          aria-label="Close voice mode"
          className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-zinc-700 dark:text-zinc-200 hover:text-zinc-950 dark:hover:text-white flex items-center justify-center border border-black/10 dark:border-white/15 backdrop-blur-md transition-all cursor-pointer shadow-xs"
          title="Exit Voice Mode (Esc)"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* =========================================================================
          CENTERED IMMERSIVE VOICE EXPERIENCE (Orb + State + Speech)
         ========================================================================= */}
      <div className="flex-1 w-full max-w-2xl flex flex-col items-center justify-center text-center space-y-6 my-auto z-10 overflow-visible">
        
        {/* Large AI Voice Orb with Expansive Non-clipped Atmosphere */}
        <div className="relative flex items-center justify-center my-4 select-none overflow-visible isolate">
          {/* Layer 1: Expansive Sonic Expansion Wave */}
          <motion.div
            animate={{
              scale:
                voiceState === 'listening' || voiceState === 'speaking'
                  ? [1, 1.45 + audioLevel * 0.45, 1]
                  : [1, 1.12, 1],
              opacity:
                voiceState === 'listening' || voiceState === 'speaking'
                  ? [0.35, 0.75, 0.35]
                  : [0.15, 0.3, 0.15],
            }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute w-60 h-60 sm:w-80 sm:h-80 rounded-full border-2 border-[#5a25eb]/30 dark:border-[#38bdf8]/30 pointer-events-none z-0"
          />

          {/* Layer 2: Secondary Soft Pulsing Aura */}
          <motion.div
            animate={{
              scale:
                voiceState === 'listening' || voiceState === 'speaking'
                  ? [1, 1.8 + audioLevel * 0.5, 1]
                  : [1, 1.25, 1],
              opacity:
                voiceState === 'listening' || voiceState === 'speaking'
                  ? [0.2, 0.5, 0.2]
                  : [0.08, 0.2, 0.08],
            }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
            className="absolute w-60 h-60 sm:w-80 sm:h-80 rounded-full border border-[#8b5cf6]/30 dark:border-[#cbbeff]/20 pointer-events-none z-0"
          />

          {/* Layer 3: Giant Ambient Glow (520px) */}
          <div
            className="absolute w-[360px] h-[360px] sm:w-[520px] sm:h-[520px] -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2 rounded-full blur-[36px] pointer-events-none z-0"
            style={{
              background:
                theme === 'dark'
                  ? 'radial-gradient(circle, rgba(56, 189, 248, 0.40) 0%, rgba(90, 37, 235, 0.26) 35%, rgba(139, 92, 246, 0.12) 55%, transparent 72%)'
                  : 'radial-gradient(circle, rgba(70, 130, 255, 0.36) 0%, rgba(80, 100, 255, 0.22) 35%, rgba(120, 90, 255, 0.10) 55%, transparent 72%)',
            }}
          />

          {/* Interactive Hero Voice Orb */}
          <motion.div
            animate={{ scale: [1, 1.03, 1] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
            onClick={voiceState === 'listening' ? onStopListening : onStartListening}
            className="relative z-10 cursor-pointer transition-transform hover:scale-105 active:scale-95"
            title={voiceState === 'listening' ? 'Click to Pause' : 'Click to Speak'}
          >
            <AILoaderOrb
              state={loaderState}
              text={stateLabel}
              size={230}
              variant="hero"
            />
          </motion.div>
        </div>

        {/* State Label Pill */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/60 dark:bg-white/10 border border-zinc-200/60 dark:border-white/10 shadow-xs backdrop-blur-md">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              voiceState === 'listening'
                ? 'bg-cyan-500 animate-ping'
                : voiceState === 'speaking'
                ? 'bg-purple-500 animate-pulse'
                : voiceState === 'thinking'
                ? 'bg-indigo-500 animate-spin'
                : 'bg-zinc-400'
            }`}
          />
          <span className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white">
            {stateLabel}
          </span>
        </div>

        {/* User Spoken Transcript */}
        <AnimatePresence mode="wait">
          {transcript && (
            <motion.div
              key={transcript}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="max-w-xl mx-auto px-4"
            >
              <span className="text-[11px] font-mono font-bold uppercase text-cyan-600 dark:text-cyan-400 tracking-wider">
                {userName} said:
              </span>
              <p className="text-base sm:text-lg font-medium text-zinc-900 dark:text-white mt-1 leading-relaxed">
                "{transcript}"
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* AI Spoken Response (Clean Centered Typography, Max-W 680px) */}
        <AnimatePresence mode="wait">
          {assistantResponse && (
            <motion.div
              key={assistantResponse}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="max-w-2xl mx-auto px-4 pt-1"
            >
              <p className="text-sm sm:text-base text-zinc-700 dark:text-zinc-200 leading-relaxed font-normal">
                {assistantResponse}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Minimal Controls (Mic Toggle & Global Mute) */}
      <div className="w-full flex items-center justify-center gap-4 z-20 pb-2">
        <button
          onClick={onToggleMute}
          aria-label={isMuted ? 'Unmute voice' : 'Mute voice'}
          className={`p-3.5 rounded-full transition-all cursor-pointer border backdrop-blur-md ${
            isMuted
              ? 'bg-red-500/15 text-red-500 border-red-500/30'
              : 'bg-white/60 dark:bg-white/10 text-zinc-700 dark:text-zinc-200 hover:text-zinc-950 dark:hover:text-white border-zinc-200/80 dark:border-white/15'
          }`}
          title={isMuted ? 'Unmute AI Voice' : 'Mute AI Voice'}
        >
          {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>

        <button
          onClick={voiceState === 'listening' ? onStopListening : onStartListening}
          aria-label={voiceState === 'listening' ? 'Pause listening' : 'Start listening'}
          className={`p-5 rounded-full transition-all cursor-pointer shadow-xl flex items-center justify-center ${
            voiceState === 'listening'
              ? 'bg-red-500 text-white ring-4 ring-red-500/25 scale-105'
              : 'bg-[#111111] dark:bg-white text-white dark:text-[#111111] hover:scale-105 ring-4 ring-black/10 dark:ring-white/10'
          }`}
          title={voiceState === 'listening' ? 'Pause Listening' : 'Start Listening'}
        >
          {voiceState === 'listening' ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </button>
      </div>
    </motion.div>
  );
};

export default InChatVoiceStage;

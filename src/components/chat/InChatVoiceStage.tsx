import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  X,
  Sparkles,
  ArrowUp,
  MessageSquare,
} from 'lucide-react';
import { AILoaderOrb, type OrbStateMode } from '../ui/ai-loader';

export type VoiceState = 'idle' | 'listening' | 'thinking' | 'speaking';

interface InChatVoiceStageProps {
  voiceState: VoiceState;
  isMuted: boolean;
  onToggleMute: () => void;
  transcript: string;
  assistantResponse: string;
  onSendMessage: (text: string) => void;
  onStartListening: () => void;
  onStopListening: () => void;
  onClose: () => void;
  userName: string;
}

export const InChatVoiceStage: React.FC<InChatVoiceStageProps> = ({
  voiceState,
  isMuted,
  onToggleMute,
  transcript,
  assistantResponse,
  onSendMessage,
  onStartListening,
  onStopListening,
  onClose,
  userName,
}) => {
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [showSubtitles, setShowSubtitles] = useState<boolean>(true);
  const animationFrameRef = useRef<number | null>(null);

  // Audio waveform calculation for sonic ripple waves
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
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="relative w-full my-auto py-6 sm:py-8 px-4 flex flex-col items-center justify-center text-center space-y-5 select-none"
    >
      {/* Top Inline Voice Header */}
      <div className="flex items-center justify-between w-full max-w-lg px-2 pb-1 border-b border-zinc-200/50 dark:border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-[#5a25eb]/15 dark:bg-white/10 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-[#5a25eb] dark:text-[#cbbeff]" />
          </div>
          <span className="text-xs font-bold text-zinc-900 dark:text-white tracking-wide">
            Voice Mode
          </span>
          <span className="text-[9px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
            LIVE
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSubtitles(!showSubtitles)}
            className={`p-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              showSubtitles
                ? 'bg-[#5a25eb]/15 text-[#5a25eb] dark:text-[#cbbeff]'
                : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-white'
            }`}
            title="Toggle Subtitles"
          >
            <MessageSquare className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
            title="Exit Voice Mode"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* =========================================================================
          CLASSIC GLOWING AI LOADER ORB (With Sonic Ripple Expansion Waves)
         ========================================================================= */}
      <div className="relative flex items-center justify-center my-4 select-none">
        {/* Pulsating Sonic Expansion Wave 1 */}
        <motion.div
          animate={{
            scale:
              voiceState === 'listening' || voiceState === 'speaking'
                ? [1, 1.45 + audioLevel * 0.45, 1]
                : [1, 1.15, 1],
            opacity:
              voiceState === 'listening' || voiceState === 'speaking'
                ? [0.35, 0.75, 0.35]
                : [0.15, 0.3, 0.15],
          }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute w-48 h-48 sm:w-60 sm:h-60 rounded-full border-2 border-[#5a25eb]/30 dark:border-[#38bdf8]/30 pointer-events-none"
        />

        {/* Pulsating Sonic Expansion Wave 2 */}
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
          className="absolute w-48 h-48 sm:w-60 sm:h-60 rounded-full border border-[#8b5cf6]/30 dark:border-[#cbbeff]/20 pointer-events-none"
        />

        {/* Soft Ambient Glow Aura */}
        <div className="absolute w-64 h-64 sm:w-80 sm:h-80 rounded-full bg-gradient-to-tr from-[#5a25eb]/30 via-[#38bdf8]/25 to-[#a855f7]/25 blur-3xl pointer-events-none" />

        {/* Interactive Glowing Orb Container */}
        <motion.div
          animate={{ scale: [1, 1.025, 1] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
          onClick={voiceState === 'listening' ? onStopListening : onStartListening}
          className="relative cursor-pointer transition-transform hover:scale-105 active:scale-95"
          title={voiceState === 'listening' ? 'Click to Pause' : 'Click to Speak'}
        >
          <AILoaderOrb
            state={loaderState}
            text={stateLabel}
            size={180}
            variant="hero"
          />
        </motion.div>
      </div>

      {/* Dynamic Sound Wave Frequency Bars */}
      <div className="flex items-center justify-center gap-1.5 h-6 my-1">
        {[...Array(14)].map((_, i) => {
          const heightFactor =
            Math.sin((i / 13) * Math.PI) *
            (voiceState === 'listening' || voiceState === 'speaking' ? Math.max(0.25, audioLevel) : 0.15);
          return (
            <motion.div
              key={i}
              animate={{
                height: `${Math.max(4, heightFactor * 22)}px`,
                backgroundColor:
                  voiceState === 'listening'
                    ? '#38bdf8'
                    : voiceState === 'speaking'
                    ? '#a855f7'
                    : '#71717a',
              }}
              transition={{ duration: 0.1 }}
              className="w-1 rounded-full transition-all"
            />
          );
        })}
      </div>

      {/* Status Label */}
      <div className="space-y-1">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/70 dark:bg-white/10 border border-zinc-200/70 dark:border-white/10 shadow-xs">
          <span
            className={`w-2 h-2 rounded-full ${
              voiceState === 'listening'
                ? 'bg-cyan-500 animate-ping'
                : voiceState === 'speaking'
                ? 'bg-purple-500 animate-pulse'
                : voiceState === 'thinking'
                ? 'bg-indigo-500 animate-spin'
                : 'bg-zinc-400'
            }`}
          />
          <span className="text-xs font-bold text-zinc-900 dark:text-white">
            {stateLabel}
          </span>
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
          {voiceState === 'listening'
            ? 'Speak clearly into your microphone'
            : voiceState === 'speaking'
            ? 'Assistant is replying aloud'
            : `Tap glowing orb or microphone to speak, ${userName}`}
        </p>
      </div>

      {/* Live In-Chat Transcription & Spoken Response Preview */}
      <AnimatePresence>
        {showSubtitles && (transcript || assistantResponse) && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="w-full max-w-md p-3.5 rounded-2xl bg-white/80 dark:bg-[#10101c]/80 border border-zinc-200/80 dark:border-white/10 text-left text-xs space-y-2 backdrop-blur-xl shadow-xs"
          >
            {transcript && (
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="font-bold text-cyan-600 dark:text-cyan-400 font-mono text-[10px] uppercase">
                    You:
                  </span>
                  <p className="text-zinc-800 dark:text-zinc-200 mt-0.5">{transcript}</p>
                </div>
                {voiceState !== 'thinking' && (
                  <button
                    onClick={() => onSendMessage(transcript)}
                    className="px-2.5 py-1 rounded-full bg-[#111111] dark:bg-white text-white dark:text-[#111111] text-[10px] font-bold flex items-center gap-1 shadow-xs cursor-pointer shrink-0"
                    title="Send Voice Message"
                  >
                    <ArrowUp className="w-2.5 h-2.5 stroke-[3]" />
                    <span>Send</span>
                  </button>
                )}
              </div>
            )}
            {assistantResponse && (
              <div className="pt-2 border-t border-zinc-200/60 dark:border-white/10">
                <span className="font-bold text-[#5a25eb] dark:text-[#cbbeff] font-mono text-[10px] uppercase">
                  SYNDEO:
                </span>
                <p className="text-zinc-800 dark:text-zinc-200 mt-0.5">{assistantResponse}</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Inline Controls Bar */}
      <div className="flex items-center justify-center gap-3 pt-2">
        <button
          onClick={onToggleMute}
          className={`p-3 rounded-full transition-all cursor-pointer border ${
            isMuted
              ? 'bg-red-500/15 text-red-500 border-red-500/30'
              : 'bg-white/80 dark:bg-white/10 text-zinc-700 dark:text-zinc-200 hover:text-zinc-950 dark:hover:text-white border-zinc-200/80 dark:border-white/15'
          }`}
          title={isMuted ? 'Unmute AI Voice' : 'Mute AI Voice'}
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>

        <button
          onClick={voiceState === 'listening' ? onStopListening : onStartListening}
          className={`p-4 rounded-full transition-all cursor-pointer shadow-lg flex items-center justify-center ${
            voiceState === 'listening'
              ? 'bg-red-500 text-white ring-4 ring-red-500/25 scale-105'
              : 'bg-[#111111] dark:bg-white text-white dark:text-[#111111] hover:scale-105 ring-4 ring-black/10 dark:ring-white/10'
          }`}
          title={voiceState === 'listening' ? 'Pause Listening' : 'Start Listening'}
        >
          {voiceState === 'listening' ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        <button
          onClick={onClose}
          className="p-3 rounded-full bg-white/80 dark:bg-white/10 text-zinc-600 dark:text-zinc-300 hover:text-red-500 border border-zinc-200/80 dark:border-white/15 transition-all cursor-pointer"
          title="Exit Voice Mode"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
};

export default InChatVoiceStage;

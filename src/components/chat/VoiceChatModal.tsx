import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  X,
  Sparkles,
  MessageSquare,
  ShieldCheck,
  ArrowUp,
} from 'lucide-react';
import { ThinkingOrb, type OrbState } from '../ui/thinking-orbs';

export type VoiceState = 'idle' | 'listening' | 'thinking' | 'speaking';

interface VoiceChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  voiceState: VoiceState;
  isMuted: boolean;
  onToggleMute: () => void;
  transcript: string;
  assistantResponse: string;
  onSendMessage: (text: string) => void;
  onStartListening: () => void;
  onStopListening: () => void;
  userName: string;
}

export const VoiceChatModal: React.FC<VoiceChatModalProps> = ({
  isOpen,
  onClose,
  voiceState,
  isMuted,
  onToggleMute,
  transcript,
  assistantResponse,
  onSendMessage,
  onStartListening,
  onStopListening,
  userName,
}) => {
  const [showTranscript, setShowTranscript] = useState(false);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const animationFrameRef = useRef<number | null>(null);

  // Simulated live reactive audio waveform bars when listening or speaking
  useEffect(() => {
    if (!isOpen) return;

    let base = 0;
    const updateAudioWaves = () => {
      base += 0.08;
      if (voiceState === 'listening') {
        // High reactive fluctuation
        setAudioLevel(0.4 + 0.5 * Math.sin(base * 3) * Math.cos(base * 2));
      } else if (voiceState === 'speaking') {
        // Smooth undulating rhythm
        setAudioLevel(0.5 + 0.4 * Math.sin(base * 2.5));
      } else if (voiceState === 'thinking') {
        // Gentle breathing pulse
        setAudioLevel(0.2 + 0.15 * Math.sin(base * 1.5));
      } else {
        setAudioLevel(0.05);
      }
      animationFrameRef.current = requestAnimationFrame(updateAudioWaves);
    };

    animationFrameRef.current = requestAnimationFrame(updateAudioWaves);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isOpen, voiceState]);

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Determine current orb state description
  const stateLabel =
    voiceState === 'listening'
      ? 'Listening to you...'
      : voiceState === 'thinking'
      ? 'Consulting Sovereign Vault...'
      : voiceState === 'speaking'
      ? 'SYNDEO is speaking...'
      : 'Tap microphone to speak';

  const stateSubLabel =
    voiceState === 'listening'
      ? transcript || 'Speak naturally — zero-knowledge encrypted'
      : voiceState === 'speaking'
      ? assistantResponse || 'Streaming audio synthesis'
      : voiceState === 'thinking'
      ? 'Synthesizing evidence-backed records'
      : `Ready for voice session, ${userName}`;

  // Map state to ThinkingOrb state
  const thinkingOrbState: OrbState =
    voiceState === 'listening'
      ? 'listening'
      : voiceState === 'thinking'
      ? 'solving'
      : voiceState === 'speaking'
      ? 'composing'
      : 'working';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-hidden bg-black/75 dark:bg-black/90 backdrop-blur-2xl"
        >
          {/* === AMBIENT PULSING AURA === */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                voiceState === 'speaking'
                  ? 'radial-gradient(circle at 50% 50%, rgba(90, 37, 235, 0.35) 0%, rgba(56, 189, 248, 0.15) 45%, transparent 75%)'
                  : voiceState === 'listening'
                  ? 'radial-gradient(circle at 50% 50%, rgba(56, 189, 248, 0.3) 0%, rgba(90, 37, 235, 0.2) 50%, transparent 75%)'
                  : 'radial-gradient(circle at 50% 50%, rgba(90, 37, 235, 0.2) 0%, transparent 70%)',
              transition: 'background 0.8s ease-in-out',
            }}
          />

          {/* Glowing Animated Outer Pulse Rings */}
          <motion.div
            animate={{
              scale: voiceState === 'listening' || voiceState === 'speaking' ? [1, 1.25, 1] : [1, 1.08, 1],
              opacity: voiceState === 'listening' || voiceState === 'speaking' ? [0.3, 0.6, 0.3] : [0.15, 0.3, 0.15],
            }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute w-[420px] h-[420px] sm:w-[600px] sm:h-[600px] rounded-full bg-gradient-to-tr from-[#5a25eb]/25 to-[#38bdf8]/25 blur-3xl pointer-events-none"
          />

          {/* === VOICE MODAL CONTAINER === */}
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-2xl h-[88vh] max-h-[720px] rounded-[2.5rem] bg-gradient-to-b from-white/10 via-zinc-900/60 to-black/80 dark:from-white/5 dark:via-zinc-950/80 dark:to-black/90 border border-white/20 dark:border-white/10 shadow-[0_20px_70px_rgba(0,0,0,0.7),inset_0_1px_0_0_rgba(255,255,255,0.2)] backdrop-blur-3xl flex flex-col justify-between overflow-hidden"
          >
            {/* Top Bar / Header */}
            <div className="p-6 pb-2 flex items-center justify-between z-20">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-white/15 dark:bg-white/10 border border-white/20 flex items-center justify-center shadow-sm">
                  <Sparkles className="w-4 h-4 text-[#cbbeff]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-1.5">
                    SYNDEO Voice Mode
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-mono font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      LIVE
                    </span>
                  </h3>
                  <p className="text-[11px] text-zinc-400 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    Zero-Knowledge Encrypted Stream
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Transcript Toggle */}
                <button
                  onClick={() => setShowTranscript(!showTranscript)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
                    showTranscript
                      ? 'bg-white/20 text-white border-white/30 shadow-sm'
                      : 'bg-black/30 text-zinc-400 hover:text-white border-white/10 hover:bg-white/10'
                  }`}
                  title="Toggle Live Subtitles"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Subtitles</span>
                </button>

                {/* Close / Exit Button */}
                <button
                  onClick={onClose}
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white flex items-center justify-center transition-all cursor-pointer border border-white/15"
                  title="Exit Voice Mode (Esc)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* === CENTER ORB SHOWCASE === */}
            <div className="relative flex-1 flex flex-col items-center justify-center px-6 z-10 my-auto">
              {/* Dynamic Sound Wave Ripple Rings */}
              <div className="relative flex items-center justify-center">
                <motion.div
                  animate={{
                    scale: voiceState === 'listening' || voiceState === 'speaking' ? [1, 1.4 + audioLevel * 0.4, 1] : [1, 1.1, 1],
                    opacity: voiceState === 'listening' || voiceState === 'speaking' ? [0.4, 0.8, 0.4] : [0.2, 0.4, 0.2],
                  }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute w-56 h-56 sm:w-72 sm:h-72 rounded-full border border-[#5a25eb]/40 dark:border-[#cbbeff]/30 pointer-events-none"
                />

                <motion.div
                  animate={{
                    scale: voiceState === 'listening' || voiceState === 'speaking' ? [1, 1.7 + audioLevel * 0.6, 1] : [1, 1.2, 1],
                    opacity: voiceState === 'listening' || voiceState === 'speaking' ? [0.2, 0.5, 0.2] : [0.1, 0.25, 0.1],
                  }}
                  transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
                  className="absolute w-56 h-56 sm:w-72 sm:h-72 rounded-full border border-[#38bdf8]/30 pointer-events-none"
                />

                {/* Central Reactive Hero Orb */}
                <div className="relative p-6 rounded-full bg-gradient-to-b from-white/15 to-transparent border border-white/20 shadow-2xl backdrop-blur-md">
                  <div className="w-40 h-40 sm:w-52 sm:h-52 flex items-center justify-center">
                    <ThinkingOrb
                      state={thinkingOrbState}
                      size={64}
                      theme="dark"
                      className="scale-[2.2] sm:scale-[2.8]"
                    />
                  </div>
                </div>
              </div>

              {/* Status Header */}
              <div className="mt-8 text-center space-y-2 max-w-lg">
                <motion.div
                  key={voiceState}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-md shadow-inner"
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      voiceState === 'listening'
                        ? 'bg-cyan-400 animate-ping'
                        : voiceState === 'speaking'
                        ? 'bg-emerald-400 animate-pulse'
                        : voiceState === 'thinking'
                        ? 'bg-[#cbbeff] animate-spin'
                        : 'bg-zinc-400'
                    }`}
                  />
                  <span className="text-xs sm:text-sm font-bold text-white tracking-wide">
                    {stateLabel}
                  </span>
                </motion.div>

                {/* Dynamic Waveform Graphic Bars */}
                <div className="flex items-center justify-center gap-1.5 h-6 my-2">
                  {[...Array(16)].map((_, i) => {
                    const heightFactor = Math.sin((i / 15) * Math.PI) * (voiceState === 'listening' || voiceState === 'speaking' ? Math.max(0.2, audioLevel) : 0.15);
                    return (
                      <motion.div
                        key={i}
                        animate={{
                          height: `${Math.max(4, heightFactor * 24)}px`,
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

                {/* Live Transcript / Subtitle Preview */}
                <p className="text-xs sm:text-sm text-zinc-300 font-medium px-4 line-clamp-3 min-h-[44px]">
                  "{stateSubLabel}"
                </p>
              </div>

              {/* Collapsible Full Subtitle Drawer */}
              <AnimatePresence>
                {showTranscript && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="w-full max-w-md mt-4 p-4 rounded-2xl bg-black/60 border border-white/10 text-left overflow-y-auto max-h-32 text-xs space-y-2 backdrop-blur-md"
                  >
                    {transcript && (
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-bold text-cyan-400 font-mono text-[10px] uppercase">You:</span>
                          <p className="text-zinc-200 mt-0.5">{transcript}</p>
                        </div>
                        {voiceState !== 'thinking' && (
                          <button
                            onClick={() => onSendMessage(transcript)}
                            className="px-2.5 py-1 rounded-full bg-[#5a25eb] hover:bg-[#6b37fa] text-white text-[10px] font-bold flex items-center gap-1 shadow-sm cursor-pointer shrink-0 mt-1"
                            title="Send Message"
                          >
                            <ArrowUp className="w-2.5 h-2.5" />
                            <span>Send</span>
                          </button>
                        )}
                      </div>
                    )}
                    {assistantResponse && (
                      <div className="pt-2 border-t border-white/10">
                        <span className="font-bold text-[#cbbeff] font-mono text-[10px] uppercase">SYNDEO:</span>
                        <p className="text-zinc-200 mt-0.5">{assistantResponse}</p>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* === BOTTOM ACTION BAR === */}
            <div className="p-6 pt-3 pb-6 flex items-center justify-center gap-4 sm:gap-6 z-20 border-t border-white/10 bg-black/40 backdrop-blur-xl">
              {/* Speaker Audio Mute Toggle */}
              <button
                onClick={onToggleMute}
                className={`p-4 rounded-full transition-all cursor-pointer border ${
                  isMuted
                    ? 'bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30'
                    : 'bg-white/10 text-zinc-200 hover:text-white border-white/15 hover:bg-white/20'
                }`}
                title={isMuted ? 'Unmute AI Voice' : 'Mute AI Voice'}
              >
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>

              {/* Main Center Microphone Control */}
              <button
                onClick={voiceState === 'listening' ? onStopListening : onStartListening}
                className={`p-6 rounded-full transition-all cursor-pointer shadow-2xl flex items-center justify-center group ${
                  voiceState === 'listening'
                    ? 'bg-red-500 text-white shadow-red-500/50 scale-110 ring-4 ring-red-500/30'
                    : 'bg-[#5a25eb] hover:bg-[#6b37fa] text-white shadow-[#5a25eb]/50 hover:scale-105 ring-4 ring-[#5a25eb]/20'
                }`}
                title={voiceState === 'listening' ? 'Pause Listening' : 'Start Listening'}
              >
                {voiceState === 'listening' ? (
                  <MicOff className="w-7 h-7 animate-pulse" />
                ) : (
                  <Mic className="w-7 h-7" />
                )}
              </button>

              {/* End Voice Session Button */}
              <button
                onClick={onClose}
                className="p-4 rounded-full bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-500/30 transition-all cursor-pointer shadow-lg"
                title="End Voice Call"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

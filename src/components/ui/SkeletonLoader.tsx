import React from 'react';
import { motion } from 'framer-motion';

/**
 * High-precision animated shimmer beam with customizable glass container styling.
 */
export const ShimmerEffect: React.FC<{
  className?: string;
  glow?: boolean;
}> = ({ className = '', glow = false }) => (
  <div
    className={`relative overflow-hidden bg-zinc-200/80 dark:bg-white/[0.07] ${className}`}
  >
    <motion.div
      initial={{ x: '-100%' }}
      animate={{ x: '220%' }}
      transition={{
        repeat: Infinity,
        duration: 1.8,
        ease: [0.4, 0, 0.2, 1],
      }}
      className={`absolute inset-0 ${
        glow
          ? 'bg-gradient-to-r from-transparent via-[#5a25eb]/25 dark:via-white/20 via-white/70 to-transparent'
          : 'bg-gradient-to-r from-transparent via-white/60 dark:via-white/12 to-transparent'
      }`}
    />
  </div>
);

/**
 * Universal glowing page-level loader with quantum rings & pulsing status
 */
export const SyndeoPageLoader: React.FC<{
  label?: string;
  sublabel?: string;
  fullscreen?: boolean;
}> = ({
  label = 'Loading Vault Data...',
  sublabel = 'Decrypting zero-knowledge records',
  fullscreen = false,
}) => {
  return (
    <div
      className={`w-full flex flex-col items-center justify-center p-8 select-none ${
        fullscreen ? 'min-h-[80vh]' : 'py-16'
      }`}
    >
      <div className="relative flex items-center justify-center mb-6">
        {/* Outer Pulsing Glow */}
        <motion.div
          animate={{ scale: [1, 1.35, 1], opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute w-36 h-36 rounded-full blur-2xl pointer-events-none bg-gradient-to-tr from-[#5a25eb]/30 via-[#38bdf8]/30 to-[#cbbeff]/20"
        />

        {/* Orbit Ring 1 */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
          className="w-20 h-20 rounded-full border-2 border-dashed border-[#5a25eb]/40 dark:border-[#cbbeff]/30 p-1 flex items-center justify-center"
        >
          {/* Orbit Ring 2 */}
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
            className="w-14 h-14 rounded-full border border-[#38bdf8]/50 p-1 flex items-center justify-center"
          >
            {/* Center Glowing Core */}
            <motion.div
              animate={{ scale: [0.85, 1.15, 0.85] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#5a25eb] to-[#38bdf8] shadow-[0_0_18px_rgba(90,37,235,0.6)]"
            />
          </motion.div>
        </motion.div>
      </div>

      <div className="text-center space-y-1.5 max-w-sm">
        <motion.p
          animate={{ opacity: [0.75, 1, 0.75] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="text-sm font-semibold text-zinc-900 dark:text-white tracking-tight"
        >
          {label}
        </motion.p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
          {sublabel}
        </p>
      </div>
    </div>
  );
};

export const MemoryPageSkeleton: React.FC = () => {
  return (
    <div className="w-full max-w-6xl xl:max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200/80 dark:border-white/10 pb-4">
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-2.5">
            <ShimmerEffect className="h-8 w-64 sm:w-80 rounded-xl" glow />
            <ShimmerEffect className="h-5 w-24 rounded-full" />
          </div>
          <ShimmerEffect className="h-4 w-full max-w-xl rounded-md" />
        </div>
        <div className="flex gap-2.5">
          <ShimmerEffect className="h-9 w-28 rounded-full" />
          <ShimmerEffect className="h-9 w-32 rounded-full" />
        </div>
      </div>

      {/* Stats Cards Skeleton (Full Width Grid) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-4 sm:p-5 rounded-2xl border border-zinc-200/80 dark:border-white/10 bg-white/60 dark:bg-[#0c0c18]/60 backdrop-blur-xl space-y-2.5 shadow-xs"
          >
            <div className="flex justify-between items-center">
              <ShimmerEffect className="h-4 w-24 rounded" />
              <ShimmerEffect className="h-4 w-4 rounded-full" />
            </div>
            <ShimmerEffect className="h-7 w-20 rounded-lg" glow />
          </div>
        ))}
      </div>

      {/* Main Graph/Visualizer Box Skeleton (Wide Viewport) */}
      <div className="w-full rounded-3xl border border-zinc-200/80 dark:border-white/10 bg-white/60 dark:bg-[#0c0c18]/60 backdrop-blur-xl p-6 sm:p-8 space-y-6 min-h-[420px] flex flex-col justify-between shadow-xs">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex gap-2">
            <ShimmerEffect className="h-9 w-36 rounded-full" />
            <ShimmerEffect className="h-9 w-36 rounded-full" />
          </div>
          <ShimmerEffect className="h-9 w-48 rounded-full" />
        </div>
        <div className="flex-1 flex items-center justify-center py-16">
          <div className="space-y-4 text-center flex flex-col items-center max-w-md w-full">
            <ShimmerEffect className="w-24 h-24 rounded-full" glow />
            <ShimmerEffect className="h-5 w-64 rounded-md" />
            <ShimmerEffect className="h-3.5 w-48 rounded-md" />
          </div>
        </div>
      </div>

      {/* Records List Rows Skeleton (Full Width Rows) */}
      <div className="space-y-3.5 w-full">
        <ShimmerEffect className="h-5 w-48 rounded-md mb-2" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="p-4 sm:p-5 rounded-2xl border border-zinc-200/80 dark:border-white/10 bg-white/60 dark:bg-[#0c0c18]/60 backdrop-blur-xl flex items-center justify-between gap-4 shadow-xs"
          >
            <div className="flex items-center gap-4 flex-1">
              <ShimmerEffect className="w-11 h-11 rounded-xl shrink-0" />
              <div className="space-y-2 flex-1">
                <ShimmerEffect className="h-4 w-60 sm:w-80 rounded" />
                <ShimmerEffect className="h-3 w-full max-w-md rounded" />
              </div>
            </div>
            <ShimmerEffect className="h-7 w-28 rounded-full shrink-0 hidden sm:block" />
          </div>
        ))}
      </div>
    </div>
  );
};

export const SharePageSkeleton: React.FC = () => {
  return (
    <div className="w-full max-w-6xl xl:max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6 animate-pulse">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-zinc-200/80 dark:border-white/10">
        <div className="space-y-2 flex-1">
          <ShimmerEffect className="h-8 w-64 sm:w-80 rounded-xl" glow />
          <ShimmerEffect className="h-4 w-full max-w-lg rounded-md" />
        </div>
        <ShimmerEffect className="h-10 w-44 rounded-full" />
      </div>

      {/* Grid of full width cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="p-5 sm:p-6 rounded-3xl border border-zinc-200/80 dark:border-white/10 bg-white/60 dark:bg-[#0c0c18]/60 backdrop-blur-xl space-y-4 shadow-xs flex flex-col justify-between min-h-[220px]"
          >
            <div className="flex justify-between items-start gap-2">
              <div className="space-y-2 flex-1">
                <ShimmerEffect className="h-5 w-44 rounded" />
                <ShimmerEffect className="h-3.5 w-32 rounded" />
              </div>
              <ShimmerEffect className="h-6 w-20 rounded-full" />
            </div>
            <div className="space-y-2.5 pt-2">
              <ShimmerEffect className="h-3.5 w-full rounded" />
              <ShimmerEffect className="h-3.5 w-4/5 rounded" />
            </div>
            <div className="flex justify-between items-center pt-3 border-t border-zinc-200/50 dark:border-white/5">
              <ShimmerEffect className="h-3.5 w-24 rounded" />
              <ShimmerEffect className="h-8 w-24 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const SettingsPageSkeleton: React.FC = () => {
  return (
    <div className="w-full max-w-5xl xl:max-w-6xl mx-auto px-3 sm:px-6 py-6 space-y-6 animate-pulse">
      <div className="space-y-2 pb-4 border-b border-zinc-200/80 dark:border-white/10">
        <ShimmerEffect className="h-8 w-56 sm:w-72 rounded-xl" glow />
        <ShimmerEffect className="h-4 w-full max-w-md rounded-md" />
      </div>

      <div className="space-y-4 sm:space-y-5">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="p-6 sm:p-8 rounded-3xl border border-zinc-200/80 dark:border-white/10 bg-white/60 dark:bg-[#0c0c18]/60 backdrop-blur-xl space-y-5 shadow-xs"
          >
            <div className="flex items-center gap-3.5">
              <ShimmerEffect className="w-9 h-9 rounded-xl" />
              <ShimmerEffect className="h-5 w-60 rounded" />
            </div>
            <div className="space-y-3">
              <ShimmerEffect className="h-12 w-full rounded-2xl" />
              <ShimmerEffect className="h-12 w-full rounded-2xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const ChatPageSkeleton: React.FC = () => {
  return (
    <div className="w-full max-w-5xl xl:max-w-6xl 2xl:max-w-7xl mx-auto flex-1 flex flex-col min-h-0 relative z-10 px-2 sm:px-4 animate-pulse">
      <div className="relative flex-1 flex flex-col min-h-0 rounded-[28px] sm:rounded-[34px] bg-white/40 dark:bg-[#0c0c18]/50 backdrop-blur-[30px] border border-white/60 dark:border-white/10 p-6 sm:p-8 justify-between shadow-[0_8px_40px_-10px_rgba(90,37,235,0.08)]">
        {/* Hero Section */}
        <div className="flex-1 flex flex-col items-center justify-center space-y-5 py-8 sm:py-12">
          <ShimmerEffect className="w-36 h-36 sm:w-44 sm:h-44 rounded-full" glow />
          <ShimmerEffect className="h-7 w-64 rounded-xl" />
          <ShimmerEffect className="h-4 w-full max-w-md rounded-md" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-w-2xl w-full pt-4">
            <ShimmerEffect className="h-20 w-full rounded-2xl" />
            <ShimmerEffect className="h-20 w-full rounded-2xl" />
          </div>
        </div>

        {/* Input Bar Dock Skeleton */}
        <div className="w-full max-w-3xl xl:max-w-4xl mx-auto space-y-3 pt-2">
          <ShimmerEffect className="h-16 w-full rounded-3xl" glow />
          <div className="flex justify-between items-center px-2">
            <ShimmerEffect className="h-4 w-28 rounded-full" />
            <ShimmerEffect className="h-4 w-36 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
};

export const UniversalPageSkeleton: React.FC<{ route: string }> = ({ route }) => {
  switch (route) {
    case '/chat':
      return <ChatPageSkeleton />;
    case '/memory':
      return <MemoryPageSkeleton />;
    case '/share':
      return <SharePageSkeleton />;
    case '/settings':
      return <SettingsPageSkeleton />;
    default:
      return <MemoryPageSkeleton />;
  }
};

export default UniversalPageSkeleton;

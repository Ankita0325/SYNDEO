import * as React from "react";

export type OrbStateMode = 'idle' | 'listening' | 'thinking' | 'speaking' | 'generating';

export interface LoaderProps {
  size?: number; 
  text?: string;
  isInline?: boolean;
  state?: OrbStateMode;
  variant?: 'hero' | 'avatar' | 'compact' | 'overlay';
  className?: string;
}

export const Component: React.FC<LoaderProps> = ({
  size,
  text,
  state = 'idle',
  isInline = false,
  variant = 'hero',
  className = '',
}) => {
  const effectiveVariant = isInline ? 'compact' : variant;
  const computedSize = size || (effectiveVariant === 'avatar' ? 24 : effectiveVariant === 'compact' ? 36 : 160);

  const defaultText =
    state === 'listening'
      ? 'Listening...'
      : state === 'thinking'
      ? 'Thinking...'
      : state === 'generating'
      ? 'Generating...'
      : state === 'speaking'
      ? 'Speaking...'
      : 'Ready...';

  const displayText = text || defaultText;
  const letters = displayText.split("");
  const isFast = state === 'speaking' || state === 'listening' || state === 'thinking' || state === 'generating';

  // Compact / Avatar View (Used for AI profile avatar, header, and bottom nav dock)
  if (effectiveVariant === 'avatar' || effectiveVariant === 'compact') {
    return (
      <div
        className={`relative flex items-center justify-center shrink-0 select-none ${className}`}
        style={{ width: computedSize, height: computedSize }}
      >
        {/* Outer Inset Glowing Rotating Ring */}
        <div
          className={`absolute inset-0 rounded-full pointer-events-none ${
            isFast ? 'animate-loaderCircleFast' : 'animate-loaderCircle'
          }`}
        />
        {/* Core Glowing Center */}
        <div
          className={`w-2/3 h-2/3 rounded-full transition-all pointer-events-none ${
            state === 'speaking'
              ? 'bg-emerald-400 shadow-[0_0_10px_#10b981]'
              : state === 'listening'
              ? 'bg-[#38bdf8] shadow-[0_0_10px_#38bdf8]'
              : 'bg-[#005dff] dark:bg-[#38bdf8] shadow-[0_0_8px_#005dff]'
          } animate-pulse`}
        />
      </div>
    );
  }

  // Hero / Big Middle Screen Glowing Orb (for start screen & voice copilot)
  const content = (
    <div className={`relative flex flex-col items-center justify-center select-none ${className}`}>
      {/* Ambient Glow Aura */}
      <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-64 h-64 bg-[#005dff]/15 dark:bg-[#38bdf8]/20 rounded-full blur-3xl pointer-events-none" />

      {/* Main Rotating Circular Orb */}
      <div
        className="relative flex items-center justify-center font-inter select-none my-2"
        style={{ width: computedSize, height: computedSize }}
      >
        {/* Spelled Letter Animations with crisp high-contrast theme styling */}
        <div className="flex items-center justify-center z-10 select-none">
          {letters.map((letter, index) => (
            <span
              key={`${displayText}-${index}`}
              className={`inline-block font-mono font-bold tracking-wider transition-colors ${
                state === 'speaking'
                  ? 'text-emerald-500 dark:text-emerald-400 animate-loaderLetterFast'
                  : state === 'listening'
                  ? 'text-cyan-600 dark:text-[#38bdf8] animate-loaderLetterFast'
                  : state === 'thinking' || state === 'generating'
                  ? 'text-[#005dff] dark:text-[#60a5fa] animate-loaderLetterFast'
                  : 'text-zinc-900 dark:text-white animate-loaderLetter'
              }`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {letter === " " ? "\u00A0" : letter}
            </span>
          ))}
        </div>

        {/* Outer Rotating Glowing Shadow Ring */}
        <div
          className={`absolute inset-0 rounded-full pointer-events-none ${
            isFast ? 'animate-loaderCircleFast' : 'animate-loaderCircle'
          }`}
        />
      </div>
    </div>
  );

  if (effectiveVariant === 'overlay') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-b from-[#1a3379] via-[#0f172a] to-black dark:from-[#0a0a10] dark:via-[#121218] dark:to-black">
        {content}
      </div>
    );
  }

  return content;
};

// Compatible aliases
export const AILoaderOrb = Component;
export default Component;

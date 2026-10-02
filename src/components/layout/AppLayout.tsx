import React, { useState } from 'react';
import { useNavigation, type RoutePath } from '../../context/NavigationContext';
import { useTheme } from '../../context/ThemeContext';
import { ThemeToggle } from '../ui/ThemeToggle';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

import { FloatingSidebar } from './FloatingSidebar';

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentPath, navigate, userName } = useNavigation();
  const { theme } = useTheme();
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);

  const isLanding = currentPath === '/';
  const isAuth = currentPath === '/auth';
  const isChat = currentPath === '/chat';

  const handleNavClick = (path: RoutePath) => {
    navigate(path);
  };

  const displayName = userName?.trim() || 'Indresh Suresh';
  const displayInitials = displayName.slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen w-full relative overflow-x-clip bg-white dark:bg-[#090817] text-[#09090b] dark:text-[#f4f4f6] flex flex-col selection:bg-[#5a25eb]/30 selection:text-[#cbbeff] transition-colors duration-300">
      
      {/* =========================================================================
          1. CONTINUOUS ROOT ATMOSPHERE BACKGROUND (Multi-Layer Atmospheric Glow)
         ========================================================================= */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background:
            theme === 'dark'
              ? `
                radial-gradient(ellipse 750px 550px at 50% 12%, rgba(35, 90, 190, 0.22), transparent 70%),
                radial-gradient(ellipse 650px 550px at 85% 50%, rgba(90, 45, 180, 0.16), transparent 72%),
                radial-gradient(ellipse 600px 500px at 15% 55%, rgba(90, 37, 235, 0.16), transparent 70%),
                #090817
              `
              : `
                radial-gradient(ellipse 700px 500px at 50% 10%, rgba(180, 210, 255, 0.34), transparent 70%),
                radial-gradient(ellipse 650px 550px at 85% 50%, rgba(220, 205, 255, 0.28), transparent 72%),
                radial-gradient(ellipse 600px 500px at 15% 55%, rgba(210, 225, 255, 0.24), transparent 70%),
                #ffffff
              `,
        }}
      />

      {/* Subtle Moving Ambient Sheen Overlay */}
      <motion.div
        animate={{
          opacity: [0.25, 0.45, 0.25],
          scale: [1, 1.02, 1],
        }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        className="fixed inset-0 pointer-events-none z-0 bg-gradient-to-b from-transparent via-blue-100/10 dark:via-[#5a25eb]/5 to-transparent"
      />

      {/* =========================================================================
          2. SEAMLESS TRANSPARENT NAVBAR (Layer 100 - Zero Card Enclosure)
         ========================================================================= */}
      {!isAuth && (
        <header className="fixed top-0 left-0 right-0 h-[72px] sm:h-[80px] z-[100] px-5 sm:px-8 md:px-10 lg:px-12 flex items-center justify-between pointer-events-none transition-all">
          
          {/* Left: Logo + SYNDEO AI + Vault+ badge */}
          <button
            onClick={() => handleNavClick('/')}
            className="pointer-events-auto flex items-center gap-2.5 text-left group cursor-pointer transition-transform hover:scale-[1.02]"
            title="SYNDEO AI Home"
          >
            <div className="relative w-8 h-8 rounded-full overflow-hidden bg-[#5a25eb]/10 dark:bg-white/10 border border-[#5a25eb]/20 dark:border-white/15 flex items-center justify-center p-0.5 shadow-xs group-hover:border-[#5a25eb]/50 transition-colors">
              <img
                src="/logo.png"
                alt="SYNDEO AI Logo"
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm sm:text-base font-bold tracking-tight text-zinc-900 dark:text-white group-hover:text-[#5a25eb] dark:group-hover:text-[#cbbeff] transition-colors">
                SYNDEO AI
              </span>
            </div>
          </button>

          {/* Center: Landing Links (Only shown on Landing) */}
          {isLanding ? (
            <nav className="pointer-events-auto hidden md:flex items-center gap-1">
              <button
                onClick={() => handleNavClick('/chat')}
                className="px-3.5 py-1.5 rounded-full text-xs font-medium text-zinc-600 dark:text-[#a1a1aa] hover:text-zinc-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer"
              >
                AI Assistant
              </button>
              <button
                onClick={() => handleNavClick('/memory')}
                className="px-3.5 py-1.5 rounded-full text-xs font-medium text-zinc-600 dark:text-[#a1a1aa] hover:text-zinc-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer"
              >
                Memory Store
              </button>
              <button
                onClick={() => handleNavClick('/share')}
                className="px-3.5 py-1.5 rounded-full text-xs font-medium text-zinc-600 dark:text-[#a1a1aa] hover:text-zinc-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer"
              >
                Selective Share
              </button>
            </nav>
          ) : (
            <div className="hidden md:block flex-1" />
          )}

          {/* Right: Individual Floating Controls (Theme Switcher & Profile Capsule) */}
          <div className="pointer-events-auto flex items-center gap-2.5 sm:gap-3.5">
            <ThemeToggle size="sm" />

            {isLanding ? (
              <>
                <button
                  onClick={() => handleNavClick('/auth')}
                  className="hidden sm:inline-block px-3.5 py-1.5 rounded-full text-xs font-semibold text-zinc-700 dark:text-[#e4e4e7] hover:text-zinc-900 dark:hover:text-white bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 transition-all cursor-pointer"
                >
                  Sign In
                </button>
                <button
                  onClick={() => handleNavClick('/chat')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-white bg-[#111111] dark:bg-white dark:text-[#111111] hover:opacity-90 shadow-md transition-all cursor-pointer"
                >
                  <span>Launch</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsSidebarExpanded((prev) => !prev)}
                className={`flex items-center gap-2 p-1 sm:pr-3 rounded-full border shadow-xs transition-all cursor-pointer group hover:scale-[1.02] ${
                  isSidebarExpanded
                    ? 'bg-[#111111] dark:bg-white text-white dark:text-[#111111] border-transparent ring-2 ring-[#5a25eb]/40'
                    : 'bg-black/[0.04] dark:bg-white/[0.06] border-black/[0.08] dark:border-white/[0.10] hover:bg-black/[0.07] dark:hover:bg-white/[0.12]'
                }`}
                title="Toggle Vault Profile & Side Panel"
                aria-expanded={isSidebarExpanded}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shadow-xs ${
                  isSidebarExpanded
                    ? 'bg-white dark:bg-[#111111] text-[#111111] dark:text-white'
                    : 'bg-[#111111] dark:bg-white text-white dark:text-[#111111]'
                }`}>
                  {displayInitials}
                </div>
                <span className={`hidden sm:inline-block text-xs font-semibold max-w-[120px] truncate transition-colors ${
                  isSidebarExpanded
                    ? 'text-white dark:text-[#111111]'
                    : 'text-zinc-800 dark:text-zinc-200 group-hover:text-zinc-950 dark:group-hover:text-white'
                }`}>
                  {displayName}
                </span>
              </button>
            )}
          </div>
        </header>
      )}

      {/* =========================================================================
          3. MAIN WORKSPACE CONTENT (Layer 10 - Continuous Single Surface with Smooth Scrolling)
         ========================================================================= */}
        <main
          className={`flex-1 flex flex-col w-full relative z-10 min-h-0 ${
            isAuth
              ? 'min-h-screen'
              : isChat
              ? 'h-[100dvh] max-h-[100dvh] overflow-hidden pt-[68px] sm:pt-[74px] pb-0'
              : 'min-h-screen overflow-y-auto overflow-x-clip pt-[76px] sm:pt-[84px] pb-6'
          }`}
        >
          {children}
        </main>

      {/* =========================================================================
          4. MASTER FLOATING SIDEBAR NAVIGATION (Layer 50)
         ========================================================================= */}
      {!isLanding && !isAuth && (
        <FloatingSidebar
          isExpanded={isSidebarExpanded}
          onToggleExpand={() => setIsSidebarExpanded((prev) => !prev)}
          onClose={() => setIsSidebarExpanded(false)}
        />
      )}
    </div>
  );
};

export default AppLayout;
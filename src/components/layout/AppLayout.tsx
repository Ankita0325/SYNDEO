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
    <div className="min-h-screen w-full relative overflow-x-hidden bg-white dark:bg-[#070710] text-[#09090b] dark:text-[#f4f4f6] flex flex-col selection:bg-[#5a25eb]/30 selection:text-[#cbbeff] transition-colors duration-300">
      
      {/* =========================================================================
          1. CONTINUOUS GLOBAL ATMOSPHERE BACKGROUND (Layer 0 - Unclipped Canvas)
         ========================================================================= */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background:
            theme === 'dark'
              ? `
                radial-gradient(circle at 25% 10%, rgba(90, 37, 235, 0.22), transparent 35%),
                radial-gradient(circle at 50% 20%, rgba(56, 189, 248, 0.15), transparent 32%),
                radial-gradient(circle at 75% 45%, rgba(90, 37, 235, 0.20), transparent 35%),
                #070710
              `
              : `
                radial-gradient(circle at 25% 10%, rgba(190, 210, 255, 0.55), transparent 32%),
                radial-gradient(circle at 50% 20%, rgba(147, 197, 253, 0.35), transparent 30%),
                radial-gradient(circle at 75% 45%, rgba(220, 210, 255, 0.40), transparent 35%),
                #ffffff
              `,
        }}
      />

      {/* Subtle Moving Ambient Sheen Overlay */}
      <motion.div
        animate={{
          opacity: [0.3, 0.5, 0.3],
          scale: [1, 1.02, 1],
        }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        className="fixed inset-0 pointer-events-none z-0 bg-gradient-to-b from-transparent via-blue-100/10 dark:via-[#5a25eb]/5 to-transparent"
      />

      {/* =========================================================================
          2. FLOATING FIXED NAVBAR (Layer 100 - Premium Glassmorphism)
         ========================================================================= */}
      {!isAuth && (
        <header className="fixed top-3 sm:top-3 md:top-3 left-3 sm:left-4 md:left-6 right-3 sm:right-4 md:right-6 h-[58px] sm:h-16 z-[100] transition-all">
          <div
            className="w-full h-full rounded-[18px] px-3.5 sm:px-6 flex items-center justify-between
                       bg-white/70 dark:bg-[#0c0c16]/75
                       backdrop-blur-[24px] backdrop-saturate-[160%]
                       border border-black/[0.06] dark:border-white/[0.08]
                       shadow-[0_8px_32px_rgba(30,20,80,0.06),inset_0_1px_0_rgba(255,255,255,0.8)]
                       dark:shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.06)]"
          >
            {/* Left: Logo + SYNDEO AI + Vault+ badge */}
            <button
              onClick={() => handleNavClick('/')}
              className="flex items-center gap-2.5 text-left group cursor-pointer transition-transform hover:scale-[1.02]"
              title="SYNDEO AI Home"
            >
              <div className="relative w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-[#5a25eb]/15 to-[#8b5cf6]/15 border border-[#5a25eb]/30 flex items-center justify-center p-0.5 shadow-sm group-hover:border-[#5a25eb]/70 transition-colors">
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
                <span className="inline-block text-[9px] sm:text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-[#5a25eb]/15 dark:bg-[#5a25eb]/25 text-[#5a25eb] dark:text-[#cbbeff] border border-[#5a25eb]/30">
                  Vault+
                </span>
              </div>
            </button>

            {/* Center: Clean & Uncluttered (Shows landing links on home page, empty in workspace) */}
            {isLanding ? (
              <nav className="hidden md:flex items-center gap-1 pl-3 border-l border-zinc-200/60 dark:border-white/10">
                <button
                  onClick={() => handleNavClick('/chat')}
                  className="px-3.5 py-1.5 rounded-full text-xs font-medium text-zinc-600 dark:text-[#a1a1aa] hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100/80 dark:hover:bg-white/5 transition-all cursor-pointer"
                >
                  AI Assistant
                </button>
                <button
                  onClick={() => handleNavClick('/memory')}
                  className="px-3.5 py-1.5 rounded-full text-xs font-medium text-zinc-600 dark:text-[#a1a1aa] hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100/80 dark:hover:bg-white/5 transition-all cursor-pointer"
                >
                  Memory Store
                </button>
                <button
                  onClick={() => handleNavClick('/share')}
                  className="px-3.5 py-1.5 rounded-full text-xs font-medium text-zinc-600 dark:text-[#a1a1aa] hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100/80 dark:hover:bg-white/5 transition-all cursor-pointer"
                >
                  Selective Share
                </button>
              </nav>
            ) : (
              <div className="hidden md:block flex-1" />
            )}

            {/* Right: Day/Night Theme Switcher & Profile Avatar / Sign In */}
            <div className="flex items-center gap-2 sm:gap-3">
              <ThemeToggle size="sm" />

              {isLanding ? (
                <>
                  <button
                    onClick={() => handleNavClick('/auth')}
                    className="hidden sm:inline-block px-3.5 py-1.5 rounded-full text-xs font-semibold text-zinc-700 dark:text-[#e4e4e7] hover:text-zinc-900 dark:hover:text-white bg-zinc-100/70 dark:bg-white/5 border border-zinc-200/70 dark:border-white/10 transition-all cursor-pointer"
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
                      : 'bg-white/60 dark:bg-white/5 border-zinc-200/60 dark:border-white/10 hover:border-[#111111]/30 dark:hover:border-white/30'
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
          </div>
        </header>
      )}

      {/* =========================================================================
          3. MAIN WORKSPACE CONTENT (Layer 10 - Fixed Height for /chat to Prevent Double Scroll)
         ========================================================================= */}
      <main
        className={`flex-1 flex flex-col w-full relative z-10 ${
          isAuth
            ? 'min-h-screen'
            : isChat
            ? 'h-[100dvh] overflow-hidden pt-[76px] sm:pt-[84px] md:pt-[90px] pb-2'
            : 'min-h-screen overflow-y-auto overflow-x-hidden pt-[78px] sm:pt-[88px] md:pt-[96px] lg:pt-[104px] pb-6'
        }`}
      >
        {children}
      </main>

      {/* =========================================================================
          4. MASTER FLOATING SIDEBAR NAVIGATION (Layer 50 - Unified All-in-One Panel)
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
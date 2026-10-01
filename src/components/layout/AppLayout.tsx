import React, { useState } from 'react';
import { useNavigation, type RoutePath } from '../../context/NavigationContext';
import { useTheme } from '../../context/ThemeContext';
import { AILoaderOrb } from '../ui/ai-loader';
import {
  Share2,
  Settings,
  Sun,
  Moon,
  Menu,
  X,
  Database,
  Bot,
  ArrowRight,
  ShieldCheck,
  ChevronLeft,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentPath, navigate, userName } = useNavigation();
  const { theme, toggleTheme } = useTheme();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isLanding = currentPath === '/';
  const isAuth = currentPath === '/auth';

  const navItems: { path: RoutePath; label: string; icon: React.FC<{ className?: string }>; desc: string }[] = [
    { path: '/chat', label: 'AI Memory Chat', icon: Bot, desc: 'Zero-Knowledge Conversational Retrieval' },
    { path: '/memory', label: 'Life-Stage Store', icon: Database, desc: 'Obsidian Knowledge Graph & Credentials' },
    { path: '/share', label: 'Selective Share', icon: Share2, desc: 'Scoped zk-SNARK Disclosure Links' },
    { path: '/settings', label: 'Vault Settings', icon: Settings, desc: 'Cryptographic Keys & Security' },
  ];

  const handleNavClick = (path: RoutePath) => {
    navigate(path);
    setDrawerOpen(false);
  };

  const getSectionTitle = () => {
    switch (currentPath) {
      case '/chat':
        return 'AI Assistant';
      case '/memory':
        return 'Memory Store';
      case '/share':
        return 'Selective Share';
      case '/settings':
        return 'Vault Settings';
      case '/auth':
        return 'Authentication';
      default:
        return 'Workspace';
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black text-[#09090b] dark:text-[#f4f4f6] flex flex-col selection:bg-[#5a25eb]/40 selection:text-[#cbbeff] transition-colors duration-200 overflow-x-hidden">
      {/* 1. STANDALONE AUTH MODE: Zero headers, zero footers */}
      {isAuth ? (
        <main className="flex-1 flex flex-col min-h-screen">{children}</main>
      ) : isLanding ? (
        /* 2. LANDING PAGE MODE */
        <>
          {/* Floating Capsule Glassmorphism Navbar for Landing */}
          <header className="sticky top-3 z-50 max-w-6xl mx-auto w-full px-3 sm:px-4">
            <div className="rounded-full bg-white/85 dark:bg-black/80 backdrop-blur-2xl border border-zinc-200 dark:border-white/10 shadow-xl px-3.5 py-2 sm:px-5 sm:py-2.5 flex items-center justify-between transition-all">
              {/* Left Brand */}
              <button
                onClick={() => handleNavClick('/')}
                className="flex items-center gap-2.5 text-left group cursor-pointer"
              >
                <div className="relative w-8 h-8 rounded-full overflow-hidden bg-zinc-100 dark:bg-[#121218] border border-zinc-300 dark:border-white/15 flex items-center justify-center p-0.5 shadow-sm group-hover:border-[#5a25eb]/70 transition-colors">
                  <img
                    src="/logo.png"
                    alt="SYNDEO AI Logo"
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm sm:text-base font-bold tracking-tight text-zinc-900 dark:text-white group-hover:text-[#5a25eb] dark:group-hover:text-[#cbbeff] transition-colors">
                    SYNDEO AI
                  </span>
                  <span className="hidden sm:inline-block text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#5a25eb]/15 dark:bg-[#5a25eb]/20 text-[#5a25eb] dark:text-[#cbbeff] border border-[#5a25eb]/30">
                    Sovereign
                  </span>
                </div>
              </button>

              {/* Navigation Links */}
              <nav className="hidden md:flex items-center gap-1 pl-3 border-l border-zinc-200 dark:border-white/10">
                <button
                  onClick={() => handleNavClick('/chat')}
                  className="px-3.5 py-1.5 rounded-full text-xs font-medium text-zinc-600 dark:text-[#a1a1aa] hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 transition-all cursor-pointer"
                >
                  AI Assistant
                </button>
                <button
                  onClick={() => handleNavClick('/memory')}
                  className="px-3.5 py-1.5 rounded-full text-xs font-medium text-zinc-600 dark:text-[#a1a1aa] hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 transition-all cursor-pointer"
                >
                  Memory Store
                </button>
                <button
                  onClick={() => handleNavClick('/share')}
                  className="px-3.5 py-1.5 rounded-full text-xs font-medium text-zinc-600 dark:text-[#a1a1aa] hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 transition-all cursor-pointer"
                >
                  Selective Share
                </button>
              </nav>

              {/* Right Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded-full text-zinc-600 dark:text-[#a1a1aa] hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/10 border border-zinc-200 dark:border-white/10 transition-colors cursor-pointer"
                  title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                >
                  {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-[#e4e4e7]" /> : <Moon className="w-3.5 h-3.5 text-zinc-700" />}
                </button>

                <button
                  onClick={() => handleNavClick('/auth')}
                  className="hidden sm:inline-block px-3.5 py-1.5 rounded-full text-xs font-semibold text-zinc-700 dark:text-[#e4e4e7] hover:text-zinc-900 dark:hover:text-white bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/15 transition-all cursor-pointer"
                >
                  Sign In
                </button>

                <button
                  onClick={() => handleNavClick('/chat')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-white bg-[#5a25eb] hover:bg-[#6b37fa] shadow-md shadow-[#5a25eb]/30 transition-all cursor-pointer"
                >
                  <span>Launch</span>
                  <ArrowRight className="w-3 h-3" />
                </button>

                {/* Right-Side Hamburger Trigger */}
                <button
                  onClick={() => setDrawerOpen(true)}
                  className="p-2 rounded-full text-zinc-700 dark:text-[#a1a1aa] hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/10 border border-zinc-200 dark:border-white/10 transition-colors cursor-pointer"
                  title="Open Navigation Menu"
                  aria-label="Open Navigation Menu"
                >
                  <Menu className="w-4 h-4" />
                </button>
              </div>
            </div>
          </header>

          {/* Main Landing Body */}
          <main className="flex-1">{children}</main>
        </>
      ) : (
        /* 3. APP / WORKSPACE MODE: Clean top bar with right-side hamburger menu (No bottom navbar) */
        <div className="flex-1 flex flex-col min-h-screen relative">
          {/* Top Workspace Header */}
          <header className="sticky top-0 z-40 bg-white/90 dark:bg-black/90 backdrop-blur-xl border-b border-zinc-200 dark:border-[#1c1c28] px-3.5 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between transition-all">
            {/* Left: Logo & Current Section */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleNavClick('/')}
                className="flex items-center gap-2 p-1 rounded-xl hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors cursor-pointer group"
                title="Back to Landing Overview"
              >
                <ChevronLeft className="w-4 h-4 text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors" />
                <div className="w-7 h-7 rounded-lg overflow-hidden bg-zinc-100 dark:bg-[#14141e] border border-zinc-300 dark:border-white/10 flex items-center justify-center p-0.5 shadow-sm group-hover:border-[#5a25eb]/60 transition-colors">
                  <img src="/logo.png" alt="SYNDEO AI" className="w-full h-full object-contain" />
                </div>
                <span className="text-xs font-bold text-zinc-900 dark:text-white tracking-tight">
                  SYNDEO AI
                </span>
              </button>

              <span className="text-zinc-300 dark:text-[#272732] hidden sm:inline">/</span>

              {/* Current Section Pill */}
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-[#151520] border border-zinc-200 dark:border-[#252535]">
                <span className="text-xs font-semibold text-zinc-800 dark:text-[#e4e4e7]">
                  {getSectionTitle()}
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>
            </div>

            {/* Desktop Center Navigation Segment (Web View) */}
            <nav className="hidden md:flex items-center gap-1 p-1 rounded-full bg-zinc-100/90 dark:bg-[#111118]/90 border border-zinc-200 dark:border-[#222230] shadow-inner">
              <button
                onClick={() => handleNavClick('/chat')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  currentPath === '/chat'
                    ? 'bg-[#5a25eb] text-white shadow-md shadow-[#5a25eb]/30'
                    : 'text-zinc-600 dark:text-[#8c879a] hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/60 dark:hover:bg-white/5'
                }`}
              >
                <AILoaderOrb state={currentPath === '/chat' ? 'thinking' : 'idle'} variant="avatar" size={16} />
                <span>AI Chat</span>
              </button>

              <button
                onClick={() => handleNavClick('/memory')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  currentPath === '/memory'
                    ? 'bg-[#5a25eb] text-white shadow-md shadow-[#5a25eb]/30'
                    : 'text-zinc-600 dark:text-[#8c879a] hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/60 dark:hover:bg-white/5'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                <span>Memory Store</span>
              </button>

              <button
                onClick={() => handleNavClick('/share')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  currentPath === '/share'
                    ? 'bg-[#5a25eb] text-white shadow-md shadow-[#5a25eb]/30'
                    : 'text-zinc-600 dark:text-[#8c879a] hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/60 dark:hover:bg-white/5'
                }`}
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Selective Share</span>
              </button>
            </nav>

            {/* Right Controls: Theme + Hamburger Drawer Trigger */}
            <div className="flex items-center gap-2">
              {/* Theme Toggle Button */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-full text-zinc-600 dark:text-[#a1a1aa] hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/10 border border-zinc-200 dark:border-white/10 transition-colors cursor-pointer"
                title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-[#e4e4e7]" /> : <Moon className="w-3.5 h-3.5 text-zinc-700" />}
              </button>

              {/* User Profile Capsule */}
              <div className="hidden sm:flex items-center gap-2 p-1 pr-2.5 rounded-full bg-zinc-100 dark:bg-[#15151f] border border-zinc-200 dark:border-[#2b2b3a]">
                <div className="w-6 h-6 rounded-full bg-[#5a25eb] flex items-center justify-center text-[10px] font-bold text-white shadow-xs">
                  {userName.slice(0, 2).toUpperCase()}
                </div>
                <span className="text-xs font-medium text-zinc-700 dark:text-[#d4d4d8]">
                  {userName}
                </span>
              </div>

              {/* Right-Side Hamburger Menu Button (Available on Web and Mobile) */}
              <button
                onClick={() => setDrawerOpen(true)}
                className="p-2 sm:p-2.5 rounded-full text-zinc-700 dark:text-white hover:bg-zinc-100 dark:hover:bg-white/10 border border-zinc-300 dark:border-white/15 transition-all cursor-pointer shadow-xs active:scale-95 flex items-center justify-center"
                title="Open Workspace Menu"
                aria-label="Open Workspace Menu"
              >
                <Menu className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* Main Workspace Body */}
          <main className="flex-1 flex flex-col min-h-0 overflow-hidden">{children}</main>
        </div>
      )}

      {/* =========================================================================
          RIGHT-SIDE SLIDE-OVER HAMBURGER DRAWER MENU
         ========================================================================= */}
      <AnimatePresence>
        {drawerOpen && (
          <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop Blur Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setDrawerOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Slide-out Drawer Panel from Right */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 280 }}
              className="relative w-full max-w-xs sm:max-w-sm bg-white dark:bg-[#09090f] border-l border-zinc-200 dark:border-white/10 h-full flex flex-col justify-between shadow-2xl z-10 overflow-y-auto"
            >
              {/* Top Drawer Header & Profile */}
              <div className="p-5 space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-white/10">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl overflow-hidden bg-zinc-100 dark:bg-[#14141e] border border-zinc-300 dark:border-white/10 flex items-center justify-center p-0.5">
                      <img src="/logo.png" alt="SYNDEO AI" className="w-full h-full object-contain" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-zinc-900 dark:text-white">SYNDEO AI</h2>
                      <p className="text-[10px] text-zinc-400">Zero-Knowledge Life Store</p>
                    </div>
                  </div>

                  <button
                    onClick={() => setDrawerOpen(false)}
                    className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-white/10 text-zinc-500 dark:text-zinc-400 transition-colors cursor-pointer"
                    title="Close Menu"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* User Identity Card */}
                <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-[#12121a] border border-zinc-200 dark:border-white/10 space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#5a25eb] flex items-center justify-center text-xs font-bold text-white shadow-sm">
                      {userName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-zinc-900 dark:text-white">{userName}</h3>
                      <p className="text-[10px] text-zinc-500 font-mono">Sovereign Vault #8921</p>
                    </div>
                  </div>
                  <div className="pt-1 flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Zero-Knowledge Encryption Active</span>
                  </div>
                </div>

                {/* Navigation Menu List */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-[#71717a] px-1">
                    Navigation
                  </span>

                  {navItems.map((item) => {
                    const isActive = currentPath === item.path;
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.path}
                        onClick={() => handleNavClick(item.path)}
                        className={`w-full flex items-center gap-3.5 p-3 rounded-2xl text-left transition-all cursor-pointer ${
                          isActive
                            ? 'bg-[#5a25eb] text-white shadow-md shadow-[#5a25eb]/30'
                            : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5'
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                            isActive
                              ? 'bg-white/20 text-white'
                              : 'bg-zinc-200/60 dark:bg-white/10 text-zinc-700 dark:text-zinc-300'
                          }`}
                        >
                          {item.path === '/chat' ? (
                            <AILoaderOrb state={isActive ? 'thinking' : 'idle'} variant="avatar" size={18} />
                          ) : (
                            <Icon className="w-4 h-4" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold truncate">{item.label}</div>
                          <div
                            className={`text-[10px] truncate ${
                              isActive ? 'text-white/80' : 'text-zinc-400 dark:text-zinc-500'
                            }`}
                          >
                            {item.desc}
                          </div>
                        </div>

                        {isActive && <Sparkles className="w-3.5 h-3.5 text-white shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Drawer Actions */}
              <div className="p-5 border-t border-zinc-100 dark:border-white/10 space-y-3 bg-zinc-50/50 dark:bg-[#07070c]">
                {/* Theme Mode Toggle in Drawer */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-[#12121a] border border-zinc-200 dark:border-white/10">
                  <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                    {theme === 'dark' ? <Moon className="w-3.5 h-3.5 text-[#cbbeff]" /> : <Sun className="w-3.5 h-3.5 text-amber-500" />}
                    <span>Theme</span>
                  </span>
                  <button
                    onClick={toggleTheme}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-zinc-100 dark:bg-white/10 text-zinc-800 dark:text-white cursor-pointer"
                  >
                    {theme === 'dark' ? 'Dark' : 'Light'}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleNavClick('/auth')}
                    className="py-2.5 rounded-xl text-xs font-semibold text-center text-zinc-800 dark:text-white bg-zinc-200/70 dark:bg-white/5 hover:bg-zinc-300 dark:hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => handleNavClick('/')}
                    className="py-2.5 rounded-xl text-xs font-semibold text-center text-white bg-[#5a25eb] hover:bg-[#6b37fa] transition-colors cursor-pointer"
                  >
                    Overview
                  </button>
                </div>

                <div className="text-center pt-1">
                  <span className="text-[10px] text-zinc-400 font-mono">
                    SYNDEO Protocol v1.4 • Sovereign
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AppLayout;

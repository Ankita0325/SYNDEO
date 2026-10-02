import React, { useState } from 'react';
import { useNavigation, type RoutePath } from '../../context/NavigationContext';
import { useTheme } from '../../context/ThemeContext';
import { AILoaderOrb } from '../ui/ai-loader';
import { Modal } from '../common/Modal';
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
  Sparkles,
  LogOut,
  Lock,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentPath, navigate, userName, userEmail, signOut } = useNavigation();
  const { theme, toggleTheme } = useTheme();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const isLanding = currentPath === '/';
  const isAuth = currentPath === '/auth';
  const isChat = currentPath === '/chat';

  const navItems: { path: RoutePath; label: string; icon: React.FC<{ className?: string }>; desc: string }[] = [
    { path: '/chat', label: 'AI Memory Chat', icon: Bot, desc: 'Conversational Retrieval' },
    { path: '/memory', label: 'Life-Stage Store', icon: Database, desc: 'Knowledge Graph & Records' },
    { path: '/share', label: 'Selective Share', icon: Share2, desc: 'Scoped Disclosure Links' },
    { path: '/settings', label: 'Vault Settings', icon: Settings, desc: 'Keys & Security' },
  ];

  const handleNavClick = (path: RoutePath) => {
    navigate(path);
    setMobileSidebarOpen(false);
  };

  const handleConfirmLogout = async () => {
    setIsLogoutModalOpen(false);
    await signOut();
  };

  return (
    <div
      className={`bg-white dark:bg-[#05070e] text-[#09090b] dark:text-[#f4f4f6] flex flex-col selection:bg-[#5a25eb]/40 selection:text-[#cbbeff] transition-colors duration-200 ${
        isChat ? 'h-screen h-[100dvh] overflow-hidden' : 'min-h-screen overflow-x-hidden'
      }`}
    >
      {/* 1. STANDALONE AUTH MODE: Zero headers, zero footers */}
      {isAuth ? (
        <main className="flex-1 flex flex-col min-h-screen">{children}</main>
      ) : isLanding ? (
        /* 2. LANDING PAGE MODE */
        <>
          {/* Floating Capsule Glassmorphism Navbar for Landing Only */}
          <header className="sticky top-3 z-50 max-w-6xl mx-auto w-full px-3 sm:px-4">
            <div className="rounded-full bg-white/85 dark:bg-[#080711]/80 backdrop-blur-2xl border border-zinc-200 dark:border-white/10 shadow-xl px-3.5 py-2 sm:px-5 sm:py-2.5 flex items-center justify-between transition-all">
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
              </div>
            </div>
          </header>

          {/* Main Landing Body */}
          <main className="flex-1">{children}</main>
        </>
      ) : (
        /* 3. DASHBOARD / WORKSPACE MODE: Clean Glassmorphic Left Sidebar (Zero Top Navbar on Desktop, Clean App Bar on Mobile) */
        <div className="flex-1 flex flex-col lg:flex-row w-full h-screen h-[100dvh] overflow-hidden">
          {/* =========================================================================
              MOBILE TOP APP BAR (< lg screens)
             ========================================================================= */}
          <header className="lg:hidden h-14 shrink-0 bg-white/90 dark:bg-[#060810]/95 backdrop-blur-xl border-b border-zinc-200 dark:border-white/10 px-3.5 sm:px-4 flex items-center justify-between z-30">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileSidebarOpen(true)}
                className="p-2 rounded-xl bg-zinc-100 dark:bg-white/10 text-zinc-800 dark:text-white hover:bg-zinc-200 dark:hover:bg-white/15 transition-colors cursor-pointer"
                aria-label="Open Navigation Menu"
              >
                <Menu className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleNavClick('/')}
                className="flex items-center gap-2 text-left cursor-pointer"
              >
                <div className="w-7 h-7 rounded-lg overflow-hidden bg-zinc-100 dark:bg-[#14141e] border border-zinc-300 dark:border-white/10 flex items-center justify-center p-0.5">
                  <img src="/logo.png" alt="SYNDEO AI" className="w-full h-full object-contain" />
                </div>
                <span className="text-xs sm:text-sm font-bold tracking-tight text-zinc-900 dark:text-white">
                  SYNDEO AI
                </span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-xl text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 transition-colors cursor-pointer"
                title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-300" /> : <Moon className="w-3.5 h-3.5 text-zinc-700" />}
              </button>

              <div className="w-7 h-7 rounded-full bg-[#5a25eb] text-white text-[11px] font-bold flex items-center justify-center shadow-xs">
                {(userName || 'US').slice(0, 2).toUpperCase()}
              </div>
            </div>
          </header>

          {/* =========================================================================
              DESKTOP LEFT SIDEBAR (Fixed, Non-Scrolling Container with Smooth Nav Scroll)
             ========================================================================= */}
          <aside className="hidden lg:flex w-64 xl:w-72 glass-sidebar flex-col justify-between shrink-0 h-full overflow-hidden select-none z-30 shadow-2xl">
            {/* Top Brand & Status */}
            <div className="p-5 flex flex-col flex-1 min-h-0 space-y-4">
              <div className="flex items-center justify-between pb-1 shrink-0">
                <button
                  onClick={() => handleNavClick('/')}
                  className="flex items-center gap-3 text-left group cursor-pointer"
                  title="Return to Home"
                >
                  <div className="relative w-8 h-8 rounded-xl overflow-hidden bg-zinc-100 dark:bg-[#14141e]/90 border border-zinc-300 dark:border-white/10 flex items-center justify-center p-0.5 shadow-md group-hover:border-[#5a25eb]/70 transition-colors">
                    <img src="/logo.png" alt="SYNDEO AI" className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <span className="text-sm font-bold tracking-tight text-zinc-900 dark:text-white block group-hover:text-[#5a25eb] dark:group-hover:text-[#cbbeff] transition-colors">
                      SYNDEO AI
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400 dark:text-[#8c879a] block -mt-0.5">
                      Sovereign Vault
                    </span>
                  </div>
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={toggleTheme}
                    className="p-1.5 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/60 dark:hover:bg-white/10 transition-colors cursor-pointer"
                    title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                  >
                    {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-zinc-700" />}
                  </button>
                </div>
              </div>

              {/* Navigation Items with Animated Glass Pills (Smooth Scrollable Area) */}
              <nav className="flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-1.5 pr-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-[#71717a] px-2 block mb-2">
                  Workspace
                </span>

                {navItems.map((item) => {
                  const isActive = currentPath === item.path;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.path}
                      onClick={() => handleNavClick(item.path)}
                      className={`group relative w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left transition-all duration-150 cursor-pointer overflow-hidden ${
                        isActive
                          ? 'glass-pill-active text-white font-semibold shadow-lg'
                          : 'text-zinc-600 dark:text-[#a09cb0] hover:text-zinc-900 dark:hover:text-white hover:bg-white/5 font-medium'
                      }`}
                    >
                      <div className="shrink-0 flex items-center justify-center">
                        {item.path === '/chat' ? (
                          <AILoaderOrb state={isActive ? 'thinking' : 'idle'} variant="avatar" size={18} />
                        ) : (
                          <Icon className="w-4 h-4 transition-transform group-hover:scale-110" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="text-xs truncate">{item.label}</div>
                      </div>

                      {isActive && <Sparkles className="w-3.5 h-3.5 text-white/90 shrink-0 animate-pulse" />}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Bottom Profile & Logout Section */}
            <div className="p-4 border-t border-zinc-200 dark:border-white/[0.08] space-y-3 bg-black/10 dark:bg-black/20 backdrop-blur-md shrink-0">
              {/* User Profile Card with Emerald Online Dot */}
              <div className="p-2.5 rounded-xl bg-white/70 dark:bg-[#12111a]/80 border border-zinc-200 dark:border-white/[0.08] flex items-center gap-3 shadow-xs">
                <div className="relative shrink-0">
                  <div className="w-8 h-8 rounded-full bg-[#5a25eb] flex items-center justify-center text-xs font-bold text-white shadow-xs">
                    {(userName || 'US').slice(0, 2).toUpperCase()}
                  </div>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#0c0c12]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                    {userName || 'Sovereign User'}
                  </div>
                  <div className="text-[10px] text-zinc-400 font-mono truncate">
                    {userEmail || 'Encrypted Vault #8821'}
                  </div>
                </div>
              </div>

              {/* Logout Button */}
              <button
                onClick={() => setIsLogoutModalOpen(true)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out</span>
              </button>
            </div>
          </aside>

          {/* =========================================================================
              MOBILE SLIDE-OVER SIDEBAR (Left Drawer)
             ========================================================================= */}
          <AnimatePresence>
            {mobileSidebarOpen && (
              <div className="fixed inset-0 z-50 lg:hidden flex">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setMobileSidebarOpen(false)}
                  className="fixed inset-0 bg-black/70 backdrop-blur-xs"
                />

                <motion.div
                  initial={{ x: '-100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '-100%' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 280 }}
                  className="relative w-72 max-w-[85vw] glass-sidebar h-full flex flex-col justify-between shadow-2xl z-10 p-5 overflow-hidden"
                >
                  <div className="space-y-6 flex-1 min-h-0 flex flex-col">
                    <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-white/10 shrink-0">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl overflow-hidden bg-zinc-100 dark:bg-[#14141e] border border-zinc-300 dark:border-white/10 flex items-center justify-center p-0.5">
                          <img src="/logo.png" alt="SYNDEO AI" className="w-full h-full object-contain" />
                        </div>
                        <span className="text-sm font-bold text-zinc-900 dark:text-white">SYNDEO AI</span>
                      </div>

                      <button
                        onClick={() => setMobileSidebarOpen(false)}
                        className="p-1.5 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-white/10 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Zero-Knowledge Vault Status Pill */}
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px] font-medium flex items-center justify-between shadow-xs shrink-0">
                      <div className="flex items-center gap-2 truncate">
                        <ShieldCheck className="w-4 h-4 shrink-0" />
                        <span className="truncate">Vault Encrypted</span>
                      </div>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                    </div>

                    <nav className="flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-1.5 pr-0.5">
                      {navItems.map((item) => {
                        const isActive = currentPath === item.path;
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.path}
                            onClick={() => handleNavClick(item.path)}
                            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left transition-all cursor-pointer ${
                              isActive
                                ? 'glass-pill-active text-white shadow-md font-semibold'
                                : 'text-zinc-600 dark:text-[#a09cb0] hover:bg-white/5 font-medium'
                            }`}
                          >
                            <Icon className="w-4 h-4 shrink-0" />
                            <span className="text-xs">{item.label}</span>
                          </button>
                        );
                      })}
                    </nav>
                  </div>

                  <div className="pt-4 border-t border-zinc-200 dark:border-white/10 space-y-3 shrink-0">
                    <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-[#14141c] border border-zinc-200 dark:border-white/10 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#5a25eb] flex items-center justify-center text-xs font-bold text-white shrink-0">
                        {(userName || 'US').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="truncate text-xs font-bold text-zinc-900 dark:text-white">
                        {userName || 'Sovereign User'}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setMobileSidebarOpen(false);
                        setIsLogoutModalOpen(true);
                      }}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-red-600 dark:text-red-400 bg-red-500/10 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Log Out</span>
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* =========================================================================
              MAIN DASHBOARD BODY (Full Width, Isolated Smooth Scroll)
             ========================================================================= */}
          <main className={`flex-1 flex flex-col min-w-0 min-h-0 ${isChat ? 'h-full overflow-hidden' : 'h-full overflow-y-auto overflow-x-hidden no-scrollbar'}`}>
            {children}
          </main>
        </div>
      )}

      {/* =========================================================================
          LOGOUT CONFIRMATION MODAL
         ========================================================================= */}
      <Modal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        title="Lock Vault & Sign Out"
        subtitle="Confirm cryptographic session termination"
      >
        <div className="space-y-6 text-center py-2">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-500">
            <Lock className="w-7 h-7" />
          </div>

          <div className="space-y-2">
            <h3 className="text-base font-bold text-zinc-900 dark:text-white">
              Are you sure you want to sign out?
            </h3>
            <p className="text-xs text-zinc-500 dark:text-[#8c879a] max-w-sm mx-auto leading-relaxed">
              Your zero-knowledge encrypted vault session will be sealed. You will need to sign in again to access and query your personal knowledge graph.
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => setIsLogoutModalOpen(false)}
              className="px-5 py-2.5 rounded-xl border border-zinc-200 dark:border-[#2d2c38] text-zinc-700 dark:text-[#c4bfcf] hover:bg-zinc-100 dark:hover:bg-[#1f1e27] text-xs font-medium transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmLogout}
              className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-md shadow-red-600/20 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Yes, Sign Out</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

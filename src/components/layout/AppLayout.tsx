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
  Database,
  ArrowRight,
  ShieldCheck,
  ChevronLeft,
  MessageSquare,
  Folder,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentPath, navigate, userName } = useNavigation();
  const { theme, toggleTheme } = useTheme();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isLanding = currentPath === '/';
  const isAuth = currentPath === '/auth';
  const isChat = currentPath === '/chat';

  const navItems: { path: RoutePath; label: string; icon: React.FC<{ className?: string }>; desc: string }[] = [
    { path: '/chat', label: 'AI Memory Chat', icon: MessageSquare, desc: 'Zero-Knowledge Conversational Retrieval' },
    { path: '/memory', label: 'Life-Stage Store', icon: Folder, desc: 'Obsidian Knowledge Graph & Credentials' },
    { path: '/share', label: 'Selective Share', icon: Share2, desc: 'Scoped zk-SNARK Disclosure Links' },
    { path: '/settings', label: 'Vault Settings', icon: Settings, desc: 'Cryptographic Keys & Security' },
  ];

  const handleNavClick = (path: RoutePath) => {
    navigate(path);
    // Removed setDrawerOpen(false) so the panel stays open
  };

  const getSectionTitle = () => {
    switch (currentPath) {
      case '/chat': return 'AI Assistant';
      case '/memory': return 'Memory Store';
      case '/share': return 'Selective Share';
      case '/settings': return 'Vault Settings';
      case '/auth': return 'Authentication';
      default: return 'Workspace';
    }
  };

  return (
    <div
      className={`bg-white dark:bg-black text-[#09090b] dark:text-[#f4f4f6] flex flex-col selection:bg-[#5a25eb]/40 selection:text-[#cbbeff] transition-colors duration-200 ${
        isChat ? 'h-screen h-[100dvh] overflow-hidden' : 'min-h-screen overflow-x-hidden'
      }`}
    >
      {/* 1. STANDALONE AUTH MODE */}
      {isAuth ? (
        <main className="flex-1 flex flex-col min-h-screen">{children}</main>
      ) : isLanding ? (
        /* 2. LANDING PAGE MODE */
        <>
          <header className="sticky top-3 z-50 max-w-6xl mx-auto w-full px-3 sm:px-4">
            <div className="rounded-full bg-white/85 dark:bg-black/80 backdrop-blur-2xl border border-zinc-200 dark:border-white/10 shadow-xl px-3.5 py-2 sm:px-5 sm:py-2.5 flex items-center justify-between transition-all">
              <button onClick={() => handleNavClick('/')} className="flex items-center gap-2.5 text-left group cursor-pointer">
                <div className="relative w-8 h-8 rounded-full overflow-hidden bg-zinc-100 dark:bg-[#121218] border border-zinc-300 dark:border-white/15 flex items-center justify-center p-0.5 shadow-sm group-hover:border-[#5a25eb]/70 transition-colors">
                  <img src="/logo.png" alt="SYNDEO AI Logo" className="w-full h-full object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm sm:text-base font-bold tracking-tight text-zinc-900 dark:text-white group-hover:text-[#5a25eb] dark:group-hover:text-[#cbbeff] transition-colors">SYNDEO AI</span>
                  <span className="hidden sm:inline-block text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#5a25eb]/15 dark:bg-[#5a25eb]/20 text-[#5a25eb] dark:text-[#cbbeff] border border-[#5a25eb]/30">Sovereign</span>
                </div>
              </button>

              <nav className="hidden md:flex items-center gap-1 pl-3 border-l border-zinc-200 dark:border-white/10">
                <button onClick={() => handleNavClick('/chat')} className="px-3.5 py-1.5 rounded-full text-xs font-medium text-zinc-600 dark:text-[#a1a1aa] hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 transition-all cursor-pointer">AI Assistant</button>
                <button onClick={() => handleNavClick('/memory')} className="px-3.5 py-1.5 rounded-full text-xs font-medium text-zinc-600 dark:text-[#a1a1aa] hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 transition-all cursor-pointer">Memory Store</button>
                <button onClick={() => handleNavClick('/share')} className="px-3.5 py-1.5 rounded-full text-xs font-medium text-zinc-600 dark:text-[#a1a1aa] hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 transition-all cursor-pointer">Selective Share</button>
              </nav>

              <div className="flex items-center gap-2">
                <button onClick={toggleTheme} className="p-2 rounded-full text-zinc-600 dark:text-[#a1a1aa] hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/10 border border-zinc-200 dark:border-white/10 transition-colors cursor-pointer" title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
                  {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-[#e4e4e7]" /> : <Moon className="w-3.5 h-3.5 text-zinc-700" />}
                </button>
                <button onClick={() => handleNavClick('/auth')} className="hidden sm:inline-block px-3.5 py-1.5 rounded-full text-xs font-semibold text-zinc-700 dark:text-[#e4e4e7] hover:text-zinc-900 dark:hover:text-white bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/15 transition-all cursor-pointer">Sign In</button>
                <button onClick={() => handleNavClick('/chat')} className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-white bg-[#5a25eb] hover:bg-[#6b37fa] shadow-md shadow-[#5a25eb]/30 transition-all cursor-pointer">
                  <span>Launch</span><ArrowRight className="w-3 h-3" />
                </button>
                <button onClick={() => setDrawerOpen(true)} className="p-2 rounded-full text-zinc-700 dark:text-[#a1a1aa] hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/10 border border-zinc-200 dark:border-white/10 transition-colors cursor-pointer" title="Open Navigation Menu" aria-label="Open Navigation Menu">
                  <Menu className="w-4 h-4" />
                </button>
              </div>
            </div>
          </header>
          <main className="flex-1">{children}</main>
        </>
      ) : (
        /* 3. APP / WORKSPACE MODE */
        <div className={`flex-1 flex flex-col relative min-h-0 ${isChat ? 'h-full overflow-hidden' : 'min-h-screen'}`}>
          <header className="sticky top-0 z-40 bg-white/90 dark:bg-black/90 backdrop-blur-xl border-b border-zinc-200 dark:border-[#1c1c28] px-3.5 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between transition-all">
            <div className="flex items-center gap-3">
              <button onClick={() => handleNavClick('/')} className="flex items-center gap-2 p-1 rounded-xl hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors cursor-pointer group" title="Back to Landing Overview">
                <ChevronLeft className="w-4 h-4 text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors" />
                <div className="w-7 h-7 rounded-lg overflow-hidden bg-zinc-100 dark:bg-[#14141e] border border-zinc-300 dark:border-white/10 flex items-center justify-center p-0.5 shadow-sm group-hover:border-[#5a25eb]/60 transition-colors">
                  <img src="/logo.png" alt="SYNDEO AI" className="w-full h-full object-contain" />
                </div>
                <span className="text-xs font-bold text-zinc-900 dark:text-white tracking-tight">SYNDEO AI</span>
              </button>
              <span className="text-zinc-300 dark:text-[#272732] hidden sm:inline">/</span>
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-[#151520] border border-zinc-200 dark:border-[#252535]">
                <span className="text-xs font-semibold text-zinc-800 dark:text-[#e4e4e7]">{getSectionTitle()}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>
            </div>

            <nav className="hidden md:flex items-center gap-1 p-1 rounded-full bg-zinc-100/90 dark:bg-[#111118]/90 border border-zinc-200 dark:border-[#222230] shadow-inner">
              <button onClick={() => handleNavClick('/chat')} className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${currentPath === '/chat' ? 'bg-[#5a25eb] text-white shadow-md shadow-[#5a25eb]/30' : 'text-zinc-600 dark:text-[#8c879a] hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/60 dark:hover:bg-white/5'}`}>
                <AILoaderOrb state={currentPath === '/chat' ? 'thinking' : 'idle'} variant="avatar" size={16} /><span>AI Chat</span>
              </button>
              <button onClick={() => handleNavClick('/memory')} className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${currentPath === '/memory' ? 'bg-[#5a25eb] text-white shadow-md shadow-[#5a25eb]/30' : 'text-zinc-600 dark:text-[#8c879a] hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/60 dark:hover:bg-white/5'}`}>
                <Database className="w-3.5 h-3.5" /><span>Memory Store</span>
              </button>
              <button onClick={() => handleNavClick('/share')} className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${currentPath === '/share' ? 'bg-[#5a25eb] text-white shadow-md shadow-[#5a25eb]/30' : 'text-zinc-600 dark:text-[#8c879a] hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/60 dark:hover:bg-white/5'}`}>
                <Share2 className="w-3.5 h-3.5" /><span>Selective Share</span>
              </button>
            </nav>

            <div className="flex items-center gap-2">
              <button onClick={toggleTheme} className="p-2 rounded-full text-zinc-600 dark:text-[#a1a1aa] hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/10 border border-zinc-200 dark:border-white/10 transition-colors cursor-pointer" title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
                {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-[#e4e4e7]" /> : <Moon className="w-3.5 h-3.5 text-zinc-700" />}
              </button>
              <div className="hidden sm:flex items-center gap-2 p-1 pr-2.5 rounded-full bg-zinc-100 dark:bg-[#15151f] border border-zinc-200 dark:border-[#2b2b3a]">
                <div className="w-6 h-6 rounded-full bg-[#5a25eb] flex items-center justify-center text-[10px] font-bold text-white shadow-xs">{userName.slice(0, 2).toUpperCase()}</div>
                <span className="text-xs font-medium text-zinc-700 dark:text-[#d4d4d8]">{userName}</span>
              </div>
              <button onClick={() => setDrawerOpen(true)} className="p-2 sm:p-2.5 rounded-full text-zinc-700 dark:text-white hover:bg-zinc-100 dark:hover:bg-white/10 border border-zinc-300 dark:border-white/15 transition-all cursor-pointer shadow-xs active:scale-95 flex items-center justify-center" title="Open Workspace Menu" aria-label="Open Workspace Menu">
                <Menu className="w-4 h-4" />
              </button>
            </div>
          </header>
          <main className="flex-1 flex flex-col min-h-0 overflow-hidden">{children}</main>
        </div>
      )}

      {/* =========================================================================
          PERSISTENT FLOATING NAVBAR + LIQUID GLASS SIDE PANEL
         ========================================================================= */}
      <AnimatePresence>
        {drawerOpen && (
          <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop Blur Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={() => setDrawerOpen(false)}
              className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-md"
            />

            {/* Liquid Glass Panel */}
            <motion.div
              initial={{ x: '100%', opacity: 0, scale: 0.95 }}
              animate={{ x: 0, opacity: 1, scale: 1 }}
              exit={{ x: '100%', opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="relative w-[85vw] max-w-[340px] h-[92vh] my-auto mr-3 rounded-[3.5rem] overflow-hidden shadow-2xl flex flex-col justify-between z-10"
              style={{
                background: theme === 'dark' 
                  ? 'linear-gradient(145deg, rgba(30, 25, 45, 0.6) 0%, rgba(10, 10, 15, 0.9) 100%)'
                  : 'linear-gradient(145deg, rgba(255, 255, 255, 0.85) 0%, rgba(240, 240, 255, 0.95) 100%)',
                backdropFilter: 'blur(30px) saturate(200%)',
                WebkitBackdropFilter: 'blur(30px) saturate(200%)',
                border: theme === 'dark' 
                  ? '1px solid rgba(255, 255, 255, 0.08)' 
                  : '1px solid rgba(255, 255, 255, 0.7)',
                boxShadow: theme === 'dark'
                  ? '0 8px 32px 0 rgba(0, 0, 0, 0.9), inset 0 1px 0 0 rgba(255,255,255,0.1)'
                  : '0 8px 32px 0 rgba(90, 37, 235, 0.15), inset 0 1px 0 0 rgba(255,255,255,0.9)'
              }}
            >
              {/* Animated Internal Gradient Glow */}
              <motion.div 
                animate={{ 
                  background: [
                    'radial-gradient(circle at 20% 0%, rgba(90, 37, 235, 0.3) 0%, transparent 60%)',
                    'radial-gradient(circle at 80% 100%, rgba(90, 37, 235, 0.3) 0%, transparent 60%)',
                    'radial-gradient(circle at 20% 0%, rgba(90, 37, 235, 0.3) 0%, transparent 60%)'
                  ]
                }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 pointer-events-none mix-blend-overlay opacity-60"
              />

              <div className="relative z-20 flex flex-col h-full">
                {/* Header - Capsule Logo, No Close Button */}
                <div className="p-6 pb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Capsule shaped logo container */}
                    <div className="w-12 h-10 rounded-full bg-white/10 dark:bg-black/20 flex items-center justify-center backdrop-blur-md border border-white/20 shadow-sm overflow-hidden p-1">
                      <img src="/logo.png" alt="SYNDEO AI" className="w-full h-full object-contain" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-zinc-900 dark:text-white tracking-wide">SYNDEO AI</h2>
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400">Sovereign Vault</p>
                    </div>
                  </div>
                </div>

                {/* Navigation Items */}
                <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3 no-scrollbar">
                  {navItems.map((item) => {
                    const isActive = currentPath === item.path;
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.path}
                        onClick={() => handleNavClick(item.path)}
                        className={`w-full flex items-center gap-4 p-2 rounded-full transition-all duration-300 cursor-pointer group ${
                          isActive 
                            ? 'bg-white/90 dark:bg-white/15 shadow-lg shadow-black/5 dark:shadow-white/5 border border-white/40 dark:border-white/10' 
                            : 'hover:bg-white/40 dark:hover:bg-white/5 border border-transparent'
                        }`}
                      >
                        {/* Circular Icon Container */}
                        <div
                          className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${
                            isActive
                              ? 'bg-[#5a25eb] text-white shadow-md shadow-[#5a25eb]/40'
                              : 'bg-black/5 dark:bg-white/10 text-zinc-600 dark:text-zinc-300 group-hover:bg-black/10 dark:group-hover:bg-white/20'
                          }`}
                        >
                          {item.path === '/chat' ? (
                            <AILoaderOrb state={isActive ? 'thinking' : 'idle'} variant="avatar" size={20} />
                          ) : (
                            <Icon className={`w-5 h-5 ${isActive ? 'text-white' : ''}`} />
                          )}
                        </div>

                        {/* Text Content */}
                        <div className="flex flex-col items-start overflow-hidden">
                          <span className={`text-sm font-bold truncate w-full text-left ${
                            isActive ? 'text-zinc-900 dark:text-white' : 'text-zinc-700 dark:text-zinc-300'
                          }`}>
                            {item.label}
                          </span>
                          <span className={`text-[10px] truncate w-full text-left ${
                            isActive ? 'text-zinc-600 dark:text-zinc-300' : 'text-zinc-500 dark:text-zinc-500'
                          }`}>
                            {item.desc}
                          </span>
                        </div>

                        {/* Active Indicator */}
                        {isActive && (
                          <motion.div 
                            layoutId="activeIndicator"
                            className="ml-auto w-2 h-2 rounded-full bg-[#5a25eb] shadow-[0_0_8px_rgba(90,37,235,0.8)]" 
                          />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Footer / Profile Section */}
                <div className="p-6 pt-2 space-y-4">
                  {/* User Profile Card */}
                  <div className="p-4 rounded-[2rem] bg-white/40 dark:bg-black/20 border border-white/30 dark:border-white/5 backdrop-blur-md flex items-center gap-4 shadow-inner">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#5a25eb] to-[#8b5cf6] flex items-center justify-center text-sm font-bold text-white shadow-md">
                      {userName.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xs font-bold text-zinc-900 dark:text-white truncate">{userName}</h3>
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 mt-0.5">
                        <ShieldCheck className="w-3 h-3" /> Vault #8921
                      </p>
                    </div>
                    <button
                      onClick={toggleTheme}
                      className="w-8 h-8 rounded-full bg-white/50 dark:bg-white/10 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:bg-white/80 dark:hover:bg-white/20 transition-colors cursor-pointer shadow-sm"
                      title="Toggle Theme"
                    >
                      {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Action Buttons - Replaced Sign In with Log Out */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleNavClick('/auth')} // Assuming /auth handles logout logic or redirects
                      className="py-3 rounded-full text-xs font-semibold text-center text-zinc-800 dark:text-white bg-white/50 dark:bg-white/10 hover:bg-white/80 dark:hover:bg-white/20 transition-colors cursor-pointer backdrop-blur-md border border-white/30 dark:border-white/5 shadow-sm"
                    >
                      Log Out
                    </button>
                    <button
                      onClick={() => handleNavClick('/')}
                      className="py-3 rounded-full text-xs font-semibold text-center text-white bg-[#5a25eb] hover:bg-[#6b37fa] transition-colors cursor-pointer shadow-md shadow-[#5a25eb]/30"
                    >
                      Overview
                    </button>
                  </div>

                  <div className="text-center pt-2">
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-500 font-mono tracking-widest uppercase">
                      v1.4 Sovereign
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* =========================================================================
          PERSISTENT FLOATING NAVBAR (Visible when side panel is closed)
         ========================================================================= */}
      <AnimatePresence>
        {!drawerOpen && (
          <motion.div
            initial={{ opacity: 0, x: -20, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -20, scale: 0.9 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300, delay: 0.1 }}
            className="fixed left-4 top-1/2 -translate-y-1/2 z-40 hidden md:flex flex-col gap-2 p-2 rounded-full shadow-2xl border border-white/40 dark:border-white/10 backdrop-blur-2xl"
            style={{
              background: theme === 'dark' 
                ? 'linear-gradient(145deg, rgba(30, 25, 45, 0.75) 0%, rgba(10, 10, 15, 0.85) 100%)'
                : 'linear-gradient(145deg, rgba(255, 255, 255, 0.8) 0%, rgba(240, 240, 255, 0.9) 100%)',
              boxShadow: theme === 'dark'
                ? '0 8px 32px 0 rgba(0, 0, 0, 0.7), inset 0 1px 0 0 rgba(255,255,255,0.1)'
                : '0 8px 32px 0 rgba(90, 37, 235, 0.15), inset 0 1px 0 0 rgba(255,255,255,0.9)'
            }}
          >
            {/* Navbar Items */}
            {navItems.map((item) => {
              const isActive = currentPath === item.path;
              const Icon = item.icon;
              return (
                <button
                  key={item.path}
                  onClick={() => handleNavClick(item.path)}
                  className={`relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 group cursor-pointer ${
                    isActive
                      ? 'bg-[#5a25eb] text-white shadow-md shadow-[#5a25eb]/40'
                      : 'bg-black/5 dark:bg-white/5 text-zinc-600 dark:text-zinc-400 hover:bg-black/10 dark:hover:bg-white/10 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                  title={item.label}
                >
                  {item.path === '/chat' ? (
                    <AILoaderOrb state={isActive ? 'thinking' : 'idle'} variant="avatar" size={20} />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                  {/* Active indicator dot */}
                  {isActive && (
                    <motion.div 
                      layoutId="activeNavDot"
                      className="absolute -right-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[#5a25eb] shadow-[0_0_8px_rgba(90,37,235,0.8)]" 
                    />
                  )}
                </button>
              );
            })}
            
            {/* Separator */}
            <div className="w-8 h-px bg-zinc-300/50 dark:bg-white/10 mx-auto my-1" />

            {/* Menu Toggle Button */}
            <button
              onClick={() => setDrawerOpen(true)}
              className="w-12 h-12 rounded-full flex items-center justify-center text-zinc-600 dark:text-zinc-400 hover:bg-black/10 dark:hover:bg-white/10 hover:text-zinc-900 dark:hover:text-white transition-all duration-300 cursor-pointer group"
              title="Open Full Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AppLayout;
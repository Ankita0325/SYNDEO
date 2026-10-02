import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigation, type RoutePath } from '../../context/NavigationContext';
import { useTheme } from '../../context/ThemeContext';
import { ThemeToggle } from '../ui/ThemeToggle';
import {
  MessageSquare,
  Folder,
  Share2,
  Settings,
  Menu,
  ChevronRight,
  X,
  LogOut,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

interface NavItemDef {
  path: RoutePath;
  label: string;
  icon: React.FC<{ className?: string }>;
  desc: string;
  shortcut?: string;
}

interface FloatingSidebarProps {
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  onClose?: () => void;
}

export const FloatingSidebar: React.FC<FloatingSidebarProps> = ({
  isExpanded: controlledExpanded,
  onToggleExpand,
  onClose,
}) => {
  const { currentPath, navigate, userName, userEmail, signOut } = useNavigation();
  const { theme } = useTheme();
  const [internalExpanded, setInternalExpanded] = useState<boolean>(false);

  const isExpanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;
  const toggleExpand = onToggleExpand || (() => setInternalExpanded((prev) => !prev));
  const handleClose = onClose || (() => (onToggleExpand ? onToggleExpand() : setInternalExpanded(false)));

  const isDark = theme === 'dark';

  const navItems: NavItemDef[] = [
    { path: '/chat', label: 'AI Memory Chat', icon: MessageSquare, desc: 'Zero-Knowledge Retrieval', shortcut: '⌘1' },
    { path: '/memory', label: 'Life-Stage Store', icon: Folder, desc: 'Obsidian Graph Vault', shortcut: '⌘2' },
    { path: '/share', label: 'Selective Share', icon: Share2, desc: 'Scoped zk-SNARK Links', shortcut: '⌘3' },
    { path: '/settings', label: 'Vault Settings', icon: Settings, desc: 'Keys & Cryptography', shortcut: '⌘4' },
  ];

  const handleNav = (path: RoutePath) => {
    navigate(path);
  };

  const handleLogout = async () => {
    handleClose();
    await signOut();
  };

  const displayName = userName?.trim() || 'Indresh Suresh';
  const displayEmail = userEmail || 'indresh@syndeo.vault';
  const displayInitials = displayName.slice(0, 2).toUpperCase();

  return (
    <>
      {/* =========================================================================
          BACKDROP OVERLAY (When expanded, click outside to close)
         ========================================================================= */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={handleClose}
            className="fixed inset-0 z-40 bg-black/30 dark:bg-black/60 backdrop-blur-xs"
          />
        )}
      </AnimatePresence>

      {/* =========================================================================
          DESKTOP FLOATING SIDEBAR (Expandable 82px <-> 320px & Increased Height 340px <-> 620px)
         ========================================================================= */}
      <motion.nav
        initial={false}
        animate={{
          width: isExpanded ? 320 : 82,
          height: isExpanded ? 620 : 340,
        }}
        transition={{
          duration: 0.45,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="fixed left-5 top-1/2 -translate-y-1/2 z-50 hidden md:flex flex-col p-3 rounded-[32px]
                   bg-white/75 dark:bg-[#0c0c16]/85
                   backdrop-blur-[30px] backdrop-saturate-[160%]
                   border border-black/[0.08] dark:border-white/[0.12]
                   shadow-[0_20px_60px_rgba(30,20,80,0.12)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.55)]
                   select-none overflow-hidden justify-between"
        aria-label="Sidebar Navigation"
      >
        {/* TOP / PROFILE HEADER (Visible & Staggered when expanded) */}
        <div className="w-full flex flex-col">
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.28, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
                className="w-full pb-3 border-b border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="relative w-9 h-9 rounded-2xl bg-gradient-to-br from-[#111111] to-zinc-800 dark:from-white dark:to-zinc-200 text-white dark:text-[#111111] flex items-center justify-center text-xs font-bold shadow-sm shrink-0">
                    {displayInitials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                      {displayName}
                    </h3>
                    <div className="flex items-center gap-1.5 text-[10px]">
                      <span className="text-zinc-500 dark:text-zinc-400 truncate max-w-[120px]">{displayEmail}</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-0.5 shrink-0">
                        <ShieldCheck className="w-3 h-3" /> #8921
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleClose}
                  className="w-7 h-7 rounded-xl bg-black/5 dark:bg-white/10 flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-black/10 dark:hover:bg-white/20 transition-all cursor-pointer"
                  title="Close Side Panel"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Section Header */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="pt-3 pb-1 px-1 text-[10px] font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-bold"
              >
                Navigation
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation Item Stack */}
          <div className="relative flex flex-col gap-1.5 w-full mt-1">
            {navItems.map((item, index) => {
              const isActive = currentPath === item.path;
              const Icon = item.icon;

              return (
                <div key={item.path} className="relative flex items-center">
                  {/* Single Persistent Moving Capsule Pointer (Attached to Left Edge) */}
                  {isActive && (
                    <motion.div
                      layoutId="activeSidebarPointer"
                      transition={{
                        type: 'spring',
                        stiffness: 380,
                        damping: 32,
                      }}
                      className={`absolute -left-[15px] w-[5px] h-7 rounded-full z-20 ${
                        isDark ? 'bg-white shadow-[0_0_10px_rgba(255,255,255,0.6)]' : 'bg-[#111111] shadow-[0_0_8px_rgba(0,0,0,0.3)]'
                      }`}
                    />
                  )}

                  {/* Main Navigation Capsule Row */}
                  <motion.button
                    onClick={() => handleNav(item.path)}
                    whileHover={{ x: 2, scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    className={`relative w-full h-[50px] rounded-[18px] flex items-center px-3 transition-all duration-300 cursor-pointer overflow-hidden ${
                      isActive
                        ? isDark
                          ? 'bg-white text-[#111111] shadow-[0_5px_18px_rgba(255,255,255,0.08)] font-bold'
                          : 'bg-[#111111] text-white shadow-[0_5px_15px_rgba(0,0,0,0.15)] font-bold'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                    }`}
                    aria-current={isActive ? 'page' : undefined}
                    title={item.label}
                  >
                    {/* Icon Container (Centered & Subtle Scaling) */}
                    <div className="w-8 h-8 flex items-center justify-center shrink-0">
                      <Icon
                        className={`w-[20px] h-[20px] transition-transform duration-300 ${
                          isActive ? 'scale-[1.14] stroke-[2.2]' : 'group-hover:scale-110 stroke-[1.8]'
                        }`}
                      />
                    </div>

                    {/* Progressive Staggered Label Animation */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -6 }}
                          transition={{
                            duration: 0.28,
                            delay: 0.08 + index * 0.04,
                            ease: [0.22, 1, 0.36, 1],
                          }}
                          className="ml-3 flex-1 flex items-center justify-between min-w-0 overflow-hidden text-left"
                        >
                          <div className="flex flex-col min-w-0 pr-2">
                            <span className="text-xs font-bold truncate leading-tight tracking-tight">
                              {item.label}
                            </span>
                            <span
                              className={`text-[10px] truncate leading-tight mt-0.5 ${
                                isActive
                                  ? isDark
                                    ? 'text-zinc-700'
                                    : 'text-zinc-300'
                                  : 'text-zinc-400 dark:text-zinc-500'
                              }`}
                            >
                              {item.desc}
                            </span>
                          </div>

                          {item.shortcut && (
                            <span
                              className={`text-[9px] font-mono px-1.5 py-0.5 rounded shrink-0 ${
                                isActive
                                  ? isDark
                                    ? 'bg-zinc-200 text-zinc-900 font-bold'
                                    : 'bg-zinc-800 text-zinc-300 font-bold'
                                  : 'bg-zinc-100 dark:bg-white/10 text-zinc-400'
                              }`}
                            >
                              {item.shortcut}
                            </span>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.button>
                </div>
              );
            })}
          </div>
        </div>

        {/* BOTTOM SECTION (Preferences, Theme Switch, Settings & Logout) */}
        <div className="w-full flex flex-col pt-2">
          {/* Expanded Bottom Controls */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.25, delay: 0.15 }}
                className="space-y-2.5 pb-2"
              >
                {/* Preferences Divider */}
                <div className="pt-2 border-t border-black/[0.06] dark:border-white/[0.08]">
                  <div className="px-1 pb-2 text-[10px] font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-bold">
                    Preferences
                  </div>

                  {/* Theme Switch Row */}
                  <div className="p-2.5 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.04] dark:border-white/[0.06] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-black/5 dark:bg-white/10 flex items-center justify-center">
                        <Sparkles className="w-3.5 h-3.5 text-[#5a25eb] dark:text-[#cbbeff]" />
                      </div>
                      <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                        {isDark ? 'Dark Mode' : 'Light Mode'}
                      </span>
                    </div>
                    <ThemeToggle size="sm" />
                  </div>
                </div>

                {/* Settings & Logout Action Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => handleNav('/settings')}
                    className={`py-2 rounded-xl text-xs font-semibold text-center transition-all cursor-pointer border shadow-xs flex items-center justify-center gap-1.5 ${
                      currentPath === '/settings'
                        ? isDark
                          ? 'bg-white text-[#111111] border-white font-bold'
                          : 'bg-[#111111] text-white border-[#111111] font-bold'
                        : 'text-zinc-700 dark:text-zinc-200 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border-transparent'
                    }`}
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>Settings</span>
                  </button>

                  <button
                    onClick={handleLogout}
                    className="py-2 rounded-xl text-xs font-semibold text-center text-red-600 dark:text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Logout</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Subtle Divider */}
          <div
            className={`w-full my-1 h-px ${
              isDark ? 'bg-white/10' : 'bg-black/[0.07]'
            }`}
          />

          {/* Expand / Collapse Toggle Button */}
          <motion.button
            onClick={toggleExpand}
            whileHover={{ x: 2, scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className={`relative w-full h-[46px] rounded-[16px] flex items-center px-3 transition-all duration-300 cursor-pointer overflow-hidden ${
              isExpanded
                ? isDark
                  ? 'bg-white/10 text-white'
                  : 'bg-black/5 text-zinc-900 font-bold'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
            }`}
            title={isExpanded ? 'Collapse Side Panel' : 'Expand Side Panel'}
          >
            <div className="w-8 h-8 flex items-center justify-center shrink-0">
              <Menu className="w-5 h-5 stroke-[1.9]" />
            </div>

            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -6 }}
                  transition={{
                    duration: 0.28,
                    delay: 0.12,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="ml-3 flex-1 flex items-center justify-between text-xs font-bold text-left"
                >
                  <span>Collapse Panel</span>
                  <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </motion.nav>

      {/* =========================================================================
          MOBILE EXPANDED SLIDING SHEET / PANEL (When open on mobile)
         ========================================================================= */}
      <AnimatePresence>
        {isExpanded && (
          <div className="fixed inset-0 z-[120] flex md:hidden justify-start">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={handleClose}
              className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm"
            />

            <motion.div
              initial={{ x: '-100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '-100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="relative w-[85vw] max-w-[320px] h-[88vh] my-auto ml-3 rounded-[32px] overflow-hidden shadow-2xl flex flex-col justify-between z-10
                         bg-white/90 dark:bg-[#0c0c16]/95
                         backdrop-blur-[30px]
                         border border-white/70 dark:border-white/10 p-4"
            >
              {/* Header */}
              <div className="w-full pb-3 border-b border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-2xl bg-[#111111] dark:bg-white text-white dark:text-[#111111] flex items-center justify-center text-xs font-bold shadow-sm shrink-0">
                    {displayInitials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-xs font-bold text-zinc-900 dark:text-white truncate">{displayName}</h3>
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> Vault #8921
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="w-7 h-7 rounded-xl bg-black/5 dark:bg-white/10 flex items-center justify-center text-zinc-600 dark:text-zinc-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Navigation Items */}
              <div className="flex-1 overflow-y-auto py-3 space-y-2">
                <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-bold px-1">
                  Navigation
                </div>
                {navItems.map((item) => {
                  const isActive = currentPath === item.path;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.path}
                      onClick={() => {
                        handleNav(item.path);
                        handleClose();
                      }}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-2xl transition-all cursor-pointer ${
                        isActive
                          ? isDark
                            ? 'bg-white text-[#111111] font-bold shadow-sm'
                            : 'bg-[#111111] text-white font-bold shadow-sm'
                          : 'text-zinc-700 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/5'
                      }`}
                    >
                      <Icon className="w-5 h-5 shrink-0" />
                      <div className="flex flex-col items-start min-w-0 text-left">
                        <span className="text-xs font-bold truncate">{item.label}</span>
                        <span className="text-[10px] opacity-70 truncate">{item.desc}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="space-y-2.5 pt-2 border-t border-black/[0.06] dark:border-white/[0.08]">
                <div className="p-2.5 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                    {isDark ? 'Dark Mode' : 'Light Mode'}
                  </span>
                  <ThemeToggle size="sm" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      handleNav('/settings');
                      handleClose();
                    }}
                    className="py-2 rounded-xl text-xs font-semibold text-center bg-black/5 dark:bg-white/5 text-zinc-800 dark:text-zinc-200 flex items-center justify-center gap-1.5"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>Settings</span>
                  </button>
                  <button
                    onClick={handleLogout}
                    className="py-2 rounded-xl text-xs font-semibold text-center text-red-600 dark:text-red-400 bg-red-500/10 flex items-center justify-center gap-1.5"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* =========================================================================
          MOBILE FLOATING BOTTOM CAPSULE NAVIGATION BAR (When collapsed on mobile)
         ========================================================================= */}
      <nav
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 block md:hidden p-1.5 rounded-full
                   bg-white/80 dark:bg-[#0e0e18]/85
                   backdrop-blur-[24px] backdrop-saturate-[140%]
                   border border-black/[0.08] dark:border-white/[0.12]
                   shadow-[0_12px_40px_rgba(0,0,0,0.25)]
                   select-none max-w-[92vw]"
        aria-label="Mobile Bottom Navigation"
      >
        <div className="flex items-center gap-1.5">
          {navItems.map((item) => {
            const isActive = currentPath === item.path;
            const Icon = item.icon;

            return (
              <button
                key={item.path}
                onClick={() => handleNav(item.path)}
                className={`relative px-4 py-2.5 rounded-full flex items-center gap-1.5 transition-all duration-300 cursor-pointer ${
                  isActive
                    ? isDark
                      ? 'bg-white text-[#111111] font-bold shadow-md'
                      : 'bg-[#111111] text-white font-bold shadow-md'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
                title={item.label}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'stroke-[2.2]' : 'stroke-[1.8]'}`} />
                {isActive && (
                  <span className="text-xs font-semibold whitespace-nowrap">
                    {item.label.split(' ')[0]}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};

export default FloatingSidebar;

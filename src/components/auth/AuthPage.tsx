import React, { useState } from 'react';
import { useNavigation } from '../../context/NavigationContext';
import { useTheme } from '../../context/ThemeContext';
import {
  ChevronLeft,
  Sun,
  Moon,
  UserRound,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { SyndeoPageLoader } from '../ui/SkeletonLoader';

export const AuthPage: React.FC = () => {
  const { navigate, authLoading, needsProfile, authError, signInWithGoogle, createProfile } = useNavigation();
  const { theme, toggleTheme } = useTheme();
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleAuth = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : 'Google sign-in failed. Please try again.');
      setIsLoading(false);
    }
  };

  const handleProfileSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await createProfile(fullName);
    } catch (profileError) {
      setError(profileError instanceof Error ? profileError.message : 'Could not create your profile. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-zinc-50 dark:bg-black text-zinc-900 dark:text-[#f4f4f6] px-4 py-6 sm:px-6 relative overflow-hidden transition-colors duration-200">
      {/* Background ambient radiance glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-[#5a25eb]/15 dark:bg-[#5a25eb]/20 rounded-full blur-3xl pointer-events-none" />

      {/* Top minimal bar with Back to Home & Theme Switcher */}
      <header className="max-w-5xl mx-auto w-full flex items-center justify-between z-10">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold text-zinc-600 dark:text-[#a1a1aa] hover:text-zinc-900 dark:hover:text-white bg-white/80 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 border border-zinc-200 dark:border-white/10 shadow-xs transition-all cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full text-zinc-600 dark:text-[#a1a1aa] hover:text-zinc-900 dark:hover:text-white bg-white/80 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 border border-zinc-200 dark:border-white/10 transition-colors cursor-pointer"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-[#e4e4e7]" /> : <Moon className="w-4 h-4 text-zinc-700" />}
          </button>
        </div>
      </header>

      {/* Center Auth Card Form */}
      <div className="w-full max-w-md mx-auto my-auto z-10 py-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="p-7 sm:p-9 rounded-3xl bg-white/90 dark:bg-[#0c0c12]/90 backdrop-blur-2xl border border-zinc-200 dark:border-white/10 shadow-2xl shadow-black/10 dark:shadow-black/80 space-y-6"
        >
          {/* Brand Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-[#161622] border border-zinc-200 dark:border-white/15 p-1 shadow-md shadow-[#5a25eb]/20 mx-auto">
              <img src="/logo.png" alt="SYNDEO AI" className="w-full h-full object-contain" />
            </div>
            <div className="space-y-1">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
                {needsProfile ? 'Your full name' : 'Sign in to SYNDEO'}
              </h1>
              <p className="text-xs text-zinc-500 dark:text-[#8c879a]">
                {needsProfile ? 'Add your name to create your profile.' : 'Continue securely with your Google account.'}
              </p>
            </div>
          </div>

          {authLoading ? (
            <div className="py-6">
              <SyndeoPageLoader
                label="Verifying Credentials..."
                sublabel="Authenticating cryptographic identity"
              />
            </div>
          ) : needsProfile ? (
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <label className="block text-xs font-medium text-zinc-700 dark:text-[#a29db0]">
                Full name
                <span className="relative block mt-1.5">
                  <UserRound className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    autoComplete="name"
                    autoFocus
                    required
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-[#15151f] border border-zinc-200 dark:border-[#2b2b3a] text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-[#5a25eb] focus:ring-1 focus:ring-[#5a25eb]"
                    placeholder="Your full name"
                  />
                </span>
              </label>
              <button
                type="submit"
                disabled={isLoading || !fullName.trim()}
                className="w-full py-2.5 px-4 rounded-xl bg-[#5a25eb] hover:bg-[#6b37fa] text-white text-xs font-semibold transition-colors disabled:opacity-60"
              >
                {isLoading ? 'Creating profile...' : 'Continue'}
              </button>
            </form>
          ) : (
            <button
              onClick={handleGoogleAuth}
              type="button"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl border border-zinc-200 dark:border-[#2b2b3a] bg-zinc-50 dark:bg-[#15151f] hover:bg-zinc-100 dark:hover:bg-[#1d1d2b] text-xs font-semibold text-zinc-800 dark:text-[#e4e1e8] transition-all disabled:opacity-60"
            >
              {isLoading ? (
                <span className="w-4 h-4 rounded-full border-2 border-zinc-300 border-t-[#5a25eb] animate-spin" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.4l3.7 2.9C6.5 7.4 9 5 12 5z" />
                  <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z" />
                  <path fill="#FBBC05" d="M5.6 14.7c-.2-.7-.4-1.5-.4-2.7s.1-2 .4-2.7L1.9 6.4C.7 8.8 0 10.3 0 12s.7 3.2 1.9 5.6l3.7-2.9z" />
                  <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2-6.4-4.8L1.9 16.4C3.7 20.2 7.5 23 12 23z" />
                </svg>
              )}
              <span>Continue with Google</span>
            </button>
          )}

          {(error || authError) && (
            <p role="alert" className="text-xs text-red-600 dark:text-red-400">
              {error || authError}
            </p>
          )}
        </motion.div>
      </div>

    </div>
  );
};

import React, { useState } from 'react';
import { useNavigation } from '../../context/NavigationContext';
import { useTheme } from '../../context/ThemeContext';
import {
  Lock,
  ArrowRight,
  CheckCircle2,
  KeyRound,
  Mail,
  ChevronLeft,
  Sun,
  Moon,
  Eye,
  EyeOff,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { motion } from 'framer-motion';

export const AuthPage: React.FC = () => {
  const { navigate, setIsAuthenticated, userName } = useNavigation();
  const { theme, toggleTheme } = useTheme();

  const [tab, setTab] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('indresh@example.com');
  const [password, setPassword] = useState('••••••••••••');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || isSuccess) return;

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setIsSuccess(true);
      setTimeout(() => {
        setIsAuthenticated(true);
        navigate('/memory');
      }, 600);
    }, 800);
  };

  const handleGoogleAuth = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setIsSuccess(true);
      setTimeout(() => {
        setIsAuthenticated(true);
        navigate('/memory');
      }, 500);
    }, 600);
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
                {tab === 'signin' ? 'Unlock Sovereign Vault' : 'Create Sovereign Vault'}
              </h1>
              <p className="text-xs text-zinc-500 dark:text-[#8c879a]">
                Client-side encrypted life-stage record network
              </p>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="grid grid-cols-2 p-1 bg-zinc-100 dark:bg-[#15151f] rounded-xl border border-zinc-200 dark:border-[#222230]">
            <button
              onClick={() => setTab('signin')}
              className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                tab === 'signin'
                  ? 'bg-[#5a25eb] text-white shadow-md shadow-[#5a25eb]/30'
                  : 'text-zinc-600 dark:text-[#8c879a] hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setTab('signup')}
              className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                tab === 'signup'
                  ? 'bg-[#5a25eb] text-white shadow-md shadow-[#5a25eb]/30'
                  : 'text-zinc-600 dark:text-[#8c879a] hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              Create Vault
            </button>
          </div>

          {/* Quick Demo Fill Pill */}
          <div className="p-2.5 rounded-xl bg-[#5a25eb]/10 dark:bg-[#5a25eb]/15 border border-[#5a25eb]/20 dark:border-[#5a25eb]/30 flex items-center justify-between text-xs">
            <span className="text-zinc-700 dark:text-[#cbbeff] flex items-center gap-1.5 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-[#5a25eb] dark:text-[#cbbeff]" />
              <span>Demo Account: <strong>{userName}</strong></span>
            </span>
            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              Auto-filled
            </span>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-medium text-zinc-700 dark:text-[#a29db0] mb-1.5">
                Vault Primary Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-400 dark:text-[#71717a] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-[#15151f] border border-zinc-200 dark:border-[#2b2b3a] text-xs text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-[#63637e] focus:outline-none focus:border-[#5a25eb] focus:ring-1 focus:ring-[#5a25eb] transition-all"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block font-medium text-zinc-700 dark:text-[#a29db0]">
                  Master Passkey
                </label>
                {tab === 'signin' && (
                  <span className="text-[11px] text-[#5a25eb] dark:text-[#cbbeff] hover:underline cursor-pointer">
                    Recover Key
                  </span>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-400 dark:text-[#71717a] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-zinc-50 dark:bg-[#15151f] border border-zinc-200 dark:border-[#2b2b3a] text-xs text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-[#63637e] focus:outline-none focus:border-[#5a25eb] focus:ring-1 focus:ring-[#5a25eb] transition-all"
                  placeholder="Enter master passkey"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-[#71717a] hover:text-zinc-700 dark:hover:text-white cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || isSuccess}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#5a25eb] hover:bg-[#6b37fa] text-white text-xs font-semibold transition-all shadow-lg shadow-[#5a25eb]/30 hover:scale-[1.01] cursor-pointer disabled:opacity-75"
            >
              {isSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>Vault Unlocked • Redirecting...</span>
                </>
              ) : isLoading ? (
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  <span>Decrypting Memory Envelope...</span>
                </div>
              ) : (
                <>
                  <span>{tab === 'signin' ? 'Unlock Personal Vault' : 'Initialize Encrypted Vault'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="w-full border-t border-zinc-200 dark:border-[#222230]" />
            <span className="bg-white dark:bg-[#0c0c12] px-3 text-[10px] text-zinc-400 dark:text-[#71717a] uppercase tracking-widest">
              Or Authenticate With
            </span>
          </div>

          {/* Google Auth Button */}
          <button
            onClick={handleGoogleAuth}
            type="button"
            className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl border border-zinc-200 dark:border-[#2b2b3a] bg-zinc-50 dark:bg-[#15151f] hover:bg-zinc-100 dark:hover:bg-[#1d1d2b] text-xs font-semibold text-zinc-800 dark:text-[#e4e1e8] transition-all cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.4l3.7 2.9C6.5 7.4 9 5 12 5z"
              />
              <path
                fill="#4285F4"
                d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
              />
              <path
                fill="#FBBC05"
                d="M5.6 14.7c-.2-.7-.4-1.5-.4-2.7s.1-2 .4-2.7L1.9 6.4C.7 8.8 0 10.3 0 12s.7 3.2 1.9 5.6l3.7-2.9z"
              />
              <path
                fill="#34A853"
                d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2-6.4-4.8L1.9 16.4C3.7 20.2 7.5 23 12 23z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>
        </motion.div>
      </div>

      {/* Security & Sovereign Ownership Guarantee Badges */}
      <footer className="max-w-md mx-auto w-full text-center space-y-2 z-10 py-2">
        <div className="flex items-center justify-center gap-3 sm:gap-6 text-[11px] text-zinc-500 dark:text-[#8c879a]">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>100% User Governed</span>
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <KeyRound className="w-3.5 h-3.5 text-[#5a25eb] dark:text-[#cbbeff]" />
            <span>Client-Side Enclave</span>
          </span>
        </div>
        <p className="text-[10px] text-zinc-400 dark:text-[#52525b]">
          SYNDEO AI Protocol • No third-party data broker sharing.
        </p>
      </footer>
    </div>
  );
};

import React, { useState } from 'react';
import { initialRecords } from '../../data/mockData';
import type { LifeStageCategory, RecordField } from '../../types';
import { StatusBadge } from '../common/Badge';
import { Modal } from '../common/Modal';
import {
  ArrowRight,
  ShieldCheck,
  Lock,
  Database,
  Bot,
  Share2,
  FileCheck,
  CheckCircle2,
  QrCode,
  Layers,
  HelpCircle,
  ChevronRight,
  Sparkles,
  Send,
  Plus,
  Check,
} from 'lucide-react';
import { motion } from 'framer-motion';

export const HomePage: React.FC = () => {
  // Centerpiece visualizer mode
  const [bannerMode, setBannerMode] = useState<'topology' | 'citations' | 'sharing'>('topology');

  // Interactive In-Page Auth Modal
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authTab, setAuthTab] = useState<'signin' | 'signup'>('signin');
  const [authSuccess, setAuthSuccess] = useState<boolean>(false);

  // In-Page Memory Category Filter
  const [memoryTab, setMemoryTab] = useState<LifeStageCategory | 'all'>('all');
  const [inPageRecords, setInPageRecords] = useState<RecordField[]>(initialRecords);
  const [isAddRecordOpen, setIsAddRecordOpen] = useState<boolean>(false);
  const [newFieldName, setNewFieldName] = useState<string>('');
  const [newFieldValue, setNewFieldValue] = useState<string>('');
  const [newFieldCat, setNewFieldCat] = useState<LifeStageCategory>('identity');

  // In-Page Interactive Chat Assistant Sandbox
  const [chatInput, setChatInput] = useState<string>('');
  const [chatMessages, setChatMessages] = useState<
    {
      sender: 'user' | 'assistant';
      text: string;
      sourceType?: 'evidence-backed' | 'unknown' | 'user-confirmed';
      evidenceDoc?: string;
      time: string;
    }[]
  >([
    {
      sender: 'user',
      text: 'What college did I attend and what is my CGPA?',
      time: '10:14 AM',
    },
    {
      sender: 'assistant',
      text: 'You attended **SLRTCE (Shree L. R. Tiwari College of Engineering)**, completing a Bachelor of Engineering in Computer Science with a cumulative GPA of **8.45 / 10.0**.',
      sourceType: 'evidence-backed',
      evidenceDoc: 'Degree_Certificate_SLRTCE_2024.pdf',
      time: '10:14 AM',
    },
    {
      sender: 'user',
      text: 'What is my passport number?',
      time: '10:15 AM',
    },
    {
      sender: 'assistant',
      text: 'I don’t have that information in your memory. Your passport scan is uploaded, but the passport number field is currently unindexed.',
      sourceType: 'unknown',
      time: '10:15 AM',
    },
  ]);
  const [isAiTyping, setIsAiTyping] = useState<boolean>(false);

  // In-Page Selective Sharing Sandbox
  const [shareFields, setShareFields] = useState<Record<string, boolean>>({
    fullName: true,
    email: true,
    college: true,
    degree: true,
    cgpa: false,
    address: false,
  });
  const [shareExpiry, setShareExpiry] = useState<'1h' | '24h' | '7d' | 'never'>('24h');
  const [isRevoked, setIsRevoked] = useState<boolean>(false);
  const [showQrModal, setShowQrModal] = useState<boolean>(false);

  // Smooth scroll helper
  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Chat message submission
  const handleChatSubmit = (customText?: string) => {
    const textToSend = customText || chatInput;
    if (!textToSend.trim() || isAiTyping) return;

    const userMsg = {
      sender: 'user' as const,
      text: textToSend,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput('');
    setIsAiTyping(true);

    setTimeout(() => {
      let response;
      const lower = textToSend.toLowerCase();
      if (lower.includes('college') || lower.includes('education') || lower.includes('degree')) {
        response = {
          sender: 'assistant' as const,
          text: 'You attended **SLRTCE (Shree L. R. Tiwari College of Engineering)** graduating in Computer Science (8.45 CGPA).',
          sourceType: 'evidence-backed' as const,
          evidenceDoc: 'Degree_Certificate_SLRTCE_2024.pdf',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
      } else if (lower.includes('cgpa') || lower.includes('grade')) {
        response = {
          sender: 'assistant' as const,
          text: 'Your verified CGPA is **8.45 / 10.0**.',
          sourceType: 'evidence-backed' as const,
          evidenceDoc: 'Final_Semester_Transcript_SLRTCE.pdf',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
      } else if (lower.includes('employment') || lower.includes('job') || lower.includes('work')) {
        response = {
          sender: 'assistant' as const,
          text: 'Current Role: **Systems & Cloud Engineer at Veritas Technologies** (2.5 Years total verified experience).',
          sourceType: 'evidence-backed' as const,
          evidenceDoc: 'Employment_Offer_Letter_Veritas.pdf',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
      } else if (lower.includes('missing')) {
        response = {
          sender: 'assistant' as const,
          text: 'Currently unindexed: Passport number, Dental records, and Emergency contact.',
          sourceType: 'unknown' as const,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
      } else {
        response = {
          sender: 'assistant' as const,
          text: 'Found 1 verified reference in your memory envelope with attached evidence proof.',
          sourceType: 'user-confirmed' as const,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
      }

      setChatMessages((prev) => [...prev, response]);
      setIsAiTyping(false);
    }, 600);
  };

  // Add record handler
  const handleAddQuickRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFieldName.trim() || !newFieldValue.trim()) return;

    const newRec: RecordField = {
      id: `rec-${Date.now()}`,
      category: newFieldCat,
      fieldName: newFieldName,
      value: newFieldValue,
      source: 'Confirmed by you',
      lastUpdated: 'Just now',
      confidence: 'user-confirmed',
    };

    setInPageRecords([newRec, ...inPageRecords]);
    setIsAddRecordOpen(false);
    setNewFieldName('');
    setNewFieldValue('');
  };

  const toggleShareField = (key: string) => {
    setShareFields((prev) => ({ ...prev, [key]: !prev[key] }));
    setIsRevoked(false);
  };

  const selectedCount = Object.values(shareFields).filter(Boolean).length;

  const filteredMemoryRecords = inPageRecords.filter(
    (r) => memoryTab === 'all' || r.category === memoryTab
  );

  return (
    <div className="space-y-24 sm:space-y-32 text-zinc-900 dark:text-white transition-colors duration-200">
      {/* 1. Hero Section */}
      <section className="relative pt-8 sm:pt-16 pb-6 overflow-hidden hero-glow">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          {/* Top Announcement Chip */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full border border-zinc-200 dark:border-[#2d2a45] bg-white/90 dark:bg-[#100f1c]/90 text-xs text-[#5a25eb] dark:text-[#cbbeff] shadow-sm shadow-[#5a25eb]/10 dark:shadow-[#5a25eb]/20"
          >
            <span className="w-2 h-2 rounded-full bg-[#5a25eb] animate-pulse" />
            <span className="font-semibold tracking-wide">SYNDEO AI — Life-Stage Record Network</span>
            <span className="text-zinc-300 dark:text-[#6d6b82]">•</span>
            <span className="text-zinc-500 dark:text-[#a1a1aa] hidden sm:inline">Store Once, Reused Everywhere</span>
          </motion.div>

          {/* Main Headline */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.08 }}
            className="space-y-4 max-w-4xl mx-auto"
          >
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-zinc-900 dark:text-white leading-[1.1]">
              Your information.{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#5a25eb] via-[#8a54ff] to-[#5a25eb] dark:from-[#d0bcff] dark:via-[#8a54ff] dark:to-[#cbbeff]">
                Organized once.
              </span>{' '}
              Reused everywhere.
            </h1>

            <p className="text-base sm:text-xl text-zinc-600 dark:text-[#a1a1aa] leading-relaxed max-w-2xl mx-auto pt-2 font-normal">
              Store your personal information and records in one place, understand what you have with verifiable citations, and share only what is needed.
            </p>
          </motion.div>

          {/* In-Page Interactive Hero CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.16 }}
            className="flex flex-wrap items-center justify-center gap-3 pt-2"
          >
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#5a25eb] hover:bg-[#6b37fa] text-white font-semibold text-sm transition-all shadow-lg shadow-[#5a25eb]/30 hover:scale-[1.02] cursor-pointer"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => scrollToSection('memory-explorer')}
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white dark:bg-[#101015] hover:bg-zinc-50 dark:hover:bg-[#181822] border border-zinc-200 dark:border-[#272736] text-zinc-800 dark:text-[#f4f4f6] font-semibold text-sm transition-all hover:border-[#5a25eb]/60 shadow-sm dark:shadow-none cursor-pointer"
            >
              <Database className="w-4 h-4 text-[#5a25eb] dark:text-[#cbbeff]" />
              <span>Explore Memory</span>
            </button>

            <button
              onClick={() => scrollToSection('ai-assistant')}
              className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl bg-white dark:bg-[#0a0a0f] hover:bg-zinc-50 dark:hover:bg-[#14141d] border border-zinc-200 dark:border-[#20202d] text-zinc-600 dark:text-[#a1a1aa] hover:text-zinc-900 dark:hover:text-white font-medium text-sm transition-all shadow-sm dark:shadow-none cursor-pointer"
            >
              <Bot className="w-4 h-4 text-[#5a25eb] dark:text-[#cbbeff]" />
              <span>Ask Personal AI</span>
            </button>

            <button
              onClick={() => scrollToSection('selective-sharing')}
              className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl bg-white dark:bg-[#0a0a0f] hover:bg-zinc-50 dark:hover:bg-[#14141d] border border-zinc-200 dark:border-[#20202d] text-zinc-600 dark:text-[#a1a1aa] hover:text-zinc-900 dark:hover:text-white font-medium text-sm transition-all shadow-sm dark:shadow-none cursor-pointer"
            >
              <Share2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Selective Share</span>
            </button>
          </motion.div>

          {/* Trust Guarantees Metric Bar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.24 }}
            className="pt-6 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs text-zinc-500 dark:text-[#71717a]"
          >
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-[#34d399]" />
              <span className="text-zinc-700 dark:text-[#a1a1aa]">100% User Governed</span>
            </div>
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#5a25eb] dark:text-[#cbbeff]" />
              <span className="text-zinc-700 dark:text-[#a1a1aa]">Client-Side Encryption</span>
            </div>
            <div className="flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-zinc-700 dark:text-[#a1a1aa]">Evidence-Backed Citations</span>
            </div>
            <div className="flex items-center gap-2">
              <QrCode className="w-4 h-4 text-[#5a25eb] dark:text-[#cbbeff]" />
              <span className="text-zinc-700 dark:text-[#a1a1aa]">Ephemeral QR Scoping</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 2. Visual Centerpiece Banner Showcase */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl p-1 bg-gradient-to-b from-[#5a25eb]/20 dark:from-[#320099]/40 via-zinc-100 dark:via-[#181828]/60 to-zinc-200 dark:to-[#0c0c14] border border-zinc-200 dark:border-[#2b2740] shadow-2xl overflow-hidden">
          {/* Top Bar Header on Banner */}
          <div className="bg-white/95 dark:bg-[#09090e]/90 px-4 sm:px-6 py-3.5 border-b border-zinc-200 dark:border-[#1f1f2e] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-[#14141f] border border-zinc-200 dark:border-[#2b2b3d] flex items-center justify-center p-0.5">
                <img src="/logo.png" alt="SYNDEO AI Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <span className="text-xs font-bold text-zinc-900 dark:text-white tracking-wide">
                  SYNDEO AI Life-Stage Architecture Live Visualizer
                </span>
                <p className="text-[10px] text-zinc-500 dark:text-[#71717a]">
                  Interactive Multi-Tier Envelope: Ingestion • Assistant • Disclosure
                </p>
              </div>
            </div>

            {/* Interactive Mode Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-zinc-100 dark:bg-[#12121c] rounded-lg border border-zinc-200 dark:border-[#222232]">
              {(
                [
                  { id: 'topology', label: 'Topology View' },
                  { id: 'citations', label: 'AI Citations' },
                  { id: 'sharing', label: 'Selective Disclosure' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setBannerMode(tab.id)}
                  className={`px-3 py-1 text-[11px] font-medium rounded-md transition-all cursor-pointer ${
                    bannerMode === tab.id
                      ? 'bg-[#5a25eb] text-white shadow-xs'
                      : 'text-zinc-600 dark:text-[#8c879a] hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Banner Image Container */}
          <div className="relative w-full aspect-[16/8.5] sm:aspect-[21/9] bg-zinc-900 dark:bg-[#050508] overflow-hidden flex items-center justify-center">
            <img
              src="/banner.png"
              alt="Unified Life-Stage Network Banner"
              className="w-full h-full object-cover object-center opacity-95 transition-all duration-300"
            />

            {/* Ambient Radial Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/20 pointer-events-none" />

            {/* Floating Live Indicator Badges */}
            <div className="absolute top-4 left-4 hidden sm:flex items-center gap-2 p-2.5 rounded-xl bg-black/80 backdrop-blur-md border border-white/10 text-xs text-white">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="font-mono text-[11px] text-[#cbbeff]">
                19 ENCRYPTED RECORDS INDEXED
              </span>
            </div>

            <div className="absolute bottom-4 right-4 hidden sm:flex items-center gap-2 p-2.5 rounded-xl bg-black/80 backdrop-blur-md border border-white/10 text-xs text-white">
              <ShieldCheck className="w-4 h-4 text-[#34d399]" />
              <span className="font-mono text-[11px] text-emerald-300">
                EVIDENCE_PROOFS: ATTACHED
              </span>
            </div>

            {/* Mode-Dependent Dynamic Floating Highlights */}
            {bannerMode === 'citations' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute inset-x-6 bottom-6 sm:inset-x-auto sm:left-6 sm:bottom-6 sm:max-w-md p-4 rounded-2xl bg-black/90 backdrop-blur-xl border border-[#5a25eb]/50 text-xs space-y-1.5 shadow-2xl"
              >
                <div className="flex items-center justify-between text-[#cbbeff] font-semibold">
                  <span className="flex items-center gap-1.5">
                    <Bot className="w-3.5 h-3.5 text-[#cbbeff]" /> Live Citation Proof
                  </span>
                  <span className="text-[10px] text-emerald-400 font-mono">100% MATCH</span>
                </div>
                <p className="text-white text-xs">
                  &ldquo;Graduated from SLRTCE (BE Computer Science) with 8.45 CGPA.&rdquo;
                </p>
                <p className="text-[10px] text-[#a1a1aa] font-mono flex items-center gap-1">
                  <FileCheck className="w-3 h-3 text-emerald-400" />
                  Degree_Certificate_SLRTCE_2024.pdf
                </p>
              </motion.div>
            )}

            {bannerMode === 'sharing' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute inset-x-6 bottom-6 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:max-w-md p-4 rounded-2xl bg-black/90 backdrop-blur-xl border border-emerald-500/40 text-xs space-y-1.5 shadow-2xl"
              >
                <div className="flex items-center justify-between text-emerald-400 font-semibold">
                  <span className="flex items-center gap-1.5">
                    <Share2 className="w-3.5 h-3.5 text-emerald-400" /> Selective Grant
                  </span>
                  <span className="text-[10px] text-[#cbbeff] font-mono">EXPIRES IN 24H</span>
                </div>
                <p className="text-white text-xs">
                  Sharing 4 fields with Acme University. Address and PAN remain masked.
                </p>
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* 3. Core Architecture Pipeline */}
      <section id="lifecycle" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#5a25eb]/10 dark:bg-[#181824] border border-[#5a25eb]/20 dark:border-[#2a2a3e] text-[11px] font-mono text-[#5a25eb] dark:text-[#cbbeff]">
            <span>THE UNIFIED PIPELINE</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900 dark:text-white">
            Store once → Understand → Reuse → Share selectively
          </h2>
          <p className="text-sm text-zinc-600 dark:text-[#a1a1aa] leading-relaxed">
            Eliminate repetitive form filling and unvetted document sharing with a continuous personal record protocol.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              step: '01',
              title: 'Store Once',
              category: 'Ingestion',
              desc: 'Upload official transcripts, offer letters, passports, and medical cards once. Stored in an encrypted client container.',
              icon: Database,
              pill: 'Local Vault',
              target: 'memory-explorer',
            },
            {
              step: '02',
              title: 'Understand',
              category: 'Intelligence',
              desc: 'Your private memory assistant extracts structured records with direct linkable citations to source documents.',
              icon: Bot,
              pill: 'Exact Citations',
              target: 'ai-assistant',
            },
            {
              step: '03',
              title: 'Reuse',
              category: 'Persistence',
              desc: 'Re-apply for higher education, jobs, or medical visits without uploading or manually re-typing the same data.',
              icon: Layers,
              pill: 'Zero Redundancy',
              target: 'memory-explorer',
            },
            {
              step: '04',
              title: 'Share Selectively',
              category: 'Consent Control',
              desc: 'Choose only the specific fields needed per request. Issue time-bounded links or QR codes and revoke anytime.',
              icon: Share2,
              pill: 'Scoped Access',
              target: 'selective-sharing',
            },
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: idx * 0.06 }}
                onClick={() => scrollToSection(item.target)}
                className="p-6 rounded-2xl bg-white dark:bg-[#08080c] border border-zinc-200 dark:border-[#1c1c28] hover:border-[#5a25eb]/60 dark:hover:border-[#5a25eb]/60 hover:bg-zinc-50 dark:hover:bg-[#0e0e16] shadow-sm dark:shadow-none transition-all flex flex-col justify-between space-y-4 group cursor-pointer"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-mono font-bold text-[#5a25eb] dark:text-[#cbbeff] bg-[#5a25eb]/10 dark:bg-[#5a25eb]/15 px-2.5 py-1 rounded-md border border-[#5a25eb]/25 dark:border-[#5a25eb]/30">
                      {item.step}
                    </span>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 dark:text-[#71717a]">
                      {item.category}
                    </span>
                  </div>

                  <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-[#14141e] border border-zinc-200 dark:border-[#252535] flex items-center justify-center mb-3 text-[#5a25eb] dark:text-[#cbbeff] group-hover:bg-[#5a25eb]/15 transition-colors">
                    <Icon className="w-5 h-5" />
                  </div>

                  <h3 className="text-base font-bold text-zinc-900 dark:text-white group-hover:text-[#5a25eb] dark:group-hover:text-[#cbbeff] transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-[#8c879a] mt-2 leading-relaxed">{item.desc}</p>
                </div>

                <div className="pt-3 border-t border-zinc-200 dark:border-[#181822] flex items-center justify-between">
                  <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    {item.pill}
                  </span>
                  <span className="text-[11px] font-medium text-zinc-500 dark:text-[#71717a] group-hover:text-[#5a25eb] dark:group-hover:text-[#cbbeff] flex items-center gap-1">
                    Try below <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* 4. Interactive Sandbox 1: Personal AI Assistant In-Page Simulator */}
      <section id="ai-assistant" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-zinc-200 dark:border-[#181820] pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#5a25eb]/10 dark:bg-[#5a25eb]/15 border border-[#5a25eb]/25 dark:border-[#5a25eb]/30 text-[11px] font-mono text-[#5a25eb] dark:text-[#cbbeff] mb-2">
              <Bot className="w-3.5 h-3.5" />
              <span>INTERACTIVE AI ASSISTANT</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
              Ask Your Personal Memory
            </h2>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-[#a1a1aa] mt-1">
              Test asking real queries without page redirection. Every answer links strictly to verified evidence.
            </p>
          </div>
          <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20">
            ZERO HALLUCINATION
          </span>
        </div>

        {/* Live Chat Panel */}
        <div className="rounded-3xl bg-white dark:bg-[#08080c] border border-zinc-200 dark:border-[#1f1f2c] overflow-hidden flex flex-col shadow-xl dark:shadow-none">
          {/* Preset Prompts Bar */}
          <div className="p-4 bg-zinc-50 dark:bg-[#0d0d14] border-b border-zinc-200 dark:border-[#181824] flex items-center gap-2 overflow-x-auto scrollbar-none">
            <span className="text-[11px] font-semibold text-zinc-600 dark:text-[#71717a] uppercase tracking-wider shrink-0 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#5a25eb] dark:text-[#cbbeff]" /> Try Asking:
            </span>
            {[
              'What college did I attend and what is my CGPA?',
              'Show my employment history at Veritas',
              'What is my passport number?',
              'What information am I missing?',
            ].map((preset) => (
              <button
                key={preset}
                onClick={() => handleChatSubmit(preset)}
                className="px-3 py-1 rounded-full bg-white dark:bg-[#161622] hover:bg-zinc-100 dark:hover:bg-[#202030] border border-zinc-200 dark:border-[#28283a] text-xs text-zinc-600 dark:text-[#a1a1aa] hover:text-zinc-900 dark:hover:text-white transition-colors shrink-0 cursor-pointer shadow-xs"
              >
                {preset}
              </button>
            ))}
          </div>

          {/* Chat Stream View */}
          <div className="p-6 space-y-4 max-h-[380px] overflow-y-auto bg-zinc-50/50 dark:bg-[#050508]">
            {chatMessages.map((msg, index) => {
              const isUser = msg.sender === 'user';
              return (
                <div
                  key={index}
                  className={`flex gap-3 max-w-2xl ${isUser ? 'ml-auto justify-end' : 'mr-auto justify-start'}`}
                >
                  {!isUser && (
                    <div className="w-7 h-7 rounded-lg bg-[#5a25eb] flex items-center justify-center shrink-0 text-white mt-1">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div className={`space-y-1.5 ${isUser ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                        isUser
                          ? 'bg-[#5a25eb] text-white rounded-br-none shadow-sm'
                          : 'bg-white dark:bg-[#12121a] border border-zinc-200 dark:border-[#222232] text-zinc-900 dark:text-[#f4f4f6] rounded-bl-none shadow-sm dark:shadow-none'
                      }`}
                    >
                      <div className="whitespace-pre-line">{msg.text}</div>
                    </div>

                    {/* Evidence citation pill */}
                    {!isUser && msg.sourceType && (
                      <div className="flex items-center gap-2 pt-0.5">
                        {msg.sourceType === 'evidence-backed' && (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-mono bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                            <FileCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            <span>Evidence: {msg.evidenceDoc}</span>
                          </span>
                        )}

                        {msg.sourceType === 'unknown' && (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-mono bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400">
                            <HelpCircle className="w-3 h-3 text-red-600 dark:text-red-400" />
                            <span>Unindexed in memory</span>
                          </span>
                        )}

                        <span className="text-[10px] text-zinc-400 dark:text-[#52525b]">{msg.time}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {isAiTyping && (
              <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-[#a1a1aa] bg-white dark:bg-[#12121a] p-3 rounded-xl border border-zinc-200 dark:border-[#222232] w-fit shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-[#5a25eb] dark:bg-[#cbbeff] animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#5a25eb] dark:bg-[#cbbeff] animate-bounce" style={{ animationDelay: '0.15s' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-[#5a25eb] dark:bg-[#cbbeff] animate-bounce" style={{ animationDelay: '0.3s' }} />
                <span className="ml-1 text-[11px]">Searching personal memory citations...</span>
              </div>
            )}
          </div>

          {/* Chat Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleChatSubmit();
            }}
            className="p-4 bg-white dark:bg-[#0d0d14] border-t border-zinc-200 dark:border-[#181824] flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Ask anything about your stored life stages..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-[#050508] border border-zinc-200 dark:border-[#242436] text-xs sm:text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-[#52525b] focus:outline-none focus:border-[#5a25eb]"
            />
            <button
              type="submit"
              disabled={!chatInput.trim() || isAiTyping}
              className="p-2.5 rounded-xl bg-[#5a25eb] hover:bg-[#6b37fa] text-white disabled:opacity-40 transition-colors cursor-pointer shadow-sm"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </section>

      {/* 5. Interactive Sandbox 2: Life-Stage Memory Explorer In-Page */}
      <section id="memory-explorer" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-zinc-200 dark:border-[#181820] pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-[11px] font-mono text-emerald-600 dark:text-emerald-400 mb-2">
              <Database className="w-3.5 h-3.5" />
              <span>LIVE MEMORY EXPLORER</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
              Inspect Encrypted Records
            </h2>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-[#a1a1aa] mt-1">
              Categorized attributes with verifiable proof attachments. Click any category to filter in-place.
            </p>
          </div>

          <button
            onClick={() => setIsAddRecordOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#5a25eb] hover:bg-[#6b37fa] text-white text-xs font-semibold shadow-md shadow-[#5a25eb]/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Record In-Place</span>
          </button>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: 'all', label: 'All Records', count: inPageRecords.length },
            { id: 'identity', label: 'Identity', count: inPageRecords.filter((r) => r.category === 'identity').length },
            { id: 'education', label: 'Education', count: inPageRecords.filter((r) => r.category === 'education').length },
            { id: 'employment', label: 'Employment', count: inPageRecords.filter((r) => r.category === 'employment').length },
            { id: 'finance', label: 'Finance', count: inPageRecords.filter((r) => r.category === 'finance').length },
            { id: 'healthcare', label: 'Healthcare', count: inPageRecords.filter((r) => r.category === 'healthcare').length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setMemoryTab(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer shrink-0 ${
                memoryTab === tab.id
                  ? 'bg-[#5a25eb] text-white font-semibold shadow-sm'
                  : 'bg-white dark:bg-[#0f0f16] text-zinc-600 dark:text-[#a1a1aa] hover:text-zinc-900 dark:hover:text-white border border-zinc-200 dark:border-[#1f1f2c]'
              }`}
            >
              {tab.label} <span className="text-[10px] opacity-75 font-mono">({tab.count})</span>
            </button>
          ))}
        </div>

        {/* Records Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMemoryRecords.map((rec) => (
            <div
              key={rec.id}
              className="p-5 rounded-2xl bg-white dark:bg-[#08080c] border border-zinc-200 dark:border-[#1c1c28] hover:border-[#5a25eb]/50 transition-all space-y-3 flex flex-col justify-between shadow-sm dark:shadow-none"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 dark:text-[#71717a]">
                    {rec.fieldName}
                  </span>
                  <StatusBadge type={rec.confidence} label={rec.source} size="sm" />
                </div>
                <p className="text-sm font-bold text-zinc-900 dark:text-white leading-snug">{rec.value}</p>
                {rec.evidenceDocName && (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono mt-2 flex items-center gap-1">
                    <FileCheck className="w-3.5 h-3.5" />
                    <span>{rec.evidenceDocName}</span>
                  </p>
                )}
              </div>

              <div className="pt-2 border-t border-zinc-100 dark:border-[#14141e] flex items-center justify-between text-[10px] text-zinc-400 dark:text-[#52525b] font-mono">
                <span className="capitalize">{rec.category}</span>
                <span>Synced: {rec.lastUpdated}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 6. Interactive Sandbox 3: Selective Disclosure & QR Simulator */}
      <section id="selective-sharing" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-zinc-200 dark:border-[#181820] pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#5a25eb]/10 dark:bg-[#cbbeff]/15 border border-[#5a25eb]/25 dark:border-[#cbbeff]/30 text-[11px] font-mono text-[#5a25eb] dark:text-[#cbbeff] mb-2">
              <Share2 className="w-3.5 h-3.5" />
              <span>CONSENT & SELECTIVE DISCLOSURE</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
              Granular Sharing & Instant Revoke
            </h2>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-[#a1a1aa] mt-1">
              Toggle requested fields to generate an ephemeral, time-bounded disclosure payload without sharing extraneous data.
            </p>
          </div>
          <span className="text-xs font-mono text-[#5a25eb] dark:text-[#cbbeff]">{selectedCount} Fields Approved</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Field Toggles Card */}
          <div className="lg:col-span-7 p-6 rounded-3xl bg-white dark:bg-[#08080c] border border-zinc-200 dark:border-[#1f1f2c] space-y-5 shadow-sm dark:shadow-none">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-[#181824]">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Inbound Verification Request</h3>
                <p className="text-xs text-zinc-500 dark:text-[#71717a]">Acme University — Postgraduate Admissions</p>
              </div>
              <span className="text-[10px] font-mono bg-[#5a25eb]/10 dark:bg-[#5a25eb]/20 text-[#5a25eb] dark:text-[#cbbeff] px-2.5 py-1 rounded-md border border-[#5a25eb]/25 dark:border-[#5a25eb]/30">
                ACTIVE
              </span>
            </div>

            <div className="space-y-2">
              {[
                { key: 'fullName', label: 'Full Legal Name', val: 'Indresh' },
                { key: 'email', label: 'Primary Email', val: 'indresh@example.com' },
                { key: 'college', label: 'College / University', val: 'SLRTCE (Shree L. R. Tiwari)' },
                { key: 'degree', label: 'Degree & Major', val: 'BE Computer Science' },
                { key: 'cgpa', label: 'CGPA (8.45 / 10.0)', val: '8.45 (Final Transcript)' },
                { key: 'address', label: 'Residential Address', val: '402 Cyber Heights, Mumbai' },
              ].map((fld) => {
                const isSelected = shareFields[fld.key];
                return (
                  <div
                    key={fld.key}
                    onClick={() => toggleShareField(fld.key)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-[#5a25eb]/5 dark:bg-[#12121e] border-[#5a25eb]/60 text-zinc-900 dark:text-white'
                        : 'bg-zinc-50 dark:bg-[#0a0a0f] border-zinc-200 dark:border-[#181822] text-zinc-400 dark:text-[#71717a] opacity-70'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                          isSelected ? 'bg-[#5a25eb] border-[#5a25eb]' : 'border-zinc-300 dark:border-[#383644]'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-zinc-900 dark:text-white">{fld.label}</p>
                        <p className="text-[11px] text-zinc-500 dark:text-[#71717a] font-mono">{fld.val}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-[#5a25eb] dark:text-[#cbbeff]">
                      {isSelected ? 'SHARED' : 'HIDDEN'}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Expiry Selector */}
            <div className="pt-2 border-t border-zinc-200 dark:border-[#181824] flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-600 dark:text-[#a1a1aa]">Link Expiration:</span>
              <div className="flex items-center gap-1.5">
                {(['1h', '24h', '7d', 'never'] as const).map((exp) => (
                  <button
                    key={exp}
                    onClick={() => setShareExpiry(exp)}
                    className={`px-2.5 py-1 rounded-md text-xs font-mono transition-colors cursor-pointer ${
                      shareExpiry === exp
                        ? 'bg-[#5a25eb] text-white font-bold'
                        : 'bg-zinc-100 dark:bg-[#12121a] text-zinc-600 dark:text-[#71717a] hover:text-zinc-900 dark:hover:text-white'
                    }`}
                  >
                    {exp.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Live Scoped Output Card */}
          <div className="lg:col-span-5 p-6 rounded-3xl bg-white dark:bg-[#08080c] border border-zinc-200 dark:border-[#1f1f2c] space-y-4 flex flex-col justify-between shadow-sm dark:shadow-none">
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-[#181824]">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white">
                  Live Disclosure Payload
                </h3>
                <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                  {isRevoked ? 'REVOKED' : 'EPHEMERAL_ACTIVE'}
                </span>
              </div>

              {isRevoked ? (
                <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/30 text-center space-y-2 text-red-500 dark:text-red-400">
                  <p className="text-xs font-bold">Access Grant Revoked</p>
                  <p className="text-[11px] text-zinc-500 dark:text-[#8c879a]">
                    The recipient endpoint will immediately receive a 403 Cryptographic Revocation response.
                  </p>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-[#050508] border border-zinc-200 dark:border-[#1a1a26] space-y-2 font-mono text-xs">
                  <div className="text-zinc-500 dark:text-[#71717a] text-[10px] pb-1 border-b border-zinc-200 dark:border-[#14141e]">
                    // Payload for Acme University
                  </div>
                  {selectedCount === 0 ? (
                    <p className="text-zinc-400 dark:text-[#52525b] py-4 text-center">No fields disclosed.</p>
                  ) : (
                    <div className="space-y-1 text-[#5a25eb] dark:text-[#cbbeff]">
                      {shareFields.fullName && <div>&quot;name&quot;: &quot;Indresh&quot;,</div>}
                      {shareFields.email && <div>&quot;email&quot;: &quot;indresh@example.com&quot;,</div>}
                      {shareFields.college && <div>&quot;college&quot;: &quot;SLRTCE&quot;,</div>}
                      {shareFields.degree && <div>&quot;degree&quot;: &quot;BE Computer Science&quot;,</div>}
                      {shareFields.cgpa && <div>&quot;cgpa&quot;: &quot;8.45&quot;,</div>}
                      {shareFields.address && <div>&quot;address&quot;: &quot;402 Cyber Heights...&quot;,</div>}
                    </div>
                  )}
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400 pt-1">
                    // Expiry: {shareExpiry.toUpperCase()} • Zero Tracking
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-zinc-200 dark:border-[#181824] flex items-center gap-2">
              <button
                onClick={() => setShowQrModal(true)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#5a25eb] hover:bg-[#6b37fa] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Show QR Code</span>
              </button>

              <button
                onClick={() => setIsRevoked(!isRevoked)}
                className={`py-2.5 px-3 rounded-xl border text-xs font-medium transition-colors cursor-pointer ${
                  isRevoked
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20'
                }`}
              >
                {isRevoked ? 'Re-authorize' : 'Revoke Access'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Bottom Hero Banner */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl p-8 sm:p-12 bg-gradient-to-r from-[#5a25eb]/10 dark:from-[#140b28] via-zinc-100 dark:via-[#0b0b14] to-[#5a25eb]/15 dark:to-[#120822] border border-zinc-200 dark:border-[#322552] text-center space-y-6 relative overflow-hidden shadow-sm dark:shadow-none">
          <div className="w-12 h-12 rounded-2xl bg-[#5a25eb] flex items-center justify-center mx-auto text-white shadow-xl shadow-[#5a25eb]/30">
            <img src="/logo.png" alt="Unified" className="w-8 h-8 object-contain" />
          </div>

          <div className="space-y-2 max-w-xl mx-auto">
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-zinc-900 dark:text-white">
              Take sovereign control of your personal records today.
            </h2>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-[#a1a1aa]">
              Store once, understand with verified citations, and share selectively with complete peace of mind.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="px-6 py-3 rounded-xl bg-[#5a25eb] hover:bg-[#6b37fa] text-white font-semibold text-xs sm:text-sm transition-all shadow-lg shadow-[#5a25eb]/25 cursor-pointer"
            >
              Get Started In-Place
            </button>
            <button
              onClick={() => scrollToSection('memory-explorer')}
              className="px-6 py-3 rounded-xl bg-white dark:bg-[#12121c] hover:bg-zinc-50 dark:hover:bg-[#1a1a26] border border-zinc-300 dark:border-[#2b2b3e] text-zinc-800 dark:text-white font-semibold text-xs sm:text-sm transition-all shadow-sm dark:shadow-none cursor-pointer"
            >
              Explore Memory Records
            </button>
          </div>
        </div>
      </section>

      {/* Modal 1: In-Page Quick Auth Modal */}
      <Modal
        isOpen={isAuthModalOpen}
        onClose={() => {
          setIsAuthModalOpen(false);
          setAuthSuccess(false);
        }}
        title={authTab === 'signin' ? 'Sign In to SYNDEO AI Vault' : 'Create Sovereign Vault'}
        subtitle="Secure client authorization"
      >
        {authSuccess ? (
          <div className="py-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-zinc-900 dark:text-white">Vault Unlocked Successfully</h4>
            <p className="text-xs text-zinc-600 dark:text-[#a1a1aa]">
              Your encrypted personal memory container is now synchronized.
            </p>
            <button
              onClick={() => {
                setIsAuthModalOpen(false);
                setAuthSuccess(false);
                scrollToSection('memory-explorer');
              }}
              className="px-5 py-2 rounded-xl bg-[#5a25eb] text-white text-xs font-semibold cursor-pointer"
            >
              Continue to Memory
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 p-1 bg-zinc-100 dark:bg-[#0e0e14] rounded-lg border border-zinc-200 dark:border-[#222230]">
              <button
                onClick={() => setAuthTab('signin')}
                className={`py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  authTab === 'signin' ? 'bg-[#5a25eb] text-white' : 'text-zinc-600 dark:text-[#71717a]'
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => setAuthTab('signup')}
                className={`py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  authTab === 'signup' ? 'bg-[#5a25eb] text-white' : 'text-zinc-600 dark:text-[#71717a]'
                }`}
              >
                Create Account
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setAuthSuccess(true);
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block text-zinc-600 dark:text-[#a1a1aa] mb-1">Email</label>
                <input
                  type="email"
                  defaultValue="indresh@example.com"
                  className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-[#0a0a0f] border border-zinc-300 dark:border-[#242436] text-zinc-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-zinc-600 dark:text-[#a1a1aa] mb-1">Master Password</label>
                <input
                  type="password"
                  defaultValue="••••••••••••"
                  className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-[#0a0a0f] border border-zinc-300 dark:border-[#242436] text-zinc-900 dark:text-white"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-lg bg-[#5a25eb] hover:bg-[#6b37fa] text-white font-semibold transition-colors cursor-pointer shadow-md"
              >
                {authTab === 'signin' ? 'Unlock Vault' : 'Initialize Vault'}
              </button>
            </form>
          </div>
        )}
      </Modal>

      {/* Modal 2: Quick Add Record In-Place */}
      <Modal
        isOpen={isAddRecordOpen}
        onClose={() => setIsAddRecordOpen(false)}
        title="Add Information to Memory"
        subtitle="Manually confirm personal attributes across any life stage."
      >
        <form onSubmit={handleAddQuickRecord} className="space-y-3 text-xs">
          <div>
            <label className="block text-zinc-600 dark:text-[#a1a1aa] mb-1">Life Stage</label>
            <select
              value={newFieldCat}
              onChange={(e) => setNewFieldCat(e.target.value as any)}
              className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-[#0a0a0f] border border-zinc-300 dark:border-[#242436] text-zinc-900 dark:text-white"
            >
              <option value="identity">Identity</option>
              <option value="education">Education</option>
              <option value="employment">Employment</option>
              <option value="finance">Finance</option>
              <option value="healthcare">Healthcare</option>
            </select>
          </div>

          <div>
            <label className="block text-zinc-600 dark:text-[#a1a1aa] mb-1">Field Name</label>
            <input
              type="text"
              placeholder="e.g. Master's Thesis Topic"
              value={newFieldName}
              onChange={(e) => setNewFieldName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-[#0a0a0f] border border-zinc-300 dark:border-[#242436] text-zinc-900 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-zinc-600 dark:text-[#a1a1aa] mb-1">Field Value</label>
            <input
              type="text"
              placeholder="e.g. Distributed Consensus Systems"
              value={newFieldValue}
              onChange={(e) => setNewFieldValue(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-[#0a0a0f] border border-zinc-300 dark:border-[#242436] text-zinc-900 dark:text-white"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAddRecordOpen(false)}
              className="px-3.5 py-1.5 rounded-lg bg-zinc-100 dark:bg-[#14141e] text-zinc-600 dark:text-[#a1a1aa]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-[#5a25eb] text-white font-semibold cursor-pointer shadow-sm"
            >
              Save In-Place
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal 3: QR Code Visual */}
      <Modal
        isOpen={showQrModal}
        onClose={() => setShowQrModal(false)}
        title="Selective Access QR Code"
        subtitle="Point physical camera to view only the approved fields."
      >
        <div className="space-y-4 text-center py-2">
          <div className="p-6 bg-white rounded-2xl w-48 h-48 mx-auto flex items-center justify-center shadow-lg border border-zinc-200">
            <svg className="w-full h-full" viewBox="0 0 100 100" fill="none">
              <rect width="100" height="100" fill="white" />
              <rect x="10" y="10" width="25" height="25" fill="#131317" rx="3" />
              <rect x="15" y="15" width="15" height="15" fill="white" rx="1" />
              <rect x="18" y="18" width="9" height="9" fill="#5a25eb" />
              <rect x="65" y="10" width="25" height="25" fill="#131317" rx="3" />
              <rect x="70" y="15" width="15" height="15" fill="white" rx="1" />
              <rect x="73" y="18" width="9" height="9" fill="#5a25eb" />
              <rect x="10" y="65" width="25" height="25" fill="#131317" rx="3" />
              <rect x="15" y="70" width="15" height="15" fill="white" rx="1" />
              <rect x="18" y="73" width="9" height="9" fill="#5a25eb" />
              <rect x="42" y="12" width="6" height="6" fill="#131317" />
              <rect x="52" y="12" width="6" height="6" fill="#131317" />
              <rect x="42" y="24" width="6" height="6" fill="#5a25eb" />
              <rect x="45" y="45" width="10" height="10" fill="#5a25eb" rx="2" />
            </svg>
          </div>
          <p className="text-xs font-mono text-[#5a25eb] dark:text-[#cbbeff]">
            PAYLOAD: {selectedCount} SELECTED FIELDS
          </p>
          <button
            onClick={() => setShowQrModal(false)}
            className="px-5 py-2 rounded-lg bg-[#5a25eb] text-white text-xs font-semibold cursor-pointer shadow-md"
          >
            Close
          </button>
        </div>
      </Modal>
    </div>
  );
};

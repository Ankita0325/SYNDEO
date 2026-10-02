import React, { useState, useRef, useEffect } from 'react';
import type { ChatMessage } from '../../types';
import { AILoaderOrb, type OrbStateMode } from '../ui/ai-loader';
import { ThinkingOrb, type OrbState } from '../ui/thinking-orbs';
import { useNavigation } from '../../context/NavigationContext';
import {
  FileCheck,
  UserCheck,
  Mic,
  MicOff,
  Save,
  Share2,
  RotateCcw,
  Volume2,
  VolumeX,
  Copy,
  Check,
  ArrowUp,
  ShieldCheck,
  ExternalLink,
  Paperclip,
  FileText,
  X,
  SlidersHorizontal,
  Zap,
  Star,
  FileSearch,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const NORMAL_THINKING_STEPS: Array<{ text: string; state: OrbState }> = [
  { text: 'Thinking...', state: 'searching' },
  { text: 'Searching memory graph...', state: 'connecting' },
  { text: 'Consulting cryptographic vault...', state: 'solving' },
  { text: 'Synthesizing timeline records...', state: 'weaving' },
  { text: 'Composing verified response...', state: 'composing' },
];

const SAVE_THINKING_STEPS: Array<{ text: string; state: OrbState }> = [
  { text: 'Memorizing...', state: 'working' },
  { text: 'Encrypting record payload...', state: 'shaping' },
  { text: 'Linking life-stage node...', state: 'connecting' },
  { text: 'Securing zero-knowledge vault...', state: 'solving' },
];

type ChatMode = 'normal' | 'save' | 'share';
type VoiceState = 'idle' | 'listening' | 'thinking' | 'speaking';

export const ChatPage: React.FC = () => {
  const { userName } = useNavigation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [chatMode, setChatMode] = useState<ChatMode>('normal');
  const [orbState, setOrbState] = useState<OrbStateMode>('idle');
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [isSpeakingVoice, setIsSpeakingVoice] = useState<boolean>(false);
  const [streamingText, setStreamingText] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isToolsMenuOpen, setIsToolsMenuOpen] = useState<boolean>(false);

  interface AttachedFile {
    name: string;
    size: number;
    formattedSize: string;
    type: string;
  }
  const [attachedFile, setAttachedFile] = useState<AttachedFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachedFile({
        name: file.name,
        size: file.size,
        formattedSize: formatFileSize(file.size),
        type: file.type,
      });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const streamIntervalRef = useRef<any>(null);
  const timeoutsRef = useRef<any[]>([]);

  const [thinkingStepIndex, setThinkingStepIndex] = useState<number>(0);

  const thinkingSteps = chatMode === 'save' ? SAVE_THINKING_STEPS : NORMAL_THINKING_STEPS;
  const currentThinkingStep = thinkingSteps[thinkingStepIndex % thinkingSteps.length];

  useEffect(() => {
    if (!isTyping || isStreaming) {
      setThinkingStepIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setThinkingStepIndex((prev) => (prev + 1) % thinkingSteps.length);
    }, 1200);
    return () => clearInterval(interval);
  }, [isTyping, isStreaming, thinkingSteps.length]);

  const scrollToBottom = (instant = false) => {
    if (messagesContainerRef.current && messages.length > 0) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: instant ? 'auto' : 'smooth',
      });
    }
  };

  useEffect(() => {
    if (messages.length > 0 || isStreaming) {
      scrollToBottom();
    }
  }, [messages.length, isTyping, isStreaming]);

  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach((t) => clearTimeout(t));
      if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Web Speech API
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
          setVoiceState('listening');
          setOrbState('listening');
        };

        recognition.onresult = (event: any) => {
          const transcript = Array.from(event.results)
            .map((result: any) => (result as any)[0].transcript)
            .join('');
          setInputText(transcript);
        };

        recognition.onerror = () => {
          setVoiceState('idle');
          setOrbState('idle');
        };

        recognition.onend = () => {
          setVoiceState('idle');
          setOrbState('idle');
        };

        recognitionRef.current = recognition;
      }
    }
  }, []);

  const speakText = (text: string, onComplete?: () => void) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      if (onComplete) onComplete();
      return;
    }

    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*_#[\]()]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    utterance.lang = 'en-US';

    utterance.onstart = () => {
      setIsSpeakingVoice(true);
      setVoiceState('speaking');
      setOrbState('speaking');
    };

    utterance.onend = () => {
      setIsSpeakingVoice(false);
      setVoiceState('idle');
      setOrbState('idle');
      if (onComplete) onComplete();
    };

    utterance.onerror = () => {
      setIsSpeakingVoice(false);
      setVoiceState('idle');
      setOrbState('idle');
      if (onComplete) onComplete();
    };

    window.speechSynthesis.speak(utterance);
  };

  const stopAudio = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeakingVoice(false);
    setIsStreaming(false);
    setVoiceState('idle');
    setOrbState('idle');
  };

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }

    if (voiceState === 'listening') {
      recognitionRef.current.stop();
      setVoiceState('idle');
      setOrbState('idle');
    } else {
      stopAudio();
      try {
        recognitionRef.current.start();
      } catch {
        recognitionRef.current.stop();
      }
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const streamAIResponse = (fullResponse: ChatMessage) => {
    setIsStreaming(true);
    setStreamingText('');
    setVoiceState('speaking');
    setOrbState('speaking');

    speakText(fullResponse.content);

    let index = 0;
    const words = fullResponse.content.split(' ');

    if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);

    streamIntervalRef.current = setInterval(() => {
      if (index < words.length) {
        const currentSlice = words.slice(0, index + 1).join(' ');
        setStreamingText(currentSlice);
        index++;
      } else {
        if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);
        streamIntervalRef.current = null;
        setIsStreaming(false);
        setMessages((prev) => [...prev, fullResponse]);
        setStreamingText('');
        setIsTyping(false);
        setOrbState('idle');
      }
    }, 55);
  };

  const handleSendMessage = (textToSend?: string) => {
    const messageContent = textToSend !== undefined ? textToSend : inputText;
    if ((!messageContent.trim() && !attachedFile) || isTyping || isStreaming) return;

    if (voiceState === 'listening' && recognitionRef.current) {
      recognitionRef.current.stop();
    }
    stopAudio();

    const currentAttached = attachedFile;
    setAttachedFile(null);

    const userMsg: ChatMessage = {
      id: `m-user-${Date.now()}`,
      sender: 'user',
      content:
        chatMode === 'save'
          ? `[SAVE INFO]: ${messageContent || (currentAttached ? `Upload & Index ${currentAttached.name}` : '')}`
          : chatMode === 'share'
          ? `[SHARE REQUEST]: ${messageContent}`
          : messageContent || (currentAttached ? `Analyze attached document: ${currentAttached.name}` : ''),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      attachment: currentAttached
        ? {
            name: currentAttached.name,
            size: currentAttached.formattedSize,
            type: currentAttached.type,
          }
        : undefined,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);
    setVoiceState('thinking');
    setOrbState('thinking');

    const t1 = setTimeout(() => {
      setOrbState('generating');
    }, 1200);

    const t2 = setTimeout(() => {
      let botResponse: ChatMessage;
      const lower = messageContent.toLowerCase();

      if (currentAttached) {
        botResponse = {
          id: `m-bot-${Date.now()}`,
          sender: 'assistant',
          content:
            chatMode === 'save'
              ? `📄 **Document Verified & Encrypted**\n\nI have parsed and indexed **${currentAttached.name}** (${currentAttached.formattedSize}) into your zero-knowledge vault.\n- **Extracted Records**: Evidence-backed Credentials\n- **Vault Security**: AES-256-GCM Envelope Sealed\n- **Graph Indexing**: Attached to your personal life-stage network.`
              : `📄 **Attached Document Analyzed**\n\nI have parsed **${currentAttached.name}** (${currentAttached.formattedSize}). All cryptographic signatures and metadata match your verified records.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          sourceType: 'evidence-backed',
          sourceNote: 'Uploaded Evidence Document Verification',
          evidenceDoc: currentAttached.name,
        };
      } else if (chatMode === 'save') {
        botResponse = {
          id: `m-bot-${Date.now()}`,
          sender: 'assistant',
          content: `✅ **Saved to Personal Memory Store**\n\nI have encrypted "${messageContent}" into your private vault envelope.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          sourceType: 'user-confirmed',
          sourceNote: 'Committed self-assertion',
        };
      } else if (chatMode === 'share') {
        botResponse = {
          id: `m-bot-${Date.now()}`,
          sender: 'assistant',
          content: `🔗 **Selective Share Link Generated**\n\n- **Recipient**: 24h Scoped Access Link\n- **Fields**: ${messageContent}\n- **Proof**: zk-SNARK Verified`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          sourceType: 'evidence-backed',
          sourceNote: 'zk-SNARK Selective Proof',
        };
      } else if (lower.includes('college') || lower.includes('degree') || lower.includes('education') || lower.includes('slrtce') || lower.includes('collaborator')) {
        botResponse = {
          id: `m-bot-${Date.now()}`,
          sender: 'assistant',
          content: `You attended **SLRTCE (Shree L. R. Tiwari College of Engineering)** where you earned your **Bachelor of Engineering in Computer Science** with a **CGPA of 8.45 / 10.0**.\n\nYour capstone collaborator was **Divya** (Lead System Architect). Verified via SLRTCE Degree Registrar record.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          sourceType: 'evidence-backed',
          sourceNote: 'Degree_Certificate_SLRTCE_2024.pdf',
          evidenceDoc: 'Degree_Certificate_SLRTCE_2024.pdf',
        };
      } else if (lower.includes('github') || lower.includes('linkedin') || lower.includes('social') || lower.includes('links')) {
        botResponse = {
          id: `m-bot-${Date.now()}`,
          sender: 'assistant',
          content: `Here are your verified identity & developer records:\n\n• **GitHub:** https://github.com/indresh404/SYNDEO\n• **LinkedIn:** https://linkedin.com/in/indresh-suresh-093646399\n• **Discord:** @indresh404\n• **Portfolio:** https://indresh.dev`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          sourceType: 'evidence-backed',
          sourceNote: 'GitHub GPG Key & Verified Profiles',
          evidenceDoc: 'GitHub_GPG_Key_Signature.asc',
        };
      } else if (lower.includes('blood') || lower.includes('medical') || lower.includes('health')) {
        botResponse = {
          id: `m-bot-${Date.now()}`,
          sender: 'assistant',
          content: `Your blood group is **O-Positive (O+)**. Emergency contact: **Ankita** (+91 98201 55910). Insurance: **Star Health & Allied (Policy #SH-88921-99)**.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          sourceType: 'evidence-backed',
          sourceNote: 'Annual Health Checkup Lab Report',
          evidenceDoc: 'Annual_Health_Checkup_LabReport.pdf',
        };
      } else {
        botResponse = {
          id: `m-bot-${Date.now()}`,
          sender: 'assistant',
          content: `I retrieved your records for "${messageContent}". Your sovereign vault confirms your identity as **${userName || 'Indresh'}** across Identity, Education (SLRTCE), Finance (HDFC Bank), and Healthcare records.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          sourceType: 'user-confirmed',
          sourceNote: 'Personal vault query response',
        };
      }

      streamAIResponse(botResponse);
    }, 2800);

    timeoutsRef.current.push(t1, t2);
  };

  const handleResetChat = () => {
    stopAudio();
    if (streamIntervalRef.current) {
      clearInterval(streamIntervalRef.current);
      streamIntervalRef.current = null;
    }
    timeoutsRef.current.forEach((t) => clearTimeout(t));
    timeoutsRef.current = [];
    setIsTyping(false);
    setIsStreaming(false);
    setStreamingText('');
    setOrbState('idle');
    setMessages([]);
  };

  const currentOrbState: OrbStateMode = isSpeakingVoice
    ? 'speaking'
    : voiceState === 'listening'
    ? 'listening'
    : isTyping || isStreaming
    ? (orbState !== 'idle' ? orbState : 'generating')
    : orbState;

  const currentOrbText =
    isSpeakingVoice
      ? 'Speaking...'
      : voiceState === 'listening'
      ? 'Listening...'
      : isTyping || isStreaming
      ? 'Thinking...'
      : 'Ready...';

  const renderFormattedContent = (content: string, isUserMessage = false) => {
    if (!content) return null;

    let displayContent = content;
    let prefixBadge = null;

    if (content.startsWith('[SAVE INFO]: ')) {
      displayContent = content.replace('[SAVE INFO]: ', '');
      prefixBadge = (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 mb-1.5 rounded text-[10px] font-bold bg-white/20 text-white border border-white/30">
          <Save className="w-3 h-3" />
          <span>Save Memory</span>
        </span>
      );
    } else if (content.startsWith('[SHARE REQUEST]: ')) {
      displayContent = content.replace('[SHARE REQUEST]: ', '');
      prefixBadge = (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 mb-1.5 rounded text-[10px] font-bold bg-white/20 text-white border border-white/30">
          <Share2 className="w-3 h-3" />
          <span>Selective Share</span>
        </span>
      );
    }

    const lines = displayContent.split('\n');

    return (
      <div className="space-y-1.5 leading-relaxed">
        {prefixBadge && <div>{prefixBadge}</div>}
        {lines.map((line, lineIdx) => {
          const trimmed = line.trim();
          if (!trimmed) {
            return <div key={lineIdx} className="h-1" />;
          }

          const isBullet = trimmed.startsWith('- ') || trimmed.startsWith('• ');
          const rawText = isBullet ? trimmed.substring(2) : line;

          const parts: React.ReactNode[] = [];
          const regex = /(\*\*.*?\*\*|`.*?`|\*.*?\*|https?:\/\/[^\s]+)/g;
          let lastIndex = 0;
          let match;

          while ((match = regex.exec(rawText)) !== null) {
            if (match.index > lastIndex) {
              parts.push(rawText.substring(lastIndex, match.index));
            }

            const matchedStr = match[0];
            if (matchedStr.startsWith('**') && matchedStr.endsWith('**')) {
              parts.push(
                <strong
                  key={match.index}
                  className={isUserMessage ? 'font-black underline decoration-white/30' : 'font-black text-zinc-950 dark:text-white'}
                >
                  {matchedStr.slice(2, -2)}
                </strong>
              );
            } else if (matchedStr.startsWith('`') && matchedStr.endsWith('`')) {
              parts.push(
                <code
                  key={match.index}
                  className={`px-1.5 py-0.5 rounded font-mono text-[11px] ${
                    isUserMessage
                      ? 'bg-white/20 text-white'
                      : 'bg-zinc-100 dark:bg-white/10 text-[#5a25eb] dark:text-[#cbbeff] border border-zinc-200 dark:border-white/10'
                  }`}
                >
                  {matchedStr.slice(1, -1)}
                </code>
              );
            } else if (matchedStr.startsWith('*') && matchedStr.endsWith('*')) {
              parts.push(
                <em key={match.index} className="italic opacity-90">
                  {matchedStr.slice(1, -1)}
                </em>
              );
            } else if (matchedStr.startsWith('http://') || matchedStr.startsWith('https://')) {
              parts.push(
                <a
                  key={match.index}
                  href={matchedStr}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={
                    isUserMessage
                      ? 'underline text-white font-semibold'
                      : 'text-[#5a25eb] dark:text-[#cbbeff] underline hover:opacity-80 font-medium break-all inline-flex items-center gap-0.5'
                  }
                >
                  <span>{matchedStr}</span>
                  <ExternalLink className="w-2.5 h-2.5 inline opacity-70" />
                </a>
              );
            }

            lastIndex = regex.lastIndex;
          }

          if (lastIndex < rawText.length) {
            parts.push(rawText.substring(lastIndex));
          }

          if (isBullet) {
            return (
              <div key={lineIdx} className="flex items-start gap-2 pl-0.5">
                <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${isUserMessage ? 'bg-white' : 'bg-[#5a25eb] dark:bg-[#cbbeff]'}`} />
                <div className="flex-1">{parts}</div>
              </div>
            );
          }

          return <div key={lineIdx}>{parts}</div>;
        })}
      </div>
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="relative flex-1 flex flex-col h-full min-h-0 bg-[#06060c] text-slate-100 overflow-hidden select-none">
      {/* Dynamic Moving Atmospheric Ambient Background Glow (Professional light blue & violet) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10">
        <div
          className="absolute -top-32 left-1/4 w-[600px] h-[600px] rounded-full ambient-blue-glow-1 blur-[120px] pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(38, 167, 222, 0.16) 0%, rgba(90, 37, 235, 0.13) 50%, rgba(0, 0, 0, 0) 75%)',
          }}
        />
        <div
          className="absolute top-1/3 -right-24 w-[520px] h-[520px] rounded-full ambient-blue-glow-2 blur-[110px] pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(90, 37, 235, 0.16) 0%, rgba(14, 165, 233, 0.12) 45%, rgba(0, 0, 0, 0) 70%)',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(circle at 50% 18%, rgba(20, 35, 60, 0.35) 0%, rgba(8, 11, 20, 0.85) 60%, #05070e 100%)',
          }}
        />
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileChange}
        className="hidden"
        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.txt"
      />

      {/* Top Floating Control Toolbar */}
      {messages.length > 0 && (
        <div className="max-w-2xl w-full mx-auto px-4 pt-3 flex items-center justify-between shrink-0 z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/[0.05] border border-white/[0.1] backdrop-blur-xl text-xs text-slate-200 shadow-md">
            <AILoaderOrb state={currentOrbState} variant="avatar" size={16} />
            <span className="font-mono text-[11px] capitalize">{currentOrbState}</span>
          </div>

          <div className="flex items-center gap-2">
            {isSpeakingVoice && (
              <button
                onClick={stopAudio}
                className="p-1.5 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 transition-colors cursor-pointer"
                title="Stop Audio"
              >
                <VolumeX className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={handleResetChat}
              className="p-1.5 rounded-full bg-white/[0.05] hover:bg-white/[0.1] text-slate-400 hover:text-white border border-white/[0.08] transition-colors cursor-pointer backdrop-blur-md"
              title="Reset Chat"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Interactive Canvas Area */}
      <div
        ref={messagesContainerRef}
        className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-4 py-4 sm:py-6 flex flex-col items-center justify-start scrollbar-none"
      >
        {/* =========================================================================
            1. HERO EMPTY STATE (Exact Matching Mockup Structure with Our Animated Orb)
           ========================================================================= */}
        {messages.length === 0 ? (
          <div className="w-full max-w-2xl flex flex-col items-center pt-1 sm:pt-3 my-auto">
            {/* Central Iridescent Glowing 3D Orb (Our Animation Orb) */}
            <div className="relative mb-4 sm:mb-6 flex items-center justify-center">
              {/* Diffuse ambient aura behind the orb */}
              <div className="absolute w-36 h-36 sm:w-48 sm:h-48 rounded-full bg-cyan-500/20 blur-2xl filter -z-10 pointer-events-none ambient-blue-glow-1" />
              <div className="absolute w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-[#5a25eb]/25 blur-xl filter -z-10 pointer-events-none ambient-blue-glow-2" />

              {/* Our Fluid Interactive Hero Animation Orb */}
              <div className="cursor-pointer transform hover:scale-105 transition-transform duration-300 drop-shadow-[0_0_35px_rgba(90,37,235,0.35)]">
                <AILoaderOrb
                  state={currentOrbState}
                  text={currentOrbText}
                  size={120}
                  variant="hero"
                />
              </div>
            </div>

            {/* Assistant Greeting Titles */}
            <header className="text-center mb-4 sm:mb-6 space-y-1 px-2">
              <h2 className="text-slate-400 text-xs sm:text-sm font-normal tracking-wide">
                Hi, {userName || 'Indresh'}
              </h2>
              <h1 className="text-white text-2xl sm:text-4xl font-semibold tracking-tight">
                How can I help today?
              </h1>
              <p className="text-slate-400/90 text-[11px] sm:text-xs font-normal mt-1.5 max-w-sm mx-auto leading-relaxed">
                I'm here to help — from zero-knowledge memory retrieval to cryptographic proof generation.
              </p>
            </header>

            {/* Main Glowing Prompt Container Card (Outer Glass Card) */}
            <div className="w-full rounded-2xl p-2.5 sm:p-3.5 bg-gradient-to-b from-[#141e33]/50 to-[#0a0f1d]/70 border border-sky-500/20 shadow-[0_15px_40px_-10px_rgba(0,0,0,0.7),0_0_35px_-10px_rgba(38,167,222,0.15)] backdrop-blur-2xl transition-shadow">
              {/* Header Pill Badge for Sovereign Pro Tier */}
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-300/90 px-2 py-1 mb-2.5">
                <Zap className="w-3.5 h-3.5 fill-current text-sky-400" />
                <span className="hover:text-white cursor-pointer transition-colors font-medium">
                  Zero-Knowledge Sovereign Vault Active
                </span>
              </div>

              {/* Inner Dark Textarea Input Container */}
              <div className="bg-[#090810]/95 rounded-xl p-3 border border-white/[0.06] shadow-inner flex flex-col justify-between min-h-[110px]">
                {/* Attached File Pill */}
                {attachedFile && (
                  <div className="mb-2 p-2 rounded-lg bg-[#5a25eb]/15 border border-[#5a25eb]/30 flex items-center justify-between text-xs text-[#cbbeff]">
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="w-3.5 h-3.5 shrink-0 text-[#cbbeff]" />
                      <span className="font-semibold truncate">{attachedFile.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">({attachedFile.formattedSize})</span>
                    </div>
                    <button
                      onClick={() => setAttachedFile(null)}
                      className="p-1 rounded text-slate-400 hover:text-white cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <textarea
                  ref={textareaRef}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={2}
                  placeholder="Ask me anything or query your vault ..."
                  className="w-full bg-transparent border-0 resize-none text-sm text-slate-100 placeholder-slate-500 focus:ring-0 focus:outline-none p-1 font-normal leading-relaxed"
                />

                {/* Input Footer Actions Toolbar */}
                <div className="flex items-center justify-between pt-2">
                  {/* Left Tool Actions */}
                  <div className="flex items-center gap-2">
                    {/* Import file action */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-slate-300 bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] transition-all cursor-pointer"
                    >
                      <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                      <span>Import file</span>
                    </button>

                    {/* Tools action toggle */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsToolsMenuOpen(!isToolsMenuOpen)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                          chatMode !== 'normal'
                            ? 'bg-[#5a25eb]/20 text-[#cbbeff] border-[#5a25eb]/40'
                            : 'text-slate-300 bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08]'
                        }`}
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                        <span className="capitalize">{chatMode === 'normal' ? 'Tools' : chatMode}</span>
                      </button>

                      {/* Dropdown Tools Menu */}
                      <AnimatePresence>
                        {isToolsMenuOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            className="absolute left-0 bottom-full mb-2 w-48 p-1.5 rounded-xl bg-[#0f0e1a] border border-[#2a283c] shadow-2xl z-30 text-xs space-y-1"
                          >
                            <button
                              onClick={() => {
                                setChatMode('normal');
                                setIsToolsMenuOpen(false);
                              }}
                              className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/5 text-slate-200 cursor-pointer"
                            >
                              🔍 Standard Query
                            </button>
                            <button
                              onClick={() => {
                                setChatMode('save');
                                setIsToolsMenuOpen(false);
                              }}
                              className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/5 text-slate-200 cursor-pointer"
                            >
                              💾 Save to Vault
                            </button>
                            <button
                              onClick={() => {
                                setChatMode('share');
                                setIsToolsMenuOpen(false);
                              }}
                              className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/5 text-slate-200 cursor-pointer"
                            >
                              🔗 Compose zk-Proof
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Right Controls: Audio & Send Button */}
                  <div className="flex items-center gap-2.5">
                    {/* Audio Dictation Icon */}
                    <button
                      type="button"
                      onClick={toggleVoiceInput}
                      aria-label="Voice Input"
                      className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                        voiceState === 'listening'
                          ? 'bg-red-500 text-white animate-pulse'
                          : 'text-slate-400 hover:text-white hover:bg-white/5'
                      }`}
                      title={voiceState === 'listening' ? 'Listening...' : 'Voice Input'}
                    >
                      {voiceState === 'listening' ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </button>

                    {/* Purple / Indigo Send Button with Up Arrow */}
                    <button
                      type="button"
                      onClick={() => handleSendMessage()}
                      disabled={(!inputText.trim() && !attachedFile) || isTyping || isStreaming}
                      aria-label="Send Prompt"
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-white transition-all shadow-md active:scale-95 cursor-pointer ${
                        inputText.trim() || attachedFile
                          ? 'bg-[#5a25eb] hover:bg-[#6b37fa] shadow-[#5a25eb]/40 ring-1 ring-white/20'
                          : 'bg-white/10 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <ArrowUp className="w-4 h-4 stroke-[2.5]" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Action Cards Section (3 Cards Exactly Matching Structure) */}
            <section className="w-full grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
              {/* Card 1: Query Education / Memory Graph */}
              <article
                onClick={() => handleSendMessage("What's my education status and degree?")}
                className="group bg-[#0b0a14]/70 hover:bg-[#121120]/90 border border-white/[0.06] hover:border-[#5a25eb]/40 rounded-xl p-3.5 flex flex-col justify-start cursor-pointer transition-all duration-200 shadow-sm"
              >
                <div className="flex items-center gap-2 text-white font-medium text-xs mb-1">
                  <span className="text-amber-400">
                    <Star className="w-3.5 h-3.5 fill-current" />
                  </span>
                  <span className="tracking-tight text-[13px] font-semibold">Query Education</span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed group-hover:text-slate-300 transition-colors">
                  SLRTCE Computer Engineering & CGPA records.
                </p>
              </article>

              {/* Card 2: Verify & Extract Document */}
              <article
                onClick={() => {
                  fileInputRef.current?.click();
                }}
                className="group bg-[#0b0a14]/70 hover:bg-[#121120]/90 border border-white/[0.06] hover:border-[#5a25eb]/40 rounded-xl p-3.5 flex flex-col justify-start cursor-pointer transition-all duration-200 shadow-sm"
              >
                <div className="flex items-center gap-2 text-white font-medium text-xs mb-1">
                  <span className="text-[#cbbeff]">
                    <FileSearch className="w-3.5 h-3.5" />
                  </span>
                  <span className="tracking-tight text-[13px] font-semibold">Verify Document</span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed group-hover:text-slate-300 transition-colors">
                  Upload PDF to extract & seal zero-knowledge evidence.
                </p>
              </article>

              {/* Card 3: Selective Share Proof */}
              <article
                onClick={() => handleSendMessage('Show all my verified social and developer links')}
                className="group bg-[#0b0a14]/70 hover:bg-[#121120]/90 border border-white/[0.06] hover:border-[#5a25eb]/40 rounded-xl p-3.5 flex flex-col justify-start cursor-pointer transition-all duration-200 shadow-sm"
              >
                <div className="flex items-center gap-2 text-white font-medium text-xs mb-1">
                  <span className="text-emerald-400">
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </span>
                  <span className="tracking-tight text-[13px] font-semibold">Social Proof</span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed group-hover:text-slate-300 transition-colors">
                  Retrieve verified GitHub, LinkedIn & Discord credentials.
                </p>
              </article>
            </section>
          </div>
        ) : (
          /* =========================================================================
              2. ACTIVE CONVERSATION STREAM (When messages exist)
             ========================================================================= */
          <div className="w-full max-w-2xl space-y-4 py-2">
            {messages.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 max-w-2xl ${isUser ? 'ml-auto justify-end' : 'mr-auto justify-start'}`}
                >
                  {!isUser && (
                    <div className="w-8 h-8 rounded-full bg-[#121120] border border-white/10 flex items-center justify-center shrink-0 mt-0.5 overflow-hidden shadow-sm">
                      <AILoaderOrb state={isSpeakingVoice ? 'speaking' : 'idle'} variant="avatar" size={20} />
                    </div>
                  )}

                  <div className={`space-y-1.5 ${isUser ? 'items-end' : 'items-start'} max-w-[85%]`}>
                    <div
                      className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                        isUser
                          ? 'bg-[#5a25eb] text-white rounded-br-xs shadow-md font-medium'
                          : 'bg-[#0f0e1a]/90 border border-white/[0.08] text-slate-100 rounded-bl-xs shadow-lg backdrop-blur-md'
                      }`}
                    >
                      {isUser && msg.attachment && (
                        <div className="mb-2.5 p-2 rounded-xl bg-white/15 border border-white/20 flex items-center gap-2 text-white">
                          <FileText className="w-4 h-4 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold truncate">{msg.attachment.name}</p>
                            <p className="text-[10px] text-white/80 font-mono">{msg.attachment.size}</p>
                          </div>
                        </div>
                      )}

                      <div>{renderFormattedContent(msg.content, isUser)}</div>

                      {!isUser && (
                        <div className="mt-3 pt-2.5 border-t border-white/[0.08] flex items-center justify-between text-[11px] text-slate-400">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => speakText(msg.content)}
                              className="flex items-center gap-1 text-[#cbbeff] hover:underline font-semibold cursor-pointer"
                            >
                              <Volume2 className="w-3 h-3" />
                              <span>Listen</span>
                            </button>
                            <span>•</span>
                            <button
                              onClick={() => handleCopy(msg.id, msg.content)}
                              className="flex items-center gap-1 hover:text-white cursor-pointer"
                            >
                              {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                              <span>{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
                            </button>
                          </div>
                          <span className="font-mono text-[10px]">{msg.timestamp}</span>
                        </div>
                      )}
                    </div>

                    {!isUser && msg.sourceType && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        {msg.sourceType === 'evidence-backed' && (
                          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 font-medium font-mono">
                            <FileCheck className="w-3 h-3" />
                            <span className="truncate max-w-[200px]">{msg.evidenceDoc || 'Evidence_Record.pdf'}</span>
                          </div>
                        )}
                        {msg.sourceType === 'user-confirmed' && (
                          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] bg-[#5a25eb]/10 border border-[#5a25eb]/25 text-[#cbbeff]">
                            <UserCheck className="w-3 h-3" />
                            <span>{msg.sourceNote || 'Self-asserted'}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {isUser && (
                    <div className="w-8 h-8 rounded-full bg-[#5a25eb]/20 border border-[#5a25eb]/40 flex items-center justify-center shrink-0 font-bold text-xs text-[#cbbeff] mt-0.5">
                      {(userName || 'US').slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </motion.div>
              );
            })}

            {isStreaming && streamingText && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3 max-w-2xl mr-auto justify-start"
              >
                <div className="w-8 h-8 rounded-full bg-[#121120] border border-white/10 flex items-center justify-center shrink-0 mt-0.5 overflow-hidden shadow-sm">
                  <AILoaderOrb state={isSpeakingVoice ? 'speaking' : 'generating'} variant="avatar" size={20} />
                </div>
                <div className="p-4 rounded-2xl text-xs sm:text-sm bg-[#0f0e1a]/90 border-2 border-[#5a25eb] text-slate-100 shadow-xl">
                  <div className="leading-relaxed">
                    {renderFormattedContent(streamingText, false)}
                    <span className="inline-block w-1.5 h-3.5 bg-[#5a25eb] ml-1 animate-pulse align-middle" />
                  </div>
                </div>
              </motion.div>
            )}

            {isTyping && !isStreaming && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2.5 py-2"
              >
                <div className="inline-flex h-9 items-center gap-2.5 rounded-full pl-2.5 pr-4 bg-[#0f0e1a] border border-white/[0.08] shadow-sm">
                  <ThinkingOrb state={currentThinkingStep.state} size={20} theme="auto" />
                  <span className="text-xs text-[#cbbeff] font-mono">{currentThinkingStep.text}</span>
                </div>
              </motion.div>
            )}
          </div>
        )}
      </div>

      {/* =========================================================================
          BOTTOM FIXED PROMPT BAR (When in active conversation mode)
         ========================================================================= */}
      {messages.length > 0 && (
        <div className="w-full max-w-2xl mx-auto px-4 pb-4 shrink-0 z-20">
          <div className="w-full rounded-2xl p-2.5 bg-[#0e0d18]/90 border border-[#5a25eb]/30 shadow-2xl backdrop-blur-xl">
            {attachedFile && (
              <div className="mb-2 p-1.5 rounded-lg bg-[#5a25eb]/15 border border-[#5a25eb]/30 flex items-center justify-between text-xs text-[#cbbeff]">
                <span className="truncate">{attachedFile.name} ({attachedFile.formattedSize})</span>
                <button onClick={() => setAttachedFile(null)} className="text-slate-400 hover:text-white">
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                title="Attach Document"
              >
                <Paperclip className="w-4 h-4" />
              </button>

              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Ask SYNDEO AI about your records..."
                className="flex-1 bg-transparent border-0 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-0 px-2 py-1.5"
              />

              <button
                type="button"
                onClick={toggleVoiceInput}
                className={`p-2 rounded-full transition-colors cursor-pointer ${
                  voiceState === 'listening' ? 'bg-red-500 text-white animate-pulse' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Mic className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={(!inputText.trim() && !attachedFile) || isTyping || isStreaming}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-white transition-all ${
                  inputText.trim() || attachedFile
                    ? 'bg-[#5a25eb] hover:bg-[#6b37fa] shadow-md shadow-[#5a25eb]/30'
                    : 'bg-white/10 text-slate-500'
                }`}
              >
                <ArrowUp className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

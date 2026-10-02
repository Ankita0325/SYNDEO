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
  HelpCircle as QuestionIcon,
  RotateCcw,
  Volume2,
  VolumeX,
  Copy,
  Check,
  ArrowUp,
  ShieldCheck,
  Sparkles,
  GraduationCap,
  Globe,
  ExternalLink,
  Paperclip,
  FileText,
  X,
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

  interface AttachedFile {
    name: string;
    size: number;
    formattedSize: string;
    type: string;
  }
  const [attachedFile, setAttachedFile] = useState<AttachedFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  const messagesEndRef = useRef<HTMLDivElement>(null);
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
    }, 60);
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
    }, 1500);

    const t2 = setTimeout(() => {
      let botResponse: ChatMessage;
      const lower = messageContent.toLowerCase();

      if (currentAttached) {
        botResponse = {
          id: `m-bot-${Date.now()}`,
          sender: 'assistant',
          content:
            chatMode === 'save'
              ? `📄 **Document Verified & Encrypted**\n\nI have processed and indexed **${currentAttached.name}** (${currentAttached.formattedSize}) into your zero-knowledge vault.\n- **Extracted Records**: Evidence-backed Credentials\n- **Vault Security**: AES-256-GCM Envelope Sealed\n- **Graph Indexing**: Attached to your personal life-stage network.`
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
          sourceNote: 'Selective Disclosure Grant',
          evidenceDoc: 'Scope_Access_Envelope.json',
        };
      } else if (
        lower.includes('social') ||
        lower.includes('github') ||
        lower.includes('linkedin') ||
        lower.includes('discord') ||
        lower.includes('link') ||
        lower.includes('profile')
      ) {
        botResponse = {
          id: `m-bot-${Date.now()}`,
          sender: 'assistant',
          content: `Here are all your verified **Social & Developer Links**:\n\n- **GitHub**: https://github.com/indresh404/SYNDEO\n- **LinkedIn**: https://linkedin.com/in/indresh-suresh-093646399\n- **Discord**: **@indresh404** (SYNDEO Network)\n\nAll cryptographic signatures and repository links are verified on the network.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          sourceType: 'evidence-backed',
          sourceNote: 'Cryptographic Developer Credentials & Social Identity',
          evidenceDoc: 'Developer_Social_Proofs.json',
        };
      } else if (
        lower.includes('education') ||
        lower.includes('college') ||
        lower.includes('slrtce') ||
        lower.includes('degree') ||
        lower.includes('engineering') ||
        lower.includes('university') ||
        lower.includes('cgpa') ||
        lower.includes('study')
      ) {
        botResponse = {
          id: `m-bot-${Date.now()}`,
          sender: 'assistant',
          content: `Your verified **Education Status**:\n\n- **Degree**: **B.E. in Computer Science & Engineering**\n- **Institution**: **SLRTCE (University of Mumbai)**\n- **CGPA**: **8.45 / 10.0** (First Class with Distinction)\n- **Batch**: **2020 – 2024**\n- **Capstone Collaborator**: **Divya**\n- **Evidence**: Verified by SLRTCE Academic Registry envelope.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          sourceType: 'evidence-backed',
          sourceNote: 'SLRTCE Degree Certificate & Transcript',
          evidenceDoc: 'Degree_Certificate_SLRTCE_2024.pdf',
        };
      } else if (lower.includes('work') || lower.includes('company') || lower.includes('job') || lower.includes('veritas') || lower.includes('role')) {
        botResponse = {
          id: `m-bot-${Date.now()}`,
          sender: 'assistant',
          content: `You are currently employed at **Veritas Technologies** as a **Systems & Cloud Engineer**. Your peer reviewer is **Monish**.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          sourceType: 'evidence-backed',
          sourceNote: 'Employment Offer Letter & Peer Confirmation',
          evidenceDoc: 'Employment_Offer_Letter_Veritas.pdf',
        };
      } else if (lower.includes('blood') || lower.includes('medical') || lower.includes('health') || lower.includes('ankita')) {
        botResponse = {
          id: `m-bot-${Date.now()}`,
          sender: 'assistant',
          content: `Your blood group is **O-Positive (O+)**. Emergency kin and health proxy: **Ankita** (Sister, +91 98202 55910). Verified by CityCare Diagnostics.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          sourceType: 'evidence-backed',
          sourceNote: 'Annual Health Checkup & Family Proxy Declaration',
          evidenceDoc: 'Medical_Summary_2024.pdf',
        };
      } else if (lower.includes('credit') || lower.includes('bank') || lower.includes('tax') || lower.includes('pan') || lower.includes('score')) {
        botResponse = {
          id: `m-bot-${Date.now()}`,
          sender: 'assistant',
          content: `Your verified **CIBIL Score is 785**. PAN: **ABCDE1234F**, Primary Bank: **HDFC Bank**.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          sourceType: 'evidence-backed',
          sourceNote: 'ITR-V Acknowledgement & Experian Credit Report',
          evidenceDoc: 'ITR_Acknowledgement_AY2024.pdf',
        };
      } else {
        botResponse = {
          id: `m-bot-${Date.now()}`,
          sender: 'assistant',
          content: `I retrieved your records for "${messageContent}". Your verified vault confirms your identity as **${userName}** across Identity, Education (SLRTCE), Employment (Veritas), and Healthcare.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          sourceType: 'user-confirmed',
          sourceNote: 'Personal vault query response',
        };
      }

      streamAIResponse(botResponse);
    }, 3500);

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

  const quickPrompts = [
    {
      title: "What's my education status?",
      subtitle: 'SLRTCE B.E. Degree & CGPA',
      text: "What's my education status?",
      icon: GraduationCap,
    },
    {
      title: 'Show all social links',
      subtitle: 'GitHub, LinkedIn & Discord',
      text: 'Show all my social links',
      icon: Globe,
    },
  ];

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

  return (
    <div className="h-full flex-1 flex flex-col min-h-0 bg-zinc-50 dark:bg-[#000000] text-zinc-900 dark:text-[#f4f4f6] transition-colors duration-200 overflow-hidden relative">

      {/* === LIGHT MODE BACKGROUND: soft blue/white liquid glow === */}
      <div className="absolute top-[-10%] left-[-5%] w-[45%] h-[45%] rounded-full bg-blue-300/40 dark:bg-[#5a25eb]/20 blur-[130px] pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[55%] h-[55%] rounded-full bg-sky-300/40 dark:bg-[#3a1c8c]/30 blur-[140px] pointer-events-none z-0" />
      <div className="absolute top-[25%] left-[50%] -translate-x-1/2 w-[65%] h-[35%] rounded-full bg-blue-200/50 dark:bg-[#2a1a5e]/20 blur-[110px] pointer-events-none z-0" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[75%] h-[30%] rounded-full bg-indigo-200/40 dark:bg-[#5a25eb]/15 blur-[90px] pointer-events-none z-0" />
      <div className="absolute top-[55%] left-[15%] w-[35%] h-[35%] rounded-full bg-cyan-200/30 dark:bg-[#1a0a3e]/40 blur-[120px] pointer-events-none z-0" />

      {/* Animated soft movement overlay */}
      <motion.div
        animate={{
          opacity: [0.25, 0.45, 0.25],
          scale: [1, 1.04, 1]
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-100/20 dark:via-[#0a0514]/5 to-transparent pointer-events-none z-0"
      />

      {/* === MAIN CHAT CONTAINER === */}
      <div className="max-w-3xl w-full mx-auto flex-1 flex flex-col h-full min-h-0 px-2.5 sm:px-6 relative z-10">

        {/* Liquid glass container with blue gradient */}
        <div className="relative flex-1 flex flex-col min-h-0 rounded-3xl my-2 overflow-hidden
                        bg-white/70 dark:bg-[#0a0a14]/60
                        backdrop-blur-2xl
                        border border-blue-200/60 dark:border-[#2a1f4a]/50
                        shadow-[0_8px_40px_-10px_rgba(59,130,246,0.25),inset_0_1px_0_0_rgba(255,255,255,0.8)]
                        dark:shadow-[0_0_30px_rgba(90,37,235,0.1),inset_0_1px_0_0_rgba(255,255,255,0.05)]">

          {/* === LIQUID GLASS BLUE GRADIENT LAYERS === */}
          {/* Radial blue glow top-left */}
          <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-blue-400/25 dark:bg-[#5a25eb]/15 blur-3xl pointer-events-none z-0" />
          {/* Radial blue glow bottom-right */}
          <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-indigo-400/25 dark:bg-[#3a1c8c]/20 blur-3xl pointer-events-none z-0" />
          {/* Diagonal blue sheen */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-100/60 via-white/10 to-indigo-200/40 dark:from-[#5a25eb]/5 dark:via-transparent dark:to-[#3a1c8c]/10 pointer-events-none z-0" />
          {/* Top white glass highlight */}
          <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-white/70 to-transparent dark:from-white/[0.04] pointer-events-none z-0" />
          {/* Subtle animated shimmer */}
          <motion.div
            animate={{
              opacity: [0.15, 0.3, 0.15],
              backgroundPosition: ['0% 0%', '100% 100%', '0% 0%'],
            }}
            transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 pointer-events-none z-0"
            style={{
              background: 'radial-gradient(circle at 30% 20%, rgba(147,197,253,0.25), transparent 50%), radial-gradient(circle at 70% 80%, rgba(129,140,248,0.25), transparent 50%)',
              backgroundSize: '200% 200%',
            }}
          />

          {/* === MESSAGES STREAM === */}
          <div ref={messagesContainerRef} className="flex-1 min-h-0 overflow-y-auto px-1 sm:px-2 py-2.5 space-y-3.5 scrollbar-none no-scrollbar flex flex-col justify-start relative z-10">

            {/* Welcome Hero */}
            {messages.length === 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="my-auto py-6 sm:py-8 px-4 sm:px-6 rounded-3xl bg-transparent text-center space-y-4 relative overflow-hidden flex flex-col items-center justify-center min-h-[400px]"
              >
                <div className="flex items-center justify-center my-2">
                  <AILoaderOrb
                    state={currentOrbState}
                    text={currentOrbText}
                    size={150}
                    variant="hero"
                  />
                </div>

                <div className="space-y-1">
                  <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white tracking-tight">
                    Hi, {userName}
                  </h2>
                  <h3 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">
                    How can I help today?
                  </h3>
                  <p className="text-xs sm:text-sm text-zinc-500 dark:text-[#8c879a] max-w-md mx-auto pt-1">
                    I'm here to help — from quick answers<br/>to smart recommendations.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto pt-4 w-full">
                  {quickPrompts.map((p, idx) => {
                    const Icon = p.icon;
                    return (
                      <button
                        key={idx}
                        onClick={() => handleSendMessage(p.text)}
                        className="p-4 rounded-2xl
                                   bg-white/70 dark:bg-[#12121a]/80
                                   backdrop-blur-md
                                   border border-blue-200/70 dark:border-[#222230]
                                   hover:border-blue-400/80 dark:hover:border-[#5a25eb]/50
                                   hover:bg-blue-50/80 dark:hover:bg-[#5a25eb]/5
                                   text-left transition-all cursor-pointer flex items-start gap-3 group
                                   shadow-[0_4px_20px_-8px_rgba(59,130,246,0.3)]
                                   dark:shadow-lg dark:shadow-black/20"
                      >
                        <div className="w-9 h-9 rounded-xl bg-blue-100/80 dark:bg-[#5a25eb]/15 border border-blue-300/60 dark:border-[#5a25eb]/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform mt-0.5">
                          <Icon className="w-4.5 h-4.5 text-[#5a25eb] dark:text-[#cbbeff]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="font-semibold text-zinc-800 dark:text-zinc-200 group-hover:text-zinc-900 dark:group-hover:text-white truncate block text-sm">
                            {p.title}
                          </span>
                          <span className="text-xs text-zinc-500 dark:text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-zinc-400 truncate block mt-0.5">
                            {p.subtitle}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Messages */}
            {messages.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.12 }}
                  className={`flex gap-2.5 max-w-2xl ${isUser ? 'ml-auto justify-end' : 'mr-auto justify-start'}`}
                >
                  {!isUser && (
                    <div className="w-7 h-7 rounded-full bg-white/80 dark:bg-[#12121c] border border-blue-200 dark:border-[#222230] flex items-center justify-center shrink-0 shadow-2xs mt-0.5 overflow-hidden">
                      <AILoaderOrb state={isSpeakingVoice ? 'speaking' : 'idle'} variant="avatar" size={22} />
                    </div>
                  )}

                  <div className={`space-y-1 ${isUser ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                        isUser
                          ? 'bg-[#5a25eb] text-white rounded-br-xs shadow-xs font-medium'
                          : 'bg-white/85 dark:bg-[#0c0c12] border border-blue-200/70 dark:border-[#1c1c28] text-zinc-900 dark:text-[#e4e1e8] rounded-bl-xs shadow-2xs backdrop-blur-md'
                      }`}
                    >
                      {isUser && msg.attachment && (
                        <div className="mb-2 p-2 rounded-xl bg-white/15 border border-white/25 flex items-center gap-2 text-white">
                          <div className="p-1.5 rounded-lg bg-white/20 shrink-0">
                            <FileText className="w-3.5 h-3.5 text-white" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold truncate leading-tight">{msg.attachment.name}</p>
                            <p className="text-[10px] text-white/75 font-mono">{msg.attachment.size}</p>
                          </div>
                        </div>
                      )}

                      <div>{renderFormattedContent(msg.content, isUser)}</div>

                      {!isUser && (
                        <div className="mt-2.5 pt-2 border-t border-zinc-100 dark:border-white/10 flex items-center justify-between text-[10px] text-zinc-400">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => speakText(msg.content)}
                              className="flex items-center gap-1 text-[#5a25eb] dark:text-[#cbbeff] hover:underline font-semibold cursor-pointer"
                            >
                              <Volume2 className="w-3 h-3" />
                              <span>Listen</span>
                            </button>
                            <span>•</span>
                            <button
                              onClick={() => handleCopy(msg.id, msg.content)}
                              className="flex items-center gap-1 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
                            >
                              {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                              <span>{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
                            </button>
                          </div>
                          <span className="font-mono text-[9px]">{msg.timestamp}</span>
                        </div>
                      )}
                    </div>

                    {!isUser && msg.sourceType && (
                      <div className="flex flex-wrap items-center gap-1 pt-0.5">
                        {msg.sourceType === 'evidence-backed' && (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 font-medium">
                            <FileCheck className="w-3 h-3" />
                            <span className="font-mono text-[9px] truncate max-w-[180px]">
                              {msg.evidenceDoc || 'Degree_Certificate_SLRTCE_2024.pdf'}
                            </span>
                          </div>
                        )}
                        {msg.sourceType === 'user-confirmed' && (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-[#5a25eb]/10 border border-[#5a25eb]/25 text-[#5a25eb] dark:text-[#cbbeff]">
                            <UserCheck className="w-3 h-3" />
                            <span>{msg.sourceNote || 'Self-asserted'}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {isUser && (
                      <div className="text-right text-[9px] text-zinc-400">
                        {msg.timestamp}
                      </div>
                    )}
                  </div>

                  {isUser && (
                    <div className="w-7 h-7 rounded-full bg-[#5a25eb]/15 border border-[#5a25eb]/30 flex items-center justify-center shrink-0 font-bold text-[10px] text-[#5a25eb] dark:text-[#cbbeff] mt-0.5">
                      {userName.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </motion.div>
              );
            })}

            {isStreaming && streamingText && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-2.5 max-w-2xl mr-auto justify-start"
              >
                <div className="w-7 h-7 rounded-full bg-[#5a25eb]/15 border border-[#5a25eb]/30 flex items-center justify-center shrink-0 shadow-xs mt-0.5 overflow-hidden">
                  <AILoaderOrb state={isSpeakingVoice ? 'speaking' : 'generating'} variant="avatar" size={22} />
                </div>
                <div className="p-3.5 rounded-2xl text-xs sm:text-sm bg-white/85 dark:bg-[#0c0c12] border-2 border-[#5a25eb] text-zinc-900 dark:text-white shadow-xs backdrop-blur-md">
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
                className="flex items-center gap-2.5 py-1.5"
              >
                <div className="inline-flex h-9 items-center gap-2.5 rounded-full pl-2.5 pr-4 bg-white/85 dark:bg-[#0c0c12] border border-blue-200 dark:border-[#222230] shadow-xs backdrop-blur-md">
                  <ThinkingOrb
                    state={currentThinkingStep.state}
                    size={20}
                    theme="auto"
                  />
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={currentThinkingStep.text}
                      initial={{ opacity: 0, y: 3 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -3 }}
                      transition={{ duration: 0.22 }}
                      className="whitespace-nowrap text-xs font-medium text-zinc-700 dark:text-zinc-200"
                    >
                      {currentThinkingStep.text}
                    </motion.span>
                  </AnimatePresence>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* === BOTTOM INPUT BAR === */}
          <div className="pt-1.5 pb-2 sm:pb-3 bg-transparent shrink-0 space-y-2 relative z-20 px-2 sm:px-3">

            {/* Mode Chips */}
            <div className="flex items-center justify-between gap-2 px-0.5">
              <div className="flex items-center gap-1 p-0.5 rounded-full bg-white/70 dark:bg-[#12121c] border border-blue-200/70 dark:border-[#222230] backdrop-blur-md overflow-x-auto scrollbar-none max-w-full shrink-0">
                <button
                  type="button"
                  onClick={() => setChatMode('normal')}
                  className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                    chatMode === 'normal'
                      ? 'bg-[#5a25eb] text-white shadow-xs'
                      : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  <QuestionIcon className="w-3 h-3" />
                  <span>Normal</span>
                </button>

                <button
                  type="button"
                  onClick={() => setChatMode('save')}
                  className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                    chatMode === 'save'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  <Save className="w-3 h-3" />
                  <span>Save</span>
                </button>

                <button
                  type="button"
                  onClick={() => setChatMode('share')}
                  className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                    chatMode === 'share'
                      ? 'bg-[#8a54ff] text-white shadow-xs'
                      : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  <Share2 className="w-3 h-3" />
                  <span>Share</span>
                </button>
              </div>

              <div className="flex items-center gap-2 text-[10px] text-zinc-400">
                {isSpeakingVoice && (
                  <button
                    onClick={stopAudio}
                    className="p-1 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                    title="Stop Audio"
                  >
                    <VolumeX className="w-3.5 h-3.5" />
                  </button>
                )}
                {messages.length > 0 && (
                  <button
                    onClick={handleResetChat}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/60 dark:hover:bg-white/10 transition-colors cursor-pointer"
                    title="Reset Chat"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span className="text-[10px]">Clear</span>
                  </button>
                )}
                <div className="hidden sm:flex items-center gap-1 text-[10px] text-zinc-400">
                  <ShieldCheck className="w-3 h-3 text-emerald-500" />
                  <span>Encrypted</span>
                </div>
              </div>
            </div>

            {/* Attached File Preview */}
            <AnimatePresence>
              {attachedFile && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.95 }}
                  className="flex items-center gap-2 p-1.5 pl-2.5 pr-2 rounded-xl bg-white/85 dark:bg-[#12121c] border border-blue-200 dark:border-[#272738] shadow-xs backdrop-blur-md max-w-sm"
                >
                  <div className="p-1 rounded-md bg-[#5a25eb]/10 dark:bg-[#5a25eb]/20 text-[#5a25eb] dark:text-[#cbbeff] shrink-0">
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">{attachedFile.name}</p>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">{attachedFile.formattedSize}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAttachedFile(null)}
                    className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                    title="Remove attachment"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input Container with Animated Gradient Border */}
            <motion.div
              animate={{
                boxShadow: [
                  '0 0 15px rgba(90, 37, 235, 0.2), inset 0 0 10px rgba(90, 37, 235, 0.05)',
                  '0 0 25px rgba(90, 37, 235, 0.4), inset 0 0 15px rgba(90, 37, 235, 0.1)',
                  '0 0 15px rgba(90, 37, 235, 0.2), inset 0 0 10px rgba(90, 37, 235, 0.05)'
                ]
              }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="w-full max-w-2xl mx-auto rounded-3xl p-[1.5px] relative overflow-hidden
                         bg-white/60 dark:bg-[#0c0c12]"
            >
              <motion.div
                animate={{
                  backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
                }}
                transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 rounded-3xl opacity-80"
                style={{
                  background: 'linear-gradient(90deg, #5a25eb, #93c5fd, #cbbeff, #5a25eb)',
                  backgroundSize: '300% 300%',
                }}
              />

              <div className="relative w-full h-full
                              bg-white/85 dark:bg-[#0c0c12]/95
                              backdrop-blur-xl
                              rounded-[calc(1.5rem-1px)] p-3 z-10">

                <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/50 dark:from-white/[0.03] to-transparent pointer-events-none rounded-t-[calc(1.5rem-1px)]" />

                <div className="flex items-center gap-2 mb-3 px-1 relative z-10">
                  <Sparkles className="w-4 h-4 text-[#5a25eb] dark:text-[#cbbeff]" />
                  <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 tracking-wide">
                    Unlock more features with Pro
                  </span>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="relative flex items-center
                             bg-white/70 dark:bg-[#050508]/80
                             rounded-2xl
                             border border-blue-200/80 dark:border-[#1a1a24]
                             focus-within:border-[#5a25eb]/50
                             focus-within:ring-1 focus-within:ring-[#5a25eb]/20
                             transition-all p-1 z-10 backdrop-blur-md"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.txt,.json,.csv"
                  />

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 rounded-xl text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-blue-100/60 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer ml-1"
                    title="Attach document or image"
                    aria-label="Attach file"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>

                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={
                      voiceState === 'listening'
                        ? 'Listening...'
                        : attachedFile
                        ? `Message with ${attachedFile.name}...`
                        : chatMode === 'save'
                        ? 'Save record (e.g. "Passport: Z8921098")...'
                        : chatMode === 'share'
                        ? 'Share fields (e.g. "Degree with Acme")...'
                        : 'Ask me anything...'
                    }
                    className="flex-1 bg-transparent px-3 py-2 text-xs sm:text-sm text-zinc-800 dark:text-zinc-100 placeholder-zinc-500 focus:outline-none"
                  />

                  <button
                    type="button"
                    onClick={toggleVoiceInput}
                    className={`p-2 rounded-xl transition-all cursor-pointer mr-1 ${
                      voiceState === 'listening'
                        ? 'bg-red-500 text-white animate-pulse'
                        : 'text-zinc-500 hover:text-[#5a25eb] dark:hover:text-white hover:bg-blue-100/60 dark:hover:bg-zinc-800/50'
                    }`}
                    title="Voice Input"
                  >
                    {voiceState === 'listening' ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    type="submit"
                    disabled={(!inputText.trim() && !attachedFile) || isTyping || isStreaming}
                    className="p-2 rounded-xl bg-[#5a25eb] hover:bg-[#6b37fa] text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-md shadow-[#5a25eb]/30 cursor-pointer mr-1"
                    aria-label="Send"
                  >
                    <ArrowUp className="w-4 h-4 stroke-[3]" />
                  </button>
                </form>

                <div className="flex items-center gap-4 mt-3 px-2 relative z-10">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 text-[10px] font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                  >
                    <Paperclip className="w-3 h-3" />
                    <span>Import file</span>
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-1.5 text-[10px] font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Tools</span>
                  </button>
                </div>

              </div>
            </motion.div>

            <p className="text-[10px] text-center text-zinc-400 dark:text-zinc-600 mt-2 relative z-10">
              SYNDEO AI • Zero-knowledge cryptographic personal records
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
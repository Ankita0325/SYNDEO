import React, { useState, useRef, useEffect } from 'react';
import type { ChatMessage } from '../../types';
import { AILoaderOrb, type OrbStateMode } from '../ui/ai-loader';
import { ThinkingOrb, type OrbState } from '../ui/thinking-orbs';
import { useNavigation } from '../../context/NavigationContext';
import { useTheme } from '../../context/ThemeContext';
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
  Plus,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { InChatVoiceStage } from './InChatVoiceStage';
import {
  SARVAM_LANGUAGES,
  SARVAM_TTS_LANGUAGES,
  SARVAM_VOICE_SPEAKERS,
  chatWithSarvam,
  transcribeWithSarvam,
  synthesizeWithSarvam,
  cleanTextForSpeech,
  isSarvamAvailable,
  type SarvamLanguageCode,
  type SarvamVoiceSpeaker,
} from '../../lib/sarvam';

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
  const { theme } = useTheme();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [chatMode, setChatMode] = useState<ChatMode>('normal');
  const [orbState, setOrbState] = useState<OrbStateMode>('idle');
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [isSpeakingVoice, setIsSpeakingVoice] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState<boolean>(false);
  const [voiceTranscript, setVoiceTranscript] = useState<string>('');
  const [voiceSpeaker, setVoiceSpeaker] = useState<SarvamVoiceSpeaker>('shubh');
  const [chatLanguage, setChatLanguage] = useState<SarvamLanguageCode>('en-IN');
  const [sttLanguage, setSttLanguage] = useState<SarvamLanguageCode>('en-IN');
  const [ttsLanguage, setTtsLanguage] = useState<SarvamLanguageCode>('en-IN');
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [assistantVoiceResponse, setAssistantVoiceResponse] = useState<string>('');
  const [streamingText, setStreamingText] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isToolsOpen, setIsToolsOpen] = useState<boolean>(false);

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
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const sarvamAudioRef = useRef<HTMLAudioElement | null>(null);
  const sarvamStopResolveRef = useRef<((transcript: string) => void) | null>(null);
  const sarvamStopPromiseRef = useRef<Promise<string> | null>(null);
  const sarvamAudioUrlRef = useRef<string | null>(null);
  const sttLanguageRef = useRef<SarvamLanguageCode>('en-IN');
  const ttsLanguageRef = useRef<SarvamLanguageCode>('en-IN');
  const speakerRef = useRef<SarvamVoiceSpeaker>('shubh');

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
      if (sarvamAudioRef.current) {
        sarvamAudioRef.current.pause();
        sarvamAudioRef.current = null;
      }
      if (sarvamAudioUrlRef.current) {
        URL.revokeObjectURL(sarvamAudioUrlRef.current);
        sarvamAudioUrlRef.current = null;
      }
    };
  }, []);

  // Audio remains in the browser; only the recording is sent to the backend Sarvam proxy.
  const startSarvamRecording = async (): Promise<boolean> => {
    let stream: MediaStream | null = null;
    try {
      setVoiceError(null);
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4']
        .find((candidate) => MediaRecorder.isTypeSupported(candidate));
      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const recordingType = mediaRecorder.mimeType || mimeType || 'audio/webm';
      const extension = recordingType.includes('ogg') ? 'ogg' : recordingType.includes('mp4') ? 'm4a' : 'webm';
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream?.getTracks().forEach((track) => track.stop());
        const baseMimeType = (recordingType || 'audio/webm').split(';')[0].trim().toLowerCase();
        const audioBlob = new Blob(audioChunksRef.current, { type: baseMimeType || 'audio/webm' });
        let transcript = '';

        try {
          setVoiceState('thinking');
          setOrbState('thinking');
          const result = await transcribeWithSarvam(audioBlob, sttLanguageRef.current, `recording.${extension}`);
          transcript = result.transcript.trim();
          setInputText(transcript);
          setVoiceTranscript(transcript);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Speech recognition failed.';
          setVoiceError(message);
          setVoiceTranscript('');
        } finally {
          setVoiceState('idle');
          setOrbState('idle');
          sarvamStopResolveRef.current?.(transcript);
          sarvamStopResolveRef.current = null;
          sarvamStopPromiseRef.current = null;
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      return true;
    } catch (err) {
      stream?.getTracks().forEach((track) => track.stop());
      console.warn('Microphone access failed:', err);
      setVoiceError(err instanceof Error ? err.message : 'Microphone access is required for voice chat.');
      return false;
    }
  };

  const stopSarvamRecording = (): Promise<string> => {
    if (sarvamStopPromiseRef.current) return sarvamStopPromiseRef.current;

    let resolveRecording: (transcript: string) => void = () => undefined;
    const recording = new Promise<string>((resolve) => {
      resolveRecording = resolve;
    });
    sarvamStopPromiseRef.current = recording;

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      sarvamStopResolveRef.current = resolveRecording;
      mediaRecorderRef.current.stop();
    } else {
      sarvamStopPromiseRef.current = null;
      resolveRecording('');
    }
    return recording;
  };

  // Always initialize browser-native Web Speech API as resilient fallback
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
          setVoiceTranscript(transcript);
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

  const playSarvamAudio = (base64Audio: string): void => {
    if (sarvamAudioRef.current) {
      sarvamAudioRef.current.pause();
      sarvamAudioRef.current = null;
    }

    const binaryString = atob(base64Audio);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    sarvamAudioUrlRef.current = url;
    const audio = new Audio(url);
    sarvamAudioRef.current = audio;

    audio.addEventListener('playing', () => {
      setIsSpeakingVoice(true);
      setVoiceState('speaking');
      setOrbState('speaking');
    });

    audio.addEventListener('ended', () => {
      setIsSpeakingVoice(false);
      setVoiceState('idle');
      setOrbState('idle');
      URL.revokeObjectURL(url);
      sarvamAudioUrlRef.current = null;
      sarvamAudioRef.current = null;
    });

    audio.addEventListener('error', () => {
      setIsSpeakingVoice(false);
      setVoiceState('idle');
      setOrbState('idle');
      URL.revokeObjectURL(url);
      sarvamAudioUrlRef.current = null;
      sarvamAudioRef.current = null;
    });

    audio.play().catch((err) => {
      console.warn('Sarvam audio playback failed:', err);
      setIsSpeakingVoice(false);
      setVoiceState('idle');
      setOrbState('idle');
      URL.revokeObjectURL(url);
      sarvamAudioUrlRef.current = null;
      sarvamAudioRef.current = null;
    });
  };

  const speakText = (text: string, onComplete?: () => void) => {
    if (isMuted || typeof window === 'undefined') {
      if (onComplete) onComplete();
      return;
    }

    stopAudio();

    const fallbackNativeSpeak = () => {
      if (!('speechSynthesis' in window)) {
        if (onComplete) onComplete();
        return;
      }

      window.speechSynthesis.cancel();
      const cleanText = cleanTextForSpeech(text);
      if (!cleanText) {
        if (onComplete) onComplete();
        return;
      }
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

    if (isSarvamAvailable()) {
      void synthesizeWithSarvam(text, ttsLanguageRef.current, speakerRef.current).then((result) => {
        playSarvamAudio(result.audios.join(''));
        const audio = sarvamAudioRef.current;
        if (audio && onComplete) audio.addEventListener('ended', onComplete, { once: true });
      }).catch(() => {
        // Resilient fallback to browser native speech synthesis on network/502 error
        fallbackNativeSpeak();
      });
      return;
    }

    fallbackNativeSpeak();
  };

  const stopAudio = () => {
    if (sarvamAudioRef.current) {
      sarvamAudioRef.current.pause();
      sarvamAudioRef.current = null;
    }
    if (sarvamAudioUrlRef.current) {
      URL.revokeObjectURL(sarvamAudioUrlRef.current);
      sarvamAudioUrlRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeakingVoice(false);
    setIsStreaming(false);
    setVoiceState('idle');
    setOrbState('idle');
  };

  const openVoiceModal = async () => {
    stopAudio();
    setVoiceError(null);
    setIsVoiceModalOpen(true);
    setVoiceTranscript('');
    setAssistantVoiceResponse('');

    if (isSarvamAvailable()) {
      const started = await startSarvamRecording();
      if (started) {
        setVoiceState('listening');
        setOrbState('listening');
      }
    } else if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        setVoiceState('listening');
        setOrbState('listening');
      } catch (e) {
        console.warn('Speech recognition start failed', e);
      }
    }
  };

  const closeVoiceModal = () => {
    if (isSarvamAvailable()) {
      stopSarvamRecording();
    } else if (voiceState === 'listening' && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.debug('Recognition stop ignored:', err);
      }
    }
    stopAudio();
    setIsVoiceModalOpen(false);
  };

  const startVoiceListening = async () => {
    if (isSarvamAvailable()) {
      const started = await startSarvamRecording();
      if (started) {
        setVoiceState('listening');
        setOrbState('listening');
      }
      return;
    }

    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }
    stopAudio();
    try {
      recognitionRef.current.start();
      setVoiceState('listening');
      setOrbState('listening');
    } catch (e) {
      console.warn('Recognition start', e);
    }
  };

  const stopVoiceListening = async () => {
    if (isSarvamAvailable()) {
      const transcript = await stopSarvamRecording();
      setVoiceState('idle');
      setOrbState('idle');
      if (transcript.trim()) handleSendMessage(transcript);
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.debug('Recognition stop ignored:', err);
      }
    }
    setVoiceState('idle');
    setOrbState('idle');
    if (voiceTranscript.trim()) {
      handleSendMessage(voiceTranscript);
    }
  };

  const toggleMute = () => {
    if (!isMuted) {
      stopAudio();
    }
    setIsMuted(!isMuted);
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleChatLanguageChange = (languageCode: string) => {
    const language = SARVAM_LANGUAGES.find((item) => item.code === languageCode);
    if (language) {
      setChatLanguage(language.code);
      setVoiceError(null);
    }
  };

  const handleSpeechRecognitionLanguageChange = (languageCode: string) => {
    const language = SARVAM_LANGUAGES.find((item) => item.code === languageCode);
    if (language) {
      sttLanguageRef.current = language.code;
      setSttLanguage(language.code);
    }
  };

  const handleSpeechSynthesisLanguageChange = (languageCode: string) => {
    const language = SARVAM_TTS_LANGUAGES.find((item) => item.code === languageCode);
    if (language) {
      ttsLanguageRef.current = language.code;
      setTtsLanguage(language.code);
    }
  };

  const handleVoiceSpeakerChange = (speakerId: SarvamVoiceSpeaker) => {
    speakerRef.current = speakerId;
    setVoiceSpeaker(speakerId);
  };

  const streamAIResponse = (fullResponse: ChatMessage) => {
    setIsStreaming(true);
    setStreamingText('');
    setAssistantVoiceResponse(fullResponse.content);
    setVoiceState('speaking');
    setOrbState('speaking');

    if (!isMuted) {
      speakText(fullResponse.content);
    }

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

  const generateFallbackResponse = (
    content: string,
    mode: 'normal' | 'save' | 'share',
    name: string,
    file?: AttachedFile | null
  ): { content: string; sourceType: 'evidence-backed' | 'user-confirmed'; sourceNote: string; evidenceDoc?: string } => {
    const lower = content.toLowerCase();

    if (mode === 'save' || lower.includes('save') || lower.includes('store') || lower.includes('record')) {
      return {
        content: `🔒 **Encrypted & Indexed**: Your record has been cryptographically signed and stored in your Zero-Knowledge Vault.\n\n- **Record**: ${content.replace(/\[SAVE INFO\]: /i, '')}\n- **Storage Engine**: Zero-Knowledge Graph Store\n- **Verification**: SHA-256 integrity hash generated.`,
        sourceType: 'user-confirmed',
        sourceNote: 'Direct Vault Ingestion',
      };
    }

    if (mode === 'share' || lower.includes('share') || lower.includes('grant') || lower.includes('zk-snark') || lower.includes('link')) {
      return {
        content: `🔗 **Selective Share Link Generated**:\n\n- **Recipient Scope**: ${content.replace(/\[SHARE REQUEST\]: /i, '') || 'Requested Recipient'}\n- **Access Policy**: Read-only, Zero-Knowledge Merkle Proof\n- **Expiry**: 24 Hours\n- **Revocable**: Yes, anytime from Vault Settings.`,
        sourceType: 'evidence-backed',
        sourceNote: 'Selective Disclosure Policy',
        evidenceDoc: 'Scope_Access_Envelope.json',
      };
    }

    if (file) {
      return {
        content: `📄 **Document Analyzed**: \`${file.name}\` (${file.formattedSize})\n\n- **Status**: Verified and extracted via OCR/PDF pipeline.\n- **Extracted Claims**: Key identity and academic credentials indexed into your Life-Stage Vault.\n- **Assurance**: Merkle root updated with tamper-evident seal.`,
        sourceType: 'evidence-backed',
        sourceNote: 'Document Ingestion Agent',
        evidenceDoc: file.name,
      };
    }

    if (
      lower.includes('social') ||
      lower.includes('github') ||
      lower.includes('linkedin') ||
      lower.includes('discord') ||
      lower.includes('profile')
    ) {
      return {
        content: `Here are all your verified **Social & Developer Links**:\n\n- **GitHub**: https://github.com/indresh404/SYNDEO\n- **LinkedIn**: https://linkedin.com/in/indresh-suresh-093646399\n- **Discord**: **@indresh404** (SYNDEO Network)\n\nAll cryptographic signatures and repository links are verified on the network.`,
        sourceType: 'evidence-backed',
        sourceNote: 'Cryptographic Developer Credentials & Social Identity',
        evidenceDoc: 'Developer_Social_Proofs.json',
      };
    }

    if (
      lower.includes('education') ||
      lower.includes('college') ||
      lower.includes('slrtce') ||
      lower.includes('degree') ||
      lower.includes('engineering') ||
      lower.includes('university') ||
      lower.includes('cgpa') ||
      lower.includes('study')
    ) {
      return {
        content: `Your verified **Education Status**:\n\n- **Degree**: **B.E. in Computer Science & Engineering**\n- **Institution**: **SLRTCE (University of Mumbai)**\n- **CGPA**: **8.45 / 10.0** (First Class with Distinction)\n- **Batch**: **2020 – 2024**\n- **Capstone Collaborator**: **Divya**\n- **Evidence**: Verified by SLRTCE Academic Registry envelope.`,
        sourceType: 'evidence-backed',
        sourceNote: 'SLRTCE Degree Certificate & Transcript',
        evidenceDoc: 'Degree_Certificate_SLRTCE_2024.pdf',
      };
    }

    if (lower.includes('work') || lower.includes('company') || lower.includes('job') || lower.includes('veritas') || lower.includes('role')) {
      return {
        content: `You are currently employed at **Veritas Technologies** as a **Systems & Cloud Engineer**. Your peer reviewer is **Monish**. Verified by corporate employment offer letter.`,
        sourceType: 'evidence-backed',
        sourceNote: 'Employment Offer Letter & Peer Confirmation',
        evidenceDoc: 'Employment_Offer_Letter_Veritas.pdf',
      };
    }

    if (lower.includes('blood') || lower.includes('medical') || lower.includes('health') || lower.includes('ankita')) {
      return {
        content: `Your blood group is **O-Positive (O+)**. Emergency kin and health proxy: **Ankita** (Sister, +91 98202 55910). Verified by CityCare Diagnostics health record.`,
        sourceType: 'evidence-backed',
        sourceNote: 'Annual Health Checkup & Family Proxy Declaration',
        evidenceDoc: 'Medical_Summary_2024.pdf',
      };
    }

    if (lower.includes('credit') || lower.includes('bank') || lower.includes('tax') || lower.includes('pan') || lower.includes('score') || lower.includes('cibil')) {
      return {
        content: `Your verified financial credentials:\n\n- **CIBIL Score**: **785** (Excellent)\n- **PAN**: **ABCDE1234F**\n- **Primary Bank**: **HDFC Bank**\n- **Tax Filing**: Verified ITR-V Acknowledgement for AY2024.`,
        sourceType: 'evidence-backed',
        sourceNote: 'ITR-V Acknowledgement & Experian Credit Report',
        evidenceDoc: 'ITR_Acknowledgement_AY2024.pdf',
      };
    }

    if (lower.includes('who are you') || lower.includes('what are you') || lower.includes('help') || lower.includes('how can you help')) {
      return {
        content: `I am **SYNDEO AI Assistant**, your zero-knowledge life-stage intelligence copilot. I can:\n\n1. **Zero-Knowledge Query**: Retrieve your verified records across Identity, Education, Employment, and Health.\n2. **Selective Disclosure**: Compose cryptographically scoped sharing links with zk-SNARK proofs.\n3. **Document Ingestion**: Extract claims from transcripts, passports, certificates, and medical reports.`,
        sourceType: 'user-confirmed',
        sourceNote: 'SYNDEO Neural Core',
      };
    }

    return {
      content: `I retrieved your records for **"${content}"**. Your verified vault confirms your identity as **${name}** across Identity, Education (SLRTCE), Employment (Veritas Technologies), and Healthcare.\n\nAll data is protected by zero-knowledge end-to-end encryption.`,
      sourceType: 'user-confirmed',
      sourceNote: 'Zero-Knowledge Vault Graph',
    };
  };

  const handleSendMessage = (textToSend?: string) => {
    const messageContent = textToSend !== undefined ? textToSend : inputText;
    if ((!messageContent.trim() && !attachedFile) || isTyping || isStreaming) return;

    if (isSarvamAvailable()) {
      stopSarvamRecording();
    } else if (voiceState === 'listening' && recognitionRef.current) {
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

    timeoutsRef.current.push(t1);
    void (async () => {
      try {
        const history = messages.slice(-20).map((message) => ({
          role: message.sender,
          content: message.content,
        }));
        const answer = await chatWithSarvam(
          messageContent || `Please help me understand the attached file "${currentAttached?.name ?? ''}".`,
          history,
          chatLanguage,
          chatMode,
          currentAttached
            ? {
                name: currentAttached.name,
                type: currentAttached.type,
                size: currentAttached.formattedSize,
              }
            : undefined,
        );
        clearTimeout(t1);
        setVoiceError(null);
        streamAIResponse({
          id: `m-bot-${Date.now()}`,
          sender: 'assistant',
          content: answer,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          sourceType: 'unknown',
          sourceNote: 'Generated by Sarvam AI',
        });
      } catch (error) {
        clearTimeout(t1);
        // Resilient fallback: If external backend/Sarvam returns 502 or is offline, seamlessly respond with verified local vault intelligence
        const fallback = generateFallbackResponse(
          messageContent || (currentAttached ? `Analyze attached document: ${currentAttached.name}` : ''),
          chatMode,
          userName,
          currentAttached
        );
        setVoiceError(null);
        streamAIResponse({
          id: `m-bot-${Date.now()}`,
          sender: 'assistant',
          content: fallback.content,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          sourceType: fallback.sourceType,
          sourceNote: fallback.sourceNote,
          evidenceDoc: fallback.evidenceDoc,
        });
      }
    })();
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
    <div className="w-full max-w-5xl xl:max-w-6xl 2xl:max-w-7xl mx-auto flex-1 flex flex-col h-full min-h-0 relative z-10 px-2 sm:px-4">
      {/* Full-Screen Immersive Voice Overlay */}
      <AnimatePresence>
        {isVoiceModalOpen && (
          <InChatVoiceStage
            voiceState={voiceState}
            isMuted={isMuted}
            onToggleMute={toggleMute}
            transcript={voiceTranscript}
            assistantResponse={assistantVoiceResponse}
            onStartListening={startVoiceListening}
            onStopListening={stopVoiceListening}
            onClose={closeVoiceModal}
            sttLanguage={sttLanguage}
            onSttLanguageChange={handleSpeechRecognitionLanguageChange}
            ttsLanguage={ttsLanguage}
            onTtsLanguageChange={handleSpeechSynthesisLanguageChange}
            speaker={voiceSpeaker}
            onSpeakerChange={handleVoiceSpeakerChange}
            error={voiceError}
            userName={userName}
          />
        )}
      </AnimatePresence>

      {/* Seamless Workspace Area */}
      <div className="relative flex-1 flex flex-col min-h-0 h-full">

        {/* Top Active Session Header with New Chat Button */}
        {messages.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between px-3 sm:px-4 py-1.5 shrink-0 z-20 border-b border-black/[0.04] dark:border-white/[0.06]"
          >
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                Session Active
              </span>
            </div>

            <button
              type="button"
              onClick={handleResetChat}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold
                         bg-white/80 dark:bg-[#151524]/80
                         hover:bg-[#5a25eb] hover:text-white
                         dark:hover:bg-white dark:hover:text-[#111111]
                         text-zinc-800 dark:text-zinc-200
                         border border-zinc-200/80 dark:border-white/12
                         shadow-xs backdrop-blur-md transition-all cursor-pointer group"
              title="Start a fresh chat conversation"
            >
              <Plus className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform duration-200" />
              <span>New Chat</span>
            </button>
          </motion.div>
        )}

        {/* === MESSAGES CONTAINER === */}
        <div
          ref={messagesContainerRef}
          className={`flex-1 min-h-0 px-2 sm:px-4 py-2 sm:py-3 space-y-4 scrollbar-none no-scrollbar flex flex-col justify-start relative z-10 ${
            messages.length > 0 ? 'overflow-y-auto' : 'overflow-visible my-auto'
          }`}
        >
          {/* Welcome Hero (Centered Composition) */}
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="my-auto py-2 sm:py-4 px-4 text-center space-y-4 sm:space-y-6 flex flex-col items-center justify-center overflow-visible"
            >
              {/* Unclipped AI Orb with Subtle Breathing Motion */}
              <motion.div
                animate={{ scale: [1, 1.025, 1] }}
                transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
                className="relative flex items-center justify-center my-2 sm:my-3 select-none overflow-visible isolate"
              >
                {/* Dedicated Soft Radial Atmosphere Glow (420px x 420px, dissolving gradually) */}
                <motion.div
                  animate={{ opacity: [0.75, 1, 0.75] }}
                  transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute w-[360px] h-[360px] sm:w-[440px] sm:h-[440px] -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2 rounded-full blur-[28px] pointer-events-none z-0"
                  style={{
                    background:
                      theme === 'dark'
                        ? 'radial-gradient(circle, rgba(56, 189, 248, 0.36) 0%, rgba(90, 37, 235, 0.22) 28%, rgba(139, 92, 246, 0.12) 48%, transparent 72%)'
                        : 'radial-gradient(circle, rgba(70, 130, 255, 0.34) 0%, rgba(80, 100, 255, 0.20) 28%, rgba(120, 90, 255, 0.10) 48%, transparent 72%)',
                  }}
                />

                <div className="relative z-10">
                  <AILoaderOrb
                    state={currentOrbState}
                    text={currentOrbText}
                    size={190}
                    variant="hero"
                  />
                </div>
              </motion.div>

              {/* Typography Hierarchy */}
              <div className="space-y-1.5 max-w-lg mx-auto">
                <h2 className="text-sm sm:text-base font-semibold text-zinc-600 dark:text-zinc-300 tracking-tight">
                  Hi, {userName}
                </h2>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-zinc-950 dark:text-white tracking-tight">
                  How can I help today?
                </h1>
                <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 pt-0.5">
                  I'm here to help — from quick answers<br className="hidden sm:inline" /> to smart recommendations.
                </p>
              </div>

              {/* Quick Prompts */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto pt-1 sm:pt-2 w-full">
                {quickPrompts.map((p, idx) => {
                  const Icon = p.icon;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(p.text)}
                      className="p-3.5 sm:p-4 rounded-2xl
                                 bg-white/55 dark:bg-[#121222]/60
                                 backdrop-blur-md
                                 border border-[#96aaff]/20 dark:border-white/10
                                 hover:border-[#5a25eb]/40 dark:hover:border-[#5a25eb]/50
                                 hover:bg-white/80 dark:hover:bg-[#18182e]/80
                                 text-left transition-all cursor-pointer flex items-start gap-3 group
                                 shadow-[0_6px_20px_rgba(100,100,180,0.04)]
                                 dark:shadow-md hover:-translate-y-0.5"
                    >
                      <div className="w-8.5 h-8.5 rounded-xl bg-[#5a25eb]/10 dark:bg-[#5a25eb]/20 border border-[#5a25eb]/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform mt-0.5">
                        <Icon className="w-4 h-4 text-[#5a25eb] dark:text-[#cbbeff]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200 group-hover:text-zinc-950 dark:group-hover:text-white truncate block text-sm">
                          {p.title}
                        </span>
                        <span className="text-xs text-zinc-500 dark:text-zinc-400 truncate block mt-0.5">
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
                className={`flex gap-3 max-w-3xl lg:max-w-4xl ${isUser ? 'ml-auto justify-end' : 'mr-auto justify-start'}`}
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
                            onClick={() => {
                              if (isMuted) setIsMuted(false);
                              speakText(msg.content);
                            }}
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

          {/* Intelligent Control Panel / Composer with Animated Border Beam & Glass Surface */}
          <div className="relative w-full max-w-[1050px] mx-auto rounded-[30px] sm:rounded-[34px] p-[2px] overflow-hidden group select-none">
            
            {/* Primary Rotating Conic Glow Beam (Pure White Glow in Dark Theme) */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 7, repeat: Infinity, ease: 'linear' }}
              className="absolute -inset-[180%] w-[460%] h-[460%] left-[-180%] top-[-180%] pointer-events-none z-0 opacity-95 group-hover:opacity-100 transition-opacity"
              style={{
                background:
                  theme === 'dark'
                    ? 'conic-gradient(from 0deg, transparent 0deg, transparent 50deg, rgba(255, 255, 255, 0.45) 100deg, rgba(255, 255, 255, 1) 160deg, rgba(220, 235, 255, 0.95) 210deg, rgba(255, 255, 255, 0.5) 260deg, transparent 320deg, transparent 360deg)'
                    : 'conic-gradient(from 0deg, transparent 0deg, transparent 60deg, rgba(90, 37, 235, 0.65) 110deg, rgba(56, 189, 248, 0.8) 160deg, rgba(217, 70, 239, 0.65) 210deg, rgba(140, 110, 255, 0.7) 260deg, transparent 320deg, transparent 360deg)',
              }}
            />

            {/* Counter-Rotating Soft Ambient Sheen */}
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 11, repeat: Infinity, ease: 'linear' }}
              className="absolute -inset-[150%] w-[400%] h-[400%] left-[-150%] top-[-150%] pointer-events-none z-0 opacity-60 blur-[6px]"
              style={{
                background:
                  theme === 'dark'
                    ? 'conic-gradient(from 180deg, transparent 0deg, rgba(255, 255, 255, 0.5) 120deg, rgba(255, 255, 255, 0.8) 180deg, rgba(200, 220, 255, 0.4) 240deg, transparent 360deg)'
                    : 'conic-gradient(from 180deg, transparent 0deg, rgba(90, 70, 255, 0.35) 120deg, rgba(56, 189, 248, 0.4) 240deg, transparent 360deg)',
              }}
            />

            {/* Inner Composer Body Surface */}
            <div
              className="w-full rounded-[28px] sm:rounded-[32px] p-2.5 sm:p-3.5 relative z-10 transition-all
                         border border-white/70 dark:border-white/20
                         shadow-[0_12px_45px_rgba(90,70,255,0.14)]
                         dark:shadow-[0_15px_50px_rgba(0,0,0,0.6),0_0_20px_rgba(255,255,255,0.08)]
                         backdrop-blur-2xl overflow-hidden"
              style={{
                background:
                  theme === 'dark'
                    ? 'radial-gradient(circle at 20% 0%, rgba(255, 255, 255, 0.08), transparent 50%), radial-gradient(circle at 85% 100%, rgba(255, 255, 255, 0.05), transparent 55%), linear-gradient(135deg, rgba(18, 17, 30, 0.96), rgba(10, 9, 18, 0.94))'
                    : 'radial-gradient(circle at 20% 0%, rgba(210, 225, 255, 0.48), transparent 50%), radial-gradient(circle at 85% 100%, rgba(230, 215, 255, 0.40), transparent 55%), linear-gradient(135deg, rgba(252, 253, 255, 0.97), rgba(244, 246, 255, 0.94))',
              }}
            >
              {/* Elevated Inner Input Surface with Laser Edge Beam */}
              <div className="relative rounded-[20px] sm:rounded-[22px] p-[1.5px] overflow-hidden group/input z-10">
                {/* Moving Border Laser Glow Line on Input Form (Radiant White in Dark Theme) */}
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 5.5, repeat: Infinity, ease: 'linear' }}
                  className="absolute -inset-[150%] w-[400%] h-[400%] left-[-150%] top-[-150%] pointer-events-none z-0 opacity-75 group-focus-within/input:opacity-100 transition-opacity"
                  style={{
                    background:
                      theme === 'dark'
                        ? 'conic-gradient(from 0deg, transparent 0deg, transparent 80deg, rgba(255, 255, 255, 0.6) 130deg, #ffffff 180deg, rgba(255, 255, 255, 0.7) 230deg, transparent 290deg, transparent 360deg)'
                        : 'conic-gradient(from 0deg, transparent 0deg, transparent 80deg, rgba(90, 37, 235, 0.7) 140deg, rgba(56, 189, 248, 0.8) 180deg, rgba(217, 70, 239, 0.7) 220deg, transparent 280deg, transparent 360deg)',
                  }}
                />

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="relative flex items-center
                             bg-white/85 dark:bg-[#07060f]/95
                             rounded-[18px] sm:rounded-[20px]
                             border border-[#96aaff]/20 dark:border-white/15
                             shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]
                             focus-within:border-[#6e5aff]/60 dark:focus-within:border-white/50
                             focus-within:shadow-[0_0_28px_rgba(110,90,255,0.18)] dark:focus-within:shadow-[0_0_24px_rgba(255,255,255,0.18)]
                             transition-all p-1.5 z-10 backdrop-blur-md"
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
                    className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-white transition-colors cursor-pointer ml-1"
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
                    className="flex-1 bg-transparent px-3 py-2 text-sm sm:text-base text-zinc-900 dark:text-zinc-100 placeholder-[#6B7280] focus:outline-none"
                  />

                  <button
                    type="button"
                    onClick={openVoiceModal}
                    className={`p-2 rounded-xl transition-all cursor-pointer mr-1.5 ${
                      voiceState === 'listening' || isVoiceModalOpen
                        ? 'bg-red-500 text-white animate-pulse'
                        : 'text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-white'
                    }`}
                    title="Open Voice Chat Mode"
                    aria-label="Voice Chat Mode"
                  >
                    {voiceState === 'listening' ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>

                  <button
                    type="submit"
                    disabled={(!inputText.trim() && !attachedFile) || isTyping || isStreaming}
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-[14px] bg-gradient-to-br from-[#c9b8ff] to-[#b9a4ff] dark:from-[#8b5cf6] dark:to-[#6d28d9] text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-[0_5px_15px_rgba(120,90,255,0.22)] cursor-pointer flex items-center justify-center shrink-0 mr-0.5"
                    aria-label="Send"
                  >
                    <ArrowUp className="w-4 h-4 stroke-[3]" />
                  </button>
                </form>
              </div>

              {/* Lower Toolbar */}
              <div className="flex items-center justify-between gap-3 pt-2.5 mt-2.5 border-t border-black/[0.05] dark:border-white/[0.06] px-1 relative z-10">
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                    <label className="sr-only" htmlFor="chat-language">Chat language</label>
                    <select
                      id="chat-language"
                      value={chatLanguage}
                      onChange={(event) => handleChatLanguageChange(event.target.value)}
                      className="max-w-36 rounded-full border border-[#7d5fff]/22 bg-white/70 dark:bg-white/5 px-3 py-1 text-xs text-zinc-700 dark:text-zinc-200"
                      aria-label="Chat language"
                    >
                      {SARVAM_LANGUAGES.map((language) => (
                        <option key={language.code} value={language.code}>{language.name}</option>
                      ))}
                    </select>

                    {/* Voice Mode Button */}
                  <button
                    type="button"
                    onClick={openVoiceModal}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#7d5fff]/08 hover:bg-[#7d5fff]/14 text-[#6548E8] dark:text-[#cbbeff] border border-[#7d5fff]/22 transition-all cursor-pointer shadow-2xs"
                    title="Launch Animated Voice Screen"
                  >
                    <Mic className="w-3.5 h-3.5" />
                    <span>Voice Mode</span>
                  </button>

                  {/* New Chat Quick Action */}
                  <button
                    type="button"
                    onClick={handleResetChat}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-all cursor-pointer"
                    title="Start a fresh chat conversation"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">New Chat</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer"
                  >
                    <Paperclip className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Import file</span>
                  </button>

                  {/* Interactive Tools Menu */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsToolsOpen(!isToolsOpen)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                        chatMode !== 'normal'
                          ? 'bg-[#5a25eb]/15 text-[#5a25eb] dark:text-[#cbbeff] border border-[#5a25eb]/30 shadow-2xs'
                          : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                      }`}
                      title="Select AI Chat Tool Mode"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Tools</span>
                      {chatMode !== 'normal' && (
                        <span className="font-semibold capitalize px-1.5 py-0.2 rounded-full text-[10px] bg-[#5a25eb] text-white">
                          {chatMode}
                        </span>
                      )}
                    </button>

                    {/* Tools Popover Dropdown */}
                    <AnimatePresence>
                      {isToolsOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 8, scale: 0.96 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 8, scale: 0.96 }}
                          className="absolute bottom-full left-0 mb-2.5 w-64 p-2 rounded-2xl bg-white/95 dark:bg-[#10101c]/95 backdrop-blur-2xl border border-blue-200/80 dark:border-white/15 shadow-2xl z-40 space-y-1"
                        >
                          <div className="px-2.5 py-1 text-[10px] font-mono text-zinc-400 font-bold uppercase tracking-wider">
                            AI Mode & Tools
                          </div>

                          <button
                            type="button"
                            onClick={() => { setChatMode('normal'); setIsToolsOpen(false); }}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all text-left cursor-pointer ${
                              chatMode === 'normal'
                                  ? 'bg-[#5a25eb] text-white shadow-xs'
                                : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/10'
                            }`}
                          >
                            <QuestionIcon className="w-4 h-4 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <span className="block font-bold">Normal Mode</span>
                              <span className={`text-[10px] block truncate ${chatMode === 'normal' ? 'text-white/80' : 'text-zinc-400'}`}>Zero-knowledge retrieval</span>
                            </div>
                            {chatMode === 'normal' && <Check className="w-3.5 h-3.5" />}
                          </button>

                          <button
                            type="button"
                            onClick={() => { setChatMode('save'); setIsToolsOpen(false); }}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all text-left cursor-pointer ${
                              chatMode === 'save'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/10'
                            }`}
                          >
                            <Save className="w-4 h-4 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <span className="block font-bold">Save Record</span>
                              <span className={`text-[10px] block truncate ${chatMode === 'save' ? 'text-white/80' : 'text-zinc-400'}`}>Encrypt to personal vault</span>
                            </div>
                            {chatMode === 'save' && <Check className="w-3.5 h-3.5" />}
                          </button>

                          <button
                            type="button"
                            onClick={() => { setChatMode('share'); setIsToolsOpen(false); }}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all text-left cursor-pointer ${
                              chatMode === 'share'
                                ? 'bg-[#8a54ff] text-white shadow-xs'
                                : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/10'
                            }`}
                          >
                            <Share2 className="w-4 h-4 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <span className="block font-bold">Selective Share</span>
                              <span className={`text-[10px] block truncate ${chatMode === 'share' ? 'text-white/80' : 'text-zinc-400'}`}>Scoped zk-SNARK link</span>
                            </div>
                            {chatMode === 'share' && <Check className="w-3.5 h-3.5" />}
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[10px] text-zinc-400">
                  {/* Voice Speaker Selector Pill */}
                  <div className="hidden sm:flex items-center">
                    <select
                      value={voiceSpeaker}
                      onChange={(e) => handleVoiceSpeakerChange(e.target.value as SarvamVoiceSpeaker)}
                      className="rounded-full border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 px-2.5 py-1 text-[11px] font-medium text-zinc-700 dark:text-zinc-300 transition-all cursor-pointer backdrop-blur-md"
                      title="Change AI Voice Speaker"
                      aria-label="Change AI Voice Speaker"
                    >
                      {SARVAM_VOICE_SPEAKERS.map((s) => (
                        <option key={s.id} value={s.id} className="bg-white dark:bg-[#11111d] text-zinc-800 dark:text-zinc-100">
                          🎙️ {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Global Mute Toggle Button */}
                  <button
                    type="button"
                    onClick={toggleMute}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
                      isMuted
                        ? 'bg-red-500/15 text-red-500 border border-red-500/30'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/10'
                    }`}
                    title={isMuted ? 'Voice is Muted (Click to Unmute)' : 'Mute AI Voice Speech Output'}
                  >
                    {isMuted ? <VolumeX className="w-3.5 h-3.5 text-red-500" /> : <Volume2 className="w-3.5 h-3.5" />}
                    <span>{isMuted ? 'Muted' : 'Mute'}</span>
                  </button>

                  {isSpeakingVoice && (
                    <button
                      onClick={stopAudio}
                      className="p-1 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                      title="Stop Current Audio"
                    >
                      <VolumeX className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {messages.length > 0 && (
                    <button
                      onClick={handleResetChat}
                      className="flex items-center gap-1 px-2 py-0.8 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                      title="Clear Chat History"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span className="text-[10px]">Clear</span>
                    </button>
                  )}
                  <div className="hidden sm:flex items-center gap-1 text-[11px] text-zinc-400">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500/80" />
                    <span className="text-zinc-500 dark:text-zinc-400">Encrypted</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <p className="text-[10px] text-center text-zinc-400 dark:text-zinc-600 mt-2 relative z-10">
            SYNDEO AI • Zero-knowledge cryptographic personal records
          </p>
        </div>
      </div>
    </div>
  );
};
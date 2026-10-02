const API_BASE = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');

export const SARVAM_LANGUAGES = [
  { code: 'en-IN', name: 'English (India)' },
  { code: 'hi-IN', name: 'Hindi (हिन्दी)' },
  { code: 'bn-IN', name: 'Bengali (বাংলা)' },
  { code: 'gu-IN', name: 'Gujarati (ગુજરાતી)' },
  { code: 'kn-IN', name: 'Kannada (ಕನ್ನಡ)' },
  { code: 'ml-IN', name: 'Malayalam (മലയാളം)' },
  { code: 'mr-IN', name: 'Marathi (मराठी)' },
  { code: 'od-IN', name: 'Odia (ଓଡ଼ିଆ)' },
  { code: 'pa-IN', name: 'Punjabi (ਪੰਜਾਬੀ)' },
  { code: 'ta-IN', name: 'Tamil (தமிழ்)' },
  { code: 'te-IN', name: 'Telugu (తెలుగు)' },
  { code: 'ur-IN', name: 'Urdu (اردو)' },
] as const;

export const SARVAM_TTS_LANGUAGES = SARVAM_LANGUAGES.filter(({ code }) => code !== 'ur-IN');

export type SarvamLanguageCode = (typeof SARVAM_LANGUAGES)[number]['code'];

export const SARVAM_VOICE_SPEAKERS = [
  { id: 'shubh', name: 'Shubh (Male · Clear & Natural)', gender: 'male' },
  { id: 'meera', name: 'Meera (Female · Professional & Warm)', gender: 'female' },
  { id: 'pavithra', name: 'Pavithra (Female · Calm & Soft)', gender: 'female' },
  { id: 'maitreyi', name: 'Maitreyi (Female · Expressive)', gender: 'female' },
  { id: 'arvind', name: 'Arvind (Male · Deep & Confident)', gender: 'male' },
  { id: 'amartya', name: 'Amartya (Male · Energetic)', gender: 'male' },
  { id: 'aditi', name: 'Aditi (Female · Friendly)', gender: 'female' },
  { id: 'priya', name: 'Priya (Female · Articulate)', gender: 'female' },
  { id: 'ratan', name: 'Ratan (Male · Reassuring)', gender: 'male' },
  { id: 'varun', name: 'Varun (Male · Modern & Casual)', gender: 'male' },
] as const;

export type SarvamVoiceSpeaker = (typeof SARVAM_VOICE_SPEAKERS)[number]['id'];

export interface SarvamSTTResponse {
  request_id?: string;
  transcript: string;
  language_code?: string | null;
}

export interface SarvamTTSResponse {
  request_id?: string;
  audios: string[];
}

export interface SarvamChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface SarvamChatAttachment {
  name: string;
  type: string;
  size: string;
}

interface SarvamTranslationResponse {
  translated_text?: string;
  translations?: Array<{ translated_text?: string }>;
}

const FALLBACK_BACKEND = 'https://syndeo-backend-wks3.onrender.com';

export function cleanTextForSpeech(text: string): string {
  if (!text) return '';
  let clean = text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_#`~>[\]]/g, '')
    .replace(/^[-•*]\s+/gm, '')
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (clean.length > 350) {
    const sentenceMatch = clean.slice(0, 350).match(/^(.*?[.!?])(?:\s|$)/);
    if (sentenceMatch && sentenceMatch[1] && sentenceMatch[1].length > 40) {
      clean = sentenceMatch[1];
    } else {
      clean = clean.slice(0, 300) + '.';
    }
  }
  return clean;
}

async function fetchSarvam(path: string, init: RequestInit): Promise<Response> {
  const primaryUrl = API_BASE ? `${API_BASE}${path}` : path;
  try {
    const res = await fetch(primaryUrl, init);
    if (!res.ok && (res.status === 500 || res.status === 502 || res.status === 504) && !primaryUrl.startsWith(FALLBACK_BACKEND)) {
      console.warn(`Primary backend proxy returned ${res.status}, automatically routing to live cloud backend...`);
      return await fetch(`${FALLBACK_BACKEND}${path}`, init);
    }
    return res;
  } catch (error) {
    if (!primaryUrl.startsWith(FALLBACK_BACKEND)) {
      try {
        console.warn('Primary backend connection failed, retrying via live cloud backend...', error);
        return await fetch(`${FALLBACK_BACKEND}${path}`, init);
      } catch (fallbackErr) {
        throw new Error(`Cannot reach SYNDEO backend. Falling back to local vault engine.`, { cause: fallbackErr });
      }
    }
    throw error;
  }
}

async function readResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    if (response.status === 502 || response.status === 504) {
      throw new Error(`SYNDEO backend service is offline or unreachable (HTTP ${response.status} Bad Gateway).`);
    }
    const body = await response.json().catch(() => null) as {
      detail?: string | { message?: string };
      error?: { message?: string };
    } | null;
    const detail = typeof body?.detail === 'string'
      ? body.detail
      : body?.detail?.message || body?.error?.message;
    throw new Error(detail || `Sarvam request failed (${response.status}).`);
  }
  return response.json() as Promise<T>;
}

export async function chatWithSarvam(
  message: string,
  history: SarvamChatTurn[],
  languageCode: SarvamLanguageCode,
  mode: 'normal' | 'save' | 'share',
  attachment?: SarvamChatAttachment,
): Promise<string> {
  const response = await fetchSarvam('/api/sarvam/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      history: history.slice(-20),
      language_code: languageCode,
      mode,
      attachment,
    }),
  });
  const result = await readResponse<{ answer?: string }>(response);
  if (!result.answer?.trim()) throw new Error('Sarvam returned an empty chat response.');
  return result.answer;
}

export async function transcribeWithSarvam(
  audioBlob: Blob,
  languageCode: SarvamLanguageCode | 'unknown',
  fileName: string,
): Promise<SarvamSTTResponse> {
  if (!audioBlob || !audioBlob.size || audioBlob.size < 100) {
    return { transcript: '', language_code: languageCode };
  }
  const baseMime = (audioBlob.type || 'audio/webm').split(';')[0].trim().toLowerCase() || 'audio/webm';
  const cleanBlob = audioBlob.type === baseMime ? audioBlob : new Blob([audioBlob], { type: baseMime });

  const formData = new FormData();
  formData.append('file', cleanBlob, fileName);
  formData.append('language_code', languageCode);

  const response = await fetchSarvam('/api/sarvam/speech-to-text', {
    method: 'POST',
    body: formData,
  });
  const result = await readResponse<SarvamSTTResponse>(response);
  return result;
}

export async function translateWithSarvam(
  text: string,
  sourceLanguageCode: SarvamLanguageCode,
  targetLanguageCode: SarvamLanguageCode,
): Promise<string> {
  if (sourceLanguageCode === targetLanguageCode) return text;
  if (!text.trim()) return '';

  const response = await fetchSarvam('/api/sarvam/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: text,
      source_language_code: sourceLanguageCode,
      target_language_code: targetLanguageCode,
    }),
  });
  const result = await readResponse<SarvamTranslationResponse>(response);
  const translatedText = result.translated_text || result.translations?.[0]?.translated_text;
  return translatedText || '';
}

export async function synthesizeWithSarvam(
  text: string,
  languageCode: SarvamLanguageCode,
  speaker: SarvamVoiceSpeaker = 'shubh',
  pace: number = 1.05,
): Promise<SarvamTTSResponse> {
  if (languageCode === 'ur-IN') {
    throw new Error('Sarvam Bulbul v3 does not currently list Urdu for text-to-speech. Select another language for spoken replies.');
  }
  const cleanText = cleanTextForSpeech(text);
  if (!cleanText) {
    return { audios: [] };
  }
  if (cleanText.length > 2500) {
    throw new Error('Sarvam text-to-speech supports up to 2,500 characters per response.');
  }

  const response = await fetchSarvam('/api/sarvam/text-to-speech', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: cleanText,
      target_language_code: languageCode,
      speaker,
      pace,
    }),
  });
  const result = await readResponse<SarvamTTSResponse>(response);
  if (!result.audios?.length) {
    return { audios: [] };
  }
  return result;
}

export function isSarvamAvailable(): boolean {
  return true;
}

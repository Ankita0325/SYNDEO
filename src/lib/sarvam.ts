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

async function fetchSarvam(path: string, init: RequestInit): Promise<Response> {
  const url = `${API_BASE}${path}`;
  try {
    return await fetch(url, init);
  } catch (error) {
    if (error instanceof TypeError) {
      const backend = API_BASE || 'the local proxy (localhost:8000)';
      throw new Error(
        `Cannot reach the SYNDEO backend at ${backend}. Falling back to local vault engine.`,
        { cause: error },
      );
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
  if (!audioBlob.size) throw new Error('No audio was recorded. Try speaking again.');
  const formData = new FormData();
  formData.append('file', audioBlob, fileName);
  formData.append('language_code', languageCode);

  const response = await fetchSarvam('/api/sarvam/speech-to-text', {
    method: 'POST',
    body: formData,
  });
  const result = await readResponse<SarvamSTTResponse>(response);
  if (!result.transcript?.trim()) {
    throw new Error('Sarvam could not recognize speech in that recording. Please try again.');
  }
  return result;
}

export async function translateWithSarvam(
  text: string,
  sourceLanguageCode: SarvamLanguageCode,
  targetLanguageCode: SarvamLanguageCode,
): Promise<string> {
  if (sourceLanguageCode === targetLanguageCode) return text;

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
  if (!translatedText?.trim()) throw new Error('Sarvam returned an empty translation.');
  return translatedText;
}

export async function synthesizeWithSarvam(
  text: string,
  languageCode: SarvamLanguageCode,
  speaker: SarvamVoiceSpeaker = 'shubh',
  pace: number = 1.0,
): Promise<SarvamTTSResponse> {
  if (languageCode === 'ur-IN') {
    throw new Error('Sarvam Bulbul v3 does not currently list Urdu for text-to-speech. Select another language for spoken replies.');
  }
  const cleanText = text.replace(/[*_#[\]()]/g, '').trim();
  if (!cleanText) throw new Error('There is no text to speak.');
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
  if (!result.audios?.length) throw new Error('Sarvam did not return speech audio.');
  return result;
}

export function isSarvamAvailable(): boolean {
  return true;
}

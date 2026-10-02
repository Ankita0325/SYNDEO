import type { SharedLink } from '../types';

const STORAGE_KEY = 'syndeo_shared_links';
const EVENT_NAME = 'syndeo_share_links_change';

export function loadSharedLinks(fallback: SharedLink[] = []): SharedLink[] {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : fallback;
  } catch (err) {
    console.error('Error loading shared links from storage:', err);
    return fallback;
  }
}

export function saveSharedLinks(links: SharedLink[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(links));
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: links }));
  } catch (err) {
    console.error('Error saving shared links to storage:', err);
  }
}

export function subscribeToSharedLinks(callback: (links: SharedLink[]) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleCustomEvent = (event: Event) => {
    const customEvent = event as CustomEvent<SharedLink[]>;
    if (customEvent.detail) {
      callback(customEvent.detail);
    }
  };

  const handleStorageEvent = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY && event.newValue) {
      try {
        const parsed = JSON.parse(event.newValue);
        if (Array.isArray(parsed)) {
          callback(parsed);
        }
      } catch (err) {
        console.error('Error parsing storage event for shared links:', err);
      }
    }
  };

  window.addEventListener(EVENT_NAME, handleCustomEvent);
  window.addEventListener('storage', handleStorageEvent);

  return () => {
    window.removeEventListener(EVENT_NAME, handleCustomEvent);
    window.removeEventListener('storage', handleStorageEvent);
  };
}

import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Dalani Real Estate - Supabase Client Configuration
 * 
 * Security Advisory:
 * - LocalStorage in browsers is NOT a secure vault for private secrets.
 * - Only use the public client-side Anon key (VITE_SUPABASE_ANON_KEY) in frontend code.
 * - NEVER use or expose the Supabase service_role key in frontend applications.
 */

const STORAGE_KEY_URL = 'dalani_supabase_url';
const STORAGE_KEY_ANON = 'dalani_supabase_anon_key';

export interface SupabaseRuntimeConfig {
  url: string;
  anonKey: string;
  source: 'env' | 'custom' | 'none';
}

/**
 * Retrieve the active Supabase URL and Anon Key.
 * Priority:
 * 1. Runtime UI custom values (stored in browser for interactive testing)
 * 2. Vite environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
 */
export function getSupabaseConfig(): SupabaseRuntimeConfig {
  let customUrl = '';
  let customAnon = '';

  if (typeof window !== 'undefined') {
    try {
      customUrl = window.localStorage.getItem(STORAGE_KEY_URL) || '';
      customAnon = window.localStorage.getItem(STORAGE_KEY_ANON) || '';
    } catch {
      // Ignore localStorage errors (e.g. restricted sandbox)
    }
  }

  const getEnv = (key: string): string => {
    try {
      // Vite client environment
      if (typeof import.meta !== 'undefined' && (import.meta as any)?.env?.[key]) {
        return String((import.meta as any).env[key]).trim();
      }
    } catch {}
    try {
      // Node/SSR environment
      if (typeof process !== 'undefined' && process?.env?.[key]) {
        return String(process.env[key]).trim();
      }
    } catch {}
    return '';
  };

  const envUrl = getEnv('VITE_SUPABASE_URL');
  const envAnon = getEnv('VITE_SUPABASE_ANON_KEY');

  if (customUrl && customAnon) {
    return {
      url: customUrl.trim(),
      anonKey: customAnon.trim(),
      source: 'custom',
    };
  }

  if (envUrl && envAnon) {
    return {
      url: envUrl,
      anonKey: envAnon,
      source: 'env',
    };
  }

  return {
    url: customUrl || envUrl,
    anonKey: customAnon || envAnon,
    source: 'none',
  };
}

/**
 * Check whether Supabase credentials (URL and Anon key) are configured and non-empty.
 */
export function isSupabaseConfigured(): boolean {
  const cfg = getSupabaseConfig();
  return Boolean(cfg.url && cfg.anonKey && cfg.url.trim() && cfg.anonKey.trim());
}

/**
 * Set runtime custom credentials for live testing in the browser.
 * Note: localStorage is NOT secure storage for server secrets. Only use Public/Anon keys!
 */
export function setRuntimeSupabaseConfig(url: string, anonKey: string): void {
  if (typeof window === 'undefined') return;
  try {
    if (url.trim()) {
      window.localStorage.setItem(STORAGE_KEY_URL, url.trim());
    } else {
      window.localStorage.removeItem(STORAGE_KEY_URL);
    }

    if (anonKey.trim()) {
      window.localStorage.setItem(STORAGE_KEY_ANON, anonKey.trim());
    } else {
      window.localStorage.removeItem(STORAGE_KEY_ANON);
    }
  } catch {
    // Ignore storage errors
  }
}

/**
 * Clear custom runtime credentials and revert to environment variables.
 */
export function clearRuntimeSupabaseConfig(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY_URL);
    window.localStorage.removeItem(STORAGE_KEY_ANON);
  } catch {
    // Ignore storage errors
  }
}

/**
 * Create or retrieve a Supabase client instance with the given or current configuration.
 */
export function getSupabaseClient(overrideUrl?: string, overrideAnonKey?: string): SupabaseClient | null {
  const config = getSupabaseConfig();
  const targetUrl = (overrideUrl || config.url || '').trim();
  const targetAnonKey = (overrideAnonKey || config.anonKey || '').trim();

  if (!targetUrl || !targetAnonKey) {
    return null;
  }

  // Basic sanity check for valid URL
  try {
    new URL(targetUrl);
  } catch {
    return null;
  }

  return createClient(targetUrl, targetAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
}

/**
 * Default singleton Supabase client based on environment/stored config.
 * May be null if credentials are not configured yet.
 */
export const supabase: SupabaseClient | null = getSupabaseClient();

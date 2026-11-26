export const DEFAULT_TEMP_PASSWORD = 'Edir@1234';

/**
 * Computes a deterministic salted SHA-256 digest in the browser using Web Crypto API,
 * with a clean deterministic fallback if crypto.subtle is unavailable.
 */
export async function hashPassword(password: string, salt = 'aleta-wondo-edir'): Promise<string> {
  const input = `${salt}:${password}`;
  try {
    if (typeof window !== 'undefined' && window.crypto?.subtle) {
      const encoded = new TextEncoder().encode(input);
      const buf = await window.crypto.subtle.digest('SHA-256', encoded);
      return Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    }
  } catch {
    // Fallback below
  }
  let h1 = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h1 ^= input.charCodeAt(i);
    h1 = Math.imul(h1, 0x01000193);
  }
  return `fb-${(h1 >>> 0).toString(16).padStart(8, '0')}`;
}

export async function verifyPassword(
  candidate: string,
  storedHash?: string,
  salt = 'aleta-wondo-edir'
): Promise<boolean> {
  if (!storedHash) {
    return candidate === DEFAULT_TEMP_PASSWORD;
  }
  const candidateHash = await hashPassword(candidate, salt);
  return candidateHash === storedHash;
}

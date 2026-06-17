/**
 * BYOK key encryption via the Web Crypto API. The user's provider key is
 * RSA-OAEP (SHA-256) encrypted with the API's public key before being sent, on
 * top of TLS, so it is decryptable only by the backend (and never stored).
 *
 * No third-party library: `crypto.subtle` is available in both the popup and
 * the background service worker.
 */

// Cache imported keys by their PEM, so repeated analyses don't re-import.
const importCache = new Map<string, Promise<CryptoKey>>();

function pemToSpki(pem: string): ArrayBuffer {
  const base64 = pem
    .replace(/-----BEGIN PUBLIC KEY-----/, "")
    .replace(/-----END PUBLIC KEY-----/, "")
    .replace(/\s+/g, "");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function importPublicKey(pem: string): Promise<CryptoKey> {
  const cached = importCache.get(pem);
  if (cached) return cached;
  const promise = crypto.subtle.importKey(
    "spki",
    pemToSpki(pem),
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["encrypt"],
  );
  importCache.set(pem, promise);
  return promise;
}

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

/** Encrypt `plaintext` with a PEM public key, returning base64 ciphertext. */
export async function encryptWithPublicKey(
  publicKeyPem: string,
  plaintext: string,
): Promise<string> {
  const key = await importPublicKey(publicKeyPem);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    key,
    new TextEncoder().encode(plaintext),
  );
  return toBase64(ciphertext);
}

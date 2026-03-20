/**
 * Crypto Utils for "Secure" Local Storage
 * 
 * WARNING: This is client-side encryption. The key is derived from the user's email.
 * This means anyone with access to the browser (XSS) can retrieve the email, 
 * derive the key, and decrypt the password.
 * 
 * This implementation is for "Remember Me" functionality as requested by the user,
 * bypassing standard browser password managers.
 */

// Helper: Convert ArrayBuffer to Base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Helper: Convert Base64 to Uint8Array
function base64ToUint8Array(base64: string): Uint8Array {
  const binary_string = window.atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes;
}

// Derive a key from the email (acting as a password) and a salt
async function deriveKey(email: string, salt: BufferSource): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    encoder.encode(email),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export interface EncryptedData {
  salt: string;
  iv: string;
  ciphertext: string;
}

/**
 * Encrypts a string using a key derived from the email.
 * Returns an object containing the salt, IV, and ciphertext (all Base64).
 */
export async function encryptData(email: string, data: string): Promise<EncryptedData> {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  
  const key = await deriveKey(email, salt);
  const encoder = new TextEncoder();
  const encodedData = encoder.encode(data);

  const encryptedContent = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv
    },
    key,
    encodedData
  );

  return {
    salt: arrayBufferToBase64(salt.buffer),
    iv: arrayBufferToBase64(iv.buffer),
    ciphertext: arrayBufferToBase64(encryptedContent)
  };
}

/**
 * Decrypts data using a key derived from the email.
 * Expects an object with salt, IV, and ciphertext (all Base64).
 */
export async function decryptData(email: string, encryptedData: EncryptedData): Promise<string> {
  try {
    const salt = base64ToUint8Array(encryptedData.salt);
    const iv = base64ToUint8Array(encryptedData.iv);
    const ciphertext = base64ToUint8Array(encryptedData.ciphertext);

    const key = await deriveKey(email, salt as unknown as BufferSource);

    const decryptedContent = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv as unknown as BufferSource
      },
      key,
      ciphertext as unknown as BufferSource
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedContent);
  } catch (error) {
    console.error("Decryption failed:", error);
    throw new Error("Failed to decrypt data");
  }
}

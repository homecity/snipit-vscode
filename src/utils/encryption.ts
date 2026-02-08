import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 12;  // 96 bits (recommended for GCM)
const TAG_LENGTH = 16; // 128 bits

export interface EncryptedData {
  ciphertext: string;  // Base64 encoded
  iv: string;          // Base64 encoded
  tag: string;         // Base64 encoded
}

export interface EncryptionResult {
  encrypted: EncryptedData;
  key: string;  // Base64 URL-safe encoded key
}

/**
 * Generates a random encryption key
 */
export function generateKey(): Buffer {
  return crypto.randomBytes(KEY_LENGTH);
}

/**
 * Converts a buffer to URL-safe base64
 */
export function toBase64Url(buffer: Buffer): string {
  return buffer.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Converts URL-safe base64 to buffer
 */
export function fromBase64Url(str: string): Buffer {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64');
}

/**
 * Encrypts content using AES-256-GCM
 * Returns encrypted data and the key (to be placed in URL fragment)
 */
export function encrypt(content: string): EncryptionResult {
  const key = generateKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: TAG_LENGTH
  });
  
  let ciphertext = cipher.update(content, 'utf8', 'base64');
  ciphertext += cipher.final('base64');
  
  const tag = cipher.getAuthTag();
  
  return {
    encrypted: {
      ciphertext,
      iv: iv.toString('base64'),
      tag: tag.toString('base64')
    },
    key: toBase64Url(key)
  };
}

/**
 * Decrypts content using AES-256-GCM
 */
export function decrypt(encrypted: EncryptedData, keyBase64Url: string): string {
  const key = fromBase64Url(keyBase64Url);
  const iv = Buffer.from(encrypted.iv, 'base64');
  const tag = Buffer.from(encrypted.tag, 'base64');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: TAG_LENGTH
  });
  
  decipher.setAuthTag(tag);
  
  let plaintext = decipher.update(encrypted.ciphertext, 'base64', 'utf8');
  plaintext += decipher.final('utf8');
  
  return plaintext;
}

/**
 * Derives a key from a password using PBKDF2
 */
export function deriveKeyFromPassword(password: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(password, salt, 100000, KEY_LENGTH, 'sha256');
}

/**
 * Encrypts content with a password (for password-protected snippets)
 */
export function encryptWithPassword(content: string, password: string): { encrypted: EncryptedData; salt: string } {
  const salt = crypto.randomBytes(16);
  const key = deriveKeyFromPassword(password, salt);
  const iv = crypto.randomBytes(IV_LENGTH);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: TAG_LENGTH
  });
  
  let ciphertext = cipher.update(content, 'utf8', 'base64');
  ciphertext += cipher.final('base64');
  
  const tag = cipher.getAuthTag();
  
  return {
    encrypted: {
      ciphertext,
      iv: iv.toString('base64'),
      tag: tag.toString('base64')
    },
    salt: salt.toString('base64')
  };
}

/**
 * Decrypts content with a password
 */
export function decryptWithPassword(encrypted: EncryptedData, password: string, saltBase64: string): string {
  const salt = Buffer.from(saltBase64, 'base64');
  const key = deriveKeyFromPassword(password, salt);
  const iv = Buffer.from(encrypted.iv, 'base64');
  const tag = Buffer.from(encrypted.tag, 'base64');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: TAG_LENGTH
  });
  
  decipher.setAuthTag(tag);
  
  let plaintext = decipher.update(encrypted.ciphertext, 'base64', 'utf8');
  plaintext += decipher.final('utf8');
  
  return plaintext;
}

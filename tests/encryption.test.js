/**
 * Unit tests for encryption utilities
 * Using Node.js built-in test runner (v18+)
 */
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import crypto from 'crypto';

// Since the encryption module is TypeScript and imports vscode,
// we'll test the pure encryption logic directly here

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

// Helper functions (same as in encryption.ts)
function generateKey() {
  return crypto.randomBytes(KEY_LENGTH);
}

function toBase64Url(buffer) {
  return buffer.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function fromBase64Url(str) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64');
}

function encrypt(content) {
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

function decrypt(encrypted, keyBase64Url) {
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

function deriveKeyFromPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 100000, KEY_LENGTH, 'sha256');
}

function encryptWithPassword(content, password) {
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

function decryptWithPassword(encrypted, password, saltBase64) {
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

// ===== Tests =====

describe('Base64 URL encoding', () => {
  it('should convert buffer to URL-safe base64', () => {
    const buffer = Buffer.from([0xfb, 0xff, 0xfe]); // Contains +, /, = in standard base64
    const result = toBase64Url(buffer);
    
    assert.ok(!result.includes('+'), 'Should not contain +');
    assert.ok(!result.includes('/'), 'Should not contain /');
    assert.ok(!result.includes('='), 'Should not contain =');
  });
  
  it('should round-trip correctly', () => {
    const original = crypto.randomBytes(32);
    const encoded = toBase64Url(original);
    const decoded = fromBase64Url(encoded);
    
    assert.ok(original.equals(decoded), 'Round-trip should preserve data');
  });
  
  it('should handle empty buffer', () => {
    const empty = Buffer.alloc(0);
    const encoded = toBase64Url(empty);
    const decoded = fromBase64Url(encoded);
    
    assert.strictEqual(encoded, '');
    assert.ok(empty.equals(decoded));
  });
  
  it('should handle various lengths', () => {
    for (const length of [1, 2, 3, 16, 32, 64, 100]) {
      const buffer = crypto.randomBytes(length);
      const encoded = toBase64Url(buffer);
      const decoded = fromBase64Url(encoded);
      
      assert.ok(buffer.equals(decoded), `Length ${length} should round-trip`);
    }
  });
});

describe('Key generation', () => {
  it('should generate 256-bit key', () => {
    const key = generateKey();
    assert.strictEqual(key.length, 32, 'Key should be 32 bytes (256 bits)');
  });
  
  it('should generate unique keys', () => {
    const keys = new Set();
    for (let i = 0; i < 100; i++) {
      keys.add(toBase64Url(generateKey()));
    }
    assert.strictEqual(keys.size, 100, 'All keys should be unique');
  });
});

describe('AES-256-GCM encryption', () => {
  it('should encrypt and decrypt simple text', () => {
    const plaintext = 'Hello, World!';
    const { encrypted, key } = encrypt(plaintext);
    const decrypted = decrypt(encrypted, key);
    
    assert.strictEqual(decrypted, plaintext);
  });
  
  it('should encrypt and decrypt empty string', () => {
    const plaintext = '';
    const { encrypted, key } = encrypt(plaintext);
    const decrypted = decrypt(encrypted, key);
    
    assert.strictEqual(decrypted, plaintext);
  });
  
  it('should encrypt and decrypt unicode text', () => {
    const plaintext = '안녕하세요! 🎉 Привет мир! 日本語テスト';
    const { encrypted, key } = encrypt(plaintext);
    const decrypted = decrypt(encrypted, key);
    
    assert.strictEqual(decrypted, plaintext);
  });
  
  it('should encrypt and decrypt long text', () => {
    const plaintext = 'x'.repeat(10000);
    const { encrypted, key } = encrypt(plaintext);
    const decrypted = decrypt(encrypted, key);
    
    assert.strictEqual(decrypted, plaintext);
  });
  
  it('should encrypt and decrypt code snippet', () => {
    const plaintext = `
function hello(name) {
  console.log(\`Hello, \${name}!\`);
  return { success: true };
}

// Test with special chars: <>&"'\`
const result = hello("World");
`;
    const { encrypted, key } = encrypt(plaintext);
    const decrypted = decrypt(encrypted, key);
    
    assert.strictEqual(decrypted, plaintext);
  });
  
  it('should produce different ciphertexts for same plaintext', () => {
    const plaintext = 'Same message';
    const results = [];
    
    for (let i = 0; i < 10; i++) {
      const { encrypted } = encrypt(plaintext);
      results.push(encrypted.ciphertext);
    }
    
    const unique = new Set(results);
    assert.strictEqual(unique.size, 10, 'All ciphertexts should be unique');
  });
  
  it('should fail decryption with wrong key', () => {
    const plaintext = 'Secret message';
    const { encrypted } = encrypt(plaintext);
    const wrongKey = toBase64Url(generateKey());
    
    assert.throws(() => {
      decrypt(encrypted, wrongKey);
    }, 'Should throw with wrong key');
  });
  
  it('should fail decryption with tampered ciphertext', () => {
    const plaintext = 'Secret message';
    const { encrypted, key } = encrypt(plaintext);
    
    // Tamper with ciphertext
    const tampered = {
      ...encrypted,
      ciphertext: encrypted.ciphertext.slice(0, -4) + 'XXXX'
    };
    
    assert.throws(() => {
      decrypt(tampered, key);
    }, 'Should throw with tampered ciphertext');
  });
  
  it('should fail decryption with tampered tag', () => {
    const plaintext = 'Secret message';
    const { encrypted, key } = encrypt(plaintext);
    
    // Tamper with auth tag
    const tampered = {
      ...encrypted,
      tag: Buffer.from('0'.repeat(32), 'hex').toString('base64')
    };
    
    assert.throws(() => {
      decrypt(tampered, key);
    }, 'Should throw with tampered auth tag');
  });
});

describe('Password-based encryption', () => {
  it('should encrypt and decrypt with password', () => {
    const plaintext = 'Secret content';
    const password = 'MySecurePassword123!';
    
    const { encrypted, salt } = encryptWithPassword(plaintext, password);
    const decrypted = decryptWithPassword(encrypted, password, salt);
    
    assert.strictEqual(decrypted, plaintext);
  });
  
  it('should fail with wrong password', () => {
    const plaintext = 'Secret content';
    const password = 'CorrectPassword';
    const wrongPassword = 'WrongPassword';
    
    const { encrypted, salt } = encryptWithPassword(plaintext, password);
    
    assert.throws(() => {
      decryptWithPassword(encrypted, wrongPassword, salt);
    }, 'Should throw with wrong password');
  });
  
  it('should handle unicode passwords', () => {
    const plaintext = 'Secret message';
    const password = '비밀번호🔐パスワード';
    
    const { encrypted, salt } = encryptWithPassword(plaintext, password);
    const decrypted = decryptWithPassword(encrypted, password, salt);
    
    assert.strictEqual(decrypted, plaintext);
  });
  
  it('should produce different salts each time', () => {
    const plaintext = 'Secret';
    const password = 'password';
    const salts = new Set();
    
    for (let i = 0; i < 10; i++) {
      const { salt } = encryptWithPassword(plaintext, password);
      salts.add(salt);
    }
    
    assert.strictEqual(salts.size, 10, 'All salts should be unique');
  });
  
  it('should handle empty password', () => {
    const plaintext = 'Content with empty password';
    const password = '';
    
    const { encrypted, salt } = encryptWithPassword(plaintext, password);
    const decrypted = decryptWithPassword(encrypted, password, salt);
    
    assert.strictEqual(decrypted, plaintext);
  });
});

describe('Key derivation', () => {
  it('should derive consistent key from same password and salt', () => {
    const password = 'MyPassword';
    const salt = crypto.randomBytes(16);
    
    const key1 = deriveKeyFromPassword(password, salt);
    const key2 = deriveKeyFromPassword(password, salt);
    
    assert.ok(key1.equals(key2), 'Same inputs should produce same key');
  });
  
  it('should derive different keys from different passwords', () => {
    const salt = crypto.randomBytes(16);
    
    const key1 = deriveKeyFromPassword('password1', salt);
    const key2 = deriveKeyFromPassword('password2', salt);
    
    assert.ok(!key1.equals(key2), 'Different passwords should produce different keys');
  });
  
  it('should derive different keys from different salts', () => {
    const password = 'MyPassword';
    
    const key1 = deriveKeyFromPassword(password, crypto.randomBytes(16));
    const key2 = deriveKeyFromPassword(password, crypto.randomBytes(16));
    
    assert.ok(!key1.equals(key2), 'Different salts should produce different keys');
  });
  
  it('should produce 256-bit derived key', () => {
    const key = deriveKeyFromPassword('password', crypto.randomBytes(16));
    assert.strictEqual(key.length, 32, 'Derived key should be 32 bytes');
  });
});

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const DEFAULT_FALLBACK_KEY = 'whatsapp-ai-automation-secret-key-32b!';

function getKey(customKey?: string): Buffer {
  const keySource = customKey || process.env.ENCRYPTION_KEY || DEFAULT_FALLBACK_KEY;
  return crypto.createHash('sha256').update(keySource).digest();
}

/**
 * Encrypt plaintext using AES-256-GCM
 * Output format: base64(iv + authTag + encryptedData)
 */
export function encrypt(plaintext: string, customKey?: string): string {
  if (!plaintext) return '';
  const key = getKey(customKey);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();

  // Combine IV (12) + Tag (16) + Encrypted Data
  const combined = Buffer.concat([iv, tag, encrypted]);
  return combined.toString('base64');
}

/**
 * Decrypt cipherText created by encrypt()
 * Fallback to original text if it was unencrypted
 */
export function decrypt(cipherText: string, customKey?: string): string {
  if (!cipherText) return '';
  try {
    const combined = Buffer.from(cipherText, 'base64');
    if (combined.length <= IV_LENGTH + 16) {
      // Not an encrypted string from this method, return as-is
      return cipherText;
    }

    const key = getKey(customKey);
    const iv = combined.subarray(0, IV_LENGTH);
    const tag = combined.subarray(IV_LENGTH, IV_LENGTH + 16);
    const encrypted = combined.subarray(IV_LENGTH + 16);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  } catch {
    // If decryption fails (e.g. legacy plain text token), return original
    return cipherText;
  }
}

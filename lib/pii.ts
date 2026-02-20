/**
 * Field-level encryption for PII (ExpertContact email/phone).
 * Values stored as enc:v1:base64(iv+ciphertext+authTag) so raw data is never plaintext in DB.
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ALGO = 'aes-256-gcm';
const IV_LEN = 16;
const TAG_LEN = 16;
const KEY_LEN = 32;
const PREFIX = 'enc:v1:';

function getKey(): Buffer {
  const secret = process.env.PII_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY;
  if (!secret || secret.length < 16) {
    throw new Error('PII_ENCRYPTION_KEY or ENCRYPTION_KEY (min 16 chars) required for contact encryption');
  }
  return scryptSync(secret, 'expert-pii-salt', KEY_LEN);
}

export function encryptContactValue(plaintext: string): string {
  if (!plaintext || typeof plaintext !== 'string') return plaintext;
  const key = getKey();
  if (!key) return plaintext;
  try {
    const iv = randomBytes(IV_LEN);
    const cipher = createCipheriv(ALGO, key, iv);
    const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return PREFIX + Buffer.concat([iv, enc, tag]).toString('base64url');
  } catch (e) {
    if (process.env.NODE_ENV === 'production') throw e;
    return plaintext;
  }
}


export function decryptContactValue(ciphertext: string): string {
  if (!ciphertext || typeof ciphertext !== 'string') return ciphertext;
  if (!ciphertext.startsWith(PREFIX)) return ciphertext;
  const key = getKey();
  if (!key) return '[encrypted]';
  try {
    const buf = Buffer.from(ciphertext.slice(PREFIX.length), 'base64url');
    if (buf.length < IV_LEN + TAG_LEN) return ciphertext;
    const iv = buf.subarray(0, IV_LEN);
    const tag = buf.subarray(buf.length - TAG_LEN);
    const enc = buf.subarray(IV_LEN, buf.length - TAG_LEN);
    const decipher = createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    return decipher.update(enc).toString('utf8') + decipher.final('utf8');
  } catch (e) {
    if (process.env.NODE_ENV === 'production') throw e;
    return ciphertext;
  }
}

export function decryptContacts<T extends { value: string }>(contacts: T[]): T[] {
  return contacts.map((c) => ({ ...c, value: decryptContactValue(c.value) }));
}

/** Optional key for engagement cost encryption (no throw if missing). */
function getKeyOptional(): Buffer | null {
  const secret = process.env.PII_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY;
  if (!secret || secret.length < 16) return null;
  try {
    return scryptSync(secret, 'expert-pii-salt', KEY_LEN);
  } catch {
    return null;
  }
}

/** Encrypt a numeric value (e.g. actual_cost) for storage in actualCostEncrypted. */
export function encryptNumeric(value: number): string | null {
  const key = getKeyOptional();
  if (!key) return null;
  try {
    const plaintext = String(value);
    const iv = randomBytes(IV_LEN);
    const cipher = createCipheriv(ALGO, key, iv);
    const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return PREFIX + Buffer.concat([iv, enc, tag]).toString('base64url');
  } catch (e) {
    if (process.env.NODE_ENV === 'production') throw e;
    return null;
  }
}

/** Decrypt a stored numeric string back to number. */
export function decryptNumeric(ciphertext: string | null | undefined): number | null {
  if (ciphertext == null || typeof ciphertext !== 'string' || !ciphertext.startsWith(PREFIX)) return null;
  const key = getKeyOptional();
  if (!key) return null;
  try {
    const dec = decryptContactValue(ciphertext);
    const n = parseFloat(dec);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

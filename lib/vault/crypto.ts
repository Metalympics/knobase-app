/**
 * Server-side AES-256-GCM encryption for the API Key Vault.
 *
 * Uses KNOBASE_MASTER_SECRET env var + workspace-specific salt
 * to derive unique encryption keys per workspace via scrypt.
 */

import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const SALT_LENGTH = 32;
const KEY_LENGTH = 32; // 256 bits
const SCRYPT_COST = 16384;
const SCRYPT_BLOCK_SIZE = 8;
const SCRYPT_PARALLELIZATION = 1;

function getMasterSecret(): string {
  const secret = process.env.KNOBASE_MASTER_SECRET;
  if (!secret) {
    throw new Error(
      "Missing KNOBASE_MASTER_SECRET environment variable. " +
        "This is required for vault encryption. Generate one with: " +
        "openssl rand -base64 32",
    );
  }
  return secret;
}

function deriveKey(masterSecret: string, salt: Buffer): Buffer {
  return crypto.scryptSync(masterSecret, salt, KEY_LENGTH, {
    N: SCRYPT_COST,
    r: SCRYPT_BLOCK_SIZE,
    p: SCRYPT_PARALLELIZATION,
  });
}

export interface EncryptedPayload {
  ciphertext: string; // base64
  iv: string; // base64
  salt: string; // base64
  tag: string; // base64 auth tag
}

/**
 * Encrypt a plaintext value using a workspace-scoped derived key.
 * Each encryption uses a fresh random salt and IV.
 */
export function encryptValue(
  plaintext: string,
  workspaceId: string,
): EncryptedPayload {
  const masterSecret = getMasterSecret();
  const salt = crypto.randomBytes(SALT_LENGTH);

  const compositeSalt = Buffer.concat([
    salt,
    Buffer.from(workspaceId, "utf-8"),
  ]);
  const key = deriveKey(masterSecret, compositeSalt);

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf-8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return {
    ciphertext: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    salt: salt.toString("base64"),
    tag: tag.toString("base64"),
  };
}

/**
 * Decrypt an encrypted payload using the workspace-scoped derived key.
 */
export function decryptValue(
  payload: EncryptedPayload,
  workspaceId: string,
): string {
  const masterSecret = getMasterSecret();
  const salt = Buffer.from(payload.salt, "base64");

  const compositeSalt = Buffer.concat([
    salt,
    Buffer.from(workspaceId, "utf-8"),
  ]);
  const key = deriveKey(masterSecret, compositeSalt);

  const iv = Buffer.from(payload.iv, "base64");
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(Buffer.from(payload.tag, "base64"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, "base64")),
    decipher.final(),
  ]);

  return decrypted.toString("utf-8");
}

/**
 * Mask an API key value for display (e.g., "sk-...abc123").
 */
export function maskValue(value: string): string {
  if (value.length <= 8) return "••••••••";
  return value.slice(0, 4) + "••••" + value.slice(-4);
}

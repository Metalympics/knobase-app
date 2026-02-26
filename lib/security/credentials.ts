/**
 * Credential Manager — Secure API key storage with AES-GCM encryption
 *
 * Architecture:
 * 1. Master password → PBKDF2 → derived key
 * 2. Derived key → encrypts/decrypts credentials via AES-GCM
 * 3. Encrypted blobs stored in localStorage
 * 4. Key stays in memory for session (cleared on lock)
 */

export interface SecureCredential {
  id: string;
  name: string;
  service: string;
  keyName: string;
  lastUsed?: string;
  createdAt: string;
  status: "valid" | "invalid" | "untested";
}

interface EncryptedCredential extends SecureCredential {
  encryptedValue: string; // base64-encoded encrypted payload
  iv: string; // base64-encoded initialization vector
  salt: string; // base64-encoded salt for key derivation
}

interface EncryptedStore {
  version: 1;
  masterSalt: string;
  masterCheck: string; // encrypted known plaintext to verify password
  masterCheckIv: string;
  credentials: EncryptedCredential[];
}

const LS_KEY = "knobase-app:secure-credentials";
const PBKDF2_ITERATIONS = 100000;
const KNOWN_PLAINTEXT = "knobase-credential-check-v1";

export type CredentialServicePreset = {
  service: string;
  label: string;
  keyName: string;
  icon: string;
  testUrl?: string;
};

export const SERVICE_PRESETS: CredentialServicePreset[] = [
  {
    service: "openai",
    label: "OpenAI",
    keyName: "OPENAI_API_KEY",
    icon: "✨",
    testUrl: "https://api.openai.com/v1/models",
  },
  {
    service: "anthropic",
    label: "Anthropic",
    keyName: "ANTHROPIC_API_KEY",
    icon: "🤖",
    testUrl: "https://api.anthropic.com/v1/messages",
  },
  {
    service: "google",
    label: "Google AI",
    keyName: "GOOGLE_AI_API_KEY",
    icon: "🔮",
  },
  {
    service: "github",
    label: "GitHub",
    keyName: "GITHUB_TOKEN",
    icon: "🐙",
  },
  {
    service: "custom",
    label: "Custom",
    keyName: "API_KEY",
    icon: "🔑",
  },
];

// ----- Crypto helpers -----

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function deriveKey(
  password: string,
  salt: ArrayBuffer,
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

async function encrypt(
  plaintext: string,
  key: CryptoKey,
): Promise<{ ciphertext: string; iv: string }> {
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(plaintext),
  );
  return {
    ciphertext: arrayBufferToBase64(encrypted),
    iv: arrayBufferToBase64(iv.buffer),
  };
}

async function decrypt(
  ciphertext: string,
  iv: string,
  key: CryptoKey,
): Promise<string> {
  const decoder = new TextDecoder();
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToArrayBuffer(iv) },
    key,
    base64ToArrayBuffer(ciphertext),
  );
  return decoder.decode(decrypted);
}

// ----- Store helpers -----

function readStore(): EncryptedStore | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeStore(store: EncryptedStore): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(LS_KEY, JSON.stringify(store));
  }
}

// ----- Password strength -----

export function getPasswordStrength(
  password: string,
): "weak" | "fair" | "strong" {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 2) return "weak";
  if (score <= 3) return "fair";
  return "strong";
}

// ----- CredentialManager class -----

export class CredentialManager {
  private masterKey: CryptoKey | null = null;
  private masterSalt: ArrayBuffer | null = null;
  private lockTimer: ReturnType<typeof setTimeout> | null = null;
  private onLockCallbacks = new Set<() => void>();

  /** Whether the vault has been set up (master password created) */
  isInitialized(): boolean {
    return readStore() !== null;
  }

  /** Whether the vault is currently unlocked */
  isUnlocked(): boolean {
    return this.masterKey !== null;
  }

  /** Set up master password for the first time */
  async setup(password: string): Promise<void> {
    if (this.isInitialized()) {
      throw new Error("Vault already initialized. Use unlock() instead.");
    }

    const salt = crypto.getRandomValues(new Uint8Array(16));
    this.masterSalt = salt.buffer;
    this.masterKey = await deriveKey(password, salt.buffer);

    const { ciphertext, iv } = await encrypt(KNOWN_PLAINTEXT, this.masterKey);

    const store: EncryptedStore = {
      version: 1,
      masterSalt: arrayBufferToBase64(salt.buffer),
      masterCheck: ciphertext,
      masterCheckIv: iv,
      credentials: [],
    };
    writeStore(store);
    this.startLockTimer();
  }

  /** Unlock the vault with master password */
  async unlock(password: string): Promise<boolean> {
    const store = readStore();
    if (!store) return false;

    const salt = base64ToArrayBuffer(store.masterSalt);
    const key = await deriveKey(password, salt);

    try {
      const check = await decrypt(store.masterCheck, store.masterCheckIv, key);
      if (check !== KNOWN_PLAINTEXT) return false;
    } catch {
      return false;
    }

    this.masterKey = key;
    this.masterSalt = salt;
    this.startLockTimer();
    return true;
  }

  /** Lock the vault (clear key from memory) */
  lock(): void {
    this.masterKey = null;
    if (this.lockTimer) {
      clearTimeout(this.lockTimer);
      this.lockTimer = null;
    }
    this.onLockCallbacks.forEach((cb) => cb());
  }

  /** Auto-lock after 15 minutes of inactivity */
  private startLockTimer(): void {
    if (this.lockTimer) clearTimeout(this.lockTimer);
    this.lockTimer = setTimeout(() => this.lock(), 15 * 60 * 1000);
  }

  /** Reset activity timer */
  touch(): void {
    if (this.isUnlocked()) {
      this.startLockTimer();
    }
  }

  /** Register a callback for when vault locks */
  onLock(cb: () => void): () => void {
    this.onLockCallbacks.add(cb);
    return () => this.onLockCallbacks.delete(cb);
  }

  /** List credentials (metadata only, no decrypted values) */
  listCredentials(): SecureCredential[] {
    const store = readStore();
    if (!store) return [];
    return store.credentials.map(
      ({ encryptedValue, iv, salt, ...meta }) => meta,
    );
  }

  /** Add a new credential */
  async addCredential(
    name: string,
    service: string,
    keyName: string,
    value: string,
  ): Promise<SecureCredential> {
    if (!this.masterKey) throw new Error("Vault is locked");
    this.touch();

    const credSalt = crypto.getRandomValues(new Uint8Array(16));
    const { ciphertext, iv } = await encrypt(value, this.masterKey);

    const credential: EncryptedCredential = {
      id: crypto.randomUUID(),
      name,
      service,
      keyName,
      status: "untested",
      createdAt: new Date().toISOString(),
      encryptedValue: ciphertext,
      iv,
      salt: arrayBufferToBase64(credSalt.buffer),
    };

    const store = readStore();
    if (!store) throw new Error("Store not initialized");
    store.credentials.push(credential);
    writeStore(store);

    const { encryptedValue: _, iv: __, salt: ___, ...meta } = credential;
    return meta;
  }

  /** Get decrypted credential value */
  async getCredentialValue(id: string): Promise<string | null> {
    if (!this.masterKey) throw new Error("Vault is locked");
    this.touch();

    const store = readStore();
    if (!store) return null;

    const cred = store.credentials.find((c) => c.id === id);
    if (!cred) return null;

    try {
      return await decrypt(cred.encryptedValue, cred.iv, this.masterKey);
    } catch {
      return null;
    }
  }

  /** Update credential value */
  async updateCredential(
    id: string,
    updates: { name?: string; value?: string; status?: SecureCredential["status"] },
  ): Promise<void> {
    if (!this.masterKey) throw new Error("Vault is locked");
    this.touch();

    const store = readStore();
    if (!store) return;

    const idx = store.credentials.findIndex((c) => c.id === id);
    if (idx === -1) return;

    if (updates.name) store.credentials[idx].name = updates.name;
    if (updates.status) store.credentials[idx].status = updates.status;

    if (updates.value) {
      const { ciphertext, iv } = await encrypt(updates.value, this.masterKey);
      store.credentials[idx].encryptedValue = ciphertext;
      store.credentials[idx].iv = iv;
    }

    writeStore(store);
  }

  /** Delete a credential */
  deleteCredential(id: string): void {
    const store = readStore();
    if (!store) return;
    store.credentials = store.credentials.filter((c) => c.id !== id);
    writeStore(store);
  }

  /** Mark credential as recently used */
  markUsed(id: string): void {
    const store = readStore();
    if (!store) return;
    const cred = store.credentials.find((c) => c.id === id);
    if (cred) {
      cred.lastUsed = new Date().toISOString();
      writeStore(store);
    }
  }

  /** Destroy vault completely (forget password) */
  resetVault(): void {
    this.lock();
    if (typeof window !== "undefined") {
      localStorage.removeItem(LS_KEY);
    }
  }
}

// Singleton instance
export const credentialManager = new CredentialManager();

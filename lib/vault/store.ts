/**
 * Vault Store — CRUD operations for the API Key Vault.
 * All operations use the admin Supabase client (bypasses RLS).
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { encryptValue, decryptValue, type EncryptedPayload } from "./crypto";

export interface VaultKeyMeta {
  id: string;
  env_name: string;
  description: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  last_used_at: string | null;
}

export interface VaultKeyWithValue extends VaultKeyMeta {
  value: string;
}

export interface CreateVaultKeyInput {
  school_id: string;
  env_name: string;
  description?: string;
  value: string;
  created_by?: string;
}

export interface UpdateVaultKeyInput {
  description?: string;
  value?: string;
}

/**
 * List all vault keys for a workspace (metadata only, no decrypted values).
 */
export async function listVaultKeys(
  schoolId: string,
): Promise<VaultKeyMeta[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("api_key_vault")
    .select("id, env_name, description, created_by, created_at, updated_at, last_used_at")
    .eq("school_id", schoolId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[vault] Error listing keys:", error.message);
    return [];
  }

  return data ?? [];
}

/**
 * Get a single vault key's metadata by ID.
 */
export async function getVaultKey(
  keyId: string,
): Promise<(VaultKeyMeta & { school_id: string }) | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("api_key_vault")
    .select("id, school_id, env_name, description, created_by, created_at, updated_at, last_used_at")
    .eq("id", keyId)
    .single();

  if (error || !data) return null;
  return data;
}

/**
 * Find a vault key by env_name within a workspace.
 */
export async function findVaultKeyByEnvName(
  schoolId: string,
  envName: string,
): Promise<(VaultKeyMeta & { school_id: string }) | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("api_key_vault")
    .select("id, school_id, env_name, description, created_by, created_at, updated_at, last_used_at")
    .eq("school_id", schoolId)
    .eq("env_name", envName)
    .single();

  if (error || !data) return null;
  return data;
}

/**
 * Create a new vault key. Encrypts the value server-side before storage.
 */
export async function createVaultKey(
  input: CreateVaultKeyInput,
): Promise<VaultKeyMeta> {
  const supabase = createAdminClient();

  const encrypted = encryptValue(input.value, input.school_id);

  // Store ciphertext + auth tag together for simpler storage
  const encryptedWithTag = `${encrypted.ciphertext}:${encrypted.tag}`;

  const { data, error } = await supabase
    .from("api_key_vault")
    .insert({
      school_id: input.school_id,
      env_name: input.env_name.toUpperCase().replace(/[^A-Z0-9_]/g, "_"),
      description: input.description ?? null,
      encrypted_value: encryptedWithTag,
      iv: encrypted.iv,
      salt: encrypted.salt,
      created_by: input.created_by ?? null,
    })
    .select("id, env_name, description, created_by, created_at, updated_at, last_used_at")
    .single();

  if (error) {
    throw new Error(`Failed to create vault key: ${error.message}`);
  }

  return data;
}

/**
 * Update an existing vault key's description and/or value.
 */
export async function updateVaultKey(
  keyId: string,
  schoolId: string,
  updates: UpdateVaultKeyInput,
): Promise<VaultKeyMeta> {
  const supabase = createAdminClient();
  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.description !== undefined) {
    patch.description = updates.description;
  }

  if (updates.value !== undefined) {
    const encrypted = encryptValue(updates.value, schoolId);
    patch.encrypted_value = `${encrypted.ciphertext}:${encrypted.tag}`;
    patch.iv = encrypted.iv;
    patch.salt = encrypted.salt;
  }

  const { data, error } = await supabase
    .from("api_key_vault")
    .update(patch)
    .eq("id", keyId)
    .eq("school_id", schoolId)
    .select("id, env_name, description, created_by, created_at, updated_at, last_used_at")
    .single();

  if (error) {
    throw new Error(`Failed to update vault key: ${error.message}`);
  }

  return data;
}

/**
 * Delete a vault key.
 */
export async function deleteVaultKey(
  keyId: string,
  schoolId: string,
): Promise<boolean> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("api_key_vault")
    .delete()
    .eq("id", keyId)
    .eq("school_id", schoolId);

  if (error) {
    console.error("[vault] Error deleting key:", error.message);
    return false;
  }

  return true;
}

/**
 * Decrypt and return a vault key's value. Also updates last_used_at
 * and creates an access log entry.
 */
export async function decryptVaultKey(
  keyId: string,
  schoolId: string,
  opts?: { agentId?: string; purpose?: string; ipAddress?: string },
): Promise<VaultKeyWithValue | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("api_key_vault")
    .select("*")
    .eq("id", keyId)
    .eq("school_id", schoolId)
    .single();

  if (error || !data) return null;

  const [ciphertext, tag] = data.encrypted_value.split(":");
  if (!ciphertext || !tag) {
    console.error("[vault] Malformed encrypted_value for key:", keyId);
    return null;
  }

  const payload: EncryptedPayload = {
    ciphertext,
    iv: data.iv,
    salt: data.salt,
    tag,
  };

  let value: string;
  try {
    value = decryptValue(payload, schoolId);
  } catch (err) {
    console.error("[vault] Decryption failed for key:", keyId, err);
    return null;
  }

  // Update last_used_at (fire-and-forget)
  supabase
    .from("api_key_vault")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", keyId)
    .then(() => {});

  // Write access log (fire-and-forget)
  supabase
    .from("api_key_vault_access_logs")
    .insert({
      api_key_id: keyId,
      agent_id: opts?.agentId ?? null,
      env_name: data.env_name,
      purpose: opts?.purpose ?? null,
      ip_address: opts?.ipAddress ?? null,
    })
    .then(() => {});

  return {
    id: data.id,
    env_name: data.env_name,
    description: data.description,
    created_by: data.created_by,
    created_at: data.created_at,
    updated_at: data.updated_at,
    last_used_at: new Date().toISOString(),
    value,
  };
}

/**
 * Decrypt a vault key by env_name. Convenience wrapper used by MCP tools.
 */
export async function decryptVaultKeyByEnvName(
  schoolId: string,
  envName: string,
  opts?: { agentId?: string; purpose?: string; ipAddress?: string },
): Promise<VaultKeyWithValue | null> {
  const key = await findVaultKeyByEnvName(schoolId, envName);
  if (!key) return null;
  return decryptVaultKey(key.id, schoolId, opts);
}

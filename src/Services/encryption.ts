// src/services/encryption.ts
// Minimal pluggable encryption wrapper.
// CURRENTLY: placeholder using base64 for "encryption" so rest of app works locally.
// Replace these implementations with tweetnacl/libsodium-based E2EE before production.

import { Buffer } from 'buffer';

export const encryption = {
  // Provide a per-user/per-conversation secret in the future.
  async encrypt(plain: string, _key?: string): Promise<string> {
    // Placeholder: base64 encode
    return Buffer.from(plain, 'utf8').toString('base64');
  },

  async decrypt(cipher: string, _key?: string): Promise<string> {
    // Placeholder: base64 decode
    try {
      return Buffer.from(cipher, 'base64').toString('utf8');
    } catch (err) {
      console.warn('decrypt failed', err);
      return cipher;
    }
  }
};

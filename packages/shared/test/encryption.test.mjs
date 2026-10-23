import test from 'node:test';
import assert from 'node:assert/strict';
import { encrypt, decrypt } from '../dist/index.js';

test('Encryption and Decryption symmetry with UTF-8 tokens', () => {
  const secret = 'EAABwb12345sample_whatsapp_permanent_token_xyz_998877_🔑';
  const encrypted = encrypt(secret);

  assert.notEqual(encrypted, secret);
  // Verify base64 output
  assert.ok(/^[A-Za-z0-9+/=]+$/.test(encrypted));

  const decrypted = decrypt(encrypted);
  assert.equal(decrypted, secret);
});

test('Different encryptions produce unique ciphertexts due to random IVs', () => {
  const secret = 'identical_secret_payload';
  const enc1 = encrypt(secret);
  const enc2 = encrypt(secret);

  assert.notEqual(enc1, enc2);
  assert.equal(decrypt(enc1), secret);
  assert.equal(decrypt(enc2), secret);
});

test('Decrypt handles empty and falsy inputs cleanly', () => {
  assert.equal(decrypt(''), '');
  assert.equal(decrypt(null), '');
  assert.equal(decrypt(undefined), '');
});

test('Decrypt falls back safely to legacy plaintext if not encrypted', () => {
  const legacyToken = 'legacy_plain_access_token_12345';
  const result = decrypt(legacyToken);
  assert.equal(result, legacyToken);
});

test('Custom encryption key support', () => {
  const customKey = 'my-custom-super-secure-key-2026';
  const secret = 'top_secret_credentials';

  const encrypted = encrypt(secret, customKey);
  const decrypted = decrypt(encrypted, customKey);

  assert.equal(decrypted, secret);

  // Decrypting with wrong key does not yield original plaintext
  const wrongDecrypted = decrypt(encrypted, 'wrong-key');
  assert.notEqual(wrongDecrypted, secret);
});

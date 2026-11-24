import crypto from 'crypto';

const SALT_BYTES = 16;
const KEY_LENGTH = 64;

/**
 * Hashea una contraseña usando scrypt de Node.js con sal aleatoria.
 */
export async function hashPassword(plainPassword: string): Promise<string> {
  const salt = crypto.randomBytes(SALT_BYTES).toString('hex');
  const derivedKey = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(plainPassword, salt, KEY_LENGTH, (err, key) => {
      if (err) reject(err);
      else resolve(key);
    });
  });
  return `scrypt:${salt}:${derivedKey.toString('hex')}`;
}

/**
 * Verifica una contraseña en tiempo constante usando timingSafeEqual.
 */
export async function verifyPassword(plainPassword: string, storedHash: string): Promise<boolean> {
  const parts = storedHash.split(':');
  if (parts.length !== 3 || parts[0] !== 'scrypt') {
    return false;
  }
  const [, salt, keyHex] = parts;
  if (!salt || !keyHex) return false;

  const expectedBuffer = Buffer.from(keyHex, 'hex');
  const derivedKey = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(plainPassword, salt, expectedBuffer.length, (err, key) => {
      if (err) reject(err);
      else resolve(key);
    });
  });

  if (derivedKey.length !== expectedBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(derivedKey, expectedBuffer);
}

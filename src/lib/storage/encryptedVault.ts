import type { WorkspaceState } from '../../types';

export interface EncryptedVaultFile {
  format: 'tertip-vault';
  version: 1;
  createdAt: string;
  kdf: 'PBKDF2-SHA256';
  iterations: number;
  cipher: 'AES-GCM-256';
  salt: string;
  iv: string;
  ciphertext: string;
}

const PBKDF2_ITERATIONS = 250_000;
const SALT_BYTE_LENGTH = 16;
const IV_BYTE_LENGTH = 12;

function getSubtleCrypto(): SubtleCrypto {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    throw new Error(
      'Tarayıcınız Web Crypto API desteklemiyor veya güvenli bağlam (HTTPS / localhost) dışında çalışıyorsunuz.'
    );
  }
  return crypto.subtle;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function deriveAesKey(
  password: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number,
  usage: KeyUsage[]
): Promise<CryptoKey> {
  const subtle = getSubtleCrypto();
  const encoder = new TextEncoder();
  const keyMaterial = await subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    usage
  );
}

function isWorkspaceState(value: unknown): value is WorkspaceState {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.workspaceName === 'string' &&
    typeof obj.sector === 'string' &&
    Array.isArray(obj.documents) &&
    Array.isArray(obj.assets) &&
    Array.isArray(obj.reminders) &&
    Array.isArray(obj.metrics) &&
    Array.isArray(obj.chartSeries)
  );
}

export function isValidVaultFile(content: string): boolean {
  try {
    const parsed = JSON.parse(content) as Partial<EncryptedVaultFile>;
    return (
      parsed.format === 'tertip-vault' &&
      parsed.version === 1 &&
      parsed.kdf === 'PBKDF2-SHA256' &&
      parsed.cipher === 'AES-GCM-256' &&
      typeof parsed.iterations === 'number' &&
      parsed.iterations >= 100_000 &&
      typeof parsed.salt === 'string' &&
      typeof parsed.iv === 'string' &&
      typeof parsed.ciphertext === 'string'
    );
  } catch {
    return false;
  }
}

export async function encryptWorkspace(
  state: WorkspaceState,
  password: string
): Promise<string> {
  if (!password || password.length < 6) {
    throw new Error('Şifreleme parolası en az 6 karakter olmalıdır.');
  }

  const subtle = getSubtleCrypto();
  const salt = new Uint8Array(new ArrayBuffer(SALT_BYTE_LENGTH));
  const iv = new Uint8Array(new ArrayBuffer(IV_BYTE_LENGTH));
  crypto.getRandomValues(salt);
  crypto.getRandomValues(iv);

  const key = await deriveAesKey(password, salt, PBKDF2_ITERATIONS, ['encrypt']);
  const plaintext = new TextEncoder().encode(JSON.stringify(state));

  const encryptedBuffer = await subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    plaintext
  );

  const vault: EncryptedVaultFile = {
    format: 'tertip-vault',
    version: 1,
    createdAt: new Date().toISOString(),
    kdf: 'PBKDF2-SHA256',
    iterations: PBKDF2_ITERATIONS,
    cipher: 'AES-GCM-256',
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(encryptedBuffer)),
  };

  return JSON.stringify(vault, null, 2);
}

export async function decryptWorkspace(
  vaultJson: string,
  password: string
): Promise<WorkspaceState> {
  if (!password) {
    throw new Error('Lütfen şifre çözme parolasını girin.');
  }
  if (!isValidVaultFile(vaultJson)) {
    throw new Error('Geçersiz veya bozuk .tertip yedek dosyası.');
  }

  const vault = JSON.parse(vaultJson) as EncryptedVaultFile;
  const subtle = getSubtleCrypto();
  const salt = base64ToBytes(vault.salt);
  const iv = base64ToBytes(vault.iv);
  const ciphertext = base64ToBytes(vault.ciphertext);

  const key = await deriveAesKey(password, salt, vault.iterations, ['decrypt']);

  let decryptedBuffer: ArrayBuffer;
  try {
    decryptedBuffer = await subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );
  } catch {
    throw new Error('Parola hatalı veya dosya bütünlüğü bozulmuş.');
  }

  const jsonString = new TextDecoder().decode(decryptedBuffer);
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    throw new Error('Çözülen veri geçerli JSON biçiminde değil.');
  }

  if (!isWorkspaceState(parsed)) {
    throw new Error('Yedek dosyası beklenen Tertip çalışma alanı şemasına uymuyor.');
  }

  return parsed;
}

export async function exportEncryptedVaultFile(
  state: WorkspaceState,
  password: string,
  filename?: string
): Promise<void> {
  const vaultJson = await encryptWorkspace(state, password);
  const blob = new Blob([vaultJson], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);

  const safeSlug = state.workspaceName
    .toLocaleLowerCase('tr-TR')
    .replace(/[^a-z0-9ğüşıöç]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  const dateStamp = new Date().toISOString().slice(0, 10);
  const finalName = filename?.endsWith('.tertip')
    ? filename
    : `${filename ?? (safeSlug || 'tertip-yedek')}-${dateStamp}.tertip`;

  try {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = finalName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

export async function importEncryptedVaultFile(
  file: File,
  password: string
): Promise<WorkspaceState> {
  const content = await file.text();
  return decryptWorkspace(content, password);
}

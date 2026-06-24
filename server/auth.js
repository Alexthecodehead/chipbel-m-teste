import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { query } from './db.js';
import { HttpError } from './http.js';

const COOKIE_NAME = 'chipbelem_session';
const SESSION_SECONDS = 8 * 60 * 60;
const SCRYPT_N = 32_768;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEY_LENGTH = 64;
const scrypt = promisify(scryptCallback);
const DUMMY_HASH = `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${Buffer.from('chipbelem-dummy-salt').toString('base64url')}$${Buffer.alloc(SCRYPT_KEY_LENGTH).toString('base64url')}`;

const base64url = (value) => Buffer.from(value).toString('base64url');

function sessionSecret() {
  const secret = String(process.env.SESSION_SECRET || '');
  if (secret.length < 32) throw new Error('SESSION_SECRET deve ter pelo menos 32 caracteres.');
  return secret;
}

function sign(value) {
  return createHmac('sha256', sessionSecret()).update(value).digest('base64url');
}

function parseCookies(request) {
  return String(request.headers.cookie || '').split(';').reduce((cookies, item) => {
    const index = item.indexOf('=');
    if (index < 0) return cookies;
    cookies[item.slice(0, index).trim()] = decodeURIComponent(item.slice(index + 1).trim());
    return cookies;
  }, {});
}

export function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    accountStatus: user.account_status || 'approved',
    emailVerified: Boolean(user.email_verified_at),
    phone: user.phone || '',
    city: user.city || '',
    company: user.company_name || ''
  };
}

export function normalizeEmail(value = '') {
  return String(value).trim().toLowerCase();
}

export function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}

export function validatePassword(password) {
  const value = String(password || '');
  if (value.length < 12 || value.length > 128) {
    throw new HttpError(400, 'A senha deve ter entre 12 e 128 caracteres.', 'weak_password');
  }
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter(rule => rule.test(value)).length;
  if (classes < 3) {
    throw new HttpError(400, 'Use letras maiusculas, minusculas, numeros e simbolos.', 'weak_password');
  }
  return value;
}

async function derivePassword(password, salt, n, r, p) {
  return scrypt(String(password || ''), salt, SCRYPT_KEY_LENGTH, {
    N: n,
    r,
    p,
    maxmem: 64 * 1024 * 1024
  });
}

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const derived = await derivePassword(password, salt, SCRYPT_N, SCRYPT_R, SCRYPT_P);
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString('base64url')}$${Buffer.from(derived).toString('base64url')}`;
}

export async function verifyPassword(password, storedHash) {
  const parts = String(storedHash || DUMMY_HASH).split('$');
  const validFormat = parts.length === 6 && parts[0] === 'scrypt';
  const source = validFormat ? parts : DUMMY_HASH.split('$');
  const [, nValue, rValue, pValue, saltValue, hashValue] = source;
  const expected = Buffer.from(hashValue, 'base64url');
  const derived = Buffer.from(await derivePassword(
    password,
    Buffer.from(saltValue, 'base64url'),
    Number(nValue),
    Number(rValue),
    Number(pValue)
  ));
  return validFormat && expected.length === derived.length && timingSafeEqual(expected, derived);
}

export function createVerificationToken() {
  const token = randomBytes(32).toString('base64url');
  const hash = createHmac('sha256', sessionSecret()).update(`verify:${token}`).digest('hex');
  return { token, hash };
}

export function hashVerificationToken(token) {
  return createHmac('sha256', sessionSecret()).update(`verify:${token}`).digest('hex');
}

export function createSessionToken(user) {
  const payload = base64url(JSON.stringify({
    sub: String(user.id),
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS,
    nonce: randomBytes(12).toString('base64url')
  }));
  return `${payload}.${sign(payload)}`;
}

export function readSessionToken(request) {
  const token = parseCookies(request)[COOKIE_NAME];
  if (!token) return null;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;

  const expected = sign(payload);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!parsed.sub || !parsed.exp || parsed.exp <= Math.floor(Date.now() / 1000)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setSessionCookie(request, response, user) {
  const secure = process.env.NODE_ENV === 'production' || request.headers['x-forwarded-proto'] === 'https';
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(createSessionToken(user))}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    `Max-Age=${SESSION_SECONDS}`
  ];
  if (secure) parts.push('Secure');
  response.setHeader('Set-Cookie', parts.join('; '));
}

export function clearSessionCookie(request, response) {
  const secure = process.env.NODE_ENV === 'production' || request.headers['x-forwarded-proto'] === 'https';
  const parts = [`${COOKIE_NAME}=`, 'Path=/', 'HttpOnly', 'SameSite=Strict', 'Max-Age=0'];
  if (secure) parts.push('Secure');
  response.setHeader('Set-Cookie', parts.join('; '));
}

export async function requireSession(request, roles = []) {
  const session = readSessionToken(request);
  if (!session) throw new HttpError(401, 'Sessao invalida ou expirada.', 'unauthorized');

  const result = await query(
    `SELECT u.id, u.name, u.email, u.role, u.phone, u.city, u.is_active,
            u.account_status, u.email_verified_at,
            op.company_name
       FROM users u
       LEFT JOIN organizer_profiles op ON op.user_id = u.id
      WHERE u.id = $1`,
    [session.sub]
  );
  const user = result.rows[0];
  if (!user?.is_active || user.account_status !== 'approved' || user.role !== session.role) {
    throw new HttpError(401, 'Sessao invalida ou expirada.', 'unauthorized');
  }
  if (roles.length && !roles.includes(user.role)) {
    throw new HttpError(403, 'Acesso nao autorizado.', 'forbidden');
  }
  return user;
}

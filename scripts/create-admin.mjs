import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { hashPassword, normalizeEmail, validEmail, validatePassword } from '../server/auth.js';
import { query } from '../server/db.js';

if (existsSync('.env.local')) loadEnvFile('.env.local');

const email = normalizeEmail(process.env.ADMIN_EMAIL || '');
const password = String(process.env.ADMIN_PASSWORD || '');
const username = String(process.env.ADMIN_LOGIN || 'Admin').trim().slice(0, 80);
const name = String(process.env.ADMIN_NAME || 'Administrador').trim().slice(0, 160);

if (!process.env.DATABASE_URL) throw new Error('Configure DATABASE_URL antes de criar o admin.');
if (!validEmail(email)) throw new Error('Configure ADMIN_EMAIL com um e-mail valido.');
validatePassword(password);

const passwordHash = await hashPassword(password);
await query(
  `INSERT INTO users (name, username, email, password_hash, role, is_active, email_verified_at)
   VALUES ($1, $2, $3, $4, 'admin', TRUE, NOW())
   ON CONFLICT (email) DO UPDATE
     SET name = EXCLUDED.name,
         username = EXCLUDED.username,
         password_hash = EXCLUDED.password_hash,
         role = 'admin',
         is_active = TRUE,
         email_verified_at = COALESCE(users.email_verified_at, NOW()),
         updated_at = NOW()`,
  [name, username, email, passwordHash]
);

console.log(`Administrador ${username} criado/atualizado com sucesso.`);
process.exit(0);

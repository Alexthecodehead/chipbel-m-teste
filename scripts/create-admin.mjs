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

const company = String(process.env.ADMIN_COMPANY || 'ChipBelem').trim().slice(0, 180);
const passwordHash = await hashPassword(password);
const result = await query(
  `INSERT INTO users (name, username, email, password_hash, role, account_status, is_active, email_verified_at)
   VALUES ($1, $2, $3, $4, 'admin', 'approved', TRUE, NOW())
   ON CONFLICT (email) DO UPDATE
     SET name = EXCLUDED.name,
         username = EXCLUDED.username,
         password_hash = EXCLUDED.password_hash,
         role = 'admin',
         account_status = 'approved',
         is_active = TRUE,
         email_verified_at = COALESCE(users.email_verified_at, NOW()),
         updated_at = NOW()
   RETURNING id`,
  [name, username, email, passwordHash]
);

await query(
  `INSERT INTO organizer_profiles (user_id, company_name, contact_name, contact_email)
   VALUES ($1, $2, $3, $4)
   ON CONFLICT (user_id) DO UPDATE
     SET company_name = EXCLUDED.company_name,
         contact_name = EXCLUDED.contact_name,
         contact_email = EXCLUDED.contact_email,
         updated_at = NOW()`,
  [result.rows[0].id, company, name, email]
);

console.log(`Administrador ${username} criado/atualizado com sucesso.`);
process.exit(0);

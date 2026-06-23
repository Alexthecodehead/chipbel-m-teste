import { createVerificationToken, hashPassword, normalizeEmail, validEmail, validatePassword } from '../../server/auth.js';
import { transaction } from '../../server/db.js';
import { sendConfirmationEmail } from '../../server/email.js';
import { assertSameOrigin, body, handleError, HttpError, json, method } from '../../server/http.js';
import { enforceRateLimit } from '../../server/rate-limit.js';

function appUrl(request) {
  const configured = String(process.env.APP_URL || '').trim();
  if (configured) {
    const value = new URL(configured);
    if (process.env.NODE_ENV === 'production' && value.protocol !== 'https:') {
      throw new Error('APP_URL deve usar HTTPS em producao.');
    }
    return value;
  }
  if (process.env.NODE_ENV === 'production') throw new Error('APP_URL nao configurada.');
  const host = request.headers.host || '127.0.0.1:5173';
  return new URL(`http://${host}`);
}

export default async function handler(request, response) {
  try {
    method(request, ['POST']);
    assertSameOrigin(request);
    const data = body(request);
    const name = String(data.name || '').trim().slice(0, 160);
    const email = normalizeEmail(data.email);
    const phone = String(data.phone || '').trim().slice(0, 30);
    const city = String(data.city || '').trim().slice(0, 120);
    const password = validatePassword(data.password);

    if (name.length < 3 || !validEmail(email)) {
      throw new HttpError(400, 'Nome ou e-mail invalido.', 'invalid_input');
    }
    await enforceRateLimit(request, 'athlete_register_ip', 'all', { limit: 10, windowSeconds: 60 * 60, blockSeconds: 60 * 60 });
    await enforceRateLimit(request, 'athlete_register', email, { limit: 3, windowSeconds: 60 * 60, blockSeconds: 60 * 60 });

    const passwordHash = await hashPassword(password);
    const verification = createVerificationToken();
    const user = await transaction(async (client) => {
      const existingResult = await client.query('SELECT id, role, is_active FROM users WHERE email = $1 FOR UPDATE', [email]);
      const existing = existingResult.rows[0];
      if (existing?.is_active || (existing && existing.role !== 'athlete')) {
        throw new HttpError(409, 'Este e-mail ja possui uma conta.', 'account_exists');
      }

      let userId;
      if (existing) {
        userId = existing.id;
        await client.query(
          `UPDATE users
              SET name = $2, password_hash = $3, phone = $4, city = $5, updated_at = NOW()
            WHERE id = $1`,
          [userId, name, passwordHash, phone || null, city || null]
        );
      } else {
        const inserted = await client.query(
          `INSERT INTO users (name, email, password_hash, role, phone, city, is_active)
           VALUES ($1, $2, $3, 'athlete', $4, $5, FALSE)
           RETURNING id`,
          [name, email, passwordHash, phone || null, city || null]
        );
        userId = inserted.rows[0].id;
      }

      await client.query('DELETE FROM email_verification_tokens WHERE user_id = $1', [userId]);
      await client.query(
        `INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
         VALUES ($1, $2, NOW() + INTERVAL '24 hours')`,
        [userId, verification.hash]
      );
      return { id: userId, name, email };
    });

    const confirmationUrl = new URL('confirmar-email.html', appUrl(request));
    confirmationUrl.searchParams.set('token', verification.token);
    await sendConfirmationEmail({ name: user.name, email: user.email, confirmationUrl: confirmationUrl.href });

    json(response, 201, { ok: true, message: 'Confira seu e-mail para ativar a conta.' });
  } catch (error) {
    handleError(response, error);
  }
}

import { hashPassword, normalizeEmail, requireSession, validEmail, validatePassword } from '../server/auth.js';
import { query } from '../server/db.js';
import { assertSameOrigin, body, handleError, HttpError, json, method } from '../server/http.js';
import { enforceRateLimit } from '../server/rate-limit.js';

export default async function handler(request, response) {
  try {
    if (request.method === 'GET') {
      await requireSession(request, ['admin']);
      const result = await query(
        `SELECT id, company_name AS company, contact_name AS name, contact_email AS email,
                status, reviewed_at, created_at
           FROM organizer_requests
          ORDER BY created_at DESC
          LIMIT 100`
      );
      json(response, 200, { requests: result.rows });
      return;
    }

    method(request, ['POST']);
    assertSameOrigin(request);
    const data = body(request);
    const company = String(data.company || '').trim().slice(0, 180);
    const name = String(data.name || '').trim().slice(0, 160);
    const email = normalizeEmail(data.email);
    const password = validatePassword(data.password);
    if (company.length < 2 || name.length < 3 || !validEmail(email)) {
      throw new HttpError(400, 'Dados do organizador invalidos.', 'invalid_input');
    }
    await enforceRateLimit(request, 'organizer_request_ip', 'all', { limit: 5, windowSeconds: 24 * 60 * 60, blockSeconds: 24 * 60 * 60 });
    await enforceRateLimit(request, 'organizer_request', email, { limit: 3, windowSeconds: 24 * 60 * 60, blockSeconds: 24 * 60 * 60 });

    const existing = await query(
      `SELECT EXISTS (SELECT 1 FROM users WHERE email = $1) OR
              EXISTS (SELECT 1 FROM organizer_requests WHERE contact_email = $1 AND status = 'pending') AS found`,
      [email]
    );
    if (existing.rows[0]?.found) {
      throw new HttpError(409, 'Ja existe uma conta ou pedido para este e-mail.', 'account_exists');
    }

    const passwordHash = await hashPassword(password);
    try {
      await query(
        `INSERT INTO organizer_requests (company_name, contact_name, contact_email, password_hash)
         VALUES ($1, $2, $3, $4)`,
        [company, name, email, passwordHash]
      );
    } catch (error) {
      if (error?.code === '23505') {
        throw new HttpError(409, 'Ja existe uma conta ou pedido para este e-mail.', 'account_exists');
      }
      throw error;
    }
    json(response, 201, { ok: true, message: 'Pedido enviado para analise.' });
  } catch (error) {
    handleError(response, error);
  }
}

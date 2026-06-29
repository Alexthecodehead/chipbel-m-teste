import { publicUser, requireSession, verifyPassword } from '../../auth.js';
import { query } from '../../db.js';
import { assertSameOrigin, body, handleError, HttpError, json, method } from '../../http.js';

export default async function handler(request, response) {
  try {
    method(request, ['POST']);
    assertSameOrigin(request);
    const current = await requireSession(request, ['athlete']);
    const data = body(request);
    const name = String(data.name || '').trim().slice(0, 160);
    const phone = String(data.phone || '').trim().slice(0, 30);
    const city = String(data.city || '').trim().slice(0, 120);
    const password = String(data.password || '');

    if (password.length > 128 || name.length < 3 || !(await verifyPassword(password, (await query('SELECT password_hash FROM users WHERE id = $1', [current.id])).rows[0]?.password_hash))) {
      throw new HttpError(401, 'Senha atual invalida.', 'invalid_credentials');
    }

    const result = await query(
      `UPDATE users SET name = $2, phone = $3, city = $4, updated_at = NOW()
        WHERE id = $1
        RETURNING id, name, email, role, phone, city`,
      [current.id, name, phone || null, city || null]
    );
    json(response, 200, { user: publicUser(result.rows[0]) });
  } catch (error) {
    handleError(response, error);
  }
}

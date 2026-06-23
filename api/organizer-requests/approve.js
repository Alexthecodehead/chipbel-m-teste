import { publicUser, requireSession } from '../../server/auth.js';
import { transaction } from '../../server/db.js';
import { assertSameOrigin, body, handleError, HttpError, json, method } from '../../server/http.js';

export default async function handler(request, response) {
  try {
    method(request, ['POST']);
    assertSameOrigin(request);
    const admin = await requireSession(request, ['admin']);
    const requestId = Number(body(request).requestId);
    if (!Number.isSafeInteger(requestId) || requestId < 1) {
      throw new HttpError(400, 'Pedido invalido.', 'invalid_input');
    }

    const user = await transaction(async (client) => {
      const result = await client.query(
        'SELECT * FROM organizer_requests WHERE id = $1 FOR UPDATE',
        [requestId]
      );
      const pending = result.rows[0];
      if (!pending || pending.status !== 'pending') {
        throw new HttpError(404, 'Pedido pendente nao encontrado.', 'not_found');
      }

      const existing = await client.query('SELECT id FROM users WHERE email = $1', [pending.contact_email]);
      if (existing.rows[0]) {
        throw new HttpError(409, 'Ja existe um usuario com este e-mail.', 'account_exists');
      }

      const inserted = await client.query(
        `INSERT INTO users (name, email, password_hash, role, is_active, email_verified_at)
         VALUES ($1, $2, $3, 'organizer', TRUE, NOW())
         RETURNING id, name, email, role, phone, city`,
        [pending.contact_name, pending.contact_email, pending.password_hash]
      );
      const created = inserted.rows[0];
      await client.query(
        `INSERT INTO organizer_profiles (user_id, company_name, contact_name, contact_email)
         VALUES ($1, $2, $3, $4)`,
        [created.id, pending.company_name, pending.contact_name, pending.contact_email]
      );
      await client.query(
        `UPDATE organizer_requests
            SET status = 'approved', approved_by = $2, approved_user_id = $3,
                reviewed_at = NOW(), updated_at = NOW()
          WHERE id = $1`,
        [requestId, admin.id, created.id]
      );
      return { ...created, company_name: pending.company_name };
    });

    json(response, 200, { user: publicUser(user) });
  } catch (error) {
    handleError(response, error);
  }
}

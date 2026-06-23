import { hashVerificationToken, publicUser, setSessionCookie } from '../../server/auth.js';
import { transaction } from '../../server/db.js';
import { assertSameOrigin, body, handleError, HttpError, json, method } from '../../server/http.js';

export default async function handler(request, response) {
  try {
    method(request, ['POST']);
    assertSameOrigin(request);
    const token = String(body(request).token || '');
    if (!/^[A-Za-z0-9_-]{40,80}$/.test(token)) {
      throw new HttpError(400, 'Link de confirmacao invalido.', 'invalid_token');
    }
    const tokenHash = hashVerificationToken(token);

    const user = await transaction(async (client) => {
      const result = await client.query(
        `SELECT u.id, u.name, u.email, u.role, u.phone, u.city, evt.id AS token_id
           FROM email_verification_tokens evt
           JOIN users u ON u.id = evt.user_id
          WHERE evt.token_hash = $1 AND evt.used_at IS NULL AND evt.expires_at > NOW()
          FOR UPDATE`,
        [tokenHash]
      );
      const found = result.rows[0];
      if (!found) throw new HttpError(400, 'Este link e invalido ou expirou.', 'invalid_token');

      await client.query(
        'UPDATE users SET is_active = TRUE, email_verified_at = NOW(), updated_at = NOW() WHERE id = $1',
        [found.id]
      );
      await client.query('UPDATE email_verification_tokens SET used_at = NOW() WHERE id = $1', [found.token_id]);
      return { ...found, is_active: true };
    });

    setSessionCookie(request, response, user);
    json(response, 200, { user: publicUser(user) });
  } catch (error) {
    handleError(response, error);
  }
}

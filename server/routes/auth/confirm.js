import { hashVerificationToken, publicUser, setSessionCookie } from '../../auth.js';
import { transaction } from '../../db.js';
import { logApiDiagnostic } from '../../diagnostics.js';
import { assertSameOrigin, body, handleError, HttpError, json, method } from '../../http.js';

export default async function handler(request, response) {
  try {
    method(request, ['POST']);
    logApiDiagnostic('/api/auth/confirm', { method: request.method });
    assertSameOrigin(request);
    const token = String(body(request).token || '');
    if (!/^[A-Za-z0-9_-]{40,80}$/.test(token)) {
      throw new HttpError(400, 'Link de confirmacao invalido.', 'invalid_token');
    }

    const user = await transaction(async (client) => {
      const result = await client.query(
        `SELECT u.id, u.name, u.email, u.role, u.phone, u.city, u.account_status,
                op.company_name, evt.id AS token_id
           FROM email_verification_tokens evt
           JOIN users u ON u.id = evt.user_id
           LEFT JOIN organizer_profiles op ON op.user_id = u.id
          WHERE evt.token_hash = $1 AND evt.used_at IS NULL AND evt.expires_at > NOW()
          FOR UPDATE OF evt, u`,
        [hashVerificationToken(token)]
      );
      const found = result.rows[0];
      if (!found) throw new HttpError(400, 'Este link e invalido ou expirou.', 'invalid_token');

      const canActivate = found.role !== 'organizer' || found.account_status === 'approved';
      await client.query(
        `UPDATE users
            SET is_active = $2, email_verified_at = NOW(), updated_at = NOW()
          WHERE id = $1`,
        [found.id, canActivate]
      );
      await client.query('UPDATE email_verification_tokens SET used_at = NOW() WHERE id = $1', [found.token_id]);
      return { ...found, is_active: canActivate, email_verified_at: new Date() };
    });

    if (user.is_active) {
      setSessionCookie(request, response, user);
      json(response, 200, {
        user: publicUser(user),
        next: user.role === 'athlete' ? 'minhas-inscricoes.html' : 'admin.html',
        message: 'E-mail confirmado. Sua conta esta ativa.'
      });
      return;
    }

    json(response, 200, {
      user: null,
      role: user.role,
      status: 'approval_pending',
      next: 'organizador.html#organizerAccess',
      message: 'E-mail confirmado. Seu pedido de organizador esta aguardando aprovacao.'
    });
  } catch (error) {
    handleError(response, error);
  }
}

import { createVerificationToken, normalizeEmail, validEmail } from '../../server/auth.js';
import { confirmationUrl } from '../../server/app-url.js';
import { transaction } from '../../server/db.js';
import { sendConfirmationEmail } from '../../server/email.js';
import { assertSameOrigin, body, handleError, HttpError, json, method } from '../../server/http.js';
import { enforceRateLimit } from '../../server/rate-limit.js';

export default async function handler(request, response) {
  try {
    method(request, ['POST']);
    assertSameOrigin(request);
    const email = normalizeEmail(body(request).email);
    if (!validEmail(email)) throw new HttpError(400, 'Informe um e-mail valido.', 'invalid_input');

    await enforceRateLimit(request, 'resend_confirmation', email, { limit: 3, windowSeconds: 60 * 60, blockSeconds: 60 * 60 });
    const verification = createVerificationToken();
    const user = await transaction(async (client) => {
      const result = await client.query(
        'SELECT id, name, email, role, email_verified_at FROM users WHERE email = $1 FOR UPDATE',
        [email]
      );
      const found = result.rows[0];
      if (!found || found.email_verified_at) return null;

      await client.query('DELETE FROM email_verification_tokens WHERE user_id = $1', [found.id]);
      await client.query(
        `INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
         VALUES ($1, $2, NOW() + INTERVAL '24 hours')`,
        [found.id, verification.hash]
      );
      return found;
    });

    if (user) {
      try {
        await sendConfirmationEmail({
          name: user.name,
          email: user.email,
          role: user.role,
          confirmationUrl: confirmationUrl(request, verification.token)
        });
      } catch {
        throw new HttpError(502, 'Nao foi possivel enviar o e-mail agora. Tente novamente em alguns minutos.', 'email_delivery_failed');
      }
    }

    json(response, 200, {
      ok: true,
      message: 'Se houver uma conta pendente para este e-mail, enviaremos um novo link de confirmacao.'
    });
  } catch (error) {
    handleError(response, error);
  }
}

import { createVerificationToken, normalizeEmail, validEmail } from '../../auth.js';
import { confirmationUrl } from '../../app-url.js';
import { transaction } from '../../db.js';
import { sendConfirmationEmail, toEmailHttpError } from '../../email.js';
import { authTestMode, logApiDiagnostic } from '../../diagnostics.js';
import { assertSameOrigin, body, handleError, HttpError, json, method } from '../../http.js';
import { enforceRateLimit } from '../../rate-limit.js';

export default async function handler(request, response) {
  try {
    method(request, ['POST']);
    logApiDiagnostic('/api/auth/resend', { method: request.method });
    const testMode = authTestMode();
    if (testMode) {
      console.warn('ChipBelem AUTH_TEST_MODE ativo: reenvio pode retornar devConfirmationUrl. Nao use em producao real.');
    }
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
      const devConfirmationUrl = confirmationUrl(request, verification.token);
      const emailConfigured = Boolean(String(process.env.RESEND_API_KEY || '').trim() && String(process.env.MAIL_FROM || '').trim());
      if (testMode && !emailConfigured) {
        console.warn('ChipBelem AUTH_TEST_MODE: reenvio ignorou e-mail por falta de configuracao do Resend.');
      } else {
        try {
          await sendConfirmationEmail({
            name: user.name,
            email: user.email,
            role: user.role,
            confirmationUrl: devConfirmationUrl
          });
        } catch (error) {
          const httpError = toEmailHttpError(error);
          if (!testMode) throw httpError;
          console.warn('ChipBelem AUTH_TEST_MODE: falha no reenvio, retornando devConfirmationUrl.', {
            code: httpError.code,
            status: httpError.status
          });
        }
      }
      if (testMode) {
        json(response, 200, {
          ok: true,
          message: 'Novo link criado em modo teste. Use o link de confirmacao retornado.',
          devConfirmationUrl
        });
        return;
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

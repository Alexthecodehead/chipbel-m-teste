import { createVerificationToken, hashPassword, normalizeEmail, validEmail, validatePassword } from '../../server/auth.js';
import { confirmationUrl } from '../../server/app-url.js';
import { transaction } from '../../server/db.js';
import { sendConfirmationEmail, toEmailHttpError } from '../../server/email.js';
import { authTestMode, logApiDiagnostic } from '../../server/diagnostics.js';
import { assertSameOrigin, body, handleError, HttpError, json, method } from '../../server/http.js';
import { enforceRateLimit } from '../../server/rate-limit.js';

const ROLES = new Set(['athlete', 'organizer']);

export default async function handler(request, response) {
  try {
    method(request, ['POST']);
    logApiDiagnostic('/api/auth/register', { method: request.method });
    const testMode = authTestMode();
    if (testMode) {
      console.warn('ChipBelem AUTH_TEST_MODE ativo: cadastro pode retornar devConfirmationUrl. Nao use em producao real.');
    }
    assertSameOrigin(request);
    const data = body(request);
    const role = ROLES.has(data.role) ? data.role : 'athlete';
    const name = String(data.name || '').trim().slice(0, 160);
    const email = normalizeEmail(data.email);
    const phone = String(data.phone || '').trim().slice(0, 30);
    const city = String(data.city || '').trim().slice(0, 120);
    const company = String(data.company || '').trim().slice(0, 180);
    const password = validatePassword(data.password);

    if (name.length < 3 || !validEmail(email) || (role === 'organizer' && company.length < 2)) {
      throw new HttpError(400, 'Revise os dados informados.', 'invalid_input');
    }

    await enforceRateLimit(request, 'register_ip', 'all', { limit: 10, windowSeconds: 60 * 60, blockSeconds: 60 * 60 });
    await enforceRateLimit(request, `register_${role}`, email, { limit: 3, windowSeconds: 60 * 60, blockSeconds: 60 * 60 });

    const passwordHash = await hashPassword(password);
    const verification = createVerificationToken();
    const user = await transaction(async (client) => {
      const existingResult = await client.query(
        'SELECT id, role, is_active, account_status FROM users WHERE email = $1 FOR UPDATE',
        [email]
      );
      const existing = existingResult.rows[0];
      if (existing?.is_active || (existing && existing.role !== role)) {
        throw new HttpError(409, 'Este e-mail ja possui uma conta.', 'account_exists');
      }

      let userId;
      if (existing) {
        userId = existing.id;
        await client.query(
          `UPDATE users
              SET name = $2, password_hash = $3, phone = $4, city = $5,
                  account_status = CASE WHEN role = 'organizer' THEN 'pending' ELSE 'approved' END,
                  updated_at = NOW()
            WHERE id = $1`,
          [userId, name, passwordHash, phone || null, city || null]
        );
      } else {
        const inserted = await client.query(
          `INSERT INTO users (name, email, password_hash, role, account_status, phone, city, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE)
           RETURNING id`,
          [name, email, passwordHash, role, role === 'organizer' ? 'pending' : 'approved', phone || null, city || null]
        );
        userId = inserted.rows[0].id;
      }

      if (role === 'organizer') {
        await client.query(
          `INSERT INTO organizer_profiles (user_id, company_name, contact_name, contact_email, contact_phone)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (user_id) DO UPDATE
             SET company_name = EXCLUDED.company_name,
                 contact_name = EXCLUDED.contact_name,
                 contact_email = EXCLUDED.contact_email,
                 contact_phone = EXCLUDED.contact_phone,
                 updated_at = NOW()`,
          [userId, company, name, email, phone || null]
        );

        const pendingRequest = await client.query(
          'SELECT id FROM organizer_requests WHERE user_id = $1 FOR UPDATE',
          [userId]
        );
        if (pendingRequest.rows[0]) {
          await client.query(
            `UPDATE organizer_requests
                SET company_name = $2, contact_name = $3, contact_email = $4,
                    status = 'pending', reviewed_at = NULL, approved_by = NULL, updated_at = NOW()
              WHERE user_id = $1`,
            [userId, company, name, email]
          );
        } else {
          await client.query(
            `INSERT INTO organizer_requests (user_id, company_name, contact_name, contact_email)
             VALUES ($1, $2, $3, $4)`,
            [userId, company, name, email]
          );
        }
      }

      await client.query('DELETE FROM email_verification_tokens WHERE user_id = $1', [userId]);
      await client.query(
        `INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
         VALUES ($1, $2, NOW() + INTERVAL '24 hours')`,
        [userId, verification.hash]
      );
      return { id: userId, name, email, role };
    });

    const devConfirmationUrl = confirmationUrl(request, verification.token);
    let emailWarning = false;
    let emailWarningMessage = '';
    const emailConfigured = Boolean(String(process.env.RESEND_API_KEY || '').trim() && String(process.env.MAIL_FROM || '').trim());

    if (testMode && !emailConfigured) {
      emailWarning = true;
      emailWarningMessage = 'E-mail nao enviado porque RESEND_API_KEY ou MAIL_FROM nao estao configurados.';
      console.warn('ChipBelem AUTH_TEST_MODE: e-mail ignorado por falta de configuracao do Resend.');
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
        httpError.message = `Conta criada, mas o e-mail nao foi entregue. ${httpError.message}`;
        if (!testMode) throw httpError;

        emailWarning = true;
        emailWarningMessage = httpError.message;
        console.warn('ChipBelem AUTH_TEST_MODE: falha no envio, retornando devConfirmationUrl.', {
          code: httpError.code,
          status: httpError.status
        });
      }
    }

    json(response, 201, {
      ok: true,
      role,
      message: testMode
        ? 'Conta criada em modo teste. Use o link de confirmacao retornado.'
        : role === 'organizer'
          ? 'Confirme seu e-mail. Depois, o pedido sera analisado pela equipe.'
          : 'Confira seu e-mail para ativar a conta.',
      ...(testMode ? { devConfirmationUrl, emailWarning, emailWarningMessage } : {})
    });
  } catch (error) {
    handleError(response, error);
  }
}

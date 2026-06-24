import { createVerificationToken, publicUser, requireSession } from '../../server/auth.js';
import { appUrl, confirmationUrl } from '../../server/app-url.js';
import { transaction } from '../../server/db.js';
import { sendConfirmationEmail, sendOrganizerApprovalEmail } from '../../server/email.js';
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

    const verification = createVerificationToken();
    const user = await transaction(async (client) => {
      const result = await client.query(
        'SELECT * FROM organizer_requests WHERE id = $1 FOR UPDATE',
        [requestId]
      );
      const pending = result.rows[0];
      if (!pending || pending.status !== 'pending') {
        throw new HttpError(404, 'Pedido pendente nao encontrado.', 'not_found');
      }

      let created;
      if (pending.user_id) {
        const existing = await client.query(
          `SELECT u.id, u.name, u.email, u.role, u.phone, u.city, u.email_verified_at,
                  op.company_name
             FROM users u
             LEFT JOIN organizer_profiles op ON op.user_id = u.id
            WHERE u.id = $1 AND u.role = 'organizer'
            FOR UPDATE OF u`,
          [pending.user_id]
        );
        created = existing.rows[0];
        if (!created) throw new HttpError(409, 'Usuario organizador nao encontrado.', 'account_missing');
      } else {
        const duplicate = await client.query('SELECT id FROM users WHERE email = $1', [pending.contact_email]);
        if (duplicate.rows[0] || !pending.password_hash) {
          throw new HttpError(409, 'Nao foi possivel migrar este pedido antigo.', 'account_exists');
        }
        const inserted = await client.query(
          `INSERT INTO users (name, email, password_hash, role, account_status, is_active)
           VALUES ($1, $2, $3, 'organizer', 'approved', FALSE)
           RETURNING id, name, email, role, phone, city, email_verified_at`,
          [pending.contact_name, pending.contact_email, pending.password_hash]
        );
        created = { ...inserted.rows[0], company_name: pending.company_name };
        await client.query(
          `INSERT INTO organizer_profiles (user_id, company_name, contact_name, contact_email)
           VALUES ($1, $2, $3, $4)`,
          [created.id, pending.company_name, pending.contact_name, pending.contact_email]
        );
      }

      const active = Boolean(created.email_verified_at);
      await client.query(
        `UPDATE users
            SET account_status = 'approved', is_active = $2, updated_at = NOW()
          WHERE id = $1`,
        [created.id, active]
      );
      await client.query(
        `UPDATE organizer_requests
            SET user_id = $3, status = 'approved', approved_by = $2,
                reviewed_at = NOW(), updated_at = NOW()
          WHERE id = $1`,
        [requestId, admin.id, created.id]
      );

      if (!active) {
        await client.query('DELETE FROM email_verification_tokens WHERE user_id = $1', [created.id]);
        await client.query(
          `INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
           VALUES ($1, $2, NOW() + INTERVAL '24 hours')`,
          [created.id, verification.hash]
        );
      }
      return { ...created, account_status: 'approved', is_active: active };
    });

    let emailWarning = false;
    try {
      if (user.email_verified_at) {
        await sendOrganizerApprovalEmail({
          name: user.name,
          email: user.email,
          loginUrl: new URL('organizador.html#organizerAccess', appUrl(request)).href
        });
      } else {
        await sendConfirmationEmail({
          name: user.name,
          email: user.email,
          role: 'organizer',
          confirmationUrl: confirmationUrl(request, verification.token)
        });
      }
    } catch {
      emailWarning = true;
    }

    json(response, 200, {
      user: publicUser(user),
      emailWarning,
      message: user.email_verified_at
        ? 'Organizador aprovado.'
        : 'Organizador aprovado. O acesso sera liberado apos confirmar o e-mail.'
    });
  } catch (error) {
    handleError(response, error);
  }
}

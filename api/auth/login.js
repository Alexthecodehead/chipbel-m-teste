import { normalizeEmail, publicUser, setSessionCookie, verifyPassword } from '../../server/auth.js';
import { query } from '../../server/db.js';
import { assertSameOrigin, body, handleError, HttpError, json, method } from '../../server/http.js';
import { clearRateLimit, enforceRateLimit } from '../../server/rate-limit.js';

export default async function handler(request, response) {
  try {
    method(request, ['POST']);
    assertSameOrigin(request);
    const data = body(request);
    const rawLogin = String(data.login || '').trim().slice(0, 254);
    const password = String(data.password || '');
    const audience = data.audience === 'organizer' ? 'organizer' : 'athlete';
    const adminLogin = String(process.env.ADMIN_LOGIN || 'Admin').toLowerCase();
    const adminEmail = normalizeEmail(process.env.ADMIN_EMAIL || '');
    const login = rawLogin.toLowerCase() === adminLogin && adminEmail ? adminEmail : normalizeEmail(rawLogin);

    if (!login || !password || password.length > 128) {
      throw new HttpError(400, 'Login invalido.', 'invalid_input');
    }
    await enforceRateLimit(request, 'login_ip', 'all', { limit: 30, windowSeconds: 15 * 60, blockSeconds: 30 * 60 });
    await enforceRateLimit(request, 'login', login, { limit: 6, windowSeconds: 15 * 60, blockSeconds: 30 * 60 });

    const result = await query(
      `SELECT u.id, u.name, u.email, u.password_hash, u.role, u.phone, u.city,
              u.is_active, u.email_verified_at, op.company_name
         FROM users u
         LEFT JOIN organizer_profiles op ON op.user_id = u.id
        WHERE u.email = $1 OR LOWER(COALESCE(u.username, '')) = LOWER($2)
        LIMIT 1`,
      [login, rawLogin]
    );
    const user = result.rows[0];
    const matches = await verifyPassword(password, user?.password_hash);
    const allowedRole = audience === 'organizer'
      ? ['organizer', 'admin'].includes(user?.role)
      : user?.role === 'athlete';

    if (!user || !matches || !allowedRole) {
      throw new HttpError(401, 'Login ou senha invalidos.', 'invalid_credentials');
    }
    if (!user.is_active) {
      throw new HttpError(403, 'Confirme seu e-mail antes de entrar.', 'account_inactive');
    }

    await clearRateLimit(request, 'login', login);
    await query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);
    setSessionCookie(request, response, user);
    json(response, 200, { user: publicUser(user) });
  } catch (error) {
    handleError(response, error);
  }
}

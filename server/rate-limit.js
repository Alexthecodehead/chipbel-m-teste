import { createHash } from 'node:crypto';
import { transaction } from './db.js';
import { clientIp, HttpError } from './http.js';

function rateLimitKey(request, action, identifier) {
  return createHash('sha256')
    .update(`${action}:${clientIp(request)}:${String(identifier || '').toLowerCase()}`)
    .digest('hex');
}

export async function enforceRateLimit(request, action, identifier, options = {}) {
  const limit = options.limit || 6;
  const windowSeconds = options.windowSeconds || 15 * 60;
  const blockSeconds = options.blockSeconds || 15 * 60;
  const keyHash = rateLimitKey(request, action, identifier);

  const blocked = await transaction(async (client) => {
    const result = await client.query(
      'SELECT attempts, window_started_at, blocked_until FROM security_rate_limits WHERE key_hash = $1 FOR UPDATE',
      [keyHash]
    );
    const row = result.rows[0];
    const now = Date.now();

    if (!row) {
      await client.query(
        'INSERT INTO security_rate_limits (key_hash, action, attempts) VALUES ($1, $2, 1)',
        [keyHash, action]
      );
      return false;
    }

    const blockedUntil = row.blocked_until ? new Date(row.blocked_until).getTime() : 0;
    if (blockedUntil > now) return true;

    const windowStarted = new Date(row.window_started_at).getTime();
    const expired = now - windowStarted > windowSeconds * 1000;
    const attempts = expired ? 1 : Number(row.attempts) + 1;
    const nextBlocked = attempts > limit ? new Date(now + blockSeconds * 1000) : null;

    await client.query(
      `UPDATE security_rate_limits
          SET attempts = $2,
              window_started_at = CASE WHEN $3 THEN NOW() ELSE window_started_at END,
              blocked_until = $4,
              updated_at = NOW()
        WHERE key_hash = $1`,
      [keyHash, attempts, expired, nextBlocked]
    );
    return Boolean(nextBlocked);
  });

  if (blocked) {
    throw new HttpError(429, 'Muitas tentativas. Aguarde alguns minutos.', 'rate_limited');
  }
}

export async function clearRateLimit(request, action, identifier) {
  const keyHash = rateLimitKey(request, action, identifier);
  await transaction(client => client.query('DELETE FROM security_rate_limits WHERE key_hash = $1', [keyHash]));
}

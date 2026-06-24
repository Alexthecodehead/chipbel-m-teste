import { query } from './db.js';
import { requireSession } from './auth.js';
import { HttpError } from './http.js';

export async function requireOrganizer(request, options = {}) {
  const user = await requireSession(request, ['organizer', 'admin']);
  const result = await query('SELECT id FROM organizer_profiles WHERE user_id = $1', [user.id]);
  const organizerId = result.rows[0]?.id || null;
  if (options.profileRequired && !organizerId) {
    throw new HttpError(409, 'O perfil de organizador ainda nao foi configurado.', 'organizer_profile_missing');
  }
  return { user, organizerId, isAdmin: user.role === 'admin' };
}

export function ownedOrganizerId(context) {
  return context.isAdmin ? null : context.organizerId;
}

import { requireOrganizer, ownedOrganizerId } from '../../../server/authorization.js';
import { query } from '../../../server/db.js';
import { assertSameOrigin, body, handleError, HttpError, json, method } from '../../../server/http.js';

const text = (value, length) => String(value || '').trim().slice(0, length);

function eventId(request) {
  const raw = request.query?.id || String(request.url || '').split('/').pop()?.split('?')[0];
  const id = Number(raw);
  if (!Number.isSafeInteger(id) || id < 1) throw new HttpError(400, 'Evento invalido.', 'invalid_input');
  return id;
}

export default async function handler(request, response) {
  try {
    method(request, ['PATCH', 'DELETE']);
    assertSameOrigin(request);
    const context = await requireOrganizer(request);
    const ownerId = ownedOrganizerId(context);
    const id = eventId(request);

    const found = await query(
      `SELECT id FROM events
        WHERE id = $1 AND ($2::BIGINT IS NULL OR organizer_id = $2)`,
      [id, ownerId]
    );
    if (!found.rows[0]) throw new HttpError(404, 'Evento nao encontrado.', 'not_found');

    if (request.method === 'DELETE') {
      await query(`UPDATE events SET status = 'cancelled', updated_at = NOW() WHERE id = $1`, [id]);
      json(response, 200, { ok: true, message: 'Evento cancelado.' });
      return;
    }

    const data = body(request);
    const status = ['draft', 'open', 'warning', 'closed', 'finished', 'cancelled'].includes(data.status)
      ? data.status
      : null;
    const registrationMode = ['native', 'external'].includes(data.registrationMode)
      ? data.registrationMode
      : null;
    if (registrationMode === 'external' && !/^https?:\/\//i.test(String(data.externalUrl || ''))) {
      throw new HttpError(400, 'Informe uma URL externa HTTP ou HTTPS.', 'invalid_url');
    }
    const bannerUrl = data.bannerUrl == null ? null : text(data.bannerUrl, 500);
    if (bannerUrl && !bannerUrl.startsWith('/') && !/^https:\/\//i.test(bannerUrl)) {
      throw new HttpError(400, 'URL de banner invalida.', 'invalid_url');
    }

    const result = await query(
      `UPDATE events
          SET title = COALESCE(NULLIF($2, ''), title),
              summary = COALESCE($3, summary),
              description = COALESCE($4, description),
              status = COALESCE($5, status),
              registration_mode = COALESCE($6, registration_mode),
              external_registration_url = CASE WHEN $6 = 'external' THEN $7 WHEN $6 = 'native' THEN NULL ELSE external_registration_url END,
              banner_url = COALESCE($8, banner_url),
              city = COALESCE(NULLIF($9, ''), city),
              state = COALESCE(NULLIF($10, ''), state),
              event_date = COALESCE($11::DATE, event_date),
              start_time = COALESCE($12::TIME, start_time),
              slots_limit = COALESCE($13, slots_limit),
              updated_at = NOW()
        WHERE id = $1
        RETURNING *`,
      [
        id, text(data.title, 180), data.summary == null ? null : text(data.summary, 255),
        data.description == null ? null : text(data.description, 5000), status,
        registrationMode, registrationMode === 'external' ? text(data.externalUrl, 500) : null,
        bannerUrl, text(data.city, 120),
        text(data.state, 2).toUpperCase(), /^\d{4}-\d{2}-\d{2}$/.test(data.eventDate) ? data.eventDate : null,
        /^\d{2}:\d{2}(:\d{2})?$/.test(data.startTime) ? data.startTime : null,
        Number.isSafeInteger(Number(data.slotsLimit)) && Number(data.slotsLimit) > 0 ? Number(data.slotsLimit) : null
      ]
    );
    json(response, 200, { event: result.rows[0], message: 'Evento atualizado.' });
  } catch (error) {
    handleError(response, error);
  }
}

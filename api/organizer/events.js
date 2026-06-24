import { randomBytes } from 'node:crypto';
import { requireOrganizer, ownedOrganizerId } from '../../server/authorization.js';
import { transaction, query } from '../../server/db.js';
import { assertSameOrigin, body, handleError, HttpError, json, method } from '../../server/http.js';

const text = (value, length) => String(value || '').trim().slice(0, length);
const slugify = (value) => text(value, 160).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const validDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T12:00:00Z`));
const validStatus = (value) => ['draft', 'open', 'warning', 'closed', 'finished', 'cancelled'].includes(value);
const validBannerUrl = (value) => !value || value.startsWith('/') || /^https:\/\//i.test(value);

export default async function handler(request, response) {
  try {
    if (request.method === 'GET') {
      const context = await requireOrganizer(request);
      const ownerId = ownedOrganizerId(context);
      const result = await query(
        `SELECT e.id, e.slug, e.title, e.summary, e.status, e.registration_mode,
                e.external_registration_url, e.banner_url, e.city, e.state, e.location,
                e.event_date, e.start_time, e.slots_limit, e.created_at,
                op.company_name,
                COALESCE(COUNT(r.id), 0)::INT AS registrations,
                COALESCE(SUM(r.amount) FILTER (WHERE r.status = 'paid'), 0) AS revenue
           FROM events e
           JOIN organizer_profiles op ON op.id = e.organizer_id
           LEFT JOIN registrations r ON r.event_id = e.id
          WHERE ($1::BIGINT IS NULL OR e.organizer_id = $1)
          GROUP BY e.id, op.company_name
          ORDER BY e.event_date DESC, e.created_at DESC`,
        [ownerId]
      );
      json(response, 200, { events: result.rows });
      return;
    }

    method(request, ['POST']);
    assertSameOrigin(request);
    const context = await requireOrganizer(request, { profileRequired: true });
    const data = body(request);
    const title = text(data.title, 180);
    const city = text(data.city, 120);
    const state = text(data.state, 2).toUpperCase();
    const eventDate = text(data.eventDate, 10);
    const registrationMode = data.registrationMode === 'external' ? 'external' : 'native';
    const externalUrl = text(data.externalUrl, 500);
    const bannerUrl = text(data.bannerUrl, 500);
    const distanceKm = Number(data.distanceKm || 0);
    const price = Number(data.price || 0);

    if (title.length < 3 || city.length < 2 || !/^[A-Z]{2}$/.test(state) || !validDate(eventDate)) {
      throw new HttpError(400, 'Revise nome, cidade, UF e data do evento.', 'invalid_input');
    }
    if (registrationMode === 'external' && !/^https?:\/\//i.test(externalUrl)) {
      throw new HttpError(400, 'Informe uma URL externa HTTP ou HTTPS.', 'invalid_url');
    }
    if (!validBannerUrl(bannerUrl)) throw new HttpError(400, 'URL de banner invalida.', 'invalid_url');
    if (!Number.isFinite(distanceKm) || distanceKm < 0 || !Number.isFinite(price) || price < 0) {
      throw new HttpError(400, 'Distancia ou valor invalido.', 'invalid_input');
    }

    const slug = `${slugify(title) || 'evento'}-${randomBytes(3).toString('hex')}`;
    const created = await transaction(async (client) => {
      const eventResult = await client.query(
        `INSERT INTO events (
           organizer_id, slug, title, summary, description, category, status,
           registration_mode, external_registration_url, banner_url, city, state,
           location, address, event_date, start_time, slots_limit
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
         RETURNING *`,
        [
          context.organizerId, slug, title, text(data.summary, 255) || null,
          text(data.description, 5000) || null, text(data.category, 100) || 'Corrida',
          validStatus(data.status) ? data.status : 'draft', registrationMode,
          registrationMode === 'external' ? externalUrl : null, bannerUrl || null,
          city, state, text(data.location, 180) || null, text(data.address, 255) || null,
          eventDate, text(data.startTime, 8) || null,
          Number.isSafeInteger(Number(data.slotsLimit)) && Number(data.slotsLimit) > 0 ? Number(data.slotsLimit) : null
        ]
      );
      const event = eventResult.rows[0];
      const routeResult = await client.query(
        `INSERT INTO event_routes (event_id, name, distance_km, start_point, finish_point)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [event.id, text(data.routeName, 80) || `${distanceKm || 0}K`, distanceKm || null, text(data.routeStart, 255) || null, text(data.routeFinish, 255) || null]
      );
      await client.query(
        `INSERT INTO event_lots (event_id, name, price, is_active)
         VALUES ($1, 'Lote inicial', $2, TRUE)`,
        [event.id, price]
      );
      return { ...event, route_id: routeResult.rows[0].id };
    });
    json(response, 201, { event: created, message: 'Evento salvo com seguranca.' });
  } catch (error) {
    handleError(response, error);
  }
}

import { randomBytes } from 'node:crypto';
import { requireSession } from '../auth.js';
import { transaction } from '../db.js';
import { assertSameOrigin, body, handleError, HttpError, json, method } from '../http.js';

export default async function handler(request, response) {
  try {
    method(request, ['POST']);
    assertSameOrigin(request);
    const athlete = await requireSession(request, ['athlete']);
    const data = body(request);
    const eventId = Number(data.eventId);
    const routeId = Number(data.routeId);
    const shirtSize = String(data.shirtSize || '').trim().slice(0, 40);
    if (!Number.isSafeInteger(eventId) || eventId < 1 || !Number.isSafeInteger(routeId) || routeId < 1) {
      throw new HttpError(400, 'Evento ou percurso invalido.', 'invalid_input');
    }

    const registration = await transaction(async (client) => {
      const eventResult = await client.query(
        `SELECT e.id, e.status, e.event_date, e.slots_limit, er.id AS route_id,
                COALESCE((SELECT price FROM event_lots WHERE event_id = e.id AND is_active = TRUE ORDER BY starts_at NULLS FIRST, id LIMIT 1), 0) AS price
           FROM events e
           JOIN event_routes er ON er.event_id = e.id AND er.id = $2
          WHERE e.id = $1
          FOR UPDATE OF e`,
        [eventId, routeId]
      );
      const event = eventResult.rows[0];
      if (!event || !['open', 'warning'].includes(event.status) || new Date(event.event_date) < new Date(new Date().toDateString())) {
        throw new HttpError(409, 'As inscricoes deste evento nao estao abertas.', 'registration_closed');
      }
      if (event.slots_limit) {
        const count = await client.query(
          `SELECT COUNT(*)::INT AS total FROM registrations
            WHERE event_id = $1 AND status NOT IN ('cancelled', 'refunded')`,
          [eventId]
        );
        if (count.rows[0].total >= event.slots_limit) throw new HttpError(409, 'As vagas deste evento acabaram.', 'sold_out');
      }

      try {
        const result = await client.query(
          `INSERT INTO registrations (
             event_id, route_id, athlete_id, registration_number, shirt_size, amount, status
           ) VALUES ($1, $2, $3, $4, $5, $6, 'pending_payment')
           RETURNING id, registration_number, amount, status`,
          [eventId, routeId, athlete.id, `CB${Date.now().toString(36).toUpperCase()}${randomBytes(2).toString('hex').toUpperCase()}`, shirtSize || null, event.price]
        );
        return result.rows[0];
      } catch (error) {
        if (error?.code === '23505') throw new HttpError(409, 'Voce ja esta inscrito neste evento.', 'already_registered');
        throw error;
      }
    });
    json(response, 201, { registration, message: 'Inscricao criada. Continue para o pagamento.' });
  } catch (error) {
    handleError(response, error);
  }
}

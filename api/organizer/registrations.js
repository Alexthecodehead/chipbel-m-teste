import { requireOrganizer, ownedOrganizerId } from '../../server/authorization.js';
import { query } from '../../server/db.js';
import { handleError, json, method } from '../../server/http.js';

export default async function handler(request, response) {
  try {
    method(request, ['GET']);
    const context = await requireOrganizer(request);
    const ownerId = ownedOrganizerId(context);
    const eventId = Number(request.query?.eventId || 0);
    const result = await query(
      `SELECT r.id, r.registration_number, r.amount, r.status, r.shirt_size, r.created_at,
              u.name AS athlete_name, u.email AS athlete_email,
              e.id AS event_id, e.title AS event_title,
              er.name AS route_name, er.distance_km,
              pay.status AS payment_status
         FROM registrations r
         JOIN users u ON u.id = r.athlete_id
         JOIN events e ON e.id = r.event_id
         LEFT JOIN event_routes er ON er.id = r.route_id
         LEFT JOIN LATERAL (
           SELECT p.status FROM payments p
            WHERE p.registration_id = r.id
            ORDER BY p.created_at DESC LIMIT 1
         ) pay ON TRUE
        WHERE ($1::BIGINT IS NULL OR e.organizer_id = $1)
          AND ($2::BIGINT = 0 OR e.id = $2)
        ORDER BY r.created_at DESC
        LIMIT 1000`,
      [ownerId, Number.isSafeInteger(eventId) && eventId > 0 ? eventId : 0]
    );
    json(response, 200, { registrations: result.rows });
  } catch (error) {
    handleError(response, error);
  }
}

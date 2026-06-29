import { requireOrganizer, ownedOrganizerId } from '../../authorization.js';
import { query } from '../../db.js';
import { handleError, json, method } from '../../http.js';

export default async function handler(request, response) {
  try {
    method(request, ['GET']);
    const context = await requireOrganizer(request);
    const ownerId = ownedOrganizerId(context);
    const result = await query(
      `SELECT
         COUNT(DISTINCT e.id) FILTER (WHERE e.status IN ('open', 'warning') AND e.event_date >= CURRENT_DATE)::INT AS active_events,
         COUNT(DISTINCT e.id) FILTER (WHERE e.event_date < CURRENT_DATE OR e.status = 'finished')::INT AS past_events,
         COUNT(r.id)::INT AS registrations,
         COUNT(r.id) FILTER (WHERE r.status = 'paid')::INT AS paid_registrations,
         COUNT(r.id) FILTER (WHERE r.status = 'pending_payment')::INT AS pending_registrations,
         COALESCE(SUM(r.amount) FILTER (WHERE r.status = 'paid'), 0) AS total_revenue
       FROM events e
       LEFT JOIN registrations r ON r.event_id = e.id
      WHERE ($1::BIGINT IS NULL OR e.organizer_id = $1)`,
      [ownerId]
    );
    json(response, 200, { metrics: result.rows[0] });
  } catch (error) {
    handleError(response, error);
  }
}

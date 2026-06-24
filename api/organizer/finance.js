import { requireOrganizer, ownedOrganizerId } from '../../server/authorization.js';
import { query } from '../../server/db.js';
import { handleError, json, method } from '../../server/http.js';

export default async function handler(request, response) {
  try {
    method(request, ['GET']);
    const context = await requireOrganizer(request);
    const ownerId = ownedOrganizerId(context);
    const result = await query(
      `SELECT
         COALESCE(SUM(r.amount) FILTER (WHERE r.status = 'paid'), 0) AS paid_amount,
         COALESCE(SUM(r.amount) FILTER (WHERE r.status = 'pending_payment'), 0) AS pending_amount,
         COUNT(r.id) FILTER (WHERE r.status = 'paid')::INT AS paid_count,
         COUNT(r.id) FILTER (WHERE r.status = 'pending_payment')::INT AS pending_count,
         COUNT(r.id) FILTER (WHERE r.status IN ('cancelled', 'refunded'))::INT AS cancelled_count
       FROM events e
       LEFT JOIN registrations r ON r.event_id = e.id
      WHERE ($1::BIGINT IS NULL OR e.organizer_id = $1)`,
      [ownerId]
    );
    json(response, 200, { finance: result.rows[0] });
  } catch (error) {
    handleError(response, error);
  }
}

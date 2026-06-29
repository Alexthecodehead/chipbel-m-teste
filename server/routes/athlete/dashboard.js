import { requireSession } from '../../auth.js';
import { query } from '../../db.js';
import { handleError, json, method } from '../../http.js';

export default async function handler(request, response) {
  try {
    method(request, ['GET']);
    const athlete = await requireSession(request, ['athlete']);
    const result = await query(
      `SELECT r.id, r.registration_number, r.amount, r.status, r.shirt_size, r.created_at,
              e.id AS event_id, e.slug AS event_slug, e.title AS event_title,
              e.event_date, e.city, e.state,
              er.name AS route_name, er.distance_km,
              res.net_time_seconds, res.gross_time_seconds, res.overall_position,
              res.gender_position, res.category_position, res.pace_seconds_per_km,
              res.status AS result_status,
              pay.status AS payment_status
         FROM registrations r
         JOIN events e ON e.id = r.event_id
         LEFT JOIN event_routes er ON er.id = r.route_id
         LEFT JOIN event_results res ON res.registration_id = r.id AND res.athlete_id = r.athlete_id
         LEFT JOIN LATERAL (
           SELECT p.status
             FROM payments p
            WHERE p.registration_id = r.id
            ORDER BY p.created_at DESC
            LIMIT 1
         ) pay ON TRUE
        WHERE r.athlete_id = $1
        ORDER BY e.event_date DESC, r.created_at DESC`,
      [athlete.id]
    );

    const finished = result.rows.filter(item => item.result_status === 'finished' && item.net_time_seconds != null);
    const totalSeconds = finished.reduce((sum, item) => sum + Number(item.net_time_seconds), 0);
    const totalKm = result.rows.reduce((sum, item) => sum + Number(item.distance_km || 0), 0);
    json(response, 200, {
      registrations: result.rows,
      stats: {
        registrations: result.rows.length,
        participations: finished.length,
        totalKm,
        averageTimeSeconds: finished.length ? Math.round(totalSeconds / finished.length) : null
      }
    });
  } catch (error) {
    handleError(response, error);
  }
}

import { query } from '../db.js';
import { handleError, json, method } from '../http.js';

export default async function handler(request, response) {
  try {
    method(request, ['GET']);
    const result = await query(
      `SELECT e.id, e.slug, e.title, e.summary, e.description, e.category, e.status,
              e.registration_mode, e.external_registration_url, e.banner_url,
              e.city, e.state, e.location, e.address, e.event_date, e.start_time,
              e.slots_limit, op.company_name AS organizer,
              COALESCE(
                jsonb_agg(DISTINCT jsonb_build_object(
                  'id', er.id, 'name', er.name, 'distance_km', er.distance_km,
                  'start_point', er.start_point, 'finish_point', er.finish_point
                )) FILTER (WHERE er.id IS NOT NULL), '[]'::jsonb
              ) AS routes,
              COALESCE(
                jsonb_agg(DISTINCT jsonb_build_object(
                  'id', lot.id, 'label', lot.name, 'price', lot.price,
                  'starts_at', lot.starts_at, 'ends_at', lot.ends_at
                )) FILTER (WHERE lot.id IS NOT NULL AND lot.is_active = TRUE), '[]'::jsonb
              ) AS prices
         FROM events e
         JOIN organizer_profiles op ON op.id = e.organizer_id
         LEFT JOIN event_routes er ON er.event_id = e.id
         LEFT JOIN event_lots lot ON lot.event_id = e.id
        WHERE e.status IN ('open', 'warning') AND e.event_date >= CURRENT_DATE
        GROUP BY e.id, op.company_name
        ORDER BY e.event_date ASC, e.start_time ASC`,
    );
    response.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    json(response, 200, { events: result.rows });
  } catch (error) {
    handleError(response, error);
  }
}

import { requireSession } from '../server/auth.js';
import { query } from '../server/db.js';
import { logApiDiagnostic } from '../server/diagnostics.js';
import { assertSameOrigin, body, handleError, json } from '../server/http.js';
import registerHandler from './auth/register.js';

export default async function handler(request, response) {
  try {
    logApiDiagnostic('/api/organizer-requests', { method: request.method });
    if (request.method === 'GET') {
      await requireSession(request, ['admin']);
      const result = await query(
        `SELECT req.id, req.company_name AS company, req.contact_name AS name,
                req.contact_email AS email, req.status, req.reviewed_at, req.created_at,
                (u.email_verified_at IS NOT NULL) AS email_verified
           FROM organizer_requests req
           LEFT JOIN users u ON u.id = req.user_id
          ORDER BY req.created_at DESC
          LIMIT 100`
      );
      json(response, 200, { requests: result.rows });
      return;
    }

    assertSameOrigin(request);
    const data = body(request);
    request.body = { ...data, role: 'organizer', company: data.company };
    return registerHandler(request, response);
  } catch (error) {
    handleError(response, error);
  }
}

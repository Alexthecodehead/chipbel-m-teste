import { publicUser, requireSession } from '../../auth.js';
import { logApiDiagnostic } from '../../diagnostics.js';
import { handleError, json, method } from '../../http.js';

export default async function handler(request, response) {
  try {
    method(request, ['GET']);
    logApiDiagnostic('/api/auth/session', { method: request.method });
    const user = await requireSession(request);
    json(response, 200, { user: publicUser(user) });
  } catch (error) {
    if (error?.status === 401) {
      json(response, 200, { user: null });
      return;
    }
    handleError(response, error);
  }
}

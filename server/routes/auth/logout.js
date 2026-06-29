import { clearSessionCookie } from '../../auth.js';
import { assertSameOrigin, handleError, json, method } from '../../http.js';

export default async function handler(request, response) {
  try {
    method(request, ['POST']);
    assertSameOrigin(request);
    clearSessionCookie(request, response);
    json(response, 200, { ok: true });
  } catch (error) {
    handleError(response, error);
  }
}

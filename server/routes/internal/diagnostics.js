import { timingSafeEqual } from 'node:crypto';
import { safeDiagnostics } from '../../diagnostics.js';
import { handleError, HttpError, json, method } from '../../http.js';

function sameSecret(received, expected) {
  const left = Buffer.from(String(received || ''));
  const right = Buffer.from(String(expected || ''));
  return left.length === right.length && timingSafeEqual(left, right);
}

export default async function handler(request, response) {
  try {
    method(request, ['GET']);
    const production = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
    const secret = String(process.env.DIAGNOSTICS_SECRET || '');

    if (production) {
      if (secret.length < 24) {
        throw new HttpError(404, 'Diagnostico indisponivel.', 'not_found');
      }
      if (!sameSecret(request.headers['x-diagnostics-secret'], secret)) {
        throw new HttpError(403, 'Acesso nao autorizado.', 'forbidden');
      }
    }

    json(response, 200, {
      ok: true,
      diagnostics: safeDiagnostics()
    });
  } catch (error) {
    handleError(response, error);
  }
}

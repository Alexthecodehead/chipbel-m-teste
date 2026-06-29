const MAX_BODY_BYTES = 16 * 1024;

export class HttpError extends Error {
  constructor(status, message, code = 'request_error') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function applyApiHeaders(response) {
  response.setHeader('Cache-Control', 'no-store, max-age=0');
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Referrer-Policy', 'no-referrer');
}

export function json(response, status, payload) {
  applyApiHeaders(response);
  response.status(status).end(JSON.stringify(payload));
}

export function method(request, allowed) {
  if (!allowed.includes(request.method)) {
    throw new HttpError(405, 'Metodo nao permitido.', 'method_not_allowed');
  }
}

export function assertSameOrigin(request) {
  const origin = request.headers.origin;
  if (!origin) return;

  let originUrl;
  try {
    originUrl = new URL(origin);
  } catch {
    throw new HttpError(403, 'Origem invalida.', 'invalid_origin');
  }

  const forwardedProto = String(request.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  const proto = forwardedProto || (process.env.NODE_ENV === 'production' ? 'https' : 'http');
  const hosts = [request.headers['x-forwarded-host'], request.headers.host]
    .filter(Boolean)
    .map(value => String(value).split(',')[0].trim());
  const allowedOrigins = new Set(hosts.map(host => `${proto}://${host}`));

  const configuredAppUrl = String(process.env.APP_URL || '').trim();
  if (configuredAppUrl) {
    try {
      const configured = new URL(configuredAppUrl);
      if (!configured.hostname.endsWith('github.io')) allowedOrigins.add(configured.origin);
    } catch {
      // APP_URL is validated by app-url.js when it is needed.
    }
  }

  if (!allowedOrigins.size || !allowedOrigins.has(originUrl.origin)) {
    throw new HttpError(403, 'Origem nao autorizada.', 'invalid_origin');
  }
}

export function body(request) {
  const length = Number(request.headers['content-length'] || 0);
  if (length > MAX_BODY_BYTES) {
    throw new HttpError(413, 'Requisicao muito grande.', 'payload_too_large');
  }

  const contentType = String(request.headers['content-type'] || '');
  if (!contentType.toLowerCase().startsWith('application/json')) {
    throw new HttpError(415, 'Use application/json.', 'unsupported_media_type');
  }

  try {
    const parsed = typeof request.body === 'string' ? JSON.parse(request.body || '{}') : request.body;
    if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') throw new Error('invalid');
    if (Buffer.byteLength(JSON.stringify(parsed), 'utf8') > MAX_BODY_BYTES) {
      throw new HttpError(413, 'Requisicao muito grande.', 'payload_too_large');
    }
    return parsed;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, 'JSON invalido.', 'invalid_json');
  }
}

export function clientIp(request) {
  return String(request.headers['x-forwarded-for'] || request.socket?.remoteAddress || 'unknown')
    .split(',')[0]
    .trim()
    .slice(0, 64);
}

export function handleError(response, error) {
  if (error instanceof HttpError) {
    json(response, error.status, { error: error.message, code: error.code });
    return;
  }

  console.error('API error:', error?.message || error);
  json(response, 500, { error: 'Erro interno. Tente novamente.', code: 'internal_error' });
}

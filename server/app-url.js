import { HttpError } from './http.js';

export function appUrl(request) {
  const configured = String(process.env.APP_URL || '').trim();
  const production = process.env.VERCEL_ENV === 'production'
    || (process.env.NODE_ENV === 'production' && !process.env.VERCEL_ENV);
  if (configured) {
    let value;
    try {
      value = new URL(configured);
    } catch {
      throw new HttpError(500, 'APP_URL invalida. Configure a URL publica da Vercel ou do dominio proprio.', 'app_url_invalid');
    }
    if (production && value.protocol !== 'https:') {
      throw new HttpError(500, 'APP_URL deve usar HTTPS em producao.', 'app_url_invalid');
    }
    if (production && value.hostname.endsWith('github.io')) {
      throw new HttpError(500, 'APP_URL deve apontar para a Vercel ou dominio proprio, nao para o GitHub Pages.', 'app_url_invalid');
    }
    if (production && value.hostname.endsWith('.vercel.app') && value.hostname !== 'chipbel-m-teste.vercel.app') {
      throw new HttpError(500, 'APP_URL deve apontar para https://chipbel-m-teste.vercel.app/ em producao.', 'app_url_invalid');
    }
    return value;
  }

  if (production) {
    throw new HttpError(500, 'APP_URL nao configurada.', 'app_url_missing');
  }
  const host = request.headers.host || '127.0.0.1:3000';
  return new URL(`http://${host}`);
}

export function confirmationUrl(request, token) {
  const url = new URL('confirmar-email.html', appUrl(request));
  url.searchParams.set('token', token);
  return url.href;
}

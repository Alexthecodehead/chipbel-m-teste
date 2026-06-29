const trimTrailingSlash = (value = '') => String(value || '').trim().replace(/\/+$/, '');

const isBrowser = typeof window !== 'undefined';
const hostname = isBrowser ? window.location.hostname : '';

export const AUTH_SITE_URL = trimTrailingSlash(import.meta.env.VITE_AUTH_SITE_URL);
export const IS_GITHUB_PAGES = hostname.endsWith('github.io');
export const IS_FRONTEND_ONLY =
  import.meta.env.VITE_FRONTEND_ONLY === 'true' || IS_GITHUB_PAGES;

export function apiUrl(path) {
  const value = String(path || '');
  if (/^https?:\/\//i.test(value)) {
    throw new Error('A API deve ser chamada por caminho relativo neste projeto.');
  }
  return value.startsWith('/') ? value : `/${value}`;
}

export function authSiteUrl(path = '') {
  if (!AUTH_SITE_URL) return '';
  try {
    return new URL(String(path || '').replace(/^\/+/, ''), `${AUTH_SITE_URL}/`).href;
  } catch {
    return AUTH_SITE_URL;
  }
}

export function frontendOnlyError() {
  const error = new Error(
    'Este endereco esta publicado como frontend estatico. Login, cadastro e confirmacao de e-mail funcionam no ambiente da Vercel.'
  );
  error.code = 'frontend_only';
  error.status = 0;
  error.actionUrl = authSiteUrl('login.html');
  return error;
}

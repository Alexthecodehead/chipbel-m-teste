export function appUrl(request) {
  const configured = String(process.env.APP_URL || '').trim();
  if (configured) {
    const value = new URL(configured);
    if (process.env.NODE_ENV === 'production' && value.protocol !== 'https:') {
      throw new Error('APP_URL deve usar HTTPS em producao.');
    }
    return value;
  }

  if (process.env.NODE_ENV === 'production') throw new Error('APP_URL nao configurada.');
  const host = request.headers.host || '127.0.0.1:3000';
  return new URL(`http://${host}`);
}

export function confirmationUrl(request, token) {
  const url = new URL('confirmar-email.html', appUrl(request));
  url.searchParams.set('token', token);
  return url.href;
}

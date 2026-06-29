const configured = (value) => Boolean(String(value || '').trim());
const mailFromAddress = () => {
  const raw = String(process.env.MAIL_FROM || '').trim();
  return (raw.match(/<([^>]+)>/)?.[1] || raw).trim().toLowerCase();
};

export function authTestMode() {
  return process.env.AUTH_TEST_MODE === 'true';
}

export function backendEnvironment() {
  const from = mailFromAddress();
  return {
    NODE_ENV: process.env.NODE_ENV || 'development',
    VERCEL_ENV: process.env.VERCEL_ENV || '',
    DATABASE_URL_CONFIGURED: configured(process.env.DATABASE_URL),
    SESSION_SECRET_CONFIGURED: configured(process.env.SESSION_SECRET),
    APP_URL_CONFIGURED: configured(process.env.APP_URL),
    RESEND_API_KEY_CONFIGURED: configured(process.env.RESEND_API_KEY),
    MAIL_FROM_CONFIGURED: configured(process.env.MAIL_FROM),
    MAIL_FROM_USES_RESEND_DEV: from.endsWith('@resend.dev'),
    AUTH_TEST_MODE_ENABLED: authTestMode()
  };
}

export function safeDiagnostics() {
  return backendEnvironment();
}

export function logApiDiagnostic(route, extra = {}) {
  console.info('ChipBelem API diagnostic', {
    route,
    ...backendEnvironment(),
    ...extra
  });
}

export function logEmailDiagnostic(extra = {}) {
  console.info('ChipBelem email diagnostic', {
    ...backendEnvironment(),
    ...extra
  });
}

import athleteDashboardHandler from '../server/routes/athlete/dashboard.js';
import authConfirmHandler from '../server/routes/auth/confirm.js';
import authLoginHandler from '../server/routes/auth/login.js';
import authLogoutHandler from '../server/routes/auth/logout.js';
import authProfileHandler from '../server/routes/auth/profile.js';
import authRegisterHandler from '../server/routes/auth/register.js';
import authResendHandler from '../server/routes/auth/resend.js';
import authSessionHandler from '../server/routes/auth/session.js';
import eventsHandler from '../server/routes/events.js';
import internalDiagnosticsHandler from '../server/routes/internal/diagnostics.js';
import organizerDashboardHandler from '../server/routes/organizer/dashboard.js';
import organizerEventsHandler from '../server/routes/organizer/events.js';
import organizerEventByIdHandler from '../server/routes/organizer/events/[id].js';
import organizerFinanceHandler from '../server/routes/organizer/finance.js';
import organizerRegistrationsHandler from '../server/routes/organizer/registrations.js';
import organizerRequestsHandler from '../server/routes/organizer-requests.js';
import organizerRequestsApproveHandler from '../server/routes/organizer-requests/approve.js';
import registrationsHandler from '../server/routes/registrations.js';
import { json } from '../server/http.js';

const staticRoutes = new Map([
  ['/api/athlete/dashboard', athleteDashboardHandler],
  ['/api/auth/confirm', authConfirmHandler],
  ['/api/auth/login', authLoginHandler],
  ['/api/auth/logout', authLogoutHandler],
  ['/api/auth/profile', authProfileHandler],
  ['/api/auth/register', authRegisterHandler],
  ['/api/auth/resend', authResendHandler],
  ['/api/auth/session', authSessionHandler],
  ['/api/events', eventsHandler],
  ['/api/internal/diagnostics', internalDiagnosticsHandler],
  ['/api/organizer/dashboard', organizerDashboardHandler],
  ['/api/organizer/events', organizerEventsHandler],
  ['/api/organizer/finance', organizerFinanceHandler],
  ['/api/organizer/registrations', organizerRegistrationsHandler],
  ['/api/organizer-requests', organizerRequestsHandler],
  ['/api/organizer-requests/approve', organizerRequestsApproveHandler],
  ['/api/registrations', registrationsHandler]
]);

function routePath(request) {
  const host = request.headers.host || '127.0.0.1';
  const url = new URL(request.url || '/', `http://${host}`);
  const rewrittenRoute = url.searchParams.get('route');
  if (rewrittenRoute) {
    return `/api/${String(rewrittenRoute).replace(/^\/+/, '').replace(/\/+$/, '')}`;
  }

  const pathname = url.pathname.replace(/\/+$/, '') || '/';
  return pathname.startsWith('/api/') || pathname === '/api' ? pathname : `/api${pathname}`;
}

function requestUrl(request) {
  try {
    const host = request.headers.host || '127.0.0.1';
    return new URL(request.url || '/', `http://${host}`);
  } catch {
    return null;
  }
}

export default async function handler(request, response) {
  const url = requestUrl(request);
  const path = routePath(request);
  const route = url?.searchParams.get('route') || '';

  const logRoute = (found) => {
    console.info('ChipBelem API router', {
      method: request.method,
      url: request.url || '',
      path,
      route,
      found
    });
  };

  if (path === '/api/health') {
    logRoute(true);
    json(response, 200, { ok: true, message: 'API funcionando' });
    return;
  }

  if (/^\/api\/organizer\/events\/[^/]+$/.test(path)) {
    logRoute(true);
    await organizerEventByIdHandler(request, response);
    return;
  }

  const routeHandler = staticRoutes.get(path);
  if (routeHandler) {
    logRoute(true);
    await routeHandler(request, response);
    return;
  }

  logRoute(false);
  json(response, 404, { error: 'Rota nao encontrada.', code: 'not_found' });
}

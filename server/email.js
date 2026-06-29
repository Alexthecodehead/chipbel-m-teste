import { authTestMode, logEmailDiagnostic } from './diagnostics.js';
import { HttpError } from './http.js';

const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

class EmailDeliveryError extends Error {
  constructor(status, message, code = 'email_delivery_failed', providerStatus = null) {
    super(message);
    this.status = status;
    this.code = code;
    this.providerStatus = providerStatus;
  }
}

function mailFrom() {
  const raw = String(process.env.MAIL_FROM || '').trim().replace(/^['"]|['"]$/g, '');
  if (!raw) {
    throw new EmailDeliveryError(500, 'MAIL_FROM nao configurado no ambiente da Vercel.', 'mail_from_missing');
  }
  const address = (raw.match(/<([^>]+)>/)?.[1] || raw).trim();
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(address) || raw.length > 320) {
    throw new EmailDeliveryError(500, 'MAIL_FROM invalido. Use algo como ChipBelem <contato@dominio-verificado.com>.', 'mail_from_invalid');
  }
  if ((process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production') && address.toLowerCase().endsWith('@resend.dev') && !authTestMode()) {
    throw new EmailDeliveryError(
      500,
      'MAIL_FROM nao pode usar resend.dev em producao real. Use um dominio verificado no Resend ou ative AUTH_TEST_MODE=true apenas para testes sem dominio.',
      'mail_from_unverified_domain'
    );
  }
  return raw;
}

const fromUsesResendDev = (from) => {
  const address = (String(from || '').match(/<([^>]+)>/)?.[1] || String(from || '')).trim().toLowerCase();
  return address.endsWith('@resend.dev');
};

export function toEmailHttpError(error) {
  if (error instanceof HttpError) return error;
  if (error instanceof EmailDeliveryError) {
    return new HttpError(error.status, error.message, error.code);
  }
  return new HttpError(502, 'Nao foi possivel enviar o e-mail agora. Tente novamente em alguns minutos.', 'email_delivery_failed');
}

async function sendEmail(payload) {
  if (!process.env.RESEND_API_KEY) {
    logEmailDiagnostic({ action: 'send', status: 'missing_api_key' });
    throw new EmailDeliveryError(500, 'RESEND_API_KEY nao configurada no ambiente da Vercel.', 'email_provider_not_configured');
  }

  let from;
  try {
    from = mailFrom();
  } catch (error) {
    logEmailDiagnostic({ action: 'send', status: error.code || 'invalid_mail_from' });
    throw error;
  }
  logEmailDiagnostic({ action: 'send', toConfigured: Boolean(payload.to), providerStatus: 'pending' });
  const resendResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ from, ...payload })
  });

  logEmailDiagnostic({ action: 'send', providerStatus: resendResponse.status });

  if (!resendResponse.ok) {
    const data = await resendResponse.json().catch(() => ({}));
    console.error('ChipBelem Resend error', {
      status: resendResponse.status,
      message: data?.message || data?.error || 'unknown'
    });
    if (resendResponse.status === 403) {
      const resendDev = fromUsesResendDev(from);
      console.error('ChipBelem Resend 403 hint', {
        reason: resendDev
          ? 'resend.dev so envia para o e-mail dono da conta Resend'
          : 'provavel dominio remetente nao verificado'
      });
      throw new EmailDeliveryError(
        502,
        resendDev
          ? 'O Resend recusou o envio (403). O dominio resend.dev normalmente so envia para o e-mail dono da conta Resend. Para testar sem dominio proprio, use AUTH_TEST_MODE=true.'
          : 'O Resend recusou o envio (403). Verifique se o dominio do MAIL_FROM esta verificado no Resend.',
        'email_forbidden',
        resendResponse.status
      );
    }
    throw new EmailDeliveryError(
      502,
      `O provedor de e-mail retornou erro ${resendResponse.status}. Tente novamente ou revise a configuracao do Resend.`,
      'email_delivery_failed',
      resendResponse.status
    );
  }
}

export async function sendConfirmationEmail({ name, email, confirmationUrl, role = 'athlete' }) {
  const safeName = escapeHtml(name);
  const safeUrl = escapeHtml(confirmationUrl);
  const organizerNotice = role === 'organizer'
    ? '<p>Depois da confirmacao, seu pedido ainda passara pela aprovacao da equipe ChipBelem.</p>'
    : '';
  await sendEmail({
    to: email,
    subject: 'Confirme sua conta no ChipBelem',
    html: `
        <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
          <h2>Confirme sua conta</h2>
          <p>Ola, ${safeName}.</p>
          <p>Recebemos seu cadastro no ChipBelem. Este link expira em 24 horas.</p>
          ${organizerNotice}
          <p><a href="${safeUrl}" style="display:inline-block;background:#16a34a;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:700;">Ativar minha conta</a></p>
          <p>Se voce nao solicitou este cadastro, ignore esta mensagem.</p>
        </div>`
  });
}

export async function sendOrganizerApprovalEmail({ name, email, loginUrl }) {
  await sendEmail({
    to: email,
    subject: 'Sua conta de organizador foi aprovada',
    html: `
      <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
        <h2>Acesso aprovado</h2>
        <p>Ola, ${escapeHtml(name)}.</p>
        <p>Sua conta de organizador no ChipBelem foi aprovada.</p>
        <p><a href="${escapeHtml(loginUrl)}" style="display:inline-block;background:#16a34a;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:700;">Entrar no painel</a></p>
      </div>`
  });
}

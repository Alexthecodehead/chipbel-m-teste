const json = (response, status, payload) => {
  response.status(status).setHeader('Content-Type', 'application/json');
  response.end(JSON.stringify(payload));
};

const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    json(response, 405, { error: 'Metodo nao permitido.' });
    return;
  }

  let body = {};
  try {
    body = typeof request.body === 'string' ? JSON.parse(request.body || '{}') : request.body || {};
  } catch {
    json(response, 400, { error: 'JSON invalido.' });
    return;
  }
  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim();
  const confirmationUrl = String(body.confirmationUrl || '').trim();

  if (!name || !email || !confirmationUrl) {
    json(response, 400, { error: 'Dados incompletos para enviar confirmacao.' });
    return;
  }

  if (!process.env.RESEND_API_KEY) {
    json(response, 503, { error: 'RESEND_API_KEY nao configurada na Vercel.' });
    return;
  }

  const from = process.env.MAIL_FROM || 'ChipBelem <onboarding@resend.dev>';
  const safeName = escapeHtml(name);
  const safeUrl = escapeHtml(confirmationUrl);
  const resendResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from,
      to: email,
      subject: 'Confirme sua conta no ChipBelem',
      html: `
        <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
          <h2>Confirme sua conta</h2>
          <p>Olá, ${safeName}.</p>
          <p>Recebemos seu cadastro no ChipBelem. Clique no botão abaixo para ativar sua conta.</p>
          <p>
            <a href="${safeUrl}" style="display:inline-block; background:#16a34a; color:#ffffff; padding:12px 18px; border-radius:8px; text-decoration:none; font-weight:700;">
              Ativar minha conta
            </a>
          </p>
          <p>Se o botão não funcionar, copie e cole este link no navegador:</p>
          <p><a href="${safeUrl}">${safeUrl}</a></p>
        </div>
      `
    })
  });

  const data = await resendResponse.json().catch(() => ({}));
  if (!resendResponse.ok) {
    json(response, resendResponse.status, { error: data.message || 'Erro ao enviar e-mail.', details: data });
    return;
  }

  json(response, 200, { ok: true, id: data.id });
}

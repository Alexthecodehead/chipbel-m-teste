const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

async function sendEmail(payload) {
  if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY nao configurada.');
  if (!process.env.MAIL_FROM) throw new Error('MAIL_FROM nao configurada.');
  const resendResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ from: process.env.MAIL_FROM, ...payload })
  });

  if (!resendResponse.ok) {
    const data = await resendResponse.json().catch(() => ({}));
    console.error('Resend error:', resendResponse.status, data?.message || 'unknown');
    throw new Error('Falha ao enviar e-mail.');
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

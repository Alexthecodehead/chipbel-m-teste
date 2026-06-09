import { useEffect, useMemo, useState } from 'react';
import { DEMO_USER, EVENTS, SHIRT_SIZES } from './data.js';

const AUTH_KEY = 'chipbelem_athlete';
const ATHLETE_ACCOUNTS_KEY = 'chipbelem_athlete_accounts';
const ATHLETE_PENDING_KEY = 'chipbelem_pending_athletes';
const REGISTRATION_KEY = 'correja_registrations';
const ORGANIZER_EVENTS_KEY = 'chipbelem_organizer_events';
const ORGANIZER_AUTH_KEY = 'chipbelem_organizer';
const ORGANIZER_REQUESTS_KEY = 'chipbelem_organizer_requests';
const APPROVED_ORGANIZERS_KEY = 'chipbelem_approved_organizers';
const BASE_ADMIN = {
  login: 'Admin',
  email: 'Alexandre.duraes.soares@gmail.com',
  password: 'Tecprime@123',
  name: 'Admin',
  company: 'Tecprime',
  role: 'admin'
};

const money = (value) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dateBR = (date) => new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
const dateShortBR = (date) => new Date(date + 'T12:00:00').toLocaleDateString('pt-BR');
const currentPage = () => {
  const page = window.location.pathname.split('/').pop() || 'index.html';
  return page === '' ? 'index.html' : page;
};
const getJSON = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
  catch { return fallback; }
};
const setJSON = (key, value) => localStorage.setItem(key, JSON.stringify(value));
const assetUrl = (path = '') => {
  const value = String(path);
  if (/^(https?:|data:|blob:)/.test(value)) return value;
  return `${import.meta.env.BASE_URL}${value.replace(/^\/+/, '')}`;
};
const createToken = () => (
  globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `token-${Date.now()}-${Math.random().toString(36).slice(2)}`
);
const athleteSession = (account) => ({
  name: account.name,
  email: account.email,
  phone: account.phone,
  city: account.city,
  verifiedAt: account.verifiedAt
});
const sendConfirmationEmail = async ({ name, email, confirmationUrl }) => {
  const response = await fetch('/api/send-confirmation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, confirmationUrl })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Falha ao enviar e-mail.');
  return data;
};
const normalizeEmail = (value = '') => String(value).trim().toLowerCase();
const formatDateTime = (value) => value ? new Date(value).toLocaleString('pt-BR') : '-';
const getStoredOrganizer = () => {
  const saved = getJSON(ORGANIZER_AUTH_KEY, null);
  if (!saved || !['admin', 'organizer'].includes(saved.role)) {
    localStorage.removeItem(ORGANIZER_AUTH_KEY);
    return null;
  }
  return saved;
};
const statusClass = (status) => ['open', 'warning', 'info'].includes(status) ? status : 'closed';
const getEventBySlug = (slug) => EVENTS.find(event => event.slug === slug) || EVENTS[0];
const initials = (name = '') => name.trim().split(/\s+/).slice(0, 2).map(part => part[0] || '').join('').toUpperCase() || 'AT';
const distanceKm = (distance = '') => Number.parseInt(distance, 10) || 0;
const estimateRouteKm = (startLat, startLng, finishLat, finishLng) => {
  const values = [startLat, startLng, finishLat, finishLng].map(Number);
  if (values.some(value => !Number.isFinite(value))) return null;
  const [lat1, lng1, lat2, lng2] = values.map(value => value * Math.PI / 180);
  const dLat = lat2 - lat1;
  const dLng = lng2 - lng1;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

function Layout({ athlete, organizer, onAthleteLogout, children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const page = currentPage();
  const isAdminPage = page.startsWith('admin');
  return (
    <>
      <header>
        <div className="topbar">
          <div className="container nav">
            <a className="logo" href="index.html" aria-label="ChipBelem"><img src={assetUrl('assets/logo_chip.png')} alt="ChipBelem" /></a>
            <nav className={`nav-links ${menuOpen ? 'open' : ''}`} id="navLinks">
              <a href="eventos.html" className={page === 'index.html' || page === 'eventos.html' || page === 'evento.html' ? 'active' : ''}>Eventos</a>
              <a href="minhas-inscricoes.html" className={page === 'minhas-inscricoes.html' ? 'active' : ''}>Área do atleta</a>
            </nav>
            <div className="nav-actions">
              {athlete ? (
                <>
                  <a className="nav-account-link" href="eventos.html">Corridas</a>
                  <a className="nav-account-link" href="minhas-inscricoes.html#perfil">Perfil</a>
                  <a className="nav-account-link" href="minhas-inscricoes.html#performance">Performance</a>
                  <button className="nav-account-link nav-logout" type="button" onClick={onAthleteLogout}>Sair</button>
                </>
              ) : <a className="btn btn-outline btn-small" href="login.html">Entrar</a>}
              {organizer ? (
                <a className={`btn ${isAdminPage ? 'btn-dark' : 'btn-primary'} btn-small`} href="admin.html">Painel admin</a>
              ) : (!athlete && <a className="btn btn-primary btn-small" href="organizador.html">Organizador</a>)}
              <button className="mobile-toggle" type="button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Abrir menu">☰</button>
            </div>
          </div>
        </div>
      </header>
      {children}
      <footer className="footer">
        <div className="container footer-grid">
          <div>
            <img src={assetUrl('assets/logo_chip.png')} alt="ChipBelem" />
            <p>Feito por Alexandre Durães.</p>
          </div>
        </div>
      </footer>
    </>
  );
}

function EventCard({ event }) {
  return (
    <article className="event-card">
      <a className="event-media" href={`evento.html?evento=${event.slug}`} aria-label={`Ver detalhes de ${event.title}`}>
        <img src={assetUrl(event.image)} alt={event.title} />
      </a>
      <div className="event-body">
        <h3 className="event-title"><a href={`evento.html?evento=${event.slug}`}>{event.title}</a></h3>
        <div className="event-meta">
          <span>{dateShortBR(event.date)} - {event.time}</span>
          <span>{event.city} - {event.state}</span>
        </div>
        <div className="event-footer">
          <a className={`event-cta ${statusClass(event.status)}`} href={`evento.html?evento=${event.slug}`}>
            <span aria-hidden="true">◇</span>{event.badge}
          </a>
        </div>
      </div>
    </article>
  );
}

function HomePage() {
  const featured = EVENTS[0];
  return (
    <main>
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <span className="eyebrow">corridas</span>
            <h1>Inscrições esportivas de forma simples e rápida</h1>
            <p>Um sistema completo para divulgar eventos, receber inscrições e organizar a experiência dos atletas.</p>
            <div className="hero-actions">
              <a className="btn btn-primary" href="eventos.html">Ver eventos</a>
              <a className="btn btn-outline" href="cadastro.html">Criar conta</a>
            </div>
          </div>
          <article className="hero-card">
            <img src={assetUrl(featured.image)} alt={featured.title} />
            <div className="hero-card-body">
              <div className="hero-card-title">
                <h3>{featured.title}</h3>
                <span className={`badge ${statusClass(featured.status)}`}>{featured.badge}</span>
              </div>
              <p>{featured.location} • {dateBR(featured.date)} às {featured.time}</p>
              <div className="hero-metrics">
                <div className="metric"><strong>{featured.distances.length}</strong><span>percursos</span></div>
                <div className="metric"><strong>{money(featured.prices[0].price)}</strong><span>valor único</span></div>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className="container">
        <div className="section-head">
          <div>
            <h2>Eventos em destaque</h2>
            <p>Cards de corridas com status, data, localização, distância e chamada para inscrição.</p>
          </div>
          <a className="btn btn-outline" href="eventos.html">Ver todos</a>
        </div>
        <div className="event-grid">{EVENTS.slice(0, 3).map(event => <EventCard event={event} key={event.id} />)}</div>
      </section>

      <section className="container">
        <div className="steps">
          <div className="step"><div className="step-number">1</div><h3>Escolha o evento</h3><p>Consulte data, percurso, valores e regulamento.</p></div>
          <div className="step"><div className="step-number">2</div><h3>Preencha a inscrição</h3><p>Dados pessoais, categoria, percurso e camisa.</p></div>
          <div className="step"><div className="step-number">3</div><h3>Confirme o pagamento</h3><p>Fluxo preparado para Mercado Pago.</p></div>
          <div className="step"><div className="step-number">4</div><h3>Acompanhe tudo</h3><p>Consulte suas inscrições e dados do evento.</p></div>
        </div>
      </section>

      <section id="featureBand">
        <div className="container">
          <section className="feature-band">
            <div>
              <h2>Feito para atletas e organizadores.</h2>
              <p>Este modelo já vem com os blocos mais importantes de uma plataforma de inscrições esportivas.</p>
              <div className="feature-list">
                <div className="feature-item"><span>✓</span><div><strong>Eventos com filtros</strong><br />Busca por cidade, estado e nome do evento.</div></div>
                <div className="feature-item"><span>✓</span><div><strong>Inscrição com pagamento</strong><br />Fluxo preparado para pagamento via Mercado Pago.</div></div>
                <div className="feature-item"><span>✓</span><div><strong>Área do atleta</strong><br />Consulta rápida de inscrições, status e dados do participante.</div></div>
              </div>
            </div>
            <div className="admin-preview">
              <div className="admin-preview-card">
                <div className="admin-row"><strong>2ª Corrida do Sagrado</strong><span>Inscrições abertas</span></div>
                <div className="admin-row"><strong>Corrida Do Sol</strong><span>05 julho</span></div>
                <div className="admin-row"><strong>17ª Corrida Do Sal</strong><span>25 julho</span></div>
                <div className="admin-row"><strong>Calendário</strong><span>{EVENTS.length} eventos</span></div>
              </div>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

function EventsPage() {
  const [query, setQuery] = useState('');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [openOnly, setOpenOnly] = useState(false);
  const states = [...new Set(EVENTS.map(event => event.state))];
  const cities = [...new Set(EVENTS.map(event => event.city))];
  const filtered = EVENTS.filter(event => (
    (!query || `${event.title} ${event.city} ${event.category}`.toLowerCase().includes(query.toLowerCase())) &&
    (!state || event.state === state) &&
    (!city || event.city === city) &&
    (!openOnly || event.status === 'open')
  ));
  return (
    <main className="container page">
      <div className="section-head" style={{ marginTop: 0 }}>
        <div>
          <span className="eyebrow">Eventos disponíveis</span>
          <h2>Encontre sua próxima corrida</h2>
          <p>Filtre por nome, cidade ou estado e abra a página completa do evento.</p>
        </div>
        <span className="badge info">{filtered.length} evento(s)</span>
      </div>
      <div className="filters">
        <div className="field"><label>Buscar</label><input className="input" value={query} onChange={e => setQuery(e.target.value)} placeholder="Nome do evento, cidade ou modalidade" /></div>
        <div className="field"><label>Estado</label><select className="select" value={state} onChange={e => setState(e.target.value)}><option value="">Todos os estados</option>{states.map(item => <option key={item}>{item}</option>)}</select></div>
        <div className="field"><label>Cidade</label><select className="select" value={city} onChange={e => setCity(e.target.value)}><option value="">Todas as cidades</option>{cities.map(item => <option key={item}>{item}</option>)}</select></div>
        <label className="filter-switch">
          <input type="checkbox" checked={openOnly} onChange={e => setOpenOnly(e.target.checked)} />
          <span className="filter-switch-track"><span /></span>
          <strong>Inscrições Abertas</strong>
        </label>
        <div className="field" style={{ justifyContent: 'end' }}><button className="btn btn-outline" type="button" onClick={() => { setQuery(''); setState(''); setCity(''); setOpenOnly(false); }}>Limpar</button></div>
      </div>
      <div className="event-grid">{filtered.length ? filtered.map(event => <EventCard event={event} key={event.id} />) : <div className="empty">Nenhum evento encontrado com esses filtros.</div>}</div>
    </main>
  );
}

function EventDetailPage() {
  const [tab, setTab] = useState('info');
  const params = new URLSearchParams(window.location.search);
  const event = getEventBySlug(params.get('evento'));
  const tabContent = {
    info: <><h3>Informações gerais</h3><p>{event.description}</p><p><strong>Endereço:</strong> {event.address}</p><p><strong>Contato:</strong> {event.contact}</p></>,
    percursos: <><h3>Percursos e categorias</h3><table className="route-table"><thead><tr><th>Distância</th><th>Largada</th><th>Limite</th><th>Categoria</th></tr></thead><tbody>{event.routes.map(route => <tr key={`${route.distance}-${route.category}`}><td>{route.distance}</td><td>{route.start}</td><td>{route.limit}</td><td>{route.category}</td></tr>)}</tbody></table></>,
    kit: <><h3>Kit atleta</h3><ul>{event.kit.map(item => <li key={item}>{item}</li>)}</ul><p>A retirada do kit será divulgada pela organização do evento.</p></>,
    regulamento: <><h3>Regulamento demonstrativo</h3><ul>{event.rules.map(rule => <li key={rule}>{rule}</li>)}</ul><p>Este site é demonstrativo. As regras devem ser substituídas pelo regulamento oficial.</p></>
  };
  return (
    <main className="container page">
      <div className="breadcrumb"><a href="eventos.html">Eventos</a> / {event.title}</div>
      <article className="detail-hero">
        <img src={assetUrl(event.image)} alt={event.title} />
        <div className="detail-content">
          <div>
            <span className={`badge ${statusClass(event.status)}`}>{event.badge}</span>
            <h1 className="detail-title">{event.title}</h1>
            <p className="detail-summary">{event.summary}</p>
            <div className="info-grid">
              <div className="info-card"><span>Data</span><strong>{dateBR(event.date)} às {event.time}</strong></div>
              <div className="info-card"><span>Local</span><strong>{event.location}</strong></div>
              <div className="info-card"><span>Distâncias</span><strong>{event.distances.join(' / ')}</strong></div>
              <div className="info-card"><span>Organizador</span><strong>{event.organizer}</strong></div>
            </div>
            <p>{event.description}</p>
          </div>
          <aside className="sidebar-card">
            <h3>Inscrição</h3>
            <p style={{ color: 'var(--muted)', marginTop: 0 }}>Valor único para inscrição neste evento.</p>
            <div className="price-list">
              {event.prices.map(price => <div className="price-row" key={price.label}><span><strong>{price.label}</strong><br /><small>{price.until}</small></span><strong>{money(price.price)}</strong></div>)}
            </div>
            <a className="btn btn-primary btn-block" href={`inscricao.html?evento=${event.slug}`}>Inscrever-se agora</a>
          </aside>
        </div>
      </article>
      <div className="tabs" role="tablist">
        {Object.keys(tabContent).map(item => <button className={`tab-button ${tab === item ? 'active' : ''}`} type="button" key={item} onClick={() => setTab(item)}>{item === 'info' ? 'Informações' : item[0].toUpperCase() + item.slice(1)}</button>)}
      </div>
      <div className="tab-panel">{tabContent[tab]}</div>
    </main>
  );
}

function CheckoutPage({ athlete, setAthlete, registrations, setRegistrations, toast }) {
  const params = new URLSearchParams(window.location.search);
  const event = getEventBySlug(params.get('evento'));
  const basePrice = event.prices[0].price;
  const [success, setSuccess] = useState(false);
  const submit = (e) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const registration = {
      id: 'CJ' + Math.floor(100000 + Math.random() * 900000),
      eventId: event.id,
      eventSlug: event.slug,
      eventTitle: event.title,
      eventDate: event.date,
      name: form.get('name'),
      cpf: form.get('cpf'),
      email: form.get('email'),
      phone: form.get('phone'),
      gender: form.get('gender'),
      team: form.get('team'),
      distance: form.get('distance'),
      shirt: form.get('shirt'),
      amount: basePrice,
      status: 'Aguardando pagamento',
      createdAt: new Date().toISOString()
    };
    const next = [registration, ...registrations];
    setRegistrations(next);
    setJSON(REGISTRATION_KEY, next);
    if (!athlete) {
      const nextAthlete = { name: form.get('name'), email: form.get('email'), phone: form.get('phone'), city: DEMO_USER.city };
      setAthlete(nextAthlete);
      setJSON(AUTH_KEY, nextAthlete);
    }
    setSuccess(true);
    toast('Inscrição criada. Redirecionando para o Mercado Pago...');
    e.currentTarget.reset();
  };
  return (
    <main className="container page">
      <div className="breadcrumb"><a href="eventos.html">Eventos</a> / <a href={`evento.html?evento=${event.slug}`}>{event.title}</a> / Inscrição</div>
      <div className="section-head" style={{ marginTop: 0 }}><div><h2>Inscrição em {event.title}</h2><p>Preencha seus dados. Ao confirmar, você seguirá para o pagamento pelo Mercado Pago.</p></div></div>
      <div className="form-layout">
        <form className="card" onSubmit={submit}>
          <h3>Dados do atleta</h3>
          <div className="form-grid">
            <div className="field full"><label>Nome completo</label><input className="input" name="name" required placeholder="Ex: Maria Silva" defaultValue={athlete?.name || ''} /></div>
            <div className="field"><label>CPF</label><input className="input" name="cpf" required placeholder="000.000.000-00" /></div>
            <div className="field"><label>Data de nascimento</label><input className="input" name="birth" required type="date" /></div>
            <div className="field"><label>E-mail</label><input className="input" name="email" required type="email" placeholder="voce@email.com" defaultValue={athlete?.email || ''} /></div>
            <div className="field"><label>Telefone</label><input className="input" name="phone" required placeholder="(91) 99999-0000" defaultValue={athlete?.phone || ''} /></div>
            <div className="field"><label>Sexo</label><select className="select" name="gender" required><option value="">Selecione</option><option>Feminino</option><option>Masculino</option><option>Outro</option></select></div>
            <div className="field"><label>Equipe / assessoria</label><input className="input" name="team" placeholder="Opcional" /></div>
            <div className="field"><label>Percurso</label><select className="select" name="distance" required>{event.distances.map(distance => <option key={distance}>{distance}</option>)}</select></div>
            <div className="field"><label>Camisa</label><select className="select" name="shirt" required>{SHIRT_SIZES.map(size => <option key={size}>{size}</option>)}</select></div>
            <div className="field full"><label>Contato de emergência</label><input className="input" name="emergency" placeholder="Nome e telefone" /></div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 18 }}>
            <button className="btn btn-primary" type="submit">Confirmar inscrição e pagar</button>
            <a className="btn btn-outline" href={`evento.html?evento=${event.slug}`}>Voltar ao evento</a>
          </div>
          <div className={`success-box ${success ? 'show' : ''}`}>Inscrição criada com sucesso! Próxima etapa: pagamento via Mercado Pago.</div>
        </form>
        <aside className="card order-summary">
          <h3>Resumo</h3>
          <img src={assetUrl(event.image)} alt={event.title} style={{ borderRadius: 18, marginBottom: 14 }} />
          <div className="summary-line"><span>Evento</span><strong>{event.title}</strong></div>
          <div className="summary-line"><span>Data</span><strong>{dateBR(event.date)}</strong></div>
          <div className="summary-line"><span>Inscrição</span><strong>{money(basePrice)}</strong></div>
          <div className="summary-line total"><span>Total</span><strong>{money(basePrice)}</strong></div>
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>O pagamento será realizado com segurança pelo Mercado Pago após a confirmação.</p>
        </aside>
      </div>
    </main>
  );
}

function AuthPage({ type, athlete, setAthlete, toast }) {
  const isLogin = type === 'login';
  const [sending, setSending] = useState(false);
  const [confirmationNotice, setConfirmationNotice] = useState('');
  const [confirmationLink, setConfirmationLink] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get('email') || '').trim();
    const password = String(form.get('password') || '');
    if (isLogin) {
      const accounts = getJSON(ATHLETE_ACCOUNTS_KEY, []);
      const pending = getJSON(ATHLETE_PENDING_KEY, []).find(item => normalizeEmail(item.email) === normalizeEmail(email));
      const account = accounts.find(item => normalizeEmail(item.email) === normalizeEmail(email));
      if (!account) return toast(pending ? 'Confirme seu e-mail antes de entrar.' : 'Conta nao encontrada. Crie seu cadastro primeiro.');
      if (String(account.password || '') !== password) return toast('Senha invalida.');
      const nextAthlete = athleteSession(account);
      setAthlete(nextAthlete);
      setJSON(AUTH_KEY, nextAthlete);
      toast('Login realizado.');
      setTimeout(() => { window.location.href = 'minhas-inscricoes.html'; }, 500);
      return;
    }
    const nextAthlete = {
      name: String(form.get('name') || '').trim(),
      email,
      phone: String(form.get('phone') || '').trim(),
      city: String(form.get('city') || '').trim()
    };
    if (athlete) {
      const updatedAthlete = { ...nextAthlete, verifiedAt: athlete.verifiedAt || new Date().toISOString() };
      const accounts = getJSON(ATHLETE_ACCOUNTS_KEY, []);
      const nextAccounts = accounts.map(account => normalizeEmail(account.email) === normalizeEmail(athlete.email) ? { ...account, ...nextAthlete, password, verifiedAt: account.verifiedAt || updatedAthlete.verifiedAt } : account);
      setJSON(ATHLETE_ACCOUNTS_KEY, nextAccounts);
      setAthlete(updatedAthlete);
      setJSON(AUTH_KEY, updatedAthlete);
      toast('Perfil atualizado.');
      setTimeout(() => { window.location.href = 'minhas-inscricoes.html'; }, 500);
      return;
    }
    const accounts = getJSON(ATHLETE_ACCOUNTS_KEY, []);
    if (accounts.some(account => normalizeEmail(account.email) === normalizeEmail(email))) {
      toast('Este e-mail ja possui uma conta ativa.');
      return;
    }
    const token = createToken();
    const confirmationUrl = new URL(`confirmar-email.html?token=${encodeURIComponent(token)}`, window.location.href).href;
    const pendingAthlete = {
      ...nextAthlete,
      password,
      token,
      confirmationUrl,
      createdAt: new Date().toISOString()
    };
    const pendingAccounts = getJSON(ATHLETE_PENDING_KEY, []).filter(item => normalizeEmail(item.email) !== normalizeEmail(email));
    setJSON(ATHLETE_PENDING_KEY, [pendingAthlete, ...pendingAccounts]);
    setSending(true);
    setConfirmationLink('');
    setConfirmationNotice('');
    try {
      await sendConfirmationEmail(pendingAthlete);
      setConfirmationNotice('Enviamos um link de confirmacao para o seu e-mail. Abra a mensagem para ativar a conta.');
      toast('E-mail de confirmacao enviado.');
      e.currentTarget.reset();
    } catch (error) {
      setConfirmationNotice(`Nao foi possivel enviar o e-mail automaticamente: ${error.message}. Use o link abaixo para testar a ativacao.`);
      setConfirmationLink(confirmationUrl);
      toast('Cadastro pendente. Configure o envio de e-mail na Vercel.');
    } finally {
      setSending(false);
    }
  };
  return (
    <main className={`auth-page ${isLogin ? 'auth-page-login' : 'auth-page-signup'}`}>
      <section className="auth-visual" aria-label="ChipBelem">
        <a className="auth-brand" href="index.html" aria-label="Voltar para o início"><img src={assetUrl('assets/logo_chip.png')} alt="ChipBelem" /></a>
        <div className="auth-visual-content">
          <span className="auth-kicker">Portal do atleta</span>
          <h1>{isLogin ? 'Acesse sua conta' : 'Crie sua conta de atleta'}</h1>
          <p>{isLogin ? 'Entre para acompanhar inscrições, comprovantes e próximas corridas em um só lugar.' : 'Cadastre seus dados uma vez e agilize suas inscrições nos próximos eventos.'}</p>
          <div className="auth-visual-stats">
            <div><strong>{EVENTS.length}</strong><span>eventos</span></div>
            <div><strong>24h</strong><span>online</span></div>
            <div><strong>100%</strong><span>conectado</span></div>
          </div>
        </div>
      </section>
      <section className="auth-panel">
        <form className="auth-card" onSubmit={submit}>
          <div className="auth-card-head"><span>{isLogin ? 'Login' : 'Cadastro'}</span><h2>{isLogin ? 'Bem-vindo de volta' : 'Dados do atleta'}</h2><p>{isLogin ? 'Use seu e-mail e senha para entrar na área do atleta.' : 'Preencha seus dados para participar dos eventos.'}</p></div>
          {confirmationNotice && <div className="auth-alert"><strong>Confirmação de e-mail</strong><p>{confirmationNotice}</p>{confirmationLink && <a href={confirmationLink}>{confirmationLink}</a>}</div>}
          <div className="form-grid">
            {!isLogin && <div className="field full"><label>Nome completo</label><input className="input" name="name" required placeholder="Seu nome" defaultValue={athlete?.name || ''} /></div>}
            <div className="field full"><label>E-mail</label><input className="input" name="email" required type="email" placeholder="voce@email.com" defaultValue={athlete?.email || ''} /></div>
            {!isLogin && <><div className="field full"><label>Telefone</label><input className="input" name="phone" required placeholder="(91) 99999-0000" defaultValue={athlete?.phone || ''} /></div><div className="field full"><label>Cidade/UF</label><input className="input" name="city" required placeholder="Belém/PA" defaultValue={athlete?.city || DEMO_USER.city} /></div></>}
            <div className="field full"><label>Senha</label><input className="input" name="password" required type="password" placeholder="••••••••" /></div>
          </div>
          {isLogin && <div className="auth-help-row"><label><input type="checkbox" defaultChecked /> Lembrar acesso</label><a href="#">Esqueci minha senha</a></div>}
          <button className="btn btn-primary btn-block auth-submit" type="submit" disabled={sending}>{sending ? 'Enviando...' : isLogin ? 'Entrar' : athlete ? 'Salvar perfil' : 'Cadastrar atleta'}</button>
          <div className="auth-divider"><span>ou</span></div>
          <div className="auth-links">{isLogin ? <><span>Ainda não tem cadastro?</span><a href="cadastro.html">Criar conta</a></> : <><span>Já possui cadastro?</span><a href="login.html">Entrar agora</a></>}</div>
          <a className="auth-back-link" href="eventos.html">Ver eventos disponíveis</a>
        </form>
      </section>
    </main>
  );
}

function ConfirmEmailPage({ setAthlete }) {
  const [status, setStatus] = useState({
    type: 'loading',
    title: 'Confirmando e-mail',
    message: 'Estamos validando o link de confirmação.'
  });
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token');
    if (!token) {
      setStatus({ type: 'error', title: 'Link inválido', message: 'O link de confirmação não possui token.' });
      return;
    }
    const pendingAccounts = getJSON(ATHLETE_PENDING_KEY, []);
    const pending = pendingAccounts.find(account => account.token === token);
    if (!pending) {
      setStatus({ type: 'error', title: 'Link expirado ou já utilizado', message: 'Solicite um novo cadastro ou tente entrar com a conta já confirmada.' });
      return;
    }
    const verifiedAt = new Date().toISOString();
    const account = {
      name: pending.name,
      email: pending.email,
      phone: pending.phone,
      city: pending.city,
      password: pending.password,
      verifiedAt
    };
    const accounts = getJSON(ATHLETE_ACCOUNTS_KEY, []).filter(item => normalizeEmail(item.email) !== normalizeEmail(account.email));
    setJSON(ATHLETE_ACCOUNTS_KEY, [account, ...accounts]);
    setJSON(ATHLETE_PENDING_KEY, pendingAccounts.filter(item => item.token !== token));
    const nextAthlete = athleteSession(account);
    setAthlete(nextAthlete);
    setJSON(AUTH_KEY, nextAthlete);
    setStatus({ type: 'success', title: 'Conta ativada', message: 'Seu e-mail foi confirmado e sua conta já está ativa.' });
  }, [setAthlete]);
  return (
    <main className="container page">
      <section className={`card confirm-card ${status.type}`}>
        <h2>{status.title}</h2>
        <p>{status.message}</p>
        <div className="hero-actions" style={{ justifyContent: 'center' }}>
          <a className="btn btn-primary" href="minhas-inscricoes.html">Ir para área do atleta</a>
          <a className="btn btn-outline" href="eventos.html">Ver eventos</a>
        </div>
      </section>
    </main>
  );
}

function AthleteArea({ athlete, registrations, setAthlete, toast }) {
  if (!athlete) {
    return (
      <main className="container page">
        <div className="section-head" style={{ marginTop: 0 }}><div><h2>Área do atleta</h2><p>Entre ou crie seu cadastro para acompanhar suas corridas.</p></div></div>
        <div className="card empty-state-card">
          <h3>Acesse seu perfil de atleta</h3>
          <p>Depois do login, esta página mostra suas inscrições, dados do perfil, performance e sugestões.</p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginTop: 14 }}>
            <a className="btn btn-primary" href="login.html">Entrar</a>
            <a className="btn btn-outline" href="cadastro.html">Criar cadastro</a>
          </div>
        </div>
        <section className="athlete-suggestions">
          <div className="section-head compact"><div><h2>Corridas em destaque</h2><p>Conheça alguns eventos disponíveis.</p></div><a className="btn btn-outline btn-small" href="eventos.html">Ver todas</a></div>
          <div className="event-grid athlete-event-grid">{EVENTS.slice(0, 4).map(event => <EventCard event={event} key={event.id} />)}</div>
        </section>
      </main>
    );
  }
  const myRegistrations = registrations.filter(reg => reg.email === athlete.email);
  const totalKm = myRegistrations.reduce((sum, reg) => sum + distanceKm(reg.distance), 0);
  const registeredSlugs = new Set(myRegistrations.map(reg => reg.eventSlug));
  const suggestions = EVENTS.filter(event => !registeredSlugs.has(event.slug)).slice(0, 4);
  return (
    <main className="container page">
      <div className="section-head" style={{ marginTop: 0 }}><div><h2>Área do atleta</h2><p>Suas corridas cadastradas, perfil e sugestões de novos desafios.</p></div><a className="btn btn-primary" href="eventos.html">Nova inscrição</a></div>
      <div className="dashboard-grid">
        <aside className="card profile-card" id="perfil">
          <div className="avatar">{initials(athlete.name)}</div>
          <h3>{athlete.name}</h3>
          <p>{athlete.email}<br />{athlete.city || DEMO_USER.city}</p>
          <a className="btn btn-outline btn-block" href="cadastro.html">Editar perfil</a>
        </aside>
        <main>
          <div className="stat-grid" id="performance">
            <div className="stat"><strong>{myRegistrations.length}</strong><span>inscrições</span></div>
            <div className="stat"><strong>{totalKm || 0}K</strong><span>km previstos</span></div>
          </div>
          <div className="card">
            <h3>Minhas corridas</h3>
            {myRegistrations.length ? myRegistrations.map(reg => (
              <div className="ticket" key={reg.id}>
                <div><span className="badge warning">{reg.status}</span><h3>{reg.eventTitle}</h3><p>{dateBR(reg.eventDate)} • {reg.distance} • {reg.shirt} • Nº {reg.id}</p><div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}><a className="btn btn-outline btn-small" href={`evento.html?evento=${reg.eventSlug}`}>Ver evento</a><button className="btn btn-dark btn-small" type="button" onClick={() => toast(`Comprovante da inscrição: ${reg.id}`)}>Comprovante</button></div></div>
                <div className="qr" title="QR Code demonstrativo"></div>
              </div>
            )) : <div className="empty">Você ainda não possui inscrições.</div>}
          </div>
          <section className="athlete-suggestions">
            <div className="section-head compact"><div><h2>Corridas em destaque</h2><p>Sugestões para sua próxima inscrição.</p></div><a className="btn btn-outline btn-small" href="eventos.html">Ver todas</a></div>
            <div className="event-grid athlete-event-grid">{suggestions.map(event => <EventCard event={event} key={event.id} />)}</div>
          </section>
        </main>
      </div>
    </main>
  );
}

function OrganizerInfoSections() {
  const tools = [
    ['↗', 'Evento publicado no ChipBelém', 'Cadastre banner, data, local, valores e deixe a corrida pronta para divulgação.'],
    ['🔒', 'Cadastro do atleta organizado', 'Dados pessoais, percurso, camisa e contato ficam reunidos em um fluxo simples.'],
    ['⌁', 'Inscritos em tempo real', 'Acompanhe os rascunhos e prepare a base de inscritos para operação do evento.'],
    ['◴', 'Inscrição nativa ou externa', 'Use o formulário do ChipBelém ou direcione o atleta para um link de outro site.']
  ];
  return (
    <section className="container organizer-info" id="ferramentas">
      <div className="organizer-info-head"><h2>Ferramentas do ChipBelém para organizadores</h2><p>Do cadastro do evento à inscrição do atleta, o ChipBelém centraliza as etapas principais.</p></div>
      <div className="organizer-tool-grid">{tools.map(item => <article className="organizer-tool" key={item[1]}><span>{item[0]}</span><h3>{item[1]}</h3><p>{item[2]}</p></article>)}</div>
      <div className="organizer-info-head"><h2>Modelo simples para publicar corridas</h2><p>Facilitamos a divulgação, o cadastro e a gestão inicial de eventos esportivos.</p></div>
      <div className="organizer-price-grid">
        <article className="organizer-price-card"><h3>Eventos Gratuitos</h3><p>Cadastre eventos sem cobrança e use a página pública para divulgação.</p></article>
        <article className="organizer-price-card featured"><h3>Eventos Pagos</h3><p>Configure valor base, métodos de pagamento e dados da API do Mercado Pago.</p><strong>sob consulta</strong></article>
        <article className="organizer-price-card"><h3>ChipBelém Pro</h3><p>Estrutura planejada para relatórios, repasses e integrações avançadas.</p></article>
      </div>
      <div className="organizer-info-head"><h2>O que o ChipBelém já reúne</h2><p>Uma plataforma completa para eventos, atletas, inscrições e organização de corridas.</p></div>
      <div className="organizer-history-grid">
        <div><strong>{EVENTS.length}</strong><span>Eventos no calendário</span></div>
        <div><strong>2</strong><span>Áreas de acesso</span></div>
        <div><strong>4</strong><span>Formas de pagamento previstas</span></div>
        <div><strong>100%</strong><span>Fluxo demonstrativo online</span></div>
      </div>
    </section>
  );
}

function OrganizerCreateSection({ organizer, organizerEvents, setOrganizerEvents, toast }) {
  const [mode, setMode] = useState('native');
  const [banner, setBanner] = useState(assetUrl('assets/bg-index.jpg'));
  const [distance, setDistance] = useState('');
  const [estimate, setEstimate] = useState('Informe as coordenadas para gerar uma estimativa em linha reta. O percurso oficial pode ser ajustado manualmente.');
  const submit = (e) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const eventDraft = {
      id: 'org-' + Date.now(),
      name: form.get('eventName'),
      date: form.get('eventDate'),
      time: form.get('eventTime'),
      city: form.get('eventCity'),
      slots: form.get('eventSlots'),
      banner,
      registrationMode: form.get('registrationMode'),
      externalUrl: form.get('externalUrl'),
      price: form.get('eventPrice'),
      paymentMethods: form.getAll('paymentMethods'),
      routeStart: form.get('routeStart'),
      routeFinish: form.get('routeFinish'),
      distanceKm: form.get('distanceKm'),
      createdAt: new Date().toISOString()
    };
    const next = [eventDraft, ...organizerEvents];
    setOrganizerEvents(next);
    setJSON(ORGANIZER_EVENTS_KEY, next);
    toast('Rascunho do evento salvo.');
    e.currentTarget.reset();
  };
  const readBanner = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.addEventListener('load', () => setBanner(reader.result));
    reader.readAsDataURL(file);
  };
  const calculate = () => {
    const km = estimateRouteKm(document.querySelector('#startLat')?.value, document.querySelector('#startLng')?.value, document.querySelector('#finishLat')?.value, document.querySelector('#finishLng')?.value);
    if (!km) return toast('Preencha as quatro coordenadas para calcular.');
    setDistance(km.toFixed(2));
    setEstimate(`Estimativa calculada: ${km.toFixed(2)} km em linha reta. Ajuste o valor se o percurso oficial tiver curvas ou retornos.`);
  };
  return (
    <section className="container page organizer-page" id="criar-evento">
      <div className="section-head" style={{ marginTop: 0 }}>
        <div><span className="eyebrow">Painel do organizador</span><h2>Cadastro do evento</h2><p>{organizer.name}, preencha as informações principais para preparar a publicação da corrida.</p></div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}><span className="badge info">{organizerEvents.length} rascunho(s)</span><a className="btn btn-dark btn-small" href="admin.html">Painel administrativo</a></div>
      </div>
      <div className="organizer-create-layout">
        <form className="card organizer-form" onSubmit={submit}>
          <h3>Informações do evento</h3>
          <div className="form-grid">
            <div className="field full"><label>Nome do evento</label><input className="input" name="eventName" required placeholder="Ex: Corrida Cidade Verde 2026" /></div>
            <div className="field"><label>Data</label><input className="input" name="eventDate" required type="date" /></div>
            <div className="field"><label>Horário de largada</label><input className="input" name="eventTime" required type="time" /></div>
            <div className="field"><label>Cidade/UF</label><input className="input" name="eventCity" required placeholder="Belém/PA" /></div>
            <div className="field"><label>Limite de inscrições</label><input className="input" name="eventSlots" type="number" min="1" placeholder="1000" /></div>
            <div className="field full"><label>Banner do evento</label><input className="input" name="eventBanner" type="file" accept="image/*" onChange={readBanner} /></div>
          </div>
          <h3>Inscrições</h3>
          <div className="form-grid">
            <div className="field"><label>Modo de inscrição</label><select className="select" name="registrationMode" value={mode} onChange={e => setMode(e.target.value)}><option value="native">Nativo pelo nosso site</option><option value="external">Link de outro site</option></select></div>
            <div className="field"><label>Valor base</label><input className="input" name="eventPrice" type="number" min="0" step="0.01" placeholder="135.00" /></div>
            {mode === 'external' && <div className="field full"><label>Link de inscrição externa</label><input className="input" name="externalUrl" type="url" placeholder="https://site-do-organizador.com/inscricao" /></div>}
          </div>
          <h3>Pagamento Mercado Pago</h3>
          <div className="form-grid">
            <div className="field full"><label>Public Key</label><input className="input" name="mercadoPagoPublicKey" placeholder="APP_USR-..." /></div>
            <div className="field full"><label>Access Token / API</label><input className="input" name="mercadoPagoToken" type="password" placeholder="Configure em ambiente seguro" /></div>
            <div className="field full"><label>Formas de pagamento</label><div className="checkbox-grid"><label><input type="checkbox" name="paymentMethods" value="Pix" defaultChecked /> Pix</label><label><input type="checkbox" name="paymentMethods" value="Cartão de crédito" defaultChecked /> Cartão de crédito</label><label><input type="checkbox" name="paymentMethods" value="Boleto" /> Boleto</label></div></div>
          </div>
          <h3>Percurso</h3>
          <div className="form-grid">
            <div className="field full"><label>Ponto de partida</label><input className="input" name="routeStart" required placeholder="Ex: Portal da Amazônia" /></div>
            <div className="field full"><label>Ponto de chegada</label><input className="input" name="routeFinish" required placeholder="Ex: Estação das Docas" /></div>
            <div className="field"><label>KM do evento</label><input className="input" name="distanceKm" type="number" min="0" step="0.01" placeholder="5.00" value={distance} onChange={e => setDistance(e.target.value)} /></div>
            <div className="field" style={{ justifyContent: 'end' }}><button className="btn btn-outline" type="button" onClick={calculate}>Calcular por coordenadas</button></div>
            <div className="field"><label>Latitude da partida</label><input className="input" id="startLat" type="number" step="any" placeholder="-1.4558" /></div>
            <div className="field"><label>Longitude da partida</label><input className="input" id="startLng" type="number" step="any" placeholder="-48.5044" /></div>
            <div className="field"><label>Latitude da chegada</label><input className="input" id="finishLat" type="number" step="any" placeholder="-1.4500" /></div>
            <div className="field"><label>Longitude da chegada</label><input className="input" id="finishLng" type="number" step="any" placeholder="-48.4900" /></div>
          </div>
          <div className="route-estimate">{estimate}</div>
          <button className="btn btn-primary btn-block" type="submit">Salvar rascunho do evento</button>
        </form>
        <aside className="organizer-preview">
          <div className="card"><h3>Prévia do banner</h3><img src={banner} alt="Prévia do banner do evento" /><p>O banner aparecerá na página pública do evento e nos cards de divulgação.</p></div>
          <div className="card"><h3>Eventos criados</h3>{organizerEvents.length ? organizerEvents.map(event => <article className="organizer-event-item" key={event.id}><img src={assetUrl(event.banner || 'assets/bg-index.jpg')} alt={event.name} /><div><strong>{event.name}</strong><span>{dateShortBR(event.date)} • {event.city || 'Cidade não informada'} • {event.distanceKm || '0'}K</span><small>{event.registrationMode === 'external' ? 'Inscrição externa' : 'Inscrição nativa'} • {(event.paymentMethods || []).join(', ') || 'Pagamento não definido'}</small></div></article>) : <div className="empty">Nenhum rascunho criado ainda.</div>}</div>
        </aside>
      </div>
    </section>
  );
}

function OrganizerPage({ organizer, setOrganizer, organizerEvents, setOrganizerEvents, organizerRequests, setOrganizerRequests, approvedOrganizers, toast }) {
  const [authMode, setAuthMode] = useState('login');
  const submitLogin = (e) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const login = String(form.get('login') || '').trim();
    const password = String(form.get('password') || '');
    const isBaseAdmin = (
      login.toLowerCase() === BASE_ADMIN.login.toLowerCase() ||
      normalizeEmail(login) === normalizeEmail(BASE_ADMIN.email)
    ) && password === BASE_ADMIN.password;
    if (isBaseAdmin) {
      const next = { name: BASE_ADMIN.name, email: BASE_ADMIN.email, company: BASE_ADMIN.company, role: BASE_ADMIN.role };
      setOrganizer(next);
      setJSON(ORGANIZER_AUTH_KEY, next);
      toast('Login do admin realizado.');
      setTimeout(() => { window.location.href = 'admin.html'; }, 450);
      return;
    }
    const approved = approvedOrganizers.find(item => normalizeEmail(item.email) === normalizeEmail(login) && String(item.password || '') === password);
    if (approved) {
      const next = { id: approved.id, name: approved.name, email: approved.email, company: approved.company, role: 'organizer' };
      setOrganizer(next);
      setJSON(ORGANIZER_AUTH_KEY, next);
      toast('Login do organizador realizado.');
      setTimeout(() => { window.location.href = 'admin.html'; }, 450);
      return;
    }
    const pending = organizerRequests.find(item => normalizeEmail(item.email) === normalizeEmail(login) && item.status === 'pending');
    toast(pending ? 'Seu pedido ainda aguarda aprovacao do admin.' : 'Login ou senha invalidos.');
  };
  const submitSignup = (e) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get('email') || '').trim();
    const duplicateApproved = approvedOrganizers.some(item => normalizeEmail(item.email) === normalizeEmail(email));
    const duplicatePending = organizerRequests.some(item => normalizeEmail(item.email) === normalizeEmail(email) && item.status === 'pending');
    if (duplicateApproved) return toast('Este e-mail ja possui acesso de organizador.');
    if (duplicatePending) return toast('Ja existe um pedido pendente para este e-mail.');
    const request = {
      id: 'req-' + Date.now(),
      company: String(form.get('company') || '').trim(),
      name: String(form.get('name') || '').trim(),
      email,
      password: String(form.get('password') || ''),
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    const next = [request, ...organizerRequests];
    setOrganizerRequests(next);
    setJSON(ORGANIZER_REQUESTS_KEY, next);
    setAuthMode('login');
    e.currentTarget.reset();
    toast('Pedido enviado. Aguarde aprovacao do admin.');
  };
  return (
    <main>
      <section className="organizer-hero">
        <div className="container organizer-hero-grid">
          <div><span className="eyebrow">Organizadores</span><h1>Abra e gerencie seu evento de corrida</h1><p>Configure inscrições, pagamento, banner, percurso e divulgação em uma área feita para quem organiza provas esportivas.</p><div className="hero-actions"><a className="btn btn-primary" href={organizer ? '#criar-evento' : '#organizerAccess'}>{organizer ? 'Criar evento' : 'Entrar para criar evento'}</a><a className="btn btn-outline" href="#ferramentas">Ver ferramentas</a></div></div>
          {organizer ? (
            <div className="organizer-login-card"><img src={assetUrl('assets/logo_chip.png')} alt="ChipBelem" /><h2>Olá, {organizer.name}</h2><p>Seu painel está liberado. Agora você pode criar rascunhos de eventos e configurar inscrições.</p><a className="btn btn-primary btn-block" href="#criar-evento">Criar novo evento</a><a className="btn btn-outline btn-block" style={{ marginTop: 10 }} href="admin.html">Entrar no painel administrativo</a></div>
          ) : (
            <div className="organizer-login-card" id="organizerAccess">
              <img src={assetUrl('assets/logo_chip.png')} alt="ChipBelem" />
              <div className="organizer-auth-tabs"><button className={authMode === 'login' ? 'active' : ''} type="button" onClick={() => setAuthMode('login')}>Login</button><button className={authMode === 'signup' ? 'active' : ''} type="button" onClick={() => setAuthMode('signup')}>Cadastro</button></div>
              {authMode === 'login' ? <form onSubmit={submitLogin}><h2>Login do organizador</h2><div className="field"><label>Login ou e-mail</label><input className="input" name="login" type="text" placeholder="Admin ou organizador@email.com" required /></div><div className="field"><label>Senha</label><input className="input" name="password" type="password" placeholder="••••••••" required /></div><button className="btn btn-primary btn-block" type="submit">Entrar no painel</button></form> : <form onSubmit={submitSignup}><h2>Solicitar conta de organizador</h2><div className="field"><label>Nome da empresa</label><input className="input" name="company" placeholder="Nome da organização" required /></div><div className="field"><label>Responsável</label><input className="input" name="name" placeholder="Seu nome" required /></div><div className="field"><label>E-mail</label><input className="input" name="email" type="email" placeholder="organizador@email.com" required /></div><div className="field"><label>Senha</label><input className="input" name="password" type="password" placeholder="••••••••" required /></div><button className="btn btn-primary btn-block" type="submit">Enviar pedido</button></form>}
            </div>
          )}
        </div>
      </section>
      {organizer ? <OrganizerCreateSection organizer={organizer} organizerEvents={organizerEvents} setOrganizerEvents={setOrganizerEvents} toast={toast} /> : <OrganizerInfoSections />}
    </main>
  );
}

function AdminPage({ organizer, setOrganizer, registrations, organizerRequests, setOrganizerRequests, approvedOrganizers, setApprovedOrganizers, toast }) {
  const page = currentPage();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const activeEvents = EVENTS.filter(event => new Date(event.date + 'T12:00:00') >= today).length;
  const pastEvents = EVENTS.length - activeEvents;
  const revenue = registrations.reduce((sum, reg) => sum + Number(reg.amount || 0), 0);
  const totalRevenue = 142380 + revenue;
  const adminPages = {
    'admin.html': ['dashboard', 'Dashboard', 'Visão geral de eventos, inscritos, receita e capacidade.'],
    'admin-eventos.html': ['eventos', 'Eventos', 'Gerencie eventos cadastrados e abra as páginas públicas.'],
    'admin-inscritos.html': ['inscritos', 'Inscritos', 'Acompanhe inscrições recentes e exporte a lista em CSV.'],
    'admin-financeiro.html': ['financeiro', 'Financeiro', 'Resumo financeiro demonstrativo das inscrições.'],
    'admin-configuracoes.html': ['config', 'Configurações', 'Dados do organizador e integrações do painel.']
  };
  const [active, title, description] = adminPages[page] || adminPages['admin.html'];
  if (!organizer || !['admin', 'organizer'].includes(organizer.role)) {
    return (
      <main className="container page">
        <section className="card access-denied">
          <h2>Acesso restrito</h2>
          <p>O painel administrativo e liberado apenas para a conta base ou para organizadores aprovados.</p>
          <div className="hero-actions" style={{ justifyContent: 'center' }}>
            <a className="btn btn-primary" href="organizador.html#organizerAccess">Entrar como organizador</a>
            <a className="btn btn-outline" href="index.html">Voltar aos eventos</a>
          </div>
        </section>
      </main>
    );
  }
  const isBaseAdmin = organizer.role === 'admin';
  const pendingRequests = organizerRequests.filter(item => item.status === 'pending');
  const regs = registrations.length ? registrations : [{
    id: 'CJ204891', name: organizer?.name || DEMO_USER.name, email: organizer?.email || DEMO_USER.email,
    eventTitle: EVENTS[0].title, distance: '10K', shirt: 'G', amount: EVENTS[0].prices[0].price, status: 'Aguardando pagamento'
  }];
  const exportCSV = () => {
    const rows = [['numero', 'atleta', 'email', 'evento', 'percurso', 'camisa', 'valor', 'status']].concat(regs.map(reg => [reg.id, reg.name, reg.email, reg.eventTitle, reg.distance, reg.shirt, reg.amount, reg.status]));
    const csv = rows.map(row => row.map(value => `"${String(value ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'inscritos-chipbelem.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast('CSV gerado.');
  };
  const logout = () => {
    localStorage.removeItem(ORGANIZER_AUTH_KEY);
    setOrganizer(null);
    toast('Você saiu do painel administrativo.');
    setTimeout(() => { window.location.href = 'organizador.html'; }, 450);
  };
  const approveRequest = (requestId) => {
    if (!isBaseAdmin) return toast('Apenas o admin base pode aprovar organizadores.');
    const request = organizerRequests.find(item => item.id === requestId);
    if (!request) return toast('Pedido nao encontrado.');
    const reviewedAt = new Date().toISOString();
    const nextRequests = organizerRequests.map(item => item.id === requestId ? {
      ...item,
      status: 'approved',
      approvedAt: reviewedAt,
      approvedBy: organizer.email
    } : item);
    const alreadyApproved = approvedOrganizers.some(item => normalizeEmail(item.email) === normalizeEmail(request.email));
    const approvedUser = {
      id: 'org-' + request.id,
      name: request.name,
      email: request.email,
      company: request.company,
      password: request.password,
      role: 'organizer',
      approvedAt: reviewedAt
    };
    const nextApproved = alreadyApproved ? approvedOrganizers : [approvedUser, ...approvedOrganizers];
    setOrganizerRequests(nextRequests);
    setApprovedOrganizers(nextApproved);
    setJSON(ORGANIZER_REQUESTS_KEY, nextRequests);
    setJSON(APPROVED_ORGANIZERS_KEY, nextApproved);
    toast('Organizador aprovado.');
  };
  const content = {
    dashboard: <><div className="admin-cards" id="dashboard"><div className="kpi"><span>Eventos ativos</span><strong>{activeEvents}</strong></div><div className="kpi"><span>Eventos passados</span><strong>{pastEvents}</strong></div><div className="kpi"><span>Rendimento total</span><strong>{money(totalRevenue)}</strong></div><div className="kpi"><span>Rendimento total</span><strong>{money(totalRevenue)}</strong></div></div><section className="card"><h3>Atalhos rápidos</h3><div className="stat-grid"><a className="stat" href="admin-eventos.html"><strong>Eventos</strong><span>ver calendário</span></a><a className="stat" href="admin-inscritos.html"><strong>Inscritos</strong><span>consultar atletas</span></a><a className="stat" href="admin-financeiro.html"><strong>Financeiro</strong><span>acompanhar valores</span></a></div></section></>,
    eventos: <section className="card"><h3>Eventos</h3><div className="table-wrap"><table className="data-table"><thead><tr><th>Evento</th><th>Cidade</th><th>Data</th><th>Status</th><th>Ações</th></tr></thead><tbody>{EVENTS.map(event => <tr key={event.id}><td><strong>{event.title}</strong><br /><small>{event.category}</small></td><td>{event.city}/{event.state}</td><td>{dateBR(event.date)}</td><td><span className={`badge ${statusClass(event.status)}`}>{event.badge}</span></td><td><a className="btn btn-outline btn-small" href={`evento.html?evento=${event.slug}`}>Abrir</a></td></tr>)}</tbody></table></div></section>,
    inscritos: <section className="card"><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}><h3 style={{ margin: 0 }}>Inscritos recentes</h3><button className="btn btn-outline btn-small" type="button" onClick={exportCSV}>Exportar CSV</button></div><div className="table-wrap" style={{ marginTop: 12 }}><table className="data-table"><thead><tr><th>Número</th><th>Atleta</th><th>Evento</th><th>Percurso</th><th>Valor</th><th>Status</th></tr></thead><tbody>{regs.map(reg => <tr key={reg.id}><td>{reg.id}</td><td><strong>{reg.name}</strong><br /><small>{reg.email}</small></td><td>{reg.eventTitle}</td><td>{reg.distance}</td><td>{money(reg.amount)}</td><td><span className="badge warning">{reg.status}</span></td></tr>)}</tbody></table></div></section>,
    financeiro: <><section className="card"><h3>Resumo financeiro</h3><div className="stat-grid"><div className="stat"><strong>{money(revenue)}</strong><span>valor em inscrições</span></div><div className="stat"><strong>{regs.length}</strong><span>pagamentos pendentes</span></div><div className="stat"><strong>{money(regs.length ? revenue / regs.length : 0)}</strong><span>ticket médio</span></div></div></section><section className="card"><h3>Pagamentos</h3><p style={{ color: 'var(--muted)', marginTop: 0 }}>Esta tela está preparada para receber dados reais do Mercado Pago, repasses e conciliação.</p></section></>,
    config: <><section className="card"><h3>Configurações</h3><div className="form-grid"><div className="field"><label>Organizador</label><input className="input" value={organizer?.company || 'ChipBelém'} readOnly /></div><div className="field"><label>E-mail de contato</label><input className="input" value={organizer?.email || 'contato@chipbelem.com.br'} readOnly /></div><div className="field full"><label>Integração Mercado Pago</label><input className="input" value="Configure as chaves no cadastro do evento" readOnly /></div></div></section>{isBaseAdmin ? <section className="card"><h3>Pedidos de organizador</h3><p className="admin-role-note">A conta base aprova quem pode acessar o painel como organizador.</p>{pendingRequests.length ? <div className="approval-list">{pendingRequests.map(request => <article className="approval-card" key={request.id}><div><strong>{request.company}</strong><span>{request.name} - {request.email}</span><small>Pedido enviado em {formatDateTime(request.createdAt)}</small></div><button className="btn btn-primary btn-small" type="button" onClick={() => approveRequest(request.id)}>Aprovar</button></article>)}</div> : <div className="empty">Nenhum pedido pendente.</div>}</section> : <section className="card"><h3>Aprovação de organizadores</h3><p className="admin-role-note">Somente a conta base pode aprovar novos organizadores.</p></section>}</>
  };
  return (
    <main className="container page">
      <div className="section-head" style={{ marginTop: 0 }}><div><h2>{title}</h2><p>{description}</p></div><div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}><a className="btn btn-primary" href="organizador.html#criar-evento">Novo evento</a><button className="btn btn-outline" type="button" onClick={logout}>Sair</button></div></div>
      <div className="admin-layout">
        <aside className="admin-menu">
          <a className={active === 'dashboard' ? 'active' : ''} href="admin.html">Dashboard</a>
          <a className={active === 'eventos' ? 'active' : ''} href="admin-eventos.html">Eventos</a>
          <a className={active === 'inscritos' ? 'active' : ''} href="admin-inscritos.html">Inscritos</a>
          <a className={active === 'financeiro' ? 'active' : ''} href="admin-financeiro.html">Financeiro</a>
          <a className={active === 'config' ? 'active' : ''} href="admin-configuracoes.html">Configurações</a>
        </aside>
        <main className="admin-content">{content[active]}</main>
      </div>
    </main>
  );
}

function Toast({ message }) {
  return <div id="toast" className={`toast ${message ? 'show' : ''}`}>{message}</div>;
}

export default function App() {
  const [athlete, setAthlete] = useState(() => getJSON(AUTH_KEY, null));
  const [organizer, setOrganizer] = useState(() => getStoredOrganizer());
  const [registrations, setRegistrations] = useState(() => getJSON(REGISTRATION_KEY, []));
  const [organizerEvents, setOrganizerEvents] = useState(() => getJSON(ORGANIZER_EVENTS_KEY, []));
  const [organizerRequests, setOrganizerRequests] = useState(() => getJSON(ORGANIZER_REQUESTS_KEY, []));
  const [approvedOrganizers, setApprovedOrganizers] = useState(() => getJSON(APPROVED_ORGANIZERS_KEY, []));
  const [toastMessage, setToastMessage] = useState('');
  const page = currentPage();
  const toast = (message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(''), 2600);
  };
  const logoutAthlete = () => {
    localStorage.removeItem(AUTH_KEY);
    setAthlete(null);
    toast('Você saiu da conta.');
    setTimeout(() => { window.location.href = 'index.html'; }, 450);
  };
  const pageContent = useMemo(() => {
    if (page === 'index.html' || page === 'eventos.html') return <EventsPage />;
    if (page === 'evento.html') return <EventDetailPage />;
    if (page === 'inscricao.html') return <CheckoutPage athlete={athlete} setAthlete={setAthlete} registrations={registrations} setRegistrations={setRegistrations} toast={toast} />;
    if (page === 'login.html') return <AuthPage type="login" athlete={athlete} setAthlete={setAthlete} toast={toast} />;
    if (page === 'cadastro.html') return <AuthPage type="cadastro" athlete={athlete} setAthlete={setAthlete} toast={toast} />;
    if (page === 'confirmar-email.html') return <ConfirmEmailPage setAthlete={setAthlete} />;
    if (page === 'minhas-inscricoes.html') return <AthleteArea athlete={athlete} registrations={registrations} setAthlete={setAthlete} toast={toast} />;
    if (page === 'organizador.html') return <OrganizerPage organizer={organizer} setOrganizer={setOrganizer} organizerEvents={organizerEvents} setOrganizerEvents={setOrganizerEvents} organizerRequests={organizerRequests} setOrganizerRequests={setOrganizerRequests} approvedOrganizers={approvedOrganizers} toast={toast} />;
    if (page.startsWith('admin')) return <AdminPage organizer={organizer} setOrganizer={setOrganizer} registrations={registrations} organizerRequests={organizerRequests} setOrganizerRequests={setOrganizerRequests} approvedOrganizers={approvedOrganizers} setApprovedOrganizers={setApprovedOrganizers} toast={toast} />;
    return <EventsPage />;
  }, [page, athlete, organizer, registrations, organizerEvents, organizerRequests, approvedOrganizers]);

  return (
    <Layout athlete={athlete} organizer={organizer} onAthleteLogout={logoutAthlete}>
      {pageContent}
      <Toast message={toastMessage} />
    </Layout>
  );
}

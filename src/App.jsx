import { useEffect, useMemo, useRef, useState } from 'react';
import { DEMO_USER, EVENTS, SHIRT_SIZES } from './data.js';

const CONTACT_EMAIL = 'Alexandre.duraes.soares@gmail.com';

const money = (value) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dateBR = (date) => new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
const dateShortBR = (date) => new Date(date + 'T12:00:00').toLocaleDateString('pt-BR');
const currentPage = () => {
  const page = window.location.pathname.split('/').pop() || 'index.html';
  return page === '' ? 'index.html' : page;
};
const assetUrl = (path = '') => {
  const value = String(path);
  if (/^(https?:|data:|blob:)/.test(value)) return value;
  return `${import.meta.env.BASE_URL}${value.replace(/^\/+/, '')}`;
};
const apiRequest = async (path, options = {}) => {
  let response;
  try {
    response = await fetch(path, {
      credentials: 'include',
      ...options,
      headers: options.body ? { 'Content-Type': 'application/json', ...(options.headers || {}) } : options.headers
    });
  } catch {
    const error = new Error('Nao foi possivel conectar ao servidor. Verifique sua internet e tente novamente.');
    error.code = 'network_error';
    throw error;
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || 'Nao foi possivel concluir a operacao.');
    error.code = data.code;
    error.status = response.status;
    throw error;
  }
  return data;
};
const formatDateTime = (value) => value ? new Date(value).toLocaleString('pt-BR') : '-';
const formatDuration = (seconds) => {
  if (seconds == null) return '-';
  const hours = Math.floor(Number(seconds) / 3600);
  const minutes = Math.floor((Number(seconds) % 3600) / 60);
  const remaining = Number(seconds) % 60;
  return [hours, minutes, remaining].map(value => String(value).padStart(2, '0')).join(':');
};
const normalizeOrganizerEvent = (event) => ({
  ...event,
  name: event.title,
  date: event.event_date,
  time: event.start_time,
  banner: event.banner_url,
  registrationMode: event.registration_mode,
  externalUrl: event.external_registration_url,
  slots: event.slots_limit
});
const normalizePublicEvent = (event) => {
  const routes = (event.routes || []).map(route => ({
    id: Number(route.id),
    distance: route.name || `${Number(route.distance_km || 0)}K`,
    start: String(event.start_time || '').slice(0, 5),
    limit: event.slots_limit ? `${event.slots_limit} atletas` : 'Consulte o organizador',
    category: event.category || 'Geral',
    distanceKm: Number(route.distance_km || 0)
  }));
  const prices = (event.prices || []).map(price => ({
    id: Number(price.id),
    label: price.label,
    price: Number(price.price || 0),
    until: price.ends_at ? `até ${new Date(price.ends_at).toLocaleDateString('pt-BR')}` : 'lote disponível'
  }));
  return {
    ...event,
    id: Number(event.id),
    date: String(event.event_date).slice(0, 10),
    time: String(event.start_time || '').slice(0, 5),
    image: event.banner_url || 'assets/bg-index.jpg',
    badge: event.status === 'warning' ? 'Últimas vagas' : 'Inscrições abertas',
    location: event.location || `${event.city}/${event.state}`,
    distances: routes.map(route => route.distance),
    routes,
    prices: prices.length ? prices : [{ label: 'Inscrição', price: 0, until: 'gratuita' }],
    kit: [],
    rules: [],
    contact: 'Entre em contato com o organizador',
    registrationMode: event.registration_mode,
    externalUrl: event.external_registration_url
  };
};
const csvCell = (value) => {
  const text = String(value ?? '').replaceAll('"', '""');
  return `"${/^[=+\-@]/.test(text) ? `'${text}` : text}"`;
};
const isSafeHttpUrl = (value) => {
  if (!value) return true;
  try { return ['http:', 'https:'].includes(new URL(value).protocol); }
  catch { return false; }
};
const statusClass = (status) => ['open', 'warning', 'info'].includes(status) ? status : 'closed';
const getEventBySlug = (slug, events = EVENTS) => events.find(event => event.slug === slug) || events[0] || EVENTS[0];
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
          <div className="footer-top">
            <div className="footer-brand">
              <img src={assetUrl('assets/logo_chip.png')} alt="ChipBelem" />
            </div>
            <div className="footer-social" aria-label="Redes sociais">
              <a href="https://www.facebook.com/chipbelemcrono" target="_blank" rel="noreferrer" aria-label="Facebook ChipBelem">
                <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M19.1 29V17.8h3.8l.6-4.4h-4.4v-2.8c0-1.3.4-2.1 2.2-2.1h2.3V4.6c-.4-.1-1.8-.2-3.4-.2-3.4 0-5.7 2.1-5.7 5.8v3.2h-3.8v4.4h3.8V29h4.6z" /></svg>
              </a>
              <a href="https://www.instagram.com/chipbelemcrono/" target="_blank" rel="noreferrer" aria-label="Instagram ChipBelem">
                <svg viewBox="0 0 32 32" aria-hidden="true"><rect x="5" y="5" width="22" height="22" rx="6" /><circle cx="16" cy="16" r="5" /><circle className="footer-icon-dot" cx="22.3" cy="9.7" r="1.3" /></svg>
              </a>
              <a href="contato.html" aria-label="Falar com a equipe ChipBelem">
                <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 4.5c6.2 0 11.2 4.5 11.2 10.1 0 5.1-4.1 9.3-9.6 10l-5.5 3.2.7-3.9C8.1 22.4 4.8 18.8 4.8 14.6 4.8 9 9.8 4.5 16 4.5z" /><path d="M13.3 12.5c.2-2.2 1.8-3.6 4-3.6 2.5 0 4.1 1.5 4.1 3.6 0 1.5-.7 2.5-2.2 3.5-1.2.8-1.6 1.4-1.6 2.7v.5h-3v-.7c0-1.8.7-3 2.1-4 1.1-.8 1.5-1.2 1.5-1.9 0-.8-.6-1.3-1.5-1.3s-1.5.5-1.7 1.5l-1.7-.3z" /><circle className="footer-icon-dot" cx="16.1" cy="22.5" r="1.5" /></svg>
              </a>
            </div>
          </div>
          <p className="footer-description">
            A ChipBelém conecta atletas, organizadores e eventos esportivos com inscrições, cronometragem e gestão de corridas de forma prática e segura.
          </p>
          <nav className="footer-links" aria-label="Links do rodapé">
            <div className="footer-link-group">
              <h2>Atletas</h2>
              <a href="eventos.html">Acessar eventos</a>
              <a href="cadastro.html">Crie sua conta</a>
              <a href="minhas-inscricoes.html">Área do atleta</a>
            </div>
            <div className="footer-link-group">
              <h2>Organizadores</h2>
              <a href="organizador.html">Serviços oferecidos</a>
              <a href="organizador.html">Crie sua conta</a>
              <a href="admin.html">Painel admin</a>
            </div>
            <div className="footer-link-group">
              <h2>Institucional</h2>
              <a href="contato.html">Fale conosco</a>
              <a href="https://www.instagram.com/chipbelemcrono/" target="_blank" rel="noreferrer">Instagram</a>
              <a href="https://www.facebook.com/chipbelemcrono" target="_blank" rel="noreferrer">Facebook</a>
            </div>
          </nav>
          <div className="footer-bottom">
            <span>© 2026 - ChipBelém - Todos os direitos reservados.</span>
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

function EventCarousel({ events }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const total = events.length;
  const goTo = (index) => setActiveIndex((index + total) % total);

  useEffect(() => {
    if (paused || total < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const interval = window.setInterval(() => {
      setActiveIndex((activeIndex + 1) % total);
    }, 5000);
    return () => window.clearInterval(interval);
  }, [activeIndex, paused, total]);

  return (
    <section
      className="event-carousel"
      aria-label="Eventos em destaque"
      aria-roledescription="carrossel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false);
      }}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft') goTo(activeIndex - 1);
        if (event.key === 'ArrowRight') goTo(activeIndex + 1);
      }}
    >
      <div className="event-carousel-viewport">
        <span className="event-carousel-side-label left" aria-hidden="true">Destaques</span>
        <div className="event-carousel-track" style={{ transform: `translateX(-${activeIndex * 100}%)` }}>
          {events.map((event, index) => (
            <article
              className="event-carousel-slide"
              aria-label={`${index + 1} de ${total}: ${event.title}`}
              aria-hidden={index !== activeIndex}
              key={event.id}
            >
              <a className="event-carousel-banner" href={`evento.html?evento=${event.slug}`} tabIndex={index === activeIndex ? 0 : -1} aria-label={`Abrir ${event.title}`}>
                <img src={assetUrl(event.image)} alt={event.title} />
              </a>
            </article>
          ))}
        </div>
        <span className="event-carousel-side-label right" aria-hidden="true">Destaques</span>
        <button className="event-carousel-arrow previous" type="button" onClick={() => goTo(activeIndex - 1)} aria-label="Evento anterior" title="Evento anterior">‹</button>
        <button className="event-carousel-arrow next" type="button" onClick={() => goTo(activeIndex + 1)} aria-label="Próximo evento" title="Próximo evento">›</button>
      </div>
      <div className="event-carousel-controls" aria-label="Selecionar evento">
        {events.map((event, index) => (
          <button
            className={index === activeIndex ? 'active' : ''}
            type="button"
            onClick={() => goTo(index)}
            aria-label={`Mostrar ${event.title}`}
            aria-current={index === activeIndex ? 'true' : undefined}
            key={event.id}
          />
        ))}
      </div>
    </section>
  );
}

function EventsPage({ events }) {
  const [query, setQuery] = useState('');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [openOnly, setOpenOnly] = useState(false);
  const states = [...new Set(events.map(event => event.state))];
  const cities = [...new Set(events.map(event => event.city))];
  const filtered = events.filter(event => (
    (!query || `${event.title} ${event.city} ${event.category}`.toLowerCase().includes(query.toLowerCase())) &&
    (!state || event.state === state) &&
    (!city || event.city === city) &&
    (!openOnly || event.status === 'open')
  ));
  return (
    <main className="container page events-page">
      <EventCarousel events={events.slice(0, 6)} />
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

function EventDetailPage({ events }) {
  const [tab, setTab] = useState('info');
  const params = new URLSearchParams(window.location.search);
  const event = getEventBySlug(params.get('evento'), events);
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
            <a className="btn btn-primary btn-block" href={event.registrationMode === 'external' ? event.externalUrl : `inscricao.html?evento=${event.slug}`} target={event.registrationMode === 'external' ? '_blank' : undefined} rel={event.registrationMode === 'external' ? 'noreferrer' : undefined}>Inscrever-se agora</a>
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

function CheckoutPage({ athlete, events, registrations, setRegistrations, toast }) {
  const params = new URLSearchParams(window.location.search);
  const event = getEventBySlug(params.get('evento'), events);
  const basePrice = event.prices[0].price;
  const [success, setSuccess] = useState(false);
  const [sending, setSending] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (!athlete) {
      toast('Entre na sua conta antes de concluir a inscricao.');
      setTimeout(() => { window.location.href = 'login.html'; }, 500);
      return;
    }
    const form = new FormData(e.currentTarget);
    if (Number.isSafeInteger(event.id)) {
      setSending(true);
      try {
        const data = await apiRequest('/api/registrations', {
          method: 'POST',
          body: JSON.stringify({
            eventId: event.id,
            routeId: Number(form.get('distance')),
            shirtSize: String(form.get('shirt') || '')
          })
        });
        setSuccess(true);
        toast(data.message);
        e.currentTarget.reset();
      } catch (error) {
        toast(error.message);
      } finally {
        setSending(false);
      }
      return;
    }
    const registration = {
      id: 'CJ' + Math.floor(100000 + Math.random() * 900000),
      eventId: event.id,
      eventSlug: event.slug,
      eventTitle: event.title,
      eventDate: event.date,
      name: form.get('name'),
      email: form.get('email'),
      distance: form.get('distance'),
      shirt: form.get('shirt'),
      amount: basePrice,
      status: 'Aguardando pagamento',
      createdAt: new Date().toISOString()
    };
    const next = [registration, ...registrations];
    setRegistrations(next);
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
            <div className="field"><label>Percurso</label><select className="select" name="distance" required>{event.routes.map(route => <option value={route.id || route.distance} key={route.id || route.distance}>{route.distance}</option>)}</select></div>
            <div className="field"><label>Camisa</label><select className="select" name="shirt" required>{SHIRT_SIZES.map(size => <option key={size}>{size}</option>)}</select></div>
            <div className="field full"><label>Contato de emergência</label><input className="input" name="emergency" placeholder="Nome e telefone" /></div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 18 }}>
            <button className="btn btn-primary" type="submit" disabled={sending}>{sending ? 'Criando inscrição...' : 'Confirmar inscrição e pagar'}</button>
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

function AuthPage({ type, athlete, setAthlete, setOrganizer, toast }) {
  const isLogin = type === 'login';
  const isEditing = Boolean(athlete && !isLogin);
  const [accountType, setAccountType] = useState('athlete');
  const [sending, setSending] = useState(false);
  const [confirmationNotice, setConfirmationNotice] = useState('');
  const [resendEmail, setResendEmail] = useState('');
  const resendConfirmation = async () => {
    if (!resendEmail || sending) return;
    setSending(true);
    try {
      const data = await apiRequest('/api/auth/resend', {
        method: 'POST',
        body: JSON.stringify({ email: resendEmail })
      });
      setConfirmationNotice(data.message);
      toast('Novo link de confirmacao solicitado.');
    } catch (error) {
      toast(error.message);
    } finally {
      setSending(false);
    }
  };
  const submit = async (e) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get('email') || '').trim();
    const password = String(form.get('password') || '');
    setSending(true);
    setConfirmationNotice('');
    try {
      if (isLogin) {
        const data = await apiRequest('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ login: email, password, audience: accountType })
        });
        if (data.user.role === 'athlete') {
          setOrganizer(null);
          setAthlete(data.user);
        }
        if (['organizer', 'admin'].includes(data.user.role)) {
          setAthlete(null);
          setOrganizer(data.user);
        }
        toast('Login realizado.');
        setTimeout(() => {
          window.location.href = data.user.role === 'athlete' ? 'minhas-inscricoes.html' : 'admin.html';
        }, 500);
      } else if (athlete) {
        const data = await apiRequest('/api/auth/profile', {
          method: 'POST',
          body: JSON.stringify({
            name: String(form.get('name') || '').trim(),
            phone: String(form.get('phone') || '').trim(),
            city: String(form.get('city') || '').trim(),
            password
          })
        });
        setAthlete(data.user);
        toast('Perfil atualizado.');
        setTimeout(() => { window.location.href = 'minhas-inscricoes.html'; }, 500);
      } else {
        await apiRequest('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            role: accountType,
            name: String(form.get('name') || '').trim(),
            email,
            phone: String(form.get('phone') || '').trim(),
            city: String(form.get('city') || '').trim(),
            company: String(form.get('company') || '').trim(),
            password
          })
        });
        setResendEmail(email);
        setConfirmationNotice(accountType === 'organizer'
          ? 'Enviamos o link de confirmacao. Depois de confirmar o e-mail, seu pedido sera analisado pela equipe.'
          : 'Enviamos um link de confirmacao. Abra a mensagem para ativar sua conta.');
        toast('E-mail de confirmacao enviado.');
        e.currentTarget.reset();
      }
    } catch (error) {
      if (error.code === 'email_unverified' || error.code === 'email_delivery_failed') {
        setResendEmail(email);
        setConfirmationNotice(error.message);
      } else if (error.code === 'approval_pending') {
        setConfirmationNotice('Seu e-mail ja foi confirmado. A conta de organizador ainda aguarda aprovacao da equipe.');
      }
      toast(error.message);
    } finally {
      setSending(false);
    }
  };
  return (
    <main className={`auth-page ${isLogin ? 'auth-page-login' : 'auth-page-signup'}`}>
      <section className="auth-visual" aria-label="ChipBelem">
        <a className="auth-brand" href="index.html" aria-label="Voltar para o início"><img src={assetUrl('assets/logo_chip.png')} alt="ChipBelem" /></a>
        <div className="auth-visual-content">
          <span className="auth-kicker">Portal ChipBelem</span>
          <h1>{isLogin ? 'Acesse sua conta' : 'Crie sua conta'}</h1>
          <p>{accountType === 'athlete' ? 'Acompanhe inscrições, resultados e suas próximas corridas.' : 'Organize eventos, inscritos e informações financeiras em uma área protegida.'}</p>
          <div className="auth-visual-stats">
            <div><strong>{EVENTS.length}</strong><span>eventos</span></div>
            <div><strong>24h</strong><span>online</span></div>
            <div><strong>100%</strong><span>conectado</span></div>
          </div>
        </div>
      </section>
      <section className="auth-panel">
        <form className="auth-card" onSubmit={submit}>
          {!isEditing && <div className="account-type" aria-label="Tipo de conta">
            <button className={accountType === 'athlete' ? 'active' : ''} type="button" onClick={() => setAccountType('athlete')} disabled={sending}>Atleta</button>
            <button className={accountType === 'organizer' ? 'active' : ''} type="button" onClick={() => setAccountType('organizer')} disabled={sending}>Organizador</button>
          </div>}
          <div className="auth-card-head"><span>{isLogin ? 'Login' : 'Cadastro'}</span><h2>{isLogin ? 'Bem-vindo de volta' : 'Dados da conta'}</h2><p>Informe seus dados para acessar o perfil correto.</p></div>
          {confirmationNotice && <div className="auth-alert"><strong>Situação da conta</strong><p>{confirmationNotice}</p></div>}
          {confirmationNotice && resendEmail && <button className="auth-resend" type="button" onClick={resendConfirmation} disabled={sending}>Reenviar e-mail de confirmacao</button>}
          <div className="form-grid">
            {!isLogin && <div className="field full"><label>Nome completo</label><input className="input" name="name" required placeholder="Seu nome" defaultValue={athlete?.name || ''} /></div>}
            {!isLogin && !isEditing && accountType === 'organizer' && <div className="field full"><label>Nome da empresa ou organizacao</label><input className="input" name="company" required maxLength="180" placeholder="Nome da organizacao" /></div>}
            <div className="field full"><label>{isLogin ? 'Login ou e-mail' : 'E-mail'}</label><input className="input" name="email" required type={isLogin ? 'text' : 'email'} placeholder={isLogin && accountType === 'organizer' ? 'Admin ou organizador@email.com' : 'voce@email.com'} defaultValue={athlete?.email || ''} readOnly={Boolean(athlete && !isLogin)} autoComplete="username" /></div>
            {!isLogin && <><div className="field full"><label>Telefone</label><input className="input" name="phone" required placeholder="(91) 99999-0000" defaultValue={athlete?.phone || ''} /></div><div className="field full"><label>Cidade/UF</label><input className="input" name="city" required placeholder="Belém/PA" defaultValue={athlete?.city || DEMO_USER.city} /></div></>}
            <div className="field full"><label>{athlete && !isLogin ? 'Senha atual' : 'Senha'}</label><input className="input" name="password" required type="password" minLength={isLogin ? undefined : 12} maxLength="128" placeholder="••••••••••••" autoComplete={isLogin ? 'current-password' : athlete ? 'current-password' : 'new-password'} /></div>
          </div>
          <button className="btn btn-primary btn-block auth-submit" type="submit" disabled={sending}>{sending ? 'Aguarde...' : isLogin ? 'Entrar' : athlete ? 'Salvar perfil' : `Cadastrar ${accountType === 'athlete' ? 'atleta' : 'organizador'}`}</button>
          <div className="auth-divider"><span>ou</span></div>
          <div className="auth-links">{isLogin ? <><span>Ainda não tem cadastro?</span><a href="cadastro.html">Criar conta</a></> : <><span>Já possui cadastro?</span><a href="login.html">Entrar agora</a></>}</div>
          <a className="auth-back-link" href="eventos.html">Ver eventos disponíveis</a>
        </form>
      </section>
    </main>
  );
}

function ConfirmEmailPage({ setAthlete, setOrganizer }) {
  const confirmStarted = useRef(false);
  const [status, setStatus] = useState({
    type: 'loading',
    title: 'Confirmando e-mail',
    message: 'Estamos validando o link de confirmação.'
  });
  useEffect(() => {
    if (confirmStarted.current) return;
    confirmStarted.current = true;
    const token = new URLSearchParams(window.location.search).get('token');
    if (!token) {
      setStatus({ type: 'error', title: 'Link inválido', message: 'O link de confirmação não possui token.' });
      return;
    }
    let redirectTimer;
    apiRequest('/api/auth/confirm', {
      method: 'POST',
      body: JSON.stringify({ token })
    }).then((data) => {
      if (data.user?.role === 'athlete') setAthlete(data.user);
      if (data.user && ['organizer', 'admin'].includes(data.user.role)) setOrganizer(data.user);
      setStatus({ type: 'success', title: data.user ? 'Conta ativada' : 'E-mail confirmado', message: data.message, next: data.next });
      redirectTimer = window.setTimeout(() => { window.location.href = data.next; }, 2200);
    }).catch((error) => {
      setStatus({ type: 'error', title: 'Link expirado ou já utilizado', message: error.message });
    });
    return () => window.clearTimeout(redirectTimer);
  }, [setAthlete, setOrganizer]);
  return (
    <main className="container page">
      <section className={`card confirm-card ${status.type}`}>
        <h2>{status.title}</h2>
        <p>{status.message}</p>
        <div className="hero-actions" style={{ justifyContent: 'center' }}>
          <a className="btn btn-primary" href={status.next || 'login.html'}>{status.next?.startsWith('admin') ? 'Ir para o painel' : status.next?.startsWith('organizador') ? 'Acompanhar cadastro' : 'Ir para área do atleta'}</a>
          <a className="btn btn-outline" href="eventos.html">Ver eventos</a>
        </div>
      </section>
    </main>
  );
}

function ContactPage() {
  const [sent, setSent] = useState(false);
  const submitContact = (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const subject = encodeURIComponent('Contato pelo site ChipBelem');
    const body = encodeURIComponent([
      `Nome: ${form.get('name') || ''}`,
      `E-mail: ${form.get('email') || ''}`,
      '',
      form.get('message') || ''
    ].join('\n'));
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
    setSent(true);
    event.currentTarget.reset();
  };
  return (
    <main className="container page contact-page">
      <div className="section-head" style={{ marginTop: 0 }}>
        <div>
          <span className="eyebrow">Contato</span>
          <h2>Fale com a nossa equipe</h2>
          <p>Envie sua dúvida sobre inscrições, eventos, cronometragem ou suporte para organizadores.</p>
        </div>
      </div>
      <div className="contact-layout">
        <form className="card contact-form" onSubmit={submitContact}>
          <div className="form-grid">
            <div className="field"><label>Nome</label><input className="input" name="name" required placeholder="Seu nome" /></div>
            <div className="field"><label>E-mail</label><input className="input" name="email" required type="email" placeholder="Seu e-mail" /></div>
            <div className="field full"><label>Mensagem</label><textarea className="textarea" name="message" required placeholder="Como podemos ajudar?" /></div>
          </div>
          <button className="btn btn-primary" type="submit">Enviar contato</button>
          {sent && <div className="success-box show">Seu aplicativo de e-mail foi aberto para concluir o envio.</div>}
        </form>
        <aside className="card contact-aside">
          <img src={assetUrl('assets/logo_chip.png')} alt="ChipBelem" />
          <h3>ChipBelem</h3>
          <p>Cronometragem, inscrições e gestão de eventos esportivos.</p>
          <div className="contact-social">
            <a href="https://www.instagram.com/chipbelemcrono/" target="_blank" rel="noreferrer">Instagram</a>
            <a href="https://www.facebook.com/chipbelemcrono" target="_blank" rel="noreferrer">Facebook</a>
          </div>
        </aside>
      </div>
    </main>
  );
}

function AthleteArea({ athlete, athleteDashboard, setAthlete, toast }) {
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
  const myRegistrations = athleteDashboard?.registrations || [];
  const stats = athleteDashboard?.stats || {};
  const registeredSlugs = new Set(myRegistrations.map(reg => reg.event_slug));
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
            <div className="stat"><strong>{Number(stats.registrations || 0)}</strong><span>inscrições</span></div>
            <div className="stat"><strong>{Number(stats.participations || 0)}</strong><span>participações concluídas</span></div>
            <div className="stat"><strong>{Number(stats.totalKm || 0).toFixed(1)}K</strong><span>km acumulados</span></div>
            <div className="stat"><strong>{formatDuration(stats.averageTimeSeconds)}</strong><span>tempo médio</span></div>
          </div>
          <div className="card">
            <h3>Minhas corridas</h3>
            {myRegistrations.length ? myRegistrations.map(reg => (
              <div className="ticket" key={reg.id}>
                <div><span className="badge warning">{reg.status}</span><h3>{reg.event_title}</h3><p>{dateBR(reg.event_date)} • {reg.route_name || `${reg.distance_km || 0}K`} • {reg.shirt_size || 'Sem camisa'} • Nº {reg.registration_number}</p>{reg.net_time_seconds != null && <p><strong>Resultado:</strong> {formatDuration(reg.net_time_seconds)} • posição geral {reg.overall_position || '-'}</p>}<div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}><a className="btn btn-outline btn-small" href={`evento.html?evento=${reg.event_slug}`}>Ver evento</a><button className="btn btn-dark btn-small" type="button" onClick={() => toast(`Comprovante da inscrição: ${reg.registration_number}`)}>Comprovante</button></div></div>
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
  const [saving, setSaving] = useState(false);
  const [estimate, setEstimate] = useState('Informe as coordenadas para gerar uma estimativa em linha reta. O percurso oficial pode ser ajustado manualmente.');
  const submit = async (e) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const externalUrl = String(form.get('externalUrl') || '').trim();
    if (form.get('registrationMode') === 'external' && !isSafeHttpUrl(externalUrl)) {
      toast('Informe um link externo HTTP ou HTTPS valido.');
      return;
    }
    const locationParts = String(form.get('eventCity') || '').split('/').map(value => value.trim());
    const state = locationParts.length > 1 ? locationParts.pop().toUpperCase() : '';
    const city = locationParts.join('/');
    setSaving(true);
    try {
      const data = await apiRequest('/api/organizer/events', {
        method: 'POST',
        body: JSON.stringify({
          title: String(form.get('eventName') || '').trim(),
          eventDate: form.get('eventDate'),
          startTime: form.get('eventTime'),
          city,
          state,
          slotsLimit: Number(form.get('eventSlots') || 0) || null,
          bannerUrl: banner.startsWith('data:') ? null : banner,
          registrationMode: form.get('registrationMode'),
          externalUrl,
          price: Number(form.get('eventPrice') || 0),
          routeStart: form.get('routeStart'),
          routeFinish: form.get('routeFinish'),
          distanceKm: Number(form.get('distanceKm') || 0),
          status: 'draft'
        })
      });
      setOrganizerEvents(items => [normalizeOrganizerEvent(data.event), ...items]);
      toast(data.message);
      e.currentTarget.reset();
      setDistance('');
      setBanner(assetUrl('assets/bg-index.jpg'));
    } catch (error) {
      toast(error.message);
    } finally {
      setSaving(false);
    }
  };
  const readBanner = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type) || file.size > 2 * 1024 * 1024) {
      e.target.value = '';
      toast('Use uma imagem PNG, JPEG ou WebP de ate 2 MB.');
      return;
    }
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
            <div className="field full"><label>Banner do evento</label><input className="input" name="eventBanner" type="file" accept="image/png,image/jpeg,image/webp" onChange={readBanner} /></div>
          </div>
          <h3>Inscrições</h3>
          <div className="form-grid">
            <div className="field"><label>Modo de inscrição</label><select className="select" name="registrationMode" value={mode} onChange={e => setMode(e.target.value)}><option value="native">Nativo pelo nosso site</option><option value="external">Link de outro site</option></select></div>
            <div className="field"><label>Valor base</label><input className="input" name="eventPrice" type="number" min="0" step="0.01" placeholder="135.00" /></div>
            {mode === 'external' && <div className="field full"><label>Link de inscrição externa</label><input className="input" name="externalUrl" type="url" maxLength="500" placeholder="https://site-do-organizador.com/inscricao" /></div>}
          </div>
          <h3>Pagamento Mercado Pago</h3>
          <div className="form-grid">
            <div className="field full"><label>Public Key</label><input className="input" name="mercadoPagoPublicKey" placeholder="APP_USR-..." /></div>
            <div className="field full"><label>Access Token / API</label><input className="input" value="Configurado somente no servidor" readOnly /></div>
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
          <button className="btn btn-primary btn-block" type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Salvar rascunho do evento'}</button>
        </form>
        <aside className="organizer-preview">
          <div className="card"><h3>Prévia do banner</h3><img src={banner} alt="Prévia do banner do evento" /><p>O banner aparecerá na página pública do evento e nos cards de divulgação.</p></div>
          <div className="card"><h3>Eventos criados</h3>{organizerEvents.length ? organizerEvents.map(event => <article className="organizer-event-item" key={event.id}><img src={assetUrl(event.banner || 'assets/bg-index.jpg')} alt={event.name} /><div><strong>{event.name}</strong><span>{dateShortBR(event.date)} • {event.city || 'Cidade não informada'} • {event.distanceKm || '0'}K</span><small>{event.registrationMode === 'external' ? 'Inscrição externa' : 'Inscrição nativa'} • {(event.paymentMethods || []).join(', ') || 'Pagamento não definido'}</small></div></article>) : <div className="empty">Nenhum rascunho criado ainda.</div>}</div>
        </aside>
      </div>
    </section>
  );
}

function OrganizerPage({ organizer, setOrganizer, organizerEvents, setOrganizerEvents, toast }) {
  const [authMode, setAuthMode] = useState('login');
  const [sending, setSending] = useState(false);
  const [authNotice, setAuthNotice] = useState('');
  const submitLogin = async (e) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const login = String(form.get('login') || '').trim();
    const password = String(form.get('password') || '');
    setSending(true);
    setAuthNotice('');
    try {
      const data = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ login, password, audience: 'organizer' })
      });
      setOrganizer(data.user);
      toast(data.user.role === 'admin' ? 'Login do admin realizado.' : 'Login do organizador realizado.');
      setTimeout(() => { window.location.href = 'admin.html'; }, 450);
    } catch (error) {
      if (error.code === 'email_unverified' || error.code === 'approval_pending') setAuthNotice(error.message);
      toast(error.message);
    } finally {
      setSending(false);
    }
  };
  const submitSignup = async (e) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setSending(true);
    try {
      const data = await apiRequest('/api/organizer-requests', {
        method: 'POST',
        body: JSON.stringify({
          company: String(form.get('company') || '').trim(),
          name: String(form.get('name') || '').trim(),
          email: String(form.get('email') || '').trim(),
          password: String(form.get('password') || '')
        })
      });
      e.currentTarget.reset();
      setAuthNotice(data.message);
      toast('Cadastro recebido. Confirme seu e-mail.');
    } catch (error) {
      toast(error.message);
    } finally {
      setSending(false);
    }
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
              {authNotice && <div className="auth-alert"><strong>Situação da conta</strong><p>{authNotice}</p></div>}
              {authMode === 'login' ? <form onSubmit={submitLogin}><h2>Login do organizador</h2><div className="field"><label>Login ou e-mail</label><input className="input" name="login" type="text" placeholder="Admin ou organizador@email.com" autoComplete="username" required /></div><div className="field"><label>Senha</label><input className="input" name="password" type="password" maxLength="128" placeholder="••••••••••••" autoComplete="current-password" required /></div><button className="btn btn-primary btn-block" type="submit" disabled={sending}>{sending ? 'Entrando...' : 'Entrar no painel'}</button></form> : <form onSubmit={submitSignup}><h2>Solicitar conta de organizador</h2><div className="field"><label>Nome da empresa</label><input className="input" name="company" maxLength="180" placeholder="Nome da organização" required /></div><div className="field"><label>Responsável</label><input className="input" name="name" maxLength="160" placeholder="Seu nome" required /></div><div className="field"><label>E-mail</label><input className="input" name="email" type="email" maxLength="254" placeholder="organizador@email.com" required /></div><div className="field"><label>Senha</label><input className="input" name="password" type="password" minLength="12" maxLength="128" placeholder="••••••••••••" autoComplete="new-password" required /></div><button className="btn btn-primary btn-block" type="submit" disabled={sending}>{sending ? 'Enviando...' : 'Enviar pedido'}</button></form>}
            </div>
          )}
        </div>
      </section>
      {organizer ? <OrganizerCreateSection organizer={organizer} organizerEvents={organizerEvents} setOrganizerEvents={setOrganizerEvents} toast={toast} /> : <OrganizerInfoSections />}
    </main>
  );
}

function AdminPage({ organizer, setOrganizer, organizerEvents, setOrganizerEvents, adminMetrics, adminRegistrations, adminFinance, organizerRequests, setOrganizerRequests, authLoading, toast }) {
  const page = currentPage();
  const activeEvents = Number(adminMetrics?.active_events || 0);
  const pastEvents = Number(adminMetrics?.past_events || 0);
  const totalRevenue = Number(adminMetrics?.total_revenue || 0);
  const adminPages = {
    'admin.html': ['dashboard', 'Dashboard', 'Visão geral de eventos, inscritos, receita e capacidade.'],
    'admin-eventos.html': ['eventos', 'Eventos', 'Gerencie eventos cadastrados e abra as páginas públicas.'],
    'admin-inscritos.html': ['inscritos', 'Inscritos', 'Acompanhe inscrições recentes e exporte a lista em CSV.'],
    'admin-financeiro.html': ['financeiro', 'Financeiro', 'Resumo financeiro demonstrativo das inscrições.'],
    'admin-configuracoes.html': ['config', 'Configurações', 'Dados do organizador e integrações do painel.']
  };
  const [active, title, description] = adminPages[page] || adminPages['admin.html'];
  if (authLoading) {
    return <main className="container page"><section className="card access-denied"><h2>Validando acesso</h2><p>Aguarde um instante.</p></section></main>;
  }
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
  const regs = adminRegistrations || [];
  const exportCSV = () => {
    const rows = [['numero', 'atleta', 'email', 'evento', 'percurso', 'camisa', 'valor', 'status']].concat(regs.map(reg => [reg.registration_number, reg.athlete_name, reg.athlete_email, reg.event_title, reg.route_name, reg.shirt_size, reg.amount, reg.status]));
    const csv = rows.map(row => row.map(csvCell).join(',')).join('\n');
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
  const logout = async () => {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
    } finally {
      setOrganizer(null);
      toast('Você saiu do painel administrativo.');
      setTimeout(() => { window.location.href = 'organizador.html'; }, 450);
    }
  };
  const approveRequest = async (requestId) => {
    if (!isBaseAdmin) return toast('Apenas o admin base pode aprovar organizadores.');
    try {
      await apiRequest('/api/organizer-requests/approve', {
        method: 'POST',
        body: JSON.stringify({ requestId })
      });
      setOrganizerRequests(items => items.map(item => item.id === requestId ? { ...item, status: 'approved', reviewed_at: new Date().toISOString() } : item));
      toast('Organizador aprovado.');
    } catch (error) {
      toast(error.message);
    }
  };
  const updateEventStatus = async (event, status) => {
    try {
      const data = await apiRequest(`/api/organizer/events/${event.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
      setOrganizerEvents(items => items.map(item => item.id === event.id ? normalizeOrganizerEvent(data.event) : item));
      toast(data.message);
    } catch (error) {
      toast(error.message);
    }
  };
  const content = {
    dashboard: <>
      <div className="admin-cards" id="dashboard">
        <div className="kpi"><span>Eventos ativos</span><strong>{activeEvents}</strong></div>
        <div className="kpi"><span>Eventos passados</span><strong>{pastEvents}</strong></div>
        <div className="kpi"><span>Rendimento total</span><strong>{money(totalRevenue)}</strong></div>
        <div className="kpi"><span>Inscrições</span><strong>{Number(adminMetrics?.registrations || 0)}</strong></div>
      </div>
      <section className="card"><h3>Atalhos rápidos</h3><div className="stat-grid"><a className="stat" href="admin-eventos.html"><strong>Eventos</strong><span>ver calendário</span></a><a className="stat" href="admin-inscritos.html"><strong>Inscritos</strong><span>consultar atletas</span></a><a className="stat" href="admin-financeiro.html"><strong>Financeiro</strong><span>acompanhar valores</span></a></div></section>
    </>,
    eventos: <section className="card"><h3>Eventos</h3>{organizerEvents.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>Evento</th><th>Cidade</th><th>Data</th><th>Status</th><th>Ações</th></tr></thead><tbody>{organizerEvents.map(event => <tr key={event.id}><td><strong>{event.title}</strong><br /><small>{event.category || 'Corrida'}</small></td><td>{event.city}/{event.state}</td><td>{dateBR(event.event_date)}</td><td><span className={`badge ${statusClass(event.status)}`}>{event.status}</span></td><td><div className="table-actions"><button className="btn btn-outline btn-small" type="button" onClick={() => updateEventStatus(event, event.status === 'open' ? 'closed' : 'open')}>{event.status === 'open' ? 'Encerrar' : 'Publicar'}</button><button className="btn btn-dark btn-small" type="button" onClick={() => updateEventStatus(event, 'cancelled')}>Cancelar</button></div></td></tr>)}</tbody></table></div> : <div className="empty">Nenhum evento cadastrado para este organizador.</div>}</section>,
    inscritos: <section className="card"><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}><h3 style={{ margin: 0 }}>Inscritos recentes</h3><button className="btn btn-outline btn-small" type="button" onClick={exportCSV} disabled={!regs.length}>Exportar CSV</button></div>{regs.length ? <div className="table-wrap" style={{ marginTop: 12 }}><table className="data-table"><thead><tr><th>Número</th><th>Atleta</th><th>Evento</th><th>Percurso</th><th>Valor</th><th>Status</th></tr></thead><tbody>{regs.map(reg => <tr key={reg.id}><td>{reg.registration_number}</td><td><strong>{reg.athlete_name}</strong><br /><small>{reg.athlete_email}</small></td><td>{reg.event_title}</td><td>{reg.route_name || `${reg.distance_km || 0}K`}</td><td>{money(reg.amount)}</td><td><span className="badge warning">{reg.status}</span></td></tr>)}</tbody></table></div> : <div className="empty">Nenhuma inscrição encontrada.</div>}</section>,
    financeiro: <><section className="card"><h3>Resumo financeiro</h3><div className="stat-grid"><div className="stat"><strong>{money(adminFinance?.paid_amount)}</strong><span>recebido</span></div><div className="stat"><strong>{money(adminFinance?.pending_amount)}</strong><span>pendente</span></div><div className="stat"><strong>{Number(adminFinance?.paid_count || 0)}</strong><span>inscrições pagas</span></div></div></section><section className="card"><h3>Pagamentos</h3><p style={{ color: 'var(--muted)', marginTop: 0 }}>{Number(adminFinance?.pending_count || 0)} pagamento(s) pendente(s) e {Number(adminFinance?.cancelled_count || 0)} cancelado(s) ou reembolsado(s).</p></section></>,
    config: <><section className="card"><h3>Configurações</h3><div className="form-grid"><div className="field"><label>Organizador</label><input className="input" value={organizer?.company || 'ChipBelém'} readOnly /></div><div className="field"><label>E-mail de contato</label><input className="input" value={organizer?.email || 'contato@chipbelem.com.br'} readOnly /></div><div className="field full"><label>Integração Mercado Pago</label><input className="input" value="Credencial secreta configurada somente no servidor" readOnly /></div></div></section>{isBaseAdmin ? <section className="card"><h3>Pedidos de organizador</h3><p className="admin-role-note">A conta base aprova quem pode acessar o painel como organizador.</p>{pendingRequests.length ? <div className="approval-list">{pendingRequests.map(request => <article className="approval-card" key={request.id}><div><strong>{request.company}</strong><span>{request.name} - {request.email}</span><small>Pedido enviado em {formatDateTime(request.created_at)}</small></div><button className="btn btn-primary btn-small" type="button" onClick={() => approveRequest(request.id)}>Aprovar</button></article>)}</div> : <div className="empty">Nenhum pedido pendente.</div>}</section> : <section className="card"><h3>Aprovação de organizadores</h3><p className="admin-role-note">Somente a conta base pode aprovar novos organizadores.</p></section>}</>
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
  const [publicEvents, setPublicEvents] = useState(EVENTS);
  const [athlete, setAthlete] = useState(null);
  const [organizer, setOrganizer] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [registrations, setRegistrations] = useState([]);
  const [athleteDashboard, setAthleteDashboard] = useState({ registrations: [], stats: {} });
  const [organizerEvents, setOrganizerEvents] = useState([]);
  const [adminMetrics, setAdminMetrics] = useState({});
  const [adminRegistrations, setAdminRegistrations] = useState([]);
  const [adminFinance, setAdminFinance] = useState({});
  const [organizerRequests, setOrganizerRequests] = useState([]);
  const [toastMessage, setToastMessage] = useState('');
  const page = currentPage();
  useEffect(() => {
    let active = true;
    apiRequest('/api/events').then((data) => {
      if (!active) return;
      const databaseEvents = (data.events || []).map(normalizePublicEvent);
      const databaseSlugs = new Set(databaseEvents.map(event => event.slug));
      setPublicEvents([...databaseEvents, ...EVENTS.filter(event => !databaseSlugs.has(event.slug))]);
    }).catch(() => {
      if (active) setPublicEvents(EVENTS);
    });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    let active = true;
    apiRequest('/api/auth/session').then(async ({ user }) => {
      if (!active || !user) return;
      if (user.role === 'athlete') {
        setAthlete(user);
        try {
          const data = await apiRequest('/api/athlete/dashboard');
          if (active) setAthleteDashboard(data);
        } catch {
          if (active) setAthleteDashboard({ registrations: [], stats: {} });
        }
      }
      if (['organizer', 'admin'].includes(user.role)) {
        setOrganizer(user);
        try {
          const [dashboardData, eventsData, registrationsData, financeData] = await Promise.all([
            apiRequest('/api/organizer/dashboard'),
            apiRequest('/api/organizer/events'),
            apiRequest('/api/organizer/registrations'),
            apiRequest('/api/organizer/finance')
          ]);
          if (active) {
            setAdminMetrics(dashboardData.metrics || {});
            setOrganizerEvents((eventsData.events || []).map(normalizeOrganizerEvent));
            setAdminRegistrations(registrationsData.registrations || []);
            setAdminFinance(financeData.finance || {});
          }
        } catch {
          if (active) {
            setAdminMetrics({});
            setOrganizerEvents([]);
            setAdminRegistrations([]);
            setAdminFinance({});
          }
        }
      }
      if (user.role === 'admin') {
        try {
          const data = await apiRequest('/api/organizer-requests');
          if (active) setOrganizerRequests(data.requests || []);
        } catch {
          if (active) setOrganizerRequests([]);
        }
      }
    }).catch(() => {
      if (active) {
        setAthlete(null);
        setOrganizer(null);
      }
    }).finally(() => {
      if (active) setAuthLoading(false);
    });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (authLoading) return;
    if (page === 'minhas-inscricoes.html' && !athlete) {
      window.location.replace(organizer ? 'admin.html' : 'login.html?next=minhas-inscricoes.html');
    }
    if (page.startsWith('admin') && !organizer) {
      window.location.replace(athlete ? 'minhas-inscricoes.html' : 'organizador.html#organizerAccess');
    }
  }, [page, athlete, organizer, authLoading]);
  const toast = (message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(''), 2600);
  };
  const logoutAthlete = async () => {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
    } finally {
      setAthlete(null);
      toast('Você saiu da conta.');
      setTimeout(() => { window.location.href = 'index.html'; }, 450);
    }
  };
  const pageContent = useMemo(() => {
    if (page === 'index.html' || page === 'eventos.html') return <EventsPage events={publicEvents} />;
    if (page === 'evento.html') return <EventDetailPage events={publicEvents} />;
    if (page === 'inscricao.html') return <CheckoutPage athlete={athlete} events={publicEvents} registrations={registrations} setRegistrations={setRegistrations} toast={toast} />;
    if (page === 'login.html') return <AuthPage type="login" athlete={athlete} setAthlete={setAthlete} setOrganizer={setOrganizer} toast={toast} />;
    if (page === 'cadastro.html') return <AuthPage type="cadastro" athlete={athlete} setAthlete={setAthlete} setOrganizer={setOrganizer} toast={toast} />;
    if (page === 'confirmar-email.html') return <ConfirmEmailPage setAthlete={setAthlete} setOrganizer={setOrganizer} />;
    if (page === 'contato.html') return <ContactPage />;
    if (page === 'minhas-inscricoes.html') return <AthleteArea athlete={athlete} athleteDashboard={athleteDashboard} setAthlete={setAthlete} toast={toast} />;
    if (page === 'organizador.html') return <OrganizerPage organizer={organizer} setOrganizer={setOrganizer} organizerEvents={organizerEvents} setOrganizerEvents={setOrganizerEvents} toast={toast} />;
    if (page.startsWith('admin')) return <AdminPage organizer={organizer} setOrganizer={setOrganizer} organizerEvents={organizerEvents} setOrganizerEvents={setOrganizerEvents} adminMetrics={adminMetrics} adminRegistrations={adminRegistrations} adminFinance={adminFinance} organizerRequests={organizerRequests} setOrganizerRequests={setOrganizerRequests} authLoading={authLoading} toast={toast} />;
    return <EventsPage events={publicEvents} />;
  }, [page, publicEvents, athlete, organizer, authLoading, registrations, athleteDashboard, organizerEvents, adminMetrics, adminRegistrations, adminFinance, organizerRequests]);

  return (
    <Layout athlete={athlete} organizer={organizer} onAthleteLogout={logoutAthlete}>
      {pageContent}
      <Toast message={toastMessage} />
    </Layout>
  );
}

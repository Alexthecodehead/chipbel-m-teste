const money = (value) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dateBR = (date) => new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
const dateShortBR = (date) => new Date(date + 'T12:00:00').toLocaleDateString('pt-BR');
const AUTH_KEY = 'chipbelem_athlete';
const REGISTRATION_KEY = 'correja_registrations';

function statusClass(status) {
  if (status === 'open') return 'open';
  if (status === 'warning') return 'warning';
  if (status === 'info') return 'info';
  return 'closed';
}

function getEventBySlug(slug) {
  return EVENTS.find(event => event.slug === slug) || EVENTS[0];
}

function currentPage() {
  const page = location.pathname.split('/').pop() || 'index.html';
  return page === '' ? 'index.html' : page;
}

function initials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map(part => part[0] || '').join('').toUpperCase() || 'AT';
}

function distanceKm(distance = '') {
  const value = parseInt(distance, 10);
  return Number.isFinite(value) ? value : 0;
}

function getAthlete() {
  try { return JSON.parse(localStorage.getItem(AUTH_KEY) || 'null'); }
  catch { return null; }
}

function saveAthlete(athlete) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(athlete));
}

function logoutAthlete() {
  localStorage.removeItem(AUTH_KEY);
  showToast('Você saiu da conta.');
  setTimeout(() => location.href = 'index.html', 450);
}

function buildLayout() {
  const header = document.querySelector('#site-header');
  const footer = document.querySelector('#site-footer');
  const page = currentPage();
  const athlete = getAthlete();

  if (header) {
    header.innerHTML = `
      <div class="topbar">
        <div class="container nav">
          <a class="logo" href="index.html" aria-label="ChipBelem"><img src="assets/logo_chip.png" alt="ChipBelem"></a>
          <nav class="nav-links" id="navLinks">
            <a href="index.html" class="${page === 'index.html' ? 'active' : ''}">Início</a>
            <a href="eventos.html" class="${page === 'eventos.html' || page === 'evento.html' ? 'active' : ''}">Eventos</a>
            <a href="minhas-inscricoes.html" class="${page === 'minhas-inscricoes.html' ? 'active' : ''}">Área do atleta</a>
          </nav>
          <div class="nav-actions">
            ${athlete ? `
              <a class="nav-account-link" href="eventos.html">Corridas</a>
              <a class="nav-account-link" href="minhas-inscricoes.html#perfil">Perfil</a>
              <a class="nav-account-link" href="minhas-inscricoes.html#performance">Performance</a>
              <button class="nav-account-link nav-logout" type="button" id="logoutBtn">Sair</button>
            ` : `
              <a class="btn btn-outline btn-small" href="login.html">Entrar</a>
              <a class="btn btn-primary btn-small" href="eventos.html">Inscrever-se</a>
            `}
            <button class="mobile-toggle" type="button" id="mobileToggle" aria-label="Abrir menu">☰</button>
          </div>
        </div>
      </div>`;
  }

  if (footer) {
    footer.innerHTML = `
      <footer class="footer">
        <div class="container footer-grid">
          <div>
            <img src="assets/logo_chip.png" alt="ChipBelem">
            <p>Feito por Alexandre Durães.</p>
          </div>
        </div>
      </footer>`;
  }

  document.querySelector('#mobileToggle')?.addEventListener('click', () => {
    document.querySelector('#navLinks')?.classList.toggle('open');
  });
  document.querySelector('#logoutBtn')?.addEventListener('click', logoutAthlete);
}

function eventCard(event) {
  return `
    <article class="event-card">
      <a class="event-media" href="evento.html?evento=${event.slug}" aria-label="Ver detalhes de ${event.title}">
        <img src="${event.image}" alt="${event.title}">
      </a>
      <div class="event-body">
        <h3 class="event-title"><a href="evento.html?evento=${event.slug}">${event.title}</a></h3>
        <div class="event-meta">
          <span>${dateShortBR(event.date)} - ${event.time}</span>
          <span>${event.city} - ${event.state}</span>
        </div>
        <div class="event-footer">
          <a class="event-cta ${statusClass(event.status)}" href="evento.html?evento=${event.slug}">
            <span aria-hidden="true">◇</span>
            ${event.badge}
          </a>
        </div>
      </div>
    </article>`;
}

function renderHome() {
  const featured = EVENTS[0];
  const hero = document.querySelector('#homeHero');
  const list = document.querySelector('#homeEvents');
  const metrics = document.querySelector('#homeMetrics');

  if (hero) {
    hero.innerHTML = `
      <section class="hero">
        <div class="container hero-grid">
          <div>
            <span class="eyebrow">corridas</span>
            <h1>Inscrições esportivas de forma simples e rápida</h1>
            <p>Um sistema completo para divulgar eventos, receber inscrições e organizar a experiência dos atletas.</p>
            <div class="hero-actions">
              <a class="btn btn-primary" href="eventos.html">Ver eventos</a>
              <a class="btn btn-outline" href="cadastro.html">Criar conta</a>
            </div>
          </div>
          <article class="hero-card">
            <img src="${featured.image}" alt="${featured.title}">
            <div class="hero-card-body">
              <div class="hero-card-title">
                <h3>${featured.title}</h3>
                <span class="badge ${statusClass(featured.status)}">${featured.badge}</span>
              </div>
              <p>${featured.location} • ${dateBR(featured.date)} às ${featured.time}</p>
              <div class="hero-metrics">
                <div class="metric"><strong>${featured.distances.length}</strong><span>percursos</span></div>
                <div class="metric"><strong>${money(featured.prices[0].price)}</strong><span>valor único</span></div>
              </div>
            </div>
          </article>
        </div>
      </section>`;
  }

  if (metrics) {
    metrics.innerHTML = `
      <div class="container">
        <div class="steps">
          <div class="step"><div class="step-number">1</div><h3>Escolha o evento</h3><p>O atleta navega pelos eventos e consulta data, percurso, valores e regulamento.</p></div>
          <div class="step"><div class="step-number">2</div><h3>Preencha a inscrição</h3><p>Formulário com dados pessoais, categoria, percurso e tamanho da camisa.</p></div>
          <div class="step"><div class="step-number">3</div><h3>Confirme o pagamento</h3><p>Após a inscrição, você será direcionado para pagamento via Mercado Pago.</p></div>
          <div class="step"><div class="step-number">4</div><h3>Acompanhe tudo</h3><p>Depois da confirmação, o atleta pode consultar suas inscrições e dados do evento.</p></div>
        </div>
      </div>`;
  }

  if (list) {
    list.innerHTML = EVENTS.slice(0, 3).map(eventCard).join('');
  }
}

function renderFilters() {
  const stateSelect = document.querySelector('#stateFilter');
  const citySelect = document.querySelector('#cityFilter');
  const searchInput = document.querySelector('#searchFilter');
  const clearButton = document.querySelector('#clearFilters');

  if (!stateSelect || !citySelect || !searchInput) return;

  stateSelect.innerHTML = '<option value="">Todos os estados</option>' + [...new Set(EVENTS.map(e => e.state))].map(state => `<option>${state}</option>`).join('');
  citySelect.innerHTML = '<option value="">Todas as cidades</option>' + [...new Set(EVENTS.map(e => e.city))].map(city => `<option>${city}</option>`).join('');

  const apply = () => {
    const query = searchInput.value.trim().toLowerCase();
    const state = stateSelect.value;
    const city = citySelect.value;
    const filtered = EVENTS.filter(event => {
      return (!query || `${event.title} ${event.city} ${event.category}`.toLowerCase().includes(query)) &&
        (!state || event.state === state) && (!city || event.city === city);
    });
    const list = document.querySelector('#eventsList');
    const count = document.querySelector('#eventsCount');
    if (count) count.textContent = `${filtered.length} evento(s) encontrado(s)`;
    if (list) list.innerHTML = filtered.length ? filtered.map(eventCard).join('') : '<div class="empty">Nenhum evento encontrado com esses filtros.</div>';
  };

  [stateSelect, citySelect, searchInput].forEach(element => element.addEventListener('input', apply));
  clearButton?.addEventListener('click', () => {
    stateSelect.value = '';
    citySelect.value = '';
    searchInput.value = '';
    apply();
  });
  apply();
}

function renderEventPage() {
  const root = document.querySelector('#eventDetail');
  if (!root) return;
  const params = new URLSearchParams(location.search);
  const event = getEventBySlug(params.get('evento'));
  const minPrice = Math.min(...event.prices.map(item => item.price));

  root.innerHTML = `
    <div class="container page">
      <div class="breadcrumb"><a href="eventos.html">Eventos</a> / ${event.title}</div>
      <article class="detail-hero">
        <img src="${event.image}" alt="${event.title}">
        <div class="detail-content">
          <div>
            <span class="badge ${statusClass(event.status)}">${event.badge}</span>
            <h1 class="detail-title">${event.title}</h1>
            <p class="detail-summary">${event.summary}</p>
            <div class="info-grid">
              <div class="info-card"><span>Data</span><strong>${dateBR(event.date)} às ${event.time}</strong></div>
              <div class="info-card"><span>Local</span><strong>${event.location}</strong></div>
              <div class="info-card"><span>Distâncias</span><strong>${event.distances.join(' / ')}</strong></div>
              <div class="info-card"><span>Organizador</span><strong>${event.organizer}</strong></div>
            </div>
            <p>${event.description}</p>
          </div>
          <aside class="sidebar-card">
            <h3>Inscrição</h3>
            <p style="color:var(--muted);margin-top:0;">Valor único para inscrição neste evento.</p>
            <div class="price-list">
              ${event.prices.map(price => `<div class="price-row"><span><strong>${price.label}</strong><br><small>${price.until}</small></span><strong>${money(price.price)}</strong></div>`).join('')}
            </div>
            <a class="btn btn-primary btn-block" href="inscricao.html?evento=${event.slug}">Inscrever-se agora</a>
            <a class="btn btn-outline btn-block" style="margin-top:10px;" href="#regulamento">Ver regulamento</a>
          </aside>
        </div>
      </article>

      <div class="tabs" role="tablist">
        <button class="tab-button active" type="button" data-tab="info">Informações</button>
        <button class="tab-button" type="button" data-tab="percursos">Percursos</button>
        <button class="tab-button" type="button" data-tab="kit">Kit atleta</button>
        <button class="tab-button" type="button" data-tab="regulamento">Regulamento</button>
      </div>
      <div class="tab-panel" id="tabPanel"></div>
    </div>`;

  const panel = document.querySelector('#tabPanel');
  const content = {
    info: `<h3>Informações gerais</h3><p>${event.description}</p><p><strong>Endereço:</strong> ${event.address}</p><p><strong>Contato:</strong> ${event.contact}</p>`,
    percursos: `<h3>Percursos e categorias</h3><table class="route-table"><thead><tr><th>Distância</th><th>Largada</th><th>Limite</th><th>Categoria</th></tr></thead><tbody>${event.routes.map(route => `<tr><td>${route.distance}</td><td>${route.start}</td><td>${route.limit}</td><td>${route.category}</td></tr>`).join('')}</tbody></table>`,
    kit: `<h3>Kit atleta</h3><ul>${event.kit.map(item => `<li>${item}</li>`).join('')}</ul><p>A retirada do kit será divulgada pela organização do evento.</p>`,
    regulamento: `<h3 id="regulamento">Regulamento demonstrativo</h3><ul>${event.rules.map(rule => `<li>${rule}</li>`).join('')}</ul><p>Este site é apenas demonstrativo. As regras acima são fictícias e devem ser substituídas pelo regulamento oficial do organizador.</p>`
  };

  function selectTab(tab) {
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));
    panel.innerHTML = content[tab];
  }

  document.querySelectorAll('.tab-button').forEach(button => button.addEventListener('click', () => selectTab(button.dataset.tab)));
  selectTab('info');
}

function getRegistrations() {
  try { return JSON.parse(localStorage.getItem(REGISTRATION_KEY) || '[]'); }
  catch { return []; }
}

function saveRegistration(registration) {
  const items = getRegistrations();
  items.unshift(registration);
  localStorage.setItem(REGISTRATION_KEY, JSON.stringify(items));
}

function renderCheckout() {
  const root = document.querySelector('#checkoutRoot');
  if (!root) return;
  const params = new URLSearchParams(location.search);
  const event = getEventBySlug(params.get('evento'));
  const basePrice = event.prices[0].price;
  const athlete = getAthlete();

  root.innerHTML = `
    <div class="container page">
      <div class="breadcrumb"><a href="eventos.html">Eventos</a> / <a href="evento.html?evento=${event.slug}">${event.title}</a> / Inscrição</div>
      <div class="section-head" style="margin-top:0;"><div><h2>Inscrição em ${event.title}</h2><p>Preencha seus dados. Ao confirmar, você seguirá para o pagamento pelo Mercado Pago.</p></div></div>
      <div class="form-layout">
        <form class="card" id="registrationForm">
          <h3>Dados do atleta</h3>
          <div class="form-grid">
            <div class="field full"><label>Nome completo</label><input class="input" name="name" required placeholder="Ex: Maria Silva" value="${athlete?.name || ''}"></div>
            <div class="field"><label>CPF</label><input class="input" name="cpf" required placeholder="000.000.000-00"></div>
            <div class="field"><label>Data de nascimento</label><input class="input" name="birth" required type="date"></div>
            <div class="field"><label>E-mail</label><input class="input" name="email" required type="email" placeholder="voce@email.com" value="${athlete?.email || ''}"></div>
            <div class="field"><label>Telefone</label><input class="input" name="phone" required placeholder="(91) 99999-0000" value="${athlete?.phone || ''}"></div>
            <div class="field"><label>Sexo</label><select class="select" name="gender" required><option value="">Selecione</option><option>Feminino</option><option>Masculino</option><option>Outro</option></select></div>
            <div class="field"><label>Equipe / assessoria</label><input class="input" name="team" placeholder="Opcional"></div>
            <div class="field"><label>Percurso</label><select class="select" name="distance" id="distanceSelect" required>${event.distances.map(distance => `<option>${distance}</option>`).join('')}</select></div>
            <div class="field"><label>Camisa</label><select class="select" name="shirt" required>${SHIRT_SIZES.map(size => `<option>${size}</option>`).join('')}</select></div>
            <div class="field full"><label>Contato de emergência</label><input class="input" name="emergency" placeholder="Nome e telefone"></div>
          </div>
          <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:18px;">
            <button class="btn btn-primary" type="submit">Confirmar inscrição e pagar</button>
            <a class="btn btn-outline" href="evento.html?evento=${event.slug}">Voltar ao evento</a>
          </div>
          <div class="success-box" id="successBox">Inscrição criada com sucesso! Próxima etapa: pagamento via Mercado Pago.</div>
        </form>
        <aside class="card order-summary">
          <h3>Resumo</h3>
          <img src="${event.image}" alt="${event.title}" style="border-radius:18px;margin-bottom:14px;">
          <div class="summary-line"><span>Evento</span><strong>${event.title}</strong></div>
          <div class="summary-line"><span>Data</span><strong>${dateBR(event.date)}</strong></div>
          <div class="summary-line"><span>Inscrição</span><strong>${money(basePrice)}</strong></div>
          <div class="summary-line total"><span>Total</span><strong>${money(basePrice)}</strong></div>
          <p style="color:var(--muted);font-size:14px;">O pagamento será realizado com segurança pelo Mercado Pago após a confirmação da inscrição.</p>
        </aside>
      </div>
    </div>`;

  document.querySelector('#registrationForm').addEventListener('submit', (eventSubmit) => {
    eventSubmit.preventDefault();
    const form = new FormData(eventSubmit.currentTarget);
    const id = 'CJ' + Math.floor(100000 + Math.random() * 900000);
    const registration = {
      id,
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
    saveRegistration(registration);
    if (!getAthlete()) {
      saveAthlete({
        name: form.get('name'),
        email: form.get('email'),
        phone: form.get('phone'),
        city: DEMO_USER.city
      });
    }
    document.querySelector('#successBox').classList.add('show');
    showToast('Inscrição criada. Redirecionando para o Mercado Pago...');
    eventSubmit.currentTarget.reset();
  });
}

function seedIfEmpty() {
  if (getRegistrations().length) return;
  const athlete = getAthlete() || DEMO_USER;
  saveRegistration({
    id: 'CJ204891',
    eventId: EVENTS[0].id,
    eventSlug: EVENTS[0].slug,
    eventTitle: EVENTS[0].title,
    eventDate: EVENTS[0].date,
    name: athlete.name,
    cpf: '000.000.000-00',
    email: athlete.email,
    phone: athlete.phone,
    gender: 'Masculino',
    team: 'Equipe Demo',
    distance: '10K',
    shirt: 'G',
    amount: EVENTS[0].prices[0].price,
    status: 'Aguardando pagamento',
    createdAt: new Date().toISOString()
  });
}

function renderAthleteArea() {
  const root = document.querySelector('#athleteRoot');
  if (!root) return;
  const athlete = getAthlete();
  if (!athlete) {
    root.innerHTML = `
      <div class="container page">
        <div class="section-head" style="margin-top:0;"><div><h2>Área do atleta</h2><p>Entre ou crie seu cadastro para acompanhar suas corridas.</p></div></div>
        <div class="card empty-state-card">
          <h3>Acesse seu perfil de atleta</h3>
          <p>Depois do login, esta página mostra suas inscrições, dados do perfil, performance e sugestões de novas corridas.</p>
          <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-top:14px;">
            <a class="btn btn-primary" href="login.html">Entrar</a>
            <a class="btn btn-outline" href="cadastro.html">Criar cadastro</a>
          </div>
        </div>
        <section class="athlete-suggestions">
          <div class="section-head compact"><div><h2>Corridas em destaque</h2><p>Conheça alguns eventos disponíveis.</p></div><a class="btn btn-outline btn-small" href="eventos.html">Ver todas</a></div>
          <div class="event-grid athlete-event-grid">${EVENTS.slice(0, 4).map(eventCard).join('')}</div>
        </section>
      </div>`;
    return;
  }
  const registrations = getRegistrations().filter(reg => reg.email === athlete.email);
  const totalKm = registrations.reduce((sum, reg) => sum + distanceKm(reg.distance), 0);
  const registeredSlugs = new Set(registrations.map(reg => reg.eventSlug));
  const suggestions = EVENTS.filter(event => !registeredSlugs.has(event.slug)).slice(0, 4);

  root.innerHTML = `
    <div class="container page">
      <div class="section-head" style="margin-top:0;"><div><h2>Área do atleta</h2><p>Suas corridas cadastradas, perfil e sugestões de novos desafios.</p></div><a class="btn btn-primary" href="eventos.html">Nova inscrição</a></div>
      <div class="dashboard-grid">
        <aside class="card profile-card" id="perfil">
          <div class="avatar">${initials(athlete.name)}</div>
          <h3>${athlete.name}</h3>
          <p>${athlete.email}<br>${athlete.city || DEMO_USER.city}</p>
          <a class="btn btn-outline btn-block" href="cadastro.html">Editar perfil</a>
        </aside>
        <main>
          <div class="stat-grid" id="performance">
            <div class="stat"><strong>${registrations.length}</strong><span>inscrições</span></div>
            <div class="stat"><strong>${totalKm || 0}K</strong><span>km previstos</span></div>
          </div>
          <div class="card">
            <h3>Minhas corridas</h3>
            ${registrations.length ? registrations.map(reg => `
              <div class="ticket">
                <div>
                  <span class="badge warning">${reg.status}</span>
                  <h3>${reg.eventTitle}</h3>
                  <p>${dateBR(reg.eventDate)} • ${reg.distance} • ${reg.shirt} • Nº ${reg.id}</p>
                  <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;">
                    <a class="btn btn-outline btn-small" href="evento.html?evento=${reg.eventSlug}">Ver evento</a>
                    <button class="btn btn-dark btn-small" type="button" onclick="showToast('Comprovante da inscrição: ${reg.id}')">Comprovante</button>
                  </div>
                </div>
                <div class="qr" title="QR Code demonstrativo"></div>
              </div>`).join('') : '<div class="empty">Você ainda não possui inscrições.</div>'}
          </div>
          <section class="athlete-suggestions">
            <div class="section-head compact"><div><h2>Corridas em destaque</h2><p>Sugestões para sua próxima inscrição.</p></div><a class="btn btn-outline btn-small" href="eventos.html">Ver todas</a></div>
            <div class="event-grid athlete-event-grid">${suggestions.map(eventCard).join('')}</div>
          </section>
        </main>
      </div>
    </div>`;
}

function renderAuth(type) {
  const root = document.querySelector('#authRoot');
  if (!root) return;
  const isLogin = type === 'login';
  const athlete = getAthlete();
  root.innerHTML = `
    <div class="container auth-wrap">
      <form class="auth-card" id="authForm">
        <h1>${isLogin ? 'Entrar' : 'Criar conta'}</h1>
        <p>${isLogin ? 'Acesse a área do atleta e acompanhe suas inscrições.' : 'Crie seu cadastro para participar dos eventos.'}</p>
        <div class="form-grid">
          ${!isLogin ? `<div class="field full"><label>Nome completo</label><input class="input" name="name" required placeholder="Seu nome" value="${athlete?.name || ''}"></div>` : ''}
          <div class="field full"><label>E-mail</label><input class="input" name="email" required type="email" placeholder="voce@email.com" value="${athlete?.email || ''}"></div>
          ${!isLogin ? `<div class="field full"><label>Telefone</label><input class="input" name="phone" required placeholder="(91) 99999-0000" value="${athlete?.phone || ''}"></div><div class="field full"><label>Cidade/UF</label><input class="input" name="city" required placeholder="Belém/PA" value="${athlete?.city || DEMO_USER.city}"></div>` : ''}
          <div class="field full"><label>Senha</label><input class="input" name="password" required type="password" placeholder="••••••••"></div>
        </div>
        <button class="btn btn-primary btn-block" type="submit" style="margin-top:16px;">${isLogin ? 'Entrar' : athlete ? 'Salvar perfil' : 'Cadastrar atleta'}</button>
        <div class="auth-links">
          ${isLogin ? '<a href="cadastro.html">Criar uma conta</a><a href="#">Esqueci minha senha</a>' : '<a href="login.html">Já tenho conta</a><a href="eventos.html">Ver eventos</a>'}
        </div>
      </form>
    </div>`;
  document.querySelector('#authForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const currentAthlete = getAthlete();
    const nextAthlete = isLogin ? {
      ...(currentAthlete || DEMO_USER),
      email: form.get('email')
    } : {
      name: form.get('name'),
      email: form.get('email'),
      phone: form.get('phone'),
      city: form.get('city')
    };
    saveAthlete(nextAthlete);
    showToast(isLogin ? 'Login realizado.' : 'Cadastro de atleta salvo.');
    setTimeout(() => location.href = 'minhas-inscricoes.html', 500);
  });
}

function renderAdmin() {
  const root = document.querySelector('#adminRoot');
  if (!root) return;
  seedIfEmpty();
  const regs = getRegistrations();
  const revenue = regs.reduce((sum, reg) => sum + Number(reg.amount || 0), 0);
  const totalSlots = 4200;
  const usedSlots = 1848 + regs.length;

  root.innerHTML = `
    <div class="container page">
      <div class="section-head" style="margin-top:0;"><div><h2>Painel administrativo</h2><p>Dashboard para gerenciar eventos, inscritos e indicadores.</p></div><button class="btn btn-primary" type="button" id="newEventBtn">Novo evento</button></div>
      <div class="admin-layout">
        <aside class="admin-menu">
          <a class="active" href="#dashboard">📊 Dashboard</a>
          <a href="#eventos">🏁 Eventos</a>
          <a href="#inscritos">👥 Inscritos</a>
          <a href="#financeiro">💳 Financeiro</a>
          <a href="#config">⚙️ Configurações</a>
        </aside>
        <main class="admin-content">
          <div class="admin-cards" id="dashboard">
            <div class="kpi"><span>Eventos cadastrados</span><strong>${EVENTS.length}</strong></div>
            <div class="kpi"><span>Inscrições</span><strong>${usedSlots}</strong></div>
            <div class="kpi"><span>Receita simulada</span><strong>${money(142380 + revenue)}</strong></div>
            <div class="kpi"><span>Vagas totais</span><strong>${totalSlots}</strong></div>
          </div>

          <section class="card" id="eventos">
            <h3>Eventos</h3>
            <div class="table-wrap">
              <table class="data-table">
                <thead><tr><th>Evento</th><th>Cidade</th><th>Data</th><th>Status</th><th>Ações</th></tr></thead>
                <tbody>${EVENTS.map(event => `<tr><td><strong>${event.title}</strong><br><small>${event.category}</small></td><td>${event.city}/${event.state}</td><td>${dateBR(event.date)}</td><td><span class="badge ${statusClass(event.status)}">${event.badge}</span></td><td><a class="btn btn-outline btn-small" href="evento.html?evento=${event.slug}">Abrir</a></td></tr>`).join('')}</tbody>
              </table>
            </div>
          </section>

          <section class="card" id="inscritos">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;"><h3 style="margin:0;">Inscritos recentes</h3><button class="btn btn-outline btn-small" type="button" id="exportBtn">Exportar CSV</button></div>
            <div class="table-wrap" style="margin-top:12px;">
              <table class="data-table">
                <thead><tr><th>Número</th><th>Atleta</th><th>Evento</th><th>Percurso</th><th>Valor</th><th>Status</th></tr></thead>
                <tbody>${regs.map(reg => `<tr><td>${reg.id}</td><td><strong>${reg.name}</strong><br><small>${reg.email}</small></td><td>${reg.eventTitle}</td><td>${reg.distance}</td><td>${money(Number(reg.amount || 0))}</td><td><span class="badge warning">${reg.status}</span></td></tr>`).join('')}</tbody>
              </table>
            </div>
          </section>

          <section class="card" id="financeiro">
            <h3>Resumo financeiro</h3>
            <div class="stat-grid">
              <div class="stat"><strong>${money(revenue)}</strong><span>valor em inscrições</span></div>
              <div class="stat"><strong>${regs.length}</strong><span>pagamentos pendentes</span></div>
              <div class="stat"><strong>${money(regs.length ? revenue / regs.length : 0)}</strong><span>ticket médio</span></div>
            </div>
          </section>
        </main>
      </div>
    </div>`;

  document.querySelector('#newEventBtn')?.addEventListener('click', () => showToast('Tela de cadastro de evento prevista para a próxima versão.'));
  document.querySelector('#exportBtn')?.addEventListener('click', exportCSV);
}

function exportCSV() {
  const regs = getRegistrations();
  const rows = [['numero','atleta','email','evento','percurso','camisa','valor','status']].concat(
    regs.map(reg => [reg.id, reg.name, reg.email, reg.eventTitle, reg.distance, reg.shirt, reg.amount, reg.status])
  );
  const csv = rows.map(row => row.map(value => `"${String(value ?? '').replaceAll('"','""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'inscritos-chipbelem.csv';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast('CSV gerado.');
}

function showToast(message) {
  let toast = document.querySelector('#toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2600);
}

function renderFeatureBand() {
  const root = document.querySelector('#featureBand');
  if (!root) return;
  root.innerHTML = `
    <div class="container">
      <section class="feature-band">
        <div>
          <h2>Feito para atletas e organizadores.</h2>
          <p>Este modelo já vem com os blocos mais importantes de uma plataforma de inscrições esportivas.</p>
          <div class="feature-list">
            <div class="feature-item"><span>✓</span><div><strong>Eventos com filtros</strong><br>Busca por cidade, estado e nome do evento.</div></div>
            <div class="feature-item"><span>✓</span><div><strong>Inscrição com pagamento</strong><br>Fluxo preparado para pagamento via Mercado Pago.</div></div>
            <div class="feature-item"><span>✓</span><div><strong>Área do atleta</strong><br>Consulta rápida de inscrições, status e dados do participante.</div></div>
          </div>
        </div>
        <div class="admin-preview">
          <div class="admin-preview-card">
            <div class="admin-row"><strong>2ª Corrida do Sagrado</strong><span>Inscrições abertas</span></div>
            <div class="admin-row"><strong>Corrida Do Sol</strong><span>05 julho</span></div>
            <div class="admin-row"><strong>17ª Corrida Do Sal</strong><span>25 julho</span></div>
            <div class="admin-row"><strong>Calendário</strong><span>11 eventos</span></div>
          </div>
        </div>
      </section>
    </div>`;
}

function init() {
  buildLayout();
  renderHome();
  renderFeatureBand();
  renderFilters();
  renderEventPage();
  renderCheckout();
  renderAthleteArea();
  renderAdmin();
  if (document.body.dataset.page === 'login') renderAuth('login');
  if (document.body.dataset.page === 'cadastro') renderAuth('cadastro');
}

document.addEventListener('DOMContentLoaded', init);

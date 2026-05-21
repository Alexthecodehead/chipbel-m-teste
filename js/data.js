const EVENTS = [
  {
    id: 'evt-001',
    slug: 'segunda-corrida-do-sagrado',
    title: '2ª Corrida do Sagrado',
    city: 'Belém',
    state: 'PA',
    date: '2026-06-28',
    time: '06:00',
    location: 'Belém/PA',
    address: 'Local de largada informado pela organização',
    status: 'open',
    badge: 'Inscrições abertas',
    image: 'assets/2ª Corrida do Sagrado.png',
    category: 'Corrida e caminhada',
    summary: 'Evento com clima de fé, comunidade e esporte, reunindo corredores e caminhantes em Belém.',
    description: 'A 2ª Corrida do Sagrado oferece uma experiência organizada para atletas e participantes de caminhada, com kit, hidratação, chip de cronometragem e medalha de participação.',
    distances: ['Corrida', 'Caminhada'],
    prices: [
      { label: 'Inscrição única', price: 135, until: 'valor único' }
    ],
    routes: [
      { distance: 'Corrida', start: '06:00', limit: '800 atletas', category: 'Geral e PCD' },
      { distance: 'Caminhada', start: '06:00', limit: '400 participantes', category: 'Participação' }
    ],
    kit: ['Camisa oficial', 'Número de peito', 'Chip de cronometragem', 'Medalha de participação', 'Hidratação'],
    rules: ['Documento com foto obrigatório na retirada do kit.', 'Inscrição pessoal e intransferível.', 'Chegue com antecedência para organização da largada.'],
    organizer: 'ChipBelém',
    contact: 'contato@chipbelem.com.br'
  },
  {
    id: 'evt-002',
    slug: 'segunda-corrida-do-graesp',
    title: '2ª Corrida do Graesp',
    city: 'Belém',
    state: 'PA',
    date: '2026-08-15',
    time: '05:45',
    location: 'Belém/PA',
    address: 'Local de largada informado pela organização',
    status: 'open',
    badge: 'Inscrições abertas',
    image: 'assets/2ªCorrida Do Graesp.png',
    category: 'Corrida de rua',
    summary: 'Edição avião da Corrida do Graesp, com percursos de 5K e 10K.',
    description: 'A 2ª Corrida do Graesp reúne atletas em uma prova temática, com kit oficial, medalha e estrutura de apoio para os percursos de 5K e 10K.',
    distances: ['5K', '10K'],
    prices: [
      { label: 'Inscrição única', price: 135, until: 'valor único' }
    ],
    routes: [
      { distance: '5K', start: '05:45', limit: '700 atletas', category: 'Geral e PCD' },
      { distance: '10K', start: '05:45', limit: '500 atletas', category: 'Geral e por faixa etária' }
    ],
    kit: ['Camisa oficial', 'Número de peito', 'Chip de cronometragem', 'Medalha', 'Hidratação'],
    rules: ['Idade mínima de 16 anos para 5K.', 'Idade mínima de 18 anos para 10K.', 'Uso correto do número de peito durante todo o percurso.'],
    organizer: 'ChipBelém',
    contact: 'contato@chipbelem.com.br'
  },
  {
    id: 'evt-003',
    slug: 'quinta-corrida-pedro-teixeira',
    title: '5ª Corrida Pedro Teixeira',
    city: 'Belém',
    state: 'PA',
    date: '2026-08-15',
    time: '06:00',
    location: '2º BIS, Belém/PA',
    address: '2º Batalhão de Infantaria de Selva, Av. Almirante Barroso, Belém - PA',
    status: 'warning',
    badge: 'Últimas vagas',
    image: 'assets/5ª Corrida Pedro Teixeira.png',
    category: 'Corrida de rua',
    summary: 'Prova temática com percursos de 5K e 10K, largada às 06h no 2º BIS.',
    description: 'A 5ª Corrida Pedro Teixeira combina esporte, tradição e organização em percursos de 5K e 10K para atletas iniciantes e experientes.',
    distances: ['5K', '10K'],
    prices: [
      { label: 'Inscrição única', price: 135, until: 'valor único' }
    ],
    routes: [
      { distance: '5K', start: '06:00', limit: '700 atletas', category: 'Geral e PCD' },
      { distance: '10K', start: '06:00', limit: '500 atletas', category: 'Geral e por faixa etária' }
    ],
    kit: ['Camisa oficial', 'Número de peito', 'Chip de cronometragem', 'Medalha', 'Hidratação'],
    rules: ['Documento com foto obrigatório na retirada do kit.', 'A organização poderá ajustar o percurso por segurança.', 'Menores precisam de autorização do responsável.'],
    organizer: 'ChipBelém',
    contact: 'contato@chipbelem.com.br'
  },
  {
    id: 'evt-004',
    slug: 'decima-setima-corrida-do-sal',
    title: '17ª Corrida Do Sal',
    city: 'Salinópolis',
    state: 'PA',
    date: '2026-07-25',
    time: '06:00',
    location: 'Praia do Maçarico, Salinópolis/PA',
    address: 'Praia do Maçarico, Salinópolis - PA',
    status: 'open',
    badge: 'Inscrições abertas',
    image: 'assets/17ª Corrida Do Sal.png',
    category: 'Corrida de praia',
    summary: 'Tradicional prova em Salinópolis, com percursos de 3K e 7K na Praia do Maçarico.',
    description: 'A 17ª Corrida Do Sal leva energia esportiva para Salinópolis em uma manhã de corrida, verão e participação para diferentes níveis de atleta.',
    distances: ['3K', '7K'],
    prices: [
      { label: 'Inscrição única', price: 135, until: 'valor único' }
    ],
    routes: [
      { distance: '3K', start: '06:00', limit: '500 atletas', category: 'Geral e participação' },
      { distance: '7K', start: '06:00', limit: '600 atletas', category: 'Geral e por faixa etária' }
    ],
    kit: ['Camisa oficial', 'Número de peito', 'Chip de cronometragem', 'Medalha', 'Hidratação'],
    rules: ['Uso de tênis recomendado.', 'A organização poderá ajustar o percurso por segurança.', 'Menores precisam de autorização do responsável.'],
    organizer: 'ChipBelém',
    contact: 'contato@chipbelem.com.br'
  },
  {
    id: 'evt-005',
    slug: 'circuito-graesp-kids',
    title: 'Circuito Graesp Kids',
    city: 'Belém',
    state: 'PA',
    date: '2026-08-15',
    time: '08:00',
    location: 'Rua da Marinha, Belém/PA',
    address: 'Rua da Marinha, Belém - PA',
    status: 'open',
    badge: 'Inscrições abertas',
    image: 'assets/Circuito Graesp Kids.png',
    category: 'Corrida kids',
    summary: 'Circuito infantil do Graesp para crianças de 2 a 13 anos.',
    description: 'O Circuito Graesp Kids foi pensado para aproximar as crianças do esporte em um ambiente seguro, divertido e acompanhado pela organização.',
    distances: ['Kids'],
    prices: [
      { label: 'Inscrição única', price: 135, until: 'valor único' }
    ],
    routes: [
      { distance: 'Kids', start: '08:00', limit: '400 crianças', category: '2 a 13 anos' }
    ],
    kit: ['Camisa oficial', 'Número de peito', 'Medalha', 'Hidratação'],
    rules: ['Participação permitida de 2 a 13 anos.', 'Responsável deve acompanhar a criança no local.', 'Documento da criança e do responsável na retirada do kit.'],
    organizer: 'ChipBelém',
    contact: 'contato@chipbelem.com.br'
  },
  {
    id: 'evt-006',
    slug: 'circuito-oab-etapa-belem',
    title: 'Circuito OAB - Etapa Belém',
    city: 'Belém',
    state: 'PA',
    date: '2026-08-30',
    time: '05:30',
    location: 'Belém/PA',
    address: 'Local de largada informado pela organização',
    status: 'open',
    badge: 'Inscrições abertas',
    image: 'assets/Circuito OAB - Etapa Belém.png',
    category: 'Corrida de rua',
    summary: 'Etapa Belém do Circuito OAB Pará, com percursos de 5K e 16K.',
    description: 'O Circuito OAB - Etapa Belém reúne atletas em uma prova de rua com percurso curto e desafio de 16K, estrutura de kit e medalha finisher.',
    distances: ['5K', '16K'],
    prices: [
      { label: 'Inscrição única', price: 135, until: 'valor único' }
    ],
    routes: [
      { distance: '5K', start: '05:30', limit: '700 atletas', category: 'Geral e OAB' },
      { distance: '16K', start: '05:30', limit: '400 atletas', category: 'Geral e por faixa etária' }
    ],
    kit: ['Camisa oficial', 'Número de peito', 'Chip de cronometragem', 'Medalha', 'Hidratação'],
    rules: ['Idade mínima de 16 anos para 5K.', 'Idade mínima de 18 anos para 16K.', 'Uso correto do número de peito durante todo o percurso.'],
    organizer: 'ChipBelém',
    contact: 'contato@chipbelem.com.br'
  },
  {
    id: 'evt-007',
    slug: 'belem-night-run-etapa-fogo',
    title: 'Corrida Belém Night Run Etapa Fogo',
    city: 'Belém',
    state: 'PA',
    date: '2026-09-26',
    time: '19:00',
    location: 'Belém/PA',
    address: 'Local de largada informado pela organização',
    status: 'open',
    badge: 'Inscrições abertas',
    image: 'assets/Corrida Belém Nighth Run Etapa Fogo.png',
    category: 'Corrida noturna',
    summary: 'Etapa Fogo da Belém Night Run, com percursos de 3K e 7K.',
    description: 'A Belém Night Run Etapa Fogo é uma prova noturna vibrante, com identidade visual forte e percursos acessíveis para diferentes níveis.',
    distances: ['3K', '7K'],
    prices: [
      { label: 'Inscrição única', price: 135, until: 'valor único' }
    ],
    routes: [
      { distance: '3K', start: '19:00', limit: '600 atletas', category: 'Geral e participação' },
      { distance: '7K', start: '19:00', limit: '600 atletas', category: 'Geral e por faixa etária' }
    ],
    kit: ['Camisa oficial', 'Número de peito', 'Chip de cronometragem', 'Medalha', 'Hidratação'],
    rules: ['Uso de itens refletivos recomendado.', 'Chegue com 1h de antecedência.', 'Documento com foto obrigatório na retirada do kit.'],
    organizer: 'ChipBelém',
    contact: 'contato@chipbelem.com.br'
  },
  {
    id: 'evt-008',
    slug: 'corrida-campeao-dos-campeoes',
    title: 'Corrida Campeão dos Campeões',
    city: 'Belém',
    state: 'PA',
    date: '2026-08-09',
    time: '06:00',
    location: 'Belém/PA',
    address: 'Local de largada informado pela organização',
    status: 'open',
    badge: 'Inscrições abertas',
    image: 'assets/Corrida Campeão dos Campeões.png',
    category: 'Corrida de rua',
    summary: 'Prova com percursos de 3K e 7K, largada às 06h.',
    description: 'A Corrida Campeão dos Campeões traz uma proposta competitiva e comemorativa para atletas de diferentes níveis, com kit oficial e medalha.',
    distances: ['3K', '7K'],
    prices: [
      { label: 'Inscrição única', price: 135, until: 'valor único' }
    ],
    routes: [
      { distance: '3K', start: '06:00', limit: '500 atletas', category: 'Geral e participação' },
      { distance: '7K', start: '06:00', limit: '600 atletas', category: 'Geral e por faixa etária' }
    ],
    kit: ['Camisa oficial', 'Número de peito', 'Chip de cronometragem', 'Medalha', 'Hidratação'],
    rules: ['Documento com foto obrigatório na retirada do kit.', 'A organização poderá ajustar o percurso por segurança.', 'Inscrição pessoal e intransferível.'],
    organizer: 'ChipBelém',
    contact: 'contato@chipbelem.com.br'
  },
  {
    id: 'evt-009',
    slug: 'corrida-da-amazonia',
    title: 'Corrida Da Amazônia',
    city: 'Belém',
    state: 'PA',
    date: '2026-09-06',
    time: '06:00',
    location: 'Portal da Amazônia, Belém/PA',
    address: 'Portal da Amazônia, Belém - PA',
    status: 'open',
    badge: 'Inscrições abertas',
    image: 'assets/Corrida Da Amazônia.png',
    category: 'Corrida de rua',
    summary: 'Corrida no Portal da Amazônia com percursos de 5K e 10K.',
    description: 'A Corrida Da Amazônia celebra a cidade e a natureza em um percurso urbano com largada no Portal da Amazônia.',
    distances: ['5K', '10K'],
    prices: [
      { label: 'Inscrição única', price: 135, until: 'valor único' }
    ],
    routes: [
      { distance: '5K', start: '06:00', limit: '700 atletas', category: 'Geral e PCD' },
      { distance: '10K', start: '06:00', limit: '500 atletas', category: 'Geral e por faixa etária' }
    ],
    kit: ['Camisa oficial', 'Número de peito', 'Chip de cronometragem', 'Medalha', 'Hidratação'],
    rules: ['Idade mínima de 16 anos para 5K.', 'Idade mínima de 18 anos para 10K.', 'Uso correto do número de peito durante todo o percurso.'],
    organizer: 'ChipBelém',
    contact: 'contato@chipbelem.com.br'
  },
  {
    id: 'evt-010',
    slug: 'corrida-da-marinha',
    title: 'Corrida Da Marinha',
    city: 'Belém',
    state: 'PA',
    date: '2026-06-07',
    time: '06:00',
    location: 'Belém/PA',
    address: 'Local de largada informado pela organização',
    status: 'open',
    badge: 'Inscrições abertas',
    image: 'assets/Corrida Da Marinha.png',
    category: 'Corrida de rua',
    summary: 'Corrida comemorativa da Marinha, com percursos de 5K e 10K.',
    description: 'A Corrida Da Marinha integra esporte e tradição em uma prova de rua com largada às 06h e percursos de 5K e 10K.',
    distances: ['5K', '10K'],
    prices: [
      { label: 'Inscrição única', price: 135, until: 'valor único' }
    ],
    routes: [
      { distance: '5K', start: '06:00', limit: '700 atletas', category: 'Geral e PCD' },
      { distance: '10K', start: '06:00', limit: '500 atletas', category: 'Geral e por faixa etária' }
    ],
    kit: ['Camisa oficial', 'Número de peito', 'Chip de cronometragem', 'Medalha', 'Hidratação'],
    rules: ['Documento com foto obrigatório na retirada do kit.', 'Chegue com antecedência para organização da largada.', 'Inscrição pessoal e intransferível.'],
    organizer: 'ChipBelém',
    contact: 'contato@chipbelem.com.br'
  },
  {
    id: 'evt-011',
    slug: 'corrida-do-sol',
    title: 'Corrida Do Sol',
    city: 'Belém',
    state: 'PA',
    date: '2026-07-05',
    time: '06:00',
    location: 'Praia do Chapéu Virado, Mosqueiro/PA',
    address: 'Praia do Chapéu Virado, Mosqueiro - PA',
    status: 'open',
    badge: 'Inscrições abertas',
    image: 'assets/Corrida Do Sol.png',
    category: 'Corrida de praia',
    summary: 'Corrida em Mosqueiro com percursos de 5K e 10K.',
    description: 'A Corrida Do Sol combina esporte, verão e paisagem de praia em uma prova com percursos de 5K e 10K na Praia do Chapéu Virado.',
    distances: ['5K', '10K'],
    prices: [
      { label: 'Inscrição única', price: 135, until: 'valor único' }
    ],
    routes: [
      { distance: '5K', start: '06:00', limit: '600 atletas', category: 'Geral e PCD' },
      { distance: '10K', start: '06:00', limit: '500 atletas', category: 'Geral e por faixa etária' }
    ],
    kit: ['Camisa oficial', 'Número de peito', 'Chip de cronometragem', 'Medalha', 'Hidratação'],
    rules: ['Uso de tênis recomendado.', 'A organização poderá ajustar o percurso por segurança.', 'Menores precisam de autorização do responsável.'],
    organizer: 'ChipBelém',
    contact: 'contato@chipbelem.com.br'
  }
];

const DEMO_USER = {
  name: 'Alexandre Durães',
  email: 'alexandre@demo.com',
  phone: '(91) 99999-0000',
  city: 'Belém/PA'
};

const SHIRT_SIZES = ['PP', 'P', 'M', 'G', 'GG', 'XG', 'Sem camisa (apenas número de inscrição)'];
const STATES = ['PA', 'MA', 'AP', 'AM'];


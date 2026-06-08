# ChipBelem - Plataforma demo de corridas

Este projeto e uma base demonstrativa para inscricoes em corridas, area do atleta, area do organizador e painel administrativo.

## O que vem no projeto

- Aplicacao React com Vite
- Pagina inicial
- Lista de eventos com filtros
- Pagina individual do evento
- Checkout/inscricao demonstrativa
- Login e cadastro demonstrativos
- Area do atleta
- Area do organizador
- Painel administrativo com paginas proprias
- Protecao do organizador por conta base e aprovacao de novos pedidos
- Exportacao CSV demonstrativa dos inscritos
- Dados ficticios em `src/data.js`
- Estado temporario salvo no `localStorage`

## Banco de dados

O projeto inclui um desenho inicial de PostgreSQL em `database/schema.sql`, dados base em `database/seed.sql` e guia de evolucao em `docs/postgresql-backend.md`.

## Conta base da demo

- Login: `Admin`
- E-mail: `Alexandre.duraes.soares@gmail.com`
- Senha: `Tecprime@123`

Novos organizadores enviados pela tela de cadastro ficam pendentes ate a aprovacao em `Painel admin > Configuracoes`.

## Como rodar

Instale as dependencias:

```bash
npm install
```

Inicie o servidor local:

```bash
npm run dev
```

Abra:

```text
http://127.0.0.1:5173/index.html
```

Para gerar a versao de producao:

```bash
npm run build
```

## Publicar no GitHub Pages

Este projeto usa Vite e precisa publicar a pasta `dist`, nao a raiz do repositorio.

1. Envie os arquivos para o GitHub.
2. No repositorio, abra `Settings > Pages`.
3. Em `Build and deployment > Source`, selecione `GitHub Actions`.
4. Nao use `Deploy from a branch` com `main / root`, porque isso publica o JSX original e deixa a pagina branca.
5. Faca um novo push ou rode manualmente o workflow `Deploy GitHub Pages`.

O `vite.config.js` esta configurado para o caminho publico `/chipbel-m-teste/`.

## Publicar no Vercel

O projeto tambem esta pronto para Vercel. O arquivo `vercel.json` define:

- Framework: `vite`
- Build command: `npm run build`
- Output directory: `dist`

Passos:

1. Envie o projeto para o GitHub.
2. Acesse `https://vercel.com`.
3. Clique em `Add New > Project`.
4. Importe o repositorio `chipbel-m-teste`.
5. Confirme as configuracoes detectadas:
   - Framework Preset: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`
6. Clique em `Deploy`.

No Vercel, o site usa caminho raiz `/`. No GitHub Pages, o workflow usa `GITHUB_PAGES=true` para manter `/chipbel-m-teste/`.

## Proximos passos para virar sistema real

- Criar uma API para conectar o frontend ao PostgreSQL
- Migrar eventos, inscricoes e pagamentos para o banco
- Subir imagens para storage ou pasta publica controlada
- Integrar pagamento com Mercado Pago
- Criar autenticacao real para atletas, organizadores e administradores
- Proteger painel admin com regras de acesso

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

const pages = [
  'index',
  'eventos',
  'evento',
  'inscricao',
  'login',
  'cadastro',
  'confirmar-email',
  'contato',
  'minhas-inscricoes',
  'organizador',
  'admin',
  'admin-eventos',
  'admin-inscritos',
  'admin-financeiro',
  'admin-configuracoes'
];

export default defineConfig({
  base: process.env.GITHUB_PAGES === 'true' ? '/chipbel-m-teste/' : '/',
  plugins: [react()],
  build: {
    rollupOptions: {
      input: Object.fromEntries(
        pages.map(page => [page, resolve(__dirname, `${page}.html`)])
      )
    }
  }
});

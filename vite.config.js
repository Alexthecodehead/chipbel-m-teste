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
  server: {
    host: '127.0.0.1',
    cors: false,
    allowedHosts: ['127.0.0.1', 'localhost']
  },
  preview: {
    host: '127.0.0.1',
    cors: false,
    allowedHosts: ['127.0.0.1', 'localhost']
  },
  build: {
    sourcemap: false,
    rollupOptions: {
      input: Object.fromEntries(
        pages.map(page => [page, resolve(__dirname, `${page}.html`)])
      )
    }
  }
});

import { defineConfig } from 'vite';

// './' — относительные пути: игра работает по адресу
// https://<ник>.github.io/<имя-репозитория>/ при любом имени репозитория.
export default defineConfig({
  base: './',
  build: { outDir: 'dist', chunkSizeWarningLimit: 1200 },
});

import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://fengmic.pages.dev/',
  markdown: {
    shikiConfig: {
      theme: 'github-light'
    }
  }
});

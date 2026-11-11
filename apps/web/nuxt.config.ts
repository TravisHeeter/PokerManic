export default defineNuxtConfig({
  compatibilityDate: '2026-11-11',
  modules: ['@nuxt/ui'],
  css: ['~/assets/css/main.css'],
  devtools: { enabled: true },
  app: {
    head: {
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg?v=1' },
      ],
    },
  },
  runtimeConfig: {
    apiBaseUrl: process.env.NEST_API_BASE_URL ?? 'http://localhost:4000',
  },
});

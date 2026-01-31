// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss'],
  nitro: {
    experimental: {
      tasks: true,
    },
  },
  runtimeConfig: {
    manusApiKey: '',
    newsApiKey: '',
    openaiApiKey: '',
    sessionSecret: '',
    public: {
      appName: 'DealVertical AI',
    },
  },
  app: {
    head: {
      title: 'DealVertical AI – Exposé Analysis',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      ],
    },
  },
})

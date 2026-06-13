/* eslint-env node */

const { configure } = require('quasar/wrappers')

module.exports = configure(function (/* ctx */) {
  return {
    boot: [],

    css: ['app.scss'],

    extras: ['roboto-font', 'material-icons', 'material-icons-outlined'],

    build: {
      vueRouterMode: 'hash',
    },

    devServer: {
      open: true,
    },

    framework: {
      config: {
        dark: false,
        notify: { position: 'top', timeout: 2000 },
      },
      plugins: ['Notify', 'Dialog', 'Loading'],
    },

    animations: [],

    pwa: {
      workboxMode: 'generateSW',
      manifest: {
        name: 'Stavební Deník',
        short_name: 'StavDeník',
        description: 'Sledování odpracovaných hodin na stavbách',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#ffffff',
        theme_color: '#E65100',
        icons: [
          {
            src: 'icons/icon-128x128.png',
            sizes: '128x128',
            type: 'image/png',
          },
          {
            src: 'icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    },
  }
})

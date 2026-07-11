import { createApp } from 'vue'
import App from './App.vue'
import './style.scss'

createApp(App).mount('#app')

// Register Service Worker for offline caching (PWA)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(import.meta.env.BASE_URL + 'sw-preview.js', {
        scope: import.meta.env.BASE_URL || '/'
      })
      .catch((err) => {
        console.warn('[SW] registration failed:', err)
      })
  })
}

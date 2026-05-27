/* ══════════════════════════════════════════════════
   Profe Tracker — Service Worker (PWA)
   ══════════════════════════════════════════════════ */

const CACHE = 'profe-tracker-v1'

// Recursos a precachear en la instalación
const PRECACHE = [
  '/',
  '/dashboard',
  '/login',
  '/manifest.json',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
  '/icons/apple-touch-icon.svg',
]

// Instalación: precachear recursos críticos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE))
  )
  self.skipWaiting()
})

// Activación: limpiar caches viejos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// Estrategia: Network First con fallback a cache
self.addEventListener('fetch', (event) => {
  // Solo requests GET
  if (event.request.method !== 'GET') return

  // No cachear API calls ni recursos de terceros
  const url = new URL(event.request.url)
  if (url.pathname.startsWith('/api/') || url.hostname !== self.location.hostname) {
    return
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cachear respuesta exitosa
        const clone = response.clone()
        caches.open(CACHE).then((cache) => cache.put(event.request, clone))
        return response
      })
      .catch(() => {
        // Fallback a cache si hay error de red
        return caches.match(event.request).then((cached) => {
          return cached || caches.match('/dashboard')
        })
      })
  )
})

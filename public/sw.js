const CACHE_NAME = 'cali-app-v1'

const STATIC_ASSETS = [
  '/',
  '/index.html',
]

// Install: cache the app shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

// Activate: clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// Fetch: serve from cache, fall back to network
self.addEventListener('fetch', event => {
  // Only handle navigation requests (page loads) — let API calls go through normally
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match('/index.html')
      )
    )
    return
  }

  // For static assets: cache first
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  )
})

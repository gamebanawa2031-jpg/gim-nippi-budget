/* eslint-disable */
// Service Worker - Network first strategy to prevent stale data
const CACHE_VERSION = 'v2';

self.addEventListener('install', (e) => {
  console.log('[Service Worker] Install');
  // Force activate immediately, don't wait for old SW to finish
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  console.log('[Service Worker] Activate');
  // Clean up old caches
  e.waitUntil(
    caches.keys().then(keys => 
      Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  // Always try network first, fall back to cache only if offline
  e.respondWith(
    fetch(e.request)
      .then(response => {
        // Don't cache API/Firebase requests
        if (e.request.url.includes('firestore') || e.request.url.includes('googleapis')) {
          return response;
        }
        return response;
      })
      .catch(() => caches.match(e.request))
  );
});


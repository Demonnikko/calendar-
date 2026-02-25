// Service Worker для Illusionist Calendar
// Версия: 18.0 (FULL OFFLINE WITH LOCAL DEPENDENCIES)
const CACHE_NAME = 'illusionist-calendar-v18-offline';

// Критические ресурсы для мгновенного старта
const CORE_ASSETS = [
  './',
  './index.html',
  './lucide.min.js',
  './tailwind.min.js',
  './manifest.json'
];

// Иконки
const ICON_ASSETS = [
  './icons/icon-72.png',
  './icons/icon-96.png',
  './icons/icon-128.png',
  './icons/icon-144.png',
  './icons/icon-152.png',
  './icons/icon-192.png',
  './icons/icon-384.png',
  './icons/icon-512.png'
];

// Firebase SDK
const FIREBASE_SDK = [
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-database-compat.js'
];

const ALL_ASSETS = [...CORE_ASSETS, ...ICON_ASSETS, ...FIREBASE_SDK];

// Установка: кэшируем все ресурсы
// НЕ вызываем self.skipWaiting() чтобы дать приложению показать баннер обновления
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.allSettled(
        ALL_ASSETS.map(url =>
          cache.add(url).catch(err => console.warn('[SW] Не удалось кэшировать:', url))
        )
      );
    })
  );
});

// Активация: очистка старых кэшей
self.addEventListener('activate', event => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then(names =>
        Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)))
      )
    ])
  );
});

// Fetch: стратегии кэширования
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // Firebase API — только сеть
  if (url.includes('firebaseio.com') ||
    url.includes('firebaseapp.com') ||
    url.includes('googleapis.com')) {
    return;
  }

  // Навигация — Network First (чтобы index.html всегда был свежим при наличии интернета)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).then(response => {
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, response.clone());
          return response;
        });
      }).catch(() => {
        return caches.match('./index.html');
      })
    );
    return;
  }

  // Firebase SDK — Stale-While-Revalidate
  if (url.includes('gstatic.com')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        const fetchPromise = fetch(event.request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => cached);

        return cached || fetchPromise;
      })
    );
    return;
  }

  // Остальные ресурсы — Cache First
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        if (event.request.method === 'GET' && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});

// Слушатель сообщений от клиента (интерфейса) для бесшовных обновлений PWA
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

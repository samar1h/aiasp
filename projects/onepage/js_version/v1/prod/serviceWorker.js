// serviceWorker.js
const CACHE_NAME = 'onepage-v3';
const urlsToCache = [
    'https://samar1h.github.io/onepage/js_version/v1/prod/',
    'https://samar1h.github.io/onepage/js_version/v1/prod/index.html',
    'https://samar1h.github.io/onepage/js_version/v1/prod/manifest.json',
    'https://samar1h.github.io/onepage/js_version/v1/prod/favicon.ico',
    'https://samar1h.github.io/onepage/js_version/v1/prod/favicon.svg',
    'https://samar1h.github.io/onepage/js_version/v1/prod/favicon-16x16.png',
    'https://samar1h.github.io/onepage/js_version/v1/prod/favicon-32x32.png',
    "https://samar1h.github.io/onepage/js_version/v1/prod/android-chrome-192x192.png",
    "https://samar1h.github.io/onepage/js_version/v1/prod/android-chrome-512x512.png",
    // Cache CSS
    // 'static/css/main.*.css',
    // Cache JS
    // 'static/js/main.*.js',
    // Wildcard patterns (*) dont work so Hardcoding Shit, ik i suck...
    "https://samar1h.github.io/onepage/js_version/v1/prod/static/css/main.55447cda.css",
    "https://samar1h.github.io/onepage/js_version/v1/prod/static/css/main.c7690eb8.css",
    "https://samar1h.github.io/onepage/js_version/v1/prod/static/css/main.f53b863c.css",
    "https://samar1h.github.io/onepage/js_version/v1/prod/static/js/main.4686c066.js",
    "https://samar1h.github.io/onepage/js_version/v1/prod/static/js/main.73aecd8c.js",
    "https://samar1h.github.io/onepage/js_version/v1/prod/static/js/main.d5f9f340.js",
    "https://samar1h.github.io/onepage/js_version/v1/prod/static/js/main.f74bc11e.js",
    
    
];

// Installation
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
            .catch(error => console.error('Failed to cache resources:', error))
    );
    // Activate worker immediately
    self.skipWaiting();
});

// Activation
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        console.log('Clearing old cache:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
    // Ensure service worker takes control immediately
    self.clients.claim();
});

// Fetch handler with network-first strategy
self.addEventListener('fetch', event => {
    event.respondWith(
        // Try network first
        fetch(event.request)
            .then(response => {
                // Clone the response because we need to store it in cache
                // and use it to respond
                const responseClone = response.clone();

                caches.open(CACHE_NAME)
                    .then(cache => {
                        // Store the fetched response in cache
                        cache.put(event.request, responseClone);
                    });

                return response;
            })
            .catch(() => {
                // If network fails, try cache
                return caches.match(event.request)
                    .then(response => {
                        if (response) {
                            return response;
                        }
                        // If both network and cache fail, show offline page
                        if (event.request.mode === 'navigate') {
                            return caches.match('https://samar1h.github.io/onepage/js_version/v1/prod/index.html');
                        }
                        return new Response('Not available offline');
                    });
            })
    );
});

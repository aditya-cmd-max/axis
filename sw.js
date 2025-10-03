// Service Worker for Exonova Axis PWA
const CACHE_NAME = 'exonova-axis-v1.0.0';
const urlsToCache = [
    '/',
    'index.html',
    'https://aditya-cmd-max.github.io/exonova-/logo-nobg.png',
    'https://fonts.googleapis.com/css2?family=Product+Sans:wght@300;400;500;700&display=swap',
    'https://fonts.googleapis.com/icon?family=Material+Icons'
];

// Install event
self.addEventListener('install', event => {
    console.log('Service Worker installed');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
    self.skipWaiting();
});

// Activate event
self.addEventListener('activate', event => {
    console.log('Service Worker activated');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Fetch event
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Return cached version or fetch from network
                return response || fetch(event.request);
            }
        )
    );
});

// Push notification event
self.addEventListener('push', event => {
    console.log('Push notification received', event);
    
    let data = {
        title: 'Exonova Axis',
        body: 'You have a new notification!',
        icon: 'https://aditya-cmd-max.github.io/exonova-/logo-nobg.png',
        badge: 'https://aditya-cmd-max.github.io/axis/Untitled%20design%20(2).gif'
    };
    
    if (event.data) {
        data = JSON.parse(event.data.text());
    }
    
    const options = {
        body: data.body,
        icon: data.icon,
        badge: data.badge,
        tag: data.tag || 'exonova-notification',
        requireInteraction: true,
        actions: [
            {
                action: 'open',
                title: 'Open App'
            },
            {
                action: 'dismiss',
                title: 'Dismiss'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Notification click event
self.addEventListener('notificationclick', event => {
    console.log('Notification clicked', event);
    
    event.notification.close();
    
    if (event.action === 'open') {
        event.waitUntil(
            clients.matchAll({ type: 'window' }).then(windowClients => {
                // Check if app is already open
                for (let client of windowClients) {
                    if (client.url.includes(self.location.origin) && 'focus' in client) {
                        return client.focus();
                    }
                }
                // Open new window if app isn't open
                if (clients.openWindow) {
                    return clients.openWindow('/');
                }
            })
        );
    }
});

// Service Worker for Exonova Axis PWA
const CACHE_NAME = 'exonova-axis-v2.0.0';
const urlsToCache = [
    '/axis/',
    '/axis/index.html',
    '/axis/sw.js',
    '/axis/manifest.json',
    'https://aditya-cmd-max.github.io/axis/Untitled%20design%20(2).gif',
    'https://aditya-cmd-max.github.io/axis/Untitled%20design.gif',
    'https://aditya-cmd-max.github.io/exonova-/logo-nobg.png',
    'https://fonts.googleapis.com/css2?family=Product+Sans:wght@300;400;500;700&display=swap',
    'https://fonts.googleapis.com/icon?family=Material+Icons',
    'https://cdn.tailwindcss.com'
];

// Install event
self.addEventListener('install', event => {
    console.log('🚀 Service Worker installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('📦 Opened cache, adding files:', urlsToCache);
                return cache.addAll(urlsToCache).catch(err => {
                    console.log('❌ Cache addAll failed:', err);
                });
            })
    );
    self.skipWaiting();
    console.log('✅ Service Worker installed successfully');
});

// Activate event
self.addEventListener('activate', event => {
    console.log('🔄 Service Worker activating...');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('🗑️ Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
    console.log('✅ Service Worker activated and controlling clients');
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', event => {
    // Only cache GET requests
    if (event.request.method !== 'GET') return;
    
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Return cached version or fetch from network
                if (response) {
                    console.log('💾 Serving from cache:', event.request.url);
                    return response;
                }
                
                console.log('🌐 Fetching from network:', event.request.url);
                return fetch(event.request).then(response => {
                    // Check if we received a valid response
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }
                    
                    // Clone the response
                    const responseToCache = response.clone();
                    
                    caches.open(CACHE_NAME)
                        .then(cache => {
                            cache.put(event.request, responseToCache);
                        });
                    
                    return response;
                });
            })
            .catch(error => {
                console.log('❌ Fetch failed, serving offline page:', error);
                // You could return a custom offline page here
            })
    );
});

// Push notification event - THIS IS WHAT TRIGGERS NOTIFICATIONS
self.addEventListener('push', event => {
    console.log('🔔 Push notification received!', event);
    
    let data = {
        title: 'Exonova Axis',
        body: '🚀 Welcome to Exonova Axis! Explore all tools in one place.',
        icon: 'https://aditya-cmd-max.github.io/exonova-/logo-nobg.png',
        badge: 'https://aditya-cmd-max.github.io/exonova-/logo-nobg.png',
        image: 'https://aditya-cmd-max.github.io/exonova-/logo-nobg.png',
        tag: 'exonova-welcome'
    };
    
    // If we have push data, use it
    if (event.data) {
        try {
            data = { ...data, ...JSON.parse(event.data.text()) };
        } catch (e) {
            console.log('No JSON data in push event');
        }
    }
    
    const options = {
        body: data.body,
        icon: data.icon,
        badge: data.badge,
        image: data.image,
        tag: data.tag,
        requireInteraction: true, // Notification stays until clicked
        silent: false, // Play sound
        vibrate: [200, 100, 200], // Vibration pattern for mobile
        actions: [
            {
                action: 'open',
                title: '📱 Open App'
            },
            {
                action: 'dismiss',
                title: '❌ Dismiss'
            }
        ],
        data: {
            url: '/axis/', // URL to open when notification clicked
            timestamp: Date.now()
        }
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title, options)
            .then(() => console.log('✅ Notification shown successfully'))
            .catch(err => console.log('❌ Notification failed:', err))
    );
});

// Notification click event
self.addEventListener('notificationclick', event => {
    console.log('👆 Notification clicked:', event);
    
    event.notification.close();
    
    if (event.action === 'open' || event.action === '') {
        const urlToOpen = event.notification.data?.url || '/axis/';
        
        event.waitUntil(
            clients.matchAll({ 
                type: 'window',
                includeUncontrolled: true 
            }).then(windowClients => {
                // Check if app is already open
                for (let client of windowClients) {
                    if (client.url.includes(self.location.origin) && 'focus' in client) {
                        console.log('🔍 Found existing client, focusing:', client.url);
                        return client.focus();
                    }
                }
                
                // Open new window if app isn't open
                if (clients.openWindow) {
                    console.log('🆕 Opening new window:', urlToOpen);
                    return clients.openWindow(urlToOpen);
                }
            })
        );
    } else if (event.action === 'dismiss') {
        console.log('Notification dismissed');
        event.notification.close();
    }
});

// Background sync example (for future use)
self.addEventListener('sync', event => {
    console.log('🔄 Background sync:', event.tag);
    if (event.tag === 'background-sync') {
        event.waitUntil(doBackgroundSync());
    }
});

function doBackgroundSync() {
    console.log('🔄 Performing background sync...');
    return Promise.resolve();
}

// Periodic sync (for future use)
self.addEventListener('periodicsync', event => {
    if (event.tag === 'content-update') {
        console.log('🔄 Periodic sync for content updates');
        event.waitUntil(updateContent());
    }
});

function updateContent() {
    console.log('📰 Checking for content updates...');
    return Promise.resolve();
}

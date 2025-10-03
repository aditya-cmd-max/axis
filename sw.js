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
    'https://aditya-cmd-max.github.io/axis/axislogo.png',
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

// Enhanced Push Notification Handler
self.addEventListener('push', event => {
    console.log('🔔 Push notification received!', event);
    
    // Default notification data
    let notificationData = {
        title: 'Exonova Axis',
        body: '🚀 Welcome to Exonova Axis! Explore all tools in one place.',
        icon: 'https://aditya-cmd-max.github.io/axis/axislogo.png',
        badge: 'https://aditya-cmd-max.github.io/exonova-/logo-nobg.png',
        tag: 'exonova-general',
        type: 'info',
        timestamp: Date.now()
    };
    
    // Extract data from push payload
    if (event.data) {
        try {
            const payload = event.data.json();
            notificationData = { ...notificationData, ...payload };
            console.log('📦 Notification payload:', payload);
        } catch (e) {
            console.log('📝 Plain text notification:', event.data.text());
            notificationData.body = event.data.text() || notificationData.body;
        }
    }
    
    // Customize based on notification type
    const notificationConfig = getNotificationConfig(notificationData.type);
    
    const options = {
        body: notificationData.body,
        icon: notificationConfig.icon,
        badge: notificationConfig.badge,
        image: notificationConfig.image,
        tag: notificationData.tag || `exonova-${Date.now()}`,
        requireInteraction: notificationConfig.requireInteraction,
        silent: notificationConfig.silent,
        vibrate: notificationConfig.vibrate,
        actions: notificationConfig.actions,
        data: {
            url: '/axis/',
            timestamp: notificationData.timestamp,
            notificationId: notificationData.id,
            type: notificationData.type
        }
    };
    
    console.log('🎯 Showing notification with options:', options);
    
    event.waitUntil(
        self.registration.showNotification(notificationData.title, options)
            .then(() => console.log('✅ Notification shown successfully'))
            .catch(err => console.log('❌ Notification failed:', err))
    );
});

// Notification type configuration
function getNotificationConfig(type) {
    const baseConfig = {
        icon: 'https://aditya-cmd-max.github.io/axis/axislogo.png',
        badge: 'https://aditya-cmd-max.github.io/exonova-/logo-nobg.png',
        image: 'https://aditya-cmd-max.github.io/axis/axislogo.png',
        requireInteraction: false,
        silent: false,
        vibrate: [200, 100, 200],
        actions: [
            {
                action: 'open',
                title: '📱 Open App'
            },
            {
                action: 'dismiss',
                title: '❌ Dismiss'
            }
        ]
    };
    
    switch(type) {
        case 'welcome':
            return {
                ...baseConfig,
                icon: 'https://aditya-cmd-max.github.io/axis/Untitled%20design%20(2).gif',
                requireInteraction: true,
                vibrate: [300, 100, 300, 100, 300],
                actions: [
                    {
                        action: 'explore',
                        title: '🚀 Explore'
                    },
                    {
                        action: 'open',
                        title: '📱 Open App'
                    }
                ]
            };
            
        case 'tip':
            return {
                ...baseConfig,
                icon: 'https://aditya-cmd-max.github.io/exonovaai/logo.png',
                vibrate: [200, 100, 200],
                silent: false
            };
            
        case 'update':
            return {
                ...baseConfig,
                icon: 'https://aditya-cmd-max.github.io/mindscribe/logo.png',
                requireInteraction: true,
                vibrate: [200, 100, 200, 100, 200]
            };
            
        case 'info':
            return {
                ...baseConfig,
                icon: 'https://aditya-cmd-max.github.io/skycast-pro/logo.png',
                silent: false
            };
            
        default:
            return baseConfig;
    }
}

// Enhanced Notification Click Handler
self.addEventListener('notificationclick', event => {
    console.log('👆 Notification clicked - Action:', event.action, 'Data:', event.notification.data);
    
    event.notification.close();
    
    const notificationData = event.notification.data || {};
    const urlToOpen = notificationData.url || '/axis/';
    
    // Handle different actions
    switch(event.action) {
        case 'open':
        case 'explore':
        case '':
            // Default click action
            event.waitUntil(
                clients.matchAll({ 
                    type: 'window',
                    includeUncontrolled: true 
                }).then(windowClients => {
                    // Try to find and focus existing window
                    for (let client of windowClients) {
                        if (client.url.includes(self.location.origin)) {
                            console.log('🔍 Found existing client, focusing:', client.url);
                            // Navigate to specific section based on notification type
                            if (event.action === 'explore' || notificationData.type === 'welcome') {
                                client.postMessage({
                                    type: 'NAVIGATE',
                                    section: 'home'
                                });
                            }
                            return client.focus();
                        }
                    }
                    
                    // Open new window
                    if (clients.openWindow) {
                        console.log('🆕 Opening new window:', urlToOpen);
                        return clients.openWindow(urlToOpen).then(newClient => {
                            if (newClient) {
                                console.log('✅ New window opened successfully');
                            }
                        });
                    }
                })
            );
            break;
            
        case 'dismiss':
            console.log('❌ Notification dismissed by user');
            // You could send analytics here
            break;
            
        default:
            console.log('🔍 Unknown action:', event.action);
            // Fallback to opening the app
            event.waitUntil(clients.openWindow(urlToOpen));
    }
});

// Handle messages from the main app
self.addEventListener('message', event => {
    console.log('📨 Message received in service worker:', event.data);
    
    const { type, payload } = event.data || {};
    
    switch(type) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            console.log('🔄 Service Worker skipWaiting called');
            break;
            
        case 'GET_VERSION':
            event.ports[0].postMessage({
                version: '2.0.0',
                cacheName: CACHE_NAME
            });
            break;
            
        case 'CLEAR_NOTIFICATIONS':
            // Clear all notifications
            self.registration.getNotifications().then(notifications => {
                notifications.forEach(notification => notification.close());
                console.log('🗑️ Cleared all notifications');
            });
            break;
            
        default:
            console.log('📨 Unknown message type:', type);
    }
});

// Enhanced Background Sync
self.addEventListener('sync', event => {
    console.log('🔄 Background sync event:', event.tag);
    
    switch(event.tag) {
        case 'notification-sync':
            event.waitUntil(syncNotificationSettings());
            break;
            
        case 'content-update':
            event.waitUntil(checkForContentUpdates());
            break;
            
        default:
            console.log('🔄 Unknown sync tag:', event.tag);
    }
});

// Sync notification settings with server
function syncNotificationSettings() {
    console.log('🔄 Syncing notification settings...');
    // In a real app, you would sync user preferences here
    return Promise.resolve();
}

// Check for content updates
function checkForContentUpdates() {
    console.log('🔄 Checking for content updates...');
    // In a real app, you would check for new content here
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

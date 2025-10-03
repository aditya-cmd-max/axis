// Service Worker for Exonova Axis PWA
const CACHE_NAME = 'exonova-axis-v2.1.0';
const NOTIFICATION_CACHE = 'exonova-notifications-v1';

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
        Promise.all([
            caches.open(CACHE_NAME),
            caches.open(NOTIFICATION_CACHE)
        ]).then(([appCache, notificationCache]) => {
            console.log('📦 Opened caches for app and notifications');
            return appCache.addAll(urlsToCache).catch(err => {
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
                    if (cacheName !== CACHE_NAME && cacheName !== NOTIFICATION_CACHE) {
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

// Background sync for notifications
self.addEventListener('sync', event => {
    console.log('🔄 Background sync event:', event.tag);
    
    if (event.tag === 'daily-notifications') {
        console.log('🎯 Processing daily notifications sync');
        event.waitUntil(triggerScheduledNotifications());
    }
    
    if (event.tag === 'periodic-notifications') {
        console.log('🎯 Processing periodic notifications sync');
        event.waitUntil(triggerPeriodicNotifications());
    }
});

// Trigger scheduled notifications from service worker
async function triggerScheduledNotifications() {
    console.log('🔔 Triggering scheduled notifications from background');
    
    const now = Date.now();
    const today = new Date().toDateString();
    
    try {
        // Get stored notification state
        const cache = await caches.open(NOTIFICATION_CACHE);
        const lastWelcomeResponse = await cache.match('last-welcome');
        
        // Check if welcome should be sent today
        let lastWelcomeDate = null;
        if (lastWelcomeResponse) {
            lastWelcomeDate = await lastWelcomeResponse.text();
        }
        
        console.log('📅 Welcome check - Last:', lastWelcomeDate, 'Today:', today);
        
        if (lastWelcomeDate !== today) {
            // Send welcome notification
            await self.registration.showNotification('Welcome to Exonova Axis! 🚀', {
                body: 'Your productivity hub is ready. Explore all tools in one place.',
                icon: 'https://aditya-cmd-max.github.io/axis/axislogo.png',
                badge: 'https://aditya-cmd-max.github.io/exonova-/logo-nobg.png',
                tag: 'welcome-' + today,
                requireInteraction: true,
                vibrate: [300, 100, 300],
                actions: [
                    { action: 'explore', title: '🚀 Explore' },
                    { action: 'open', title: '📱 Open' }
                ],
                data: { 
                    url: '/axis/', 
                    type: 'welcome',
                    timestamp: now
                }
            });
            
            console.log('✅ Welcome notification sent');
            
            // Store that welcome was sent today
            await cache.put('last-welcome', new Response(today));
            console.log('💾 Saved welcome date:', today);
        } else {
            console.log('ℹ️ Welcome already sent today');
        }
        
        // Send periodic notifications
        await triggerPeriodicNotifications();
        
    } catch (error) {
        console.log('❌ Error in scheduled notifications:', error);
    }
}

// Trigger periodic notifications (1.5h and 2h intervals)
async function triggerPeriodicNotifications() {
    console.log('🕒 Triggering periodic notifications from background');
    
    const notificationPools = {
        '1.5h': [
            {
                title: 'Productivity Tip 💡',
                message: 'Use El Futuro AI to automate your daily tasks and save time.',
                type: 'tip'
            },
            {
                title: 'Did You Know? 🤔', 
                message: 'SkyCast Pro can predict weather patterns 7 days in advance!',
                type: 'info'
            },
            {
                title: 'Quick Tip ✨',
                message: 'Boost your learning with PopOut Pro\'s visual study tools.',
                type: 'tip'
            }
        ],
        '2h': [
            {
                title: 'Feature Spotlight 🔦',
                message: 'Mindscribe can help organize your thoughts and ideas efficiently.',
                type: 'update'
            },
            {
                title: 'Try This 👇',
                message: 'Peo-TTS for natural sounding text-to-speech conversion.',
                type: 'tip'
            },
            {
                title: 'Security Reminder 🔒',
                message: 'Securepass ensures your passwords are always strong and secure.',
                type: 'info'
            }
        ]
    };
    
    try {
        const cache = await caches.open(NOTIFICATION_CACHE);
        
        // Get or initialize indexes
        let indexes = { '1.5h': 0, '2h': 0 };
        const storedIndexes = await cache.match('notification-indexes');
        if (storedIndexes) {
            indexes = await storedIndexes.json();
        }
        
        console.log('📊 Current notification indexes:', indexes);
        
        // Send 1.5h notification
        const oneHourNotification = notificationPools['1.5h'][indexes['1.5h']];
        if (oneHourNotification) {
            await self.registration.showNotification(oneHourNotification.title, {
                body: oneHourNotification.message,
                icon: 'https://aditya-cmd-max.github.io/axis/axislogo.png',
                badge: 'https://aditya-cmd-max.github.io/exonova-/logo-nobg.png',
                tag: 'periodic-1.5h-' + Date.now(),
                vibrate: [200, 100, 200],
                data: { 
                    url: '/axis/', 
                    type: oneHourNotification.type,
                    timestamp: Date.now()
                }
            });
            
            console.log('✅ 1.5h notification sent:', oneHourNotification.title);
            
            indexes['1.5h'] = (indexes['1.5h'] + 1) % notificationPools['1.5h'].length;
        }
        
        // Send 2h notification  
        const twoHourNotification = notificationPools['2h'][indexes['2h']];
        if (twoHourNotification) {
            await self.registration.showNotification(twoHourNotification.title, {
                body: twoHourNotification.message,
                icon: 'https://aditya-cmd-max.github.io/axis/axislogo.png',
                badge: 'https://aditya-cmd-max.github.io/exonova-/logo-nobg.png',
                tag: 'periodic-2h-' + Date.now(),
                vibrate: [200, 100, 200],
                data: { 
                    url: '/axis/', 
                    type: twoHourNotification.type,
                    timestamp: Date.now()
                }
            });
            
            console.log('✅ 2h notification sent:', twoHourNotification.title);
            
            indexes['2h'] = (indexes['2h'] + 1) % notificationPools['2h'].length;
        }
        
        // Store updated indexes
        await cache.put('notification-indexes', new Response(JSON.stringify(indexes)));
        console.log('💾 Updated notification indexes:', indexes);
        
    } catch (error) {
        console.log('❌ Error in periodic notifications:', error);
    }
}

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
                version: '2.1.0',
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
            
        case 'TRIGGER_SYNC':
            // Manually trigger background sync
            if (payload && payload.syncType === 'daily') {
                triggerScheduledNotifications();
            }
            break;
            
        case 'RESET_NOTIFICATIONS':
            // Reset notification state (for testing)
            caches.open(NOTIFICATION_CACHE).then(cache => {
                cache.delete('last-welcome');
                cache.delete('notification-indexes');
                console.log('🔄 Notification state reset');
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
    
    if (event.tag === 'notification-check') {
        console.log('🔄 Periodic sync for notifications');
        event.waitUntil(triggerScheduledNotifications());
    }
});

function updateContent() {
    console.log('📰 Checking for content updates...');
    return Promise.resolve();
}

// Handle service worker updates
self.addEventListener('updatefound', () => {
    console.log('🔄 New service worker found, updating...');
});

// Handle service worker controller change
self.addEventListener('controllerchange', () => {
    console.log('🎮 Service worker controller changed');
});

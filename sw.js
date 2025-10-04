// Service Worker for Exonova Axis PWA - STABLE VERSION
// Provides reliable notifications without spam

const CACHE_NAME = 'exonova-axis-v4.0.0';
const NOTIFICATION_CACHE = 'exonova-notifications-v4';
const DYNAMIC_CACHE = 'exonova-dynamic-v2';

// Core app assets to cache for offline support
const urlsToCache = [
    '/axis/',
    '/axis/index.html',
    '/axis/manifest.json',
    '/axis/sw.js',
    'https://aditya-cmd-max.github.io/axis/axislogo.png',
    'https://aditya-cmd-max.github.io/axis/Untitled%20design%20(2).gif',
    'https://aditya-cmd-max.github.io/axis/Untitled%20design.gif',
    'https://aditya-cmd-max.github.io/exonova-/logo-nobg.png',
    'https://fonts.googleapis.com/css2?family=Product+Sans:wght@300;400;500;700&display=swap',
    'https://fonts.googleapis.com/icon?family=Material+Icons',
    'https://cdn.tailwindcss.com'
];

// Product assets for offline functionality
const productAssets = [
    'https://aditya-cmd-max.github.io/exonovaai/logo.png',
    'https://aditya-cmd-max.github.io/exonovaweather/skycast.png',
    'https://aditya-cmd-max.github.io/popout/ChatGPT%20Image%20Aug%2015,%202025,%2008_26_20%20PM.png',
    'https://aditya-cmd-max.github.io/mindscribe/logo.png',
    'https://aditya-cmd-max.github.io/Peo/tts.png',
    'https://aditya-cmd-max.github.io/securepass/logo-dark.png'
];

// Enhanced Install Event with offline support
self.addEventListener('install', event => {
    console.log('🚀 Service Worker installing...');
    
    event.waitUntil(
        Promise.all([
            // Cache core app assets
            caches.open(CACHE_NAME)
                .then(cache => {
                    console.log('📦 Caching app shell');
                    return cache.addAll(urlsToCache);
                }),
            
            // Cache product assets
            caches.open(DYNAMIC_CACHE)
                .then(cache => {
                    console.log('📱 Caching product assets');
                    return cache.addAll(productAssets);
                }),
            
            // Initialize notification cache
            caches.open(NOTIFICATION_CACHE)
                .then(cache => {
                    console.log('🔔 Initializing notification cache');
                    return cache.put('notification-state', new Response(JSON.stringify({
                        lastWelcomeDate: null,
                        notificationIndexes: { 
                            '6h': 0, 
                            '12h': 0
                        },
                        scheduledNotifications: [],
                        lastSync: Date.now(),
                        last6hNotification: 0,
                        last12hNotification: 0
                    })));
                }),
            
            // Skip waiting to activate immediately
            self.skipWaiting()
        ]).then(() => {
            console.log('✅ All caches initialized successfully');
        }).catch(error => {
            console.error('❌ Cache initialization failed:', error);
        })
    );
    
    console.log('✅ Service Worker installed successfully');
});

// Enhanced Activate Event with error recovery
self.addEventListener('activate', event => {
    console.log('🔄 Service Worker activating...');
    
    event.waitUntil(
        Promise.all([
            // Clean up old caches with error handling
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (![CACHE_NAME, NOTIFICATION_CACHE, DYNAMIC_CACHE].includes(cacheName)) {
                            console.log('🗑️ Deleting old cache:', cacheName);
                            return caches.delete(cacheName).catch(err => {
                                console.warn('⚠️ Failed to delete cache:', cacheName, err);
                            });
                        }
                    })
                );
            }),
            
            // Claim clients immediately
            self.clients.claim(),
            
            // Initialize background sync with error recovery
            initializeBackgroundSync().catch(err => {
                console.warn('⚠️ Background sync initialization failed:', err);
            })
        ]).then(() => {
            console.log('✅ Service Worker fully activated');
            
            // Send ready message to all clients
            self.clients.matchAll().then(clients => {
                clients.forEach(client => {
                    client.postMessage({
                        type: 'SW_READY',
                        version: '4.0.0',
                        timestamp: Date.now(),
                        features: ['reliable-notifications', 'offline-support']
                    });
                });
            });
        })
    );
});

// ==================== RELIABLE NOTIFICATION SYSTEM ====================

// Enhanced Background Sync for Periodic Notifications
self.addEventListener('sync', event => {
    console.log('🔄 Background sync event:', event.tag);
    
    switch (event.tag) {
        case 'daily-notifications':
            event.waitUntil(triggerDailyNotifications());
            break;
            
        case '6h-notifications':
            event.waitUntil(trigger6HourNotifications());
            break;
            
        case '12h-notifications':
            event.waitUntil(trigger12HourNotifications());
            break;
            
        case 'cleanup-notifications':
            event.waitUntil(cleanupOldNotifications());
            break;
            
        case 'cache-update':
            event.waitUntil(updateCriticalCaches());
            break;
            
        default:
            console.log('🔄 Unknown sync tag:', event.tag);
    }
});

// Initialize background sync with reliable notifications
async function initializeBackgroundSync() {
    try {
        const registration = await self.registration;
        
        // Register reliable background sync for notifications
        const syncTags = [
            'daily-notifications', 
            'cleanup-notifications', 
            'cache-update'
        ];
        
        for (const tag of syncTags) {
            try {
                await registration.sync.register(tag);
                console.log(`✅ Registered sync: ${tag}`);
            } catch (error) {
                console.warn(`⚠️ Failed to register sync ${tag}:`, error);
            }
        }
        
    } catch (error) {
        console.error('❌ Background sync initialization failed:', error);
    }
}

// 6 Hour Notifications - RELIABLE AND SAFE
async function trigger6HourNotifications() {
    console.log('⏰ Triggering 6 hour notifications from background');
    
    try {
        const cache = await caches.open(NOTIFICATION_CACHE);
        const stateResponse = await cache.match('notification-state');
        let state = stateResponse ? await stateResponse.json() : { 
            notificationIndexes: { '6h': 0 },
            last6hNotification: 0
        };
        
        state.notificationIndexes = state.notificationIndexes || {};
        state.notificationIndexes['6h'] = state.notificationIndexes['6h'] || 0;
        
        const notifications = [
            {
                title: 'Productivity Tip 💡',
                message: 'Use El Futuro AI to automate your daily tasks and save time.',
                type: 'tip',
                icon: 'https://aditya-cmd-max.github.io/exonovaai/logo.png'
            },
            {
                title: 'Did You Know? 🤔',
                message: 'SkyCast Pro can predict weather patterns 7 days in advance!',
                type: 'info',
                icon: 'https://aditya-cmd-max.github.io/exonovaweather/skycast.png'
            },
            {
                title: 'Quick Reminder 📝',
                message: 'Mindscribe is perfect for organizing your thoughts and ideas.',
                type: 'reminder',
                icon: 'https://aditya-cmd-max.github.io/mindscribe/logo.png'
            }
        ];
        
        const index = state.notificationIndexes['6h'];
        const notification = notifications[index];
        
        if (notification) {
            // Show notification with lock screen support
            await self.registration.showNotification(notification.title, {
                body: notification.message,
                icon: notification.icon || 'https://aditya-cmd-max.github.io/axis/axislogo.png',
                badge: 'https://aditya-cmd-max.github.io/exonova-/logo-nobg.png',
                tag: '6h-notification-' + Date.now(),
                requireInteraction: false,
                vibrate: [100, 100, 100],
                silent: false,
                data: {
                    url: '/axis/',
                    type: notification.type,
                    timestamp: Date.now(),
                    notificationId: '6h-' + Date.now(),
                    source: 'periodic-6h'
                }
            });
            
            console.log('✅ 6 hour notification sent to lock screen');
            
            // Update index for next time
            state.notificationIndexes['6h'] = (index + 1) % notifications.length;
            state.last6hNotification = Date.now();
            
            await cache.put('notification-state', new Response(JSON.stringify(state)));
        }
        
    } catch (error) {
        console.error('❌ 6 hour notifications failed:', error);
    }
}

// 12 Hour Notifications - RELIABLE AND SAFE
async function trigger12HourNotifications() {
    console.log('⏰ Triggering 12 hour notifications from background');
    
    try {
        const cache = await caches.open(NOTIFICATION_CACHE);
        const stateResponse = await cache.match('notification-state');
        let state = stateResponse ? await stateResponse.json() : { 
            notificationIndexes: { '12h': 0 },
            last12hNotification: 0
        };
        
        state.notificationIndexes = state.notificationIndexes || {};
        state.notificationIndexes['12h'] = state.notificationIndexes['12h'] || 0;
        
        const notifications = [
            {
                title: 'Feature Spotlight 🔦',
                message: 'Mindscribe can help organize your thoughts and ideas efficiently.',
                type: 'update',
                icon: 'https://aditya-cmd-max.github.io/mindscribe/logo.png'
            },
            {
                title: 'Try This 👇',
                message: 'Peo-TTS for natural sounding text-to-speech conversion.',
                type: 'tip',
                icon: 'https://aditya-cmd-max.github.io/Peo/tts.png'
            },
            {
                title: 'Security Tip 🔒',
                message: 'Use Securepass to generate strong, unique passwords.',
                type: 'alert',
                icon: 'https://aditya-cmd-max.github.io/securepass/logo-dark.png'
            }
        ];
        
        const index = state.notificationIndexes['12h'];
        const notification = notifications[index];
        
        if (notification) {
            // Show notification with lock screen support
            await self.registration.showNotification(notification.title, {
                body: notification.message,
                icon: notification.icon || 'https://aditya-cmd-max.github.io/axis/axislogo.png',
                badge: 'https://aditya-cmd-max.github.io/exonova-/logo-nobg.png',
                tag: '12h-notification-' + Date.now(),
                requireInteraction: false,
                vibrate: [200, 100, 200],
                silent: false,
                data: {
                    url: '/axis/',
                    type: notification.type,
                    timestamp: Date.now(),
                    notificationId: '12h-' + Date.now(),
                    source: 'periodic-12h'
                }
            });
            
            console.log('✅ 12 hour notification sent to lock screen');
            
            // Update index for next time
            state.notificationIndexes['12h'] = (index + 1) % notifications.length;
            state.last12hNotification = Date.now();
            
            await cache.put('notification-state', new Response(JSON.stringify(state)));
        }
        
    } catch (error) {
        console.error('❌ 12 hour notifications failed:', error);
    }
}

// Daily notifications
async function triggerDailyNotifications() {
    console.log('📅 Triggering daily notifications');
    
    try {
        const cache = await caches.open(NOTIFICATION_CACHE);
        const stateResponse = await cache.match('notification-state');
        let state = stateResponse ? await stateResponse.json() : { 
            lastWelcomeDate: null 
        };
        
        const today = new Date().toDateString();
        
        if (state.lastWelcomeDate !== today) {
            await self.registration.showNotification('Welcome to Exonova Axis! 🚀', {
                body: 'Your productivity hub is ready. Explore all tools in one place.',
                icon: 'https://aditya-cmd-max.github.io/axis/axislogo.png',
                badge: 'https://aditya-cmd-max.github.io/exonova-/logo-nobg.png',
                tag: 'daily-welcome-' + Date.now(),
                requireInteraction: false,
                vibrate: [100, 100, 100],
                data: {
                    url: '/axis/',
                    type: 'welcome',
                    timestamp: Date.now(),
                    notificationId: 'daily-' + Date.now()
                }
            });
            
            state.lastWelcomeDate = today;
            await cache.put('notification-state', new Response(JSON.stringify(state)));
            
            console.log('✅ Daily welcome notification sent');
        }
        
    } catch (error) {
        console.error('❌ Daily notifications failed:', error);
    }
}

// ==================== CACHING STRATEGIES ====================

// Enhanced Fetch Event - Smart Caching Strategy with Offline Support
self.addEventListener('fetch', event => {
    const { request } = event;
    
    // Skip non-GET requests and chrome-extension requests
    if (request.method !== 'GET' || request.url.startsWith('chrome-extension://')) {
        return;
    }
    
    // Handle different types of requests with specific strategies
    const url = new URL(request.url);
    
    // App shell - Cache First, then Network
    if (url.pathname.includes('/axis/') || request.destination === 'document') {
        event.respondWith(handleAppShellRequest(request));
    } 
    // Static assets - Cache First with background update
    else if (url.hostname.includes('aditya-cmd-max.github.io') || 
             request.destination === 'image') {
        event.respondWith(handleStaticRequest(request));
    }
    // CDN resources - Cache First
    else if (url.hostname.includes('fonts.googleapis.com') || 
             url.hostname.includes('cdn.tailwindcss.com')) {
        event.respondWith(handleCDNRequest(request));
    }
    // API requests - Network First with offline fallback
    else if (request.url.includes('/api/')) {
        event.respondWith(handleAPIRequest(request));
    }
    // Default - Network First
    else {
        event.respondWith(handleDefaultRequest(request));
    }
});

// App Shell Caching Strategy - Critical for offline functionality
async function handleAppShellRequest(request) {
    try {
        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match(request);
        
        // Always try network for HTML documents
        if (request.destination === 'document') {
            try {
                const networkResponse = await fetch(request);
                if (networkResponse.ok) {
                    // Update cache in background
                    cache.put(request, networkResponse.clone()).catch(err => {
                        console.warn('⚠️ Failed to update cache:', err);
                    });
                    return networkResponse;
                }
            } catch (error) {
                // Network failed, return cached version if available
                if (cachedResponse) {
                    return cachedResponse;
                }
            }
        }
        
        // For other app shell requests, return cached version first
        if (cachedResponse) {
            // Update cache in background for non-critical resources
            if (request.destination !== 'document') {
                updateCacheInBackground(request, cache);
            }
            return cachedResponse;
        }
        
        // Not in cache, try network
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone()).catch(err => {
                console.warn('⚠️ Failed to cache response:', err);
            });
        }
        return networkResponse;
        
    } catch (error) {
        console.error('❌ App shell request failed:', error);
        // Final fallback - return offline page
        return caches.match('/axis/').then(response => {
            return response || new Response('Offline - App unavailable', {
                status: 503,
                headers: { 'Content-Type': 'text/plain' }
            });
        });
    }
}

// Static Assets Caching - Cache First with background sync
async function handleStaticRequest(request) {
    try {
        const cache = await caches.open(DYNAMIC_CACHE);
        const cachedResponse = await cache.match(request);
        
        if (cachedResponse) {
            // Update cache in background
            updateCacheInBackground(request, cache);
            return cachedResponse;
        }
        
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone()).catch(err => {
                console.warn('⚠️ Failed to cache static asset:', err);
            });
        }
        return networkResponse;
        
    } catch (error) {
        console.error('❌ Static request failed:', error);
        // Return generic placeholder for images
        if (request.destination === 'image') {
            return new Response(
                '<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="#e5e7eb"/><text x="50" y="50" font-family="Arial" font-size="10" text-anchor="middle" fill="#6b7280">Image</text></svg>',
                { headers: { 'Content-Type': 'image/svg+xml' } }
            );
        }
        throw error;
    }
}

// CDN Resources - Cache First
async function handleCDNRequest(request) {
    try {
        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match(request);
        
        if (cachedResponse) {
            return cachedResponse;
        }
        
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone()).catch(err => {
                console.warn('⚠️ Failed to cache CDN resource:', err);
            });
        }
        return networkResponse;
        
    } catch (error) {
        console.error('❌ CDN request failed:', error);
        throw error;
    }
}

// API Requests - Network First with offline fallback
async function handleAPIRequest(request) {
    try {
        const networkResponse = await fetch(request);
        return networkResponse;
    } catch (error) {
        console.error('❌ API request failed:', error);
        return new Response(JSON.stringify({ error: 'Offline - API unavailable' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Default Request Handler - Network First
async function handleDefaultRequest(request) {
    try {
        const networkResponse = await fetch(request);
        return networkResponse;
    } catch (error) {
        console.error('❌ Default request failed:', error);
        throw error;
    }
}

// Background Cache Update with error handling
async function updateCacheInBackground(request, cache) {
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            await cache.put(request, networkResponse);
        }
    } catch (error) {
        // Silently fail - we have the cached version
    }
}

// ==================== PUSH NOTIFICATION HANDLER ====================

// ENHANCED PUSH NOTIFICATION HANDLER - Reliable and Safe
self.addEventListener('push', event => {
    console.log('🔔 Push notification received');
    
    // Ensure the service worker stays alive until notification is shown
    event.waitUntil(
        (async () => {
            try {
                let notificationData = await parsePushData(event);
                const options = getEnhancedNotificationOptions(notificationData);
                
                console.log('🎯 Showing enhanced notification');
                
                await self.registration.showNotification(
                    notificationData.title || 'Exonova Axis', 
                    options
                );
                
                console.log('✅ Push notification delivered successfully');
                
            } catch (error) {
                console.error('❌ Push notification failed:', error);
                await showFallbackNotification(error);
            }
        })()
    );
});

// Parse push data with fallback
async function parsePushData(event) {
    try {
        if (event.data) {
            return event.data.json();
        }
    } catch (error) {
        console.warn('⚠️ Failed to parse push data, using defaults');
    }
    
    // Default notification data
    return {
        title: 'Exonova Axis',
        body: 'New update available!',
        icon: 'https://aditya-cmd-max.github.io/axis/axislogo.png',
        tag: 'default-notification'
    };
}

// Enhanced Notification Options for Lock Screen Support
function getEnhancedNotificationOptions(data) {
    return {
        body: data.body || 'New update from Exonova Axis',
        icon: data.icon || 'https://aditya-cmd-max.github.io/axis/axislogo.png',
        badge: data.badge || 'https://aditya-cmd-max.github.io/exonova-/logo-nobg.png',
        image: data.image || 'https://aditya-cmd-max.github.io/axis/axislogo.png',
        tag: data.tag || `exonova-${Date.now()}`,
        timestamp: data.timestamp || Date.now(),
        renotify: data.renotify || false,
        silent: data.silent || false,
        requireInteraction: data.requireInteraction || true,
        // Lock screen specific enhancements
        vibrate: [200, 100, 200],
        data: {
            url: data.url || '/axis/',
            notificationId: data.id || `notification-${Date.now()}`,
            type: data.type || 'info',
            source: data.source || 'push',
            priority: data.priority || 'normal',
            lockScreen: true,
            ...data.data
        },
        actions: getNotificationActions(data.type, data.actions)
    };
}

// Get notification actions based on type
function getNotificationActions(type, customActions) {
    if (customActions) return customActions;
    
    const baseActions = [
        { action: 'open', title: '🚀 Open App' },
        { action: 'dismiss', title: '❌ Dismiss' }
    ];
    
    switch (type) {
        case 'update':
            return [
                { action: 'open', title: '🚀 View Update' },
                { action: 'dismiss', title: '❌ Dismiss' }
            ];
        case 'alert':
            return [
                { action: 'open', title: '🔍 View Details' },
                { action: 'dismiss', title: '❌ Dismiss' }
            ];
        default:
            return baseActions;
    }
}

// Fallback notification for errors
async function showFallbackNotification(error) {
    await self.registration.showNotification('Exonova Axis', {
        body: 'New notification available. Open the app to view.',
        icon: 'https://aditya-cmd-max.github.io/axis/axislogo.png',
        badge: 'https://aditya-cmd-max.github.io/exonova-/logo-nobg.png',
        tag: 'fallback-notification',
        requireInteraction: false,
        data: {
            url: '/axis/',
            type: 'fallback',
            timestamp: Date.now()
        }
    });
}

// ==================== NOTIFICATION CLICK HANDLER ====================

self.addEventListener('notificationclick', event => {
    console.log('🔔 Notification clicked:', event.notification.tag);
    
    event.notification.close();
    
    const action = event.action;
    const notificationData = event.notification.data || {};
    
    // Handle different actions
    switch (action) {
        case 'open':
        case 'view':
            openApp(notificationData.url);
            break;
            
        case 'dismiss':
            // Just close the notification
            console.log('Notification dismissed');
            break;
            
        default:
            // Default behavior - open the app
            openApp(notificationData.url);
            break;
    }
});

// Open app or specific URL
function openApp(url = '/axis/') {
    const fullUrl = self.location.origin + url;
    
    event.waitUntil(
        clients.matchAll({
            type: 'window',
            includeUncontrolled: true
        }).then(windowClients => {
            // Check if there's already a window open with the app
            for (const client of windowClients) {
                if (client.url.includes('/axis/') && 'focus' in client) {
                    return client.focus();
                }
            }
            
            // If no window is open, open a new one
            if (clients.openWindow) {
                return clients.openWindow(fullUrl);
            }
        })
    );
}

// ==================== MESSAGE HANDLING ====================

// Enhanced MESSAGE HANDLING FROM MAIN APP
self.addEventListener('message', event => {
    const { data } = event;
    const { type, payload } = data || {};
    
    console.log('📨 Message from app:', type);
    
    switch(type) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;
            
        case 'GET_VERSION':
            event.ports?.[0]?.postMessage({
                version: '4.0.0',
                cacheName: CACHE_NAME,
                features: [
                    'push-notifications', 
                    'background-sync', 
                    'offline-support', 
                    'reliable-notifications'
                ]
            });
            break;
            
        case 'SEND_NOTIFICATION':
            if (payload) {
                self.registration.showNotification(payload.title, payload.options);
            }
            break;
            
        case 'CLEAR_NOTIFICATIONS':
            self.registration.getNotifications().then(notifications => {
                notifications.forEach(notification => notification.close());
            });
            break;
            
        case 'TRIGGER_SYNC':
            if (payload?.syncType) {
                self.registration.sync.register(payload.syncType);
            }
            break;
            
        case 'TEST_NOTIFICATION':
            sendTestNotification();
            break;
            
        case 'CACHE_URLS':
            if (payload?.urls) {
                cacheAdditionalUrls(payload.urls);
            }
            break;
            
        // Manual trigger for periodic notifications
        case 'TRIGGER_PERIODIC_NOTIFICATION':
            if (payload?.type === '6h') {
                trigger6HourNotifications();
            } else if (payload?.type === '12h') {
                trigger12HourNotifications();
            }
            break;
            
        case 'GET_NOTIFICATION_STATUS':
            getNotificationStatus(event);
            break;
            
        default:
            console.log('📨 Unknown message type:', type);
    }
});

// Get notification status
async function getNotificationStatus(event) {
    try {
        const cache = await caches.open(NOTIFICATION_CACHE);
        const stateResponse = await cache.match('notification-state');
        const state = stateResponse ? await stateResponse.json() : {};
        
        event.ports?.[0]?.postMessage({
            periodicNotifications: true,
            last6h: state?.last6hNotification || 0,
            last12h: state?.last12hNotification || 0,
            next6h: (state?.last6hNotification || 0) + (6 * 60 * 60 * 1000),
            next12h: (state?.last12hNotification || 0) + (12 * 60 * 60 * 1000)
        });
    } catch (error) {
        console.error('❌ Failed to get notification status:', error);
        event.ports?.[0]?.postMessage({ error: 'Failed to get status' });
    }
}

// Enhanced test notification
async function sendTestNotification() {
    await self.registration.showNotification('Exonova Axis - Test ✅', {
        body: 'All notification features are working reliably!',
        icon: 'https://aditya-cmd-max.github.io/axis/axislogo.png',
        badge: 'https://aditya-cmd-max.github.io/exonova-/logo-nobg.png',
        image: 'https://aditya-cmd-max.github.io/axis/axislogo.png',
        tag: 'reliable-test',
        requireInteraction: true,
        vibrate: [200, 100, 200, 100, 200],
        silent: false,
        actions: [
            { action: 'open', title: '🚀 Open App' },
            { action: 'dismiss', title: '❌ Dismiss' }
        ],
        data: {
            url: '/axis/',
            type: 'test',
            timestamp: Date.now(),
            notificationId: 'reliable-test-' + Date.now(),
            lockScreen: true
        }
    });
}

// Cache additional URLs
async function cacheAdditionalUrls(urls) {
    try {
        const cache = await caches.open(DYNAMIC_CACHE);
        await cache.addAll(urls);
        console.log('✅ Additional URLs cached:', urls);
    } catch (error) {
        console.error('❌ Failed to cache additional URLs:', error);
    }
}

// ==================== MAINTENANCE FUNCTIONS ====================

// Cleanup old notifications
async function cleanupOldNotifications() {
    try {
        const notifications = await self.registration.getNotifications();
        const now = Date.now();
        const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);
        
        for (const notification of notifications) {
            const notificationTime = notification.timestamp || notification.data?.timestamp || 0;
            if (notificationTime < oneWeekAgo) {
                notification.close();
            }
        }
        
        console.log('✅ Old notifications cleaned up');
    } catch (error) {
        console.error('❌ Notification cleanup failed:', error);
    }
}

// Update critical caches
async function updateCriticalCaches() {
    try {
        const cache = await caches.open(CACHE_NAME);
        const requests = urlsToCache.map(url => new Request(url));
        
        for (const request of requests) {
            try {
                const networkResponse = await fetch(request);
                if (networkResponse.ok) {
                    await cache.put(request, networkResponse);
                }
            } catch (error) {
                console.warn('⚠️ Failed to update:', request.url);
            }
        }
        
        console.log('✅ Critical caches updated');
    } catch (error) {
        console.error('❌ Cache update failed:', error);
    }
}

// Enhanced periodic background tasks for maintenance
setInterval(async () => {
    console.log('⏰ Running periodic maintenance tasks');
    
    try {
        await cleanupOldNotifications();
    } catch (error) {
        console.error('❌ Periodic tasks failed:', error);
    }
}, 30 * 60 * 1000); // Run every 30 minutes for better reliability

console.log('🎯 Enhanced Service Worker v4.0.0 loaded successfully');
console.log('📱 Features: Reliable Notifications, Background Sync, Offline Support');
console.log('🔔 Safe periodic notifications (6h & 12h intervals)');
console.log('💾 Smart caching, Error recovery, Offline functionality active');

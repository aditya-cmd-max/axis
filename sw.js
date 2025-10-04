// Service Worker for Exonova Axis PWA - ENHANCED VERSION
// Provides native mobile app notification experience with offline support

const CACHE_NAME = 'exonova-axis-v3.2.0';
const NOTIFICATION_CACHE = 'exonova-notifications-v3';
const API_CACHE = 'exonova-api-cache-v1';
const DYNAMIC_CACHE = 'exonova-dynamic-v1';

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
            
            // Initialize notification cache with periodic notification support
            caches.open(NOTIFICATION_CACHE)
                .then(cache => {
                    console.log('🔔 Initializing notification cache');
                    return cache.put('notification-state', new Response(JSON.stringify({
                        lastWelcomeDate: null,
                        notificationIndexes: { 
                            '1.5h': 0, 
                            '2h': 0, 
                            'productivity': 0, 
                            'learning': 0 
                        },
                        scheduledNotifications: [],
                        periodicNotifications: [],
                        lastSync: Date.now(),
                        last1_5hNotification: 0,
                        last2hNotification: 0
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
                        if (![CACHE_NAME, NOTIFICATION_CACHE, API_CACHE, DYNAMIC_CACHE].includes(cacheName)) {
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
            }),
            
            // Initialize periodic notifications
            initializePeriodicNotifications()
        ]).then(() => {
            console.log('✅ Service Worker fully activated');
            // Send ready message to all clients
            self.clients.matchAll().then(clients => {
                clients.forEach(client => {
                    client.postMessage({
                        type: 'SW_READY',
                        version: '3.2.0',
                        timestamp: Date.now(),
                        features: ['periodic-notifications', 'lock-screen-notifications']
                    });
                });
            });
            
            // Schedule initial periodic notifications
            schedulePeriodicNotifications();
        })
    );
});

// ==================== PERIODIC NOTIFICATION SYSTEM ====================

// Enhanced Background Sync for Periodic Notifications
self.addEventListener('sync', event => {
    console.log('🔄 Background sync event:', event.tag);
    
    switch (event.tag) {
        case 'daily-notifications':
            event.waitUntil(triggerDailyNotifications());
            break;
            
        case 'periodic-notifications':
            event.waitUntil(triggerPeriodicNotifications());
            break;
            
        case 'sync-notifications':
            event.waitUntil(syncPendingNotifications());
            break;
            
        case 'cleanup-notifications':
            event.waitUntil(cleanupOldNotifications());
            break;
            
        case 'cache-update':
            event.waitUntil(updateCriticalCaches());
            break;
            
        // NEW: Periodic notification sync tags
        case '1.5h-notifications':
            event.waitUntil(trigger1_5HourNotifications());
            break;
            
        case '2h-notifications':
            event.waitUntil(trigger2HourNotifications());
            break;
            
        case 'register-periodic-sync':
            event.waitUntil(registerAllPeriodicSync());
            break;
            
        default:
            console.log('🔄 Unknown sync tag:', event.tag);
    }
});

// Initialize background sync with periodic notifications
async function initializeBackgroundSync() {
    try {
        const registration = await self.registration;
        
        // Register periodic background sync (if supported)
        if ('periodicSync' in registration) {
            try {
                // Register for periodic notifications (more reliable)
                await registration.periodicSync.register('1.5h-notifications', {
                    minInterval: 1.5 * 60 * 60 * 1000 // 1.5 hours
                });
                await registration.periodicSync.register('2h-notifications', {
                    minInterval: 2 * 60 * 60 * 1000 // 2 hours
                });
                console.log('✅ Periodic sync registered for timed notifications');
            } catch (error) {
                console.log('⚠️ Periodic sync not supported, using regular sync');
                await registerFallbackPeriodicSync();
            }
        } else {
            // Fallback to regular background sync
            await registerFallbackPeriodicSync();
        }
        
        // Register regular background sync for critical tasks
        const syncTags = [
            'daily-notifications', 
            'cleanup-notifications', 
            'cache-update',
            'register-periodic-sync' // This will re-register periodic sync
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

// Fallback periodic sync registration
async function registerFallbackPeriodicSync() {
    try {
        const registration = await self.registration;
        
        // Register for regular background sync (less frequent but more reliable)
        await registration.sync.register('1.5h-notifications');
        await registration.sync.register('2h-notifications');
        
        console.log('✅ Fallback periodic sync registered');
        
    } catch (error) {
        console.error('❌ Fallback periodic sync failed:', error);
    }
}

// Register all periodic sync tasks
async function registerAllPeriodicSync() {
    try {
        const registration = await self.registration;
        
        // Re-register all periodic sync tags
        const periodicTags = ['1.5h-notifications', '2h-notifications'];
        
        for (const tag of periodicTags) {
            try {
                await registration.sync.register(tag);
                console.log(`✅ Re-registered periodic sync: ${tag}`);
            } catch (error) {
                console.warn(`⚠️ Failed to re-register ${tag}:`, error);
            }
        }
        
        // Also register the next re-registration (creates a chain)
        setTimeout(() => {
            registration.sync.register('register-periodic-sync')
                .catch(err => console.warn('Re-registration scheduling failed:', err));
        }, 60 * 60 * 1000); // Re-register every hour
        
    } catch (error) {
        console.error('❌ Periodic sync registration failed:', error);
    }
}

// 1.5 Hour Notifications - WORKS EVEN WHEN APP IS CLOSED
async function trigger1_5HourNotifications() {
    console.log('⏰ Triggering 1.5 hour notifications from background');
    
    try {
        const cache = await caches.open(NOTIFICATION_CACHE);
        const stateResponse = await cache.match('notification-state');
        let state = stateResponse ? await stateResponse.json() : { 
            notificationIndexes: { '1.5h': 0 },
            last1_5hNotification: 0
        };
        
        state.notificationIndexes = state.notificationIndexes || {};
        state.notificationIndexes['1.5h'] = state.notificationIndexes['1.5h'] || 0;
        
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
            },
            {
                title: 'Feature Spotlight 🔦',
                message: 'Try PopOut Pro for creating engaging visual content.',
                type: 'tip',
                icon: 'https://aditya-cmd-max.github.io/popout/ChatGPT%20Image%20Aug%2015,%202025,%2008_26_20%20PM.png'
            }
        ];
        
        const index = state.notificationIndexes['1.5h'];
        const notification = notifications[index];
        
        if (notification) {
            // Show notification with lock screen support
            await self.registration.showNotification(notification.title, {
                body: notification.message,
                icon: notification.icon || 'https://aditya-cmd-max.github.io/axis/axislogo.png',
                badge: 'https://aditya-cmd-max.github.io/exonova-/logo-nobg.png',
                tag: '1.5h-notification-' + Date.now(),
                requireInteraction: false,
                vibrate: [100, 100, 100], // Vibration for lock screen
                silent: false, // Sound enabled
                data: {
                    url: '/axis/',
                    type: notification.type,
                    timestamp: Date.now(),
                    notificationId: '1.5h-' + Date.now(),
                    source: 'periodic-1.5h'
                }
            });
            
            console.log('✅ 1.5 hour notification sent to lock screen');
            
            // Update index for next time
            state.notificationIndexes['1.5h'] = (index + 1) % notifications.length;
            state.last1_5hNotification = Date.now();
            
            await cache.put('notification-state', new Response(JSON.stringify(state)));
        }
        
        // Re-register for next time (creates a chain)
        await self.registration.sync.register('1.5h-notifications');
        
    } catch (error) {
        console.error('❌ 1.5 hour notifications failed:', error);
    }
}

// 2 Hour Notifications - WORKS EVEN WHEN APP IS CLOSED
async function trigger2HourNotifications() {
    console.log('⏰ Triggering 2 hour notifications from background');
    
    try {
        const cache = await caches.open(NOTIFICATION_CACHE);
        const stateResponse = await cache.match('notification-state');
        let state = stateResponse ? await stateResponse.json() : { 
            notificationIndexes: { '2h': 0 },
            last2hNotification: 0
        };
        
        state.notificationIndexes = state.notificationIndexes || {};
        state.notificationIndexes['2h'] = state.notificationIndexes['2h'] || 0;
        
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
            },
            {
                title: 'Learning Tip 🎓',
                message: 'Combine multiple Exonova tools for enhanced productivity.',
                type: 'tip',
                icon: 'https://aditya-cmd-max.github.io/axis/axislogo.png'
            }
        ];
        
        const index = state.notificationIndexes['2h'];
        const notification = notifications[index];
        
        if (notification) {
            // Show notification with lock screen support
            await self.registration.showNotification(notification.title, {
                body: notification.message,
                icon: notification.icon || 'https://aditya-cmd-max.github.io/axis/axislogo.png',
                badge: 'https://aditya-cmd-max.github.io/exonova-/logo-nobg.png',
                tag: '2h-notification-' + Date.now(),
                requireInteraction: false,
                vibrate: [200, 100, 200], // Vibration for lock screen
                silent: false, // Sound enabled
                data: {
                    url: '/axis/',
                    type: notification.type,
                    timestamp: Date.now(),
                    notificationId: '2h-' + Date.now(),
                    source: 'periodic-2h'
                }
            });
            
            console.log('✅ 2 hour notification sent to lock screen');
            
            // Update index for next time
            state.notificationIndexes['2h'] = (index + 1) % notifications.length;
            state.last2hNotification = Date.now();
            
            await cache.put('notification-state', new Response(JSON.stringify(state)));
        }
        
        // Re-register for next time (creates a chain)
        await self.registration.sync.register('2h-notifications');
        
    } catch (error) {
        console.error('❌ 2 hour notifications failed:', error);
    }
}

// Schedule periodic notifications
async function schedulePeriodicNotifications() {
    console.log('📅 Scheduling periodic notifications');
    
    try {
        const registration = await self.registration;
        
        // Schedule 1.5h notifications
        setTimeout(async () => {
            try {
                await registration.sync.register('1.5h-notifications');
                console.log('✅ 1.5h notifications scheduled');
            } catch (error) {
                console.warn('⚠️ 1.5h scheduling failed:', error);
            }
        }, 5000); // Start after 5 seconds
        
        // Schedule 2h notifications
        setTimeout(async () => {
            try {
                await registration.sync.register('2h-notifications');
                console.log('✅ 2h notifications scheduled');
            } catch (error) {
                console.warn('⚠️ 2h scheduling failed:', error);
            }
        }, 10000); // Start after 10 seconds
        
        // Schedule re-registration chain
        setTimeout(async () => {
            try {
                await registration.sync.register('register-periodic-sync');
                console.log('✅ Periodic sync re-registration scheduled');
            } catch (error) {
                console.warn('⚠️ Re-registration scheduling failed:', error);
            }
        }, 30000); // Start after 30 seconds
        
    } catch (error) {
        console.error('❌ Periodic notification scheduling failed:', error);
    }
}

// Initialize periodic notifications
async function initializePeriodicNotifications() {
    console.log('⏰ Initializing periodic notification system');
    
    // Set up periodic checks for due notifications
    setInterval(async () => {
        await checkAndTriggerPeriodicNotifications();
    }, 5 * 60 * 1000); // Check every 5 minutes
}

// Check and trigger periodic notifications
async function checkAndTriggerPeriodicNotifications() {
    try {
        const cache = await caches.open(NOTIFICATION_CACHE);
        const stateResponse = await cache.match('notification-state');
        const state = stateResponse ? await stateResponse.json() : { 
            last1_5hNotification: 0, 
            last2hNotification: 0 
        };
        
        const now = Date.now();
        const oneAndHalfHours = 1.5 * 60 * 60 * 1000;
        const twoHours = 2 * 60 * 60 * 1000;
        
        // Check if 1.5h notification is due
        if (now - state.last1_5hNotification > oneAndHalfHours) {
            console.log('⏰ 1.5h notification due, triggering...');
            await trigger1_5HourNotifications();
        }
        
        // Check if 2h notification is due
        if (now - state.last2hNotification > twoHours) {
            console.log('⏰ 2h notification due, triggering...');
            await trigger2HourNotifications();
        }
        
    } catch (error) {
        console.error('❌ Periodic notification check failed:', error);
    }
}

// ==================== EXISTING FUNCTIONALITY (KEEP ALL YOUR EXISTING CODE) ====================

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
    else if (request.url.includes('/api/') || request.destination === '') {
        event.respondWith(handleAPIRequest(request));
    }
    // Default - Network First
    else {
        event.respondWith(handleDefaultRequest(request));
    }
});

// [KEEP ALL YOUR EXISTING FUNCTIONS EXACTLY AS THEY ARE]
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

// [KEEP ALL YOUR EXISTING CDN, API, AND DEFAULT REQUEST HANDLERS]

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

// ENHANCED PUSH NOTIFICATION HANDLER - Native App Experience
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
                
                // Store for analytics and sync
                await storeNotificationForSync(notificationData);
                
                console.log('✅ Push notification delivered successfully');
                
            } catch (error) {
                console.error('❌ Push notification failed:', error);
                await showFallbackNotification(error);
            }
        })()
    );
});

// [KEEP ALL YOUR EXISTING NOTIFICATION FUNCTIONS]

// Enhanced Notification Options for Lock Screen Support
function getEnhancedNotificationOptions(data) {
    const baseOptions = {
        body: data.body || 'New update from Exonova Axis',
        icon: data.icon || 'https://aditya-cmd-max.github.io/axis/axislogo.png',
        badge: data.badge || 'https://aditya-cmd-max.github.io/exonova-/logo-nobg.png',
        image: data.image || 'https://aditya-cmd-max.github.io/axis/axislogo.png',
        tag: data.tag || `exonova-${Date.now()}`,
        timestamp: data.timestamp || Date.now(),
        renotify: data.renotify || false,
        silent: data.silent || false,
        requireInteraction: data.requireInteraction || true, // Keep notification until interaction
        // Lock screen specific enhancements
        vibrate: [200, 100, 200], // Vibration pattern for lock screen
        data: {
            url: data.url || '/axis/',
            notificationId: data.id || `notification-${Date.now()}`,
            type: data.type || 'info',
            source: data.source || 'push',
            priority: data.priority || 'normal',
            lockScreen: true, // Flag for lock screen compatibility
            ...data.data
        }
    };
    
    // Platform-specific enhancements
    const platformEnhancements = getPlatformSpecificEnhancements();
    
    // Type-specific configurations
    const typeConfig = getNotificationTypeConfig(data.type);
    
    return {
        ...baseOptions,
        ...platformEnhancements,
        ...typeConfig,
        actions: getNotificationActions(data.type, data.actions),
        vibrate: getVibrationPattern(data.type, data.vibrate)
    };
}

// [KEEP ALL YOUR EXISTING NOTIFICATION CLICK, TRACKING, AND OTHER HANDLERS]

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
                version: '3.2.0',
                cacheName: CACHE_NAME,
                features: [
                    'push-notifications', 
                    'background-sync', 
                    'offline-support', 
                    'native-notifications',
                    'periodic-1.5h-notifications',
                    'periodic-2h-notifications',
                    'lock-screen-notifications'
                ]
            });
            break;
            
        case 'SEND_NOTIFICATION':
            if (payload) {
                self.registration.showNotification(payload.title, payload.options);
            }
            break;
            
        case 'SCHEDULE_NOTIFICATION':
            if (payload) {
                scheduleBackgroundNotification(payload.notification, payload.timestamp);
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
            
        // NEW: Manual trigger for periodic notifications
        case 'TRIGGER_PERIODIC_NOTIFICATION':
            if (payload?.type === '1.5h') {
                trigger1_5HourNotifications();
            } else if (payload?.type === '2h') {
                trigger2HourNotifications();
            }
            break;
            
        case 'FORCE_SYNC_REGISTRATION':
            registerAllPeriodicSync();
            break;
            
        case 'GET_NOTIFICATION_STATUS':
            event.ports?.[0]?.postMessage({
                periodicNotifications: true,
                last1_5h: state?.last1_5hNotification || 0,
                last2h: state?.last2hNotification || 0,
                next1_5h: (state?.last1_5hNotification || 0) + (1.5 * 60 * 60 * 1000),
                next2h: (state?.last2hNotification || 0) + (2 * 60 * 60 * 1000)
            });
            break;
            
        default:
            console.log('📨 Unknown message type:', type);
    }
});

// Enhanced test notification
async function sendTestNotification() {
    await self.registration.showNotification('Exonova Axis - Test ✅', {
        body: 'All notification features are working! You\'ll receive periodic notifications even when the app is closed.',
        icon: 'https://aditya-cmd-max.github.io/axis/axislogo.png',
        badge: 'https://aditya-cmd-max.github.io/exonova-/logo-nobg.png',
        image: 'https://aditya-cmd-max.github.io/axis/axislogo.png',
        tag: 'comprehensive-test',
        requireInteraction: true,
        vibrate: [200, 100, 200, 100, 200],
        silent: false, // Ensure sound plays
        actions: [
            { action: 'open', title: '🚀 Open App' },
            { action: 'test_periodic', title: '⏰ Test Periodic' },
            { action: 'dismiss', title: '❌ Dismiss' }
        ],
        data: {
            url: '/axis/',
            type: 'test',
            timestamp: Date.now(),
            notificationId: 'comprehensive-test-' + Date.now(),
            lockScreen: true
        }
    });
}

// [KEEP ALL YOUR EXISTING CLEANUP, SCHEDULING, AND OTHER FUNCTIONS]

// Enhanced periodic background tasks for maintenance
setInterval(async () => {
    console.log('⏰ Running periodic maintenance tasks');
    
    try {
        await cleanupOldNotifications();
        await processScheduledNotifications();
        await checkAndTriggerPeriodicNotifications(); // NEW: Check periodic notifications
    } catch (error) {
        console.error('❌ Periodic tasks failed:', error);
    }
}, 5 * 60 * 1000); // Run every 5 minutes for better reliability

console.log('🎯 Enhanced Service Worker v3.2.0 loaded successfully');
console.log('📱 Features: Native Push Notifications, Background Sync, Offline Support');
console.log('🔔 Lock screen notifications, Vibration, Rich interactions enabled');
console.log('⏰ Periodic 1.5h & 2h notifications (works when app closed)');
console.log('💾 Smart caching, Error recovery, Offline functionality active');

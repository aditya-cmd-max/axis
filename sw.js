// Service Worker for Exonova Axis PWA - ENHANCED BACKGROUND NOTIFICATIONS
// Provides reliable background notifications even when app is closed

const CACHE_NAME = 'exonova-axis-v6.0.0';
const NOTIFICATION_CACHE = 'exonova-notifications-v6';
const DYNAMIC_CACHE = 'exonova-dynamic-v4';

// Enhanced notification intervals (in milliseconds)
const NOTIFICATION_INTERVALS = {
    SHORT: 30 * 60 * 1000,      // 30 minutes
    MEDIUM: 2 * 60 * 60 * 1000, // 2 hours
    LONG: 6 * 60 * 60 * 1000,   // 6 hours
    DAILY: 24 * 60 * 60 * 1000  // 24 hours
};

// Core app assets to cache for offline support
const urlsToCache = [
    '/axis/',
    '/axis/index.html',
    '/axis/manifest.json',
    '/axis/sw.js',
    'https://aditya-cmd-max.github.io/axis/axislogo.png',
    'https://aditya-cmd-max.github.io/axis/axisrotate.gif',
    'https://aditya-cmd-max.github.io/axis/Untitled%20design.gif',
    'https://aditya-cmd-max.github.io/reverbit/logo-nobg.png',
    'https://fonts.googleapis.com/css2?family=Product+Sans:wght@300;400;500;700&display=swap',
    'https://fonts.googleapis.com/icon?family=Material+Icons',
    'https://cdn.tailwindcss.com'
];

// Product assets for offline functionality
const productAssets = [
    'https://aditya-cmd-max.github.io/cloverai/logo.png',
    'https://aditya-cmd-max.github.io/exonovaweather/skycast.png',
    'https://aditya-cmd-max.github.io/popout/ChatGPT%20Image%20Aug%2015,%202025,%2008_26_20%20PM.png',
    'https://aditya-cmd-max.github.io/mindscribe/logo.png',
    'https://aditya-cmd-max.github.io/Peo/tts.png',
    'https://aditya-cmd-max.github.io/securepass/logo-dark.png',
    'https://aditya-cmd-max.github.io/reverbit/download.png',
    'https://aditya-cmd-max.github.io/reverbit/cloverlogo.png'
];

// Enhanced notification messages with variety
const NOTIFICATION_MESSAGES = {
    SHORT: [
        {
            title: '🚀 Quick Tip',
            message: 'Use multiple Reverbit apps together for maximum productivity!',
            type: 'tip',
            icon: 'https://aditya-cmd-max.github.io/axis/axislogo.png'
        },
        {
            title: '💡 Productivity Hack',
            message: 'Try Clover AI for automating your daily tasks.',
            type: 'tip',
            icon: 'https://aditya-cmd-max.github.io/cloverai/logo.png'
        },
        {
            title: '📱 Quick Reminder',
            message: 'Your favorite apps are just a tap away in Reverbit Axis!',
            type: 'reminder',
            icon: 'https://aditya-cmd-max.github.io/axis/axislogo.png'
        }
    ],
    MEDIUM: [
        {
            title: '🌟 Feature Spotlight',
            message: 'Did you know SkyCast Pro can predict weather 7 days in advance?',
            type: 'info',
            icon: 'https://aditya-cmd-max.github.io/exonovaweather/skycast.png'
        },
        {
            title: '🎯 Productivity Tip',
            message: 'Use Mindscribe to organize your thoughts and ideas efficiently.',
            type: 'tip',
            icon: 'https://aditya-cmd-max.github.io/mindscribe/logo.png'
        },
        {
            title: '🔒 Security Check',
            message: 'Review your passwords with Securepass for better security.',
            type: 'alert',
            icon: 'https://aditya-cmd-max.github.io/securepass/logo-dark.png'
        }
    ],
    LONG: [
        {
            title: '🎉 Welcome Back!',
            message: 'Your Exonova apps are ready when you are! Explore new features.',
            type: 'welcome',
            icon: 'https://aditya-cmd-max.github.io/axis/axislogo.png'
        },
        {
            title: '📈 Progress Update',
            message: 'You\'re doing great! Continue using Exonova tools for better productivity.',
            type: 'update',
            icon: 'https://aditya-cmd-max.github.io/axis/axislogo.png'
        },
        {
            title: '🆕 New Features',
            message: 'Check out the latest updates across all Exonova applications!',
            type: 'update',
            icon: 'https://aditya-cmd-max.github.io/axis/axislogo.png'
        }
    ],
    DAILY: [
        {
            title: '🌞 Good Morning!',
            message: 'Start your day with Exonova Axis. All your tools in one place.',
            type: 'welcome',
            icon: 'https://aditya-cmd-max.github.io/axis/axislogo.png'
        },
        {
            title: '🌟 Daily Inspiration',
            message: 'Make today productive with Exonova\'s powerful tools at your fingertips.',
            type: 'motivation',
            icon: 'https://aditya-cmd-max.github.io/axis/axislogo.png'
        }
    ]
};

// Enhanced Install Event with background notification setup
self.addEventListener('install', event => {
    console.log('🚀 Service Worker installing v6.0.0 with enhanced background notifications...');
    
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
            
            // Initialize enhanced notification cache with background support
            caches.open(NOTIFICATION_CACHE)
                .then(cache => {
                    console.log('🔔 Initializing enhanced background notification system');
                    return cache.put('notification-state', new Response(JSON.stringify({
                        // Notification tracking
                        lastShortNotification: 0,
                        lastMediumNotification: 0,
                        lastLongNotification: 0,
                        lastDailyNotification: 0,
                        
                        // Index tracking for variety
                        notificationIndexes: {
                            short: 0,
                            medium: 0,
                            long: 0,
                            daily: 0
                        },
                        
                        // Statistics
                        totalNotificationsSent: 0,
                        lastNotificationTime: 0,
                        backgroundNotificationsEnabled: true,
                        
                        // Error tracking
                        lastError: null,
                        lastSuccess: Date.now(),
                        
                        // Settings
                        intervals: NOTIFICATION_INTERVALS,
                        enabled: true
                    })));
                }),
            
            // Skip waiting to activate immediately
            self.skipWaiting()
        ]).then(() => {
            console.log('✅ Enhanced background notification system initialized');
        }).catch(error => {
            console.error('❌ Installation failed:', error);
        })
    );
});

// Enhanced Activate Event with background notification scheduler
self.addEventListener('activate', event => {
    console.log('🔄 Service Worker v6.0.0 activating with background notifications...');
    
    event.waitUntil(
        Promise.all([
            // Clean up old caches
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (![CACHE_NAME, NOTIFICATION_CACHE, DYNAMIC_CACHE].includes(cacheName)) {
                            console.log('🗑️ Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            }),
            
            // Claim clients immediately
            self.clients.claim(),
            
            // Initialize background notification system
            initializeBackgroundNotificationSystem()
        ]).then(() => {
            console.log('✅ Service Worker v6.0.0 fully activated with background notifications');
            
            // Send ready message to all clients
            self.clients.matchAll().then(clients => {
                clients.forEach(client => {
                    client.postMessage({
                        type: 'SW_READY',
                        version: '6.0.0',
                        timestamp: Date.now(),
                        features: [
                            'background-notifications',
                            'enhanced-offline-support',
                            'smart-caching',
                            'periodic-updates'
                        ]
                    });
                });
            });
        })
    );
});

// ==================== ENHANCED BACKGROUND NOTIFICATION SYSTEM ====================

// Initialize background notification system
async function initializeBackgroundNotificationSystem() {
    console.log('🔄 Initializing enhanced background notification system...');
    
    try {
        // Start background notification intervals
        startBackgroundNotificationIntervals();
        
        // Send initial welcome notification
        await sendEnhancedNotification({
            title: '🚀 Exonova Axis Ready!',
            message: 'Background notifications are now active. You\'ll receive helpful tips and updates.',
            type: 'welcome',
            priority: 'high'
        });
        
        console.log('✅ Background notification system initialized successfully');
        
    } catch (error) {
        console.error('❌ Background notification system initialization failed:', error);
    }
}

// Start all background notification intervals
function startBackgroundNotificationIntervals() {
    console.log('⏰ Starting background notification intervals...');
    
    // Short interval notifications (30 minutes)
    setInterval(() => {
        triggerBackgroundNotification('SHORT');
    }, NOTIFICATION_INTERVALS.SHORT);
    
    // Medium interval notifications (2 hours)
    setInterval(() => {
        triggerBackgroundNotification('MEDIUM');
    }, NOTIFICATION_INTERVALS.MEDIUM);
    
    // Long interval notifications (6 hours)
    setInterval(() => {
        triggerBackgroundNotification('LONG');
    }, NOTIFICATION_INTERVALS.LONG);
    
    // Daily notifications (24 hours)
    setInterval(() => {
        triggerBackgroundNotification('DAILY');
    }, NOTIFICATION_INTERVALS.DAILY);
    
    console.log('✅ All background notification intervals started');
}

// Trigger background notification based on type
async function triggerBackgroundNotification(type) {
    try {
        const cache = await caches.open(NOTIFICATION_CACHE);
        const stateResponse = await cache.match('notification-state');
        const state = stateResponse ? await stateResponse.json() : {};
        
        // Check if notifications are enabled
        if (!state.enabled) {
            console.log(`⏰ ${type} notification skipped (disabled)`);
            return;
        }
        
        // Get the last notification time for this type
        const lastNotificationTime = state[`last${type}Notification`] || 0;
        const interval = NOTIFICATION_INTERVALS[type];
        const currentTime = Date.now();
        
        // Check if enough time has passed
        if (currentTime - lastNotificationTime >= interval) {
            const messages = NOTIFICATION_MESSAGES[type];
            const index = state.notificationIndexes?.[type.toLowerCase()] || 0;
            const notificationData = messages[index % messages.length];
            
            // Send the notification
            await sendEnhancedNotification({
                ...notificationData,
                priority: type === 'DAILY' ? 'high' : 'normal'
            });
            
            // Update state
            state[`last${type}Notification`] = currentTime;
            state.notificationIndexes = state.notificationIndexes || {};
            state.notificationIndexes[type.toLowerCase()] = (index + 1) % messages.length;
            state.totalNotificationsSent = (state.totalNotificationsSent || 0) + 1;
            state.lastNotificationTime = currentTime;
            state.lastSuccess = currentTime;
            
            await cache.put('notification-state', new Response(JSON.stringify(state)));
            
            console.log(`✅ ${type} background notification sent successfully`);
            
        } else {
            console.log(`⏰ ${type} notification skipped (too soon)`);
        }
        
    } catch (error) {
        console.error(`❌ ${type} background notification failed:`, error);
        await updateNotificationErrorState(error);
    }
}

// Enhanced notification sending with better options
async function sendEnhancedNotification(notificationData) {
    const options = {
        body: notificationData.message,
        icon: notificationData.icon || 'https://aditya-cmd-max.github.io/axis/axislogo.png',
        badge: 'https://aditya-cmd-max.github.io/exonova-/logo-nobg.png',
        tag: `bg-${notificationData.type}-${Date.now()}`,
        requireInteraction: notificationData.priority === 'high',
        vibrate: notificationData.priority === 'high' ? [200, 100, 200] : [100, 50, 100],
        silent: false,
        priority: notificationData.priority || 'normal',
        data: {
            url: '/axis/',
            type: notificationData.type,
            timestamp: Date.now(),
            notificationId: `bg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            source: 'background',
            priority: notificationData.priority
        },
        actions: [
            { action: 'open', title: '🚀 Open App' },
            { action: 'dismiss', title: '❌ Dismiss' }
        ]
    };

    await self.registration.showNotification(notificationData.title, options);
}

// Update notification error state
async function updateNotificationErrorState(error) {
    try {
        const cache = await caches.open(NOTIFICATION_CACHE);
        const stateResponse = await cache.match('notification-state');
        const state = stateResponse ? await stateResponse.json() : {};
        
        state.lastError = {
            message: error.message,
            timestamp: Date.now(),
            type: 'background_notification_error'
        };
        
        await cache.put('notification-state', new Response(JSON.stringify(state)));
    } catch (cacheError) {
        console.error('❌ Failed to update error state:', cacheError);
    }
}

// ==================== PUSH NOTIFICATION HANDLER ====================

self.addEventListener('push', event => {
    console.log('🔔 Push notification received');
    
    event.waitUntil(
        (async () => {
            try {
                let notificationData;
                
                if (event.data) {
                    notificationData = event.data.json();
                } else {
                    // Fallback notification
                    notificationData = {
                        title: 'Exonova Axis',
                        body: 'New update available!',
                        icon: 'https://aditya-cmd-max.github.io/axis/axislogo.png'
                    };
                }
                
                await self.registration.showNotification(notificationData.title, {
                    body: notificationData.body,
                    icon: notificationData.icon || 'https://aditya-cmd-max.github.io/axis/axislogo.png',
                    badge: 'https://aditya-cmd-max.github.io/exonova-/logo-nobg.png',
                    tag: `push-${Date.now()}`,
                    requireInteraction: true,
                    vibrate: [200, 100, 200],
                    data: {
                        url: '/axis/',
                        type: 'push',
                        timestamp: Date.now()
                    },
                    actions: [
                        { action: 'open', title: '🚀 Open App' },
                        { action: 'dismiss', title: '❌ Dismiss' }
                    ]
                });
                
                // Update notification stats
                await updateNotificationStats();
                
            } catch (error) {
                console.error('❌ Push notification failed:', error);
                
                // Fallback notification
                await self.registration.showNotification('Exonova Axis', {
                    body: 'New notification available',
                    icon: 'https://aditya-cmd-max.github.io/axis/axislogo.png'
                });
            }
        })()
    );
});

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
            console.log('Notification dismissed by user');
            break;
            
        default:
            // Default behavior - open the app
            openApp(notificationData.url);
            break;
    }
});

// Open app when notification is clicked
function openApp(url = '/axis/') {
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
                return clients.openWindow(self.location.origin + url);
            }
        })
    );
}

// ==================== MESSAGE HANDLING FROM MAIN APP ====================

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
                version: '6.0.0',
                cacheName: CACHE_NAME,
                features: [
                    'background-notifications',
                    'enhanced-offline-support',
                    'periodic-updates'
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
            
        case 'GET_NOTIFICATION_STATUS':
            getNotificationStatus(event);
            break;
            
        case 'UPDATE_NOTIFICATION_SETTINGS':
            updateNotificationSettings(payload);
            break;
            
        case 'TRIGGER_TEST_NOTIFICATION':
            triggerTestNotification();
            break;
            
        case 'ENABLE_BACKGROUND_NOTIFICATIONS':
            enableBackgroundNotifications();
            break;
            
        case 'DISABLE_BACKGROUND_NOTIFICATIONS':
            disableBackgroundNotifications();
            break;
            
        case 'GET_BACKGROUND_STATS':
            getBackgroundStats(event);
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
        
        const now = Date.now();
        
        event.ports?.[0]?.postMessage({
            backgroundNotifications: true,
            enabled: state.enabled !== false,
            lastShort: state.lastShortNotification || 0,
            lastMedium: state.lastMediumNotification || 0,
            lastLong: state.lastLongNotification || 0,
            lastDaily: state.lastDailyNotification || 0,
            totalSent: state.totalNotificationsSent || 0,
            nextShort: (state.lastShortNotification || 0) + NOTIFICATION_INTERVALS.SHORT,
            nextMedium: (state.lastMediumNotification || 0) + NOTIFICATION_INTERVALS.MEDIUM,
            nextLong: (state.lastLongNotification || 0) + NOTIFICATION_INTERVALS.LONG,
            nextDaily: (state.lastDailyNotification || 0) + NOTIFICATION_INTERVALS.DAILY,
            lastError: state.lastError,
            lastSuccess: state.lastSuccess
        });
    } catch (error) {
        console.error('❌ Failed to get notification status:', error);
        event.ports?.[0]?.postMessage({ error: 'Failed to get status' });
    }
}

// Update notification settings
async function updateNotificationSettings(settings) {
    try {
        const cache = await caches.open(NOTIFICATION_CACHE);
        const stateResponse = await cache.match('notification-state');
        const state = stateResponse ? await stateResponse.json() : {};
        
        if (settings.enabled !== undefined) {
            state.enabled = settings.enabled;
        }
        
        await cache.put('notification-state', new Response(JSON.stringify(state)));
        
        console.log('✅ Notification settings updated:', settings);
    } catch (error) {
        console.error('❌ Failed to update notification settings:', error);
    }
}

// Trigger test notification
async function triggerTestNotification() {
    await self.registration.showNotification('Exonova Axis - Test ✅', {
        body: 'Background notifications are working perfectly!',
        icon: 'https://aditya-cmd-max.github.io/axis/axislogo.png',
        badge: 'https://aditya-cmd-max.github.io/exonova-/logo-nobg.png',
        tag: 'test-notification',
        requireInteraction: true,
        vibrate: [200, 100, 200],
        data: {
            url: '/axis/',
            type: 'test',
            timestamp: Date.now()
        },
        actions: [
            { action: 'open', title: '🚀 Open App' },
            { action: 'dismiss', title: '❌ Dismiss' }
        ]
    });
}

// Enable background notifications
async function enableBackgroundNotifications() {
    try {
        const cache = await caches.open(NOTIFICATION_CACHE);
        const stateResponse = await cache.match('notification-state');
        const state = stateResponse ? await stateResponse.json() : {};
        
        state.enabled = true;
        state.backgroundNotificationsEnabled = true;
        
        await cache.put('notification-state', new Response(JSON.stringify(state)));
        
        console.log('✅ Background notifications enabled');
        
        // Send confirmation notification
        await sendEnhancedNotification({
            title: '🔔 Notifications Enabled',
            message: 'Background notifications are now active. You\'ll receive helpful tips and updates.',
            type: 'settings',
            priority: 'normal'
        });
        
    } catch (error) {
        console.error('❌ Failed to enable background notifications:', error);
    }
}

// Disable background notifications
async function disableBackgroundNotifications() {
    try {
        const cache = await caches.open(NOTIFICATION_CACHE);
        const stateResponse = await cache.match('notification-state');
        const state = stateResponse ? await stateResponse.json() : {};
        
        state.enabled = false;
        state.backgroundNotificationsEnabled = false;
        
        await cache.put('notification-state', new Response(JSON.stringify(state)));
        
        console.log('✅ Background notifications disabled');
        
    } catch (error) {
        console.error('❌ Failed to disable background notifications:', error);
    }
}

// Get background statistics
async function getBackgroundStats(event) {
    try {
        const cache = await caches.open(NOTIFICATION_CACHE);
        const stateResponse = await cache.match('notification-state');
        const state = stateResponse ? await stateResponse.json() : {};
        
        event.ports?.[0]?.postMessage({
            totalNotificationsSent: state.totalNotificationsSent || 0,
            backgroundEnabled: state.enabled !== false,
            lastNotificationTime: state.lastNotificationTime || 0,
            lastError: state.lastError,
            intervals: NOTIFICATION_INTERVALS
        });
    } catch (error) {
        console.error('❌ Failed to get background stats:', error);
        event.ports?.[0]?.postMessage({ error: 'Failed to get stats' });
    }
}

// Update notification statistics
async function updateNotificationStats() {
    try {
        const cache = await caches.open(NOTIFICATION_CACHE);
        const stateResponse = await cache.match('notification-state');
        const state = stateResponse ? await stateResponse.json() : {};
        
        state.totalNotificationsSent = (state.totalNotificationsSent || 0) + 1;
        state.lastNotificationTime = Date.now();
        
        await cache.put('notification-state', new Response(JSON.stringify(state)));
    } catch (error) {
        console.error('❌ Failed to update notification stats:', error);
    }
}

// ==================== CACHING STRATEGIES ====================

self.addEventListener('fetch', event => {
    const { request } = event;
    
    // Skip non-GET requests
    if (request.method !== 'GET') return;
    
    const url = new URL(request.url);
    
    // App shell - Cache First
    if (url.pathname.includes('/axis/') || request.destination === 'document') {
        event.respondWith(handleAppShellRequest(request));
    } 
    // Static assets - Cache First
    else if (url.hostname.includes('aditya-cmd-max.github.io') || 
             request.destination === 'image') {
        event.respondWith(handleStaticRequest(request));
    }
    // CDN resources - Cache First
    else if (url.hostname.includes('fonts.googleapis.com') || 
             url.hostname.includes('cdn.tailwindcss.com')) {
        event.respondWith(handleCDNRequest(request));
    }
    // Default - Network First
    else {
        event.respondWith(handleDefaultRequest(request));
    }
});

// App shell caching strategy
async function handleAppShellRequest(request) {
    try {
        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match(request);
        
        if (cachedResponse) {
            // Update cache in background
            fetch(request).then(networkResponse => {
                if (networkResponse.ok) {
                    cache.put(request, networkResponse);
                }
            }).catch(() => {}); // Silent fail for background update
            
            return cachedResponse;
        }
        
        // If not in cache, try network
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
        
    } catch (error) {
        // Fallback to cache if network fails
        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match(request);
        return cachedResponse || new Response('Network error', { status: 408 });
    }
}

// Static assets caching strategy
async function handleStaticRequest(request) {
    try {
        const cache = await caches.open(DYNAMIC_CACHE);
        const cachedResponse = await cache.match(request);
        
        if (cachedResponse) {
            return cachedResponse;
        }
        
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
        
    } catch (error) {
        const cache = await caches.open(DYNAMIC_CACHE);
        const cachedResponse = await cache.match(request);
        return cachedResponse || new Response('Network error', { status: 408 });
    }
}

// CDN resources caching strategy
async function handleCDNRequest(request) {
    try {
        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match(request);
        
        if (cachedResponse) {
            return cachedResponse;
        }
        
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
        
    } catch (error) {
        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match(request);
        return cachedResponse || new Response('Network error', { status: 408 });
    }
}

// Default caching strategy
async function handleDefaultRequest(request) {
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
        
    } catch (error) {
        const cache = await caches.open(DYNAMIC_CACHE);
        const cachedResponse = await cache.match(request);
        return cachedResponse || new Response('Network error', { status: 408 });
    }
}

// ==================== PERIODIC MAINTENANCE ====================

// Periodic cleanup and health checks
setInterval(async () => {
    console.log('⏰ Running periodic maintenance tasks');
    
    try {
        // Clean up old notifications
        const notifications = await self.registration.getNotifications();
        const now = Date.now();
        const oneDayAgo = now - (24 * 60 * 60 * 1000);
        
        for (const notification of notifications) {
            const notificationTime = notification.timestamp || notification.data?.timestamp || 0;
            if (notificationTime < oneDayAgo) {
                notification.close();
            }
        }
        
        // Update critical caches
        await updateCriticalCaches();
        
    } catch (error) {
        console.error('❌ Periodic maintenance failed:', error);
    }
}, 60 * 60 * 1000); // Run every hour

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
    } catch (error) {
        console.error('❌ Cache update failed:', error);
    }
}

console.log('🎯 Enhanced Service Worker v6.0.0 loaded successfully');
console.log('📱 Features: Background Notifications, Enhanced Caching, Offline Support');
console.log('🔔 Background notifications active with intervals: 30min, 2h, 6h, 24h');
console.log('💾 Smart caching strategies enabled');

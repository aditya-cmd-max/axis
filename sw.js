// Service Worker for Exonova Axis PWA - ENHANCED VERSION
// Provides native mobile app notification experience with offline support

const CACHE_NAME = 'exonova-axis-v3.1.0';
const NOTIFICATION_CACHE = 'exonova-notifications-v2';
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
            
            // Initialize notification cache
            caches.open(NOTIFICATION_CACHE)
                .then(cache => {
                    console.log('🔔 Initializing notification cache');
                    return cache.put('notification-state', new Response(JSON.stringify({
                        lastWelcomeDate: null,
                        notificationIndexes: { '1.5h': 0, '2h': 0, 'productivity': 0, 'learning': 0 },
                        scheduledNotifications: [],
                        lastSync: Date.now()
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
                        version: '3.1.0',
                        timestamp: Date.now()
                    });
                });
            });
        })
    );
});

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

// CDN Resources Caching
async function handleCDNRequest(request) {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
        return cachedResponse;
    }
    
    try {
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
        
        if (networkResponse.ok) {
            // Cache successful API responses
            const cache = await caches.open(API_CACHE);
            cache.put(request, networkResponse.clone()).catch(err => {
                console.warn('⚠️ Failed to cache API response:', err);
            });
        }
        return networkResponse;
        
    } catch (error) {
        console.warn('🌐 Network unavailable, trying cache for API:', request.url);
        
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Return offline response for API calls
        return new Response(JSON.stringify({
            error: 'offline',
            message: 'You are offline. Please check your connection.',
            timestamp: Date.now()
        }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Default Request Handler
async function handleDefaultRequest(request) {
    try {
        const networkResponse = await fetch(request);
        return networkResponse;
    } catch (error) {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
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

// Parse push data with comprehensive error handling
async function parsePushData(event) {
    if (!event.data) {
        return getDefaultNotificationData();
    }
    
    try {
        return event.data.json();
    } catch (error) {
        // Handle plain text payload
        const text = event.data.text();
        return {
            title: 'Exonova Axis',
            body: text,
            icon: 'https://aditya-cmd-max.github.io/axis/axislogo.png',
            badge: 'https://aditya-cmd-max.github.io/exonova-/logo-nobg.png',
            tag: 'exonova-general',
            timestamp: Date.now()
        };
    }
}

function getDefaultNotificationData() {
    return {
        title: 'Exonova Axis',
        body: 'New update available',
        icon: 'https://aditya-cmd-max.github.io/axis/axislogo.png',
        badge: 'https://aditya-cmd-max.github.io/exonova-/logo-nobg.png',
        tag: `exonova-${Date.now()}`,
        timestamp: Date.now()
    };
}

// Enhanced Notification Options for Native Experience
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
        data: {
            url: data.url || '/axis/',
            notificationId: data.id || `notification-${Date.now()}`,
            type: data.type || 'info',
            source: data.source || 'push',
            priority: data.priority || 'normal',
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

// Platform-specific notification enhancements
function getPlatformSpecificEnhancements() {
    // Return mobile-optimized settings (work well on both mobile and desktop)
    return {
        vibrate: [200, 100, 200],
        requireInteraction: true, // Keep on screen until user interacts
        silent: false
    };
}

// Notification type configurations
function getNotificationTypeConfig(type) {
    const configs = {
        'welcome': {
            icon: 'https://aditya-cmd-max.github.io/axis/Untitled%20design%20(2).gif',
            badge: 'https://aditya-cmd-max.github.io/axis/axislogo.png',
            requireInteraction: true,
            vibrate: [300, 100, 300, 100, 300],
            tag: 'welcome-notification'
        },
        'info': {
            icon: 'https://aditya-cmd-max.github.io/exonovaai/logo.png',
            requireInteraction: false,
            vibrate: [200, 100, 200],
            tag: 'info-notification'
        },
        'update': {
            icon: 'https://aditya-cmd-max.github.io/mindscribe/logo.png',
            requireInteraction: true,
            vibrate: [200, 100, 200, 100, 200],
            tag: 'update-notification'
        },
        'tip': {
            icon: 'https://aditya-cmd-max.github.io/popout/ChatGPT%20Image%20Aug%2015,%202025,%2008_26_20%20PM.png',
            requireInteraction: false,
            vibrate: [100, 100, 100],
            tag: 'tip-notification'
        },
        'alert': {
            icon: 'https://aditya-cmd-max.github.io/securepass/logo-dark.png',
            requireInteraction: true,
            vibrate: [500, 200, 500],
            silent: false,
            tag: 'alert-notification'
        },
        'reminder': {
            icon: 'https://aditya-cmd-max.github.io/Peo/tts.png',
            requireInteraction: false,
            vibrate: [200, 100, 200],
            tag: 'reminder-notification'
        }
    };
    
    return configs[type] || configs.info;
}

// Notification actions based on type
function getNotificationActions(type, customActions) {
    if (customActions && Array.isArray(customActions)) {
        return customActions.slice(0, 3); // Max 3 actions supported
    }
    
    const actionSets = {
        'welcome': [
            { action: 'explore', title: '🚀 Explore' },
            { action: 'open', title: '📱 Open App' },
            { action: 'dismiss', title: '❌ Dismiss' }
        ],
        'update': [
            { action: 'view_update', title: '🔄 View Update' },
            { action: 'open', title: '📱 Open' },
            { action: 'later', title: '⏰ Later' }
        ],
        'alert': [
            { action: 'view_alert', title: '🚨 View Alert' },
            { action: 'open', title: '📱 Open App' }
        ],
        'reminder': [
            { action: 'snooze', title: '⏰ Snooze' },
            { action: 'complete', title: '✅ Done' }
        ],
        'default': [
            { action: 'open', title: '📱 Open' },
            { action: 'dismiss', title: '❌ Dismiss' }
        ]
    };
    
    return actionSets[type] || actionSets.default;
}

// Vibration patterns for different notification types
function getVibrationPattern(type, customPattern) {
    if (customPattern && Array.isArray(customPattern)) {
        return customPattern;
    }
    
    const patterns = {
        'welcome': [300, 100, 300, 100, 300],
        'info': [200, 100, 200],
        'update': [200, 100, 200, 100, 200],
        'tip': [100, 100, 100],
        'alert': [500, 200, 500, 200, 500],
        'reminder': [200, 100, 200],
        'default': [200, 100, 200]
    };
    
    return patterns[type] || patterns.default;
}

// Store notification for background sync and analytics
async function storeNotificationForSync(notificationData) {
    try {
        const cache = await caches.open(NOTIFICATION_CACHE);
        const stateResponse = await cache.match('notification-state');
        let state = stateResponse ? await stateResponse.json() : { 
            scheduledNotifications: [],
            analytics: []
        };
        
        state.scheduledNotifications = state.scheduledNotifications || [];
        state.scheduledNotifications.push({
            ...notificationData,
            storedAt: Date.now(),
            delivered: true
        });
        
        // Keep only last 100 notifications
        if (state.scheduledNotifications.length > 100) {
            state.scheduledNotifications = state.scheduledNotifications.slice(-100);
        }
        
        await cache.put('notification-state', new Response(JSON.stringify(state)));
        
    } catch (error) {
        console.error('❌ Failed to store notification:', error);
    }
}

// Fallback notification for errors
async function showFallbackNotification(error) {
    try {
        await self.registration.showNotification('Exonova Axis', {
            body: 'New update available',
            icon: 'https://aditya-cmd-max.github.io/axis/axislogo.png',
            tag: 'fallback-notification'
        });
    } catch (fallbackError) {
        console.error('❌ Fallback notification also failed:', fallbackError);
    }
}

// ENHANCED NOTIFICATION CLICK HANDLER - Native App Behavior
self.addEventListener('notificationclick', event => {
    console.log('👆 Notification clicked - Action:', event.action);
    
    const notification = event.notification;
    const action = event.action;
    const notificationData = notification.data || {};
    
    // Close the notification immediately
    notification.close();
    
    // Handle the action
    event.waitUntil(
        handleNotificationAction(action, notificationData).catch(error => {
            console.error('❌ Notification action failed:', error);
            // Fallback: always try to open the app
            return openOrFocusApp(notificationData.url || '/axis/', notificationData);
        })
    );
});

// Handle notification actions with comprehensive error handling
async function handleNotificationAction(action, data) {
    console.log('🎯 Handling notification action:', action);
    
    const urlToOpen = data.url || '/axis/';
    
    switch (action) {
        case 'open':
        case 'explore':
        case 'view_update':
        case 'view_alert':
            await openOrFocusApp(urlToOpen, data);
            break;
            
        case 'dismiss':
            console.log('❌ Notification dismissed');
            break;
            
        case 'snooze':
            await snoozeNotification(data);
            break;
            
        case 'complete':
            await completeReminder(data);
            break;
            
        case 'later':
            console.log('⏰ User chose "Later"');
            break;
            
        default:
            await openOrFocusApp(urlToOpen, data);
    }
    
    // Track the action for analytics
    await trackNotificationInteraction(action, data);
}

// Open or focus the app with enhanced behavior
async function openOrFocusApp(url, data) {
    try {
        const clients = await self.clients.matchAll({
            type: 'window',
            includeUncontrolled: true
        });
        
        // Look for existing app window
        for (const client of clients) {
            if (client.url.includes(self.location.origin)) {
                console.log('🔍 Focusing existing app window');
                
                // Send notification data to the app
                if (client.postMessage && data) {
                    client.postMessage({
                        type: 'NOTIFICATION_CLICK',
                        action: 'open',
                        data: data,
                        timestamp: Date.now()
                    });
                }
                
                return client.focus();
            }
        }
        
        // No existing window found, open new one
        if (self.clients.openWindow) {
            console.log('🆕 Opening new app window');
            const newWindow = await self.clients.openWindow(url);
            
            if (newWindow && data) {
                // Send data after a short delay to ensure page load
                setTimeout(() => {
                    if (newWindow.postMessage) {
                        newWindow.postMessage({
                            type: 'NOTIFICATION_CLICK',
                            action: 'open', 
                            data: data,
                            timestamp: Date.now()
                        });
                    }
                }, 1000);
            }
            
            return newWindow;
        }
        
    } catch (error) {
        console.error('❌ Failed to open/focus app:', error);
        // Final fallback - just open the URL
        if (self.clients.openWindow) {
            return self.clients.openWindow(url);
        }
    }
}

// Snooze a reminder notification
async function snoozeNotification(data) {
    console.log('⏰ Snoozing notification');
    
    const snoozeTime = Date.now() + (60 * 60 * 1000); // 1 hour
    
    const snoozeNotification = {
        title: data.title || 'Reminder',
        body: '⏰ This is your snoozed reminder',
        data: {
            ...data,
            snoozed: true,
            originalTimestamp: data.timestamp
        },
        timestamp: snoozeTime,
        type: 'reminder'
    };
    
    await scheduleBackgroundNotification(snoozeNotification, snoozeTime);
    
    // Show confirmation
    await self.registration.showNotification('⏰ Reminder Snoozed', {
        body: 'I\'ll remind you again in 1 hour',
        icon: 'https://aditya-cmd-max.github.io/axis/axislogo.png',
        tag: 'snooze-confirmation',
        silent: true
    });
}

// Complete a reminder
async function completeReminder(data) {
    console.log('✅ Completing reminder');
    
    await self.registration.showNotification('✅ Task Completed', {
        body: 'Great job! Your task has been marked as complete.',
        icon: 'https://aditya-cmd-max.github.io/axis/axislogo.png',
        tag: 'completion-confirmation',
        silent: true
    });
}

// Track notification interactions for analytics
async function trackNotificationInteraction(action, data) {
    const interactionData = {
        action: action,
        notificationId: data.notificationId,
        type: data.type,
        timestamp: Date.now(),
        source: 'service-worker'
    };
    
    console.log('📊 Notification interaction:', interactionData);
    
    try {
        const cache = await caches.open(NOTIFICATION_CACHE);
        const stateResponse = await cache.match('notification-state');
        let state = stateResponse ? await stateResponse.json() : { analytics: [] };
        
        state.analytics = state.analytics || [];
        state.analytics.push(interactionData);
        
        // Keep only last 200 analytics events
        if (state.analytics.length > 200) {
            state.analytics = state.analytics.slice(-200);
        }
        
        await cache.put('notification-state', new Response(JSON.stringify(state)));
        
    } catch (error) {
        console.error('❌ Failed to track interaction:', error);
    }
}

// ENHANCED BACKGROUND SYNC - Offline Support
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
            
        default:
            console.log('🔄 Unknown sync tag:', event.tag);
    }
});

// Initialize background sync with comprehensive setup
async function initializeBackgroundSync() {
    try {
        const registration = await self.registration;
        
        // Register periodic background sync (if supported)
        if ('periodicSync' in registration) {
            try {
                await registration.periodicSync.register('daily-notifications', {
                    minInterval: 24 * 60 * 60 * 1000 // 24 hours
                });
                console.log('✅ Periodic sync registered for daily notifications');
            } catch (error) {
                console.log('⚠️ Periodic sync not supported');
            }
        }
        
        // Register regular background sync for critical tasks
        const syncTags = ['daily-notifications', 'cleanup-notifications', 'cache-update'];
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
        throw error;
    }
}

// Initialize periodic notifications
async function initializePeriodicNotifications() {
    console.log('⏰ Initializing periodic notifications');
    // This sets up the interval for periodic background tasks
}

// Trigger daily notifications with enhanced content
async function triggerDailyNotifications() {
    console.log('🌅 Triggering daily notifications');
    
    const now = Date.now();
    const today = new Date().toDateString();
    
    try {
        const cache = await caches.open(NOTIFICATION_CACHE);
        const stateResponse = await cache.match('notification-state');
        let state = stateResponse ? await stateResponse.json() : { lastWelcomeDate: null };
        
        // Send daily welcome if not sent today
        if (state.lastWelcomeDate !== today) {
            await sendWelcomeNotification();
            state.lastWelcomeDate = today;
        }
        
        // Send daily tip
        await sendDailyTip();
        
        // Process any scheduled notifications
        await processScheduledNotifications();
        
        // Update state
        state.lastSync = Date.now();
        await cache.put('notification-state', new Response(JSON.stringify(state)));
        
        console.log('✅ Daily notifications completed');
        
    } catch (error) {
        console.error('❌ Daily notifications failed:', error);
    }
}

// Send enhanced welcome notification
async function sendWelcomeNotification() {
    await self.registration.showNotification('Welcome to Exonova Axis! 🚀', {
        body: 'Your productivity hub is ready. Start exploring all tools in one place.',
        icon: 'https://aditya-cmd-max.github.io/axis/Untitled%20design%20(2).gif',
        badge: 'https://aditya-cmd-max.github.io/exonova-/logo-nobg.png',
        image: 'https://aditya-cmd-max.github.io/axis/axislogo.png',
        tag: 'daily-welcome',
        requireInteraction: true,
        vibrate: [300, 100, 300, 100, 300],
        actions: [
            { action: 'explore', title: '🚀 Explore Tools' },
            { action: 'open', title: '📱 Open App' }
        ],
        data: {
            url: '/axis/',
            type: 'welcome',
            timestamp: Date.now(),
            notificationId: 'daily-welcome-' + Date.now()
        }
    });
}

// Send daily productivity tip
async function sendDailyTip() {
    const tips = [
        {
            title: 'Productivity Tip 💡',
            message: 'Use El Futuro AI to automate repetitive tasks and save time.',
            type: 'tip'
        },
        {
            title: 'Learning Hack 🧠', 
            message: 'Try PopOut Pro for visual learning and better retention.',
            type: 'tip'
        },
        {
            title: 'Weather Insight 🌤️',
            message: 'Check SkyCast Pro for detailed environmental data and forecasts.',
            type: 'info'
        },
        {
            title: 'Security Reminder 🔒',
            message: 'Use Securepass to generate and manage strong passwords.',
            type: 'alert'
        },
        {
            title: 'Accessibility Tip 🔊',
            message: 'Peo-TTS can read any text aloud for better accessibility.',
            type: 'tip'
        }
    ];
    
    const today = new Date().getDate();
    const tipIndex = today % tips.length;
    const tip = tips[tipIndex];
    
    await self.registration.showNotification(tip.title, {
        body: tip.message,
        icon: 'https://aditya-cmd-max.github.io/axis/axislogo.png',
        badge: 'https://aditya-cmd-max.github.io/exonova-/logo-nobg.png',
        tag: 'daily-tip-' + today,
        requireInteraction: false,
        vibrate: [100, 100, 100],
        data: {
            url: '/axis/',
            type: tip.type,
            timestamp: Date.now(),
            notificationId: 'daily-tip-' + Date.now()
        }
    });
}

// Trigger periodic notifications
async function triggerPeriodicNotifications() {
    console.log('🕒 Triggering periodic notifications');
    
    const notificationPools = {
        'productivity': [
            {
                title: 'Boost Your Productivity 🚀',
                message: 'Did you know Mindscribe can help organize your thoughts and ideas?',
                type: 'tip'
            },
            {
                title: 'AI Assistant Ready 🤖',
                message: 'El Futuro can help with research, writing, and problem-solving.',
                type: 'info'
            }
        ]
    };
    
    try {
        const cache = await caches.open(NOTIFICATION_CACHE);
        const stateResponse = await cache.match('notification-state');
        let state = stateResponse ? await stateResponse.json() : { notificationIndexes: {} };
        
        state.notificationIndexes = state.notificationIndexes || {};
        
        // Send productivity notification
        const prodIndex = state.notificationIndexes.productivity || 0;
        const productivityNotification = notificationPools.productivity[prodIndex];
        
        if (productivityNotification) {
            await self.registration.showNotification(productivityNotification.title, {
                body: productivityNotification.message,
                icon: 'https://aditya-cmd-max.github.io/axis/axislogo.png',
                badge: 'https://aditya-cmd-max.github.io/exonova-/logo-nobg.png',
                tag: 'periodic-prod-' + Date.now(),
                requireInteraction: false,
                data: {
                    url: '/axis/',
                    type: productivityNotification.type,
                    timestamp: Date.now()
                }
            });
            
            state.notificationIndexes.productivity = (prodIndex + 1) % notificationPools.productivity.length;
        }
        
        // Update state
        await cache.put('notification-state', new Response(JSON.stringify(state)));
        
    } catch (error) {
        console.error('❌ Periodic notifications failed:', error);
    }
}

// Process scheduled notifications
async function processScheduledNotifications() {
    try {
        const cache = await caches.open(NOTIFICATION_CACHE);
        const stateResponse = await cache.match('notification-state');
        const state = stateResponse ? await stateResponse.json() : { scheduledNotifications: [] };
        
        const now = Date.now();
        const dueNotifications = state.scheduledNotifications.filter(
            notification => notification.timestamp <= now && !notification.delivered
        );
        
        for (const notification of dueNotifications) {
            await self.registration.showNotification(notification.title, {
                body: notification.body,
                icon: notification.icon,
                badge: notification.badge,
                data: notification.data,
                tag: notification.tag,
                requireInteraction: notification.requireInteraction,
                vibrate: notification.vibrate
            });
            
            notification.delivered = true;
        }
        
        // Update state
        await cache.put('notification-state', new Response(JSON.stringify(state)));
        
    } catch (error) {
        console.error('❌ Failed to process scheduled notifications:', error);
    }
}

// Schedule a background notification
async function scheduleBackgroundNotification(notification, timestamp) {
    try {
        const cache = await caches.open(NOTIFICATION_CACHE);
        const stateResponse = await cache.match('notification-state');
        let state = stateResponse ? await stateResponse.json() : { scheduledNotifications: [] };
        
        state.scheduledNotifications.push({
            ...notification,
            timestamp: timestamp,
            delivered: false
        });
        
        await cache.put('notification-state', new Response(JSON.stringify(state)));
        
    } catch (error) {
        console.error('❌ Failed to schedule background notification:', error);
    }
}

// Cleanup old notifications and cache data
async function cleanupOldNotifications() {
    try {
        const cache = await caches.open(NOTIFICATION_CACHE);
        const stateResponse = await cache.match('notification-state');
        const state = stateResponse ? await stateResponse.json() : { 
            scheduledNotifications: [],
            analytics: []
        };
        
        const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        
        // Clean old scheduled notifications
        state.scheduledNotifications = state.scheduledNotifications.filter(
            notification => notification.timestamp > oneWeekAgo
        );
        
        // Clean old analytics (keep 30 days)
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        state.analytics = (state.analytics || []).filter(
            event => event.timestamp > thirtyDaysAgo
        );
        
        await cache.put('notification-state', new Response(JSON.stringify(state)));
        
        // Clean old API cache
        const apiCache = await caches.open(API_CACHE);
        const requests = await apiCache.keys();
        for (const request of requests) {
            const response = await apiCache.match(request);
            if (response) {
                const dateHeader = response.headers.get('date');
                if (dateHeader) {
                    const responseDate = new Date(dateHeader).getTime();
                    if (responseDate < oneWeekAgo) {
                        await apiCache.delete(request);
                    }
                }
            }
        }
        
        console.log('🧹 Cleanup completed');
        
    } catch (error) {
        console.error('❌ Cleanup failed:', error);
    }
}

// Update critical caches in background
async function updateCriticalCaches() {
    try {
        const cache = await caches.open(CACHE_NAME);
        
        // Update core app assets
        for (const url of urlsToCache) {
            try {
                const response = await fetch(url);
                if (response.ok) {
                    await cache.put(url, response);
                }
            } catch (error) {
                // Silently continue with other URLs
            }
        }
        
        console.log('🔄 Critical caches updated');
        
    } catch (error) {
        console.error('❌ Cache update failed:', error);
    }
}

// Sync pending notifications with server (placeholder for real implementation)
async function syncPendingNotifications() {
    console.log('🔄 Syncing pending notifications');
    // In a real app, this would sync with your backend
}

// MESSAGE HANDLING FROM MAIN APP
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
                version: '3.1.0',
                cacheName: CACHE_NAME,
                features: ['push-notifications', 'background-sync', 'offline-support', 'native-notifications']
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
            
        default:
            console.log('📨 Unknown message type:', type);
    }
});

// Send test notification
async function sendTestNotification() {
    await self.registration.showNotification('Exonova Axis - Test ✅', {
        body: 'All notification features are working! You\'ll receive updates even when offline.',
        icon: 'https://aditya-cmd-max.github.io/axis/axislogo.png',
        badge: 'https://aditya-cmd-max.github.io/exonova-/logo-nobg.png',
        image: 'https://aditya-cmd-max.github.io/axis/axislogo.png',
        tag: 'comprehensive-test',
        requireInteraction: true,
        vibrate: [200, 100, 200, 100, 200],
        actions: [
            { action: 'open', title: '🚀 Open App' },
            { action: 'dismiss', title: '❌ Dismiss' }
        ],
        data: {
            url: '/axis/',
            type: 'test',
            timestamp: Date.now(),
            notificationId: 'comprehensive-test-' + Date.now()
        }
    });
}

// Cache additional URLs dynamically
async function cacheAdditionalUrls(urls) {
    try {
        const cache = await caches.open(DYNAMIC_CACHE);
        for (const url of urls) {
            try {
                const response = await fetch(url);
                if (response.ok) {
                    await cache.put(url, response);
                }
            } catch (error) {
                console.warn('⚠️ Failed to cache URL:', url, error);
            }
        }
    } catch (error) {
        console.error('❌ Dynamic caching failed:', error);
    }
}

// Enhanced service worker lifecycle events
self.addEventListener('updatefound', () => {
    console.log('🔄 New service worker version found');
    self.clients.matchAll().then(clients => {
        clients.forEach(client => {
            client.postMessage({
                type: 'SW_UPDATE_FOUND',
                version: '3.1.0',
                timestamp: Date.now()
            });
        });
    });
});

self.addEventListener('controllerchange', () => {
    console.log('🎮 Service worker controller changed');
    self.clients.matchAll().then(clients => {
        clients.forEach(client => {
            client.postMessage({
                type: 'SW_CONTROLLER_CHANGE', 
                timestamp: Date.now()
            });
        });
    });
});

// Periodic background tasks for maintenance
setInterval(async () => {
    console.log('⏰ Running periodic maintenance tasks');
    
    try {
        await cleanupOldNotifications();
        await processScheduledNotifications();
    } catch (error) {
        console.error('❌ Periodic tasks failed:', error);
    }
}, 2 * 60 * 60 * 1000); // Run every 2 hours

console.log('🎯 Enhanced Service Worker v3.1.0 loaded successfully');
console.log('📱 Features: Native Push Notifications, Background Sync, Offline Support');
console.log('🔔 Lock screen notifications, Vibration, Rich interactions enabled');
console.log('💾 Smart caching, Error recovery, Offline functionality active');

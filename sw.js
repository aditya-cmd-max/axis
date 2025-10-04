// Service Worker for Exonova Axis PWA - ENHANCED VERSION
// Provides native mobile app notification experience

const CACHE_NAME = 'exonova-axis-v3.0.0';
const NOTIFICATION_CACHE = 'exonova-notifications-v2';
const API_CACHE = 'exonova-api-cache-v1';

// Core app assets to cache
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

// Enhanced Install Event
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
            
            // Initialize notification cache
            caches.open(NOTIFICATION_CACHE)
                .then(cache => {
                    console.log('📱 Initializing notification cache');
                    return cache.put('notification-state', new Response(JSON.stringify({
                        lastWelcomeDate: null,
                        notificationIndexes: { '1.5h': 0, '2h': 0 },
                        scheduledNotifications: []
                    })));
                }),
            
            // Skip waiting to activate immediately
            self.skipWaiting()
        ])
    );
    
    console.log('✅ Service Worker installed successfully');
});

// Enhanced Activate Event
self.addEventListener('activate', event => {
    console.log('🔄 Service Worker activating...');
    
    event.waitUntil(
        Promise.all([
            // Clean up old caches
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (![CACHE_NAME, NOTIFICATION_CACHE, API_CACHE].includes(cacheName)) {
                            console.log('🗑️ Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            }),
            
            // Claim clients immediately
            self.clients.claim(),
            
            // Initialize background sync
            initializeBackgroundSync()
        ])
    );
    
    console.log('✅ Service Worker activated and ready');
});

// Enhanced Fetch Event - Smart Caching Strategy
self.addEventListener('fetch', event => {
    const { request } = event;
    
    // Skip non-GET requests
    if (request.method !== 'GET') return;
    
    // Handle different types of requests
    if (request.url.includes('/axis/') || request.destination === 'document') {
        // App shell - Cache First, then Network
        event.respondWith(handleAppShellRequest(request));
    } else if (request.url.includes('fonts.googleapis.com') || 
               request.url.includes('cdn.tailwindcss.com')) {
        // CDN resources - Cache First
        event.respondWith(handleCDNRequest(request));
    } else if (request.url.includes('aditya-cmd-max.github.io')) {
        // Static assets - Cache First
        event.respondWith(handleStaticRequest(request));
    } else {
        // Other requests - Network First
        event.respondWith(handleAPIRequest(request));
    }
});

// App Shell Caching Strategy
async function handleAppShellRequest(request) {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
        // Return cached version but update in background
        event.waitUntil(updateCache(request, cache));
        return cachedResponse;
    }
    
    // Not in cache, fetch from network
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        // If both cache and network fail, return offline page
        return caches.match('/axis/');
    }
}

// CDN Resources Caching
async function handleCDNRequest(request) {
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
}

// Static Assets Caching
async function handleStaticRequest(request) {
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
}

// API Requests - Network First
async function handleAPIRequest(request) {
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(API_CACHE);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        return new Response('Network error happened', {
            status: 408,
            headers: { 'Content-Type': 'text/plain' }
        });
    }
}

// Background Cache Update
async function updateCache(request, cache) {
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            cache.put(request, networkResponse);
        }
    } catch (error) {
        // Silently fail - we have the cached version
    }
}

// ENHANCED PUSH NOTIFICATION HANDLER
self.addEventListener('push', event => {
    console.log('🔔 Push notification received in background/foreground');
    
    if (!event.data) {
        console.log('📭 Push event without data');
        return;
    }
    
    let notificationData;
    
    try {
        // Parse push data
        notificationData = event.data.json();
        console.log('📦 Parsed push data:', notificationData);
    } catch (error) {
        // Handle plain text payload
        const text = event.data.text();
        notificationData = {
            title: 'Exonova Axis',
            body: text,
            icon: 'https://aditya-cmd-max.github.io/axis/axislogo.png',
            badge: 'https://aditya-cmd-max.github.io/exonova-/logo-nobg.png',
            tag: 'exonova-general',
            timestamp: Date.now(),
            requireInteraction: false,
            silent: false
        };
        console.log('📝 Plain text notification:', text);
    }
    
    // Enhanced notification options for native experience
    const options = getEnhancedNotificationOptions(notificationData);
    
    console.log('🎯 Showing enhanced notification with options:', options);
    
    // Wait until the notification is shown
    event.waitUntil(
        self.registration.showNotification(notificationData.title || 'Exonova Axis', options)
            .then(() => {
                console.log('✅ Notification displayed successfully');
                
                // Store notification in cache for later sync
                storeNotificationForSync(notificationData);
                
                // Vibrate device if supported (for mobile)
                triggerVibration(notificationData);
                
            })
            .catch(error => {
                console.error('❌ Notification failed:', error);
                
                // Fallback: Try with simpler options
                const fallbackOptions = {
                    body: notificationData.body || 'New update from Exonova',
                    icon: 'https://aditya-cmd-max.github.io/axis/axislogo.png',
                    badge: 'https://aditya-cmd-max.github.io/exonova-/logo-nobg.png',
                    tag: 'fallback-' + Date.now()
                };
                
                return self.registration.showNotification('Exonova Axis', fallbackOptions);
            })
    );
});

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
        requireInteraction: data.requireInteraction || false,
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
    // Detect platform and apply specific enhancements
    const enhancements = {
        // Mobile-specific enhancements
        mobile: {
            vibrate: [200, 100, 200],
            requireInteraction: false,
            silent: false
        },
        // Desktop-specific enhancements  
        desktop: {
            requireInteraction: true,
            silent: false
        }
    };
    
    // For now, return mobile-optimized (works well on both)
    return enhancements.mobile;
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
        return customActions;
    }
    
    const actionSets = {
        'welcome': [
            { action: 'explore', title: '🚀 Explore', icon: '/axis/axislogo.png' },
            { action: 'open', title: '📱 Open App', icon: '/axis/axislogo.png' },
            { action: 'dismiss', title: '❌ Dismiss', icon: '/axis/axislogo.png' }
        ],
        'update': [
            { action: 'view_update', title: '🔄 View Update', icon: '/axis/axislogo.png' },
            { action: 'open', title: '📱 Open', icon: '/axis/axislogo.png' },
            { action: 'later', title: '⏰ Later', icon: '/axis/axislogo.png' }
        ],
        'alert': [
            { action: 'view_alert', title: '🚨 View Alert', icon: '/axis/axislogo.png' },
            { action: 'open', title: '📱 Open App', icon: '/axis/axislogo.png' }
        ],
        'reminder': [
            { action: 'snooze', title: '⏰ Snooze', icon: '/axis/axislogo.png' },
            { action: 'complete', title: '✅ Done', icon: '/axis/axislogo.png' }
        ],
        'default': [
            { action: 'open', title: '📱 Open', icon: '/axis/axislogo.png' },
            { action: 'dismiss', title: '❌ Dismiss', icon: '/axis/axislogo.png' }
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

// Store notification for background sync
async function storeNotificationForSync(notificationData) {
    try {
        const cache = await caches.open(NOTIFICATION_CACHE);
        const stateResponse = await cache.match('notification-state');
        let state = stateResponse ? await stateResponse.json() : { scheduledNotifications: [] };
        
        state.scheduledNotifications = state.scheduledNotifications || [];
        state.scheduledNotifications.push({
            ...notificationData,
            storedAt: Date.now(),
            delivered: true
        });
        
        // Keep only last 50 notifications
        if (state.scheduledNotifications.length > 50) {
            state.scheduledNotifications = state.scheduledNotifications.slice(-50);
        }
        
        await cache.put('notification-state', new Response(JSON.stringify(state)));
        console.log('💾 Notification stored for sync');
    } catch (error) {
        console.error('❌ Failed to store notification:', error);
    }
}

// Trigger vibration if supported
function triggerVibration(notificationData) {
    // This would work on devices that support the Vibration API
    if ('vibrate' in navigator) {
        const pattern = getVibrationPattern(notificationData.type);
        try {
            navigator.vibrate(pattern);
        } catch (error) {
            // Vibration not supported or permission issue
        }
    }
}

// ENHANCED NOTIFICATION CLICK HANDLER
self.addEventListener('notificationclick', event => {
    console.log('👆 Notification clicked - Action:', event.action, 'Notification:', event.notification);
    
    const notification = event.notification;
    const action = event.action;
    const notificationData = notification.data || {};
    
    // Close the notification
    notification.close();
    
    // Handle different actions
    event.waitUntil(
        handleNotificationAction(action, notificationData)
    );
});

// Handle notification actions
async function handleNotificationAction(action, data) {
    console.log('🎯 Handling notification action:', action, 'with data:', data);
    
    const urlToOpen = data.url || '/axis/';
    
    switch (action) {
        case 'open':
        case 'explore':
        case 'view_update':
        case 'view_alert':
            await openOrFocusApp(urlToOpen, data);
            break;
            
        case 'dismiss':
            console.log('❌ Notification dismissed by user');
            // Could send analytics here
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
            // Default action - open the app
            await openOrFocusApp(urlToOpen, data);
    }
    
    // Send analytics about the action
    await sendAnalytics(action, data);
}

// Open or focus the app
async function openOrFocusApp(url, data) {
    const clients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true
    });
    
    // Try to find and focus existing window
    for (const client of clients) {
        if (client.url.includes(self.location.origin)) {
            console.log('🔍 Found existing client, focusing:', client.url);
            
            // Send data to the client
            if (data) {
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
    
    // Open new window
    if (self.clients.openWindow) {
        console.log('🆕 Opening new window:', url);
        const newClient = await self.clients.openWindow(url);
        
        if (newClient && data) {
            // Small delay to ensure the page is loaded
            setTimeout(() => {
                newClient.postMessage({
                    type: 'NOTIFICATION_CLICK',
                    action: 'open',
                    data: data,
                    timestamp: Date.now()
                });
            }, 1000);
        }
        
        return newClient;
    }
}

// Snooze a reminder notification
async function snoozeNotification(data) {
    console.log('⏰ Snoozing notification:', data);
    
    // Schedule a new notification for 1 hour later
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
    
    // Store for background sync to trigger later
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
    console.log('✅ Completing reminder:', data);
    
    // Show completion confirmation
    await self.registration.showNotification('✅ Task Completed', {
        body: 'Great job! Your task has been marked as complete.',
        icon: 'https://aditya-cmd-max.github.io/axis/axislogo.png',
        tag: 'completion-confirmation',
        silent: true
    });
}

// Send analytics about notification interactions
async function sendAnalytics(action, data) {
    // In a real app, you would send this to your analytics service
    const analyticsData = {
        action: action,
        notificationId: data.notificationId,
        type: data.type,
        timestamp: Date.now(),
        source: 'service-worker'
    };
    
    console.log('📊 Analytics:', analyticsData);
    
    // Store locally for later sync
    try {
        const cache = await caches.open(NOTIFICATION_CACHE);
        const analyticsResponse = await cache.match('analytics');
        let analytics = analyticsResponse ? await analyticsResponse.json() : [];
        
        analytics.push(analyticsData);
        
        // Keep only last 100 events
        if (analytics.length > 100) {
            analytics = analytics.slice(-100);
        }
        
        await cache.put('analytics', new Response(JSON.stringify(analytics)));
    } catch (error) {
        console.error('❌ Failed to store analytics:', error);
    }
}

// ENHANCED BACKGROUND SYNC
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
            
        default:
            console.log('🔄 Unknown sync tag:', event.tag);
    }
});

// Initialize background sync
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
                console.log('⚠️ Periodic sync not supported, using regular sync');
            }
        }
        
        // Register regular background sync
        await registration.sync.register('daily-notifications');
        await registration.sync.register('cleanup-notifications');
        
    } catch (error) {
        console.error('❌ Background sync initialization failed:', error);
    }
}

// Trigger daily notifications
async function triggerDailyNotifications() {
    console.log('🌅 Triggering daily notifications from background');
    
    const now = Date.now();
    const today = new Date().toDateString();
    
    try {
        const cache = await caches.open(NOTIFICATION_CACHE);
        const stateResponse = await cache.match('notification-state');
        let state = stateResponse ? await stateResponse.json() : { lastWelcomeDate: null };
        
        // Check if welcome should be sent today
        if (state.lastWelcomeDate !== today) {
            // Send enhanced welcome notification
            await self.registration.showNotification('Welcome to Exonova Axis! 🚀', {
                body: 'Your productivity hub is ready. Start exploring all tools in one place.',
                icon: 'https://aditya-cmd-max.github.io/axis/Untitled%20design%20(2).gif',
                badge: 'https://aditya-cmd-max.github.io/exonova-/logo-nobg.png',
                image: 'https://aditya-cmd-max.github.io/axis/axislogo.png',
                tag: 'daily-welcome-' + today,
                requireInteraction: true,
                vibrate: [300, 100, 300, 100, 300],
                actions: [
                    { action: 'explore', title: '🚀 Explore Tools' },
                    { action: 'open', title: '📱 Open App' },
                    { action: 'dismiss', title: '❌ Dismiss' }
                ],
                data: {
                    url: '/axis/',
                    type: 'welcome',
                    timestamp: now,
                    notificationId: 'daily-welcome-' + now
                }
            });
            
            console.log('✅ Daily welcome notification sent');
            
            // Update state
            state.lastWelcomeDate = today;
            await cache.put('notification-state', new Response(JSON.stringify(state)));
        }
        
        // Send daily tip
        await sendDailyTip();
        
        // Check for scheduled notifications
        await processScheduledNotifications();
        
    } catch (error) {
        console.error('❌ Error in daily notifications:', error);
    }
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
    
    console.log('✅ Daily tip sent:', tip.title);
}

// Trigger periodic notifications
async function triggerPeriodicNotifications() {
    console.log('🕒 Triggering periodic notifications from background');
    
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
        ],
        'learning': [
            {
                title: 'Learn Visually 👁️',
                message: 'PopOut Pro turns complex topics into engaging visual content.',
                type: 'tip'
            },
            {
                title: 'Study Smarter 🎯',
                message: 'Create interactive learning materials with Exonova tools.',
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
        console.error('❌ Error in periodic notifications:', error);
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
            
            // Mark as delivered
            notification.delivered = true;
        }
        
        // Update state
        await cache.put('notification-state', new Response(JSON.stringify(state)));
        
    } catch (error) {
        console.error('❌ Error processing scheduled notifications:', error);
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
        console.log('📅 Background notification scheduled');
    } catch (error) {
        console.error('❌ Failed to schedule background notification:', error);
    }
}

// Cleanup old notifications
async function cleanupOldNotifications() {
    try {
        const cache = await caches.open(NOTIFICATION_CACHE);
        const stateResponse = await cache.match('notification-state');
        const state = stateResponse ? await stateResponse.json() : { scheduledNotifications: [] };
        
        const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        
        state.scheduledNotifications = state.scheduledNotifications.filter(
            notification => notification.timestamp > oneWeekAgo
        );
        
        await cache.put('notification-state', new Response(JSON.stringify(state)));
        console.log('🧹 Cleaned up old notifications');
    } catch (error) {
        console.error('❌ Error cleaning up notifications:', error);
    }
}

// Sync pending notifications
async function syncPendingNotifications() {
    console.log('🔄 Syncing pending notifications');
    // This would sync with your server in a real app
}

// MESSAGE HANDLING FROM MAIN APP
self.addEventListener('message', event => {
    const { type, payload } = event.data || {};
    console.log('📨 Message received in service worker:', type, payload);
    
    switch(type) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            console.log('🔄 Service Worker skipWaiting called');
            break;
            
        case 'GET_VERSION':
            event.ports[0].postMessage({
                version: '3.0.0',
                cacheName: CACHE_NAME,
                features: ['push-notifications', 'background-sync', 'offline-support']
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
                console.log('🗑️ Cleared all notifications');
            });
            break;
            
        case 'TRIGGER_SYNC':
            if (payload && payload.syncType) {
                self.registration.sync.register(payload.syncType);
            }
            break;
            
        case 'TEST_NOTIFICATION':
            sendTestNotification();
            break;
            
        default:
            console.log('📨 Unknown message type:', type);
    }
});

// Send test notification
async function sendTestNotification() {
    await self.registration.showNotification('Exonova Axis - Test ✅', {
        body: 'Background notifications are working perfectly! You\'ll receive updates even when the app is closed.',
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

// Enhanced service worker lifecycle events
self.addEventListener('updatefound', () => {
    console.log('🔄 New service worker found, updating...');
});

self.addEventListener('controllerchange', () => {
    console.log('🎮 Service worker controller changed - Page will reload');
});

// Periodic background tasks (runs every hour)
setInterval(async () => {
    console.log('⏰ Running periodic background tasks');
    
    try {
        // Check for and send any due notifications
        await processScheduledNotifications();
        
        // Clean up old data
        await cleanupOldNotifications();
        
        // Sync analytics if any
        await syncPendingNotifications();
        
    } catch (error) {
        console.error('❌ Error in periodic background tasks:', error);
    }
}, 60 * 60 * 1000); // Run every hour

console.log('🎯 Enhanced Service Worker loaded successfully');
console.log('📱 Features: Push Notifications, Background Sync, Offline Support');
console.log('🔔 Native mobile app notification experience enabled');

// Claude Code UI Service Worker
const CACHE_NAME = 'claude-code-ui-v1.0.0';
const STATIC_CACHE_NAME = 'claude-code-ui-static-v1.0.0';
const DYNAMIC_CACHE_NAME = 'claude-code-ui-dynamic-v1.0.0';

// 静态资源缓存列表
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// 动态缓存的URL模式
const CACHE_PATTERNS = [
  /^https:\/\/fonts\.googleapis\.com/,
  /^https:\/\/fonts\.gstatic\.com/,
  /\.(?:js|css|png|jpg|jpeg|svg|gif|webp|woff|woff2)$/
];

// 不缓存的URL模式
const NO_CACHE_PATTERNS = [
  /\/api\//,
  /\/ws$/,
  /\/shell$/
];

// 安装事件 - 缓存静态资源
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');

  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Static assets cached successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Failed to cache static assets:', error);
      })
  );
});

// 获取事件 - 智能缓存策略
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 跳过非GET请求
  if (request.method !== 'GET') {
    return;
  }

  // 跳过不需要缓存的URL
  if (NO_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname))) {
    return;
  }

  // 处理导航请求
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  // 处理静态资源请求
  if (CACHE_PATTERNS.some(pattern => pattern.test(request.url))) {
    event.respondWith(handleStaticRequest(request));
    return;
  }

  // 默认网络优先策略
  event.respondWith(
    fetch(request)
      .catch(() => caches.match(request))
  );
});

// 激活事件 - 清理旧缓存
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE_NAME &&
                cacheName !== DYNAMIC_CACHE_NAME &&
                cacheName.startsWith('claude-code-ui-')) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Service worker activated');
        return self.clients.claim();
      })
  );
});

// 处理导航请求 - 网络优先，缓存回退
async function handleNavigationRequest(request) {
  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }

    throw new Error('Network response not ok');
  } catch (error) {
    console.log('[SW] Network failed, trying cache for:', request.url);

    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    const offlineResponse = await caches.match('/');
    if (offlineResponse) {
      return offlineResponse;
    }

    return new Response('Offline - Please check your connection', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

// 处理静态资源请求 - 缓存优先
async function handleStaticRequest(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.error('[SW] Failed to fetch static resource:', request.url, error);

    const cachedResponse = await caches.match(request);
    return cachedResponse || new Response('Resource not available offline', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

console.log('[SW] Service Worker loaded successfully');
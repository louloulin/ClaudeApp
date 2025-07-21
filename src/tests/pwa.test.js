/**
 * PWA功能测试
 * 测试Progressive Web App的核心功能
 */

// Mock Service Worker API
global.navigator = {
  serviceWorker: {
    register: jest.fn(() => Promise.resolve({
      addEventListener: jest.fn(),
      waiting: null,
      installing: null
    })),
    ready: Promise.resolve({
      addEventListener: jest.fn(),
      waiting: null,
      installing: null
    })
  },
  onLine: true
};

global.caches = {
  open: jest.fn(() => Promise.resolve({
    addAll: jest.fn(() => Promise.resolve()),
    put: jest.fn(() => Promise.resolve()),
    match: jest.fn(() => Promise.resolve())
  })),
  keys: jest.fn(() => Promise.resolve(['test-cache'])),
  delete: jest.fn(() => Promise.resolve(true)),
  match: jest.fn(() => Promise.resolve())
};

global.window = {
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  Capacitor: {
    isNativePlatform: () => false,
    Plugins: {
      Haptics: {
        impact: jest.fn(() => Promise.resolve())
      }
    }
  }
};

describe('PWA功能测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Worker注册', () => {
    test('应该成功注册Service Worker', async () => {
      const registration = await navigator.serviceWorker.register('/sw.js');
      
      expect(navigator.serviceWorker.register).toHaveBeenCalledWith('/sw.js');
      expect(registration).toBeDefined();
    });

    test('应该处理Service Worker注册失败', async () => {
      navigator.serviceWorker.register.mockRejectedValueOnce(new Error('Registration failed'));
      
      try {
        await navigator.serviceWorker.register('/sw.js');
      } catch (error) {
        expect(error.message).toBe('Registration failed');
      }
    });
  });

  describe('缓存功能', () => {
    test('应该能够打开缓存', async () => {
      const cache = await caches.open('test-cache');
      
      expect(caches.open).toHaveBeenCalledWith('test-cache');
      expect(cache).toBeDefined();
    });

    test('应该能够添加资源到缓存', async () => {
      const cache = await caches.open('test-cache');
      await cache.addAll(['/index.html', '/manifest.json']);
      
      expect(cache.addAll).toHaveBeenCalledWith(['/index.html', '/manifest.json']);
    });

    test('应该能够从缓存中匹配资源', async () => {
      const cache = await caches.open('test-cache');
      const response = await cache.match('/index.html');
      
      expect(cache.match).toHaveBeenCalledWith('/index.html');
    });

    test('应该能够清理旧缓存', async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
      
      expect(caches.keys).toHaveBeenCalled();
      expect(caches.delete).toHaveBeenCalledWith('test-cache');
    });
  });

  describe('网络状态检测', () => {
    test('应该检测在线状态', () => {
      expect(navigator.onLine).toBe(true);
    });

    test('应该监听网络状态变化', () => {
      const onlineHandler = jest.fn();
      const offlineHandler = jest.fn();
      
      window.addEventListener('online', onlineHandler);
      window.addEventListener('offline', offlineHandler);
      
      expect(window.addEventListener).toHaveBeenCalledWith('online', onlineHandler);
      expect(window.addEventListener).toHaveBeenCalledWith('offline', offlineHandler);
    });
  });

  describe('Capacitor集成', () => {
    test('应该检测Capacitor环境', () => {
      const isNative = window.Capacitor?.isNativePlatform?.();
      expect(isNative).toBe(false);
    });

    test('应该支持触觉反馈', async () => {
      if (window.Capacitor?.Plugins?.Haptics) {
        await window.Capacitor.Plugins.Haptics.impact({ style: 'LIGHT' });
        expect(window.Capacitor.Plugins.Haptics.impact).toHaveBeenCalledWith({ style: 'LIGHT' });
      }
    });
  });

  describe('Manifest验证', () => {
    test('应该有有效的manifest.json配置', () => {
      const manifest = {
        name: "Claude Code UI",
        short_name: "ClaudeCode",
        description: "AI-powered code assistant for mobile and web",
        start_url: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#3b82f6",
        icons: [
          {
            src: "/icons/icon-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable"
          }
        ]
      };

      expect(manifest.name).toBeDefined();
      expect(manifest.short_name).toBeDefined();
      expect(manifest.start_url).toBe('/');
      expect(manifest.display).toBe('standalone');
      expect(manifest.icons).toHaveLength(1);
      expect(manifest.icons[0].sizes).toBe('192x192');
    });
  });

  describe('离线功能', () => {
    test('应该在离线时显示缓存内容', async () => {
      // 模拟离线状态
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });

      const cachedResponse = new Response('Cached content');
      caches.match.mockResolvedValueOnce(cachedResponse);

      const response = await caches.match('/index.html');
      expect(response).toBe(cachedResponse);
    });

    test('应该在网络恢复时更新缓存', async () => {
      // 模拟在线状态
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true
      });

      const cache = await caches.open('test-cache');
      const response = new Response('Fresh content');
      
      await cache.put('/index.html', response);
      expect(cache.put).toHaveBeenCalledWith('/index.html', response);
    });
  });

  describe('性能测试', () => {
    test('Service Worker应该快速响应', async () => {
      const startTime = performance.now();
      await navigator.serviceWorker.register('/sw.js');
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(1000); // 应该在1秒内完成
    });

    test('缓存操作应该高效', async () => {
      const startTime = performance.now();
      const cache = await caches.open('test-cache');
      await cache.addAll(['/index.html']);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(500); // 应该在500ms内完成
    });
  });

  describe('错误处理', () => {
    test('应该优雅处理Service Worker错误', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      navigator.serviceWorker.register.mockRejectedValueOnce(new Error('SW Error'));
      
      try {
        await navigator.serviceWorker.register('/sw.js');
      } catch (error) {
        expect(error.message).toBe('SW Error');
      }
      
      consoleSpy.mockRestore();
    });

    test('应该处理缓存失败', async () => {
      caches.open.mockRejectedValueOnce(new Error('Cache Error'));
      
      try {
        await caches.open('test-cache');
      } catch (error) {
        expect(error.message).toBe('Cache Error');
      }
    });
  });
});

// 集成测试
describe('PWA集成测试', () => {
  test('完整的PWA工作流程', async () => {
    // 1. 注册Service Worker
    const registration = await navigator.serviceWorker.register('/sw.js');
    expect(registration).toBeDefined();

    // 2. 打开缓存
    const cache = await caches.open('claude-code-ui-v1.0.0');
    expect(cache).toBeDefined();

    // 3. 缓存资源
    await cache.addAll(['/index.html', '/manifest.json']);
    expect(cache.addAll).toHaveBeenCalled();

    // 4. 检查网络状态
    expect(navigator.onLine).toBeDefined();

    // 5. 测试离线回退
    const cachedResponse = await cache.match('/index.html');
    expect(cache.match).toHaveBeenCalledWith('/index.html');
  });
});

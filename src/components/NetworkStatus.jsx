import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, AlertCircle, CheckCircle } from 'lucide-react';

const NetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showStatus, setShowStatus] = useState(false);
  const [lastStatusChange, setLastStatusChange] = useState(null);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setLastStatusChange(Date.now());
      setShowStatus(true);
      
      // 自动隐藏在线状态提示
      setTimeout(() => setShowStatus(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setLastStatusChange(Date.now());
      setShowStatus(true);
      // 离线状态保持显示
    };

    // 监听网络状态变化
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 初始状态检查
    if (!navigator.onLine) {
      setShowStatus(true);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 检查Service Worker缓存状态
  const checkCacheStatus = async () => {
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        return cacheNames.length > 0;
      } catch (error) {
        console.error('Failed to check cache status:', error);
        return false;
      }
    }
    return false;
  };

  const [hasCachedContent, setHasCachedContent] = useState(false);

  useEffect(() => {
    checkCacheStatus().then(setHasCachedContent);
  }, []);

  if (!showStatus && isOnline) {
    return null;
  }

  return (
    <div className={`fixed top-4 right-4 z-50 transition-all duration-300 ${
      showStatus ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
    }`}>
      <div className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg border ${
        isOnline 
          ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300'
          : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300'
      }`}>
        {isOnline ? (
          <>
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Back online</span>
          </>
        ) : (
          <>
            <WifiOff className="w-4 h-4" />
            <div className="flex flex-col">
              <span className="text-sm font-medium">You're offline</span>
              {hasCachedContent && (
                <span className="text-xs opacity-75">Some features available from cache</span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// 网络状态Hook
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connectionType, setConnectionType] = useState('unknown');

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 检测连接类型（如果支持）
    if ('connection' in navigator) {
      const connection = navigator.connection;
      setConnectionType(connection.effectiveType || 'unknown');
      
      const handleConnectionChange = () => {
        setConnectionType(connection.effectiveType || 'unknown');
      };
      
      connection.addEventListener('change', handleConnectionChange);
      
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        connection.removeEventListener('change', handleConnectionChange);
      };
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, connectionType };
};

// 离线提示组件
export const OfflineBanner = () => {
  const { isOnline } = useNetworkStatus();

  if (isOnline) return null;

  return (
    <div className="bg-yellow-50 border-b border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800">
      <div className="max-w-7xl mx-auto py-2 px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between flex-wrap">
          <div className="w-0 flex-1 flex items-center">
            <span className="flex p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/40">
              <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            </span>
            <p className="ml-3 font-medium text-yellow-800 dark:text-yellow-200 text-sm">
              You're currently offline. Some features may be limited.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Service Worker 更新提示组件
export const ServiceWorkerUpdate = () => {
  const [showUpdate, setShowUpdate] = useState(false);
  const [registration, setRegistration] = useState(null);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        setRegistration(reg);
        
        // 监听Service Worker更新
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setShowUpdate(true);
            }
          });
        });
      });
    }
  }, []);

  const handleUpdate = () => {
    if (registration && registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  };

  if (!showUpdate) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 shadow-lg dark:bg-blue-900/20 dark:border-blue-800">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <AlertCircle className="h-5 w-5 text-blue-400" />
          </div>
          <div className="ml-3 w-0 flex-1">
            <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
              App Update Available
            </p>
            <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
              A new version is ready. Refresh to update.
            </p>
            <div className="mt-3 flex space-x-2">
              <button
                onClick={handleUpdate}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium py-1 px-3 rounded transition-colors"
              >
                Update Now
              </button>
              <button
                onClick={() => setShowUpdate(false)}
                className="bg-transparent hover:bg-blue-100 text-blue-800 dark:text-blue-200 dark:hover:bg-blue-900/40 text-xs font-medium py-1 px-3 rounded transition-colors"
              >
                Later
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NetworkStatus;

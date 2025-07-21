import React, { useState, useEffect } from 'react';
import { Download, X, Monitor, Smartphone, Globe } from 'lucide-react';

const DesktopInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [platform, setPlatform] = useState('unknown');

  useEffect(() => {
    // 检测平台
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('windows')) setPlatform('windows');
    else if (userAgent.includes('mac')) setPlatform('mac');
    else if (userAgent.includes('linux')) setPlatform('linux');
    else if (userAgent.includes('android')) setPlatform('android');
    else if (userAgent.includes('iphone') || userAgent.includes('ipad')) setPlatform('ios');

    // 检查是否已安装
    const checkInstalled = () => {
      if (window.matchMedia('(display-mode: standalone)').matches) {
        setIsInstalled(true);
        return;
      }
      
      if (window.navigator.standalone === true) {
        setIsInstalled(true);
        return;
      }
    };

    checkInstalled();

    // 监听PWA安装提示事件
    const handleBeforeInstallPrompt = (e) => {
      console.log('[PWA] beforeinstallprompt event fired');
      e.preventDefault();
      setDeferredPrompt(e);
      
      // 延迟显示提示，避免打断用户
      setTimeout(() => {
        if (!isInstalled && !localStorage.getItem('pwa-install-dismissed')) {
          setShowPrompt(true);
        }
      }, 3000);
    };

    // 监听应用安装事件
    const handleAppInstalled = () => {
      console.log('[PWA] App was installed');
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isInstalled]);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      // 如果没有原生提示，显示手动安装指南
      showManualInstallGuide();
      return;
    }

    try {
      // 显示安装提示
      deferredPrompt.prompt();
      
      // 等待用户响应
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`[PWA] User response to install prompt: ${outcome}`);
      
      if (outcome === 'accepted') {
        console.log('[PWA] User accepted the install prompt');
      } else {
        console.log('[PWA] User dismissed the install prompt');
      }
      
      setDeferredPrompt(null);
      setShowPrompt(false);
    } catch (error) {
      console.error('[PWA] Error during installation:', error);
      showManualInstallGuide();
    }
  };

  const showManualInstallGuide = () => {
    const instructions = getInstallInstructions();
    alert(instructions);
  };

  const getInstallInstructions = () => {
    const baseUrl = window.location.origin;
    
    switch (platform) {
      case 'windows':
        return `在Windows上安装Claude Code UI：
1. 在Chrome/Edge中打开 ${baseUrl}
2. 点击地址栏右侧的安装图标 ⊕
3. 或者点击菜单 → 更多工具 → 创建快捷方式
4. 勾选"在窗口中打开"选项`;

      case 'mac':
        return `在macOS上安装Claude Code UI：
1. 在Chrome/Safari中打开 ${baseUrl}
2. Chrome: 点击地址栏的安装图标
3. Safari: 点击分享按钮 → 添加到程序坞
4. 应用将出现在启动台中`;

      case 'linux':
        return `在Linux上安装Claude Code UI：
1. 在Chrome/Firefox中打开 ${baseUrl}
2. Chrome: 点击地址栏的安装图标
3. Firefox: 点击菜单 → 安装此站点为应用
4. 应用将添加到应用程序菜单`;

      default:
        return `安装Claude Code UI桌面应用：
1. 在支持PWA的浏览器中打开 ${baseUrl}
2. 查找地址栏或菜单中的"安装"选项
3. 点击安装即可创建桌面应用`;
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  const getPlatformIcon = () => {
    switch (platform) {
      case 'windows':
      case 'mac':
      case 'linux':
        return <Monitor className="w-5 h-5" />;
      case 'android':
      case 'ios':
        return <Smartphone className="w-5 h-5" />;
      default:
        return <Globe className="w-5 h-5" />;
    }
  };

  const getPlatformName = () => {
    switch (platform) {
      case 'windows': return 'Windows';
      case 'mac': return 'macOS';
      case 'linux': return 'Linux';
      case 'android': return 'Android';
      case 'ios': return 'iOS';
      default: return '桌面';
    }
  };

  // 如果已安装或不显示提示，则不渲染
  if (isInstalled || !showPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50">
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            {getPlatformIcon()}
            <h3 className="font-semibold text-gray-900 dark:text-white">
              安装到{getPlatformName()}
            </h3>
          </div>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="关闭"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          将Claude Code UI安装为桌面应用，享受更好的使用体验：
        </p>
        
        <ul className="text-xs text-gray-500 dark:text-gray-400 mb-4 space-y-1">
          <li>• 独立窗口运行，不占用浏览器标签页</li>
          <li>• 更快的启动速度和更好的性能</li>
          <li>• 支持离线使用和后台更新</li>
          <li>• 原生的桌面集成体验</li>
        </ul>
        
        <div className="flex gap-2">
          <button
            onClick={handleInstall}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            立即安装
          </button>
          <button
            onClick={handleDismiss}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition-colors"
          >
            稍后
          </button>
        </div>
      </div>
    </div>
  );
};

// 桌面安装状态Hook
export const useDesktopInstall = () => {
  const [isInstalled, setIsInstalled] = useState(false);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    // 检查是否已安装
    const checkInstalled = () => {
      return window.matchMedia('(display-mode: standalone)').matches ||
             window.navigator.standalone === true;
    };

    setIsInstalled(checkInstalled());

    // 监听安装提示事件
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setCanInstall(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setCanInstall(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  return { isInstalled, canInstall };
};

export default DesktopInstallPrompt;

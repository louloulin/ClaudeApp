import React, { useState, useEffect } from 'react';
import { MessageSquare, Folder, Terminal, GitBranch, Globe } from 'lucide-react';

function MobileNav({ activeTab, setActiveTab, isInputFocused }) {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isCapacitor, setIsCapacitor] = useState(false);

  useEffect(() => {
    // 检测暗色模式
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };

    checkDarkMode();

    // 监听暗色模式变化
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    // 检测是否在Capacitor环境中
    setIsCapacitor(window.Capacitor?.isNativePlatform?.() || false);

    return () => observer.disconnect();
  }, []);

  // 触觉反馈函数
  const triggerHapticFeedback = async () => {
    if (isCapacitor && window.Capacitor?.Plugins?.Haptics) {
      try {
        await window.Capacitor.Plugins.Haptics.impact({
          style: 'LIGHT'
        });
      } catch (error) {
        console.log('Haptic feedback not available:', error);
      }
    }
  };
  const navItems = [
    {
      id: 'chat',
      icon: MessageSquare,
      label: 'Chat',
      onClick: async () => {
        await triggerHapticFeedback();
        setActiveTab('chat');
      }
    },
    {
      id: 'shell',
      icon: Terminal,
      label: 'Terminal',
      onClick: async () => {
        await triggerHapticFeedback();
        setActiveTab('shell');
      }
    },
    {
      id: 'files',
      icon: Folder,
      label: 'Files',
      onClick: async () => {
        await triggerHapticFeedback();
        setActiveTab('files');
      }
    },
    {
      id: 'git',
      icon: GitBranch,
      label: 'Git',
      onClick: async () => {
        await triggerHapticFeedback();
        setActiveTab('git');
      }
    }
  ];

  return (
    <>
      <style>
        {`
          .mobile-nav-container {
            background-color: ${isDarkMode ? '#1f2937' : '#ffffff'} !important;
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
          }
          .mobile-nav-container:hover {
            background-color: ${isDarkMode ? '#1f2937' : '#ffffff'} !important;
          }
          .mobile-nav-button {
            -webkit-tap-highlight-color: transparent;
            touch-action: manipulation;
          }
          .mobile-nav-button:active {
            transform: scale(0.95);
            transition: transform 0.1s ease;
          }
          /* iOS安全区域支持 */
          @supports (padding-bottom: env(safe-area-inset-bottom)) {
            .ios-bottom-safe {
              padding-bottom: calc(env(safe-area-inset-bottom) + 0.25rem);
            }
          }
        `}
      </style>
      <div
        className={`mobile-nav-container fixed bottom-0 left-0 right-0 border-t border-gray-200 dark:border-gray-700 z-50 ios-bottom-safe transform transition-transform duration-300 ease-in-out shadow-lg ${
          isInputFocused ? 'translate-y-full' : 'translate-y-0'
        }`}
        style={{
          backgroundColor: isDarkMode ? 'rgba(31, 41, 55, 0.95)' : 'rgba(255, 255, 255, 0.95)'
        }}
      >
      <div className="flex items-center justify-around py-2 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={item.onClick}
              onTouchStart={(e) => {
                // 防止双击缩放
                e.preventDefault();
              }}
              className={`mobile-nav-button flex flex-col items-center justify-center p-3 rounded-xl min-h-[56px] min-w-[56px] relative transition-all duration-200 ${
                isActive
                  ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800/50'
              }`}
              aria-label={item.label}
              role="tab"
              aria-selected={isActive}
            >
              <Icon className={`w-5 h-5 transition-transform duration-200 ${
                isActive ? 'scale-110' : 'scale-100'
              }`} />
              <span className={`text-xs mt-1 font-medium transition-opacity duration-200 ${
                isActive ? 'opacity-100' : 'opacity-70'
              }`}>
                {item.label}
              </span>
              {isActive && (
                <div className="absolute top-1 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-blue-600 dark:bg-blue-400 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </div>
    </>
  );
}

export default MobileNav;
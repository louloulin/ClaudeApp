import React, { useState, useEffect, useCallback } from 'react';
import { Keyboard, Upload, Bell, Minimize2, Maximize2, X } from 'lucide-react';

// 桌面快捷键组件
export const DesktopShortcuts = () => {
  const [showShortcuts, setShowShortcuts] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl/Cmd + ? 显示快捷键
      if ((e.ctrlKey || e.metaKey) && e.key === '?') {
        e.preventDefault();
        setShowShortcuts(true);
        setTimeout(() => setShowShortcuts(false), 3000);
      }
      
      // ESC 隐藏快捷键
      if (e.key === 'Escape') {
        setShowShortcuts(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!showShortcuts) return null;

  return (
    <div className="desktop-shortcuts show">
      <div className="shortcut">
        <span>新建聊天</span>
        <span className="key">Ctrl+N</span>
      </div>
      <div className="shortcut">
        <span>打开终端</span>
        <span className="key">Ctrl+`</span>
      </div>
      <div className="shortcut">
        <span>切换侧边栏</span>
        <span className="key">Ctrl+B</span>
      </div>
      <div className="shortcut">
        <span>搜索文件</span>
        <span className="key">Ctrl+P</span>
      </div>
      <div className="shortcut">
        <span>显示快捷键</span>
        <span className="key">Ctrl+?</span>
      </div>
    </div>
  );
};

// 文件拖拽处理组件
export const FileDropZone = ({ onFileDrop }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    setDragCounter(prev => prev + 1);
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setDragCounter(prev => prev - 1);
    if (dragCounter <= 1) {
      setIsDragOver(false);
    }
  }, [dragCounter]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
    setDragCounter(0);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0 && onFileDrop) {
      onFileDrop(files);
    }
  }, [onFileDrop]);

  useEffect(() => {
    // 只在桌面PWA模式下启用
    if (!window.matchMedia('(display-mode: standalone)').matches) {
      return;
    }

    document.addEventListener('dragenter', handleDragEnter);
    document.addEventListener('dragleave', handleDragLeave);
    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('drop', handleDrop);

    return () => {
      document.removeEventListener('dragenter', handleDragEnter);
      document.removeEventListener('dragleave', handleDragLeave);
      document.removeEventListener('dragover', handleDragOver);
      document.removeEventListener('drop', handleDrop);
    };
  }, [handleDragEnter, handleDragLeave, handleDragOver, handleDrop]);

  return (
    <div className={`file-drop-zone ${isDragOver ? 'active' : ''}`}>
      <div className="drop-message">
        <Upload className="w-8 h-8 mx-auto mb-2" />
        <div>拖拽文件到这里打开</div>
        <div className="text-sm opacity-75 mt-1">
          支持 .js, .jsx, .ts, .tsx, .md, .txt 等文件
        </div>
      </div>
    </div>
  );
};

// 桌面通知组件
export const DesktopNotification = ({ title, message, type = 'info', duration = 5000, onClose }) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (title || message) {
      setShow(true);
      const timer = setTimeout(() => {
        setShow(false);
        setTimeout(() => onClose && onClose(), 300);
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [title, message, duration, onClose]);

  if (!title && !message) return null;

  const getIcon = () => {
    switch (type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      default: return '💡';
    }
  };

  return (
    <div className={`desktop-notification ${show ? 'show' : ''}`}>
      <div className="notification-header">
        <div className="notification-title">
          <span className="mr-2">{getIcon()}</span>
          {title}
        </div>
        <button
          onClick={() => setShow(false)}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      {message && (
        <div className="notification-body">
          {message}
        </div>
      )}
    </div>
  );
};

// 桌面标题栏组件 (仅在standalone模式显示)
export const DesktopTitleBar = ({ title = "Claude Code UI" }) => {
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches);
  }, []);

  if (!isStandalone) return null;

  return (
    <div className="desktop-titlebar">
      <div className="title">{title}</div>
      <div className="controls">
        {/* 窗口控制按钮可以在这里添加 */}
      </div>
    </div>
  );
};

// 桌面功能增强Hook
export const useDesktopEnhancements = () => {
  const [isDesktop, setIsDesktop] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    // 检测是否为桌面PWA
    const checkDesktop = () => {
      return window.matchMedia('(display-mode: standalone)').matches ||
             window.matchMedia('(display-mode: window-controls-overlay)').matches;
    };

    setIsDesktop(checkDesktop());

    // 监听显示模式变化
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleChange = () => setIsDesktop(checkDesktop());
    
    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  // 显示桌面通知
  const showNotification = useCallback((title, message, type = 'info', duration = 5000) => {
    const id = Date.now();
    const notification = { id, title, message, type, duration };
    
    setNotifications(prev => [...prev, notification]);
    
    // 自动移除通知
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, duration + 300);
  }, []);

  // 处理文件拖拽
  const handleFileDrop = useCallback((files) => {
    console.log('Files dropped:', files);
    showNotification(
      '文件已接收',
      `收到 ${files.length} 个文件`,
      'success'
    );
    
    // 这里可以添加文件处理逻辑
    files.forEach(file => {
      console.log(`File: ${file.name}, Size: ${file.size}, Type: ${file.type}`);
    });
  }, [showNotification]);

  // 注册全局快捷键
  useEffect(() => {
    if (!isDesktop) return;

    const handleKeyDown = (e) => {
      // Ctrl/Cmd + N: 新建聊天
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        showNotification('快捷键', '新建聊天功能', 'info');
      }
      
      // Ctrl/Cmd + `: 切换终端
      if ((e.ctrlKey || e.metaKey) && e.key === '`') {
        e.preventDefault();
        showNotification('快捷键', '切换终端功能', 'info');
      }
      
      // Ctrl/Cmd + B: 切换侧边栏
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        showNotification('快捷键', '切换侧边栏功能', 'info');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDesktop, showNotification]);

  return {
    isDesktop,
    notifications,
    showNotification,
    handleFileDrop
  };
};

// 主要的桌面增强组件
const DesktopEnhancements = () => {
  const { isDesktop, notifications, handleFileDrop } = useDesktopEnhancements();

  if (!isDesktop) return null;

  return (
    <>
      <DesktopTitleBar />
      <DesktopShortcuts />
      <FileDropZone onFileDrop={handleFileDrop} />
      
      {/* 渲染通知 */}
      {notifications.map(notification => (
        <DesktopNotification
          key={notification.id}
          title={notification.title}
          message={notification.message}
          type={notification.type}
          duration={notification.duration}
        />
      ))}
    </>
  );
};

export default DesktopEnhancements;

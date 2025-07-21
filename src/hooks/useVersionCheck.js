// hooks/useVersionCheck.js
import { useState, useEffect } from 'react';

// 从环境变量或直接定义版本号
const getCurrentVersion = () => {
  // 尝试从环境变量获取版本
  if (import.meta.env.VITE_APP_VERSION) {
    return import.meta.env.VITE_APP_VERSION;
  }

  // 回退到硬编码版本
  return '1.5.0';
};

export const useVersionCheck = (owner, repo) => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [latestVersion, setLatestVersion] = useState(null);
  const currentVersion = getCurrentVersion();

  useEffect(() => {
    const checkVersion = async () => {
      try {
        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases/latest`);
        const data = await response.json();
        
        // Handle the case where there might not be any releases
        if (data.tag_name) {
          const latest = data.tag_name.replace(/^v/, '');
          setLatestVersion(latest);
          setUpdateAvailable(currentVersion !== latest);
        } else {
          // No releases found, don't show update notification
          setUpdateAvailable(false);
          setLatestVersion(null);
        }
      } catch (error) {
        console.error('Version check failed:', error);
        // On error, don't show update notification
        setUpdateAvailable(false);
        setLatestVersion(null);
      }
    };

    checkVersion();
    const interval = setInterval(checkVersion, 5 * 60 * 1000); // Check every 5 minutes
    return () => clearInterval(interval);
  }, [owner, repo]);

  return { updateAvailable, latestVersion, currentVersion };
}; 
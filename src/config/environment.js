/**
 * 环境配置管理
 * 支持开发、测试、生产环境的动态URL配置
 */

// 环境类型检测
const getEnvironment = () => {
  // 1. 检查构建时环境变量
  if (import.meta.env.MODE) {
    return import.meta.env.MODE;
  }
  
  // 2. 检查运行时环境变量
  if (typeof process !== 'undefined' && process.env.NODE_ENV) {
    return process.env.NODE_ENV;
  }
  
  // 3. 根据域名判断环境
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'development';
  } else if (hostname.includes('test') || hostname.includes('staging')) {
    return 'testing';
  } else {
    return 'production';
  }
};

// 环境配置
const environments = {
  development: {
    API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3008',
    WS_BASE_URL: import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:3008',
    APP_NAME: import.meta.env.VITE_APP_NAME || 'Claude Code UI (Dev)',
    DEBUG: import.meta.env.VITE_DEBUG === 'true' || true,
    CAPACITOR_SERVER_URL: import.meta.env.VITE_CAPACITOR_SERVER_URL || 'http://localhost:3008'
  },
  
  testing: {
    API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'https://test-api.claudecode.app',
    WS_BASE_URL: import.meta.env.VITE_WS_BASE_URL || 'wss://test-api.claudecode.app',
    APP_NAME: import.meta.env.VITE_APP_NAME || 'Claude Code UI (Test)',
    DEBUG: import.meta.env.VITE_DEBUG === 'true' || true,
    CAPACITOR_SERVER_URL: import.meta.env.VITE_CAPACITOR_SERVER_URL || 'https://test.claudecode.app'
  },
  
  production: {
    API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'https://api.claudecode.app',
    WS_BASE_URL: import.meta.env.VITE_WS_BASE_URL || 'wss://api.claudecode.app',
    APP_NAME: import.meta.env.VITE_APP_NAME || 'Claude Code UI',
    DEBUG: import.meta.env.VITE_DEBUG === 'true' || false,
    CAPACITOR_SERVER_URL: import.meta.env.VITE_CAPACITOR_SERVER_URL || 'https://claudecode.app'
  }
};

// 获取当前环境配置
const getCurrentEnvironment = () => {
  const env = getEnvironment();
  return environments[env] || environments.development;
};

// 动态配置对象
const config = {
  ...getCurrentEnvironment(),
  
  // 当前环境
  ENVIRONMENT: getEnvironment(),
  
  // 是否为移动端
  IS_MOBILE: typeof window !== 'undefined' && (window.Capacitor?.isNativePlatform?.() || false),
  
  // 是否为桌面PWA
  IS_DESKTOP_PWA: typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches,
  
  // 平台检测
  PLATFORM: (() => {
    if (typeof window === 'undefined') return 'server';
    
    if (window.Capacitor?.isNativePlatform?.()) {
      return window.Capacitor.getPlatform();
    } else if (window.matchMedia('(display-mode: standalone)').matches) {
      return 'desktop-pwa';
    } else {
      return 'web';
    }
  })(),
  
  // API端点构建
  getApiUrl: (endpoint = '') => {
    const baseUrl = getCurrentEnvironment().API_BASE_URL;
    return `${baseUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
  },
  
  // WebSocket URL构建
  getWsUrl: (endpoint = '') => {
    const baseUrl = getCurrentEnvironment().WS_BASE_URL;
    return `${baseUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
  },
  
  // 获取完整的应用URL
  getAppUrl: (path = '') => {
    const baseUrl = getCurrentEnvironment().CAPACITOR_SERVER_URL;
    return `${baseUrl}${path.startsWith('/') ? path : '/' + path}`;
  }
};

// 环境变量覆盖（支持运行时配置）
if (typeof window !== 'undefined' && window.APP_CONFIG) {
  Object.assign(config, window.APP_CONFIG);
}

// 调试信息
if (config.DEBUG && typeof console !== 'undefined') {
  console.log('🔧 Environment Config:', {
    environment: config.ENVIRONMENT,
    platform: config.PLATFORM,
    apiUrl: config.API_BASE_URL,
    wsUrl: config.WS_BASE_URL,
    isMobile: config.IS_MOBILE,
    isDesktopPWA: config.IS_DESKTOP_PWA
  });
}

export default config;

// 导出常用配置
export const {
  API_BASE_URL,
  WS_BASE_URL,
  APP_NAME,
  DEBUG,
  ENVIRONMENT,
  IS_MOBILE,
  IS_DESKTOP_PWA,
  PLATFORM
} = config;

// 导出工具函数
export const { getApiUrl, getWsUrl, getAppUrl } = config;

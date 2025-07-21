#!/usr/bin/env node

/**
 * 动态配置Capacitor
 * 根据环境变量生成对应的capacitor.config.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// 获取环境参数
const environment = process.argv[2] || process.env.NODE_ENV || 'development';

console.log(`🔧 配置Capacitor环境: ${environment}`);

// 环境配置
const environments = {
  development: {
    server: {
      url: 'http://localhost:3008',
      cleartext: true,
      androidScheme: 'http',
      allowNavigation: ['localhost:*', '127.0.0.1:*']
    },
    appName: 'Claude Code UI (Dev)'
  },
  
  testing: {
    server: {
      androidScheme: 'https',
      allowNavigation: ['*.claudecode.app', 'test.claudecode.app']
    },
    appName: 'Claude Code UI (Test)'
  },
  
  production: {
    server: {
      androidScheme: 'https',
      allowNavigation: ['*.claudecode.app', 'claudecode.app']
    },
    appName: 'Claude Code UI'
  }
};

// 基础配置
const baseConfig = {
  appId: 'com.claudecode.app',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#3b82f6',
      showSpinner: false,
      androidSpinnerStyle: 'large',
      iosSpinnerStyle: 'small',
      spinnerColor: '#ffffff',
      splashFullScreen: true,
      splashImmersive: true
    },
    StatusBar: {
      style: 'default',
      backgroundColor: '#3b82f6'
    },
    Haptics: {
      enabled: true
    },
    Network: {
      enabled: true
    },
    Filesystem: {
      enabled: true
    }
  }
};

// 合并配置
const envConfig = environments[environment] || environments.development;
const finalConfig = {
  ...baseConfig,
  appName: envConfig.appName,
  server: envConfig.server
};

// 写入配置文件
const configPath = path.join(projectRoot, 'capacitor.config.json');
fs.writeFileSync(configPath, JSON.stringify(finalConfig, null, 2));

console.log(`✅ Capacitor配置已更新:`);
console.log(`   - 应用名称: ${finalConfig.appName}`);
console.log(`   - 服务器配置: ${JSON.stringify(finalConfig.server, null, 2)}`);
console.log(`   - 配置文件: ${configPath}`);

// 如果是开发环境，显示额外信息
if (environment === 'development') {
  console.log(`\n📱 开发环境提示:`);
  console.log(`   - 移动端应用将连接到: ${finalConfig.server.url}`);
  console.log(`   - 确保本地服务器正在运行: npm run server`);
  console.log(`   - 移动端调试: npx cap run android --livereload`);
}

#!/usr/bin/env node

/**
 * PWA功能验证脚本
 * 验证Progressive Web App的核心功能是否正常工作
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

console.log('🔍 PWA功能验证开始...\n');

// 验证结果收集
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

function test(name, condition, message) {
  const passed = condition;
  results.tests.push({ name, passed, message });
  
  if (passed) {
    results.passed++;
    console.log(`✅ ${name}`);
  } else {
    results.failed++;
    console.log(`❌ ${name}: ${message}`);
  }
}

// 1. 验证manifest.json
console.log('📱 验证PWA Manifest...');
try {
  const manifestPath = path.join(projectRoot, 'public/manifest.json');
  const manifestExists = fs.existsSync(manifestPath);
  test('Manifest文件存在', manifestExists, 'manifest.json文件不存在');
  
  if (manifestExists) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    
    test('Manifest有应用名称', !!manifest.name, 'name字段缺失');
    test('Manifest有短名称', !!manifest.short_name, 'short_name字段缺失');
    test('Manifest有起始URL', manifest.start_url === '/', 'start_url应该是"/"');
    test('Manifest显示模式正确', manifest.display === 'standalone', 'display应该是"standalone"');
    test('Manifest有主题色', !!manifest.theme_color, 'theme_color字段缺失');
    test('Manifest有背景色', !!manifest.background_color, 'background_color字段缺失');
    test('Manifest有图标', Array.isArray(manifest.icons) && manifest.icons.length > 0, '图标数组为空');
    
    if (manifest.icons && manifest.icons.length > 0) {
      const has192 = manifest.icons.some(icon => icon.sizes.includes('192x192'));
      const has512 = manifest.icons.some(icon => icon.sizes.includes('512x512'));
      test('Manifest有192x192图标', has192, '缺少192x192尺寸图标');
      test('Manifest有512x512图标', has512, '缺少512x512尺寸图标');
    }
    
    test('Manifest有快捷方式', Array.isArray(manifest.shortcuts), 'shortcuts字段缺失或不是数组');
  }
} catch (error) {
  test('Manifest解析', false, `解析manifest.json失败: ${error.message}`);
}

// 2. 验证Service Worker
console.log('\n🔧 验证Service Worker...');
try {
  const swPath = path.join(projectRoot, 'public/sw.js');
  const swExists = fs.existsSync(swPath);
  test('Service Worker文件存在', swExists, 'sw.js文件不存在');
  
  if (swExists) {
    const swContent = fs.readFileSync(swPath, 'utf8');
    
    test('SW有安装事件监听', swContent.includes("addEventListener('install'"), '缺少install事件监听');
    test('SW有激活事件监听', swContent.includes("addEventListener('activate'"), '缺少activate事件监听');
    test('SW有获取事件监听', swContent.includes("addEventListener('fetch'"), '缺少fetch事件监听');
    test('SW有缓存策略', swContent.includes('caches.open'), '缺少缓存操作');
    test('SW有缓存名称', swContent.includes('claude-code-ui'), '缺少应用特定的缓存名称');
    test('SW有错误处理', swContent.includes('catch'), '缺少错误处理');
    test('SW有日志输出', swContent.includes('console.log'), '缺少日志输出');
  }
} catch (error) {
  test('Service Worker解析', false, `解析sw.js失败: ${error.message}`);
}

// 3. 验证index.html PWA配置
console.log('\n🌐 验证HTML PWA配置...');
try {
  const indexPath = path.join(projectRoot, 'index.html');
  const indexExists = fs.existsSync(indexPath);
  test('index.html存在', indexExists, 'index.html文件不存在');
  
  if (indexExists) {
    const htmlContent = fs.readFileSync(indexPath, 'utf8');
    
    test('HTML有manifest链接', htmlContent.includes('rel="manifest"'), '缺少manifest链接');
    test('HTML有主题色meta', htmlContent.includes('name="theme-color"'), '缺少theme-color meta标签');
    test('HTML有viewport meta', htmlContent.includes('name="viewport"'), '缺少viewport meta标签');
    test('HTML有iOS PWA支持', htmlContent.includes('apple-mobile-web-app'), '缺少iOS PWA支持');
    test('HTML有SW注册脚本', htmlContent.includes('serviceWorker.register'), '缺少Service Worker注册脚本');
    test('HTML有安全区域支持', htmlContent.includes('viewport-fit=cover'), '缺少安全区域支持');
  }
} catch (error) {
  test('HTML解析', false, `解析index.html失败: ${error.message}`);
}

// 4. 验证图标文件
console.log('\n🖼️ 验证PWA图标...');
const iconSizes = ['72x72', '96x96', '128x128', '144x144', '152x152', '192x192', '384x384', '512x512'];
const iconsDir = path.join(projectRoot, 'public/icons');

test('图标目录存在', fs.existsSync(iconsDir), 'public/icons目录不存在');

if (fs.existsSync(iconsDir)) {
  iconSizes.forEach(size => {
    const iconPath = path.join(iconsDir, `icon-${size}.png`);
    test(`图标${size}存在`, fs.existsSync(iconPath), `icon-${size}.png文件不存在`);
  });
}

// 5. 验证构建输出
console.log('\n📦 验证构建输出...');
const distDir = path.join(projectRoot, 'dist');
test('构建目录存在', fs.existsSync(distDir), 'dist目录不存在');

if (fs.existsSync(distDir)) {
  const distIndexPath = path.join(distDir, 'index.html');
  const distManifestPath = path.join(distDir, 'manifest.json');
  const distSwPath = path.join(distDir, 'sw.js');
  
  test('构建后index.html存在', fs.existsSync(distIndexPath), '构建后index.html不存在');
  test('构建后manifest.json存在', fs.existsSync(distManifestPath), '构建后manifest.json不存在');
  test('构建后sw.js存在', fs.existsSync(distSwPath), '构建后sw.js不存在');
}

// 6. 验证React组件
console.log('\n⚛️ 验证React PWA组件...');
const networkStatusPath = path.join(projectRoot, 'src/components/NetworkStatus.jsx');
const mobileNavPath = path.join(projectRoot, 'src/components/MobileNav.jsx');

test('NetworkStatus组件存在', fs.existsSync(networkStatusPath), 'NetworkStatus.jsx组件不存在');
test('MobileNav组件存在', fs.existsSync(mobileNavPath), 'MobileNav.jsx组件不存在');

if (fs.existsSync(networkStatusPath)) {
  const networkContent = fs.readFileSync(networkStatusPath, 'utf8');
  test('NetworkStatus有离线检测', networkContent.includes('navigator.onLine'), '缺少离线状态检测');
  test('NetworkStatus有缓存检查', networkContent.includes('caches'), '缺少缓存状态检查');
  test('NetworkStatus有网络事件监听', networkContent.includes("'online'"), '缺少网络事件监听');
}

if (fs.existsSync(mobileNavPath)) {
  const mobileContent = fs.readFileSync(mobileNavPath, 'utf8');
  test('MobileNav有触觉反馈', mobileContent.includes('Haptics'), '缺少触觉反馈支持');
  test('MobileNav有Capacitor检测', mobileContent.includes('Capacitor'), '缺少Capacitor环境检测');
  test('MobileNav有安全区域样式', mobileContent.includes('safe-area'), '缺少安全区域样式');
}

// 输出测试结果
console.log('\n📊 测试结果汇总:');
console.log('='.repeat(50));
console.log(`✅ 通过: ${results.passed}`);
console.log(`❌ 失败: ${results.failed}`);
console.log(`📝 总计: ${results.tests.length}`);
console.log(`📈 通过率: ${((results.passed / results.tests.length) * 100).toFixed(1)}%`);

if (results.failed > 0) {
  console.log('\n❌ 失败的测试:');
  results.tests
    .filter(test => !test.passed)
    .forEach(test => {
      console.log(`   • ${test.name}: ${test.message}`);
    });
}

console.log('\n🎯 PWA功能验证完成!');

// 如果有失败的测试，退出码为1
if (results.failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 所有PWA功能验证通过！');
  process.exit(0);
}

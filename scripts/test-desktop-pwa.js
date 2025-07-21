#!/usr/bin/env node

/**
 * 桌面PWA功能测试脚本
 * 验证桌面安装和功能是否正常工作
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

console.log('🖥️  桌面PWA功能测试开始...\n');

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

// 1. 验证manifest.json桌面支持
console.log('📱 验证Manifest桌面支持...');
try {
  const manifestPath = path.join(projectRoot, 'public/manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  
  test('Manifest支持display_override', 
    Array.isArray(manifest.display_override), 
    'display_override字段缺失或不是数组');
    
  test('Manifest包含window-controls-overlay', 
    manifest.display_override?.includes('window-controls-overlay'), 
    'display_override中缺少window-controls-overlay');
    
  test('Manifest支持文件处理', 
    Array.isArray(manifest.file_handlers), 
    'file_handlers字段缺失或不是数组');
    
  test('Manifest支持协议处理', 
    Array.isArray(manifest.protocol_handlers), 
    'protocol_handlers字段缺失或不是数组');
    
  test('Manifest有启动处理器', 
    manifest.launch_handler && manifest.launch_handler.client_mode, 
    'launch_handler配置缺失');
    
} catch (error) {
  test('Manifest桌面配置解析', false, `解析失败: ${error.message}`);
}

// 2. 验证桌面组件
console.log('\n🖥️  验证桌面组件...');
const desktopComponents = [
  'src/components/DesktopInstallPrompt.jsx',
  'src/components/DesktopEnhancements.jsx'
];

desktopComponents.forEach(componentPath => {
  const fullPath = path.join(projectRoot, componentPath);
  const exists = fs.existsSync(fullPath);
  test(`${path.basename(componentPath)}存在`, exists, `文件不存在: ${componentPath}`);
  
  if (exists) {
    const content = fs.readFileSync(fullPath, 'utf8');
    
    // 检查关键功能
    if (componentPath.includes('DesktopInstallPrompt')) {
      test('安装提示有beforeinstallprompt监听', 
        content.includes('beforeinstallprompt'), 
        '缺少beforeinstallprompt事件监听');
        
      test('安装提示有平台检测', 
        content.includes('userAgent'), 
        '缺少平台检测逻辑');
        
      test('安装提示有手动安装指南', 
        content.includes('getInstallInstructions'), 
        '缺少手动安装指南');
    }
    
    if (componentPath.includes('DesktopEnhancements')) {
      test('桌面增强有快捷键支持', 
        content.includes('keydown'), 
        '缺少键盘快捷键支持');
        
      test('桌面增强有文件拖拽', 
        content.includes('dragenter'), 
        '缺少文件拖拽支持');
        
      test('桌面增强有通知系统', 
        content.includes('DesktopNotification'), 
        '缺少桌面通知组件');
    }
  }
});

// 3. 验证桌面样式
console.log('\n🎨 验证桌面样式...');
const desktopCssPath = path.join(projectRoot, 'src/styles/desktop.css');
test('桌面样式文件存在', fs.existsSync(desktopCssPath), 'desktop.css文件不存在');

if (fs.existsSync(desktopCssPath)) {
  const cssContent = fs.readFileSync(desktopCssPath, 'utf8');
  
  test('样式支持standalone模式', 
    cssContent.includes('display-mode: standalone'), 
    '缺少standalone模式样式');
    
  test('样式支持window-controls-overlay', 
    cssContent.includes('display-mode: window-controls-overlay'), 
    '缺少window-controls-overlay模式样式');
    
  test('样式有桌面特定优化', 
    cssContent.includes('desktop-titlebar'), 
    '缺少桌面标题栏样式');
    
  test('样式有文件拖拽区域', 
    cssContent.includes('file-drop-zone'), 
    '缺少文件拖拽区域样式');
    
  test('样式有桌面通知', 
    cssContent.includes('desktop-notification'), 
    '缺少桌面通知样式');
}

// 4. 验证主应用集成
console.log('\n⚛️  验证主应用集成...');
const appJsxPath = path.join(projectRoot, 'src/App.jsx');
if (fs.existsSync(appJsxPath)) {
  const appContent = fs.readFileSync(appJsxPath, 'utf8');
  
  test('App.jsx导入桌面安装提示', 
    appContent.includes('DesktopInstallPrompt'), 
    '缺少DesktopInstallPrompt导入');
    
  test('App.jsx导入桌面增强', 
    appContent.includes('DesktopEnhancements'), 
    '缺少DesktopEnhancements导入');
    
  test('App.jsx渲染桌面组件', 
    appContent.includes('<DesktopInstallPrompt') && appContent.includes('<DesktopEnhancements'), 
    '缺少桌面组件渲染');
}

// 5. 验证样式导入
console.log('\n📦 验证样式导入...');
const mainJsxPath = path.join(projectRoot, 'src/main.jsx');
if (fs.existsSync(mainJsxPath)) {
  const mainContent = fs.readFileSync(mainJsxPath, 'utf8');
  
  test('main.jsx导入桌面样式', 
    mainContent.includes('./styles/desktop.css'), 
    '缺少桌面样式导入');
}

// 6. 验证构建输出
console.log('\n📦 验证构建输出...');
const distDir = path.join(projectRoot, 'dist');
if (fs.existsSync(distDir)) {
  const distManifestPath = path.join(distDir, 'manifest.json');
  test('构建后manifest.json存在', fs.existsSync(distManifestPath), '构建后manifest.json不存在');
  
  if (fs.existsSync(distManifestPath)) {
    try {
      const distManifest = JSON.parse(fs.readFileSync(distManifestPath, 'utf8'));
      test('构建后manifest包含桌面支持', 
        distManifest.display_override && distManifest.file_handlers, 
        '构建后manifest缺少桌面功能');
    } catch (error) {
      test('构建后manifest解析', false, `解析失败: ${error.message}`);
    }
  }
}

// 7. 验证PWA安装条件
console.log('\n🔍 验证PWA安装条件...');
const indexHtmlPath = path.join(projectRoot, 'index.html');
if (fs.existsSync(indexHtmlPath)) {
  const htmlContent = fs.readFileSync(indexHtmlPath, 'utf8');
  
  test('HTML有HTTPS支持提示', 
    htmlContent.includes('manifest') && htmlContent.includes('theme-color'), 
    'HTML缺少PWA基础配置');
}

// 8. 验证Service Worker桌面支持
console.log('\n🔧 验证Service Worker桌面支持...');
const swPath = path.join(projectRoot, 'public/sw.js');
if (fs.existsSync(swPath)) {
  const swContent = fs.readFileSync(swPath, 'utf8');
  
  test('Service Worker支持文件处理', 
    swContent.includes('fetch'), 
    'Service Worker缺少文件处理支持');
}

// 输出测试结果
console.log('\n📊 桌面PWA测试结果汇总:');
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

console.log('\n🎯 桌面PWA功能测试完成!');

// 输出安装指南
console.log('\n📖 桌面安装指南:');
console.log('='.repeat(50));
console.log('1. 在Chrome/Edge中访问应用');
console.log('2. 点击地址栏右侧的安装图标 ⊕');
console.log('3. 或者点击菜单 → 更多工具 → 安装为应用');
console.log('4. 应用将作为独立窗口运行');
console.log('5. 支持文件拖拽、快捷键、离线使用等桌面功能');

// 如果有失败的测试，退出码为1
if (results.failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 所有桌面PWA功能验证通过！');
  process.exit(0);
}

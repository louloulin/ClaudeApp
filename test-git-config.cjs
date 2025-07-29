#!/usr/bin/env node

/**
 * Git配置功能测试脚本
 * 用于验证Git配置管理中心的基本功能
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkFileExists(filePath, description) {
  const fullPath = path.resolve(filePath);
  if (fs.existsSync(fullPath)) {
    log(`✓ ${description}: ${filePath}`, 'green');
    return true;
  } else {
    log(`✗ ${description}: ${filePath}`, 'red');
    return false;
  }
}

function checkDirectoryExists(dirPath, description) {
  const fullPath = path.resolve(dirPath);
  if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
    log(`✓ ${description}: ${dirPath}`, 'green');
    return true;
  } else {
    log(`✗ ${description}: ${dirPath}`, 'red');
    return false;
  }
}

function checkFileContent(filePath, searchText, description) {
  try {
    const content = fs.readFileSync(path.resolve(filePath), 'utf8');
    if (content.includes(searchText)) {
      log(`✓ ${description}`, 'green');
      return true;
    } else {
      log(`✗ ${description}`, 'red');
      return false;
    }
  } catch (error) {
    log(`✗ ${description}: 文件读取失败`, 'red');
    return false;
  }
}

function runTests() {
  log('\n=== Git配置功能测试 ===', 'blue');
  
  let passedTests = 0;
  let totalTests = 0;
  
  // 测试前端组件文件
  log('\n1. 检查前端组件文件:', 'yellow');
  totalTests++;
  if (checkFileExists('src/components/GitConfigCenter.jsx', 'Git配置管理中心主组件')) {
    passedTests++;
  }
  
  totalTests++;
  if (checkFileExists('src/components/git-config/PlatformSelector.jsx', '平台选择器组件')) {
    passedTests++;
  }
  
  totalTests++;
  if (checkFileExists('src/components/git-config/CredentialManager.jsx', '凭据管理组件')) {
    passedTests++;
  }
  
  totalTests++;
  if (checkFileExists('src/components/git-config/SSHKeyGenerator.jsx', 'SSH密钥生成器组件')) {
    passedTests++;
  }
  
  totalTests++;
  if (checkFileExists('src/components/git-config/RemoteRepositoryConfig.jsx', '远程仓库配置组件')) {
    passedTests++;
  }
  
  // 测试后端API文件
  log('\n2. 检查后端API文件:', 'yellow');
  totalTests++;
  if (checkFileExists('server/routes/git-config.js', 'Git配置API路由')) {
    passedTests++;
  }
  
  totalTests++;
  if (checkFileExists('server/routes/git.js', 'Git操作API路由')) {
    passedTests++;
  }
  
  // 测试路由注册
  log('\n3. 检查路由注册:', 'yellow');
  totalTests++;
  if (checkFileContent('server/index.js', 'git-config', 'Git配置路由已注册到服务器')) {
    passedTests++;
  }
  
  // 测试组件集成
  log('\n4. 检查组件集成:', 'yellow');
  totalTests++;
  if (checkFileContent('src/components/GitConfigCenter.jsx', 'RemoteRepositoryConfig', 'RemoteRepositoryConfig组件已集成')) {
    passedTests++;
  }
  
  totalTests++;
  if (checkFileContent('src/components/GitConfigCenter.jsx', 'PlatformSelector', 'PlatformSelector组件已集成')) {
    passedTests++;
  }
  
  // 测试API端点
  log('\n5. 检查API端点:', 'yellow');
  totalTests++;
  if (checkFileContent('server/routes/git-config.js', '/platforms', '平台管理API端点存在')) {
    passedTests++;
  }
  
  totalTests++;
  if (checkFileContent('server/routes/git-config.js', '/credentials', '凭据管理API端点存在')) {
    passedTests++;
  }
  
  totalTests++;
  if (checkFileContent('server/routes/git-config.js', '/ssh-keys', 'SSH密钥管理API端点存在')) {
    passedTests++;
  }
  
  totalTests++;
  if (checkFileContent('server/routes/git.js', '/remotes', '远程仓库管理API端点存在')) {
    passedTests++;
  }
  
  // 测试文件
  log('\n6. 检查测试文件:', 'yellow');
  totalTests++;
  if (checkFileExists('src/tests/git-config.test.jsx', 'Git配置测试文件')) {
    passedTests++;
  }
  
  // 测试目录结构
  log('\n7. 检查目录结构:', 'yellow');
  totalTests++;
  if (checkDirectoryExists('src/components/git-config', 'Git配置组件目录')) {
    passedTests++;
  }
  
  totalTests++;
  if (checkDirectoryExists('src/tests', '测试文件目录')) {
    passedTests++;
  }
  
  // 显示测试结果
  log('\n=== 测试结果 ===', 'blue');
  const successRate = ((passedTests / totalTests) * 100).toFixed(1);
  
  if (passedTests === totalTests) {
    log(`🎉 所有测试通过! (${passedTests}/${totalTests}) - ${successRate}%`, 'green');
  } else {
    log(`⚠️  部分测试失败: ${passedTests}/${totalTests} 通过 - ${successRate}%`, 'yellow');
  }
  
  // 功能验证建议
  log('\n=== 下一步验证建议 ===', 'blue');
  log('1. 启动开发服务器: npm run dev', 'yellow');
  log('2. 在浏览器中测试Git配置管理中心界面', 'yellow');
  log('3. 测试各个组件的交互功能', 'yellow');
  log('4. 验证API端点的响应', 'yellow');
  log('5. 运行单元测试: npm test', 'yellow');
  
  return passedTests === totalTests;
}

// 运行测试
if (require.main === module) {
  const success = runTests();
  process.exit(success ? 0 : 1);
}

module.exports = { runTests };
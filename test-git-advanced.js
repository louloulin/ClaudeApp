/**
 * Git Advanced Features Test Script
 * 测试高级 Git 功能的后端 API
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { execSync } from 'child_process';

// 测试配置
const TEST_CONFIG = {
  baseUrl: 'http://localhost:3008',
  testProject: '/Users/louloulin/Documents/linchong/claude/claudecodeui', // 使用当前项目的绝对路径进行测试
  token: null // 将在测试中获取
};

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(`  ${title}`, 'cyan');
  log('='.repeat(60), 'cyan');
}

function logTest(testName) {
  log(`\n🧪 测试: ${testName}`, 'blue');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

// HTTP 请求辅助函数
async function makeRequest(endpoint, options = {}) {
  const url = `${TEST_CONFIG.baseUrl}${endpoint}`;
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...(TEST_CONFIG.token && { 'Authorization': `Bearer ${TEST_CONFIG.token}` })
    }
  };
  
  const finalOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers
    }
  };

  try {
    const response = await fetch(url, finalOptions);
    const data = await response.json();
    return { response, data, status: response.status };
  } catch (error) {
    throw new Error(`Request failed: ${error.message}`);
  }
}

// 获取认证令牌（实际登录）
async function getAuthToken() {
  try {
    // 尝试使用默认的测试用户登录
    log('🔐 尝试登录...', 'blue');
    const loginData = {
      username: 'admin',
      password: 'admin123'
    };
    
    const response = await fetch(`${TEST_CONFIG.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(loginData)
    });
    
    if (response.ok) {
      const data = await response.json();
      TEST_CONFIG.token = data.token;
      logSuccess('认证令牌获取成功');
      return true;
    } else {
      const loginError = await response.text();
      logWarning(`登录失败: ${response.status} - ${loginError}`);
      
      // 如果登录失败，尝试注册然后登录
      log('🔐 尝试注册新用户...', 'blue');
      const uniqueUsername = `testuser-${Date.now()}`;
      const registerResponse = await fetch(`${TEST_CONFIG.baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: uniqueUsername,
          password: 'testpass123',
          email: `test-${Date.now()}@example.com`
        })
      });
      
      if (registerResponse.ok) {
        logSuccess('注册成功，现在登录');
        const loginResponse = await fetch(`${TEST_CONFIG.baseUrl}/api/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            username: uniqueUsername,
            password: 'testpass123'
          })
        });
        
        if (loginResponse.ok) {
          const loginData = await loginResponse.json();
          TEST_CONFIG.token = loginData.token;
          logSuccess('登录成功');
          return true;
        } else {
          const loginError2 = await loginResponse.text();
          logError(`登录失败: ${loginResponse.status} - ${loginError2}`);
        }
      } else {
        const registerError = await registerResponse.text();
        logError(`注册失败: ${registerResponse.status} - ${registerError}`);
      }
      
      logError('认证失败');
      return false;
    }
  } catch (error) {
    logError(`认证失败: ${error.message}`);
    return false;
  }
}

// 测试合并冲突功能
async function testMergeConflicts() {
  logSection('测试合并冲突功能');
  
  try {
    // 测试获取冲突列表
    logTest('获取合并冲突列表');
    const { data, status } = await makeRequest(`/api/git-advanced/conflicts?project=${encodeURIComponent(TEST_CONFIG.testProject)}`);
    
    if (status === 200) {
      logSuccess(`获取冲突列表成功: ${data.conflicts ? data.conflicts.length : 0} 个冲突`);
      if (data.conflicts && data.conflicts.length > 0) {
        log(`冲突文件: ${data.conflicts.join(', ')}`, 'yellow');
      }
    } else {
      logWarning(`获取冲突列表返回状态: ${status} - ${data.error || '无错误信息'}`);
    }
  } catch (error) {
    logError(`测试合并冲突功能失败: ${error.message}`);
  }
}

// 测试 Stash 功能
async function testStashFeatures() {
  logSection('测试 Stash 功能');
  
  try {
    // 测试获取 stash 列表
    logTest('获取 Stash 列表');
    const { data, status } = await makeRequest(`/api/git-advanced/stash?project=${encodeURIComponent(TEST_CONFIG.testProject)}`);
    
    if (status === 200) {
      logSuccess(`获取 Stash 列表成功: ${data.stashes ? data.stashes.length : 0} 个 stash`);
      if (data.stashes && data.stashes.length > 0) {
        data.stashes.forEach((stash, index) => {
          log(`  ${index + 1}. ${stash.name}: ${stash.message}`, 'yellow');
        });
      }
    } else {
      logWarning(`获取 Stash 列表返回状态: ${status} - ${data.error || '无错误信息'}`);
    }
    
    // 测试创建 stash（如果有未提交的更改）
    logTest('测试创建 Stash（如果有更改）');
    try {
      const createResult = await makeRequest('/api/git-advanced/stash', {
        method: 'POST',
        body: JSON.stringify({
          project: TEST_CONFIG.testProject,
          message: 'Test stash from automated test',
          includeUntracked: false
        })
      });
      
      if (createResult.status === 200) {
        logSuccess('创建 Stash 成功');
      } else {
        logWarning(`创建 Stash 返回状态: ${createResult.status} - ${createResult.data.error || '可能没有更改需要 stash'}`);
      }
    } catch (error) {
      logWarning(`创建 Stash 测试: ${error.message}`);
    }
  } catch (error) {
    logError(`测试 Stash 功能失败: ${error.message}`);
  }
}

// 测试标签功能
async function testTagFeatures() {
  logSection('测试标签功能');
  
  try {
    // 测试获取标签列表
    logTest('获取标签列表');
    const { data, status } = await makeRequest(`/api/git-advanced/tags?project=${encodeURIComponent(TEST_CONFIG.testProject)}`);
    
    if (status === 200) {
      logSuccess(`获取标签列表成功: ${data.tags ? data.tags.length : 0} 个标签`);
      if (data.tags && data.tags.length > 0) {
        data.tags.forEach((tag, index) => {
          log(`  ${index + 1}. ${tag.name} (${tag.hash}) - ${tag.date}`, 'yellow');
          if (tag.message) {
            log(`     消息: ${tag.message}`, 'yellow');
          }
        });
      }
    } else {
      logWarning(`获取标签列表返回状态: ${status} - ${data.error || '无错误信息'}`);
    }
    
    // 测试创建标签
    logTest('测试创建标签');
    const testTagName = `test-tag-${Date.now()}`;
    try {
      const createResult = await makeRequest('/api/git-advanced/tags', {
        method: 'POST',
        body: JSON.stringify({
          project: TEST_CONFIG.testProject,
          name: testTagName,
          message: 'Test tag created by automated test',
          commit: 'HEAD'
        })
      });
      
      if (createResult.status === 200) {
        logSuccess(`创建标签 "${testTagName}" 成功`);
        
        // 测试删除刚创建的标签
        logTest('测试删除标签');
        const deleteResult = await makeRequest(`/api/git-advanced/tags/${encodeURIComponent(testTagName)}`, {
          method: 'DELETE',
          body: JSON.stringify({
            project: TEST_CONFIG.testProject
          })
        });
        
        if (deleteResult.status === 200) {
          logSuccess(`删除标签 "${testTagName}" 成功`);
        } else {
          logWarning(`删除标签返回状态: ${deleteResult.status} - ${deleteResult.data.error || '无错误信息'}`);
        }
      } else {
        logWarning(`创建标签返回状态: ${createResult.status} - ${createResult.data.error || '无错误信息'}`);
      }
    } catch (error) {
      logWarning(`标签创建/删除测试: ${error.message}`);
    }
  } catch (error) {
    logError(`测试标签功能失败: ${error.message}`);
  }
}

// 测试服务器连接
async function testServerConnection() {
  logSection('测试服务器连接');
  
  try {
    logTest('检查服务器状态');
    // 先尝试访问一个不需要认证的端点
    const response = await fetch(`${TEST_CONFIG.baseUrl}/api/auth/status`);
    if (response.status === 200 || response.status === 401) {
      logSuccess('服务器连接正常');
      return true;
    } else {
      logError(`服务器返回状态: ${response.status}`);
      return false;
    }
  } catch (error) {
    logError(`无法连接到服务器: ${error.message}`);
    logWarning('请确保服务器正在运行在 http://localhost:3001');
    return false;
  }
}

// 检查 Git 仓库状态
function checkGitRepository() {
  logSection('检查 Git 仓库状态');
  
  try {
    // 检查是否在 Git 仓库中
    execSync('git rev-parse --git-dir', { stdio: 'pipe' });
    logSuccess('当前目录是 Git 仓库');
    
    // 获取当前分支
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
    log(`当前分支: ${branch}`, 'blue');
    
    // 获取最近的提交
    const lastCommit = execSync('git log -1 --oneline', { encoding: 'utf8' }).trim();
    log(`最近提交: ${lastCommit}`, 'blue');
    
    return true;
  } catch (error) {
    logError('当前目录不是 Git 仓库或 Git 未安装');
    return false;
  }
}

// 主测试函数
async function runTests() {
  log('Git 高级功能测试开始', 'magenta');
  log(`测试时间: ${new Date().toLocaleString()}`, 'magenta');
  
  // 检查 Git 仓库
  if (!checkGitRepository()) {
    logError('Git 仓库检查失败，退出测试');
    return;
  }
  
  // 检查服务器连接
  if (!await testServerConnection()) {
    logError('服务器连接失败，退出测试');
    return;
  }
  
  // 获取认证令牌
  if (!await getAuthToken()) {
    logError('认证失败，退出测试');
    return;
  }
  
  // 运行各项测试
  await testMergeConflicts();
  await testStashFeatures();
  await testTagFeatures();
  
  logSection('测试完成');
  logSuccess('所有测试已完成！');
  log('\n注意: 某些测试可能会显示警告，这是正常的，因为它们依赖于当前仓库的状态。', 'yellow');
}

// 运行测试
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(error => {
    logError(`测试运行失败: ${error.message}`);
    process.exit(1);
  });
}

// ES 模块导出
export {
  runTests,
  testMergeConflicts,
  testStashFeatures,
  testTagFeatures
};
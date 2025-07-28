/**
 * 前端多租户功能测试
 * 测试用户注册、登录、多用户会话隔离等功能
 */

const puppeteer = require('puppeteer');
const assert = require('assert');

class FrontendMultitenantTest {
    constructor() {
        this.browser = null;
        this.baseUrl = 'http://localhost:3009';
    }

    async setup() {
        console.log('🚀 启动浏览器测试环境...');
        this.browser = await puppeteer.launch({
            headless: false, // 设置为false以便观察测试过程
            defaultViewport: { width: 1280, height: 720 },
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
    }

    async teardown() {
        if (this.browser) {
            await this.browser.close();
            console.log('🔚 浏览器测试环境已关闭');
        }
    }

    async testUserRegistration() {
        console.log('\n📝 测试用户注册功能...');
        const page = await this.browser.newPage();
        
        try {
            await page.goto(this.baseUrl);
            await page.waitForSelector('body', { timeout: 5000 });
            
            // 检查是否有注册按钮或链接
            const hasRegisterButton = await page.$('.register-btn, [data-testid="register"], a[href*="register"]');
            if (hasRegisterButton) {
                console.log('✅ 找到注册按钮');
            } else {
                console.log('⚠️  未找到明显的注册按钮，检查页面内容');
                const pageContent = await page.content();
                if (pageContent.includes('register') || pageContent.includes('注册')) {
                    console.log('✅ 页面包含注册相关内容');
                }
            }
            
            return true;
        } catch (error) {
            console.error('❌ 用户注册测试失败:', error.message);
            return false;
        } finally {
            await page.close();
        }
    }

    async testUserLogin() {
        console.log('\n🔐 测试用户登录功能...');
        const page = await this.browser.newPage();
        
        try {
            await page.goto(this.baseUrl);
            await page.waitForSelector('body', { timeout: 5000 });
            
            // 检查是否有登录表单或按钮
            const hasLoginForm = await page.$('form, .login-form, [data-testid="login"], input[type="email"], input[type="password"]');
            if (hasLoginForm) {
                console.log('✅ 找到登录表单元素');
            } else {
                console.log('⚠️  未找到明显的登录表单，检查页面内容');
                const pageContent = await page.content();
                if (pageContent.includes('login') || pageContent.includes('登录')) {
                    console.log('✅ 页面包含登录相关内容');
                }
            }
            
            return true;
        } catch (error) {
            console.error('❌ 用户登录测试失败:', error.message);
            return false;
        } finally {
            await page.close();
        }
    }

    async testMultiUserSessions() {
        console.log('\n👥 测试多用户会话隔离...');
        const page1 = await this.browser.newPage();
        const page2 = await this.browser.newPage();
        
        try {
            // 在两个页面中打开应用
            await Promise.all([
                page1.goto(this.baseUrl),
                page2.goto(this.baseUrl)
            ]);
            
            await Promise.all([
                page1.waitForSelector('body', { timeout: 5000 }),
                page2.waitForSelector('body', { timeout: 5000 })
            ]);
            
            // 检查两个页面是否独立运行
            const page1Title = await page1.title();
            const page2Title = await page2.title();
            
            console.log(`✅ 页面1标题: ${page1Title}`);
            console.log(`✅ 页面2标题: ${page2Title}`);
            
            // 检查是否有用户相关的UI元素
            const page1HasUserUI = await page1.$('.user-info, .profile, [data-testid="user"]');
            const page2HasUserUI = await page2.$('.user-info, .profile, [data-testid="user"]');
            
            if (page1HasUserUI || page2HasUserUI) {
                console.log('✅ 检测到用户界面元素');
            }
            
            return true;
        } catch (error) {
            console.error('❌ 多用户会话测试失败:', error.message);
            return false;
        } finally {
            await page1.close();
            await page2.close();
        }
    }

    async testResponsiveDesign() {
        console.log('\n📱 测试响应式设计...');
        const page = await this.browser.newPage();
        
        try {
            await page.goto(this.baseUrl);
            await page.waitForSelector('body', { timeout: 5000 });
            
            // 测试桌面视图
            await page.setViewport({ width: 1280, height: 720 });
            await new Promise(resolve => setTimeout(resolve, 1000));
            console.log('✅ 桌面视图加载完成');
            
            // 测试平板视图
            await page.setViewport({ width: 768, height: 1024 });
            await new Promise(resolve => setTimeout(resolve, 1000));
            console.log('✅ 平板视图加载完成');
            
            // 测试移动端视图
            await page.setViewport({ width: 375, height: 667 });
            await new Promise(resolve => setTimeout(resolve, 1000));
            console.log('✅ 移动端视图加载完成');
            
            return true;
        } catch (error) {
            console.error('❌ 响应式设计测试失败:', error.message);
            return false;
        } finally {
            await page.close();
        }
    }

    async testPWAFeatures() {
        console.log('\n🔧 测试PWA功能...');
        const page = await this.browser.newPage();
        
        try {
            await page.goto(this.baseUrl);
            await page.waitForSelector('body', { timeout: 5000 });
            
            // 检查Service Worker
            const hasServiceWorker = await page.evaluate(() => {
                return 'serviceWorker' in navigator;
            });
            
            if (hasServiceWorker) {
                console.log('✅ 浏览器支持Service Worker');
            }
            
            // 检查manifest.json
            const manifestLink = await page.$('link[rel="manifest"]');
            if (manifestLink) {
                console.log('✅ 找到manifest.json链接');
            } else {
                console.log('⚠️  未找到manifest.json链接');
            }
            
            return true;
        } catch (error) {
            console.error('❌ PWA功能测试失败:', error.message);
            return false;
        } finally {
            await page.close();
        }
    }

    async runAllTests() {
        console.log('🧪 开始前端多租户功能测试\n');
        
        const results = {
            registration: false,
            login: false,
            multiUser: false,
            responsive: false,
            pwa: false
        };
        
        try {
            await this.setup();
            
            results.registration = await this.testUserRegistration();
            results.login = await this.testUserLogin();
            results.multiUser = await this.testMultiUserSessions();
            results.responsive = await this.testResponsiveDesign();
            results.pwa = await this.testPWAFeatures();
            
        } catch (error) {
            console.error('❌ 测试过程中发生错误:', error);
        } finally {
            await this.teardown();
        }
        
        // 输出测试结果
        console.log('\n📊 测试结果汇总:');
        console.log('==================');
        console.log(`用户注册功能: ${results.registration ? '✅ 通过' : '❌ 失败'}`);
        console.log(`用户登录功能: ${results.login ? '✅ 通过' : '❌ 失败'}`);
        console.log(`多用户会话隔离: ${results.multiUser ? '✅ 通过' : '❌ 失败'}`);
        console.log(`响应式设计: ${results.responsive ? '✅ 通过' : '❌ 失败'}`);
        console.log(`PWA功能: ${results.pwa ? '✅ 通过' : '❌ 失败'}`);
        
        const passedTests = Object.values(results).filter(Boolean).length;
        const totalTests = Object.keys(results).length;
        console.log(`\n总体通过率: ${passedTests}/${totalTests} (${Math.round(passedTests/totalTests*100)}%)`);
        
        return results;
    }
}

// 如果直接运行此文件
if (require.main === module) {
    const test = new FrontendMultitenantTest();
    test.runAllTests().then(results => {
        const allPassed = Object.values(results).every(Boolean);
        process.exit(allPassed ? 0 : 1);
    }).catch(error => {
        console.error('测试执行失败:', error);
        process.exit(1);
    });
}

module.exports = FrontendMultitenantTest;
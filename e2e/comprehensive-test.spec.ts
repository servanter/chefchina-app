import { test, expect } from '@playwright/test';

const BASE_URL = 'https://chefchina-app.vercel.app';
const SCREENSHOT_PATH = '/tmp/qa-screenshots';

test.describe('ChefChina App 综合测试', () => {
  
  test('完整功能测试流程', async ({ page }) => {
    const testComment = `QA测试评论-${Date.now()}`;
    const apiCalls: any[] = [];
    
    // 监听网络和控制台
    page.on('request', request => {
      if (request.url().includes('comment') || (request.url().includes('api') && request.method() === 'POST')) {
        apiCalls.push({
          type: 'request',
          method: request.method(),
          url: request.url(),
          data: request.postData()
        });
        console.log(`📤 ${request.method()} ${request.url()}`);
        if (request.postData()) console.log(`   Data: ${request.postData()}`);
      }
    });
    
    page.on('response', async response => {
      if (response.url().includes('comment') || response.url().includes('/api/recipes/')) {
        const body = await response.text().catch(() => '');
        apiCalls.push({
          type: 'response',
          status: response.status(),
          url: response.url(),
          body: body.substring(0, 300)
        });
        console.log(`📥 ${response.status()} ${response.url()}`);
        if (body) console.log(`   Body: ${body.substring(0, 150)}`);
      }
    });
    
    page.on('console', msg => {
      if (msg.type() === 'error') console.log(`🔴 ${msg.text()}`);
    });
    
    // === 测试 1: 首页加载 ===
    console.log('\n📍 测试 1: 首页加载');
    await page.goto(BASE_URL);
    await page.waitForLoadState('domcontentloaded');
    
    // 等待 React Native Web 渲染
    await page.waitForFunction(() => {
      const text = document.body.innerText;
      return text.includes('Featured') || text.includes('Quick') || text.includes('Featured Recipes');
    }, { timeout: 15000 });
    
    await page.screenshot({ path: `${SCREENSHOT_PATH}/01-homepage.png`, fullPage: true });
    console.log('✅ 首页加载成功');
    
    // === 测试 2: 菜谱卡片展示 ===
    console.log('\n📍 测试 2: 菜谱卡片');
    const bodyText = await page.locator('body').textContent();
    
    if (bodyText?.includes('Dan Dan') || bodyText?.includes('担担面')) {
      console.log('✅ 菜谱卡片内容展示正常');
    } else {
      console.log('⚠️ 未找到预期菜谱内容');
    }
    
    // === 测试 3: 图片加载 ===
    console.log('\n📍 测试 3: 图片加载');
    const images = await page.locator('img[src]').all();
    console.log(`✅ 页面包含 ${images.length} 张图片`);
    
    // === 测试 4: 进入详情页 ===
    console.log('\n📍 测试 4: 导航到详情页');
    
    // React Native Web 使用 pressable/touchable 元素
    // 尝试点击包含菜谱名称的元素
    const recipeElements = [
      'text="Dan Dan Noodles"',
      'text="担担面"',
      'text="Featured Recipes"'
    ];
    
    let clicked = false;
    for (const selector of recipeElements) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 })) {
          // 找到父级可点击元素
          const clickableParent = element.locator('xpath=ancestor::*[contains(@role, "button") or contains(@class, "pressable")]').first();
          if (await clickableParent.isVisible({ timeout: 1000 }).catch(() => false)) {
            await clickableParent.click();
            clicked = true;
            console.log(`✅ 点击元素: ${selector}`);
            break;
          } else {
            // 直接点击文本元素
            await element.click();
            clicked = true;
            console.log(`✅ 点击元素: ${selector}`);
            break;
          }
        }
      } catch (e) {
        continue;
      }
    }
    
    if (!clicked) {
      console.log('⚠️ 无法找到可点击的菜谱元素，尝试直接访问详情页');
      // 直接访问一个已知的菜谱页面
      await page.goto(`${BASE_URL}/recipe/rec_23`);
    }
    
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${SCREENSHOT_PATH}/02-detail-page.png`, fullPage: true });
    
    const detailPageText = await page.locator('body').textContent();
    if (detailPageText?.includes('Ingredients') || detailPageText?.includes('食材') || detailPageText?.includes('Steps')) {
      console.log('✅ 详情页内容加载成功');
    } else {
      console.log('⚠️ 详情页内容不完整');
      console.log('页面内容:', detailPageText?.substring(0, 500));
    }
    
    // === 测试 5: 评论功能（核心 Bug） ===
    console.log('\n📍 测试 5: 评论功能测试');
    
    // 滚动到底部
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(2000);
    
    // 查找评论输入框 (React Native 使用 TextInput)
    const commentInput = page.locator('textarea, input[type="text"]').last();
    
    if (await commentInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('✅ 找到评论输入框');
      
      await commentInput.scrollIntoViewIfNeeded();
      await commentInput.fill(testComment);
      console.log(`📝 输入评论: ${testComment}`);
      await page.screenshot({ path: `${SCREENSHOT_PATH}/03-comment-input.png`, fullPage: true });
      
      // 查找提交按钮
      const submitButton = page.locator('button, [role="button"]').filter({ hasText: /提交|发送|Submit|Post/i }).last();
      
      if (await submitButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log('✅ 找到提交按钮');
        await submitButton.click();
        console.log('🚀 点击提交按钮');
        
        await page.waitForTimeout(4000);
        await page.screenshot({ path: `${SCREENSHOT_PATH}/04-after-submit.png`, fullPage: true });
        
        // 检查评论是否显示
        const newComment = page.locator(`text="${testComment}"`);
        const isVisible = await newComment.isVisible({ timeout: 3000 }).catch(() => false);
        
        if (isVisible) {
          console.log('✅ 评论提交后立即显示');
        } else {
          console.log('❌ BUG #1: 评论提交后未显示');
        }
        
        // 刷新验证
        console.log('\n📍 测试 5.1: 刷新后验证');
        await page.reload();
        await page.waitForTimeout(3000);
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(2000);
        
        const commentAfterRefresh = page.locator(`text="${testComment}"`);
        const isVisibleAfterRefresh = await commentAfterRefresh.isVisible({ timeout: 3000 }).catch(() => false);
        
        if (isVisibleAfterRefresh) {
          console.log('✅ 刷新后评论存在');
        } else {
          console.log('❌ BUG #1 确认: 刷新后评论消失');
        }
        
        await page.screenshot({ path: `${SCREENSHOT_PATH}/05-after-refresh.png`, fullPage: true });
      } else {
        console.log('❌ 未找到提交按钮');
        await page.screenshot({ path: `${SCREENSHOT_PATH}/03-no-submit-btn.png`, fullPage: true });
      }
    } else {
      console.log('❌ 未找到评论输入框');
      await page.screenshot({ path: `${SCREENSHOT_PATH}/03-no-comment-input.png`, fullPage: true });
    }
    
    // === 测试 6: 通知 Tab ===
    console.log('\n📍 测试 6: 通知 Tab 测试');
    
    // 点击通知 Tab
    const notificationTab = page.locator('text="Notifications"').or(page.locator('text="通知"')).first();
    
    if (await notificationTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await notificationTab.click();
      console.log('✅ 点击通知 Tab');
      await page.waitForTimeout(3000);
      
      // 检查是否一直 loading
      const startTime = Date.now();
      await page.waitForTimeout(10000); // 等待10秒
      
      const pageContent = await page.locator('body').textContent();
      
      if (pageContent?.includes('Loading') || pageContent?.includes('加载中')) {
        const duration = Date.now() - startTime;
        if (duration > 8000) {
          console.log(`❌ BUG #2: 通知页面一直处于 loading 状态（${duration}ms）`);
        } else {
          console.log('✅ Loading 状态正常');
        }
      } else if (pageContent?.includes('No notifications') || pageContent?.includes('暂无通知')) {
        console.log('✅ 空状态显示正常');
      } else {
        console.log('✅ 通知内容加载正常');
      }
      
      await page.screenshot({ path: `${SCREENSHOT_PATH}/06-notifications.png`, fullPage: true });
    } else {
      console.log('⚠️ 未找到通知 Tab');
    }
    
    // === 输出 API 调用详情 ===
    console.log('\n📊 API 调用详情:');
    console.log(JSON.stringify(apiCalls, null, 2));
  });
});

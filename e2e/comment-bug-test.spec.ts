import { test, expect } from '@playwright/test';

const BASE_URL = 'https://chefchina-app.vercel.app';
const SCREENSHOT_PATH = '/tmp/qa-screenshots';

test.describe('ChefChina 评论功能 Bug 验证', () => {
  
  test('评论功能完整测试', async ({ page }) => {
    const testComment = `测试评论 - ${Date.now()}`;
    
    // 监听网络请求
    const apiCalls: any[] = [];
    page.on('request', request => {
      if (request.url().includes('comment') || request.url().includes('api/recipes/')) {
        apiCalls.push({
          type: 'request',
          url: request.url(),
          method: request.method(),
          postData: request.postData()
        });
        console.log(`📤 ${request.method()} ${request.url()}`);
        if (request.postData()) {
          console.log(`   Data: ${request.postData()}`);
        }
      }
    });
    
    page.on('response', async response => {
      if (response.url().includes('comment') || response.url().includes('api/recipes/')) {
        const body = await response.text().catch(() => 'Unable to read body');
        apiCalls.push({
          type: 'response',
          url: response.url(),
          status: response.status(),
          body: body.substring(0, 500)
        });
        console.log(`📥 ${response.status()} ${response.url()}`);
        console.log(`   Body: ${body.substring(0, 200)}`);
      }
    });
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`🔴 Console Error: ${msg.text()}`);
      }
    });
    
    // 1. 访问首页
    console.log('\n=== Step 1: 加载首页 ===');
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.screenshot({ path: `${SCREENSHOT_PATH}/step1-homepage.png`, fullPage: true });
    
    // 2. 点击第一个菜谱
    console.log('\n=== Step 2: 进入详情页 ===');
    await page.waitForTimeout(2000);
    
    // 尝试多种选择器
    const cardSelectors = [
      'a[href^="/recipe/"]',
      'a[href*="recipe"]',
      '[data-testid="recipe-card"]',
      '.recipe-card a',
      'article a',
    ];
    
    let firstCard = null;
    for (const selector of cardSelectors) {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
        firstCard = element;
        console.log(`✅ 找到卡片，使用选择器: ${selector}`);
        break;
      }
    }
    
    if (!firstCard) {
      // 截图调试
      await page.screenshot({ path: `${SCREENSHOT_PATH}/debug-no-card.png`, fullPage: true });
      
      // 输出页面内容
      const bodyText = await page.locator('body').textContent();
      console.log('页面文本内容:', bodyText?.substring(0, 500));
      
      // 输出所有链接
      const links = await page.locator('a').all();
      console.log(`页面共有 ${links.length} 个链接`);
      for (let i = 0; i < Math.min(5, links.length); i++) {
        const href = await links[i].getAttribute('href');
        console.log(`  Link ${i}: ${href}`);
      }
      
      throw new Error('未找到菜谱卡片');
    }
    
    const recipeUrl = await firstCard.getAttribute('href');
    console.log(`点击菜谱链接: ${recipeUrl}`);
    
    await firstCard.click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${SCREENSHOT_PATH}/step2-detail-page.png`, fullPage: true });
    
    // 3. 查找评论区
    console.log('\n=== Step 3: 查找评论输入框 ===');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(2000);
    
    const commentInputSelectors = [
      'textarea[placeholder*="评论"]',
      'textarea[placeholder*="Comment"]',
      'input[placeholder*="评论"]',
      'textarea',
      'input[type="text"]'
    ];
    
    let commentInput = null;
    for (const selector of commentInputSelectors) {
      const element = page.locator(selector).last(); // 使用 last() 因为评论框通常在底部
      if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
        commentInput = element;
        console.log(`✅ 找到评论输入框，使用选择器: ${selector}`);
        break;
      }
    }
    
    if (!commentInput) {
      await page.screenshot({ path: `${SCREENSHOT_PATH}/step3-no-comment-input.png`, fullPage: true });
      console.log('❌ 未找到评论输入框');
      
      // 输出页面底部内容
      const bodyText = await page.locator('body').textContent();
      console.log('页面包含的文本:', bodyText?.substring(0, 1000));
      
      return;
    }
    
    // 4. 输入评论
    console.log('\n=== Step 4: 输入评论 ===');
    await commentInput.scrollIntoViewIfNeeded();
    await commentInput.fill(testComment);
    console.log(`输入评论: ${testComment}`);
    await page.screenshot({ path: `${SCREENSHOT_PATH}/step4-comment-filled.png`, fullPage: true });
    
    // 5. 提交评论
    console.log('\n=== Step 5: 提交评论 ===');
    const submitButtonSelectors = [
      'button:has-text("提交")',
      'button:has-text("发送")',
      'button:has-text("Submit")',
      'button:has-text("Post")',
      'button[type="submit"]',
      'button:near(:text("评论"))'
    ];
    
    let submitButton = null;
    for (const selector of submitButtonSelectors) {
      const element = page.locator(selector).last();
      if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
        submitButton = element;
        console.log(`✅ 找到提交按钮，使用选择器: ${selector}`);
        break;
      }
    }
    
    if (!submitButton) {
      await page.screenshot({ path: `${SCREENSHOT_PATH}/step5-no-submit-button.png`, fullPage: true });
      console.log('❌ 未找到提交按钮');
      return;
    }
    
    await submitButton.click();
    console.log('🚀 点击提交按钮');
    
    // 等待 API 响应
    await page.waitForTimeout(5000);
    await page.screenshot({ path: `${SCREENSHOT_PATH}/step5-after-submit.png`, fullPage: true });
    
    // 6. 检查评论是否显示
    console.log('\n=== Step 6: 验证评论显示 ===');
    const commentText = page.locator(`text="${testComment}"`);
    const isVisible = await commentText.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (isVisible) {
      console.log('✅ 评论提交后立即显示');
    } else {
      console.log('❌ BUG 确认: 评论提交后未显示');
    }
    
    // 7. 刷新页面验证
    console.log('\n=== Step 7: 刷新页面验证持久化 ===');
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(2000);
    
    const commentAfterRefresh = page.locator(`text="${testComment}"`);
    const isVisibleAfterRefresh = await commentAfterRefresh.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (isVisibleAfterRefresh) {
      console.log('✅ 刷新后评论仍然存在');
    } else {
      console.log('❌ BUG 确认: 刷新后评论消失');
    }
    
    await page.screenshot({ path: `${SCREENSHOT_PATH}/step7-after-refresh.png`, fullPage: true });
    
    // 8. 输出 API 调用详情
    console.log('\n=== API 调用详情 ===');
    console.log(JSON.stringify(apiCalls, null, 2));
  });
});

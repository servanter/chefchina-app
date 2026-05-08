import { test, expect } from '@playwright/test';

const BASE_URL = 'https://chefchina-app.vercel.app';
const SCREENSHOT_PATH = '/tmp/qa-screenshots';

// 测试数据
const testComment = `测试评论 - ${Date.now()}`;

test.describe('ChefChina App 全面测试', () => {
  
  test.describe('1. 首页测试', () => {
    
    test('1.1 页面加载正常', async ({ page }) => {
      const response = await page.goto(BASE_URL);
      expect(response?.status()).toBeLessThan(400);
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: `${SCREENSHOT_PATH}/01-homepage-loaded.png`, fullPage: true });
      console.log('✅ 首页加载成功');
    });

    test('1.2 菜谱卡片展示正常', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');
      
      // 等待菜谱卡片出现
      const recipeCards = page.locator('[class*="card"], [class*="recipe"], article, .grid > div');
      await expect(recipeCards.first()).toBeVisible({ timeout: 10000 });
      
      const count = await recipeCards.count();
      console.log(`✅ 找到 ${count} 个菜谱卡片`);
      await page.screenshot({ path: `${SCREENSHOT_PATH}/02-recipe-cards.png`, fullPage: true });
      
      expect(count).toBeGreaterThan(0);
    });

    test('1.3 图片加载正常', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');
      
      // 检查图片加载
      const images = page.locator('img');
      const firstImage = images.first();
      await expect(firstImage).toBeVisible({ timeout: 10000 });
      
      // 检查图片是否有 src 属性
      const imgCount = await images.count();
      console.log(`✅ 页面包含 ${imgCount} 张图片`);
      
      // 检查第一张图片是否加载成功
      const naturalWidth = await firstImage.evaluate((img: HTMLImageElement) => img.naturalWidth);
      expect(naturalWidth).toBeGreaterThan(0);
      console.log('✅ 图片加载成功');
    });

    test('1.4 搜索功能', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');
      
      // 查找搜索输入框
      const searchInput = page.locator('input[type="search"], input[placeholder*="搜索"], input[placeholder*="search"]').first();
      
      if (await searchInput.isVisible()) {
        await searchInput.fill('宫保鸡丁');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(2000);
        await page.screenshot({ path: `${SCREENSHOT_PATH}/03-search-result.png`, fullPage: true });
        console.log('✅ 搜索功能执行成功');
      } else {
        console.log('⚠️ 未找到搜索框');
      }
    });

    test('1.5 分类筛选', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');
      
      // 查找分类按钮或标签
      const categoryButtons = page.locator('button:has-text("分类"), a:has-text("川菜"), button:has-text("粤菜")');
      
      if (await categoryButtons.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await categoryButtons.first().click();
        await page.waitForTimeout(2000);
        await page.screenshot({ path: `${SCREENSHOT_PATH}/04-category-filter.png`, fullPage: true });
        console.log('✅ 分类筛选功能可用');
      } else {
        console.log('⚠️ 未找到分类筛选按钮');
      }
    });
  });

  test.describe('2. 详情页测试', () => {
    
    test('2.1 从首页进入详情页', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');
      
      // 点击第一个菜谱卡片
      const firstCard = page.locator('a[href*="/recipe"], a[href*="/dish"], article a, .grid > div a').first();
      await expect(firstCard).toBeVisible({ timeout: 10000 });
      
      await firstCard.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      
      // 验证 URL 变化
      expect(page.url()).not.toBe(BASE_URL);
      await page.screenshot({ path: `${SCREENSHOT_PATH}/05-detail-page.png`, fullPage: true });
      console.log('✅ 成功进入详情页');
    });

    test('2.2 详情页内容完整性', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');
      
      const firstCard = page.locator('a[href*="/recipe"], a[href*="/dish"], article a, .grid > div a').first();
      await firstCard.click();
      await page.waitForLoadState('networkidle');
      
      // 检查封面图
      const coverImage = page.locator('img').first();
      await expect(coverImage).toBeVisible({ timeout: 10000 });
      console.log('✅ 封面图加载正常');
      
      // 检查标题
      const title = page.locator('h1, h2').first();
      await expect(title).toBeVisible();
      const titleText = await title.textContent();
      console.log(`✅ 菜谱标题: ${titleText}`);
      
      // 检查食材列表
      const ingredients = page.locator('text=/食材|配料|原料/i');
      if (await ingredients.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log('✅ 食材列表展示正常');
      } else {
        console.log('⚠️ 未找到食材列表');
      }
      
      // 检查步骤
      const steps = page.locator('text=/步骤|做法|制作/i');
      if (await steps.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log('✅ 步骤列表展示正常');
      } else {
        console.log('⚠️ 未找到步骤列表');
      }
      
      await page.screenshot({ path: `${SCREENSHOT_PATH}/06-detail-content.png`, fullPage: true });
    });

    test('2.3 点赞功能', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');
      
      const firstCard = page.locator('a[href*="/recipe"], a[href*="/dish"], article a, .grid > div a').first();
      await firstCard.click();
      await page.waitForLoadState('networkidle');
      
      // 查找点赞按钮
      const likeButton = page.locator('button:has-text("赞"), button:has-text("点赞"), button:has-text("👍"), [aria-label*="like"]').first();
      
      if (await likeButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await likeButton.click();
        await page.waitForTimeout(1000);
        await page.screenshot({ path: `${SCREENSHOT_PATH}/07-like-clicked.png` });
        console.log('✅ 点赞功能可用');
      } else {
        console.log('⚠️ 未找到点赞按钮');
      }
    });

    test('2.4 收藏功能', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');
      
      const firstCard = page.locator('a[href*="/recipe"], a[href*="/dish"], article a, .grid > div a').first();
      await firstCard.click();
      await page.waitForLoadState('networkidle');
      
      // 查找收藏按钮
      const favoriteButton = page.locator('button:has-text("收藏"), button:has-text("⭐"), button:has-text("❤"), [aria-label*="favorite"]').first();
      
      if (await favoriteButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await favoriteButton.click();
        await page.waitForTimeout(1000);
        await page.screenshot({ path: `${SCREENSHOT_PATH}/08-favorite-clicked.png` });
        console.log('✅ 收藏功能可用');
      } else {
        console.log('⚠️ 未找到收藏按钮');
      }
    });
  });

  test.describe('3. 评论功能测试（重点）', () => {
    
    test('3.1 评论输入框显示', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');
      
      const firstCard = page.locator('a[href*="/recipe"], a[href*="/dish"], article a, .grid > div a').first();
      await firstCard.click();
      await page.waitForLoadState('networkidle');
      
      // 滚动到页面底部
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(1000);
      
      // 查找评论输入框
      const commentInput = page.locator('textarea[placeholder*="评论"], input[placeholder*="评论"], textarea[placeholder*="comment"]').first();
      
      if (await commentInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log('✅ 评论输入框显示正常');
        await page.screenshot({ path: `${SCREENSHOT_PATH}/09-comment-input.png`, fullPage: true });
      } else {
        console.log('❌ 未找到评论输入框');
        await page.screenshot({ path: `${SCREENSHOT_PATH}/09-no-comment-input.png`, fullPage: true });
      }
    });

    test('3.2 提交评论并验证（核心 Bug）', async ({ page }) => {
      // 监听所有网络请求
      const requests: any[] = [];
      const responses: any[] = [];
      
      page.on('request', request => {
        if (request.url().includes('comment') || request.url().includes('api')) {
          requests.push({
            url: request.url(),
            method: request.method(),
            postData: request.postData(),
            headers: request.headers()
          });
          console.log(`📤 Request: ${request.method()} ${request.url()}`);
        }
      });
      
      page.on('response', async response => {
        if (response.url().includes('comment') || response.url().includes('api')) {
          const body = await response.text().catch(() => 'Unable to get body');
          responses.push({
            url: response.url(),
            status: response.status(),
            body: body
          });
          console.log(`📥 Response: ${response.status()} ${response.url()}`);
          console.log(`   Body: ${body.substring(0, 200)}`);
        }
      });
      
      // 监听控制台错误
      page.on('console', msg => {
        if (msg.type() === 'error') {
          console.log(`🔴 Console Error: ${msg.text()}`);
        }
      });
      
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');
      
      const firstCard = page.locator('a[href*="/recipe"], a[href*="/dish"], article a, .grid > div a').first();
      await firstCard.click();
      await page.waitForLoadState('networkidle');
      
      // 滚动到评论区
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(1000);
      
      // 查找评论输入框
      const commentInput = page.locator('textarea[placeholder*="评论"], input[placeholder*="评论"], textarea[placeholder*="comment"], textarea').first();
      
      if (await commentInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        // 输入评论
        await commentInput.fill(testComment);
        await page.screenshot({ path: `${SCREENSHOT_PATH}/10-comment-filled.png`, fullPage: true });
        console.log(`✏️ 输入评论: ${testComment}`);
        
        // 查找提交按钮
        const submitButton = page.locator('button:has-text("提交"), button:has-text("发送"), button:has-text("评论"), button[type="submit"]').first();
        
        if (await submitButton.isVisible({ timeout: 5000 }).catch(() => false)) {
          await submitButton.click();
          console.log('🚀 点击提交按钮');
          
          // 等待网络请求
          await page.waitForTimeout(3000);
          await page.screenshot({ path: `${SCREENSHOT_PATH}/11-comment-submitted.png`, fullPage: true });
          
          // 检查评论是否显示
          const newComment = page.locator(`text="${testComment}"`);
          const isVisible = await newComment.isVisible({ timeout: 5000 }).catch(() => false);
          
          if (isVisible) {
            console.log('✅ 评论提交后立即显示');
          } else {
            console.log('❌ BUG: 评论提交后未显示');
          }
          
          // 刷新页面验证
          await page.reload();
          await page.waitForLoadState('networkidle');
          await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
          await page.waitForTimeout(2000);
          
          const commentAfterRefresh = page.locator(`text="${testComment}"`);
          const isVisibleAfterRefresh = await commentAfterRefresh.isVisible({ timeout: 5000 }).catch(() => false);
          
          if (isVisibleAfterRefresh) {
            console.log('✅ 刷新后评论仍然存在');
          } else {
            console.log('❌ BUG: 刷新后评论消失');
          }
          
          await page.screenshot({ path: `${SCREENSHOT_PATH}/12-comment-after-refresh.png`, fullPage: true });
          
          // 输出网络请求和响应详情
          console.log('\n📊 网络请求详情:');
          console.log(JSON.stringify(requests, null, 2));
          console.log('\n📊 响应详情:');
          console.log(JSON.stringify(responses, null, 2));
          
        } else {
          console.log('❌ 未找到提交按钮');
          await page.screenshot({ path: `${SCREENSHOT_PATH}/11-no-submit-button.png`, fullPage: true });
        }
      } else {
        console.log('❌ 未找到评论输入框');
      }
    });
  });

  test.describe('4. 通知 Tab 测试', () => {
    
    test('4.1 通知页面状态检查（已知 Bug）', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');
      
      // 查找通知入口
      const notificationTab = page.locator('a:has-text("通知"), button:has-text("通知"), [href*="notification"]').first();
      
      if (await notificationTab.isVisible({ timeout: 5000 }).catch(() => false)) {
        await notificationTab.click();
        await page.waitForTimeout(3000);
        
        // 检查是否有 loading 状态
        const loadingIndicator = page.locator('[class*="loading"], [class*="spinner"], text=/加载中|Loading/i');
        const isLoading = await loadingIndicator.isVisible({ timeout: 2000 }).catch(() => false);
        
        if (isLoading) {
          console.log('⚠️ 通知页面显示 loading 状态');
          
          // 等待更长时间看是否一直 loading
          await page.waitForTimeout(10000);
          const stillLoading = await loadingIndicator.isVisible().catch(() => false);
          
          if (stillLoading) {
            console.log('❌ BUG: 通知页面一直处于 loading 状态（超过10秒）');
          } else {
            console.log('✅ Loading 状态正常结束');
          }
        } else {
          console.log('✅ 通知页面无 loading 问题');
        }
        
        // 检查空状态
        const emptyState = page.locator('text=/暂无通知|No notification|空/i');
        const hasEmptyState = await emptyState.isVisible({ timeout: 2000 }).catch(() => false);
        
        if (hasEmptyState) {
          console.log('✅ 空状态显示正常');
        }
        
        await page.screenshot({ path: `${SCREENSHOT_PATH}/13-notification-page.png`, fullPage: true });
      } else {
        console.log('⚠️ 未找到通知入口');
      }
    });
  });

  test.describe('5. 其他功能测试', () => {
    
    test('5.1 导航栏功能', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');
      
      // 获取所有导航链接
      const navLinks = page.locator('nav a, header a');
      const count = await navLinks.count();
      console.log(`✅ 找到 ${count} 个导航链接`);
      
      await page.screenshot({ path: `${SCREENSHOT_PATH}/14-navigation.png` });
    });

    test('5.2 响应式布局', async ({ page }) => {
      // 测试移动端
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: `${SCREENSHOT_PATH}/15-mobile-view.png`, fullPage: true });
      console.log('✅ 移动端布局截图完成');
      
      // 测试平板
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: `${SCREENSHOT_PATH}/16-tablet-view.png`, fullPage: true });
      console.log('✅ 平板布局截图完成');
    });
  });
});

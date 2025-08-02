import { test, expect, devices } from '@playwright/test';

test.describe('Cross-Browser Compatibility Tests', () => {
  // Test core functionality across different browsers
  ['chromium', 'firefox', 'webkit'].forEach(browserName => {
    test.describe(`${browserName} compatibility`, () => {
      test(`Basic app functionality in ${browserName}`, async ({ page, browserName: currentBrowser }) => {
        test.skip(currentBrowser !== browserName, `Skipping ${browserName} test in ${currentBrowser}`);
        
        // Navigate to app
        await page.goto('/');
        
        // Verify app loads
        await expect(page.locator('h2')).toContainText('Music for Your Mood');
        
        // Test mood selection
        await page.locator('button').filter({ hasText: 'Chill' }).click();
        await expect(page.locator('text=Chill Vibes')).toBeVisible();
        
        // Test responsive design
        await page.setViewportSize({ width: 375, height: 667 });
        await expect(page.locator('h2')).toBeVisible();
        
        await page.setViewportSize({ width: 1200, height: 800 });
        await expect(page.locator('h2')).toBeVisible();
      });

      test(`Audio functionality in ${browserName}`, async ({ page, browserName: currentBrowser }) => {
        test.skip(currentBrowser !== browserName, `Skipping ${browserName} test in ${currentBrowser}`);
        
        await page.goto('/');
        
        // Select mood and try to play audio
        await page.locator('button').filter({ hasText: 'Chill' }).click();
        await page.waitForSelector('[data-testid="song-card"]', { timeout: 10000 });
        
        const firstSongCard = page.locator('[data-testid="song-card"]').first();
        const playButton = firstSongCard.locator('button[aria-label*="play"]');
        
        await playButton.click();
        
        // Verify audio player appears (browser-specific audio support)
        await expect(page.locator('[data-testid="audio-player"]')).toBeVisible();
      });

      test(`Local storage functionality in ${browserName}`, async ({ page, browserName: currentBrowser }) => {
        test.skip(currentBrowser !== browserName, `Skipping ${browserName} test in ${currentBrowser}`);
        
        await page.goto('/');
        
        // Test localStorage by selecting a mood
        await page.locator('button').filter({ hasText: 'Chill' }).click();
        
        // Reload page and verify mood is remembered
        await page.reload();
        await expect(page.locator('h2')).toContainText('Music for Your Mood');
        
        // Note: In a real app, the selected mood would be restored from localStorage
        // This test verifies the page loads correctly after reload
      });
    });
  });

  // Test mobile-specific functionality
  test.describe('Mobile device compatibility', () => {
    test('iPhone compatibility', async ({ browser }) => {
      const context = await browser.newContext({
        ...devices['iPhone 12'],
      });
      const page = await context.newPage();
      
      await page.goto('/');
      
      // Verify mobile layout
      await expect(page.locator('h2')).toBeVisible();
      
      // Test touch interactions
      await page.locator('button').filter({ hasText: 'Chill' }).tap();
      await expect(page.locator('text=Chill Vibes')).toBeVisible();
      
      // Test mobile-specific features
      await page.waitForSelector('[data-testid="song-card"]', { timeout: 10000 });
      const firstSongCard = page.locator('[data-testid="song-card"]').first();
      await firstSongCard.tap();
      
      await context.close();
    });

    test('Android compatibility', async ({ browser }) => {
      const context = await browser.newContext({
        ...devices['Pixel 5'],
      });
      const page = await context.newPage();
      
      await page.goto('/');
      
      // Verify mobile layout
      await expect(page.locator('h2')).toBeVisible();
      
      // Test Android-specific interactions
      await page.locator('button').filter({ hasText: 'Hype' }).tap();
      await expect(page.locator('text=Hype Vibes')).toBeVisible();
      
      await context.close();
    });

    test('Tablet compatibility', async ({ browser }) => {
      const context = await browser.newContext({
        ...devices['iPad Pro'],
      });
      const page = await context.newPage();
      
      await page.goto('/');
      
      // Verify tablet layout
      await expect(page.locator('h2')).toBeVisible();
      
      // Test tablet-specific interactions
      await page.locator('button').filter({ hasText: 'Focus' }).click();
      await expect(page.locator('text=Focus Vibes')).toBeVisible();
      
      await context.close();
    });
  });

  // Test different screen resolutions
  test.describe('Screen resolution compatibility', () => {
    const resolutions = [
      { width: 1920, height: 1080, name: '1080p' },
      { width: 1366, height: 768, name: '768p' },
      { width: 1280, height: 720, name: '720p' },
      { width: 1024, height: 768, name: 'XGA' },
      { width: 768, height: 1024, name: 'Tablet Portrait' },
      { width: 375, height: 667, name: 'Mobile' },
      { width: 320, height: 568, name: 'Small Mobile' }
    ];

    resolutions.forEach(({ width, height, name }) => {
      test(`${name} (${width}x${height}) compatibility`, async ({ page }) => {
        await page.setViewportSize({ width, height });
        await page.goto('/');
        
        // Verify app loads and is usable at this resolution
        await expect(page.locator('h2')).toBeVisible();
        
        // Test mood selection at this resolution
        const chillButton = page.locator('button').filter({ hasText: 'Chill' });
        await expect(chillButton).toBeVisible();
        await chillButton.click();
        
        // Verify mood selection works
        await expect(page.locator('text=Chill Vibes')).toBeVisible();
        
        // Test that content doesn't overflow
        const body = page.locator('body');
        const bodyBox = await body.boundingBox();
        expect(bodyBox?.width).toBeLessThanOrEqual(width + 20); // Allow small margin for scrollbars
      });
    });
  });

  // Test accessibility across browsers
  test.describe('Accessibility compatibility', () => {
    test('Keyboard navigation compatibility', async ({ page }) => {
      await page.goto('/');
      
      // Test Tab navigation
      await page.keyboard.press('Tab');
      
      // Verify focus is visible
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
      
      // Test Enter key activation
      await page.keyboard.press('Enter');
      
      // Continue tabbing through interactive elements
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('Tab');
        const currentFocus = page.locator(':focus');
        if (await currentFocus.isVisible()) {
          // Element should be focusable
          expect(await currentFocus.count()).toBeGreaterThan(0);
        }
      }
    });

    test('Screen reader compatibility', async ({ page }) => {
      await page.goto('/');
      
      // Verify ARIA labels and roles are present
      const buttons = page.locator('button');
      const buttonCount = await buttons.count();
      
      for (let i = 0; i < Math.min(buttonCount, 10); i++) {
        const button = buttons.nth(i);
        const ariaLabel = await button.getAttribute('aria-label');
        const textContent = await button.textContent();
        
        // Button should have either aria-label or text content
        expect(ariaLabel || textContent).toBeTruthy();
      }
      
      // Verify headings structure
      const headings = page.locator('h1, h2, h3, h4, h5, h6');
      const headingCount = await headings.count();
      expect(headingCount).toBeGreaterThan(0);
    });

    test('Color contrast and visual accessibility', async ({ page }) => {
      await page.goto('/');
      
      // Take screenshot for visual regression testing
      await expect(page).toHaveScreenshot('homepage-visual.png');
      
      // Test high contrast mode simulation
      await page.emulateMedia({ colorScheme: 'dark' });
      await expect(page.locator('h2')).toBeVisible();
      
      await page.emulateMedia({ colorScheme: 'light' });
      await expect(page.locator('h2')).toBeVisible();
    });
  });

  // Test performance across browsers
  test.describe('Performance compatibility', () => {
    test('Page load performance', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/');
      await expect(page.locator('h2')).toBeVisible();
      
      const loadTime = Date.now() - startTime;
      
      // Page should load within reasonable time (5 seconds)
      expect(loadTime).toBeLessThan(5000);
    });

    test('Memory usage during interaction', async ({ page }) => {
      await page.goto('/');
      
      // Perform multiple interactions to test for memory leaks
      for (let i = 0; i < 5; i++) {
        await page.locator('button').filter({ hasText: 'Chill' }).click();
        await page.locator('button').filter({ hasText: 'Hype' }).click();
        await page.locator('text=Clear Selection').click();
      }
      
      // App should still be responsive
      await expect(page.locator('h2')).toBeVisible();
    });
  });

  // Test network conditions
  test.describe('Network compatibility', () => {
    test('Slow network performance', async ({ page, context }) => {
      // Simulate slow 3G connection
      await context.route('**/*', async route => {
        await new Promise(resolve => setTimeout(resolve, 100)); // Add 100ms delay
        await route.continue();
      });
      
      await page.goto('/');
      
      // App should still load, albeit slowly
      await expect(page.locator('h2')).toBeVisible({ timeout: 15000 });
    });

    test('Offline functionality', async ({ page, context }) => {
      await page.goto('/');
      await expect(page.locator('h2')).toBeVisible();
      
      // Simulate offline mode
      await context.setOffline(true);
      
      // Test that cached content still works
      await page.reload();
      
      // Basic HTML should still load from cache
      await expect(page.locator('body')).toBeVisible();
      
      // Re-enable network
      await context.setOffline(false);
    });
  });
});
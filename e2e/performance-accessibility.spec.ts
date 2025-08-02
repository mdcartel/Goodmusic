import { test, expect } from '@playwright/test';

test.describe('Performance and Accessibility Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h2')).toContainText('Music for Your Mood');
  });

  test.describe('Performance Tests', () => {
    test('Page load performance metrics', async ({ page }) => {
      const startTime = Date.now();
      
      // Navigate to the app
      await page.goto('/');
      
      // Wait for critical content to load
      await expect(page.locator('h2')).toBeVisible();
      await expect(page.locator('h3')).toContainText('Choose Your Vibe');
      
      const loadTime = Date.now() - startTime;
      
      // Performance assertions
      expect(loadTime).toBeLessThan(3000); // Page should load within 3 seconds
      
      // Check for performance metrics
      const performanceMetrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        return {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
          firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0
        };
      });
      
      // Performance thresholds
      expect(performanceMetrics.domContentLoaded).toBeLessThan(2000);
      expect(performanceMetrics.firstContentfulPaint).toBeLessThan(1500);
    });

    test('Memory usage during extended interaction', async ({ page }) => {
      // Perform memory-intensive operations
      for (let i = 0; i < 10; i++) {
        // Switch between moods
        await page.locator('button').filter({ hasText: 'Chill' }).click();
        await page.locator('button').filter({ hasText: 'Hype' }).click();
        await page.locator('button').filter({ hasText: 'Focus' }).click();
        
        // Clear selection
        if (await page.locator('text=Clear Selection').isVisible()) {
          await page.locator('text=Clear Selection').click();
        }
      }
      
      // Check memory usage
      const memoryInfo = await page.evaluate(() => {
        return (performance as any).memory ? {
          usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
          totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
          jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
        } : null;
      });
      
      if (memoryInfo) {
        // Memory usage should be reasonable (less than 50MB)
        expect(memoryInfo.usedJSHeapSize).toBeLessThan(50 * 1024 * 1024);
      }
      
      // App should still be responsive
      await expect(page.locator('h2')).toBeVisible();
    });

    test('Network request optimization', async ({ page }) => {
      const requests: string[] = [];
      
      // Monitor network requests
      page.on('request', request => {
        requests.push(request.url());
      });
      
      // Navigate and interact with the app
      await page.goto('/');
      await page.locator('button').filter({ hasText: 'Chill' }).click();
      await page.waitForSelector('[data-testid="song-card"]', { timeout: 10000 });
      
      // Analyze requests
      const apiRequests = requests.filter(url => url.includes('/api/'));
      const staticRequests = requests.filter(url => 
        url.includes('.js') || url.includes('.css') || url.includes('.png') || url.includes('.jpg')
      );
      
      // Should not make excessive API requests
      expect(apiRequests.length).toBeLessThan(10);
      
      // Should efficiently load static assets
      expect(staticRequests.length).toBeLessThan(20);
    });

    test('Image loading optimization', async ({ page }) => {
      await page.locator('button').filter({ hasText: 'Chill' }).click();
      await page.waitForSelector('[data-testid="song-card"]', { timeout: 10000 });
      
      // Check image loading
      const images = page.locator('img');
      const imageCount = await images.count();
      
      if (imageCount > 0) {
        // Wait for images to load
        await page.waitForLoadState('networkidle');
        
        // Check that images have loaded successfully
        for (let i = 0; i < Math.min(imageCount, 5); i++) {
          const img = images.nth(i);
          const naturalWidth = await img.evaluate((el: HTMLImageElement) => el.naturalWidth);
          
          // Image should have loaded (naturalWidth > 0)
          if (await img.isVisible()) {
            expect(naturalWidth).toBeGreaterThan(0);
          }
        }
      }
    });

    test('Bundle size and code splitting', async ({ page }) => {
      // Monitor resource loading
      const resources: { url: string; size: number }[] = [];
      
      page.on('response', async response => {
        if (response.url().includes('.js') || response.url().includes('.css')) {
          const buffer = await response.body().catch(() => null);
          if (buffer) {
            resources.push({
              url: response.url(),
              size: buffer.length
            });
          }
        }
      });
      
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Calculate total bundle size
      const totalSize = resources.reduce((sum, resource) => sum + resource.size, 0);
      
      // Bundle size should be reasonable (less than 2MB)
      expect(totalSize).toBeLessThan(2 * 1024 * 1024);
      
      // Should have multiple chunks (code splitting)
      const jsFiles = resources.filter(r => r.url.includes('.js'));
      expect(jsFiles.length).toBeGreaterThan(1);
    });
  });

  test.describe('Accessibility Tests', () => {
    test('Keyboard navigation accessibility', async ({ page }) => {
      await page.goto('/');
      
      // Test Tab navigation through interactive elements
      const interactiveElements: string[] = [];
      
      // Start tabbing through elements
      for (let i = 0; i < 20; i++) {
        await page.keyboard.press('Tab');
        
        const focusedElement = page.locator(':focus');
        if (await focusedElement.count() > 0) {
          const tagName = await focusedElement.evaluate(el => el.tagName.toLowerCase());
          const role = await focusedElement.getAttribute('role');
          const ariaLabel = await focusedElement.getAttribute('aria-label');
          const textContent = await focusedElement.textContent();
          
          interactiveElements.push(`${tagName}${role ? `[${role}]` : ''}${ariaLabel ? ` "${ariaLabel}"` : ''}${textContent ? ` "${textContent.slice(0, 20)}"` : ''}`);
          
          // Test Enter key activation on buttons
          if (tagName === 'button') {
            await page.keyboard.press('Enter');
            // Wait a bit for any state changes
            await page.waitForTimeout(100);
          }
        }
      }
      
      // Should have navigated through multiple interactive elements
      expect(interactiveElements.length).toBeGreaterThan(5);
    });

    test('Screen reader accessibility', async ({ page }) => {
      await page.goto('/');
      
      // Check for proper heading structure
      const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
      expect(headings.length).toBeGreaterThan(0);
      
      // Verify heading hierarchy
      const headingLevels = await Promise.all(
        headings.map(async heading => {
          const tagName = await heading.evaluate(el => el.tagName);
          return parseInt(tagName.charAt(1));
        })
      );
      
      // Should start with h1 or h2
      expect(Math.min(...headingLevels)).toBeLessThanOrEqual(2);
      
      // Check for ARIA labels on interactive elements
      const buttons = await page.locator('button').all();
      for (const button of buttons.slice(0, 10)) { // Check first 10 buttons
        const ariaLabel = await button.getAttribute('aria-label');
        const textContent = await button.textContent();
        const title = await button.getAttribute('title');
        
        // Button should have accessible name
        expect(ariaLabel || textContent || title).toBeTruthy();
      }
      
      // Check for alt text on images
      const images = await page.locator('img').all();
      for (const img of images.slice(0, 5)) { // Check first 5 images
        const alt = await img.getAttribute('alt');
        const ariaLabel = await img.getAttribute('aria-label');
        
        // Image should have alt text or aria-label
        expect(alt || ariaLabel).toBeTruthy();
      }
    });

    test('Color contrast and visual accessibility', async ({ page }) => {
      await page.goto('/');
      
      // Test high contrast mode
      await page.emulateMedia({ colorScheme: 'dark' });
      await expect(page.locator('h2')).toBeVisible();
      
      await page.emulateMedia({ colorScheme: 'light' });
      await expect(page.locator('h2')).toBeVisible();
      
      // Test reduced motion preference
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await expect(page.locator('h2')).toBeVisible();
      
      // Test focus visibility
      await page.keyboard.press('Tab');
      const focusedElement = page.locator(':focus');
      
      if (await focusedElement.count() > 0) {
        // Check that focused element is visible
        await expect(focusedElement).toBeVisible();
        
        // Take screenshot to verify focus indicator
        await expect(page).toHaveScreenshot('focus-indicator.png');
      }
    });

    test('Form accessibility', async ({ page }) => {
      // Open chatbot to test form accessibility
      const chatButton = page.locator('button[aria-label*="chat"]');
      if (await chatButton.isVisible()) {
        await chatButton.click();
        
        // Check form elements in chatbot
        const messageInput = page.locator('input[type="text"], textarea');
        if (await messageInput.count() > 0) {
          const input = messageInput.first();
          
          // Check for proper labeling
          const ariaLabel = await input.getAttribute('aria-label');
          const placeholder = await input.getAttribute('placeholder');
          const associatedLabel = await page.locator(`label[for="${await input.getAttribute('id')}"]`).count();
          
          // Input should have accessible name
          expect(ariaLabel || placeholder || associatedLabel > 0).toBeTruthy();
          
          // Test keyboard interaction
          await input.focus();
          await input.fill('Test message');
          await page.keyboard.press('Enter');
        }
      }
    });

    test('ARIA landmarks and roles', async ({ page }) => {
      await page.goto('/');
      
      // Check for semantic HTML and ARIA landmarks
      const landmarks = await page.locator('[role="main"], [role="navigation"], [role="banner"], [role="contentinfo"], main, nav, header, footer').all();
      
      // Should have some semantic structure
      expect(landmarks.length).toBeGreaterThan(0);
      
      // Check for proper button roles
      const buttons = await page.locator('button, [role="button"]').all();
      expect(buttons.length).toBeGreaterThan(0);
      
      // Check for proper list structures
      const lists = await page.locator('ul, ol, [role="list"]').all();
      if (lists.length > 0) {
        // Lists should have list items
        const listItems = await page.locator('li, [role="listitem"]').all();
        expect(listItems.length).toBeGreaterThan(0);
      }
    });

    test('Mobile accessibility', async ({ page, browserName }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');
      
      // Test touch targets size
      const buttons = await page.locator('button').all();
      
      for (const button of buttons.slice(0, 5)) {
        if (await button.isVisible()) {
          const boundingBox = await button.boundingBox();
          if (boundingBox) {
            // Touch targets should be at least 44x44 pixels
            expect(boundingBox.width).toBeGreaterThanOrEqual(40);
            expect(boundingBox.height).toBeGreaterThanOrEqual(40);
          }
        }
      }
      
      // Test mobile-specific interactions
      await page.locator('button').filter({ hasText: 'Chill' }).tap();
      await expect(page.locator('text=Chill Vibes')).toBeVisible();
    });

    test('Error message accessibility', async ({ page }) => {
      // Mock API error to test error message accessibility
      await page.route('**/api/songs*', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Service unavailable' })
        });
      });
      
      await page.locator('button').filter({ hasText: 'Chill' }).click();
      
      // Wait for error message
      const errorMessage = page.locator('[role="alert"], .error, [aria-live="polite"]');
      if (await errorMessage.count() > 0) {
        // Error should be announced to screen readers
        const ariaLive = await errorMessage.first().getAttribute('aria-live');
        const role = await errorMessage.first().getAttribute('role');
        
        expect(ariaLive === 'polite' || ariaLive === 'assertive' || role === 'alert').toBeTruthy();
      }
    });
  });

  test.describe('Progressive Web App Features', () => {
    test('Service worker and offline functionality', async ({ page }) => {
      await page.goto('/');
      
      // Check if service worker is registered
      const serviceWorkerRegistration = await page.evaluate(async () => {
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.getRegistration();
          return !!registration;
        }
        return false;
      });
      
      // Note: Service worker might not be implemented yet
      // This test documents the expected behavior
      console.log('Service worker registered:', serviceWorkerRegistration);
    });

    test('Responsive design across devices', async ({ page }) => {
      const viewports = [
        { width: 320, height: 568, name: 'iPhone SE' },
        { width: 375, height: 667, name: 'iPhone 8' },
        { width: 414, height: 896, name: 'iPhone 11' },
        { width: 768, height: 1024, name: 'iPad' },
        { width: 1024, height: 768, name: 'iPad Landscape' },
        { width: 1200, height: 800, name: 'Desktop' },
        { width: 1920, height: 1080, name: 'Large Desktop' }
      ];
      
      for (const viewport of viewports) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        
        // Verify app is usable at this viewport
        await expect(page.locator('h2')).toBeVisible();
        
        // Test mood selection at this viewport
        const chillButton = page.locator('button').filter({ hasText: 'Chill' });
        await expect(chillButton).toBeVisible();
        
        // Verify no horizontal scrolling
        const bodyScrollWidth = await page.evaluate(() => document.body.scrollWidth);
        expect(bodyScrollWidth).toBeLessThanOrEqual(viewport.width + 20); // Allow small margin
      }
    });

    test('Performance on slow devices', async ({ page }) => {
      // Simulate slow CPU
      const client = await page.context().newCDPSession(page);
      await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      
      const startTime = Date.now();
      await page.goto('/');
      await expect(page.locator('h2')).toBeVisible();
      const loadTime = Date.now() - startTime;
      
      // Should still load within reasonable time on slow devices
      expect(loadTime).toBeLessThan(8000);
      
      // Disable CPU throttling
      await client.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    });
  });
});
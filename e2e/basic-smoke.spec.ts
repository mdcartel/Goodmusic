import { test, expect } from '@playwright/test';

test.describe('Basic Smoke Tests', () => {
  test('App loads successfully', async ({ page }) => {
    await page.goto('/');
    
    // Verify the main heading is visible
    await expect(page.locator('h2')).toContainText('Music for Your Mood');
    
    // Verify mood selector is present
    await expect(page.locator('h3')).toContainText('Choose Your Vibe');
    
    // Verify at least one mood button is visible
    const moodButtons = page.locator('button').filter({ hasText: /Chill|Hype|Focus/ });
    await expect(moodButtons.first()).toBeVisible();
  });

  test('Basic navigation works', async ({ page }) => {
    await page.goto('/');
    
    // Click on a mood
    await page.locator('button').filter({ hasText: 'Chill' }).click();
    
    // Verify mood selection feedback
    await expect(page.locator('text=Chill Vibes')).toBeVisible();
    
    // Clear selection
    if (await page.locator('text=Clear Selection').isVisible()) {
      await page.locator('text=Clear Selection').click();
      await expect(page.locator('text=Chill Vibes')).not.toBeVisible();
    }
  });

  test('Responsive design basic check', async ({ page }) => {
    // Test desktop
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto('/');
    await expect(page.locator('h2')).toBeVisible();
    
    // Test mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('h2')).toBeVisible();
  });
});
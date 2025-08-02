import { test, expect } from '@playwright/test';

test.describe('Privacy System Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h2')).toContainText('Music for Your Mood');
  });

  test('Privacy settings and data management workflow', async ({ page }) => {
    // Step 1: Open settings
    await test.step('Open settings panel', async () => {
      const settingsButton = page.locator('button[aria-label*="settings"], button[aria-label*="Settings"]');
      await expect(settingsButton).toBeVisible();
      await settingsButton.click();
      
      // Verify settings panel opens
      await expect(page.locator('[data-testid="settings-panel"]')).toBeVisible();
    });

    // Step 2: Navigate to privacy settings
    await test.step('Navigate to privacy settings', async () => {
      const privacyTab = page.locator('button').filter({ hasText: 'Privacy' });
      await privacyTab.click();
      
      // Verify privacy settings are visible
      await expect(page.locator('text=Privacy Settings')).toBeVisible();
    });

    // Step 3: Open comprehensive privacy panel
    await test.step('Open privacy management panel', async () => {
      const managePrivacyButton = page.locator('button').filter({ hasText: 'Manage Privacy' });
      await managePrivacyButton.click();
      
      // Verify privacy panel opens
      await expect(page.locator('text=Privacy & Data Management')).toBeVisible();
    });

    // Step 4: Test privacy settings toggles
    await test.step('Test privacy settings', async () => {
      // Test usage analytics toggle
      const analyticsToggle = page.locator('button[role="switch"]').first();
      await analyticsToggle.click();
      
      // Verify toggle state changes
      await expect(analyticsToggle).toHaveAttribute('aria-checked', 'true');
      
      // Toggle back
      await analyticsToggle.click();
      await expect(analyticsToggle).toHaveAttribute('aria-checked', 'false');
    });

    // Step 5: Test data management
    await test.step('Test data management', async () => {
      // Switch to Data Management tab
      const dataTab = page.locator('button').filter({ hasText: 'Data Management' });
      await dataTab.click();
      
      // Verify data management options
      await expect(page.locator('text=Clear Favorites')).toBeVisible();
      await expect(page.locator('text=Clear Play History')).toBeVisible();
      await expect(page.locator('text=Export All Data')).toBeVisible();
    });

    // Step 6: Test data export
    await test.step('Test data export', async () => {
      // Mock download functionality
      const downloadPromise = page.waitForEvent('download');
      
      const exportButton = page.locator('button').filter({ hasText: 'Export All Data' });
      await exportButton.click();
      
      // Verify download starts
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain('vibepipe-data-export');
    });

    // Step 7: Test privacy audit
    await test.step('Test privacy audit', async () => {
      // Switch to Privacy Audit tab
      const auditTab = page.locator('button').filter({ hasText: 'Privacy Audit' });
      await auditTab.click();
      
      // Verify audit information
      await expect(page.locator('text=Privacy Audit Report')).toBeVisible();
      await expect(page.locator('text=Personal Data Check')).toBeVisible();
      await expect(page.locator('text=Storage Usage')).toBeVisible();
      
      // Test refresh audit
      const refreshButton = page.locator('button').filter({ hasText: 'Refresh Audit' });
      await refreshButton.click();
      
      // Verify audit refreshes
      await expect(page.locator('text=Privacy Audit Report')).toBeVisible();
    });
  });

  test('Data clearing workflow', async ({ page }) => {
    // First, create some data to clear
    await test.step('Create test data', async () => {
      // Select a mood
      await page.locator('button').filter({ hasText: 'Chill' }).click();
      await page.waitForSelector('[data-testid="song-card"]', { timeout: 10000 });
      
      // Add a song to favorites
      const firstSongCard = page.locator('[data-testid="song-card"]').first();
      const favoriteButton = firstSongCard.locator('button[aria-label*="favorite"]');
      await favoriteButton.click();
      
      // Play a song to add to history
      const playButton = firstSongCard.locator('button[aria-label*="play"]');
      await playButton.click();
      await expect(page.locator('[data-testid="audio-player"]')).toBeVisible();
    });

    // Open privacy settings
    await test.step('Open privacy management', async () => {
      const settingsButton = page.locator('button[aria-label*="settings"]');
      await settingsButton.click();
      
      const privacyTab = page.locator('button').filter({ hasText: 'Privacy' });
      await privacyTab.click();
      
      const managePrivacyButton = page.locator('button').filter({ hasText: 'Manage Privacy' });
      await managePrivacyButton.click();
      
      const dataTab = page.locator('button').filter({ hasText: 'Data Management' });
      await dataTab.click();
    });

    // Test clearing favorites
    await test.step('Clear favorites', async () => {
      // Mock confirmation dialog
      page.on('dialog', dialog => dialog.accept());
      
      const clearFavoritesButton = page.locator('button').filter({ hasText: 'Clear Favorites' });
      await clearFavoritesButton.click();
      
      // Verify success message or updated state
      await expect(page.locator('text=cleared').or(page.locator('text=success'))).toBeVisible({ timeout: 5000 });
    });

    // Test clearing play history
    await test.step('Clear play history', async () => {
      page.on('dialog', dialog => dialog.accept());
      
      const clearHistoryButton = page.locator('button').filter({ hasText: 'Clear Play History' });
      await clearHistoryButton.click();
      
      // Verify success message
      await expect(page.locator('text=cleared').or(page.locator('text=success'))).toBeVisible({ timeout: 5000 });
    });
  });

  test('Privacy compliance validation', async ({ page }) => {
    // Test that no personal data is collected
    await test.step('Verify no personal data collection', async () => {
      // Monitor network requests to ensure no personal data is sent
      const requests: string[] = [];
      
      page.on('request', request => {
        const postData = request.postData();
        if (postData) {
          requests.push(postData);
        }
      });
      
      // Perform various actions
      await page.locator('button').filter({ hasText: 'Chill' }).click();
      await page.waitForSelector('[data-testid="song-card"]', { timeout: 10000 });
      
      const firstSongCard = page.locator('[data-testid="song-card"]').first();
      await firstSongCard.locator('button[aria-label*="play"]').click();
      
      // Verify no personal data in requests
      const personalDataFields = ['email', 'phone', 'name', 'address', 'ip'];
      for (const request of requests) {
        const lowerRequest = request.toLowerCase();
        for (const field of personalDataFields) {
          expect(lowerRequest).not.toContain(field);
        }
      }
    });

    // Test local storage compliance
    await test.step('Verify local storage compliance', async () => {
      // Check localStorage contents
      const localStorageData = await page.evaluate(() => {
        const data: Record<string, string> = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key) {
            data[key] = localStorage.getItem(key) || '';
          }
        }
        return data;
      });
      
      // Verify only allowed data types are stored
      const allowedPrefixes = ['vibepipe_'];
      const forbiddenFields = ['email', 'phone', 'name', 'address', 'ip'];
      
      for (const [key, value] of Object.entries(localStorageData)) {
        // Check key is from our app
        const hasAllowedPrefix = allowedPrefixes.some(prefix => key.startsWith(prefix));
        if (hasAllowedPrefix) {
          // Check value doesn't contain personal data
          const lowerValue = value.toLowerCase();
          for (const field of forbiddenFields) {
            expect(lowerValue).not.toContain(field);
          }
        }
      }
    });
  });

  test('Privacy settings persistence', async ({ page }) => {
    // Change privacy settings
    await test.step('Change privacy settings', async () => {
      const settingsButton = page.locator('button[aria-label*="settings"]');
      await settingsButton.click();
      
      const privacyTab = page.locator('button').filter({ hasText: 'Privacy' });
      await privacyTab.click();
      
      // Toggle usage analytics
      const analyticsToggle = page.locator('button[role="switch"]').first();
      await analyticsToggle.click();
    });

    // Reload page and verify settings persist
    await test.step('Verify settings persistence', async () => {
      await page.reload();
      await expect(page.locator('h2')).toContainText('Music for Your Mood');
      
      // Open settings again
      const settingsButton = page.locator('button[aria-label*="settings"]');
      await settingsButton.click();
      
      const privacyTab = page.locator('button').filter({ hasText: 'Privacy' });
      await privacyTab.click();
      
      // Verify toggle state is preserved
      const analyticsToggle = page.locator('button[role="switch"]').first();
      await expect(analyticsToggle).toHaveAttribute('aria-checked', 'true');
    });
  });

  test('Privacy initialization on first visit', async ({ context }) => {
    // Create new context to simulate first visit
    const newPage = await context.newPage();
    
    await test.step('Test privacy initialization', async () => {
      await newPage.goto('/');
      
      // Verify privacy system initializes
      await expect(newPage.locator('h2')).toContainText('Music for Your Mood');
      
      // Check that default privacy settings are applied
      const localStorageData = await newPage.evaluate(() => {
        return localStorage.getItem('vibepipe_app_settings_v1');
      });
      
      if (localStorageData) {
        const settings = JSON.parse(localStorageData);
        expect(settings.privacy).toBeDefined();
        expect(settings.privacy.shareUsageData).toBe(false); // Default should be privacy-focused
      }
    });

    await newPage.close();
  });

  test('GDPR compliance simulation', async ({ page }) => {
    // Simulate GDPR-like data request workflow
    await test.step('Data portability test', async () => {
      // Create some test data
      await page.locator('button').filter({ hasText: 'Chill' }).click();
      await page.waitForSelector('[data-testid="song-card"]', { timeout: 10000 });
      
      // Add to favorites
      const firstSongCard = page.locator('[data-testid="song-card"]').first();
      await firstSongCard.locator('button[aria-label*="favorite"]').click();
      
      // Export data (data portability)
      const settingsButton = page.locator('button[aria-label*="settings"]');
      await settingsButton.click();
      
      const privacyTab = page.locator('button').filter({ hasText: 'Privacy' });
      await privacyTab.click();
      
      const managePrivacyButton = page.locator('button').filter({ hasText: 'Manage Privacy' });
      await managePrivacyButton.click();
      
      const dataTab = page.locator('button').filter({ hasText: 'Data Management' });
      await dataTab.click();
      
      // Test data export
      const downloadPromise = page.waitForEvent('download');
      const exportButton = page.locator('button').filter({ hasText: 'Export All Data' });
      await exportButton.click();
      
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain('vibepipe-data-export');
    });

    // Test right to erasure (right to be forgotten)
    await test.step('Right to erasure test', async () => {
      // Mock confirmation dialog
      page.on('dialog', dialog => dialog.accept());
      
      // Clear all data
      const clearAllButton = page.locator('button').filter({ hasText: 'Clear All Data' });
      await clearAllButton.click();
      
      // Verify data is cleared
      await expect(page.locator('text=cleared').or(page.locator('text=success'))).toBeVisible({ timeout: 5000 });
      
      // Verify localStorage is cleared
      const localStorageData = await page.evaluate(() => {
        const vibepipeKeys = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('vibepipe_')) {
            vibepipeKeys.push(key);
          }
        }
        return vibepipeKeys;
      });
      
      expect(localStorageData.length).toBe(0);
    });
  });
});
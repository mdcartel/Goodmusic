import { test, expect } from '@playwright/test';

test.describe('Download Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="mood-selector"]', { timeout: 10000 });
  });

  test('should complete full download workflow', async ({ page }) => {
    // Step 1: Select mood and find songs
    await page.locator('[data-testid="mood-button-chill"]').click();
    await page.waitForSelector('[data-testid="song-card"]');
    
    const firstSongCard = page.locator('[data-testid="song-card"]').first();
    const songTitle = await firstSongCard.locator('[data-testid="song-title"]').textContent();
    
    // Step 2: Click download button
    const downloadButton = firstSongCard.locator('[data-testid="download-button"]');
    await downloadButton.click();
    
    // Step 3: Verify download options appear
    await expect(page.locator('[data-testid="download-options"]')).toBeVisible();
    await expect(page.locator('[data-testid="download-mp3"]')).toBeVisible();
    await expect(page.locator('[data-testid="download-mp4"]')).toBeVisible();
    
    // Step 4: Select MP3 format
    await page.locator('[data-testid="download-mp3"]').click();
    
    // Step 5: Verify download starts
    await expect(page.locator('[data-testid="download-progress"]')).toBeVisible({ timeout: 5000 });
    
    // Step 6: Open downloads panel
    await page.locator('[data-testid="downloads-button"]').click();
    await expect(page.locator('[data-testid="downloads-panel"]')).toBeVisible();
    
    // Step 7: Verify download appears in panel
    const downloadItem = page.locator('[data-testid="download-item"]').first();
    await expect(downloadItem).toBeVisible();
    await expect(downloadItem.locator('[data-testid="download-song-title"]')).toContainText(songTitle || '');
    await expect(downloadItem.locator('[data-testid="download-format"]')).toContainText('MP3');
    
    // Step 8: Verify download status
    const downloadStatus = downloadItem.locator('[data-testid="download-status"]');
    await expect(downloadStatus).toBeVisible();
    // Status should be either 'processing', 'queued', or 'completed'
    
    // Step 9: Test download cancellation (if still processing)
    const cancelButton = downloadItem.locator('[data-testid="cancel-download"]');
    if (await cancelButton.isVisible()) {
      await cancelButton.click();
      await expect(downloadItem.locator('[data-testid="download-status"]')).toContainText('cancelled');
    }
  });

  test('should handle MP4 download', async ({ page }) => {
    await page.locator('[data-testid="mood-button-hype"]').click();
    await page.waitForSelector('[data-testid="song-card"]');
    
    const firstSongCard = page.locator('[data-testid="song-card"]').first();
    await firstSongCard.locator('[data-testid="download-button"]').click();
    
    // Select MP4 format
    await page.locator('[data-testid="download-mp4"]').click();
    
    // Verify download starts
    await expect(page.locator('[data-testid="download-progress"]')).toBeVisible({ timeout: 5000 });
    
    // Check downloads panel
    await page.locator('[data-testid="downloads-button"]').click();
    const downloadItem = page.locator('[data-testid="download-item"]').first();
    await expect(downloadItem.locator('[data-testid="download-format"]')).toContainText('MP4');
  });

  test('should show download progress', async ({ page }) => {
    // Mock download progress updates
    await page.route('/api/download', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          downloadId: 'test-download-1',
          status: 'processing'
        })
      });
    });

    await page.route('/api/download/status/*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          downloadId: 'test-download-1',
          status: 'processing',
          progress: 45
        })
      });
    });

    await page.locator('[data-testid="mood-button-chill"]').click();
    await page.waitForSelector('[data-testid="song-card"]');
    
    const firstSongCard = page.locator('[data-testid="song-card"]').first();
    await firstSongCard.locator('[data-testid="download-button"]').click();
    await page.locator('[data-testid="download-mp3"]').click();
    
    // Check progress indicator
    await expect(page.locator('[data-testid="download-progress"]')).toBeVisible();
    
    // Open downloads panel and check progress
    await page.locator('[data-testid="downloads-button"]').click();
    const progressBar = page.locator('[data-testid="download-progress-bar"]').first();
    await expect(progressBar).toBeVisible();
  });

  test('should handle download errors', async ({ page }) => {
    // Mock download error
    await page.route('/api/download', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Download failed'
        })
      });
    });

    await page.locator('[data-testid="mood-button-chill"]').click();
    await page.waitForSelector('[data-testid="song-card"]');
    
    const firstSongCard = page.locator('[data-testid="song-card"]').first();
    await firstSongCard.locator('[data-testid="download-button"]').click();
    await page.locator('[data-testid="download-mp3"]').click();
    
    // Verify error message appears
    await expect(page.locator('[data-testid="error-toast"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-toast"]')).toContainText('Download failed');
  });

  test('should manage download queue', async ({ page }) => {
    await page.locator('[data-testid="mood-button-chill"]').click();
    await page.waitForSelector('[data-testid="song-card"]');
    
    // Start multiple downloads
    const songCards = page.locator('[data-testid="song-card"]');
    const count = Math.min(3, await songCards.count());
    
    for (let i = 0; i < count; i++) {
      const songCard = songCards.nth(i);
      await songCard.locator('[data-testid="download-button"]').click();
      await page.locator('[data-testid="download-mp3"]').click();
      await page.waitForTimeout(500); // Small delay between downloads
    }
    
    // Open downloads panel
    await page.locator('[data-testid="downloads-button"]').click();
    
    // Verify multiple downloads in queue
    const downloadItems = page.locator('[data-testid="download-item"]');
    await expect(downloadItems).toHaveCount(count);
    
    // Verify queue management buttons
    await expect(page.locator('[data-testid="clear-completed"]')).toBeVisible();
    await expect(page.locator('[data-testid="clear-all"]')).toBeVisible();
  });

  test('should filter downloads by status', async ({ page }) => {
    // Mock downloads with different statuses
    await page.route('/api/downloads', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          downloads: [
            { id: '1', status: 'completed', songTitle: 'Song 1', format: 'mp3' },
            { id: '2', status: 'processing', songTitle: 'Song 2', format: 'mp4' },
            { id: '3', status: 'failed', songTitle: 'Song 3', format: 'mp3' }
          ]
        })
      });
    });

    await page.locator('[data-testid="downloads-button"]').click();
    await expect(page.locator('[data-testid="downloads-panel"]')).toBeVisible();
    
    // Test status filters
    await page.locator('[data-testid="filter-completed"]').click();
    await expect(page.locator('[data-testid="download-item"]')).toHaveCount(1);
    
    await page.locator('[data-testid="filter-processing"]').click();
    await expect(page.locator('[data-testid="download-item"]')).toHaveCount(1);
    
    await page.locator('[data-testid="filter-failed"]').click();
    await expect(page.locator('[data-testid="download-item"]')).toHaveCount(1);
    
    await page.locator('[data-testid="filter-all"]').click();
    await expect(page.locator('[data-testid="download-item"]')).toHaveCount(3);
  });

  test('should retry failed downloads', async ({ page }) => {
    // Mock failed download
    await page.route('/api/download', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          downloadId: 'test-download-1',
          status: 'failed'
        })
      });
    });

    await page.locator('[data-testid="mood-button-chill"]').click();
    await page.waitForSelector('[data-testid="song-card"]');
    
    const firstSongCard = page.locator('[data-testid="song-card"]').first();
    await firstSongCard.locator('[data-testid="download-button"]').click();
    await page.locator('[data-testid="download-mp3"]').click();
    
    // Open downloads panel
    await page.locator('[data-testid="downloads-button"]').click();
    
    // Find failed download and retry
    const failedDownload = page.locator('[data-testid="download-item"]').first();
    await expect(failedDownload.locator('[data-testid="download-status"]')).toContainText('failed');
    
    const retryButton = failedDownload.locator('[data-testid="retry-download"]');
    await expect(retryButton).toBeVisible();
    await retryButton.click();
    
    // Verify download status changes
    await expect(failedDownload.locator('[data-testid="download-status"]')).toContainText('queued');
  });
});
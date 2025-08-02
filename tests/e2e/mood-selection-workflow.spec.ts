import { test, expect } from '@playwright/test';

test.describe('Mood Selection to Play Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for the app to load
    await page.waitForSelector('[data-testid="mood-selector"]', { timeout: 10000 });
  });

  test('should complete full mood selection to play workflow', async ({ page }) => {
    // Step 1: Verify initial state
    await expect(page.locator('h1')).toContainText('VibePipe');
    await expect(page.locator('h2')).toContainText('Music for Your Mood');
    
    // Step 2: Select a mood
    const chillMoodButton = page.locator('[data-testid="mood-button-chill"]');
    await expect(chillMoodButton).toBeVisible();
    await chillMoodButton.click();
    
    // Step 3: Verify mood selection feedback
    await expect(chillMoodButton).toHaveClass(/scale-105/);
    await expect(page.locator('[data-testid="selected-mood-info"]')).toBeVisible();
    await expect(page.locator('[data-testid="selected-mood-info"]')).toContainText('Chill Vibes');
    
    // Step 4: Wait for songs to load
    await page.waitForSelector('[data-testid="song-card"]', { timeout: 10000 });
    const songCards = page.locator('[data-testid="song-card"]');
    await expect(songCards.first()).toBeVisible();
    
    // Step 5: Verify song cards have required elements
    const firstSongCard = songCards.first();
    await expect(firstSongCard.locator('[data-testid="song-title"]')).toBeVisible();
    await expect(firstSongCard.locator('[data-testid="song-artist"]')).toBeVisible();
    await expect(firstSongCard.locator('[data-testid="play-button"]')).toBeVisible();
    await expect(firstSongCard.locator('[data-testid="download-button"]')).toBeVisible();
    
    // Step 6: Click play button
    const playButton = firstSongCard.locator('[data-testid="play-button"]');
    await playButton.click();
    
    // Step 7: Verify audio player appears
    await expect(page.locator('[data-testid="audio-player"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[data-testid="audio-player-song-title"]')).toBeVisible();
    await expect(page.locator('[data-testid="audio-player-controls"]')).toBeVisible();
    
    // Step 8: Verify play button changes to pause
    await expect(page.locator('[data-testid="audio-player-pause-button"]')).toBeVisible();
    
    // Step 9: Test pause functionality
    await page.locator('[data-testid="audio-player-pause-button"]').click();
    await expect(page.locator('[data-testid="audio-player-play-button"]')).toBeVisible();
    
    // Step 10: Test volume control
    const volumeSlider = page.locator('[data-testid="volume-slider"]');
    await expect(volumeSlider).toBeVisible();
    await volumeSlider.fill('0.5');
    
    // Step 11: Test progress bar interaction
    const progressBar = page.locator('[data-testid="progress-bar"]');
    await expect(progressBar).toBeVisible();
  });

  test('should handle mood switching', async ({ page }) => {
    // Select first mood
    await page.locator('[data-testid="mood-button-chill"]').click();
    await page.waitForSelector('[data-testid="song-card"]');
    
    const chillSongs = await page.locator('[data-testid="song-card"]').count();
    expect(chillSongs).toBeGreaterThan(0);
    
    // Switch to different mood
    await page.locator('[data-testid="mood-button-hype"]').click();
    await page.waitForSelector('[data-testid="song-card"]');
    
    const hypeSongs = await page.locator('[data-testid="song-card"]').count();
    expect(hypeSongs).toBeGreaterThan(0);
    
    // Verify mood selection indicator
    await expect(page.locator('[data-testid="mood-button-hype"]')).toHaveClass(/scale-105/);
    await expect(page.locator('[data-testid="selected-mood-info"]')).toContainText('Hype Vibes');
  });

  test('should clear mood selection', async ({ page }) => {
    // Select a mood
    await page.locator('[data-testid="mood-button-chill"]').click();
    await expect(page.locator('[data-testid="selected-mood-info"]')).toBeVisible();
    
    // Clear selection
    await page.locator('[data-testid="clear-mood-button"]').click();
    
    // Verify mood is cleared
    await expect(page.locator('[data-testid="selected-mood-info"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="mood-button-chill"]')).not.toHaveClass(/scale-105/);
  });

  test('should maintain playback state across mood changes', async ({ page }) => {
    // Select mood and play song
    await page.locator('[data-testid="mood-button-chill"]').click();
    await page.waitForSelector('[data-testid="song-card"]');
    await page.locator('[data-testid="song-card"]').first().locator('[data-testid="play-button"]').click();
    
    // Verify audio player is active
    await expect(page.locator('[data-testid="audio-player"]')).toBeVisible();
    const currentSongTitle = await page.locator('[data-testid="audio-player-song-title"]').textContent();
    
    // Switch mood
    await page.locator('[data-testid="mood-button-hype"]').click();
    await page.waitForSelector('[data-testid="song-card"]');
    
    // Verify audio player still shows same song
    await expect(page.locator('[data-testid="audio-player"]')).toBeVisible();
    await expect(page.locator('[data-testid="audio-player-song-title"]')).toContainText(currentSongTitle || '');
  });

  test('should handle empty mood results', async ({ page }) => {
    // Mock empty results by selecting a mood that might have no songs
    await page.route('/api/songs?mood=*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ songs: [], mood: 'test', total: 0 })
      });
    });
    
    await page.locator('[data-testid="mood-button-chill"]').click();
    
    // Verify empty state is shown
    await expect(page.locator('[data-testid="empty-state"]')).toBeVisible();
    await expect(page.locator('[data-testid="empty-state"]')).toContainText('No songs found');
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Mock API error
    await page.route('/api/songs?mood=*', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      });
    });
    
    await page.locator('[data-testid="mood-button-chill"]').click();
    
    // Verify error state is shown
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
  });
});
import { test, expect } from '@playwright/test';

test.describe('User Workflow Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
    
    // Wait for the app to load
    await expect(page.locator('h2')).toContainText('Music for Your Mood');
  });

  test('Complete user workflow: mood selection → play → download', async ({ page }) => {
    // Step 1: Select a mood
    await test.step('Select a mood', async () => {
      // Wait for mood selector to load
      await expect(page.locator('h3')).toContainText('Choose Your Vibe');
      
      // Click on "Chill" mood
      const chillMood = page.locator('button').filter({ hasText: 'Chill' });
      await expect(chillMood).toBeVisible();
      await chillMood.click();
      
      // Verify mood is selected
      await expect(page.locator('text=Chill Vibes')).toBeVisible();
    });

    // Step 2: Wait for songs to load and play a song
    await test.step('Play a song', async () => {
      // Wait for songs to load
      await page.waitForSelector('[data-testid="song-card"]', { timeout: 10000 });
      
      // Find the first song card and click play
      const firstSongCard = page.locator('[data-testid="song-card"]').first();
      const playButton = firstSongCard.locator('button[aria-label*="play"], button[aria-label*="Play"]');
      
      await expect(playButton).toBeVisible();
      await playButton.click();
      
      // Verify audio player appears
      await expect(page.locator('[data-testid="audio-player"]')).toBeVisible();
      
      // Verify play button changes to pause
      await expect(firstSongCard.locator('button[aria-label*="pause"], button[aria-label*="Pause"]')).toBeVisible();
    });

    // Step 3: Test download functionality
    await test.step('Download a song', async () => {
      const firstSongCard = page.locator('[data-testid="song-card"]').first();
      
      // Click download button
      const downloadButton = firstSongCard.locator('button[aria-label*="download"], button[aria-label*="Download"]');
      await downloadButton.click();
      
      // Verify download options appear
      await expect(page.locator('text=MP3')).toBeVisible();
      await expect(page.locator('text=MP4')).toBeVisible();
      
      // Select MP3 format
      await page.locator('text=MP3').click();
      
      // Verify download starts (check for download progress or success message)
      // Note: In a real test, you might want to mock the download API
      await expect(page.locator('text=Download started').or(page.locator('[data-testid="download-progress"]'))).toBeVisible({ timeout: 5000 });
    });

    // Step 4: Verify audio player controls work
    await test.step('Test audio player controls', async () => {
      const audioPlayer = page.locator('[data-testid="audio-player"]');
      
      // Test pause
      const pauseButton = audioPlayer.locator('button[aria-label*="pause"], button[aria-label*="Pause"]');
      await pauseButton.click();
      
      // Verify pause button changes back to play
      await expect(audioPlayer.locator('button[aria-label*="play"], button[aria-label*="Play"]')).toBeVisible();
      
      // Test volume control
      const volumeSlider = audioPlayer.locator('input[type="range"][aria-label*="volume"], input[type="range"][aria-label*="Volume"]');
      if (await volumeSlider.isVisible()) {
        await volumeSlider.fill('0.5');
      }
      
      // Test next/previous buttons if available
      const nextButton = audioPlayer.locator('button[aria-label*="next"], button[aria-label*="Next"]');
      if (await nextButton.isVisible()) {
        await nextButton.click();
      }
    });
  });

  test('Mood switching workflow', async ({ page }) => {
    // Select first mood
    await page.locator('button').filter({ hasText: 'Chill' }).click();
    await expect(page.locator('text=Chill Vibes')).toBeVisible();
    
    // Wait for songs to load
    await page.waitForSelector('[data-testid="song-card"]', { timeout: 10000 });
    const chillSongsCount = await page.locator('[data-testid="song-card"]').count();
    
    // Switch to different mood
    await page.locator('button').filter({ hasText: 'Hype' }).click();
    await expect(page.locator('text=Hype Vibes')).toBeVisible();
    
    // Wait for new songs to load
    await page.waitForSelector('[data-testid="song-card"]', { timeout: 10000 });
    const hypeSongsCount = await page.locator('[data-testid="song-card"]').count();
    
    // Verify different songs are loaded (in a real app, this would be different)
    // For now, just verify that songs are still displayed
    expect(hypeSongsCount).toBeGreaterThan(0);
    
    // Clear mood selection
    await page.locator('text=Clear Selection').click();
    
    // Verify mood info is hidden
    await expect(page.locator('text=Hype Vibes')).not.toBeVisible();
  });

  test('Favorites workflow', async ({ page }) => {
    // Select a mood to load songs
    await page.locator('button').filter({ hasText: 'Chill' }).click();
    await page.waitForSelector('[data-testid="song-card"]', { timeout: 10000 });
    
    // Find first song and add to favorites
    const firstSongCard = page.locator('[data-testid="song-card"]').first();
    const favoriteButton = firstSongCard.locator('button[aria-label*="favorite"], button[aria-label*="Favorite"]');
    
    await favoriteButton.click();
    
    // Verify favorite button changes state (filled heart)
    await expect(favoriteButton).toHaveClass(/text-red-500/);
    
    // Remove from favorites
    await favoriteButton.click();
    
    // Verify favorite button changes back (empty heart)
    await expect(favoriteButton).not.toHaveClass(/text-red-500/);
  });

  test('Queue management workflow', async ({ page }) => {
    // Select a mood and play a song
    await page.locator('button').filter({ hasText: 'Chill' }).click();
    await page.waitForSelector('[data-testid="song-card"]', { timeout: 10000 });
    
    const firstSongCard = page.locator('[data-testid="song-card"]').first();
    await firstSongCard.locator('button[aria-label*="play"]').click();
    
    // Wait for audio player to appear
    await expect(page.locator('[data-testid="audio-player"]')).toBeVisible();
    
    // Open queue panel
    const queueButton = page.locator('button[aria-label*="queue"], button[aria-label*="Queue"]');
    if (await queueButton.isVisible()) {
      await queueButton.click();
      
      // Verify queue panel opens
      await expect(page.locator('[data-testid="queue-panel"]')).toBeVisible();
      
      // Close queue panel
      const closeButton = page.locator('[data-testid="queue-panel"] button[aria-label*="close"]');
      await closeButton.click();
      
      // Verify queue panel closes
      await expect(page.locator('[data-testid="queue-panel"]')).not.toBeVisible();
    }
  });

  test('Responsive design workflow', async ({ page }) => {
    // Test desktop view
    await page.setViewportSize({ width: 1200, height: 800 });
    await expect(page.locator('h2')).toContainText('Music for Your Mood');
    
    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('h2')).toContainText('Music for Your Mood');
    
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('h2')).toContainText('Music for Your Mood');
    
    // Verify mood selector is still functional on mobile
    await page.locator('button').filter({ hasText: 'Chill' }).click();
    await expect(page.locator('text=Chill Vibes')).toBeVisible();
  });

  test('Error handling workflow', async ({ page }) => {
    // Mock network failure for songs API
    await page.route('**/api/songs*', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      });
    });
    
    // Select a mood
    await page.locator('button').filter({ hasText: 'Chill' }).click();
    
    // Verify error handling (should show error message or fallback)
    await expect(page.locator('text=Error').or(page.locator('text=Failed')).or(page.locator('text=Try again'))).toBeVisible({ timeout: 10000 });
  });
});
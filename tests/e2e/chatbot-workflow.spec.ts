import { test, expect } from '@playwright/test';

test.describe('Chatbot Interactions and Song Suggestions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="mood-selector"]', { timeout: 10000 });
  });

  test('should open and interact with chatbot', async ({ page }) => {
    // Step 1: Open chatbot
    await page.locator('[data-testid="chat-button"]').click();
    await expect(page.locator('[data-testid="chatbot-panel"]')).toBeVisible();
    
    // Step 2: Verify welcome message
    await expect(page.locator('[data-testid="chat-message"]').first()).toContainText('Hi there!');
    await expect(page.locator('[data-testid="chat-message"]').first()).toContainText('music companion');
    
    // Step 3: Verify chat input is available
    const chatInput = page.locator('[data-testid="chat-input"]');
    await expect(chatInput).toBeVisible();
    await expect(chatInput).toBeEnabled();
    
    // Step 4: Verify send button
    const sendButton = page.locator('[data-testid="send-button"]');
    await expect(sendButton).toBeVisible();
    await expect(sendButton).toBeEnabled();
  });

  test('should send message and receive response', async ({ page }) => {
    // Mock chatbot API response
    await page.route('/api/chat', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          response: "I understand you're feeling down. Here are some uplifting songs that might help:",
          suggestedSongs: [
            {
              id: 'test-song-1',
              title: 'Happy Song',
              artist: 'Test Artist',
              mood: ['happy'],
              thumbnail: '/api/placeholder-thumbnail',
              duration: '3:30'
            }
          ]
        })
      });
    });

    // Open chatbot
    await page.locator('[data-testid="chat-button"]').click();
    
    // Send a message
    const chatInput = page.locator('[data-testid="chat-input"]');
    await chatInput.fill('I feel sad today');
    await page.locator('[data-testid="send-button"]').click();
    
    // Verify user message appears
    await expect(page.locator('[data-testid="chat-message"]').last()).toContainText('I feel sad today');
    
    // Verify bot response appears
    await expect(page.locator('[data-testid="chat-message"]').last()).toContainText('uplifting songs');
    
    // Verify suggested songs appear
    await expect(page.locator('[data-testid="suggested-song"]')).toBeVisible();
  });

  test('should integrate chatbot suggestions with main music display', async ({ page }) => {
    // Mock APIs
    await page.route('/api/chat', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          response: "Here are some chill tracks for you:",
          suggestedSongs: [
            {
              id: 'chill-song-1',
              title: 'Chill Vibes',
              artist: 'Relaxed Artist',
              mood: ['chill'],
              thumbnail: '/api/placeholder-thumbnail',
              duration: '4:15'
            }
          ]
        })
      });
    });

    // Open chatbot and send message
    await page.locator('[data-testid="chat-button"]').click();
    const chatInput = page.locator('[data-testid="chat-input"]');
    await chatInput.fill('I need some chill music');
    await page.locator('[data-testid="send-button"]').click();
    
    // Click on suggested song
    await page.locator('[data-testid="suggested-song"]').first().click();
    
    // Verify song appears in main display
    await expect(page.locator('[data-testid="song-card"]')).toContainText('Chill Vibes');
    
    // Verify mood selector updates
    await expect(page.locator('[data-testid="mood-button"][data-mood="chill"]')).toHaveClass(/selected/);
  });
});
      
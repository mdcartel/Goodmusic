import { test, expect } from '@playwright/test';

test.describe('Chatbot Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h2')).toContainText('Music for Your Mood');
  });

  test('Chatbot interaction and song suggestions workflow', async ({ page }) => {
    // Step 1: Open chatbot
    await test.step('Open chatbot', async () => {
      const chatButton = page.locator('button[aria-label*="chat"], button[aria-label*="Chat"]');
      await expect(chatButton).toBeVisible();
      await chatButton.click();
      
      // Verify chatbot panel opens
      await expect(page.locator('[data-testid="chatbot-panel"]')).toBeVisible();
      
      // Verify welcome message
      await expect(page.locator('text=Hi there!')).toBeVisible();
    });

    // Step 2: Send a message to chatbot
    await test.step('Send message to chatbot', async () => {
      const messageInput = page.locator('input[placeholder*="message"], textarea[placeholder*="message"]');
      await expect(messageInput).toBeVisible();
      
      // Type a message
      await messageInput.fill('I need some chill music for studying');
      
      // Send message
      const sendButton = page.locator('button[aria-label*="send"], button[type="submit"]');
      await sendButton.click();
      
      // Verify message appears in chat
      await expect(page.locator('text=I need some chill music for studying')).toBeVisible();
      
      // Wait for bot response
      await expect(page.locator('[data-testid="typing-indicator"]')).toBeVisible();
      await expect(page.locator('[data-testid="typing-indicator"]')).not.toBeVisible({ timeout: 10000 });
    });

    // Step 3: Verify bot suggests songs
    await test.step('Verify song suggestions', async () => {
      // Mock chatbot API response with song suggestions
      await page.route('**/api/chat', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            response: "I understand you need some chill music for studying! Here are some perfect tracks:",
            suggestedSongs: [
              {
                id: 'study-song-1',
                title: 'Focus Flow',
                artist: 'Study Beats',
                thumbnail: 'https://example.com/thumb1.jpg',
                duration: '4:30',
                mood: ['chill', 'focus'],
                youtubeUrl: 'https://youtube.com/watch?v=study1'
              }
            ],
            mood: 'focus'
          })
        });
      });
      
      // Send another message to trigger suggestions
      const messageInput = page.locator('input[placeholder*="message"], textarea[placeholder*="message"]');
      await messageInput.fill('Show me some focus music');
      await page.locator('button[aria-label*="send"], button[type="submit"]').click();
      
      // Wait for response with suggestions
      await expect(page.locator('text=Here are some perfect tracks')).toBeVisible({ timeout: 10000 });
      
      // Verify suggested songs appear
      await expect(page.locator('[data-testid="suggested-song"]')).toBeVisible();
    });

    // Step 4: Play suggested song
    await test.step('Play suggested song', async () => {
      const suggestedSong = page.locator('[data-testid="suggested-song"]').first();
      const playButton = suggestedSong.locator('button[aria-label*="play"]');
      
      await playButton.click();
      
      // Verify audio player appears
      await expect(page.locator('[data-testid="audio-player"]')).toBeVisible();
      
      // Close chatbot
      const closeButton = page.locator('[data-testid="chatbot-panel"] button[aria-label*="close"]');
      await closeButton.click();
      
      // Verify suggested songs appear in main view
      await expect(page.locator('text=Recommended for You')).toBeVisible();
    });
  });

  test('Chatbot quick actions workflow', async ({ page }) => {
    // Open chatbot
    const chatButton = page.locator('button[aria-label*="chat"]');
    await chatButton.click();
    await expect(page.locator('[data-testid="chatbot-panel"]')).toBeVisible();
    
    // Test quick action buttons
    const quickActions = [
      'I need upbeat music',
      'Something to relax to',
      'Music for working out',
      'Help me focus'
    ];
    
    for (const action of quickActions) {
      const quickActionButton = page.locator(`button:has-text("${action}")`);
      if (await quickActionButton.isVisible()) {
        await quickActionButton.click();
        
        // Verify message is added to input
        const messageInput = page.locator('input[placeholder*="message"], textarea[placeholder*="message"]');
        await expect(messageInput).toHaveValue(action);
        
        // Clear input for next test
        await messageInput.clear();
        break;
      }
    }
  });

  test('Chatbot mood detection and integration', async ({ page }) => {
    // Mock chatbot API to return mood-based suggestions
    await page.route('**/api/chat', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          response: "I can sense you're feeling energetic! Let me suggest some hype music:",
          suggestedSongs: [
            {
              id: 'hype-song-1',
              title: 'Energy Boost',
              artist: 'Hype Master',
              thumbnail: 'https://example.com/hype1.jpg',
              duration: '3:45',
              mood: ['hype', 'energy'],
              youtubeUrl: 'https://youtube.com/watch?v=hype1'
            }
          ],
          mood: 'hype'
        })
      });
    });
    
    // Open chatbot
    const chatButton = page.locator('button[aria-label*="chat"]');
    await chatButton.click();
    
    // Send energetic message
    const messageInput = page.locator('input[placeholder*="message"], textarea[placeholder*="message"]');
    await messageInput.fill('I\'m feeling pumped up and ready to work out!');
    await page.locator('button[aria-label*="send"]').click();
    
    // Wait for response
    await expect(page.locator('text=I can sense you\'re feeling energetic')).toBeVisible({ timeout: 10000 });
    
    // Verify mood is detected and songs are suggested
    await expect(page.locator('[data-testid="suggested-song"]')).toBeVisible();
    
    // Close chatbot
    await page.locator('[data-testid="chatbot-panel"] button[aria-label*="close"]').click();
    
    // Verify mood selector reflects the detected mood
    await expect(page.locator('button').filter({ hasText: 'Hype' })).toHaveClass(/scale-105/);
  });

  test('Chatbot error handling', async ({ page }) => {
    // Mock API error
    await page.route('**/api/chat', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Service temporarily unavailable' })
      });
    });
    
    // Open chatbot
    const chatButton = page.locator('button[aria-label*="chat"]');
    await chatButton.click();
    
    // Send message
    const messageInput = page.locator('input[placeholder*="message"], textarea[placeholder*="message"]');
    await messageInput.fill('Hello');
    await page.locator('button[aria-label*="send"]').click();
    
    // Verify error handling
    await expect(page.locator('text=Sorry, I\'m having trouble').or(page.locator('text=Error')).or(page.locator('text=Try again'))).toBeVisible({ timeout: 10000 });
  });

  test('Chatbot conversation history', async ({ page }) => {
    // Open chatbot
    const chatButton = page.locator('button[aria-label*="chat"]');
    await chatButton.click();
    
    // Send multiple messages
    const messages = [
      'Hello',
      'I need some music',
      'Something chill please'
    ];
    
    for (const message of messages) {
      const messageInput = page.locator('input[placeholder*="message"], textarea[placeholder*="message"]');
      await messageInput.fill(message);
      await page.locator('button[aria-label*="send"]').click();
      
      // Wait for message to appear
      await expect(page.locator(`text=${message}`)).toBeVisible();
      
      // Wait a bit between messages
      await page.waitForTimeout(1000);
    }
    
    // Verify all messages are visible in chat history
    for (const message of messages) {
      await expect(page.locator(`text=${message}`)).toBeVisible();
    }
    
    // Close and reopen chatbot to test persistence
    await page.locator('[data-testid="chatbot-panel"] button[aria-label*="close"]').click();
    await page.locator('button[aria-label*="chat"]').click();
    
    // Verify conversation history is maintained
    for (const message of messages) {
      await expect(page.locator(`text=${message}`)).toBeVisible();
    }
  });

  test('Chatbot keyboard shortcuts', async ({ page }) => {
    // Open chatbot
    const chatButton = page.locator('button[aria-label*="chat"]');
    await chatButton.click();
    
    // Test Enter key to send message
    const messageInput = page.locator('input[placeholder*="message"], textarea[placeholder*="message"]');
    await messageInput.fill('Test message');
    await messageInput.press('Enter');
    
    // Verify message is sent
    await expect(page.locator('text=Test message')).toBeVisible();
    
    // Test Escape key to close chatbot
    await page.keyboard.press('Escape');
    
    // Verify chatbot closes
    await expect(page.locator('[data-testid="chatbot-panel"]')).not.toBeVisible();
  });
});
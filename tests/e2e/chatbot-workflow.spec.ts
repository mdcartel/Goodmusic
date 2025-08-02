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
      
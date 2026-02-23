import { test, expect } from '@playwright/test';

const TEST_EMAIL = process.env.TEST_EMAIL || 'test@huuman.app';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'testpassword123';

test.describe('Onboarding flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('/**', { timeout: 10000 });
  });

  test('walks through all 13 onboarding steps and generates a plan', async ({ page }) => {
    // Reset onboarding first
    const resetRes = await page.request.post('/api/dev/reset-onboarding');
    expect(resetRes.ok()).toBeTruthy();

    await page.goto('/onboarding');
    await page.waitForSelector('text=Welcome to huuman', { timeout: 10000 });

    // Step 0: Welcome
    await expect(page.locator('text=Welcome to huuman')).toBeVisible();
    await page.click('text=Next');

    // Step 1: Cardio methodology
    await expect(page.locator('text=Cardio')).toBeVisible();
    await expect(page.locator('text=Weekly target')).toBeVisible();
    await page.click('text=Next');

    // Step 2: Cardio baseline
    await expect(page.locator('text=Your cardio baseline')).toBeVisible();
    await page.click('text=running');
    await page.click('text=60-120 min');
    await page.click('text=Yes');
    await page.click('text=Next');

    // Step 3: Strength methodology
    await expect(page.locator('text=Strength')).toBeVisible();
    await page.click('text=Next');

    // Step 4: Strength baseline
    await expect(page.locator('text=Your strength baseline')).toBeVisible();
    await page.click('text=Free weights');
    await page.click('button:has-text("2")');
    await page.click('text=Some');
    await page.click('text=Gym');
    await page.click('text=Next');

    // Step 5: Nutrition methodology
    await expect(page.locator('text=Nutrition')).toBeVisible();
    await page.click('text=Next');

    // Step 6: Nutrition baseline
    await expect(page.locator('text=Your nutrition baseline')).toBeVisible();
    await page.click('text=Loosely healthy');
    await page.click('button:has-text("none")');
    await page.click('text=Next');

    // Step 7: Sleep methodology
    await expect(page.locator('text=Sleep')).toBeVisible();
    await page.click('text=Next');

    // Step 8: Sleep baseline
    await expect(page.locator('text=Your sleep baseline')).toBeVisible();
    await page.click('text=7-8 hours');
    await page.click('text=10-11pm');
    await page.click('button:has-text("No")');
    await page.click('text=Next');

    // Step 9: Mindfulness methodology
    await expect(page.locator('text=Mindfulness')).toBeVisible();
    await page.click('text=Next');

    // Step 10: Mindfulness baseline
    await expect(page.locator('text=Your mindfulness baseline')).toBeVisible();
    await page.click('text=Tried a few times');
    await page.click('text=Next');

    // Step 11: Basics (age + weight)
    await expect(page.locator('text=A couple more things')).toBeVisible();
    await page.fill('input#age', '35');
    await page.fill('input#weight', '80');
    await page.click('text=Next');

    // Step 12: Build plan
    await expect(page.locator('text=Ready to build your plan')).toBeVisible();
    await page.click('text=Build My Plan');

    // Wait for plan generation (up to 120s)
    await expect(page.locator('text=Building your personalized weekly plan')).toBeVisible({ timeout: 5000 });
    await page.waitForURL('/', { timeout: 120000 });

    // Should land on chat with plan ready
    await expect(page.locator('text=Your plan is ready')).toBeVisible({ timeout: 10000 });
  });

  test('progress bar advances correctly', async ({ page }) => {
    const resetRes = await page.request.post('/api/dev/reset-onboarding');
    expect(resetRes.ok()).toBeTruthy();

    await page.goto('/onboarding');
    await page.waitForSelector('text=Welcome to huuman');

    // Check step counter
    await expect(page.locator('text=1/13')).toBeVisible();

    await page.click('text=Next');
    await expect(page.locator('text=2/13')).toBeVisible();

    await page.click('text=Next');
    await expect(page.locator('text=3/13')).toBeVisible();
  });

  test('back button works', async ({ page }) => {
    const resetRes = await page.request.post('/api/dev/reset-onboarding');
    expect(resetRes.ok()).toBeTruthy();

    await page.goto('/onboarding');
    await page.waitForSelector('text=Welcome to huuman');

    await page.click('text=Next');
    await expect(page.locator('text=Cardio')).toBeVisible();

    await page.click('text=Back');
    await expect(page.locator('text=Welcome to huuman')).toBeVisible();
  });

  test('selections persist when navigating back and forth', async ({ page }) => {
    const resetRes = await page.request.post('/api/dev/reset-onboarding');
    expect(resetRes.ok()).toBeTruthy();

    await page.goto('/onboarding');
    await page.waitForSelector('text=Welcome to huuman');

    // Go to cardio baseline (step 2)
    await page.click('text=Next'); // methodology
    await page.click('text=Next'); // baseline

    // Select running
    await page.click('text=running');
    await expect(page.locator('button:has-text("running")')).toHaveClass(/border-zinc-100/);

    // Go forward and back
    await page.click('text=Next');
    await page.click('text=Back');

    // running should still be selected
    await expect(page.locator('button:has-text("running")')).toHaveClass(/border-zinc-100/);
  });
});

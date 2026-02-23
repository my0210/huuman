import { test, expect } from '@playwright/test';

const TEST_EMAIL = process.env.TEST_EMAIL || 'test@huuman.app';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'testpassword123';

test.describe('Onboarding flow', () => {
  test.beforeEach(async ({ page, baseURL }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');

    // Wait for redirect away from login (could go to / or /onboarding)
    await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15000 });

    // Reset onboarding (use full URL so cookies are sent)
    const resetRes = await page.request.post(`${baseURL}/api/dev/reset-onboarding`);
    if (!resetRes.ok()) {
      const body = await resetRes.text();
      console.error('Reset failed:', resetRes.status(), body);
    }
    expect(resetRes.ok()).toBeTruthy();
  });

  test('walks through all 13 onboarding steps and generates a plan', { timeout: 180000 }, async ({ page }) => {
    await page.goto('/onboarding');
    await page.waitForSelector('text=Welcome to huuman', { timeout: 10000 });

    // Step 0: Welcome
    await expect(page.locator('text=Welcome to huuman')).toBeVisible();
    await clickNext(page);

    // Step 1: Cardio methodology
    await expect(page.locator('h2:has-text("Cardio")')).toBeVisible();
    await clickNext(page);

    // Step 2: Cardio baseline
    await expect(page.locator('text=Your cardio baseline')).toBeVisible();
    await page.click('button:has-text("running")');
    await page.click('button:has-text("60-120 min")');
    await page.click('button:has-text("Yes")');
    await clickNext(page);

    // Step 3: Strength methodology
    await expect(page.locator('h2:has-text("Strength")')).toBeVisible();
    await clickNext(page);

    // Step 4: Strength baseline
    await expect(page.locator('text=Your strength baseline')).toBeVisible();
    await page.click('button:has-text("Free weights")');
    await page.click('button:has-text("2")');
    await page.click('button:has-text("Some")');
    await page.click('button:has-text("Gym")');
    await clickNext(page);

    // Step 5: Nutrition methodology
    await expect(page.locator('h2:has-text("Nutrition")')).toBeVisible();
    await clickNext(page);

    // Step 6: Nutrition baseline
    await expect(page.locator('text=Your nutrition baseline')).toBeVisible();
    await page.click('button:has-text("Loosely healthy")');
    await page.click('button:has-text("none")');
    await clickNext(page);

    // Step 7: Sleep methodology
    await expect(page.locator('h2:has-text("Sleep")')).toBeVisible();
    await clickNext(page);

    // Step 8: Sleep baseline
    await expect(page.locator('text=Your sleep baseline')).toBeVisible();
    await page.click('button:has-text("7-8 hours")');
    await page.click('button:has-text("10-11pm")');
    await page.click('button:has-text("No")');
    await clickNext(page);

    // Step 9: Mindfulness methodology
    await expect(page.locator('h2:has-text("Mindfulness")')).toBeVisible();
    await clickNext(page);

    // Step 10: Mindfulness baseline
    await expect(page.locator('text=Your mindfulness baseline')).toBeVisible();
    await page.click('button:has-text("Tried a few times")');
    await clickNext(page);

    // Step 11: Basics (age + weight)
    await expect(page.locator('text=A couple more things')).toBeVisible();
    await page.fill('input#age', '35');
    await page.fill('input#weightKg', '80');
    await clickNext(page);

    // Step 12: Build plan
    await expect(page.locator('text=Ready to build your plan')).toBeVisible();
    await page.click('button:has-text("Build My Plan")');

    // Wait for plan generation (up to 120s)
    await expect(page.locator('text=Building your personalized weekly plan')).toBeVisible({ timeout: 5000 });
    await page.waitForURL((url) => url.pathname === '/', { timeout: 120000 });

    // Should land on chat with plan ready
    await expect(page.locator('text=Your plan is ready')).toBeVisible({ timeout: 10000 });
  });

  test('progress bar advances correctly', async ({ page }) => {
    await page.goto('/onboarding');
    await page.waitForSelector('text=Welcome to huuman');

    await expect(page.locator('text=1/13')).toBeVisible();

    await clickNext(page);
    await expect(page.locator('text=2/13')).toBeVisible();

    await clickNext(page);
    await expect(page.locator('text=3/13')).toBeVisible();
  });

  test('back button works', async ({ page }) => {
    await page.goto('/onboarding');
    await page.waitForSelector('text=Welcome to huuman');

    await clickNext(page);
    await expect(page.locator('h2:has-text("Cardio")')).toBeVisible();

    await page.click('button:has-text("Back")');
    await expect(page.locator('text=Welcome to huuman')).toBeVisible();
  });

  test('selections persist when navigating back and forth', async ({ page }) => {
    await page.goto('/onboarding');
    await page.waitForSelector('text=Welcome to huuman');

    // Go to cardio baseline (step 2)
    await clickNext(page); // -> methodology
    await clickNext(page); // -> baseline

    await expect(page.locator('text=Your cardio baseline')).toBeVisible();

    // Select running
    await page.click('button:has-text("running")');

    // Go forward and back
    await clickNext(page); // -> strength methodology
    await page.click('button:has-text("Back")'); // -> cardio baseline

    // running should still be selected (has the selected class)
    const runningBtn = page.locator('button:has-text("running")');
    await expect(runningBtn).toHaveClass(/bg-zinc-100/);
  });
});

async function clickNext(page: import('@playwright/test').Page) {
  await page.click('button:has-text("Next")');
}

import { test, expect } from '@playwright/test';

test.describe('Dashboard - Phase 5', () => {
  test.describe('Unauthenticated Access', () => {
    test('should redirect to login when accessing dashboard without auth', async ({ page }) => {
      await page.goto('/dashboard');

      // Should be redirected to login page
      await page.waitForURL(/\/login/, { timeout: 10000 });
    });

    test('should redirect to login when accessing sessions without auth', async ({ page }) => {
      await page.goto('/dashboard/sessions');

      // Should be redirected to login page
      await page.waitForURL(/\/login/, { timeout: 10000 });
    });
  });

  test.describe('Authenticated Access', () => {
    const testUser = {
      email: `dashboard-${Date.now()}@example.com`,
      password: 'DashboardTest123!',
    };

    test.beforeAll(async ({ request }) => {
      // Create a test user for dashboard tests
      await request.post('http://localhost:3000/api/auth/register', {
        data: {
          name: 'Dashboard Tester',
          email: testUser.email,
          password: testUser.password,
        },
      });
    });

    test('should display dashboard after login', async ({ page }) => {
      // Login first
      await page.goto('/login');
      await page.getByLabel('Email').fill(testUser.email);
      await page.getByLabel('Password').fill(testUser.password);
      await page.getByRole('button', { name: 'Sign in' }).click();

      await page.waitForURL(/\/dashboard/, { timeout: 15000 });

      // Check for dashboard content - use specific heading
      await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    });

    test('should display stats cards on dashboard', async ({ page }) => {
      // Login
      await page.goto('/login');
      await page.getByLabel('Email').fill(testUser.email);
      await page.getByLabel('Password').fill(testUser.password);
      await page.getByRole('button', { name: 'Sign in' }).click();

      await page.waitForURL(/\/dashboard/, { timeout: 15000 });

      // Check for stats cards
      await expect(page.getByText('Total Sessions')).toBeVisible();
      await expect(page.getByText('Total Tokens')).toBeVisible();
      await expect(page.getByText('Total Cost')).toBeVisible();
    });

    test('should show empty state for new user with no sessions', async ({ page }) => {
      // Login
      await page.goto('/login');
      await page.getByLabel('Email').fill(testUser.email);
      await page.getByLabel('Password').fill(testUser.password);
      await page.getByRole('button', { name: 'Sign in' }).click();

      await page.waitForURL(/\/dashboard/, { timeout: 15000 });

      // New users should see empty state or sessions table
      const hasEmptyState = await page.getByText('No sessions yet').isVisible();
      const hasSessionsTable = await page.locator('table').isVisible();

      expect(hasEmptyState || hasSessionsTable).toBeTruthy();
    });
  });
});

import { test, expect } from '@playwright/test';

test.describe('Authentication - Phase 5', () => {
  const testUser = {
    name: 'Test User',
    email: `test-${Date.now()}@example.com`,
    password: 'TestPassword123!',
  };

  test.describe('Registration', () => {
    test('should display the registration page', async ({ page }) => {
      await page.goto('/register');

      // Check for registration page elements using text matching
      await expect(page.getByText('Create an Account')).toBeVisible();
      await expect(page.getByLabel('Name')).toBeVisible();
      await expect(page.getByLabel('Email')).toBeVisible();
      await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
      await expect(page.getByLabel('Confirm Password')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Create Account' })).toBeVisible();
    });

    test('should show error for short password', async ({ page }) => {
      await page.goto('/register');

      await page.getByLabel('Email').fill('test@example.com');
      await page.getByLabel('Password', { exact: true }).fill('short');
      await page.getByLabel('Confirm Password').fill('short');
      await page.getByRole('button', { name: 'Create Account' }).click();

      await expect(page.getByText('Password must be at least 8 characters')).toBeVisible();
    });

    test('should show error for mismatched passwords', async ({ page }) => {
      await page.goto('/register');

      await page.getByLabel('Email').fill('test@example.com');
      await page.getByLabel('Password', { exact: true }).fill('ValidPassword123');
      await page.getByLabel('Confirm Password').fill('DifferentPassword123');
      await page.getByRole('button', { name: 'Create Account' }).click();

      await expect(page.getByText('Passwords do not match')).toBeVisible();
    });

    test('should successfully register a new user', async ({ page }) => {
      await page.goto('/register');

      await page.getByLabel('Name').fill(testUser.name);
      await page.getByLabel('Email').fill(testUser.email);
      await page.getByLabel('Password', { exact: true }).fill(testUser.password);
      await page.getByLabel('Confirm Password').fill(testUser.password);
      await page.getByRole('button', { name: 'Create Account' }).click();

      // Should redirect to login page after successful registration
      await page.waitForURL(/\/login/, { timeout: 10000 });
    });

    test('should show error for duplicate email', async ({ page, request }) => {
      const uniqueEmail = `dup-${Date.now()}@example.com`;

      // First register via API
      await request.post('/api/auth/register', {
        data: {
          name: 'First User',
          email: uniqueEmail,
          password: 'SecurePassword123!',
        },
      });

      // Try to register with the same email via UI
      await page.goto('/register');
      await page.getByLabel('Name').fill('Another User');
      await page.getByLabel('Email').fill(uniqueEmail);
      await page.getByLabel('Password', { exact: true }).fill('AnotherPassword123');
      await page.getByLabel('Confirm Password').fill('AnotherPassword123');
      await page.getByRole('button', { name: 'Create Account' }).click();

      await expect(page.getByText('already exists')).toBeVisible({ timeout: 10000 });
    });

    test('should have link to login page', async ({ page }) => {
      await page.goto('/register');

      const loginLink = page.getByRole('link', { name: 'Sign in' });
      await expect(loginLink).toBeVisible();
      await loginLink.click();

      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe('Login', () => {
    test('should display the login page', async ({ page }) => {
      await page.goto('/login');

      // Check for login page elements
      await expect(page.getByText('Welcome to Afterburn')).toBeVisible();
      await expect(page.getByLabel('Email')).toBeVisible();
      await expect(page.getByLabel('Password')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto('/login');

      await page.getByLabel('Email').fill('invalid@example.com');
      await page.getByLabel('Password').fill('wrongpassword');
      await page.getByRole('button', { name: 'Sign in' }).click();

      await expect(page.getByText('Invalid email or password')).toBeVisible({ timeout: 10000 });
    });

    test('should successfully login with valid credentials', async ({ page, request }) => {
      // Create a test user first
      const loginEmail = `login-test-${Date.now()}@example.com`;
      const loginPassword = 'LoginTest123!';

      await request.post('/api/auth/register', {
        data: {
          name: 'Login Test',
          email: loginEmail,
          password: loginPassword,
        },
      });

      await page.goto('/login');
      await page.getByLabel('Email').fill(loginEmail);
      await page.getByLabel('Password').fill(loginPassword);
      await page.getByRole('button', { name: 'Sign in' }).click();

      // Should redirect to dashboard after successful login
      await page.waitForURL(/\/dashboard/, { timeout: 15000 });
    });

    test('should have link to registration page', async ({ page }) => {
      await page.goto('/login');

      const registerLink = page.getByRole('link', { name: 'Register' });
      await expect(registerLink).toBeVisible();
      await registerLink.click();

      await expect(page).toHaveURL(/\/register/);
    });

    test('should display OAuth provider buttons', async ({ page }) => {
      await page.goto('/login');

      await expect(page.getByRole('button', { name: /GitHub/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /Google/i })).toBeVisible();
    });
  });
});

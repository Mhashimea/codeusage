import { test, expect } from '@playwright/test';

test.describe('API Endpoints - Phase 5', () => {

  test.describe('Registration API', () => {
    test('POST /api/auth/register - should create a new user', async ({ request }) => {
      const uniqueEmail = `api-test-${Date.now()}@example.com`;

      const response = await request.post('/api/auth/register', {
        data: {
          name: 'API Test User',
          email: uniqueEmail,
          password: 'SecurePassword123!',
        },
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.message).toBe('User created successfully');
      expect(data.userId).toBeDefined();
    });

    test('POST /api/auth/register - should reject short password', async ({ request }) => {
      const response = await request.post('/api/auth/register', {
        data: {
          name: 'Test User',
          email: 'short-pass@example.com',
          password: 'short',
        },
      });

      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('8 characters');
    });

    test('POST /api/auth/register - should reject missing fields', async ({ request }) => {
      const response = await request.post('/api/auth/register', {
        data: {
          name: 'Test User',
        },
      });

      expect(response.status()).toBe(400);
    });

    test('POST /api/auth/register - should reject duplicate email', async ({ request }) => {
      const uniqueEmail = `duplicate-test-${Date.now()}@example.com`;

      // First registration should succeed
      const response1 = await request.post('/api/auth/register', {
        data: {
          name: 'First User',
          email: uniqueEmail,
          password: 'SecurePassword123!',
        },
      });
      expect(response1.ok()).toBeTruthy();

      // Second registration with same email should fail
      const response2 = await request.post('/api/auth/register', {
        data: {
          name: 'Second User',
          email: uniqueEmail,
          password: 'AnotherPassword123!',
        },
      });

      expect(response2.status()).toBe(409);
      const data = await response2.json();
      expect(data.error).toContain('already exists');
    });
  });

  test.describe('Auth Validation API', () => {
    test('POST /api/v1/auth/validate - should reject request without auth header', async ({ request }) => {
      const response = await request.post('/api/v1/auth/validate');

      expect(response.status()).toBe(401);
    });

    test('POST /api/v1/auth/validate - should reject invalid API key', async ({ request }) => {
      const response = await request.post('/api/v1/auth/validate', {
        headers: {
          'Authorization': 'Bearer ab_invalid_key',
        },
      });

      expect(response.status()).toBe(401);
    });
  });

  test.describe('Sessions API', () => {
    test('POST /api/v1/sessions - should reject unauthenticated request', async ({ request }) => {
      const response = await request.post('/api/v1/sessions', {
        data: {
          report: 'Test report',
        },
      });

      expect(response.status()).toBe(401);
    });

    test('GET /api/v1/sessions - should reject unauthenticated request', async ({ request }) => {
      const response = await request.get('/api/v1/sessions');

      expect(response.status()).toBe(401);
    });
  });

  test.describe('API Keys API', () => {
    test('GET /api/v1/api-keys - should reject unauthenticated request', async ({ request }) => {
      const response = await request.get('/api/v1/api-keys');

      // Should require authentication
      expect([401, 403]).toContain(response.status());
    });

    test('POST /api/v1/api-keys - should reject unauthenticated request', async ({ request }) => {
      const response = await request.post('/api/v1/api-keys', {
        data: {
          name: 'Test Key',
        },
      });

      expect([401, 403]).toContain(response.status());
    });
  });
});

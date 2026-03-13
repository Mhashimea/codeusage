import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/phase-1',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Serial execution for CLI tests
  reporter: [
    ['html', { outputFolder: 'docs/test-report/html' }],
    ['json', { outputFile: 'docs/test-report/phase-1-results.json' }],
    ['list'],
  ],
  timeout: 60000, // 60 seconds per test
  use: {
    trace: 'on-first-retry',
  },
});

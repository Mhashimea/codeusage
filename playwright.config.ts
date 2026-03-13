import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Serial execution for CLI tests
  reporter: [
    ['html', { outputFolder: 'docs/test-report/html' }],
    ['json', { outputFile: 'docs/test-report/results.json' }],
    ['list'],
  ],
  timeout: 60000, // 60 seconds per test
  use: {
    trace: 'on-first-retry',
  },
});

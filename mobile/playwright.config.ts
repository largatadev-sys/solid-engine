import { defineConfig, devices } from '@playwright/test';

const PREVIEW_URL = process.env.LARGATA_PREVIEW_URL ?? 'http://localhost:8081';
const METRO_URL = process.env.LARGATA_METRO_URL ?? 'http://localhost:8082';
const LANE = process.env.LARGATA_LANE === 'metro' ? 'metro' : 'preview';

export const baseURL = LANE === 'metro' ? METRO_URL : PREVIEW_URL;
export const apiURL = process.env.LARGATA_API_BASE_URL ?? 'http://localhost:8080';

export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e/.artifacts/test-results',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.LARGATA_RETRIES ? Number(process.env.LARGATA_RETRIES) : 1,
  workers: process.env.LARGATA_WORKERS ? Number(process.env.LARGATA_WORKERS) : undefined,
  reporter: [
    ['line'],
    ['json', { outputFile: './e2e/.artifacts/report.json' }],
  ],
  expect: { timeout: 15_000 },
  use: {
    actionTimeout: 20_000,
    navigationTimeout: 45_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'api',
      testDir: './e2e/api',
      use: { baseURL: apiURL },
    },
    {
      name: 'web',
      testDir: './e2e/web',
      use: {
        ...devices['Pixel 7'],
        browserName: 'chromium',
        baseURL,
        viewport: { width: 393, height: 852 },
        hasTouch: true,
        isMobile: false,
      },
    },
  ],
});

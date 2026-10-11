import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-plugin';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [cloudflareTest({
    wrangler: { configPath: './wrangler.jsonc' },
    miniflare: { bindings: {
      PROGRAM_ENABLED: 'true', PUBLIC_ORIGIN: 'https://verify.example.com',
      HUMAN_HASH_SECRET: 'test-only-secret-value-never-use-in-production',
      IP_MINUTE_LIMIT: '100', DAILY_HUMAN_LIMIT: '5',
      TEST_MIGRATIONS: await readD1Migrations('./migrations'),
    } },
  })],
  test: { include: ['tests/**/*.test.ts'] },
});

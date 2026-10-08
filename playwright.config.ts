import { defineConfig,devices } from "@playwright/test";

export default defineConfig({
  testDir:"./e2e",
  timeout:30_000,
  expect:{timeout:7_500},
  fullyParallel:false,
  workers:1,
  retries:process.env.CI?1:0,
  reporter:process.env.CI?"line":"list",
  use:{
    baseURL:process.env.PLAYWRIGHT_BASE_URL??"http://127.0.0.1:3000",
    trace:"retain-on-failure",
    screenshot:"only-on-failure",
    video:"retain-on-failure"
  },
  projects:[{
    name:"chromium",
    use:{...devices["Desktop Chrome"]}
  }],
  webServer:{
    command:"npm run dev -- --hostname 127.0.0.1",
    url:"http://127.0.0.1:3000/api/health",
    reuseExistingServer:!process.env.CI,
    timeout:120_000
  }
});

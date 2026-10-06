import { describe, expect, it } from "vitest";
import { getEnvironment } from "./env";

const validEnvironment = {
  NODE_ENV: "development",
  DATABASE_URL: "postgresql://localhost/test",
  BETTER_AUTH_SECRET: "0123456789abcdef0123456789abcdef",
  BETTER_AUTH_URL: "http://localhost:3000",
  ASSET_STORAGE_DRIVER: "local",
  ASSET_STORAGE_BUCKET: "test-assets"
} as const;

describe("getEnvironment", () => {
  it("accepts a complete development environment", () => {
    const env = getEnvironment(validEnvironment);

    expect(env.NODE_ENV).toBe("development");
    expect(env.ASSET_STORAGE_DRIVER).toBe("local");
    expect(env.BETTER_AUTH_URL).toBe("http://localhost:3000");
  });

  it("rejects a missing database URL", () => {
    const { DATABASE_URL: _databaseUrl, ...withoutDatabase } = validEnvironment;
    expect(() => getEnvironment(withoutDatabase)).toThrow(/DATABASE_URL/);
  });

  it("rejects an unsafe short authentication secret", () => {
    expect(() =>
      getEnvironment({
        ...validEnvironment,
        BETTER_AUTH_SECRET: "too-short"
      })
    ).toThrow(/BETTER_AUTH_SECRET/);
  });
});

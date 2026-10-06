import { describe, expect, it } from "vitest";
import { getEnvironment } from "./env";

describe("getEnvironment", () => {
  it("accepts a complete development environment", () => {
    const env = getEnvironment({
      NODE_ENV: "development",
      DATABASE_URL: "postgresql://localhost/test",
      ASSET_STORAGE_DRIVER: "local",
      ASSET_STORAGE_BUCKET: "test-assets"
    });

    expect(env.NODE_ENV).toBe("development");
    expect(env.ASSET_STORAGE_DRIVER).toBe("local");
  });

  it("rejects a missing database URL", () => {
    expect(() =>
      getEnvironment({
        NODE_ENV: "test",
        ASSET_STORAGE_DRIVER: "local",
        ASSET_STORAGE_BUCKET: "test-assets"
      })
    ).toThrow(/DATABASE_URL/);
  });
});

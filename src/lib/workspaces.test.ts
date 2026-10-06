import { describe, expect, it } from "vitest";
import { personalWorkspaceName } from "./workspaces";

describe("personalWorkspaceName", () => {
  it("normalizes whitespace", () => {
    expect(personalWorkspaceName("  Ada   Lovelace ")).toBe(
      "Ada Lovelace Workspace"
    );
  });

  it("uses a safe fallback for an empty display name", () => {
    expect(personalWorkspaceName("   ")).toBe("My Workspace");
  });
});

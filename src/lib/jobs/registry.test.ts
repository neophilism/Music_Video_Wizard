import { GenerationKind } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { GenerationHandlerRegistry } from "./registry";

describe("GenerationHandlerRegistry", () => {
  it("registers handlers by kind and provider", () => {
    const registry = new GenerationHandlerRegistry();
    const handler = async () => ({ ok: true });

    registry.register(GenerationKind.IMAGE, "provider-a", handler);

    expect(registry.get(GenerationKind.IMAGE, "provider-a")).toBe(handler);
    expect(registry.get(GenerationKind.VIDEO, "provider-a")).toBeUndefined();
  });

  it("rejects duplicate handler registrations", () => {
    const registry = new GenerationHandlerRegistry();
    const handler = async () => undefined;

    registry.register(GenerationKind.IMAGE, "provider-a", handler);

    expect(() =>
      registry.register(GenerationKind.IMAGE, "provider-a", handler)
    ).toThrow(/already registered/);
  });
});

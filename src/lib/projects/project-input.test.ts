import { describe, expect, it } from "vitest";
import { projectCreationSchema } from "./project-input";

describe("projectCreationSchema", () => {
  it("normalizes valid project metadata", () => {
    const value = projectCreationSchema.parse({
      title: "  Night Drive  ",
      description: "A video",
      aspectRatio: "16:9",
      frameRate: "24"
    });

    expect(value.title).toBe("Night Drive");
    expect(value.frameRate).toBe(24);
  });

  it("rejects unsupported frame rates", () => {
    expect(() =>
      projectCreationSchema.parse({
        title: "Video",
        aspectRatio: "16:9",
        frameRate: "47"
      })
    ).toThrow(/Unsupported frame rate/);
  });
});

import { describe, expect, it } from "vitest";
import {
  extractOpenAIResponseText
} from "./openai";
import { TextProviderError } from "./types";

describe("OpenAI Responses structured output", () => {
  it("reads the convenience output_text field", () => {
    expect(
      extractOpenAIResponseText({
        output_text: '{"concepts":[]}'
      })
    ).toBe('{"concepts":[]}');
  });

  it("reads output message content when output_text is absent", () => {
    expect(
      extractOpenAIResponseText({
        output: [
          {
            type: "message",
            content: [
              {
                type: "output_text",
                text: '{"concepts":[1]}'
              }
            ]
          }
        ]
      })
    ).toBe('{"concepts":[1]}');
  });

  it("treats provider refusal as permanent", () => {
    expect(() =>
      extractOpenAIResponseText({
        output: [
          {
            content: [
              {
                type: "refusal",
                refusal: "Cannot comply."
              }
            ]
          }
        ]
      })
    ).toThrow(TextProviderError);
  });
});

import {
  TextProviderError,
  type StructuredTextProvider,
  type StructuredTextRequest
} from "./types";

interface OpenAIResponsesPayload {
  output_text?: string;
  output?: Array<{
    type?: string;
    content?: Array<{
      type?: string;
      text?: string;
      refusal?: string;
    }>;
  }>;
}

export function extractOpenAIResponseText(
  payload: OpenAIResponsesPayload
): string {
  if (typeof payload.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text;
  }

  const parts: string[] = [];
  for (const item of payload.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === "refusal" && content.refusal) {
        throw new TextProviderError(
          "The text provider refused the structured generation request.",
          true
        );
      }
      if (
        (content.type === "output_text" || !content.type) &&
        typeof content.text === "string"
      ) {
        parts.push(content.text);
      }
    }
  }

  const text = parts.join("").trim();
  if (!text) {
    throw new TextProviderError(
      "OpenAI returned no structured text output.",
      true
    );
  }
  return text;
}

function isPermanentHttpStatus(status: number): boolean {
  if (status === 408 || status === 409 || status === 429) return false;
  return status >= 400 && status < 500;
}

export class OpenAIResponsesProvider implements StructuredTextProvider {
  readonly key = "openai-responses";

  constructor(
    private readonly apiKey: string,
    private readonly baseUrl: string
  ) {}

  async generateStructured(
    request: StructuredTextRequest
  ): Promise<unknown> {
    let response: Response;
    try {
      response = await fetch(
        this.baseUrl.replace(/\/$/, "") + "/v1/responses",
        {
          method: "POST",
          headers: {
            authorization: "Bearer " + this.apiKey,
            "content-type": "application/json"
          },
          body: JSON.stringify({
            model: request.model,
            input: [
              {
                role: "system",
                content: [
                  {
                    type: "input_text",
                    text: request.system
                  }
                ]
              },
              {
                role: "user",
                content: [
                  {
                    type: "input_text",
                    text: request.prompt
                  }
                ]
              }
            ],
            max_output_tokens: request.maxOutputTokens ?? 16000,
            text: {
              format: {
                type: "json_schema",
                name: request.schemaName,
                strict: true,
                schema: request.jsonSchema
              }
            }
          }),
          signal: request.signal
        }
      );
    } catch (error) {
      if (request.signal?.aborted) throw error;
      throw new TextProviderError(
        error instanceof Error
          ? "OpenAI request failed: " + error.message
          : "OpenAI request failed.",
        false
      );
    }

    if (!response.ok) {
      const body = (await response.text()).slice(0, 2000);
      throw new TextProviderError(
        "OpenAI Responses API returned HTTP " +
          response.status +
          (body ? ": " + body : ""),
        isPermanentHttpStatus(response.status),
        response.status
      );
    }

    const payload = (await response.json()) as OpenAIResponsesPayload;
    const text = extractOpenAIResponseText(payload);

    try {
      return JSON.parse(text) as unknown;
    } catch {
      throw new TextProviderError(
        "OpenAI returned invalid JSON despite the strict structured-output request.",
        true
      );
    }
  }
}

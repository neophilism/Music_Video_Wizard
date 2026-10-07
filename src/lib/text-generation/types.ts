export interface StructuredTextRequest {
  model: string;
  system: string;
  prompt: string;
  schemaName: string;
  jsonSchema: Record<string, unknown>;
  maxOutputTokens?: number;
  signal?: AbortSignal;
}

export interface StructuredTextProvider {
  readonly key: string;
  generateStructured(
    request: StructuredTextRequest
  ): Promise<unknown>;
}

export class TextProviderError extends Error {
  constructor(
    message: string,
    readonly permanent: boolean,
    readonly status?: number
  ) {
    super(message);
    this.name = "TextProviderError";
  }
}

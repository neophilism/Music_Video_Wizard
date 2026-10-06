import type { GenerationJob, GenerationKind } from "@prisma/client";

export interface GenerationHandlerContext {
  signal: AbortSignal;
  reportProgress(
    progressPercent: number,
    message?: string,
    metadata?: Record<string, unknown>
  ): Promise<void>;
}

export type GenerationHandler = (
  job: GenerationJob,
  context: GenerationHandlerContext
) => Promise<unknown>;

function registryKey(kind: GenerationKind, providerKey: string): string {
  return `${kind}:${providerKey}`;
}

export class GenerationHandlerRegistry {
  private readonly handlers = new Map<string, GenerationHandler>();

  register(
    kind: GenerationKind,
    providerKey: string,
    handler: GenerationHandler
  ): void {
    const key = registryKey(kind, providerKey);
    if (this.handlers.has(key)) {
      throw new Error(`Generation handler already registered for ${key}`);
    }
    this.handlers.set(key, handler);
  }

  get(kind: GenerationKind, providerKey: string): GenerationHandler | undefined {
    return this.handlers.get(registryKey(kind, providerKey));
  }

  clear(): void {
    this.handlers.clear();
  }
}

export const generationHandlers = new GenerationHandlerRegistry();

export class PermanentGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PermanentGenerationError";
  }
}

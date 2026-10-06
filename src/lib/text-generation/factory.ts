import type { AppEnvironment } from "@/lib/env";
import { OpenAIResponsesProvider } from "./openai";
import {
  TextProviderError,
  type StructuredTextProvider
} from "./types";

export interface ConfiguredTextProvider {
  provider: StructuredTextProvider;
  model: string;
}

export function getTextProviderForKey(
  env: AppEnvironment,
  providerKey: string
): StructuredTextProvider {
  if (providerKey === "openai-responses") {
    if (!env.OPENAI_API_KEY) {
      throw new TextProviderError(
        "OpenAI text generation requires OPENAI_API_KEY.",
        true
      );
    }
    return new OpenAIResponsesProvider(
      env.OPENAI_API_KEY,
      env.OPENAI_BASE_URL
    );
  }

  throw new TextProviderError(
    "Unsupported text-generation provider: " + providerKey,
    true
  );
}

export function getConfiguredTextProvider(
  env: AppEnvironment
): ConfiguredTextProvider {
  if (env.TEXT_GENERATION_PROVIDER === "openai") {
    return {
      provider: getTextProviderForKey(env, "openai-responses"),
      model: env.TEXT_GENERATION_MODEL
    };
  }

  throw new TextProviderError(
    "No text-generation provider is configured.",
    true
  );
}

export function textGenerationAvailable(
  env: AppEnvironment
): boolean {
  return (
    env.TEXT_GENERATION_PROVIDER === "openai" &&
    Boolean(env.OPENAI_API_KEY)
  );
}

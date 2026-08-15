import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createAnthropic } from "@ai-sdk/anthropic";
import "server-only";

export type AiProviderName = "openrouter" | "anthropic";

export function getChatModel(model?: string) {
  const name = (model ?? "openrouter").toLowerCase() as AiProviderName;

  if (name === "anthropic") {
    const anthropic = createAnthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    return anthropic(process.env.ANTHROPIC_MODEL ?? "claude-3-7-sonnet-latest");
  }

  const openrouter = createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY,
  });
  return openrouter(process.env.OPENROUTER_MODEL ?? "openai/gpt-4o-mini");
}

export function hasAiConfigured() {
  return Boolean(
    process.env.OPENROUTER_API_KEY || process.env.ANTHROPIC_API_KEY
  );
}

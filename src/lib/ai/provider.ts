import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createAnthropic } from "@ai-sdk/anthropic";
import "server-only";
import { MODEL_OPTIONS } from "./models";

export type AiProviderName = "openrouter" | "anthropic";

export { MODEL_OPTIONS };

export function getChatModel(model?: string) {
  const id = (model ?? "openrouter:default").toLowerCase();
  const [provider, specifier] = id.split(":", 2);

  if (provider === "anthropic" && !specifier) {
    const anthropic = createAnthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    return anthropic(process.env.ANTHROPIC_MODEL ?? "claude-3-7-sonnet-latest");
  }

  const openrouter = createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY,
  });
  if (specifier && specifier !== "default") return openrouter(specifier);
  return openrouter(process.env.OPENROUTER_MODEL ?? "openai/gpt-4o-mini");
}

export function hasAiConfigured() {
  return Boolean(
    process.env.OPENROUTER_API_KEY || process.env.ANTHROPIC_API_KEY
  );
}

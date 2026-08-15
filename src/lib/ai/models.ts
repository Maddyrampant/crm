/** مدل‌های قابل انتخاب در دستیار (فرمت: provider:model) */
export const MODEL_OPTIONS = [
  { id: "openrouter:openai/gpt-4o-mini", label: "GPT-4o mini (پیش‌فرض)" },
  { id: "openrouter:openai/gpt-4o", label: "GPT-4o" },
  { id: "openrouter:deepseek/deepseek-chat", label: "DeepSeek Chat" },
  { id: "openrouter:anthropic/claude-3.5-sonnet", label: "Claude Sonnet (OpenRouter)" },
  { id: "anthropic", label: "Claude (API مستقیم)" },
] as const;

export type ModelId = (typeof MODEL_OPTIONS)[number]["id"];

export const DEFAULT_MODEL: ModelId = MODEL_OPTIONS[0].id;

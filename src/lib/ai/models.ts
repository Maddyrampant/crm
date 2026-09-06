/** مدل‌های قابل انتخاب در دستیار (فرمت: provider:model) */
export const MODEL_OPTIONS = [
  { id: "openrouter:openrouter/free", label: "رایگان (انتخاب خودکار)" },
  { id: "openrouter:nvidia/nemotron-3-super-120b-a12b:free", label: "Nemotron Super 120B (رایگان)" },
  { id: "openrouter:nvidia/nemotron-3-ultra-550b-a55b:free", label: "Nemotron Ultra 550B (رایگان)" },
  { id: "openrouter:google/gemma-4-31b-it:free", label: "Gemma 4 31B (رایگان)" },
  { id: "openrouter:cohere/north-mini-code:free", label: "North mini code (رایگان)" },
  { id: "openrouter:poolside/laguna-s-2.1:free", label: "Laguna S 2.1 (رایگان)" },
  { id: "openrouter:z-ai/glm-5.2:free", label: "GLM 5.2 (رایگان)" },
  { id: "openrouter:inclusionai/ling-3.0-flash-sante:free", label: "Ling 3.0 Flash (رایگان)" },
  { id: "openrouter:openai/gpt-4o-mini", label: "GPT-4o mini (پولی)" },
  { id: "openrouter:anthropic/claude-3.5-sonnet", label: "Claude Sonnet (پولی)" },
  { id: "anthropic", label: "Claude (API مستقیم)" },
] as const;

export type ModelId = (typeof MODEL_OPTIONS)[number]["id"];

export const DEFAULT_MODEL: ModelId = MODEL_OPTIONS[0].id;
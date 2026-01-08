export type ProviderId = "openai" | "anthropic" | "google" | "meta" | "mistral";

export interface ProviderModel {
  id: string;
  label: string;
  familyLabel?: string;
}

export interface ProviderConfig {
  id: ProviderId;
  label: string;
  models: ProviderModel[];
}

export const PROVIDERS: ProviderConfig[] = [
  {
    id: "openai",
    label: "OpenAI (GPT)",
    models: [
      { id: "gpt-4.1-mini", label: "gpt-4.1-mini" },
      { id: "gpt-4.1", label: "gpt-4.1" },
      { id: "gpt-4o", label: "gpt-4o" }
    ]
  },
  {
    id: "anthropic",
    label: "Anthropic (Claude)",
    models: [
      { id: "claude-3-5-sonnet", label: "claude-3.5-sonnet" },
      { id: "claude-3-opus", label: "claude-3-opus" },
      { id: "claude-3-haiku", label: "claude-3-haiku" }
    ]
  },
  {
    id: "google",
    label: "Google (Gemini)",
    models: [
      { id: "gemini-1.5-flash", label: "gemini-1.5-flash" },
      { id: "gemini-1.5-pro", label: "gemini-1.5-pro" }
    ]
  },
  {
    id: "meta",
    label: "Meta (Llama)",
    models: [
      { id: "llama-3.1-8b", label: "Llama 3.1 8B" },
      { id: "llama-3.1-70b", label: "Llama 3.1 70B" }
    ]
  },
  {
    id: "mistral",
    label: "Mistral",
    models: [
      { id: "mistral-small", label: "mistral-small" },
      { id: "mistral-large", label: "mistral-large" }
    ]
  }
];



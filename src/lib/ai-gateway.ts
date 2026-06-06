import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

/**
 * Lightning AI — OpenAI-compatible gateway hosting Claude Opus 4.8.
 * Used as the primary LLM for chat, tool-calling, and reasoning.
 */
export function createLightningProvider(apiKey: string) {
  return createOpenAICompatible({
    name: "lightning",
    baseURL: "https://lightning.ai/api/v1",
    headers: { Authorization: `Bearer ${apiKey}` },
  });
}

export const LIGHTNING_MODEL = "lightning-ai/gpt-oss-120b";

// Legacy providers kept for any non-migrated call site.
export function createLovableAiGatewayProvider(apiKey: string) {
  return createOpenAICompatible({
    name: "lovable-ai-gateway",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    headers: { Authorization: `Bearer ${apiKey}` },
  });
}

export function createMistralProvider(apiKey: string) {
  return createOpenAICompatible({
    name: "mistral",
    baseURL: "https://api.mistral.ai/v1",
    headers: { Authorization: `Bearer ${apiKey}` },
  });
}

import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export function createZenProvider(apiKey: string) {
  return createOpenAICompatible({
    name: "opencode-zen",
    baseURL: "https://opencode.ai/zen/v1",
    headers: { Authorization: `Bearer ${apiKey}` },
  });
}

export const ZEN_MODEL = process.env.ZEN_MODEL || "minimax-m3-free";

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

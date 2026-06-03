import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export function createLovableAiGatewayProvider(apiKey: string) {
  return createOpenAICompatible({
    name: "lovable-ai-gateway",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    headers: { Authorization: `Bearer ${apiKey}` },
  });
}

export function createCerebrasProvider() {
  return createOpenAICompatible({
    name: "cerebras",
    baseURL: "https://api.cerebras.ai/v1",
  });
}

export function createMistralProvider(apiKey: string) {
  return createOpenAICompatible({
    name: "mistral",
    baseURL: "https://api.mistral.ai/v1",
    headers: { Authorization: `Bearer ${apiKey}` },
  });
}

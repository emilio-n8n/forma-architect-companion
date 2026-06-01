import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { streamText, type UIMessage } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { checkRateLimit, getRateLimitHeaders } from "@/lib/rate-limiter";

const SYSTEM_PROMPT = `Tu es FORMA Agent, un assistant IA spécialisé en architecture française.
Tu maîtrises le PLU, la RT/RE2020, le label BBC, les normes d'accessibilité PMR,
les DTU, les permis de construire, et les pratiques constructives françaises.
Réponds toujours en français de manière précise, technique et concise.

Cite systématiquement les articles de loi, normes ou DTU pertinents au format suivant :
**[RF: Article/Référence]** — Description brève

Exemple : **[RF: Article L. 111-1]** Code de l'urbanisme — obligation de permis de construire.
Exemple : **[RF: DTU 13.3]** Fondations superficielles — disposition constructives.
Exemple : **[RF: RE2020]** Exigence de performance énergétique — seuil Bbio ≤ Bbiomax.`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
        const identifier = ip;

        if (!checkRateLimit('CHAT', identifier)) {
          return new Response('Too many requests. Please try again later.', {
            status: 429,
            headers: getRateLimitHeaders('CHAT', identifier),
          });
        }

        const { messages } = (await request.json()) as { messages?: UIMessage[] };
        if (!Array.isArray(messages)) {
          return new Response("messages required", { status: 400 });
        }

        const key = process.env.CEREBRAS_API_KEY;
        if (!key) {
          console.error('[SECURITY] CEREBRAS_API_KEY not configured');
          return new Response("Server configuration error", { status: 500 });
        }

        // Flatten UIMessage parts into plain {role, content:string} — Cerebras (OpenAI-compatible)
        // requires string content for assistant messages; multi-turn fails otherwise.
        const modelMessages = messages
          .map((m) => ({
            role: m.role as "user" | "assistant" | "system",
            content: (m.parts ?? [])
              .map((p) => (p.type === "text" ? (p as { text: string }).text : ""))
              .join("")
              .trim(),
          }))
          .filter((m) => m.content.length > 0);

        const cerebras = createOpenAICompatible({
          name: "cerebras",
          baseURL: "https://api.cerebras.ai/v1",
          headers: { Authorization: `Bearer ${key}` },
        });

        const result = streamText({
          model: cerebras("gpt-oss-120b"),
          system: SYSTEM_PROMPT,
          messages: modelMessages,
        });

        return result.toUIMessageStreamResponse({
          originalMessages: messages,
          headers: getRateLimitHeaders('CHAT', identifier),
        });
      },
    },
  },
});

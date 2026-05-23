import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createCerebrasProvider } from "@/lib/ai-gateway";

const SYSTEM_PROMPT = `Tu es FORMA Agent, un assistant IA spécialisé en architecture française.
Tu maîtrises le PLU, la RT/RE2020, le label BBC, les normes d'accessibilité PMR,
les DTU, les permis de construire, et les pratiques constructives françaises.
Réponds toujours en français de manière précise, technique et concise.
Cite les articles de loi ou normes pertinents quand c'est utile.`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const { messages } = (await request.json()) as { messages?: UIMessage[] };
        if (!Array.isArray(messages)) {
          return new Response("messages required", { status: 400 });
        }
        const key = process.env.CEREBRAS_API_KEY;
        if (!key) return new Response("Missing CEREBRAS_API_KEY", { status: 500 });

        const cerebras = createCerebrasProvider();
        const result = streamText({
          model: cerebras("gpt-oss-120b"),
          system: SYSTEM_PROMPT,
          messages: await convertToModelMessages(messages),
          headers: { Authorization: `Bearer ${key}` },
        });
        return result.toUIMessageStreamResponse({ originalMessages: messages });
      },
    },
  },
});

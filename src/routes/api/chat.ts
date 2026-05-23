import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, tool, type UIMessage } from "ai";
import { z } from "zod";
import { createCerebrasProvider } from "@/lib/ai-gateway";

const SYSTEM_PROMPT = `Tu es FORMA Agent, un assistant IA spécialisé en architecture française.
Tu maîtrises le PLU, la RT/RE2020, le label BBC, les normes d'accessibilité PMR,
les DTU, les permis de construire, et les pratiques constructives françaises.
Réponds toujours en français de manière précise, technique et concise.
Cite les articles de loi ou normes pertinents quand c'est utile.

Tu disposes d'un outil de recherche web (web_search) pour consulter des informations
actualisées (réglementations, DTU, produits, etc.). Utilise-le dès qu'une réponse
nécessite des données récentes ou que tu ne maîtrises pas.`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const { messages } = (await request.json()) as { messages?: UIMessage[] };
        if (!Array.isArray(messages)) {
          return new Response("messages required", { status: 400 });
        }
        const key = process.env.CEREBRAS_API_KEY;
        const exaKey = process.env.EXA_API_KEY;
        if (!key) return new Response("Missing CEREBRAS_API_KEY", { status: 500 });

        const cerebras = createCerebrasProvider();
        const result = streamText({
          model: cerebras("gpt-oss-120b"),
          system: SYSTEM_PROMPT,
          messages: await convertToModelMessages(messages),
          headers: { Authorization: `Bearer ${key}` },
          tools: {
            web_search: tool({
              description:
                "Rechercher des informations sur le web (réglementations, DTU, normes, actualités architecture/construction)",
              parameters: z.object({
                query: z
                  .string()
                  .describe(
                    "Requête de recherche web, en français de préférence"
                  ),
              }),
              execute: async ({ query }: { query: string }) => {
                if (!exaKey) {
                  return "Recherche web non disponible (clé API manquante)";
                }
                try {
                  const res = await fetch("https://api.exa.ai/v1/search", {
                    method: "POST",
                    headers: {
                      "x-api-key": exaKey,
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      query,
                      numResults: 5,
                      type: "auto",
                    }),
                  });
                  if (!res.ok) {
                    const err = await res.text();
                    return `Erreur recherche web: ${res.status} ${err}`;
                  }
                  const data = (await res.json()) as {
                    results?: Array<{
                      title?: string;
                      url?: string;
                      text?: string;
                    }>;
                  };
                  if (!data.results?.length) {
                    return "Aucun résultat trouvé sur le web.";
                  }
                  return data.results
                    .map(
                      (r, i) =>
                        `${i + 1}. ${r.title ?? "Sans titre"}\n   Source: ${r.url ?? ""}\n   ${(r.text ?? "").slice(0, 2000)}`
                    )
                    .join("\n\n");
                } catch (e) {
                  return `Erreur lors de la recherche web: ${e instanceof Error ? e.message : String(e)}`;
                }
              },
            }),
          },
          maxSteps: 5,
        });
        return result.toUIMessageStreamResponse({ originalMessages: messages });
      },
    },
  },
});

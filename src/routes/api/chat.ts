import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createCerebrasProvider } from "@/lib/ai-gateway";

const SYSTEM_PROMPT = `Tu es FORMA Agent, un assistant IA spécialisé en architecture française.
Tu maîtrises le PLU, la RT/RE2020, le label BBC, les normes d'accessibilité PMR,
les DTU, les permis de construire, et les pratiques constructives françaises.
Réponds toujours en français de manière précise, technique et concise.
Cite les articles de loi ou normes pertinents quand c'est utile.`;

async function searchWeb(
  query: string,
  exaKey: string | undefined
): Promise<string | null> {
  if (!exaKey) return null;
  try {
    const res = await fetch("https://api.exa.ai/v1/search", {
      method: "POST",
      headers: {
        "x-api-key": exaKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, numResults: 5, type: "auto" }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      results?: Array<{ title?: string; url?: string; text?: string }>;
    };
    if (!data.results?.length) return null;
    return data.results
      .map(
        (r, i) =>
          `${i + 1}. ${r.title ?? "Sans titre"}\n   Source: ${r.url ?? ""}\n   ${(r.text ?? "").slice(0, 2000)}`
      )
      .join("\n\n");
  } catch {
    return null;
  }
}

async function needsSearch(
  lastMessage: string,
  key: string
): Promise<string | null> {
  const keywords = [
    "cherche",
    "recherche",
    "trouve",
    "actualité",
    "récent",
    "dernières",
    "dernière",
    "web",
    "internet",
    "google",
  ];
  if (!keywords.some((k) => lastMessage.toLowerCase().includes(k)))
    return null;

  const q = [
    { role: "system", content: "Détermine si l'utilisateur demande une recherche web. Si oui, réponds UNIQUEMENT par la requête de recherche en français. Sinon réponds UNIQUEMENT par NON." },
    { role: "user", content: lastMessage },
  ];

  try {
    const res = await fetch("https://api.cerebras.ai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-oss-120b",
        messages: q,
        max_tokens: 50,
        temperature: 0,
      }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const answer = json.choices?.[0]?.message?.content?.trim() ?? "NON";
    return answer === "NON" || answer === "" ? null : answer;
  } catch {
    return null;
  }
}

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

        const lastMessage = messages
          .filter((m) => m.role === "user")
          .at(-1)?.content;
        let searchContext = "";
        if (lastMessage && typeof lastMessage === "string") {
          const query = await needsSearch(lastMessage, key);
          if (query) {
            const results = await searchWeb(query, exaKey);
            if (results) {
              searchContext = `\n\nRésultats de recherche web pour "${query}":\n${results}\n\nUtilise ces informations pour répondre à l'utilisateur.`;
            }
          }
        }

        const cerebras = createCerebrasProvider();
        const result = streamText({
          model: cerebras("gpt-oss-120b"),
          system: SYSTEM_PROMPT + searchContext,
          messages: await convertToModelMessages(messages),
          headers: { Authorization: `Bearer ${key}` },
        });
        return result.toDataStreamResponse();
      },
    },
  },
});

import { createFileRoute } from "@tanstack/react-router";
import { streamText, tool, zodSchema, type UIMessage } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { checkRateLimit, getRateLimitHeaders } from "@/lib/rate-limiter";
import { z } from "zod";

const SYSTEM_PROMPT = `Tu es FORMA Agent, un assistant IA spécialisé en architecture française.
Tu maîtrises le PLU, la RT/RE2020, le label BBC, les normes d'accessibilité PMR,
les DTU, les permis de construire, et les pratiques constructives françaises.
Réponds toujours en français de manière précise, technique et concise.

Cite systématiquement les articles de loi, normes ou DTU pertinents au format suivant :
**[RF: Article/Référence]** — Description brève

Exemple : **[RF: Article L. 111-1]** Code de l'urbanisme — obligation de permis de construire.
Exemple : **[RF: DTU 13.3]** Fondations superficielles — disposition constructives.
Exemple : **[RF: RE2020]** Exigence de performance énergétique — seuil Bbio ≤ Bbiomax.

## Capacités spéciales

Tu peux utiliser les outils suivants :

### Recherche web (web_search)
Utilise cet outil quand tu as besoin d'informations récentes, de textes de loi à jour,
de jurisprudences, de normes techniques actualisées, ou de toute information que tu ne connais pas avec certitude.
Exemples : recherche du PLU d'une commune, vérification d'un article de loi récent,
actualité réglementaire, DTU mis à jour.

### Création de documents
Quand on te demande de rédiger une note, un courrier, un rapport ou tout document structuré,
encadre-le dans un bloc de code markdown avec le langage \`doc\` :
\`\`\`doc
Titre du document

Contenu en markdown...
\`\`\`

### Création de tableaux / tableurs
Quand on te demande des données chiffrées, des comparaisons, des devis ou tout tableau structuré,
encadre-les dans un bloc \`spreadsheet\` avec du JSON :
\`\`\`spreadsheet
{
  "title": "Devis comparatif",
  "columns": [
    { "key": "poste", "label": "Poste", "type": "string" },
    { "key": "montant", "label": "Montant (€)", "type": "number" }
  ],
  "rows": [
    { "poste": "Fondations", "montant": 15000 }
  ]
}
\`\`\`

### Rédaction d'emails
Quand on te demande de rédiger un email professionnel, encadre-le dans un bloc \`email\` avec du JSON :
\`\`\`email
{
  "to": "client@exemple.com",
  "subject": "Objet de l'email",
  "body": "Corps du message...",
  "cc": "architecte@exemple.com"
}
\`\`\``;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const ip =
          request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
        const identifier = ip;

        if (!checkRateLimit("CHAT", identifier)) {
          return new Response("Too many requests. Please try again later.", {
            status: 429,
            headers: getRateLimitHeaders("CHAT", identifier),
          });
        }

        const { messages } = (await request.json()) as { messages?: UIMessage[] };
        if (!Array.isArray(messages)) {
          return new Response("messages required", { status: 400 });
        }

        const key = process.env.MISTRAL_API_KEY;
        if (!key) {
          console.error("[SECURITY] MISTRAL_API_KEY not configured");
          return new Response("Server configuration error", { status: 500 });
        }

        const modelMessages = messages
          .map((m) => ({
            role: m.role as "user" | "assistant" | "system",
            content: (m.parts ?? [])
              .map((p) => (p.type === "text" ? (p as { text: string }).text : ""))
              .join("")
              .trim(),
          }))
          .filter((m) => m.content.length > 0);

        const mistral = createOpenAICompatible({
          name: "mistral",
          baseURL: "https://api.mistral.ai/v1",
          headers: { Authorization: `Bearer ${key}` },
        });

        const result = streamText({
          model: mistral("mistral-large-latest"),
          system: SYSTEM_PROMPT,
          messages: modelMessages,
          tools: {
            web_search: tool({
              description: "Rechercher des informations récentes sur le web (actualités, réglementations, normes, PLU, DTU, etc.)",
              parameters: zodSchema(
                z.object({
                  query: z.string().describe("La requête de recherche précise en français"),
                  numResults: z.number().optional().default(8).describe("Nombre de résultats souhaités (max 15)"),
                }),
              ),
              execute: async ({ query, numResults }: { query: string; numResults?: number }) => {
                const exaKey = process.env.EXA_API_KEY;
                if (!exaKey) {
                  return { error: "API Exa non configurée", results: [] };
                }
                try {
                  const res = await fetch("https://api.exa.ai/search", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      "x-api-key": exaKey,
                    },
                    body: JSON.stringify({
                      query,
                      numResults: Math.min(numResults ?? 8, 15),
                      type: "auto",
                      useAutoprompt: true,
                    }),
                  });
                  if (!res.ok) {
                    const errText = await res.text().catch(() => "unknown error");
                    console.error("[EXA] API error:", res.status, errText);
                    return { error: `Erreur API Exa: ${res.status}`, results: [] };
                  }
                  const data = await res.json();
                  const results = (data.results ?? []).map((r: Record<string, unknown>) => ({
                    title: r.title || "Sans titre",
                    url: r.url || "",
                    text: typeof r.text === "string" ? r.text.slice(0, 2000) : "",
                    score: r.score ?? null,
                  }));
                  return { results, total: results.length };
                } catch (err) {
                  console.error("[EXA] Fetch error:", err);
                  return { error: "Erreur réseau lors de la recherche Exa", results: [] };
                }
              },
            }),
          },
        });

        return result.toUIMessageStreamResponse({
          originalMessages: messages,
          headers: getRateLimitHeaders("CHAT", identifier),
        });
      },
    },
  },
});

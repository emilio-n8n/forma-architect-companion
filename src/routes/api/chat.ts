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
Exemple : **[RF: RE2020]** Exigence de performance énergétique — seuil Bbio ≤ Bbiomax.

## Recherche web
Tu peux faire des recherches web via Exa pour trouver des informations récentes.
Quand l'utilisateur te demande une recherche, réponds avec le marqueur suivant :
[EXA: ta requête de recherche]
Puis attends les résultats que l'utilisateur te fournira pour répondre.

## Création de documents
Quand on te demande de rédiger une note, un courrier, un rapport ou tout document structuré,
encadre-le dans un bloc de code markdown avec le langage \`doc\` :
\`\`\`doc
Titre du document

Contenu en markdown...
\`\`\`

## Création de tableaux / tableurs
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

## Rédaction d'emails
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
        });

        return result.toUIMessageStreamResponse({
          originalMessages: messages,
          headers: getRateLimitHeaders("CHAT", identifier),
        });
      },
    },
  },
});

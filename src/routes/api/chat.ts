import { createFileRoute } from "@tanstack/react-router";
import { streamText, type UIMessage } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit, getRateLimitHeaders } from "@/lib/rate-limiter";
import type { Database } from "@/integrations/supabase/types";

const BASE_PROMPT = `Tu es FORMA Agent, un assistant IA spécialisé en architecture française.
Tu maîtrises le PLU, la RT/RE2020, le label BBC, les normes d'accessibilité PMR,
les DTU, les permis de construire, et les pratiques constructives françaises.
Réponds toujours en français de manière précise, technique et concise.

Cite systématiquement les articles de loi, normes ou DTU pertinents au format suivant :
**[RF: Article/Référence]** — Description brève

Exemple : **[RF: Article L. 111-1]** Code de l'urbanisme — obligation de permis de construire.
Exemple : **[RF: DTU 13.3]** Fondations superficielles — disposition constructives.
Exemple : **[RF: RE2020]** Exigence de performance énergétique — seuil Bbio ≤ Bbiomax.

## Recherche web
Quand l'utilisateur te demande de chercher des informations récentes (actualités,
réglementations, PLU, DTU, etc.), des résultats de recherche te seront fournis
automatiquement dans le message. Commence par "Laissez-moi rechercher sur le web…"
puis synthétise les résultats naturellement en citant tes sources.

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

        // --- User context injection ---
        let userContext = "";

        try {
          const authHeader = request.headers.get("authorization");
          if (authHeader?.startsWith("Bearer ")) {
            const token = authHeader.replace("Bearer ", "");
            const SUPABASE_URL = process.env.SUPABASE_URL;
            const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;

            if (SUPABASE_URL && SUPABASE_KEY && token) {
              const sb = createClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
                global: { headers: { Authorization: `Bearer ${token}` } },
                auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
              });

              const { data: claims } = await sb.auth.getClaims(token);
              const userId = claims?.claims?.sub as string | undefined;

              if (userId) {
                // Fetch profile + onboarding
                const [profileRes, onboardRes] = await Promise.all([
                  sb.from("profiles").select("*").eq("id", userId).single(),
                  sb.from("onboarding_data").select("*").eq("user_id", userId).maybeSingle(),
                ]);

                const profile = profileRes.data;
                const onboarding = onboardRes.data as { data?: Record<string, any>; level?: string } | null;

                // Build user context block
                const parts: string[] = [];

                if (onboarding?.data) {
                  const o = onboarding.data;
                  parts.push("## CONTEXTE UTILISATEUR");

                  if (o.first_name || o.last_name) {
                    parts.push(`Tu travailles avec ${o.first_name ?? ""} ${o.last_name ?? ""}${o.role ? ` (${o.role})` : ""}.`);
                  }
                  if (o.agency_name) parts.push(`Son agence : ${o.agency_name}`);
                  if (o.comm_style) {
                    const styleMap: Record<string, string> = {
                      formel: "très formel et respectueux",
                      direct: "direct et concis",
                      amical: "amical et décontracté",
                    };
                    parts.push(`Style de communication : ${styleMap[o.comm_style] ?? o.comm_style}`);
                  }
                  if (o.politeness_formula) {
                    parts.push(`Formule de politesse préférée : "${o.politeness_formula}"`);
                  }
                  if (o.email_signature) {
                    parts.push(`Signature email :\n${o.email_signature}`);
                  }
                  if (o.email_example) {
                    parts.push(`Exemple d'email type :\n${o.email_example}`);
                  }
                  if (o.specialties?.length > 0) {
                    parts.push(`Spécialités : ${o.specialties.join(", ")}`);
                  }
                  if (o.approach) parts.push(`Approche architecturale : ${o.approach}`);
                  if (o.software?.length > 0) parts.push(`Logiciels maîtrisés : ${o.software.join(", ")}`);
                  if (o.references) parts.push(`Références architecturales : ${o.references}`);
                  if (o.work_hours) parts.push(`Horaires de travail : ${o.work_hours}`);
                  if (o.response_time) parts.push(`Délai de réponse souhaité : ${o.response_time}`);

                  // Add to user context
                  if (parts.length > 1) {
                    userContext += parts.join("\n");
                  }
                }

                // Fetch relevant memories based on the last user message
                const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
                if (lastUserMsg) {
                  const lastText = lastUserMsg.parts?.map((p) => (p.type === "text" ? (p as { text: string }).text : "")).join("").trim();

                  if (lastText) {
                    const keywords = lastText
                      .toLowerCase().replace(/[?.,!;:()]/g, "")
                      .split(/\s+/).filter((w) => w.length > 3).slice(0, 6);

                    if (keywords.length > 0) {
                      const conditions = keywords.map((kw) => `content.ilike.%${kw}%`);
                      const memConditions = conditions.join(",");

                      // Personal + project memories
                      const { data: mems } = await sb
                        .from("memories")
                        .select("*")
                        .eq("user_id", userId)
                        .in("level", ["personal", "project"])
                        .or(memConditions)
                        .order("created_at", { ascending: false })
                        .limit(8);

                      // Studio memories
                      const { data: profileData } = await sb
                        .from("profiles")
                        .select("studio_id")
                        .eq("id", userId)
                        .single();

                      let studioMems: any[] = [];
                      if (profileData?.studio_id) {
                        const { data: sm } = await sb
                          .from("memories")
                          .select("*")
                          .eq("level", "studio")
                          .eq("studio_id", profileData.studio_id)
                          .or(memConditions)
                          .order("created_at", { ascending: false })
                          .limit(6);
                        studioMems = sm ?? [];
                      }

                      const allMems = [...(mems ?? []), ...studioMems];
                      const seen = new Set<string>();
                      const unique = allMems.filter((m) => {
                        if (seen.has(m.id)) return false;
                        seen.add(m.id);
                        return true;
                      }).slice(0, 12);

                      if (unique.length > 0) {
                        userContext += "\n\n## MÉMOIRES PERTINENTES\n";
                        userContext += "Ces informations ont été précédemment enregistrées comme importantes. Utilise-les pour personnaliser ta réponse :\n\n";
                        unique.forEach((m: any) => {
                          const tag = m.level === "studio" ? "[AGENCE]" : m.level === "project" ? "[PROJET]" : "[PERSO]";
                          userContext += `- ${tag} ${m.content}\n`;
                        });
                      }
                    }
                  }
                }
              }
            }
          }
        } catch (e) {
          console.error("[Chat] User context injection error:", e);
          // Non-blocking — continue without user context
        }

        const fullSystemPrompt = userContext
          ? `${BASE_PROMPT}\n\n${userContext}`
          : BASE_PROMPT;

        const modelMessages = (messages as UIMessage[])
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
          system: fullSystemPrompt,
          messages: modelMessages,
        });

        return result.toUIMessageStreamResponse({
          originalMessages: messages as any,
          headers: getRateLimitHeaders("CHAT", identifier),
        });
      },
    },
  },
});

import { createFileRoute } from "@tanstack/react-router";
import { streamText, tool, stepCountIs, convertToModelMessages, type UIMessage } from "ai";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit, getRateLimitHeaders } from "@/lib/rate-limiter";
import { createZenProvider, ZEN_MODEL } from "@/lib/ai-gateway";
import type { Database } from "@/integrations/supabase/types";

const BASE_PROMPT = `Tu es FORMA Agent, assistant IA spécialisé en architecture française.
Tu maîtrises le PLU, la RE2020, le label BBC, l'accessibilité PMR, les DTU,
les permis de construire et les pratiques constructives françaises.
Réponds toujours en français, de manière précise, technique et concise.

Cite systématiquement les références au format **[RF: Article/Référence]** — description brève.
Exemple : **[RF: DTU 13.3]** Fondations superficielles.

## OUTILS À TA DISPOSITION
Tu disposes de 4 outils. Utilise-les de façon proactive, sans demander la permission :

1. **search_memories(query)** — Consulte la mémoire (préférences perso, contexte projet, règles agence).
   Utilise-le AVANT chaque réponse non-triviale pour personnaliser.
   L'ID retourné sert à référencer une mémoire existante pour la modifier.

2. **web_search(query)** — Recherche web en temps réel via Exa.
   Utilise-le pour toute question d'actualité, réglementation récente, ou info externe.
   Reformule toi-même la requête : précise le domaine ("architecture", "PLU", "BTP"…)
   pour éviter les résultats hors-sujet. Cite les sources [1], [2]… dans ta réponse.

3. **save_memory(content, level, category?, project_id?)** — Mémorise une info importante.
   - level="project" : spécifique au projet en cours (nécessite project_id)
   - level="personal" : préférence de l'utilisateur
   - level="studio"  : règle/standard de l'agence
   Mémorise les préférences ("toujours signer par X"), contraintes projet, habitudes.
   Vérifie D'ABORD avec search_memories si une mémoire similaire existe déjà. Si oui, utilise update_memory.
   N'enregistre PAS les trivialités ni les questions ponctuelles.

4. **update_memory(memory_id, content, category?, freshness_score?)** — Met à jour une mémoire existante.
   Utilise quand l'utilisateur corrige une info précédente ou précise une préférence.
   Récupère d'abord l'ID via search_memories.

## SUGGESTIONS PROACTIVES
Quand tu détectes une information nouvelle et importante (préférence, contrainte, changement d'avis) :
  → Demande d'abord à l'utilisateur "Tu veux que je retienne ça ?" avant d'utiliser save_memory.
  → Sauf si l'utilisateur a dit "souviens-toi" ou "retiens" → sauvegarde directement.

## CRÉATION DE CONTENUS RICHES
Quand on te demande un document, encadre-le dans \`\`\`doc … \`\`\` (markdown).
Pour un tableau de données : \`\`\`spreadsheet { "title":"…", "columns":[…], "rows":[…] } \`\`\`.
Pour un email : \`\`\`email { "to":"…", "subject":"…", "body":"…" } \`\`\`.`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
        if (!checkRateLimit("CHAT", ip)) {
          return new Response("Too many requests.", {
            status: 429,
            headers: getRateLimitHeaders("CHAT", ip),
          });
        }

        const { messages } = (await request.json()) as { messages?: UIMessage[] };
        if (!Array.isArray(messages)) return new Response("messages required", { status: 400 });

        const zenKey = process.env.ZEN_API_KEY;
        if (!zenKey) {
          console.error("[chat] ZEN_API_KEY missing");
          return new Response("Server configuration error", { status: 500 });
        }

        // --- Auth + Supabase client per-request ---
        let userId: string | null = null;
        let sb: ReturnType<typeof createClient<Database>> | null = null;
        let studioId: string | null = null;
        let projectId: string | null = null;
        let userContext = "";

        try {
          const authHeader = request.headers.get("authorization");
          const SUPABASE_URL = process.env.SUPABASE_URL;
          const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
          if (authHeader?.startsWith("Bearer ") && SUPABASE_URL && SUPABASE_KEY) {
            const token = authHeader.replace("Bearer ", "");
            sb = createClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
              global: { headers: { Authorization: `Bearer ${token}` } },
              auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
            });
            const { data: claims } = await sb.auth.getClaims(token);
            userId = (claims?.claims?.sub as string | undefined) ?? null;

            if (userId) {
              const [profileRes, onboardRes, summaryRes, memRes] = await Promise.all([
                sb.from("profiles").select("studio_id").eq("id", userId).single(),
                sb.from("onboarding_data").select("data").eq("user_id", userId).maybeSingle(),
                sb.from("memory_summaries").select("category, summary").eq("user_id", userId),
                sb.from("memories").select("content, level, category, freshness_score")
                  .eq("user_id", userId).eq("is_active", true)
                  .order("freshness_score", { ascending: false })
                  .order("created_at", { ascending: false })
                  .limit(10),
              ]);
              studioId = profileRes.data?.studio_id ?? null;

              const parts: string[] = [];
              const o = (onboardRes.data as { data?: Record<string, any> } | null)?.data;
              if (o) {
                if (o.first_name || o.last_name)
                  parts.push(`Collaborateur : ${o.first_name ?? ""} ${o.last_name ?? ""}${o.role ? ` (${o.role})` : ""}`.trim());
                if (o.agency_name) parts.push(`Agence : ${o.agency_name}`);
                if (o.comm_style) parts.push(`Style de communication : ${o.comm_style}`);
                if (o.politeness_formula) parts.push(`Formule de politesse : "${o.politeness_formula}"`);
                if (o.email_signature) parts.push(`Signature email :\n${o.email_signature}`);
                if (o.specialties?.length) parts.push(`Spécialités : ${o.specialties.join(", ")}`);
                if (o.approach) parts.push(`Approche : ${o.approach}`);
                if (o.software?.length) parts.push(`Logiciels : ${o.software.join(", ")}`);
              }
              if (parts.length > 0) userContext = "## CONTEXTE UTILISATEUR\n" + parts.join("\n");

              // Inject synthesized memory summaries
              const summaries = summaryRes.data ?? [];
              if (summaries.length > 0) {
                const summaryLines = summaries.map((s: any) => `[${s.category}] : ${s.summary}`);
                userContext += "\n\n## MÉMOIRE SYNTHÉTISÉE\n" + summaryLines.join("\n");
              }

              // Inject recent active memories
              const recentMems = memRes.data ?? [];
              if (recentMems.length > 0) {
                const memLines = recentMems.slice(0, 8).map((m: any) => {
                  const scope = m.level === "studio" ? "AGENCE" : m.level === "project" ? "PROJET" : "PERSO";
                  return `[${scope}${m.category ? `/ ${m.category}` : ""}] ${m.content}`;
                });
                userContext += "\n\n## SOUVENIRS RÉCENTS\n" + memLines.join("\n");
              }
            }
          }
        } catch (e) {
          console.error("[chat] auth/context error:", e);
        }

        // --- Tools ---
        const tools = {
          search_memories: tool({
            description:
              "Recherche dans la mémoire de l'agent (préférences personnelles, contexte projet, règles d'agence). À utiliser pour personnaliser tes réponses.",
            inputSchema: z.object({
              query: z.string().describe("Mots-clés ou question — ce que tu cherches à savoir"),
            }),
            execute: async ({ query }) => {
              if (!sb || !userId) return { memories: [] };
              const keywords = query.toLowerCase().replace(/[?.,!;:()]/g, "").split(/\s+/).filter((w) => w.length > 3).slice(0, 6);
              if (keywords.length === 0) return { memories: [] };
              const conds = keywords.map((k) => `content.ilike.%${k}%`).join(",");
              const [personal, studio] = await Promise.all([
                sb.from("memories").select("id, level, content, freshness_score, category")
                  .eq("user_id", userId).eq("is_active", true)
                  .in("level", ["personal", "project"]).or(conds)
                  .order("freshness_score", { ascending: false }).limit(10),
                studioId
                  ? sb.from("memories").select("id, level, content, freshness_score, category")
                    .eq("level", "studio").eq("studio_id", studioId).eq("is_active", true)
                    .or(conds).order("freshness_score", { ascending: false }).limit(6)
                  : Promise.resolve({ data: [] as any[] }),
              ]);
              // Update last_accessed
              const allIds = [...(personal.data ?? []), ...(studio.data ?? [])].map((m: any) => m.id).filter(Boolean);
              if (allIds.length > 0) {
                sb.from("memories").update({ last_accessed: new Date().toISOString() }).in("id", allIds).then(() => {});
              }
              const all = [...(personal.data ?? []), ...(studio.data ?? [])].map((m: any) => ({
                id: m.id,
                scope: m.level === "studio" ? "AGENCE" : m.level === "project" ? "PROJET" : "PERSO",
                category: m.category,
                freshness: m.freshness_score,
                content: m.content,
              }));
              return { memories: all };
            },
          }),

          web_search: tool({
            description:
              "Recherche web en temps réel via Exa. Pour actualités, réglementations récentes, infos externes. Reformule la requête pour préciser le domaine architectural.",
            inputSchema: z.object({
              query: z.string().describe("Requête de recherche optimisée et contextualisée (ex: 'PLU Paris 2025 hauteur maximale')"),
            }),
            execute: async ({ query }) => {
              const exaKey = process.env.EXA_API_KEY;
              if (!exaKey) return { error: "Exa non configuré", results: [], answer: "" };
              try {
                const res = await fetch("https://api.exa.ai/answer", {
                  method: "POST",
                  headers: { "Content-Type": "application/json", "x-api-key": exaKey },
                  body: JSON.stringify({ query, text: true }),
                });
                if (!res.ok) return { error: `Erreur Exa ${res.status}`, results: [], answer: "" };
                const j = await res.json();
                const answer: string = typeof j.answer === "string" ? j.answer : "";
                const citations = (j.citations ?? []).slice(0, 6).map((c: any) => ({
                  title: c.title ?? "Sans titre",
                  url: c.url ?? "",
                  text: typeof c.text === "string" ? c.text.slice(0, 1000) : "",
                }));
                return { answer, results: citations, query };
              } catch (e) {
                return { error: "Erreur réseau Exa", results: [], answer: "" };
              }
            },
          }),

          save_memory: tool({
            description:
              "Mémorise une info importante pour les conversations futures (préférence perso, contrainte projet, règle agence). Ne pas enregistrer les trivialités.",
            inputSchema: z.object({
              content: z.string().min(5).max(500).describe("Le fait à retenir, en une phrase précise"),
              level: z.enum(["project", "personal", "studio"]).describe("Portée de la mémoire"),
              category: z.enum(["preferences", "projects", "work_style", "constraints", "general"]).optional().describe("Catégorie de la mémoire"),
              project_id: z.string().uuid().nullable().optional().describe("UUID du projet (requis si level=project)"),
            }),
            execute: async ({ content, level, category, project_id }) => {
              if (!sb || !userId) return { saved: false, error: "Non authentifié" };
              if (level === "studio" && !studioId) return { saved: false, error: "Pas de studio rattaché" };
              if (level === "project" && !project_id && !projectId) return { saved: false, error: "project_id requis" };
              const { error } = await sb.from("memories").insert({
                user_id: userId,
                studio_id: level === "studio" ? studioId : null,
                project_id: level === "project" ? (project_id ?? projectId) : null,
                level,
                category: category ?? "general",
                content,
                freshness_score: 1.0,
                is_active: true,
              });
              if (error) return { saved: false, error: error.message };
              return { saved: true };
            },
          }),

          update_memory: tool({
            description:
              "Met à jour une mémoire existante. Utilise après que l'utilisateur a corrigé ou précisé une info déjà mémorisée. Récupère l'ID de la mémoire via search_memories.",
            inputSchema: z.object({
              memory_id: z.string().describe("ID de la mémoire à modifier (retourné par search_memories)"),
              content: z.string().min(5).max(500).describe("Nouveau contenu précis en 1 phrase"),
              category: z.enum(["preferences", "projects", "work_style", "constraints", "general"]).optional().describe("Catégorie mise à jour"),
              freshness_score: z.number().min(0).max(1).optional().describe("Fraîcheur : 1.0 = tout juste dit, 0.0 = périmé"),
            }),
            execute: async ({ memory_id, content, category, freshness_score }) => {
              if (!sb || !userId) return { saved: false, error: "Non authentifié" };
              const patch: Record<string, any> = { content, updated_at: new Date().toISOString() };
              if (category !== undefined) patch.category = category;
              if (freshness_score !== undefined) patch.freshness_score = freshness_score;
              const { error } = await sb.from("memories").update(patch).eq("id", memory_id).eq("user_id", userId);
              if (error) return { saved: false, error: error.message };
              return { saved: true };
            },
          }),
        };

        const zen = createZenProvider(zenKey);
        const fullSystem = userContext ? `${BASE_PROMPT}\n\n${userContext}` : BASE_PROMPT;

        const result = streamText({
          model: zen(ZEN_MODEL),
          system: fullSystem,
          messages: await convertToModelMessages(messages as UIMessage[]),
          tools,
          stopWhen: stepCountIs(50),
        });

        return result.toUIMessageStreamResponse({
          originalMessages: messages as any,
          headers: getRateLimitHeaders("CHAT", ip),
        });
      },
    },
  },
});

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { sanitizeHtml } from "./sanitize";

export const ensureConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      project_id: z.string().uuid().nullable().optional(),
    }).optional().parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const projectId = (data as { project_id?: string | null } | undefined)?.project_id ?? null;
    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existing) return { id: existing.id };
    const { data: created, error } = await supabase
      .from("conversations")
      .insert({ user_id: userId, project_id: projectId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: created.id };
  });

export const loadMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ conversationId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // ⭐ SECURITY: Vérifier que la conversation appartient à l'utilisateur (Broken Access Control fix)
    const { data: conv, error: convError } = await supabase
      .from("conversations")
      .select("id")
      .eq("id", data.conversationId)
      .eq("user_id", userId)
      .single();
    if (convError || !conv) {
      throw new Error("Conversation introuvable ou accès refusé");
    }
    const { data: rows, error } = await supabase
      .from("messages")
      .select("id, role, content, created_at")
      .eq("conversation_id", data.conversationId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const saveMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        conversationId: z.string().uuid(),
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(50000),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // ⭐ SECURITY: Sanitize content to prevent XSS (Stored XSS protection)
    const sanitizedContent = sanitizeHtml(data.content);
    
    // ⭐ SECURITY: Vérifier que la conversation appartient à l'utilisateur
    const { error: convError } = await supabase
      .from("conversations")
      .select("id")
      .eq("id", data.conversationId)
      .eq("user_id", userId)
      .single();
    if (convError) {
      throw new Error("Conversation introuvable ou accès refusé");
    }
    
    const { error } = await supabase.from("messages").insert({
      conversation_id: data.conversationId,
      user_id: userId,
      role: data.role,
      content: sanitizedContent,
    });
    if (error) throw new Error(error.message);
    await supabase
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", data.conversationId);
    return { ok: true };
  });

export const resetConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("conversations")
      .insert({ user_id: userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: data.id };
  });

export const listConversations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("conversations")
      .select("id, title, created_at, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    const ids = (data ?? []).map((c) => c.id);
    if (ids.length === 0) return [];
    const { data: counts } = await supabase
      .from("messages")
      .select("conversation_id")
      .in("conversation_id", ids);
    const countMap: Record<string, number> = {};
    for (const row of counts ?? []) {
      countMap[row.conversation_id] = (countMap[row.conversation_id] ?? 0) + 1;
    }
    return (data ?? []).map((c) => ({
      ...c,
      message_count: countMap[c.id] ?? 0,
    }));
  });

export const deleteConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // ⭐ SECURITY: Vérifier que la conversation appartient à l'utilisateur avant suppression
    const { error: checkError } = await supabase
      .from("conversations")
      .select("id")
      .eq("id", data.id)
      .eq("user_id", userId)
      .single();
    if (checkError) {
      throw new Error("Conversation introuvable ou accès refusé");
    }
    const { error } = await supabase
      .from("conversations")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateConversationTitle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ conversationId: z.string().uuid(), title: z.string().min(1).max(200) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // ⭐ SECURITY: Vérifier que la conversation appartient à l'utilisateur
    const { error: checkError } = await supabase
      .from("conversations")
      .select("id")
      .eq("id", data.conversationId)
      .eq("user_id", userId)
      .single();
    if (checkError) {
      throw new Error("Conversation introuvable ou accès refusé");
    }
    const { error } = await supabase
      .from("conversations")
      .update({ title: data.title })
      .eq("id", data.conversationId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const generateSuggestions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ messages: z.array(z.object({ role: z.string(), content: z.string() })) }).parse(d))
  .handler(async ({ data }) => {
    const key = process.env.LIGHTNING_API_KEY;
    if (!key) return [];
    const history = data.messages.slice(-4).map((m) => ({ role: m.role, content: m.content }));
    const res = await fetch("https://lightning.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "anthropic/claude-opus-4-8",
        messages: [
          {
            role: "system",
            content:
              "À partir de la conversation, génère 3 questions courtes et pertinentes que l'utilisateur pourrait poser ensuite. " +
              'Réponds UNIQUEMENT par un tableau JSON, ex: ["Q1 ?", "Q2 ?", "Q3 ?"]. Pas de markdown, pas de texte avant/après.',
          },
          ...history,
        ],
        max_tokens: 200,
      }),
    });
    if (!res.ok) return [];
    const json = await res.json();
    const text = json.choices?.[0]?.message?.content ?? "[]";
    try {
      const start = text.indexOf("[");
      const end = text.lastIndexOf("]");
      const parsed = JSON.parse(start >= 0 && end > start ? text.slice(start, end + 1) : text);
      return Array.isArray(parsed) ? parsed.slice(0, 3) : [];
    } catch {
      return [];
    }
  });

export const searchWeb = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        query: z.string().min(1).max(500),
        history: z
          .array(z.object({ role: z.string(), content: z.string() }))
          .max(10)
          .optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const exaKey = process.env.EXA_API_KEY;
    if (!exaKey) {
      return { error: "API Exa non configurée", answer: "", results: [] };
    }

    // 1. Réécrire la requête en tenant compte du contexte conversationnel
    let effectiveQuery = data.query;
    const mistralKey = process.env.MISTRAL_API_KEY;
    if (mistralKey && data.history && data.history.length > 0) {
      try {
        const ctx = data.history
          .slice(-6)
          .map((m) => `${m.role === "user" ? "Utilisateur" : "Assistant"}: ${m.content.slice(0, 600)}`)
          .join("\n");
        const r = await fetch("https://api.mistral.ai/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${mistralKey}` },
          body: JSON.stringify({
            model: "mistral-small-latest",
            messages: [
              {
                role: "system",
                content:
                  "Tu reformules une requête de recherche web en tenant compte du contexte de la conversation. " +
                  "Le sujet implicite (architecture, IA, BTP, etc.) DOIT être préservé. " +
                  "Réponds UNIQUEMENT par la requête reformulée, sans guillemets, sans préfixe, en français, max 25 mots.",
              },
              {
                role: "user",
                content: `Contexte récent :\n${ctx}\n\nDernier message utilisateur : "${data.query}"\n\nRequête de recherche optimisée :`,
              },
            ],
            temperature: 0.2,
            max_tokens: 80,
          }),
        });
        if (r.ok) {
          const j = await r.json();
          const rewritten = (j.choices?.[0]?.message?.content ?? "").trim().replace(/^["']|["']$/g, "");
          if (rewritten && rewritten.length > 3 && rewritten.length < 300) {
            effectiveQuery = rewritten;
          }
        }
      } catch (e) {
        console.error("[search] query rewrite failed", e);
      }
    }

    // 2. Exa /answer : LLM-powered, retourne réponse synthétisée + citations
    try {
      const res = await fetch("https://api.exa.ai/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": exaKey },
        body: JSON.stringify({ query: effectiveQuery, text: true }),
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => "unknown error");
        console.error("[EXA] /answer error:", res.status, errText);
        // Fallback /search avec contents
        const sRes = await fetch("https://api.exa.ai/search", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": exaKey },
          body: JSON.stringify({
            query: effectiveQuery,
            numResults: 6,
            type: "auto",
            useAutoprompt: true,
            contents: { text: { maxCharacters: 1500 } },
          }),
        });
        if (!sRes.ok) return { error: `Erreur Exa ${sRes.status}`, answer: "", results: [], query: effectiveQuery };
        const sJson = await sRes.json();
        const results = (sJson.results ?? []).map((r: Record<string, unknown>) => ({
          title: r.title || "Sans titre",
          url: r.url || "",
          text: typeof r.text === "string" ? r.text.slice(0, 1500) : "",
        }));
        return { results, answer: "", query: effectiveQuery };
      }
      const json = await res.json();
      const answer: string = typeof json.answer === "string" ? json.answer : "";
      const citations = (json.citations ?? []).map((c: Record<string, unknown>) => ({
        title: c.title || "Sans titre",
        url: c.url || "",
        text: typeof c.text === "string" ? c.text.slice(0, 1200) : "",
      }));
      return { answer, results: citations, query: effectiveQuery };
    } catch (err) {
      console.error("[EXA] Fetch error:", err);
      return { error: "Erreur réseau Exa", answer: "", results: [], query: effectiveQuery };
    }
  });

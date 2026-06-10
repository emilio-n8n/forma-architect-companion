import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { DreamSynthesisResult, MemorySummary } from "./dreaming.types";

const ZEN_BASE = "https://opencode.ai/zen/v1";
const ZEN_MODEL = process.env.ZEN_MODEL || "nemotron-3-ultra-free";
const ZEN_KEY = () => process.env.ZEN_API_KEY;

function callZen(system: string, user: string, temperature = 0.3) {
  const key = ZEN_KEY();
  if (!key) throw new Error("ZEN_API_KEY not configured");
  return fetch(`${ZEN_BASE}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: ZEN_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature,
      max_tokens: 4096,
    }),
  });
}

/**
 * Phase 2 — Dreaming: cross-conversation memory synthesis.
 * Called when starting a new conversation.
 * Analyzes recent conversations, extracts new facts, resolves conflicts,
 * updates temporal references, and deactivates stale memories.
 */
export const dreamMemorySynthesis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ conversationId: z.string().uuid().optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // 1. Fetch recent conversations (last 15 messages across last 5 conversations)
    const { data: convs } = await supabase
      .from("conversations")
      .select("id, title")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(5);

    if (!convs || convs.length === 0) return { new_memories: 0, updates: 0, deactivated: 0, summaries: 0 };

    const convIds = convs.map((c: any) => c.id);

    const { data: msgs } = await supabase
      .from("messages")
      .select("role, content, conversation_id")
      .in("conversation_id", convIds)
      .order("created_at", { ascending: true })
      .limit(80);

    if (!msgs || msgs.length === 0) return { new_memories: 0, updates: 0, deactivated: 0, summaries: 0 };

    // 2. Fetch existing active memories for context
    const { data: existingMems } = await supabase
      .from("memories")
      .select("id, content, level, category, freshness_score, created_at")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(50);

    // 3. Fetch existing summaries
    const { data: existingSummaries } = await supabase
      .from("memory_summaries")
      .select("category, summary")
      .eq("user_id", userId);

    // 4. Build conversation text
    const conversationText = msgs.map((m: any) =>
      `[${m.role === "user" ? "USER" : "ASSISTANT"}]: ${m.content}`
    ).join("\n\n");

    const existingMemText = (existingMems ?? []).map((m: any) =>
      `- [${m.level?.toUpperCase() ?? "PERSO"}]${m.category ? ` (${m.category})` : ""} [fraîcheur:${m.freshness_score?.toFixed(1) ?? "1.0"}] ${m.content}`
    ).join("\n");

    const summaryText = (existingSummaries ?? []).map((s: any) =>
      `- ${s.category}: ${s.summary}`
    ).join("\n");

    // 5. Send to Zen for synthesis
    const systemPrompt = `Tu es un système de synthèse mémoire pour un assistant architectural français.

Analyse les conversations récentes et la mémoire existante, puis produis UNIQUEMENT un JSON valide selon ce schéma :

{
  "new_memories": [
    {
      "content": "fait précis à retenir (1 phrase)",
      "level": "personal" | "project" | "studio",
      "category": "preferences" | "projects" | "work_style" | "constraints" | "general",
      "freshness_score": 0.0 à 1.0
    }
  ],
  "updates": [
    {
      "memory_id": "uuid de la mémoire existante",
      "content": "contenu mis à jour si pertinent",
      "freshness_score": 0.0 à 1.0 (0.0 = périmé, 1.0 = très actuel)
    }
  ],
  "deactivate_ids": ["uuid1", "uuid2"],
  "summaries": [
    {
      "category": "preferences" | "projects" | "work_style" | "constraints" | "general",
      "summary": "synthèse en 1-3 phrases de tout ce qu'on sait dans cette catégorie"
    }
  ]
}

Règles :
- new_memories : extrais les nouveaux faits IMPORTANTS des conversations qui ne sont pas déjà en mémoire. Préfère la qualité à la quantité (max 5).
- updates : si un fait existant est contredit ou doit être mis à jour (ex: date passée), mets à jour content et/ou freshness_score. freshness_score < 0.3 = quasi périmé.
- deactivate_ids : IDs des mémoires devenues fausses ou obsolètes (ex: "prévoit un voyage en juin" alors qu'on est en juillet).
- summaries : pour chaque catégorie, génère un résumé à jour de TOUT ce que l'agent sait. Combine infos anciennes et nouvelles.

Ne mémorise PAS les salutations, questions triviales, ou infos temporaires sans importance.
Réponds UNIQUEMENT avec le JSON.`;

    const userPrompt = `## MÉMOIRES EXISTANTES
${existingMemText || "Aucune mémoire existante."}

## RÉSUMÉS EXISTANTS
${summaryText || "Aucun résumé existant."}

## CONVERSATIONS RÉCENTES
${conversationText}

Analyse ces conversations et la mémoire existante. Quoi de nouveau ? Quoi mettre à jour ? Quoi désactiver ? Quels résumés générer ?`;

    const res = await callZen(systemPrompt, userPrompt, 0.3);
    if (!res.ok) {
      console.error("[dreaming] Zen API error:", res.status);
      return { new_memories: 0, updates: 0, deactivated: 0, summaries: 0 };
    }

    const json = await res.json();
    const resultText: string = json.choices?.[0]?.message?.content ?? "";

    // Parse JSON from response
    const jsonStart = resultText.indexOf("{");
    const jsonEnd = resultText.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1) return { new_memories: 0, updates: 0, deactivated: 0, summaries: 0 };

    let result: DreamSynthesisResult;
    try {
      result = JSON.parse(resultText.slice(jsonStart, jsonEnd + 1));
    } catch {
      return { new_memories: 0, updates: 0, deactivated: 0, summaries: 0 };
    }

    // Get studio_id
    const { data: profile } = await supabase
      .from("profiles")
      .select("studio_id")
      .eq("id", userId)
      .single();

    const studioId = (profile as any)?.studio_id ?? null;

    // 6. Apply new memories
    let newCount = 0;
    const now = new Date().toISOString();
    for (const mem of result.new_memories || []) {
      // Dedup: check if similar memory already exists
      const { data: dup } = await supabase
        .from("memories")
        .select("id")
        .eq("user_id", userId)
        .eq("level", mem.level)
        .eq("is_active", true)
        .ilike("content", `%${mem.content.slice(0, 50)}%`)
        .maybeSingle();

      if (dup) continue;

      const { error } = await supabase.from("memories").insert({
        user_id: userId,
        studio_id: mem.level === "studio" ? studioId : null,
        level: mem.level,
        category: mem.category ?? "general",
        content: mem.content,
        freshness_score: mem.freshness_score ?? 0.8,
        source_conversation_id: data.conversationId ?? null,
        is_active: true,
      });
      if (!error) newCount++;
    }

    // 7. Apply updates
    let updateCount = 0;
    for (const upd of result.updates || []) {
      const patch: Record<string, any> = {};
      if (upd.content) patch.content = upd.content;
      if (upd.freshness_score !== undefined) patch.freshness_score = upd.freshness_score;
      if (Object.keys(patch).length === 0) continue;

      patch.updated_at = now;

      const { error } = await supabase
        .from("memories")
        .update(patch)
        .eq("id", upd.memory_id)
        .eq("user_id", userId);
      if (!error) updateCount++;
    }

    // 8. Deactivate stale memories
    let deactivateCount = 0;
    for (const id of result.deactivate_ids || []) {
      const { error } = await supabase
        .from("memories")
        .update({ is_active: false, freshness_score: 0, updated_at: now })
        .eq("id", id)
        .eq("user_id", userId);
      if (!error) deactivateCount++;
    }

    // 9. Upsert summaries
    let summaryCount = 0;
    for (const s of result.summaries || []) {
      const { error } = await supabase.from("memory_summaries").upsert(
        { user_id: userId, category: s.category, summary: s.summary },
        { onConflict: "user_id,category" },
      );
      if (!error) summaryCount++;
    }

    return {
      new_memories: newCount,
      updates: updateCount,
      deactivated: deactivateCount,
      summaries: summaryCount,
    };
  });

/**
 * Refresh temporal memories — called daily or on first message of the day.
 * Reviews active memories, detects stale temporal references, and decays freshness.
 */
export const refreshTemporalMemories = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    // Decay all active memories: multiply freshness by 0.95 (slow decay)
    // Memories accessed recently decay less
    const { data: active } = await supabase
      .from("memories")
      .select("id, content, freshness_score, last_accessed, created_at")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (!active || active.length === 0) return { decayed: 0, deactivated: 0 };

    const now = new Date();
    let decayed = 0;
    let deactivated = 0;

    for (const mem of active) {
      const daysSinceAccess = mem.last_accessed
        ? (now.getTime() - new Date(mem.last_accessed).getTime()) / (1000 * 60 * 60 * 24)
        : 30;

      const daysSinceCreation = (now.getTime() - new Date(mem.created_at).getTime()) / (1000 * 60 * 60 * 24);

      // Decay factor: accessed recently = less decay, untouched = heavy decay
      const accessDecay = Math.max(0.7, 1 - daysSinceAccess * 0.01);
      const newScore = Math.max(0, Math.min(1, mem.freshness_score * 0.95 * accessDecay));

      if (newScore < 0.15 && daysSinceCreation > 14) {
        // Auto-deactivate very stale memories older than 2 weeks
        await supabase
          .from("memories")
          .update({ is_active: false, freshness_score: 0, updated_at: now.toISOString() })
          .eq("id", mem.id);
        deactivated++;
      } else if (Math.abs(newScore - mem.freshness_score) > 0.01) {
        await supabase
          .from("memories")
          .update({ freshness_score: newScore, updated_at: now.toISOString() })
          .eq("id", mem.id);
        decayed++;
      }
    }

    return { decayed, deactivated };
  });

/**
 * Generate or refresh memory summaries for all categories.
 * Called after dreamMemorySynthesis and periodically.
 */
export const generateMemorySummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    // Fetch all active memories
    const { data: memories } = await supabase
      .from("memories")
      .select("content, level, category")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("freshness_score", { ascending: false })
      .limit(100);

    if (!memories || memories.length === 0) return { summaries: 0 };

    const memText = memories.map((m: any) =>
      `[${m.level?.toUpperCase() ?? "PERSO"}]${m.category ? ` (${m.category})` : ""}: ${m.content}`
    ).join("\n");

    const systemPrompt = `Tu es un assistant qui synthétise des informations personnelles.
À partir de la liste de mémoires ci-dessous, génère un résumé par catégorie.
	
Catégories possibles :
- "preferences" : préférences personnelles, style de communication, habitudes
- "projects" : informations sur les projets en cours
- "work_style" : méthodes de travail, outils, logiciels
- "constraints" : contraintes réglementaires, techniques, budget
- "general" : tout le reste

Réponds UNIQUEMENT avec un JSON : 
{
  "summaries": [
    { "category": "preferences", "summary": "synthèse concise (1-3 phrases)" },
    { "category": "projects", "summary": "..." },
    ...
  ]
}

Ne génère que les catégories pour lesquelles tu as des informations pertinentes.`;

    const res = await callZen(systemPrompt, memText, 0.2);
    if (!res.ok) return { summaries: 0 };

    const json = await res.json();
    const text: string = json.choices?.[0]?.message?.content ?? "";
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1) return { summaries: 0 };

    let parsed: { summaries: Array<{ category: string; summary: string }> };
    try {
      parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
    } catch {
      return { summaries: 0 };
    }

    let count = 0;
    for (const s of parsed.summaries || []) {
      if (!s.category || !s.summary) continue;
      const { error } = await supabase.from("memory_summaries").upsert(
        { user_id: userId, category: s.category, summary: s.summary },
        { onConflict: "user_id,category" },
      );
      if (!error) count++;
    }

    return { summaries: count };
  });

/**
 * Fetch memory summaries for a user (used by chat system prompt injection)
 */
export const getMemorySummaries = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data } = await supabase
      .from("memory_summaries")
      .select("*")
      .eq("user_id", userId);

    return (data ?? []) as MemorySummary[];
  });

/**
 * Get most relevant active memories for prompt injection
 */
export const getRecentActiveMemories = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data } = await supabase
      .from("memories")
      .select("content, level, category, freshness_score, created_at")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("freshness_score", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(15);

    return (data ?? []).map((m: any) => ({
      content: m.content,
      level: m.level,
      category: m.category,
      freshness: m.freshness_score,
    }));
  });

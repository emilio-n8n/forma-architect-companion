import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { CreateMemorySchema, type Memory } from "./memory.types";

export const createMemory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CreateMemorySchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: profile } = await supabase
      .from("profiles")
      .select("studio_id")
      .eq("id", userId)
      .single();

    const { error } = await supabase.from("memories").insert({
      user_id: userId,
      studio_id: profile?.studio_id ?? null,
      project_id: data.project_id ?? null,
      level: data.level,
      category: data.category ?? null,
      content: data.content,
      freshness_score: data.freshness_score ?? 1.0,
      source_conversation_id: data.source_conversation_id ?? null,
      is_active: true,
    });

    if (error) throw new Error(error.message);
    return { success: true };
  });

export const searchMemories = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      query: z.string().min(1).max(2000),
      project_id: z.string().uuid().nullable().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Get user's studio for studio-level memory access
    const { data: profile } = await supabase
      .from("profiles")
      .select("studio_id")
      .eq("id", userId)
      .single();

    const query = data.query.trim();
    if (!query) return [];

    // Simple keyword search — split query into meaningful keywords
    const keywords = query
      .toLowerCase()
      .replace(/[?.,!;:()]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 3)
      .slice(0, 8);

    if (keywords.length === 0) return [];

    // Build ILIKE conditions
    const conditions = keywords.map((kw) => `content.ilike.%${kw}%`);

    // Search personal memories — only active, ranked by freshness_score
    let personalMemories: any[] = [];
    if (conditions.length > 0) {
      const { data: personal } = await supabase
        .from("memories")
        .select("*")
        .eq("user_id", userId)
        .eq("is_active", true)
        .in("level", ["personal", "project"])
        .or(conditions.join(","))
        .order("freshness_score", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(10);

      personalMemories = personal ?? [];
    }

    // Search studio memories if user has a studio
    let studioMemories: any[] = [];
    if (profile?.studio_id && conditions.length > 0) {
      const { data: studio } = await supabase
        .from("memories")
        .select("*")
        .eq("level", "studio")
        .eq("studio_id", profile.studio_id)
        .eq("is_active", true)
        .or(conditions.join(","))
        .order("freshness_score", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(6);

      studioMemories = studio ?? [];
    }

    // Merge, keep unique by id, and return
    const seen = new Set<string>();
    const combined = [...personalMemories, ...studioMemories].filter((m) => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    }).slice(0, 15);

    // Update last_accessed for returned memories
    if (combined.length > 0) {
      const ids = combined.map((m: any) => m.id);
      await supabase
        .from("memories")
        .update({ last_accessed: new Date().toISOString() })
        .in("id", ids);
    }

    return combined as Memory[];
  });

export const listMemories = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      level: z.enum(["project", "personal", "studio"]).optional(),
      project_id: z.string().uuid().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase
      .from("profiles")
      .select("studio_id")
      .eq("id", userId)
      .single();

    let query = supabase.from("memories").select("*").eq("is_active", true);

    if (data.level === "studio" && profile?.studio_id) {
      query = query.eq("level", "studio").eq("studio_id", profile.studio_id);
    } else if (data.level === "project" && data.project_id) {
      query = query.eq("level", "project").eq("project_id", data.project_id);
    } else if (data.level === "personal") {
      query = query.eq("level", "personal").eq("user_id", userId);
    } else {
      // All accessible
      query = query.eq("user_id", userId);
      if (profile?.studio_id) {
        // Also include studio memories — handled below
      }
    }

    const { data: personal, error } = await query
      .order("freshness_score", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw new Error(error.message);

    let result = personal ?? [];

    // Include studio memories if no specific level filter
    if (!data.level && profile?.studio_id) {
      const { data: studio } = await supabase
        .from("memories")
        .select("*")
        .eq("level", "studio")
        .eq("studio_id", profile.studio_id)
        .eq("is_active", true)
        .order("freshness_score", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(50);

      if (studio) {
        const seen = new Set(result.map((m: any) => m.id));
        result = [...result, ...studio.filter((m: any) => !seen.has(m.id))];
      }
    }

    return result as Memory[];
  });

export const deleteMemory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ memoryId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { error } = await supabase
      .from("memories")
      .delete()
      .eq("id", data.memoryId)
      .eq("user_id", userId);

    if (error) throw new Error(error.message);
    return { success: true };
  });

/**
 * Extract and save memories from conversation content.
 * Called after each assistant response.
 */
export const saveMemoriesFromConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      content: z.string().min(1).max(50000),
      project_id: z.string().uuid().nullable().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: profile } = await supabase
      .from("profiles")
      .select("studio_id")
      .eq("id", userId)
      .single();

    // We use Mistral to extract important facts to remember
    const mistralKey = process.env.MISTRAL_API_KEY;
    if (!mistralKey) return { saved: 0 };

    const systemPrompt = `Tu es un assistant qui extrait des informations importantes à retenir d'une conversation.

Analyse le message ci-dessous et identifie les faits IMPORTANTS qui méritent d'être mémorisés pour les conversations futures.
Ne mémorise que :
- Les préférences personnelles de l'utilisateur (ex: "toujours utiliser 'Bien cordialement'")
- Les informations clés sur un projet (ex: "cette maison est en bord de mer")
- Les contraintes architecturales (ex: "le PLU impose une hauteur max de 9m")
- Les habitudes de travail (ex: "l'architecte préfère les toits plats")

NE mémorise PAS :
- Les questions triviales
- Les salutations
- Les informations temporaires

Répond UNIQUEMENT avec un tableau JSON, jamais autre chose :
[
  {
    "content": "le fait à retenir (1 phrase précise)",
    "level": "project" | "personal" | "studio"
  }
]

- "project" : info spécifique à ce projet (nécessite un project_id)
- "personal" : préférence personnelle de l'utilisateur
- "studio" : règle/standard applicable à toute l'agence

Si rien à mémoriser, réponds []`;

    const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${mistralKey}` },
      body: JSON.stringify({
        model: "mistral-small-latest",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: data.content },
        ],
        temperature: 0.2,
      }),
    });
    if (!res.ok) return { saved: 0 };
    const json = await res.json();
    const resultText: string = json.choices?.[0]?.message?.content ?? "";

    try {
      // Try to parse as JSON
      const text = resultText.trim();
      // Find JSON array in the response
      const jsonStart = text.indexOf("[");
      const jsonEnd = text.lastIndexOf("]");
      if (jsonStart === -1 || jsonEnd === -1) return { saved: 0 };

      const jsonStr = text.slice(jsonStart, jsonEnd + 1);
      const memories: Array<{ content: string; level: string; category?: string }> = JSON.parse(jsonStr);

      if (!Array.isArray(memories) || memories.length === 0) return { saved: 0 };

      let saved = 0;
      for (const mem of memories) {
        if (!mem.content || !["project", "personal", "studio"].includes(mem.level)) continue;

        // For project-level, require project_id
        const projectId = mem.level === "project" ? (data.project_id ?? null) : null;

        // Skip project memories without a project context
        if (mem.level === "project" && !projectId) continue;

        // Skip studio memories without a studio
        if (mem.level === "studio" && !profile?.studio_id) continue;

        // Check for near-duplicate by content similarity (simple length + overlap)
        const { data: existing } = await supabase
          .from("memories")
          .select("id")
          .eq("user_id", userId)
          .eq("level", mem.level)
          .eq("is_active", true)
          .ilike("content", `%${mem.content.slice(0, 40)}%`)
          .maybeSingle();

        if (existing) continue;

        const { error } = await supabase.from("memories").insert({
          user_id: userId,
          studio_id: mem.level === "studio" ? profile!.studio_id : null,
          project_id: projectId,
          level: mem.level,
          category: mem.category ?? "general",
          content: mem.content,
          freshness_score: 0.9,
          is_active: true,
        });

        if (!error) saved++;
      }

      return { saved };
    } catch {
      // Parsing failed, silently ignore
      return { saved: 0 };
    }
  });

export const updateMemory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      memoryId: z.string().uuid(),
      content: z.string().min(1).max(10000).optional(),
      category: z.enum(["preferences", "projects", "work_style", "constraints", "general"]).optional(),
      freshness_score: z.number().min(0).max(1).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const patch: Record<string, any> = {};
    if (data.content !== undefined) patch.content = data.content;
    if (data.category !== undefined) patch.category = data.category;
    if (data.freshness_score !== undefined) patch.freshness_score = data.freshness_score;
    patch.updated_at = new Date().toISOString();

    const { error } = await supabase
      .from("memories")
      .update(patch as any)
      .eq("id", data.memoryId)
      .eq("user_id", userId);

    if (error) throw new Error(error.message);
    return { success: true };
  });

export const deactivateMemory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ memoryId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("memories")
      .update({ is_active: false, freshness_score: 0, updated_at: new Date().toISOString() })
      .eq("id", data.memoryId)
      .eq("user_id", userId);

    if (error) throw new Error(error.message);
    return { success: true };
  });

export const reactivateMemory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ memoryId: z.string().uuid(), freshness_score: z.number().min(0).max(1).default(0.8) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("memories")
      .update({ is_active: true, freshness_score: data.freshness_score, updated_at: new Date().toISOString() })
      .eq("id", data.memoryId)
      .eq("user_id", userId);

    if (error) throw new Error(error.message);
    return { success: true };
  });

export const getMemoryStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: daily } = await supabase
      .from("memories")
      .select("created_at, freshness_score")
      .eq("user_id", userId)
      .gte("created_at", thirtyDaysAgo);

    if (!daily) return { days: [], totals: { active: 0, inactive: 0, avg_freshness: 0 } };

    const dayMap = new Map<string, { created: number; freshness_sum: number; count: number }>();
    for (const m of daily) {
      const day = (m.created_at ?? "").slice(0, 10);
      if (!day) continue;
      const entry = dayMap.get(day) ?? { created: 0, freshness_sum: 0, count: 0 };
      entry.count++;
      entry.freshness_sum += (m.freshness_score ?? 0);
      dayMap.set(day, entry);
    }

    const days: Array<{ date: string; created: number; avg_freshness: number }> = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const stats = dayMap.get(d);
      days.push({
        date: d,
        created: stats?.created ?? 0,
        avg_freshness: stats ? Math.round((stats.freshness_sum / stats.count) * 100) / 100 : 0,
      });
    }

    const { count: activeCount } = await supabase
      .from("memories")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_active", true);

    const { count: inactiveCount } = await supabase
      .from("memories")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_active", false);

    const avgFreshness = days.length > 0
      ? Math.round((days.reduce((s, d) => s + d.avg_freshness, 0) / days.length) * 100) / 100
      : 0;

    return {
      days,
      totals: {
        active: activeCount ?? 0,
        inactive: inactiveCount ?? 0,
        avg_freshness: avgFreshness,
      },
    };
  });

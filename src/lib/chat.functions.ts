import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const ensureConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existing) return { id: existing.id };
    const { data, error } = await supabase
      .from("conversations")
      .insert({ user_id: userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: data.id };
  });

export const loadMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ conversationId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
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
    const { error } = await supabase.from("messages").insert({
      conversation_id: data.conversationId,
      user_id: userId,
      role: data.role,
      content: data.content,
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
    const { error } = await context.supabase
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
    const { error } = await context.supabase
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
    const key = process.env.CEREBRAS_API_KEY;
    if (!key) return [];
    const history = data.messages.slice(-4).map((m) => ({ role: m.role, content: m.content }));
    const res = await fetch("https://api.cerebras.ai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "gpt-oss-120b",
        messages: [
          {
            role: "system",
            content:
              "À partir de la conversation ci-dessous, génère 3 questions courtes et pertinentes " +
              "que l'utilisateur pourrait poser ensuite. Réponds UNIQUEMENT par un tableau JSON " +
              'de 3 chaînes, exemple: ["Question 1 ?", "Question 2 ?", "Question 3 ?"]. ' +
              "Ne mets pas de markdown, pas de texte avant/après.",
          },
          ...history,
        ],
      }),
    });
    if (!res.ok) return [];
    const json = await res.json();
    const text = json.choices?.[0]?.message?.content ?? "[]";
    try {
      const parsed = JSON.parse(text);
      return Array.isArray(parsed) ? parsed.slice(0, 3) : [];
    } catch {
      return [];
    }
  });

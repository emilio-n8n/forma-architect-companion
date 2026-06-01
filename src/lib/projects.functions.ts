import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Status = z.enum(["todo", "in_progress", "review", "done"]);

export const listProjects = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    // ⭐ SECURITY: Toujours filtrer par user_id (Broken Access Control fix)
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("user_id", userId)
      .order("position", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      title: z.string().min(1).max(200),
      tag: z.string().max(50).default("Résidentiel"),
      description: z.string().max(2000).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("projects")
      .insert({ user_id: userId, title: data.title, tag: data.tag, description: data.description ?? null })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateProjectStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), status: Status }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // ⭐ SECURITY: Vérifier que le projet appartient à l'utilisateur
    const { error: checkError } = await supabase
      .from("projects")
      .select("id")
      .eq("id", data.id)
      .eq("user_id", userId)
      .single();
    if (checkError) {
      throw new Error("Projet introuvable ou accès refusé");
    }
    const { error } = await supabase
      .from("projects")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // ⭐ SECURITY: Vérifier que le projet appartient à l'utilisateur avant suppression
    const { error: checkError } = await supabase
      .from("projects")
      .select("id")
      .eq("id", data.id)
      .eq("user_id", userId)
      .single();
    if (checkError) {
      throw new Error("Projet introuvable ou accès refusé");
    }
    const { error } = await supabase.from("projects").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

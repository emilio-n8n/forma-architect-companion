import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const ensureStudio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    // Check if user already has a studio member entry
    const { data: existing } = await supabase
      .from("studio_members")
      .select("studio_id, studios(name)")
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) return { studioId: existing.studio_id, name: (existing.studios as any)?.name ?? "Mon Agence" };

    // Get user profile for the studio name
    const { data: profile } = await supabase
      .from("profiles")
      .select("agency_name, email")
      .eq("id", userId)
      .single();

    const studioName = profile?.agency_name || profile?.email?.split("@")[0] || "Mon Agence";

    // Create studio + membership in a transaction
    const { data: studio, error: studioErr } = await supabase
      .from("studios")
      .insert({ name: studioName, created_by: userId })
      .select("id, name")
      .single();

    if (studioErr) throw new Error(studioErr.message);

    const { error: memberErr } = await supabase
      .from("studio_members")
      .insert({ studio_id: studio.id, user_id: userId, role: "admin" });

    if (memberErr) throw new Error(memberErr.message);

    // Link profile to studio
    await supabase
      .from("profiles")
      .update({ studio_id: studio.id })
      .eq("id", userId);

    return { studioId: studio.id, name: studio.name };
  });

export const getStudioMembers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ studioId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Verify caller is a member of this studio
    const { data: membership } = await supabase
      .from("studio_members")
      .select("role")
      .eq("studio_id", data.studioId)
      .eq("user_id", userId)
      .single();

    if (!membership) throw new Error("Accès refusé");

    const { data: members, error } = await supabase
      .from("studio_members")
      .select("id, user_id, role, joined_at, profiles(email, agency_name)")
      .eq("studio_id", data.studioId)
      .order("joined_at", { ascending: true });

    if (error) throw new Error(error.message);
    return members;
  });

export const inviteToStudio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      studioId: z.string().uuid(),
      email: z.string().email(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Verify caller is admin
    const { data: membership } = await supabase
      .from("studio_members")
      .select("role")
      .eq("studio_id", data.studioId)
      .eq("user_id", userId)
      .single();

    if (!membership || membership.role !== "admin") throw new Error("Seuls les admins peuvent inviter");

    // Find user by email
    const { data: invitedUser } = await supabase
      .from("profiles")
      .select("id, studio_id")
      .eq("email", data.email)
      .maybeSingle();

    if (!invitedUser) throw new Error("Utilisateur introuvable. L'invité doit d'abord créer un compte.");

    if (invitedUser.studio_id) throw new Error("Cet utilisateur est déjà dans un studio.");

    // Add as member
    const { error } = await supabase
      .from("studio_members")
      .insert({ studio_id: data.studioId, user_id: invitedUser.id, role: "member" });

    if (error) throw new Error(error.message);

    // Link profile to studio
    await supabase
      .from("profiles")
      .update({ studio_id: data.studioId })
      .eq("id", invitedUser.id);

    return { success: true };
  });

export const removeMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      studioId: z.string().uuid(),
      memberId: z.string().uuid(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: membership } = await supabase
      .from("studio_members")
      .select("role")
      .eq("studio_id", data.studioId)
      .eq("user_id", userId)
      .single();

    if (!membership || membership.role !== "admin") throw new Error("Seuls les admins peuvent retirer des membres");

    const { error } = await supabase
      .from("studio_members")
      .delete()
      .eq("id", data.memberId)
      .eq("studio_id", data.studioId);

    if (error) throw new Error(error.message);
    return { success: true };
  });

export const updateStudioName = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ studioId: z.string().uuid(), name: z.string().min(1).max(200) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: membership } = await supabase
      .from("studio_members")
      .select("role")
      .eq("studio_id", data.studioId)
      .eq("user_id", userId)
      .single();

    if (!membership || membership.role !== "admin") throw new Error("Seuls les admins peuvent modifier le studio");

    const { error } = await supabase
      .from("studios")
      .update({ name: data.name })
      .eq("id", data.studioId);

    if (error) throw new Error(error.message);
    return { success: true };
  });

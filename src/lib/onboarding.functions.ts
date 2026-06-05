import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { OnboardingDataSchema, type OnboardingData, type OnboardingLevel } from "./onboarding.types";
import { z } from "zod";

export const saveOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      level: z.enum(["full", "quick"]),
      data: OnboardingDataSchema,
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { error } = await supabase.from("onboarding_data").upsert({
      user_id: userId,
      level: data.level,
      data: data.data as any,
      completed_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

    if (error) throw new Error(error.message);

    // Mark profile as onboarding completed
    await supabase
      .from("profiles")
      .update({
        onboarding_completed: true,
        onboarding_level: data.level,
      })
      .eq("id", userId);

    return { success: true };
  });

export const getOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data, error } = await supabase
      .from("onboarding_data")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw new Error(error.message);

    if (!data) return null;

    return {
      level: data.level as OnboardingLevel,
      data: data.data as unknown as OnboardingData,
      completed_at: data.completed_at,
    };
  });

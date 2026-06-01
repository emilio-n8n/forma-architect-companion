import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { checkRateLimit } from "@/lib/rate-limiter";

const RenderSchema = z.object({
  prompt: z.string().min(1).max(2000),
  ambiance: z.enum(["jour", "nuit"]),
  weather: z.string().min(1).max(50),
  style: z.string().min(1).max(50),
  referenceUrl: z.string().url().optional().nullable(),
});

async function generateImageBase64(prompt: string, referenceUrl?: string | null): Promise<string> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY missing");

  const userContent: Array<Record<string, unknown>> = [{ type: "text", text: prompt }];
  if (referenceUrl) {
    userContent.push({ type: "image_url", image_url: { url: referenceUrl } });
  }

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-image-preview",
      messages: [{ role: "user", content: userContent }],
      modalities: ["image", "text"],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    if (res.status === 429) throw new Error("Limite de requêtes atteinte. Réessayez dans un instant.");
    if (res.status === 402) throw new Error("Crédits IA épuisés. Ajoutez des crédits dans les paramètres workspace.");
    throw new Error(`Échec génération image (${res.status}): ${text.slice(0, 200)}`);
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { images?: Array<{ image_url?: { url?: string } }> } }>;
  };
  const url = json.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!url) throw new Error("Aucune image retournée par le modèle");
  return url; // data URL
}

async function persistImage(
  supabase: ReturnType<typeof import("@supabase/supabase-js").createClient>,
  userId: string,
  dataUrl: string,
): Promise<string> {
  const base64 = dataUrl.split(",")[1];
  const buffer = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const path = `${userId}/${crypto.randomUUID()}.png`;
  const { error: upErr } = await supabase.storage.from("renders").upload(path, buffer, {
    contentType: "image/png",
    upsert: false,
  });
  if (upErr) throw new Error("Upload storage: " + upErr.message);
  const { data: pub } = supabase.storage.from("renders").getPublicUrl(path);
  return pub.publicUrl;
}

export const generateRender = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => RenderSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    
    // ⭐ SECURITY: Rate Limiting - 3 requests/minute/user for render (most expensive)
    if (!checkRateLimit('RENDER', userId)) {
      throw new Error('Limite de requêtes atteinte. Veuillez patienter avant de générer un nouveau rendu (3 par minute).');
    }
    
    const fullPrompt = `Rendu architectural photoréaliste, ambiance ${data.ambiance}, météo ${data.weather}, style ${data.style}. ${data.prompt}. Haute qualité, lumière cinématographique, détails fins, perspective architecturale professionnelle.`;
    const dataUrl = await generateImageBase64(fullPrompt, data.referenceUrl);
    const imageUrl = await persistImage(supabase as never, userId, dataUrl);

    const { data: row, error: insErr } = await supabase
      .from("renders")
      .insert({
        user_id: userId,
        prompt: data.prompt,
        ambiance: data.ambiance,
        weather: data.weather,
        style: data.style,
        reference_url: data.referenceUrl ?? null,
        image_url: imageUrl,
        status: "done",
      })
      .select()
      .single();
    if (insErr) throw new Error(insErr.message);
    return { id: row.id, imageUrl };
  });

const EditSchema = z.object({
  renderId: z.string().uuid(),
  instruction: z.string().min(1).max(2000),
});

export const editRender = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => EditSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // ⭐ SECURITY: Vérifier que le rendu appartient à l'utilisateur
    const { data: src, error } = await supabase
      .from("renders")
      .select("*")
      .eq("id", data.renderId)
      .eq("user_id", userId)
      .single();
    if (error || !src?.image_url) throw new Error("Rendu introuvable ou accès refusé");

    const prompt = `Modifie ce rendu architectural photoréaliste selon cette instruction: ${data.instruction}. Conserve la cohérence architecturale, le cadrage et la qualité photoréaliste.`;
    const dataUrl = await generateImageBase64(prompt, src.image_url);
    const imageUrl = await persistImage(supabase as never, userId, dataUrl);

    const { data: row, error: insErr } = await supabase
      .from("renders")
      .insert({
        user_id: userId,
        prompt: `[Édition] ${data.instruction} (basé sur ${src.prompt ?? "rendu précédent"})`,
        ambiance: src.ambiance,
        weather: src.weather,
        style: src.style,
        reference_url: src.image_url,
        image_url: imageUrl,
        status: "done",
      })
      .select()
      .single();
    if (insErr) throw new Error(insErr.message);
    return { id: row.id, imageUrl };
  });

export const listRenders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    // ⭐ SECURITY: Toujours filtrer par user_id (Broken Access Control fix)
    const { data, error } = await supabase
      .from("renders")
      .select("id, image_url, prompt, ambiance, style, weather, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(48);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

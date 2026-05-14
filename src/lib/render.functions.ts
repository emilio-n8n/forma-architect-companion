import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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

export const generateRender = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => RenderSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const fullPrompt = `Rendu architectural photoréaliste, ambiance ${data.ambiance}, météo ${data.weather}, style ${data.style}. ${data.prompt}. Haute qualité, lumière cinématographique, détails fins, perspective architecturale professionnelle.`;

    const dataUrl = await generateImageBase64(fullPrompt, data.referenceUrl);

    // upload to storage
    const base64 = dataUrl.split(",")[1];
    const buffer = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const path = `${userId}/${crypto.randomUUID()}.png`;
    const { error: upErr } = await supabase.storage.from("renders").upload(path, buffer, {
      contentType: "image/png",
      upsert: false,
    });
    if (upErr) throw new Error("Upload storage: " + upErr.message);

    const { data: pub } = supabase.storage.from("renders").getPublicUrl(path);
    const imageUrl = pub.publicUrl;

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

export const listRenders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("renders")
      .select("id, image_url, prompt, ambiance, style, weather, created_at")
      .order("created_at", { ascending: false })
      .limit(48);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

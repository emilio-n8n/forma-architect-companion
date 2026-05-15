import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({
  surface: z.number().int().min(20).max(2000),
  bedrooms: z.number().int().min(0).max(20),
  levels: z.number().int().min(1).max(6),
  budget: z.enum(["Économique", "Moyen de gamme", "Haut de gamme"]),
});

export type PlanVariant = {
  name: string;
  concept: string;
  features: string[];
  estimated_cost_eur: number;
  energy_class: string;
  pros: string[];
  plan_2d_url?: string | null;
};

async function callJSON(prompt: string): Promise<{ variants: PlanVariant[] }> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY missing");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        {
          role: "system",
          content:
            "Tu es un architecte français senior. Réponds UNIQUEMENT en JSON valide (sans markdown, sans texte autour). Les coûts sont en euros TTC, prix marché France 2026.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) {
    if (res.status === 429) throw new Error("Limite de requêtes atteinte.");
    if (res.status === 402) throw new Error("Crédits IA épuisés.");
    throw new Error("Erreur IA: " + res.status);
  }
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const text = json.choices?.[0]?.message?.content ?? "{}";
  return JSON.parse(text) as { variants: PlanVariant[] };
}

async function generateImage(prompt: string): Promise<string> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY missing");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-image-preview",
      messages: [{ role: "user", content: [{ type: "text", text: prompt }] }],
      modalities: ["image", "text"],
    }),
  });
  if (!res.ok) {
    if (res.status === 429) throw new Error("Limite de requêtes atteinte.");
    if (res.status === 402) throw new Error("Crédits IA épuisés.");
    throw new Error("Erreur image: " + res.status);
  }
  const json = (await res.json()) as {
    choices?: Array<{ message?: { images?: Array<{ image_url?: { url?: string } }> } }>;
  };
  const url = json.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!url) throw new Error("Aucune image retournée");
  return url;
}

export const generatePlans = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const prompt = `Génère 6 variantes de plans pour une maison/projet :
- Surface: ${data.surface} m²
- Chambres: ${data.bedrooms}
- Niveaux: ${data.levels}
- Budget cible: ${data.budget}

Conformes à RE2020 et accessibilité PMR. Style architectural varié (contemporain, traditionnel, minimaliste, bioclimatique, industriel, méditerranéen).

Format JSON strict:
{"variants":[{"name":"string","concept":"string court","features":["string"],"estimated_cost_eur":number,"energy_class":"A|B|C","pros":["string"]}]}

Exactement 6 variantes.`;

    const out = await callJSON(prompt);
    const variants = (out.variants ?? []).slice(0, 6);

    const { data: row, error } = await supabase
      .from("plans")
      .insert({
        user_id: userId,
        surface: data.surface,
        bedrooms: data.bedrooms,
        levels: data.levels,
        budget: data.budget,
        variants: variants as unknown as never,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id, variants };
  });

export const listPlans = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("plans")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const Plan2DInput = z.object({
  planId: z.string().uuid(),
  variantIndex: z.number().int().min(0).max(5),
});

export const generate2DPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Plan2DInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase.from("plans").select("*").eq("id", data.planId).single();
    if (error || !row) throw new Error("Plan introuvable");
    const variants = (row.variants as unknown as PlanVariant[]) ?? [];
    const v = variants[data.variantIndex];
    if (!v) throw new Error("Variante introuvable");

    const prompt = `Plan 2D architectural professionnel, vue du dessus, style dessin technique noir et blanc sur fond blanc.
Maison: ${v.name}. Concept: ${v.concept}.
Caractéristiques: ${(v.features ?? []).join(", ")}.
Surface ${row.surface} m², ${row.bedrooms} chambres, ${row.levels} niveau(x).
Inclure: cotations, noms des pièces en français, murs épais, ouvertures (portes/fenêtres), mobilier suggéré, nord géographique, échelle.
Style: blueprint architectural moderne, lignes nettes, conforme RE2020 et accessibilité PMR.`;

    const dataUrl = await generateImage(prompt);
    const base64 = dataUrl.split(",")[1];
    const buffer = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const path = `${userId}/plan2d-${row.id}-${data.variantIndex}-${Date.now()}.png`;
    const { error: upErr } = await supabase.storage
      .from("renders")
      .upload(path, buffer, { contentType: "image/png", upsert: false });
    if (upErr) throw new Error("Upload: " + upErr.message);
    const { data: pub } = supabase.storage.from("renders").getPublicUrl(path);
    const url = pub.publicUrl;

    variants[data.variantIndex] = { ...v, plan_2d_url: url };
    const { error: updErr } = await supabase
      .from("plans")
      .update({ variants: variants as unknown as never })
      .eq("id", row.id);
    if (updErr) throw new Error(updErr.message);

    return { url, variantIndex: data.variantIndex };
  });

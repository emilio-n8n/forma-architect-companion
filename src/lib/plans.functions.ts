import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({
  surface: z.number().int().min(20).max(2000),
  bedrooms: z.number().int().min(0).max(20),
  levels: z.number().int().min(1).max(6),
  budget: z.enum(["Économique", "Moyen de gamme", "Haut de gamme"]),
});

export type Room = { id: string; name: string; x: number; y: number; w: number; h: number };
export type Opening = {
  id: string;
  type: "door" | "window";
  room_id: string;
  wall: "N" | "S" | "E" | "W";
  offset: number; // meters from room's top-left along that wall
  width: number; // meters
};
export type PlanData = {
  unit: "m";
  total_w: number;
  total_h: number;
  rooms: Room[];
  openings: Opening[];
  confirmed?: boolean;
};

export type PlanVariant = {
  name: string;
  concept: string;
  features: string[];
  estimated_cost_eur: number;
  energy_class: string;
  pros: string[];
  plan_2d_data?: PlanData | null;
  plan_3d_ready?: boolean;
};

async function callJSON<T>(prompt: string, system: string): Promise<T> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY missing");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: system },
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
  return JSON.parse(text) as T;
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

Conformes à RE2020 et accessibilité PMR. Styles variés (contemporain, traditionnel, minimaliste, bioclimatique, industriel, méditerranéen).

Format JSON strict:
{"variants":[{"name":"string","concept":"string court","features":["string"],"estimated_cost_eur":number,"energy_class":"A|B|C","pros":["string"]}]}

Exactement 6 variantes.`;

    const out = await callJSON<{ variants: PlanVariant[] }>(
      prompt,
      "Tu es un architecte français senior. Réponds UNIQUEMENT en JSON valide. Prix marché France 2026."
    );
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

const VariantRef = z.object({
  planId: z.string().uuid(),
  variantIndex: z.number().int().min(0).max(5),
});

export const generate2DPlanData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => VariantRef.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: row, error } = await supabase.from("plans").select("*").eq("id", data.planId).single();
    if (error || !row) throw new Error("Plan introuvable");
    const variants = (row.variants as unknown as PlanVariant[]) ?? [];
    const v = variants[data.variantIndex];
    if (!v) throw new Error("Variante introuvable");

    const prompt = `Génère un plan 2D architectural EXPORTABLE pour:
- ${v.name} — ${v.concept}
- Surface: ${row.surface} m², ${row.bedrooms} chambres, ${row.levels} niveau(x)
- Caractéristiques: ${(v.features ?? []).join(", ")}

Représente le plan comme des PIÈCES RECTANGULAIRES adjacentes (coordonnées en mètres, origine en haut-gauche, axe Y vers le bas).
Contraintes:
- Toutes les coordonnées et dimensions en mètres (nombres décimaux).
- Les pièces NE doivent PAS se chevaucher.
- Inclure: entrée, séjour, cuisine, ${row.bedrooms} chambre(s), salle(s) de bain, WC, dégagement/couloir si nécessaire.
- Somme des surfaces ≈ ${row.surface} m² (±10%).
- Respecter accessibilité PMR (largeurs ≥ 0.9m pour portes).
- total_w et total_h = bounding box du plan.

Pour chaque ouverture (porte/fenêtre):
- room_id = id de la pièce
- wall = "N" (haut), "S" (bas), "E" (droite), "W" (gauche)
- offset = distance en mètres depuis le coin haut-gauche de la pièce le long du mur
- width = largeur ouverture en mètres

Format JSON strict:
{"unit":"m","total_w":number,"total_h":number,"rooms":[{"id":"r1","name":"Séjour","x":0,"y":0,"w":5.2,"h":4.8}],"openings":[{"id":"o1","type":"door","room_id":"r1","wall":"S","offset":2.0,"width":0.9}]}`;

    const planData = await callJSON<PlanData>(
      prompt,
      "Tu es un architecte DPLG. Tu produis des plans 2D précis et conformes RE2020/PMR. Réponds UNIQUEMENT en JSON valide, sans markdown."
    );
    planData.unit = "m";
    planData.confirmed = false;

    variants[data.variantIndex] = { ...v, plan_2d_data: planData, plan_3d_ready: false };
    const { error: updErr } = await supabase
      .from("plans")
      .update({ variants: variants as unknown as never })
      .eq("id", row.id);
    if (updErr) throw new Error(updErr.message);
    return { planData, variantIndex: data.variantIndex };
  });

const UpdateInput = z.object({
  planId: z.string().uuid(),
  variantIndex: z.number().int().min(0).max(5),
  planData: z.object({
    unit: z.literal("m"),
    total_w: z.number(),
    total_h: z.number(),
    rooms: z.array(z.object({
      id: z.string(), name: z.string(), x: z.number(), y: z.number(), w: z.number().positive(), h: z.number().positive(),
    })),
    openings: z.array(z.object({
      id: z.string(),
      type: z.enum(["door", "window"]),
      room_id: z.string(),
      wall: z.enum(["N", "S", "E", "W"]),
      offset: z.number(),
      width: z.number().positive(),
    })),
    confirmed: z.boolean().optional(),
  }),
});

export const updatePlan2DData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => UpdateInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: row, error } = await supabase.from("plans").select("*").eq("id", data.planId).single();
    if (error || !row) throw new Error("Plan introuvable");
    const variants = (row.variants as unknown as PlanVariant[]) ?? [];
    const v = variants[data.variantIndex];
    if (!v) throw new Error("Variante introuvable");
    variants[data.variantIndex] = { ...v, plan_2d_data: data.planData as PlanData };
    const { error: updErr } = await supabase
      .from("plans")
      .update({ variants: variants as unknown as never })
      .eq("id", row.id);
    if (updErr) throw new Error(updErr.message);
    return { ok: true };
  });

export const confirm2DPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => VariantRef.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: row, error } = await supabase.from("plans").select("*").eq("id", data.planId).single();
    if (error || !row) throw new Error("Plan introuvable");
    const variants = (row.variants as unknown as PlanVariant[]) ?? [];
    const v = variants[data.variantIndex];
    if (!v?.plan_2d_data) throw new Error("Pas de plan 2D à confirmer");
    variants[data.variantIndex] = {
      ...v,
      plan_2d_data: { ...v.plan_2d_data, confirmed: true },
      plan_3d_ready: true,
    };
    const { error: updErr } = await supabase
      .from("plans")
      .update({ variants: variants as unknown as never })
      .eq("id", row.id);
    if (updErr) throw new Error(updErr.message);
    return { ok: true };
  });

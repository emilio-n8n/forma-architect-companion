import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { checkRateLimit, getRateLimitHeaders } from "./rate-limiter";
import { MiniArchiInputSchema, type MiniArchiInput } from "./mini-archi.types";

// ⭐ SECURITY: Schémas Zod complets pour validation des données

const EnergyClass = z.enum(["A", "B", "C", "D", "E", "F", "G"]);

const RoomSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  x: z.number(),
  y: z.number(),
  w: z.number().positive(),
  h: z.number().positive(),
  floor: z.number().int().min(1).max(6).optional(),
});

const OpeningSchema = z.object({
  id: z.string().min(1).max(100),
  type: z.enum(["door", "window"]),
  room_id: z.string().min(1).max(100),
  wall: z.enum(["N", "S", "E", "W"]),
  offset: z.number(),
  width: z.number().positive(),
});

const FurnitureSchema = z.object({
  id: z.string().min(1).max(100),
  type: z.enum(["table", "chaise", "lit", "canape", "armoire", "bureau", "etagere", "cuisine", "table_salon", "commode", "chevet"]),
  piece_id: z.string().min(1).max(100),
  x: z.number(),
  z: z.number(),
  w: z.number().positive(),
  d: z.number().positive(),
  h: z.number().positive(),
  rotation: z.number().min(0).max(360),
  couleur: z.string().min(1).max(50),
});

const TreeSchema = z.object({
  id: z.string().min(1).max(100),
  type: z.enum(["feuillu", "conifere", "fruitier", "palmier"]),
  x: z.number(),
  z: z.number(),
  hauteur: z.number().positive(),
  diametre_couronne: z.number().positive(),
});

const RoofSchema = z.object({
  type: z.enum(["plat", "pentu", "croupe", "appentis", "papillon"]),
  pente: z.number().optional(),
  debord: z.number(),
  couleur: z.string().min(1).max(50),
});

const ParcelSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  adresse: z.string().min(1).max(500),
  contour: z.array(z.object({ x: z.number(), z: z.number() })).max(50),
  surface_parcelle: z.number().positive(),
});

const PlanDataSchema = z.object({
  unit: z.literal("m"),
  total_w: z.number().positive(),
  total_h: z.number().positive(),
  rooms: z.array(RoomSchema).max(50),
  openings: z.array(OpeningSchema).max(100),
  confirmed: z.boolean().optional(),
  enhanced: z.boolean().optional(),
  roof: RoofSchema.optional(),
  wallColors: z.record(z.string().min(1).max(20), z.string().min(1).max(50)).optional(),
  furniture: z.array(FurnitureSchema).max(100).optional(),
  landscaping: z.object({
    arbres: z.array(TreeSchema).max(20),
  }).optional(),
  parcel: ParcelSchema.optional(),
});

// Schéma pour PlanVariant avec validation complète
const PlanVariantSchema = z.object({
  name: z.string().min(1).max(200),
  concept: z.string().min(1).max(500),
  features: z.array(z.string().min(1).max(200)).max(10),
  estimated_cost_eur: z.number().int().positive().max(10000000),
  energy_class: EnergyClass,
  pros: z.array(z.string().min(1).max(200)).max(10),
  plan_2d_data: PlanDataSchema.optional().nullable(),
  plan_3d_ready: z.boolean().optional(),
});

// ⭐ Schema for the full questionnaire input (Phase 1)
const GenerateInput = MiniArchiInputSchema;

// Legacy Input kept for backward compat with existing client code
const LegacyInput = z.object({
  surface: z.number().int().min(20).max(2000),
  bedrooms: z.number().int().min(1).max(20),
  levels: z.number().int().min(1).max(6),
  budget: z.enum(["Économique", "Moyen de gamme", "Haut de gamme"]),
});

export type Room = { id: string; name: string; x: number; y: number; w: number; h: number; floor?: number };
export type Opening = {
  id: string;
  type: "door" | "window";
  room_id: string;
  wall: "N" | "S" | "E" | "W";
  offset: number; // meters from room's top-left along that wall
  width: number; // meters
};
export type Furniture = {
  id: string;
  type: "table" | "chaise" | "lit" | "canape" | "armoire" | "bureau" | "etagere" | "cuisine" | "table_salon" | "commode" | "chevet";
  piece_id: string;
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  rotation: number;
  couleur: string;
};

export type Tree = {
  id: string;
  type: "feuillu" | "conifere" | "fruitier" | "palmier";
  x: number;
  z: number;
  hauteur: number;
  diametre_couronne: number;
};

export type Roof = {
  type: "plat" | "pentu" | "croupe" | "appentis" | "papillon";
  pente?: number;
  debord: number;
  couleur: string;
};

export type Parcel = {
  lat: number;
  lng: number;
  adresse: string;
  contour: Array<{ x: number; z: number }>;
  surface_parcelle: number;
};

export type PlanData = {
  unit: "m";
  total_w: number;
  total_h: number;
  rooms: Room[];
  openings: Opening[];
  confirmed?: boolean;
  enhanced?: boolean;
  roof?: Roof;
  wallColors?: Record<string, string>;
  furniture?: Furniture[];
  landscaping?: { arbres: Tree[] };
  parcel?: Parcel;
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
  const key = process.env.CEREBRAS_API_KEY;
  if (!key) throw new Error("CEREBRAS_API_KEY missing");
  const res = await fetch("https://api.cerebras.ai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: "gpt-oss-120b",
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    if (res.status === 429) throw new Error("Limite de requêtes atteinte.");
    if (res.status === 402) throw new Error("Crédits IA épuisés.");
    throw new Error("Erreur IA " + res.status + ": " + text.slice(0, 200));
  }
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const text = json.choices?.[0]?.message?.content ?? "{}";
  return JSON.parse(text) as T;
}

export const generatePlans = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => {
    // Format questionnaire (parcel, plu, program, style)
    if (d && typeof d === 'object' && 'parcel' in d) {
      const result = GenerateInput.safeParse(d);
      if (!result.success) {
        const details = result.error.issues.map(i =>
          `${i.path.join('.')}: ${i.message}`
        ).join('; ');
        throw new Error(`Données questionnaire invalides: ${details}`);
      }
      return result.data;
    }
    // Format legacy (surface, bedrooms, levels, budget)
    try {
      return LegacyInput.parse(d) as unknown as MiniArchiInput;
    } catch (e) {
      throw new Error(
        'Format de données inconnu. Envoyez soit { parcel, plu, program, style } (questionnaire) soit { surface, bedrooms, levels, budget } (legacy).'
      );
    }
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    if (!checkRateLimit('GENERATION', userId)) {
      throw new Error('Limite de requêtes atteinte. Veuillez patienter avant de générer de nouveaux plans.');
    }

    // Detect legacy vs full input
    const isLegacy = !("parcel" in data && "program" in data && "plu" in data);
    const programRooms = isLegacy ? [] : (data as MiniArchiInput).program.rooms;
    const plu = isLegacy ? null : (data as MiniArchiInput).plu;
    const parcel = isLegacy ? null : (data as MiniArchiInput).parcel;
    const style = isLegacy ? null : (data as MiniArchiInput).style;

    // Compute values for backward compat
    const totalSurface = isLegacy
      ? (data as any).surface
      : programRooms.reduce((sum, r) => sum + r.min_surface, 0);
    const totalBedrooms = isLegacy
      ? (data as any).bedrooms
      : programRooms.filter((r) => r.name.toLowerCase().startsWith("chambre")).length;
    const maxLevel = isLegacy
      ? (data as any).levels
      : Math.max(1, ...programRooms.map((r) => r.floor ?? 1));
    const budgetValue = isLegacy
      ? (data as any).budget
      : style?.budget ?? "Moyen de gamme";

    let parcelleBlock = "";
    if (parcel) {
      parcelleBlock = `
DONNÉES PARCELLE :
- Adresse : ${parcel.address}
- Surface terrain : ${parcel.surface} m²
- Référence cadastrale : ${parcel.cadastral_ref ?? "N/A"}`;
    }

    let pluBlock = "";
    if (plu) {
      pluBlock = `
CONTRAINTES PLU/URBANISME :
- Hauteur max : ${plu.max_height}m
- Recul limite voisine : ${plu.setback_neighbor}m
- Recul limite rue : ${plu.setback_street}m
- Emprise au sol max : ${plu.max_ground_coverage}%
- Niveaux max : ${plu.max_floors}
${plu.max_shon ? `- SHON max : ${plu.max_shon} m²` : ""}
${plu.roof_type ? `- Type de toit imposé : ${plu.roof_type}` : ""}
${plu.materials ? `- Matériaux imposés : ${plu.materials}` : ""}
${plu.zone ? `- Zone PLU : ${plu.zone}` : ""}
${plu.notes ? `- Autres contraintes : ${plu.notes}` : ""}`;
    }

    let programBlock = "";
    if (programRooms.length > 0) {
      const floorGroups = new Map<number, typeof programRooms>();
      programRooms.forEach((r) => {
        const f = r.floor ?? 1;
        if (!floorGroups.has(f)) floorGroups.set(f, []);
        floorGroups.get(f)!.push(r);
      });
      programBlock = "\nPROGRAMME PIÈCES :";
      for (const [floor, rooms] of floorGroups) {
        programBlock += `\n${floor === 1 ? "RDC" : `Niveau ${floor}`} :`;
        for (const r of rooms) {
          const adj = r.adjacent_to.length > 0 ? ` (adjacent à : ${r.adjacent_to.join(", ")})` : "";
          programBlock += `\n  - ${r.name} : ${r.min_surface}m² min${adj}`;
        }
      }
    }

    let freeBlock = "";
    if (style?.free_notes) {
      freeBlock = `\n\nCONTRAINTES LIBRES DE L'ARCHITECTE :\n${style.free_notes}`;
    }

    let styleBlock = "";
    if (style) {
      styleBlock = `\n- Style architectural : ${style.style}
- Budget cible : ${style.budget}
- Orientation préférée du séjour : ${style.preferred_orientation}`;
    }

    const prompt = `Génère 6 variantes de plans pour une maison/projet sur une parcelle spécifique.${parcelleBlock}${pluBlock}${programBlock}

CONFORMITÉ OBLIGATOIRE :
- RE2020 : isolation renforcée, ventilation naturelle, orientation sud pour pièces de vie
- Accessibilité PMR : portes ≥ 0.9m, espaces de rotation Ø 1.50m, circulation ≥ 1.20m${styleBlock}

Surface totale estimée : ${totalSurface} m²
Nombre de chambres : ${totalBedrooms}
${freeBlock}

IMPORTANT : Les 6 variantes doivent RESPECTER toutes les contraintes PLU ci-dessus (hauteur, reculs, emprise au sol). La surface de plancher de chaque variante ne doit pas dépasser la SHON si spécifiée.

Styles variés (contemporain, traditionnel, minimaliste, bioclimatique, industriel, méditerranéen).

Format JSON strict :
{"variants":[{"name":"string","concept":"string court","features":["string"],"estimated_cost_eur":number,"energy_class":"A|B|C","pros":["string"]}]}

Exactement 6 variantes.`;

    const out = await callJSON<{ variants: PlanVariant[] }>(
      prompt,
      "Tu es un architecte français senior spécialisé en maisons individuelles. Tu respectes scrupuleusement les contraintes PLU et normes RE2020/PMR. Réponds UNIQUEMENT en JSON valide. Prix marché France 2026."
    );
    const variants = (out.variants ?? []).slice(0, 6);

    const validatedVariants = variants.map((v) => PlanVariantSchema.parse(v));

    const { data: row, error } = await supabase
      .from("plans")
      .insert({
        user_id: userId,
        surface: totalSurface,
        bedrooms: totalBedrooms,
        levels: maxLevel,
        budget: budgetValue,
        variants: validatedVariants,
        input_data: isLegacy ? null : data,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id, variants };
  });

export const listPlans = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    // ⭐ SECURITY: Toujours filtrer par user_id (Broken Access Control fix)
    const { data, error } = await supabase
      .from("plans")
      .select("*")
      .eq("user_id", userId)
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
    const { supabase, userId } = context;
    // ⭐ SECURITY: Vérifier que le plan appartient à l'utilisateur
    const { data: row, error } = await supabase.from("plans").select("*").eq("id", data.planId).eq("user_id", userId).single();
    if (error || !row) throw new Error("Plan introuvable ou accès refusé");
    const variants = (row.variants as unknown as PlanVariant[]) ?? [];
    const v = variants[data.variantIndex];
    if (!v) throw new Error("Variante introuvable");

    const numLevels = row.levels ?? 1;
    const prompt = `Génère un plan 2D architectural EXPORTABLE pour:
- ${v.name} — ${v.concept}
- Surface: ${row.surface} m², ${row.bedrooms} chambres, ${numLevels} niveau(x)
- Caractéristiques: ${(v.features ?? []).join(", ")}

Ce bâtiment a ${numLevels} niveau(x). Génère les pièces pour CHAQUE niveau avec le champ "floor" (1 = RDC, 2 = 1er étage, etc.).

Répartition des pièces par niveau:
${numLevels === 1 ? "- Niveau 1 (RDC) : toutes les pièces" : numLevels === 2 ? "- Niveau 1 (RDC) : entrée, séjour, cuisine, WC, cellier\n- Niveau 2 (1er étage) : ${row.bedrooms} chambre(s), salle(s) de bain, dressing, dégagement" : `- Niveau 1 (RDC) : entrée, séjour, cuisine, WC\n- Niveau 2 : ${Math.ceil(row.bedrooms / 2)} chambre(s), salle de bain\n- Niveau 3 : ${Math.floor(row.bedrooms / 2)} chambre(s), salle de bain, buanderie`}

Représente chaque niveau comme des PIÈCES RECTANGULAIRES adjacentes (coordonnées en mètres, origine en haut-gauche, axe Y vers le bas).

Contraintes:
- Toutes les coordonnées et dimensions en mètres.
- Les pièces d'un MÊME niveau NE doivent PAS se chevaucher.
- Chaque pièce a un champ "floor" (1 pour RDC, 2 pour 1er étage, etc.).
- total_w et total_h = bounding box du plus grand niveau (utilise les mêmes dimensions pour tous les niveaux).
- Respecter accessibilité PMR (largeurs ≥ 0.9m pour portes).
- Somme des surfaces de TOUS les niveaux ≈ ${row.surface} m² (±10%).

Pour chaque ouverture (porte/fenêtre):
- room_id = id de la pièce
- wall = "N" (haut), "S" (bas), "E" (droite), "W" (gauche)
- offset = distance en mètres depuis le coin haut-gauche de la pièce le long du mur
- width = largeur ouverture en mètres

Format JSON strict:
{"unit":"m","total_w":number,"total_h":number,"rooms":[{"id":"r1","name":"Séjour","x":0,"y":0,"w":5.2,"h":4.8,"floor":1}],"openings":[{"id":"o1","type":"door","room_id":"r1","wall":"S","offset":2.0,"width":0.9}]}`;

    const planData = await callJSON<PlanData>(
      prompt,
      "Tu es un architecte DPLG. Tu produis des plans 2D précis et conformes RE2020/PMR. Réponds UNIQUEMENT en JSON valide, sans markdown."
    );
    planData.unit = "m";
    planData.confirmed = false;

    // ⭐ SECURITY: Valider le variant avant mise à jour
    const validatedPlanData = PlanDataSchema.parse(planData);
    variants[data.variantIndex] = { ...v, plan_2d_data: validatedPlanData, plan_3d_ready: false };
    const validatedVariants = variants.map((v) => PlanVariantSchema.parse(v));
    
    const { error: updErr } = await supabase
      .from("plans")
      .update({ variants: validatedVariants })
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
      id: z.string(), name: z.string(), x: z.number(), y: z.number(), w: z.number().positive(), h: z.number().positive(), floor: z.number().int().min(1).optional(),
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
    enhanced: z.boolean().optional(),
    roof: z.object({
      type: z.enum(["plat", "pentu", "croupe", "appentis", "papillon"]),
      pente: z.number().optional(),
      debord: z.number(),
      couleur: z.string(),
    }).optional(),
    wallColors: z.record(z.string(), z.string()).optional(),
    furniture: z.array(z.object({
      id: z.string(),
      type: z.enum(["table", "chaise", "lit", "canape", "armoire", "bureau", "etagere", "cuisine", "table_salon", "commode", "chevet"]),
      piece_id: z.string(),
      x: z.number(), z: z.number(),
      w: z.number(), d: z.number(), h: z.number(),
      rotation: z.number(),
      couleur: z.string(),
    })).optional(),
    landscaping: z.object({
      arbres: z.array(z.object({
        id: z.string(),
        type: z.enum(["feuillu", "conifere", "fruitier", "palmier"]),
        x: z.number(), z: z.number(),
        hauteur: z.number(),
        diametre_couronne: z.number(),
      })),
    }).optional(),
    parcel: z.object({
      lat: z.number(), lng: z.number(),
      adresse: z.string(),
      contour: z.array(z.object({ x: z.number(), z: z.number() })),
      surface_parcelle: z.number(),
    }).optional(),
  }),
});

export const enhancePlanWithAI = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => VariantRef.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // ⭐ SECURITY: Vérifier que le plan appartient à l'utilisateur
    const { data: row, error } = await supabase.from("plans").select("*").eq("id", data.planId).eq("user_id", userId).single();
    if (error || !row) throw new Error("Plan introuvable ou accès refusé");
    const variants = (row.variants as unknown as PlanVariant[]) ?? [];
    const v = variants[data.variantIndex];
    if (!v?.plan_2d_data) throw new Error("Pas de plan 2D à enrichir");

    const current = v.plan_2d_data;
    const numLevels = new Set(current.rooms.map((r) => r.floor ?? 1)).size;
    const prompt = `Tu es un architecte DPLG expert RE2020/PMR/PLU. Améliore ce plan 2D.

Plan actuel (${numLevels} niveau(x)):
${JSON.stringify(current)}

Règles à appliquer:
1. **RE2020** — surfaces minimales (Séjour ≥ 20m², chambres ≥ 9m²), orientation sud pour pièces de vie, isolation renforcée (murs ext. 30cm), ventilation naturelle traversante.
2. **Accessibilité PMR** — portes ≥ 0.9m, espaces de rotation Ø 1.50m dans chaque pièce, seuils 0, circulation ≥ 1.20m.
3. **PLU** — recul 3m limites, hauteur sous plafond 2.6m, stationnement 1 place/60m².
4. **Optimisation** — fenêtres positionnées pour éclairage naturel max, ajout zones techniques (cellier, buanderie) si place.
5. **Multi-niveaux** — chaque pièce conserve son champ "floor". Conserve la répartition des pièces par niveau.

Retourne UNIQUEMENT le JSON du plan amélioré (même structure, champs "enhanced": true).`;

    const enhanced = await callJSON<PlanData>(
      prompt,
      "Tu es un architecte DPLG expert RE2020/PMR/PLU. Réponds UNIQUEMENT en JSON valide, sans markdown."
    );
    enhanced.unit = "m";
    enhanced.confirmed = current.confirmed;
    enhanced.enhanced = true;

    // ⭐ SECURITY: Valider le variant avant mise à jour
    const validatedEnhanced = PlanDataSchema.parse(enhanced);
    variants[data.variantIndex] = { ...v, plan_2d_data: validatedEnhanced, plan_3d_ready: false };
    const validatedVariants = variants.map((v) => PlanVariantSchema.parse(v));
    
    const { error: updErr } = await supabase
      .from("plans")
      .update({ variants: validatedVariants })
      .eq("id", row.id);
    if (updErr) throw new Error(updErr.message);
    return { planData: enhanced, variantIndex: data.variantIndex };
  });

const EditWithAIInput = z.object({
  planId: z.string().uuid(),
  variantIndex: z.number().int().min(0).max(5),
  instruction: z.string().min(1).max(500),
});

export const editPlanWithAI = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => EditWithAIInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // ⭐ SECURITY: Vérifier que le plan appartient à l'utilisateur
    const { data: row, error } = await supabase.from("plans").select("*").eq("id", data.planId).eq("user_id", userId).single();
    if (error || !row) throw new Error("Plan introuvable ou accès refusé");
    const variants = (row.variants as unknown as PlanVariant[]) ?? [];
    const v = variants[data.variantIndex];
    if (!v?.plan_2d_data) throw new Error("Pas de plan 2D à modifier");

    const current = v.plan_2d_data;
    const prompt = `Tu es un architecte DPLG. Modifie ce plan 2D selon l'instruction donnée.

Plan actuel:
${JSON.stringify(current)}

Instruction: "${data.instruction}"

Règles:
- Modifie uniquement ce qui est demandé.
- Conserve la structure générale (floor, unit, etc.).
- Ajuste total_w / total_h si nécessaire.
- Ne crée pas de chevauchements entre pièces.
- Conserve les champs "floor" existants sur chaque pièce.

Retourne UNIQUEMENT le JSON du plan modifié (même structure).`;

    const edited = await callJSON<PlanData>(
      prompt,
      "Tu es un architecte DPLG. Réponds UNIQUEMENT en JSON valide, sans markdown."
    );
    edited.unit = "m";
    edited.confirmed = current.confirmed;
    edited.enhanced = current.enhanced;

    // ⭐ SECURITY: Valider le variant avant mise à jour
    const validatedEdited = PlanDataSchema.parse(edited);
    variants[data.variantIndex] = { ...v, plan_2d_data: validatedEdited, plan_3d_ready: false };
    const validatedVariants = variants.map((v) => PlanVariantSchema.parse(v));
    
    const { error: updErr } = await supabase
      .from("plans")
      .update({ variants: validatedVariants })
      .eq("id", row.id);
    if (updErr) throw new Error(updErr.message);
    return { planData: edited, variantIndex: data.variantIndex };
  });

export const updatePlan2DData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => UpdateInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // ⭐ SECURITY: Vérifier que le plan appartient à l'utilisateur
    const { data: row, error } = await supabase.from("plans").select("*").eq("id", data.planId).eq("user_id", userId).single();
    if (error || !row) throw new Error("Plan introuvable ou accès refusé");
    const variants = (row.variants as unknown as PlanVariant[]) ?? [];
    const v = variants[data.variantIndex];
    if (!v) throw new Error("Variante introuvable");
    // ⭐ SECURITY: Valider le planData avant mise à jour
    const validatedPlanData = PlanDataSchema.parse(data.planData);
    variants[data.variantIndex] = { ...v, plan_2d_data: validatedPlanData };
    const validatedVariants = variants.map((v) => PlanVariantSchema.parse(v));
    
    const { error: updErr } = await supabase
      .from("plans")
      .update({ variants: validatedVariants })
      .eq("id", row.id);
    if (updErr) throw new Error(updErr.message);
    return { ok: true };
  });

export const confirm2DPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => VariantRef.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // ⭐ SECURITY: Vérifier que le plan appartient à l'utilisateur
    const { data: row, error } = await supabase.from("plans").select("*").eq("id", data.planId).eq("user_id", userId).single();
    if (error || !row) throw new Error("Plan introuvable ou accès refusé");
    const variants = (row.variants as unknown as PlanVariant[]) ?? [];
    const v = variants[data.variantIndex];
    if (!v?.plan_2d_data) throw new Error("Pas de plan 2D à confirmer");
    variants[data.variantIndex] = {
      ...v,
      plan_2d_data: { ...v.plan_2d_data, confirmed: true },
      plan_3d_ready: true,
    };
    // ⭐ SECURITY: Valider tous les variants avant mise à jour
    const validatedVariants = variants.map((v) => PlanVariantSchema.parse(v));
    
    const { error: updErr } = await supabase
      .from("plans")
      .update({ variants: validatedVariants })
      .eq("id", row.id);
    if (updErr) throw new Error(updErr.message);
    return { ok: true };
  });

export const generateFurniture = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => VariantRef.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // ⭐ SECURITY: Vérifier que le plan appartient à l'utilisateur
    const { data: row, error } = await supabase.from("plans").select("*").eq("id", data.planId).eq("user_id", userId).single();
    if (error || !row) throw new Error("Plan introuvable ou accès refusé");
    const variants = (row.variants as unknown as PlanVariant[]) ?? [];
    const v = variants[data.variantIndex];
    if (!v?.plan_2d_data) throw new Error("Pas de plan 2D");
    const plan = v.plan_2d_data;

    const prompt = `Place les meubles standards dans ce plan architectural.

Plan: ${plan.total_w}m x ${plan.total_h}m
Pièces:
${plan.rooms.map((r) => `- ${r.name} (${r.w}m x ${r.h}m) au sol (x:${r.x}, y:${r.y})`).join("\n")}

Pour chaque pièce, génère les meubles adaptés à sa fonction (table, chaises, lit, canapé, armoire, cuisine équipée, bureau, étagères, etc.).

Règles:
- Coordonnées (x,z) relatives au plan global, z = y du plan 2D
- Rotation en degrés (0/90/180/270)
- Couleur en hexadécimal (#xxx)
- Les meubles NE doivent PAS se chevaucher entre eux ni sortir des murs
- Laisse un espace de circulation d'au moins 0.6m autour de chaque meuble
- Place les meubles de manière réaliste (lit contre un mur, table au centre, etc.)

Format JSON strict:
{"furniture":[{"id":"f1","type":"table","piece_id":"r1","x":2.5,"z":1.5,"w":1.8,"d":0.9,"h":0.75,"rotation":0,"couleur":"#8B7355"}]}`;

    const out = await callJSON<{ furniture: Furniture[] }>(
      prompt,
      "Tu es un architecte d'intérieur. Génère un agencement réaliste de meubles standards français. Réponds UNIQUEMENT en JSON valide."
    );

    const updated = { ...plan, furniture: out.furniture ?? [] };
    // ⭐ SECURITY: Valider le plan avant mise à jour
    const validatedUpdated = PlanDataSchema.parse(updated);
    variants[data.variantIndex] = { ...v, plan_2d_data: validatedUpdated };
    const validatedVariants = variants.map((v) => PlanVariantSchema.parse(v));
    
    const { error: updErr } = await supabase
      .from("plans")
      .update({ variants: validatedVariants })
      .eq("id", row.id);
    if (updErr) throw new Error(updErr.message);
    return { planData: updated, variantIndex: data.variantIndex };
  });

export const generateRoof = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => VariantRef.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // ⭐ SECURITY: Vérifier que le plan appartient à l'utilisateur
    const { data: row, error } = await supabase.from("plans").select("*").eq("id", data.planId).eq("user_id", userId).single();
    if (error || !row) throw new Error("Plan introuvable ou accès refusé");
    const variants = (row.variants as unknown as PlanVariant[]) ?? [];
    const v = variants[data.variantIndex];
    if (!v?.plan_2d_data) throw new Error("Pas de plan 2D");
    const plan = v.plan_2d_data;

    const nbLevels = new Set(plan.rooms.map((r) => r.floor ?? 1)).size;
    const surface = plan.total_w * plan.total_h;
    const prompt = `Suggère un toit pour ce bâtiment.

Dimensions: ${plan.total_w}m x ${plan.total_h}m
Surface au sol: ${Math.round(surface)}m²
Nombre de niveaux: ${nbLevels}
Style architectural: ${v.name} — ${v.concept}
Caractéristiques: ${(v.features ?? []).join(", ")}

Choisis le type de toit le plus adapté:
- "plat" : toit-terrasse, moderne, faible coût
- "pentu" : toit en pente (2 pans), classique, bon écoulement
- "croupe" : 4 pans, élégant, régions venteuses
- "appentis" : 1 seul pan, contemporain, extension
- "papillon" : 2 pans inversés, design audacieux

Format JSON strict:
{"type":"pentu","pente":35,"debord":0.5,"couleur":"#4A4A4A"}`;

    const roof = await callJSON<Roof>(
      prompt,
      "Tu es un architecte expert en toitures. Choisis le type et les dimensions adaptés. Réponds UNIQUEMENT en JSON valide."
    );

    // ⭐ SECURITY: Valider le roof et le plan avant mise à jour
    const validatedRoof = RoofSchema.parse(roof);
    const updated = { ...plan, roof: validatedRoof };
    const validatedUpdated = PlanDataSchema.parse(updated);
    variants[data.variantIndex] = { ...v, plan_2d_data: validatedUpdated };
    const validatedVariants = variants.map((v) => PlanVariantSchema.parse(v));
    
    const { error: updErr } = await supabase
      .from("plans")
      .update({ variants: validatedVariants })
      .eq("id", row.id);
    if (updErr) throw new Error(updErr.message);
    return { planData: updated, variantIndex: data.variantIndex };
  });

export const generateLandscaping = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => VariantRef.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // ⭐ SECURITY: Vérifier que le plan appartient à l'utilisateur
    const { data: row, error } = await supabase.from("plans").select("*").eq("id", data.planId).eq("user_id", userId).single();
    if (error || !row) throw new Error("Plan introuvable ou accès refusé");
    const variants = (row.variants as unknown as PlanVariant[]) ?? [];
    const v = variants[data.variantIndex];
    if (!v?.plan_2d_data) throw new Error("Pas de plan 2D");
    const plan = v.plan_2d_data;

    const prompt = `Place des arbres autour de ce bâtiment pour un projet paysager.

Plan: ${plan.total_w}m x ${plan.total_h}m
Pièces avec leurs orientations:
${plan.rooms.map((r) => {
  const walls = ["N", "S", "E", "W"].filter((w) =>
    plan.openings.some((o) => o.room_id === r.id && o.wall === w)
  );
  return `- ${r.name}: fenêtres côté ${walls.join("/") || "aucune"}`;
}).join("\n")}

Place 4 à 8 arbres autour du bâtiment (NE PAS mettre à l'intérieur).
Règles d'orientation:
- Côté Sud : feuillus (ombre en été, soleil en hiver)
- Côté Nord : conifères (coupe-vent)
- Côté Est/Ouest : arbres fruitiers ou décoratifs
- Espacement minimum 2m des murs
- Coordonnées (x,z) en mètres, z = y du plan 2D

Format JSON strict:
{"arbres":[{"id":"t1","type":"feuillu","x":-2,"z":5,"hauteur":8,"diametre_couronne":5}]}`;

    const out = await callJSON<{ arbres: Tree[] }>(
      prompt,
      "Tu es un paysagiste. Place les arbres de manière réaliste autour du bâtiment. Réponds UNIQUEMENT en JSON valide."
    );

    const updated = { ...plan, landscaping: { arbres: out.arbres ?? [] } };
    // ⭐ SECURITY: Valider le plan avant mise à jour
    const validatedUpdated = PlanDataSchema.parse(updated);
    variants[data.variantIndex] = { ...v, plan_2d_data: validatedUpdated };
    const validatedVariants = variants.map((v) => PlanVariantSchema.parse(v));
    
    const { error: updErr } = await supabase
      .from("plans")
      .update({ variants: validatedVariants })
      .eq("id", row.id);
    if (updErr) throw new Error(updErr.message);
    return { planData: updated, variantIndex: data.variantIndex };
  });

export const suggestColorPalette = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => VariantRef.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // ⭐ SECURITY: Vérifier que le plan appartient à l'utilisateur
    const { data: row, error } = await supabase.from("plans").select("*").eq("id", data.planId).eq("user_id", userId).single();
    if (error || !row) throw new Error("Plan introuvable ou accès refusé");
    const variants = (row.variants as unknown as PlanVariant[]) ?? [];
    const v = variants[data.variantIndex];
    if (!v?.plan_2d_data) throw new Error("Pas de plan 2D");
    const plan = v.plan_2d_data;

    const prompt = `Suggère une palette de couleurs pour les murs de chaque pièce.

Style: ${v.name} — ${v.concept}
Pièces:
${plan.rooms.map((r) => `- ${r.name} (${r.w}x${r.h}m)`).join("\n")}

Règles:
- Palette harmonieuse et cohérente
- Couleurs hexadécimales adaptées à la fonction de chaque pièce
- Séjour: tons chauds et accueillants
- Chambres: tons apaisants
- Cuisine/SDB: tons clairs et lumineux
- Murs extérieurs: un seul ton pour tout le bâtiment (clé "exterieur")

Format JSON strict:
{"colors":{"sejour":"#F5E6D3","chambre":"#E8F0E8","exterieur":"#E8DCC8","..."}}`;

    const out = await callJSON<{ colors: Record<string, string> }>(
      prompt,
      "Tu es un architecte d'intérieur spécialisé en palettes de couleurs. Réponds UNIQUEMENT en JSON valide."
    );

    const updated = { ...plan, wallColors: out.colors };
    // ⭐ SECURITY: Valider le plan avant mise à jour
    const validatedUpdated = PlanDataSchema.parse(updated);
    variants[data.variantIndex] = { ...v, plan_2d_data: validatedUpdated };
    const validatedVariants = variants.map((v) => PlanVariantSchema.parse(v));
    
    const { error: updErr } = await supabase
      .from("plans")
      .update({ variants: validatedVariants })
      .eq("id", row.id);
    if (updErr) throw new Error(updErr.message);
    return { planData: updated, variantIndex: data.variantIndex };
  });

import { z } from "zod";

export const RoomDefSchema = z.object({
  name: z.string().min(1).max(100),
  min_surface: z.number().positive().max(500),
  floor: z.number().int().min(1).max(6).nullable(),
  adjacent_to: z.array(z.string().min(1).max(100)).max(10),
});

export type RoomDef = z.infer<typeof RoomDefSchema>;

export const ParcelInfoSchema = z.object({
  address: z.string().min(1).max(500),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  geojson: z.any().optional(),
  surface: z.number().positive(),
  cadastral_ref: z.string().max(100).optional(),
});

export type ParcelInfo = z.infer<typeof ParcelInfoSchema>;

export const PLUConstraintsSchema = z.object({
  max_height: z.number().positive().max(100),
  setback_neighbor: z.number().min(0).max(50),
  setback_street: z.number().min(0).max(50),
  max_ground_coverage: z.number().min(1).max(100),
  max_shon: z.number().positive().max(10000).optional(),
  max_floors: z.number().int().min(1).max(10),
  roof_type: z.string().max(200).optional(),
  materials: z.string().max(500).optional(),
  zone: z.string().max(50).optional(),
  notes: z.string().max(3000).default(""),
});

export type PLUConstraints = z.infer<typeof PLUConstraintsSchema>;

export const StylePrefsSchema = z.object({
  style: z.enum(["Contemporain", "Traditionnel", "Bioclimatique", "Minimaliste", "Industriel", "Méditerranéen", "Rustique"]),
  budget: z.enum(["Économique", "Moyen de gamme", "Haut de gamme"]),
  preferred_orientation: z.enum(["N", "S", "E", "O", "Indifférent"]),
  free_notes: z.string().max(5000).default(""),
});

export type StylePrefs = z.infer<typeof StylePrefsSchema>;

export const MiniArchiInputSchema = z.object({
  parcel: ParcelInfoSchema,
  plu: PLUConstraintsSchema,
  program: z.object({
    rooms: z.array(RoomDefSchema).min(1).max(30),
  }),
  style: StylePrefsSchema,
});

export type MiniArchiInput = z.infer<typeof MiniArchiInputSchema>;

export const DEFAULT_PLU: PLUConstraints = {
  max_height: 9,
  setback_neighbor: 3,
  setback_street: 5,
  max_ground_coverage: 35,
  max_shon: undefined,
  max_floors: 2,
  roof_type: "",
  materials: "",
  zone: "",
  notes: "",
};

export function defaultProgram(totalSurface: number, bedrooms: number, levels: number): RoomDef[] {
  const rooms: RoomDef[] = [];
  const rdc = levels >= 1 ? 1 : null;
  const etage = levels >= 2 ? 2 : null;

  rooms.push({ name: "Entrée", min_surface: 6, floor: rdc, adjacent_to: ["Séjour"] });
  rooms.push({ name: "Séjour", min_surface: Math.round(totalSurface * 0.2), floor: rdc, adjacent_to: ["Cuisine", "Entrée"] });
  rooms.push({ name: "Cuisine", min_surface: Math.round(totalSurface * 0.1), floor: rdc, adjacent_to: ["Séjour"] });
  rooms.push({ name: "WC", min_surface: 2, floor: rdc, adjacent_to: [] });

  for (let i = 1; i <= bedrooms; i++) {
    const label = i === 1 && bedrooms > 1 ? "Chambre parentale" : `Chambre ${i}`;
    rooms.push({
      name: label,
      min_surface: i === 1 ? 14 : 11,
      floor: etage ?? rdc,
      adjacent_to: etage ? ["Dégagement"] : ["Séjour"],
    });
  }

  if (bedrooms > 1 && etage) {
    rooms.push({ name: "Salle de bain", min_surface: 6, floor: etage, adjacent_to: ["Dégagement"] });
    rooms.push({ name: "Dégagement", min_surface: 4, floor: etage, adjacent_to: [] });
  } else if (bedrooms >= 1) {
    rooms.push({ name: "Salle de bain", min_surface: 5, floor: rdc, adjacent_to: [] });
  }

  return rooms;
}

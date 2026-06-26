import { describe, it, expect } from "vitest";
import { MiniArchiInputSchema } from "@/lib/mini-archi.types";
import { DreamingInputSchema } from "@/lib/dreaming.types";

describe("MiniArchiInputSchema", () => {
  const validInput = {
    parcel: {
      address: "123 Rue de Paris",
      lat: 48.8566,
      lng: 2.3522,
      surface: 500,
      cadastral_ref: "ABC123",
    },
    plu: {
      max_height: 12,
      setback_neighbor: 3,
      setback_street: 5,
      max_ground_coverage: 40,
      max_shon: 200,
      max_floors: 3,
      roof_type: "Toit plat",
      materials: "Bois, verre",
      zone: "UB",
    },
    program: {
      rooms: [
        { name: "Séjour", min_surface: 30, floor: 1, adjacent_to: ["Cuisine"] },
        { name: "Cuisine", min_surface: 15, floor: 1, adjacent_to: ["Séjour"] },
      ],
    },
    style: {
      style: "Contemporain",
      budget: "Moyen de gamme",
      preferred_orientation: "S",
    },
  } as const;

  it("validates a correct input", () => {
    const result = MiniArchiInputSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("rejects missing required fields", () => {
    const result = MiniArchiInputSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects invalid parcel coordinates", () => {
    const result = MiniArchiInputSchema.safeParse({
      ...validInput,
      parcel: { ...validInput.parcel, lat: 200 },
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative surface", () => {
    const result = MiniArchiInputSchema.safeParse({
      ...validInput,
      parcel: { ...validInput.parcel, surface: -10 },
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty rooms array", () => {
    const result = MiniArchiInputSchema.safeParse({
      ...validInput,
      program: { rooms: [] },
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid style enum value", () => {
    const result = MiniArchiInputSchema.safeParse({
      ...validInput,
      style: { ...validInput.style, style: "Gothique" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects rooms exceeding max rooms limit", () => {
    const rooms = Array.from({ length: 31 }, (_, i) => ({
      name: `Room ${i + 1}`,
      min_surface: 10,
      floor: 1,
      adjacent_to: [],
    }));
    const result = MiniArchiInputSchema.safeParse({
      ...validInput,
      program: { rooms },
    });
    expect(result.success).toBe(false);
  });
});

describe("DreamingInputSchema", () => {
  it("accepts empty input", () => {
    const result = DreamingInputSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts a valid conversationId", () => {
    const result = DreamingInputSchema.safeParse({
      conversationId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid UUID", () => {
    const result = DreamingInputSchema.safeParse({
      conversationId: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });
});

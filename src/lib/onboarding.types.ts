import { z } from "zod";

export const OnboardingDataSchema = z.object({
  // 1. Person
  first_name: z.string().max(100).optional().default(""),
  last_name: z.string().max(100).optional().default(""),
  role: z.string().max(200).optional().default(""),
  phone: z.string().max(50).optional().default(""),

  // 2. Agency
  agency_name: z.string().max(200).optional().default(""),
  agency_address: z.string().max(500).optional().default(""),
  agency_website: z.string().max(500).optional().default(""),
  agency_size: z.string().max(50).optional().default(""),
  agency_year: z.string().max(10).optional().default(""),

  // 3. Communication
  email_signature: z.string().max(1000).optional().default(""),
  politeness_formula: z.string().max(200).optional().default("Bien cordialement"),
  comm_style: z.enum(["formel", "direct", "amical"]).optional().default("formel"),
  email_example: z.string().max(3000).optional().default(""),

  // 4. Specialties
  specialties: z.array(z.string().max(100)).max(10).optional().default([]),

  // 5. Habits
  work_hours: z.string().max(200).optional().default(""),
  preferred_days: z.string().max(200).optional().default(""),
  response_time: z.string().max(100).optional().default(""),
  urgency_handling: z.string().max(500).optional().default(""),

  // 6. Knowledge
  software: z.array(z.string().max(100)).max(20).optional().default([]),
  references: z.string().max(1000).optional().default(""),
  approach: z.string().max(500).optional().default(""),
});

export type OnboardingData = z.infer<typeof OnboardingDataSchema>;

export type OnboardingLevel = "full" | "quick";

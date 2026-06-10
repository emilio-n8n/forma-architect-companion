import { z } from "zod";
import { MemoryCategorySchema, MemoryLevelSchema } from "./memory.types";

export const DreamingInputSchema = z.object({
  conversationId: z.string().uuid().optional(),
});

export const DreamSynthesisResultSchema = z.object({
  new_memories: z.array(z.object({
    content: z.string().min(1).max(500),
    level: MemoryLevelSchema,
    category: MemoryCategorySchema,
    freshness_score: z.number().min(0).max(1).default(0.8),
  })),
  updates: z.array(z.object({
    memory_id: z.string(),
    content: z.string().optional(),
    freshness_score: z.number().min(0).max(1).optional(),
  })),
  deactivate_ids: z.array(z.string()),
  summaries: z.array(z.object({
    category: MemoryCategorySchema,
    summary: z.string().min(1).max(2000),
  })),
});

export type DreamSynthesisResult = z.infer<typeof DreamSynthesisResultSchema>;

export const MemorySummarySchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  category: MemoryCategorySchema,
  summary: z.string().min(1).max(2000),
  created_at: z.string(),
  updated_at: z.string(),
});

export type MemorySummary = z.infer<typeof MemorySummarySchema>;

export const MemorySummaryCategoryLabels: Record<string, string> = {
  preferences: "Préférences",
  projects: "Projets",
  work_style: "Méthode de travail",
  constraints: "Contraintes",
  general: "Général",
};

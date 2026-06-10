import { z } from "zod";

export const MemoryLevelSchema = z.enum(["project", "personal", "studio"]);
export type MemoryLevel = z.infer<typeof MemoryLevelSchema>;

export const MemoryCategorySchema = z.enum(["preferences", "projects", "work_style", "constraints", "general"]);
export type MemoryCategory = z.infer<typeof MemoryCategorySchema>;

export const MemorySchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  studio_id: z.string().uuid().nullable(),
  project_id: z.string().uuid().nullable(),
  level: MemoryLevelSchema,
  content: z.string().min(1).max(10000),
  category: MemoryCategorySchema.nullable(),
  freshness_score: z.number().min(0).max(1),
  last_accessed: z.string().nullable(),
  is_active: z.boolean(),
  source_conversation_id: z.string().uuid().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Memory = z.infer<typeof MemorySchema>;

export const CreateMemorySchema = z.object({
  content: z.string().min(1).max(10000),
  level: MemoryLevelSchema,
  category: MemoryCategorySchema.optional(),
  project_id: z.string().uuid().nullable().optional(),
  freshness_score: z.number().min(0).max(1).optional(),
  source_conversation_id: z.string().uuid().nullable().optional(),
});

export type CreateMemoryInput = z.infer<typeof CreateMemorySchema>;

import { z } from "zod";

export const MemoryLevelSchema = z.enum(["project", "personal", "studio"]);
export type MemoryLevel = z.infer<typeof MemoryLevelSchema>;

export const MemorySchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  studio_id: z.string().uuid().nullable(),
  project_id: z.string().uuid().nullable(),
  level: MemoryLevelSchema,
  content: z.string().min(1).max(10000),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Memory = z.infer<typeof MemorySchema>;

export const CreateMemorySchema = z.object({
  content: z.string().min(1).max(10000),
  level: MemoryLevelSchema,
  project_id: z.string().uuid().nullable().optional(),
});

export type CreateMemoryInput = z.infer<typeof CreateMemorySchema>;

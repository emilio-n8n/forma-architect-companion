import { z } from "zod";

export const StudioSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200),
  created_by: z.string().uuid(),
  created_at: z.string(),
});

export type Studio = z.infer<typeof StudioSchema>;

export const StudioMemberSchema = z.object({
  id: z.string().uuid(),
  studio_id: z.string().uuid(),
  user_id: z.string().uuid(),
  role: z.enum(["admin", "member"]),
  joined_at: z.string(),
});

export type StudioMember = z.infer<typeof StudioMemberSchema>;

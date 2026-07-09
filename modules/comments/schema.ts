import { z } from "zod";

export const createCommentSchema = z.object({
  setupId: z.string().cuid(),
  body: z.string().min(1, "Comment cannot be empty").max(2000, "Comment too long"),
  parentId: z.string().cuid().optional(),
});

export const updateCommentSchema = z.object({
  body: z.string().min(1, "Comment cannot be empty").max(2000, "Comment too long"),
});

export const listCommentsSchema = z.object({
  setupId: z.string().cuid(),
  cursor: z.string().cuid().optional(),
  limit: z.number().min(1).max(50).default(20),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;
export type ListCommentsInput = z.infer<typeof listCommentsSchema>;
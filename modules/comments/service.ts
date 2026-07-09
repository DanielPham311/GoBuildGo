import { prisma } from "@/shared/db";
import type { CreateCommentInput, UpdateCommentInput, ListCommentsInput } from "./schema";

export class CommentError extends Error {
  constructor(
    public code: "NOT_FOUND" | "FORBIDDEN" | "SETUP_NOT_FOUND",
    message: string,
  ) {
    super(message);
    this.name = "CommentError";
  }
}

/** Get setup with comment count */
export async function getSetupWithComments(setupId: string) {
  const setup = await prisma.setup.findUnique({
    where: { id: setupId },
    select: {
      id: true,
      name: true,
      slug: true,
      isPublic: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { comments: true } },
    },
  });
  if (!setup) throw new CommentError("SETUP_NOT_FOUND", "Setup not found");
  return setup;
}

/** List comments for a setup (flat, top-level only) */
export async function listComments(input: ListCommentsInput) {
  const setup = await prisma.setup.findUnique({
    where: { id: input.setupId },
    select: { isPublic: true },
  });
  if (!setup?.isPublic) {
    throw new CommentError("SETUP_NOT_FOUND", "Setup not found or not public");
  }

  const where = {
    setupId: input.setupId,
    parentId: null, // Only top-level comments
  };

  const comments = await prisma.comment.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: input.cursor ? 1 : 0,
    cursor: input.cursor ? { id: input.cursor } : undefined,
    take: input.limit + 1, // Get one extra to check if there are more
    include: {
      user: { select: { id: true, name: true, image: true } },
      _count: { select: { replies: true } },
    },
  });

  const hasMore = comments.length > input.limit;
  const items = comments.slice(0, input.limit);

  // Get replies for each comment
  const commentIds = items.map(c => c.id);
  const replies = await prisma.comment.findMany({
    where: { parentId: { in: commentIds } },
    orderBy: { createdAt: "asc" },
    include: {
      user: { select: { id: true, name: true, image: true } },
      _count: { select: { replies: true } },
    },
  });

  // Group replies by parentId
  const repliesByParent = new Map<string, typeof replies>();
  for (const reply of replies) {
    const parentReplies = repliesByParent.get(reply.parentId!) || [];
    parentReplies.push(reply);
    repliesByParent.set(reply.parentId!, parentReplies);
  }

  return {
    items: items.map(item => ({
      ...item,
      replies: repliesByParent.get(item.id) || [],
    })),
    hasNext: hasMore,
    nextCursor: hasMore ? items[input.limit - 1].id : null,
  };
}

/** Create a new comment */
export async function createComment(userId: string, input: CreateCommentInput) {
  // Verify setup exists and is public
  const setup = await prisma.setup.findUnique({
    where: { id: input.setupId },
    select: { isPublic: true },
  });
  if (!setup?.isPublic) {
    throw new CommentError("FORBIDDEN", "Cannot comment on private setup");
  }

  // If parentId, verify it belongs to same setup
  if (input.parentId) {
    const parent = await prisma.comment.findUnique({
      where: { id: input.parentId },
      select: { setupId: true },
    });
    if (!parent || parent.setupId !== input.setupId) {
      throw new CommentError("NOT_FOUND", "Parent comment not found");
    }
  }

  const comment = await prisma.comment.create({
    data: {
      setupId: input.setupId,
      userId,
      body: input.body,
      parentId: input.parentId,
    },
    include: {
      user: { select: { id: true, name: true, image: true } },
    },
  });

  return comment;
}

/** Update a comment */
export async function updateComment(userId: string, commentId: string, input: UpdateCommentInput) {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { userId: true },
  });
  if (!comment) throw new CommentError("NOT_FOUND", "Comment not found");
  if (comment.userId !== userId) throw new CommentError("FORBIDDEN", "Cannot edit other's comment");

  return prisma.comment.update({
    where: { id: commentId },
    data: { body: input.body },
    include: { user: { select: { id: true, name: true, image: true } } },
  });
}

/** Delete a comment (and all replies) */
export async function deleteComment(userId: string, commentId: string) {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { userId: true, setupId: true },
  });
  if (!comment) throw new CommentError("NOT_FOUND", "Comment not found");
  if (comment.userId !== userId) throw new CommentError("FORBIDDEN", "Cannot delete other's comment");

  // Prisma cascade delete handles replies automatically via SetNull on parentId
  return prisma.comment.delete({ where: { id: commentId } });
}

/** Toggle like on a comment */
export async function toggleCommentLike(userId: string, commentId: string) {
  // Note: This would require a CommentLike model - for now just return
  // that this feature is not yet implemented
  throw new Error("Comment likes not yet implemented");
}
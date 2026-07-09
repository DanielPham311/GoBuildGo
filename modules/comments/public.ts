import type { Comment } from "@prisma/client";

export interface PublicComment {
  id: string;
  setupId: string;
  userId: string;
  body: string;
  parentId: string | null;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    name: string | null;
    image: string | null;
  };
  replies?: PublicComment[];
  replyCount: number;
}

export interface PublicCommentList {
  items: PublicComment[];
  hasNext: boolean;
  nextCursor: string | null;
}

export interface PublicSetupWithComments {
  id: string;
  name: string;
  slug: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
  commentCount: number;
}

export function toPublicComment(c: Comment & { user: { id: string; name: string | null; image: string | null } } & { _count: { replies: number } }): PublicComment {
  return {
    id: c.id,
    setupId: c.setupId,
    userId: c.userId,
    body: c.body,
    parentId: c.parentId,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    user: c.user,
    replyCount: c._count.replies,
  };
}

export function toPublicSetupWithComments(setup: {
  id: string;
  name: string;
  slug: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count: { comments: number };
}): PublicSetupWithComments {
  return {
    id: setup.id,
    name: setup.name,
    slug: setup.slug,
    isPublic: setup.isPublic,
    createdAt: setup.createdAt,
    updatedAt: setup.updatedAt,
    commentCount: setup._count.comments,
  };
}
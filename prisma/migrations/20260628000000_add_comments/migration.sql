-- Add Comment model for community comments on setups

CREATE TABLE "comments" (
    "id" TEXT NOT NULL,
    "setupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX "comments_setupId_createdAt_idx" ON "comments"("setupId", "createdAt" DESC);
CREATE INDEX "comments_userId_idx" ON "comments"("userId");

-- Create foreign key constraints
ALTER TABLE "comments" ADD CONSTRAINT "comments_setupId_fkey" FOREIGN KEY ("setupId") REFERENCES "setups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "comments" ADD CONSTRAINT "comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "comments" ADD CONSTRAINT "comments_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
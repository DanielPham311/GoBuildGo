-- CreateEnum
CREATE TYPE "PromptType" AS ENUM ('search', 'visualize');

-- CreateTable
CREATE TABLE "prompt_logs" (
    "id" TEXT NOT NULL,
    "type" "PromptType" NOT NULL,
    "prompt" TEXT NOT NULL,
    "userId" TEXT,
    "resultCount" INTEGER NOT NULL DEFAULT 0,
    "itemIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prompt_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "prompt_logs_type_createdAt_idx" ON "prompt_logs"("type", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "prompt_logs_userId_idx" ON "prompt_logs"("userId");

-- AddForeignKey
ALTER TABLE "prompt_logs" ADD CONSTRAINT "prompt_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

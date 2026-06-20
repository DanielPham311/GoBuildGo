-- CreateTable
CREATE TABLE "scraper_health" (
    "id" TEXT NOT NULL,
    "scraperName" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "durationMs" INTEGER,
    "upserted" INTEGER NOT NULL DEFAULT 0,
    "skipped" INTEGER NOT NULL DEFAULT 0,
    "errors" INTEGER NOT NULL DEFAULT 0,
    "ranAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scraper_health_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "scraper_health_scraperName_ranAt_idx" ON "scraper_health"("scraperName", "ranAt" DESC);

-- Baseline migration: full schema as of 2026-06-22.
-- All tables, indexes, enums, and the pgvector embedding column (vector(1024) for Voyage AI voyage-4).

CREATE EXTENSION IF NOT EXISTS vector;

-- Enums
CREATE TYPE "ComponentCategory" AS ENUM ('desk', 'chair', 'monitor', 'keyboard', 'mouse', 'lighting', 'decor', 'audio', 'accessory');
CREATE TYPE "Shop" AS ENUM ('shopee', 'lazada', 'tiki', 'phongvu', 'gearvn', 'nhaxinh');
CREATE TYPE "RoomType" AS ENUM ('bedroom', 'gaming_room', 'office', 'studio');
CREATE TYPE "Condition" AS ENUM ('new', 'used');
CREATE TYPE "SubscriptionType" AS ENUM ('price_alert', 'weekly_digest', 'promotions');
CREATE TYPE "UserRole" AS ENUM ('user', 'admin');

-- users
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "name" TEXT,
    "image" TEXT,
    "emailVerified" TIMESTAMP(3),
    "passwordHash" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'user',
    "authProvider" TEXT NOT NULL DEFAULT 'credentials',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- components (with pgvector embedding)
CREATE TABLE "components" (
    "id" TEXT NOT NULL,
    "category" "ComponentCategory" NOT NULL,
    "brand" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "specs" JSONB DEFAULT '{}',
    "colors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "styleTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "imageUrl" TEXT,
    "dimensions" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "embedding" vector(1024),
    "embeddingStale" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "components_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "components_slug_key" ON "components"("slug");
CREATE INDEX "components_category_isActive_idx" ON "components"("category", "isActive");
CREATE INDEX "components_brand_idx" ON "components"("brand");
CREATE INDEX "components_styleTags_idx" ON "components" USING GIN ("styleTags");
CREATE INDEX "components_colors_idx" ON "components" USING GIN ("colors");
CREATE INDEX "components_specs_idx" ON "components" USING GIN ("specs");
CREATE INDEX "components_dimensions_idx" ON "components" USING GIN ("dimensions");
CREATE INDEX "components_embedding_hnsw" ON "components" USING hnsw ("embedding" vector_cosine_ops) WITH (m = 16, ef_construction = 64);

-- prices
CREATE TABLE "prices" (
    "id" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,
    "shop" "Shop" NOT NULL,
    "price" DECIMAL(12,0) NOT NULL,
    "originalPrice" DECIMAL(12,0),
    "currency" TEXT NOT NULL DEFAULT 'VND',
    "url" TEXT NOT NULL,
    "shopName" TEXT,
    "shopRating" DECIMAL(2,1),
    "condition" "Condition" NOT NULL DEFAULT 'new',
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "lastUpdated" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "prices_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "prices_componentId_shop_condition_key" ON "prices"("componentId", "shop", "condition");
CREATE INDEX "prices_componentId_price_idx" ON "prices"("componentId", "price");
CREATE INDEX "prices_shop_isAvailable_idx" ON "prices"("shop", "isAvailable");
ALTER TABLE "prices" ADD CONSTRAINT "prices_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "components"("id") ON DELETE CASCADE;

-- price_history
CREATE TABLE "price_history" (
    "id" TEXT NOT NULL,
    "priceId" TEXT NOT NULL,
    "oldPrice" DECIMAL(12,0) NOT NULL,
    "newPrice" DECIMAL(12,0) NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "price_history_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "price_history_priceId_recordedAt_idx" ON "price_history"("priceId", "recordedAt" DESC);
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_priceId_fkey" FOREIGN KEY ("priceId") REFERENCES "prices"("id") ON DELETE CASCADE;

-- setups
CREATE TABLE "setups" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "roomType" "RoomType",
    "roomDimensions" JSONB,
    "theme" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "totalPrice" DECIMAL(12,0),
    "coverImageUrl" TEXT,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "setups_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "setups_slug_key" ON "setups"("slug");
CREATE INDEX "setups_userId_createdAt_idx" ON "setups"("userId", "createdAt" DESC);
CREATE INDEX "setups_isPublic_createdAt_idx" ON "setups"("isPublic", "createdAt" DESC);
CREATE INDEX "setups_isPublic_viewCount_idx" ON "setups"("isPublic", "viewCount" DESC);
CREATE INDEX "setups_theme_isPublic_idx" ON "setups"("theme", "isPublic");
CREATE INDEX "setups_roomDimensions_idx" ON "setups" USING GIN ("roomDimensions");
ALTER TABLE "setups" ADD CONSTRAINT "setups_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL;

-- setup_items
CREATE TABLE "setup_items" (
    "id" TEXT NOT NULL,
    "setupId" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "position" JSONB,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "setup_items_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "setup_items_setupId_idx" ON "setup_items"("setupId");
CREATE INDEX "setup_items_componentId_idx" ON "setup_items"("componentId");
CREATE INDEX "setup_items_position_idx" ON "setup_items" USING GIN ("position");
ALTER TABLE "setup_items" ADD CONSTRAINT "setup_items_setupId_fkey" FOREIGN KEY ("setupId") REFERENCES "setups"("id") ON DELETE CASCADE;
ALTER TABLE "setup_items" ADD CONSTRAINT "setup_items_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "components"("id") ON DELETE RESTRICT;

-- themes
CREATE TABLE "themes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "coverImageUrl" TEXT,
    "colorPalette" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "styleTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "themes_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "themes_slug_key" ON "themes"("slug");
CREATE INDEX "themes_styleTags_idx" ON "themes" USING GIN ("styleTags");
CREATE INDEX "themes_colorPalette_idx" ON "themes" USING GIN ("colorPalette");

-- themes_components
CREATE TABLE "themes_components" (
    "themeId" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "themes_components_pkey" PRIMARY KEY ("themeId", "componentId")
);
ALTER TABLE "themes_components" ADD CONSTRAINT "themes_components_themeId_fkey" FOREIGN KEY ("themeId") REFERENCES "themes"("id") ON DELETE CASCADE;
ALTER TABLE "themes_components" ADD CONSTRAINT "themes_components_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "components"("id") ON DELETE CASCADE;

-- generated_renders
CREATE TABLE "generated_renders" (
    "id" TEXT NOT NULL,
    "promptHash" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "itemIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "roomType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "generated_renders_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "generated_renders_promptHash_key" ON "generated_renders"("promptHash");

-- affiliate_clicks
CREATE TABLE "affiliate_clicks" (
    "id" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,
    "setupId" TEXT,
    "userId" TEXT,
    "shop" TEXT NOT NULL,
    "clickedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "referrer" TEXT,
    "ipHash" TEXT,
    CONSTRAINT "affiliate_clicks_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "affiliate_clicks_componentId_clickedAt_idx" ON "affiliate_clicks"("componentId", "clickedAt" DESC);
CREATE INDEX "affiliate_clicks_shop_clickedAt_idx" ON "affiliate_clicks"("shop", "clickedAt" DESC);
CREATE INDEX "affiliate_clicks_setupId_idx" ON "affiliate_clicks"("setupId");
ALTER TABLE "affiliate_clicks" ADD CONSTRAINT "affiliate_clicks_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "components"("id") ON DELETE CASCADE;
ALTER TABLE "affiliate_clicks" ADD CONSTRAINT "affiliate_clicks_setupId_fkey" FOREIGN KEY ("setupId") REFERENCES "setups"("id") ON DELETE SET NULL;
ALTER TABLE "affiliate_clicks" ADD CONSTRAINT "affiliate_clicks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL;

-- user_favorites
CREATE TABLE "user_favorites" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_favorites_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "user_favorites_userId_componentId_key" ON "user_favorites"("userId", "componentId");
CREATE INDEX "user_favorites_componentId_idx" ON "user_favorites"("componentId");
ALTER TABLE "user_favorites" ADD CONSTRAINT "user_favorites_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "user_favorites" ADD CONSTRAINT "user_favorites_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "components"("id") ON DELETE CASCADE;

-- setup_likes
CREATE TABLE "setup_likes" (
    "id" TEXT NOT NULL,
    "setupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "setup_likes_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "setup_likes_setupId_userId_key" ON "setup_likes"("setupId", "userId");
CREATE INDEX "setup_likes_userId_idx" ON "setup_likes"("userId");
ALTER TABLE "setup_likes" ADD CONSTRAINT "setup_likes_setupId_fkey" FOREIGN KEY ("setupId") REFERENCES "setups"("id") ON DELETE CASCADE;
ALTER TABLE "setup_likes" ADD CONSTRAINT "setup_likes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;

-- setup_views
CREATE TABLE "setup_views" (
    "id" TEXT NOT NULL,
    "setupId" TEXT NOT NULL,
    "viewerId" TEXT,
    "ipHash" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "setup_views_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "setup_views_setupId_viewedAt_idx" ON "setup_views"("setupId", "viewedAt" DESC);
ALTER TABLE "setup_views" ADD CONSTRAINT "setup_views_setupId_fkey" FOREIGN KEY ("setupId") REFERENCES "setups"("id") ON DELETE CASCADE;
ALTER TABLE "setup_views" ADD CONSTRAINT "setup_views_viewerId_fkey" FOREIGN KEY ("viewerId") REFERENCES "users"("id") ON DELETE SET NULL;

-- scraper_health
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
CREATE INDEX "scraper_health_scraperName_ranAt_idx" ON "scraper_health"("scraperName", "ranAt" DESC);

-- email_subscriptions
CREATE TABLE "email_subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subscriptionType" "SubscriptionType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "email_subscriptions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "email_subscriptions_userId_subscriptionType_key" ON "email_subscriptions"("userId", "subscriptionType");
CREATE INDEX "email_subscriptions_userId_idx" ON "email_subscriptions"("userId");
ALTER TABLE "email_subscriptions" ADD CONSTRAINT "email_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;

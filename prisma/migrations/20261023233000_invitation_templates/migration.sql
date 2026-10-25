CREATE TABLE "InvitationTemplate" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "style" TEXT NOT NULL,
    "description" TEXT,
    "coverImage" TEXT,
    "color" TEXT NOT NULL DEFAULT 'olive',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "InvitationTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InvitationTemplate_slug_key" ON "InvitationTemplate"("slug");
CREATE INDEX "InvitationTemplate_isActive_createdAt_idx" ON "InvitationTemplate"("isActive", "createdAt");

INSERT INTO "InvitationTemplate" ("id", "slug", "name", "style", "color", "updatedAt")
VALUES
    ('template_senja_di_ubud', 'senja-di-ubud', 'Senja di Ubud', 'Rustic · Hangat', 'olive', CURRENT_TIMESTAMP),
    ('template_janji_suci', 'janji-suci', 'Janji Suci', 'Klasik · Elegan', 'rose', CURRENT_TIMESTAMP),
    ('template_ruang_berdua', 'ruang-berdua', 'Ruang Berdua', 'Modern · Minimal', 'blue', CURRENT_TIMESTAMP),
    ('template_bunga_pagi', 'bunga-pagi', 'Bunga Pagi', 'Floral · Romantis', 'peach', CURRENT_TIMESTAMP),
    ('template_satu_cerita', 'satu-cerita', 'Satu Cerita', 'Editorial · Bersih', 'sand', CURRENT_TIMESTAMP),
    ('template_malam_minggu', 'malam-minggu', 'Malam Minggu', 'Gelap · Dramatis', 'plum', CURRENT_TIMESTAMP);

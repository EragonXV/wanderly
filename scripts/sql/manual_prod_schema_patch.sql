-- Manual production schema patch for older Wanderly databases.
-- Apply this carefully against the production database.
--
-- Important:
-- 1. This script is intended for databases that are missing newer columns/tables.
-- 2. CREATE TABLE / CREATE INDEX statements are idempotent.
-- 3. ALTER TABLE ... ADD COLUMN is NOT idempotent on SQLite/libSQL.
--    If a column already exists, that specific statement will fail.
--    In that case, remove/comment the failing line and run the rest.

BEGIN;

-- Trip additions
ALTER TABLE "Trip" ADD COLUMN "destinationPlaceId" TEXT;
ALTER TABLE "Trip" ADD COLUMN "destinationLat" REAL;
ALTER TABLE "Trip" ADD COLUMN "destinationLng" REAL;
ALTER TABLE "Trip" ADD COLUMN "category" TEXT NOT NULL DEFAULT 'Sonstiges';
ALTER TABLE "Trip" ADD COLUMN "timeMode" TEXT NOT NULL DEFAULT 'FIXED';
ALTER TABLE "Trip" ADD COLUMN "planningStartDate" DATETIME;
ALTER TABLE "Trip" ADD COLUMN "planningEndDate" DATETIME;
ALTER TABLE "Trip" ADD COLUMN "plannedDurationDays" INTEGER;
ALTER TABLE "Trip" ADD COLUMN "participantMode" TEXT NOT NULL DEFAULT 'NONE';
ALTER TABLE "Trip" ADD COLUMN "participantFixedCount" INTEGER;
ALTER TABLE "Trip" ADD COLUMN "participantMinCount" INTEGER;
ALTER TABLE "Trip" ADD COLUMN "participantMaxCount" INTEGER;
ALTER TABLE "Trip" ADD COLUMN "coverImage" TEXT;

-- User additions
ALTER TABLE "User" ADD COLUMN "birthDate" DATETIME;
ALTER TABLE "User" ADD COLUMN "country" TEXT;
ALTER TABLE "User" ADD COLUMN "bio" TEXT;

-- TripBudgetItem additions
ALTER TABLE "TripBudgetItem" ADD COLUMN "pricingMode" TEXT NOT NULL DEFAULT 'GROUP_TOTAL';
ALTER TABLE "TripBudgetItem" ADD COLUMN "peopleCount" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "TripBudgetItem" ADD COLUMN "dayStart" INTEGER;
ALTER TABLE "TripBudgetItem" ADD COLUMN "dayEnd" INTEGER;

-- TripMember role extension is enum-like in app code only, no schema change needed beyond TEXT storage.

-- New tables
CREATE TABLE IF NOT EXISTS "TripInvitation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tripId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "invitedByUserId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "expiresAt" DATETIME NOT NULL,
    "respondedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TripInvitation_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TripInvitation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TripInvitation_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tripId" TEXT,
    "invitationId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Notification_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "TripChatMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tripId" TEXT NOT NULL,
    "userId" TEXT,
    "type" TEXT NOT NULL DEFAULT 'USER',
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TripChatMessage_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TripChatMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS "TripInvitation_tripId_userId_idx" ON "TripInvitation"("tripId", "userId");
CREATE INDEX IF NOT EXISTS "TripInvitation_userId_status_idx" ON "TripInvitation"("userId", "status");
CREATE INDEX IF NOT EXISTS "TripInvitation_tripId_status_idx" ON "TripInvitation"("tripId", "status");
CREATE INDEX IF NOT EXISTS "Notification_userId_isRead_createdAt_idx" ON "Notification"("userId", "isRead", "createdAt");
CREATE INDEX IF NOT EXISTS "Notification_tripId_createdAt_idx" ON "Notification"("tripId", "createdAt");
CREATE INDEX IF NOT EXISTS "Notification_invitationId_idx" ON "Notification"("invitationId");
CREATE INDEX IF NOT EXISTS "TripChatMessage_tripId_createdAt_idx" ON "TripChatMessage"("tripId", "createdAt");
CREATE INDEX IF NOT EXISTS "TripChatMessage_userId_createdAt_idx" ON "TripChatMessage"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "TripBudgetItem_tripId_createdAt_idx" ON "TripBudgetItem"("tripId", "createdAt");

COMMIT;

-- DANGER:
-- This script drops the existing Wanderly schema and recreates it from scratch.
-- All existing application data will be lost.

PRAGMA foreign_keys = OFF;

DROP TABLE IF EXISTS "_WanderlySqlMigrations";
DROP TABLE IF EXISTS "TripBudgetItem";
DROP TABLE IF EXISTS "TripItineraryActivity";
DROP TABLE IF EXISTS "TripItineraryTag";
DROP TABLE IF EXISTS "TripItineraryDay";
DROP TABLE IF EXISTS "TripChatMessage";
DROP TABLE IF EXISTS "Notification";
DROP TABLE IF EXISTS "TripInvitation";
DROP TABLE IF EXISTS "TripMember";
DROP TABLE IF EXISTS "Trip";
DROP TABLE IF EXISTS "User";

CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" DATETIME,
    "image" TEXT,
    "birthDate" DATETIME,
    "country" TEXT,
    "bio" TEXT,
    "password" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "Trip" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "destination" TEXT NOT NULL,
    "destinationPlaceId" TEXT,
    "destinationLat" REAL,
    "destinationLng" REAL,
    "category" TEXT NOT NULL DEFAULT 'Sonstiges',
    "timeMode" TEXT NOT NULL DEFAULT 'FIXED',
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "planningStartDate" DATETIME,
    "planningEndDate" DATETIME,
    "plannedDurationDays" INTEGER,
    "participantMode" TEXT NOT NULL DEFAULT 'NONE',
    "participantFixedCount" INTEGER,
    "participantMinCount" INTEGER,
    "participantMaxCount" INTEGER,
    "coverImage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "TripMember" (
    "tripId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("tripId", "userId"),
    CONSTRAINT "TripMember_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TripMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "TripInvitation" (
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

CREATE TABLE "Notification" (
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

CREATE TABLE "TripChatMessage" (
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

CREATE TABLE "TripItineraryDay" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tripId" TEXT NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "summary" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TripItineraryDay_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "TripItineraryTag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dayId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    CONSTRAINT "TripItineraryTag_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "TripItineraryDay" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "TripItineraryActivity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dayId" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'ACTIVITY',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TripItineraryActivity_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "TripItineraryDay" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "TripBudgetItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tripId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "pricingMode" TEXT NOT NULL DEFAULT 'GROUP_TOTAL',
    "peopleCount" INTEGER NOT NULL DEFAULT 1,
    "estimatedCostCents" INTEGER NOT NULL,
    "dayStart" INTEGER,
    "dayEnd" INTEGER,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TripBudgetItem_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "_WanderlySqlMigrations" (
    "name" TEXT NOT NULL PRIMARY KEY,
    "checksum" TEXT NOT NULL,
    "appliedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "TripMember_userId_idx" ON "TripMember"("userId");
CREATE INDEX "TripInvitation_tripId_userId_idx" ON "TripInvitation"("tripId", "userId");
CREATE INDEX "TripInvitation_userId_status_idx" ON "TripInvitation"("userId", "status");
CREATE INDEX "TripInvitation_tripId_status_idx" ON "TripInvitation"("tripId", "status");
CREATE INDEX "Notification_userId_isRead_createdAt_idx" ON "Notification"("userId", "isRead", "createdAt");
CREATE INDEX "Notification_tripId_createdAt_idx" ON "Notification"("tripId", "createdAt");
CREATE INDEX "Notification_invitationId_idx" ON "Notification"("invitationId");
CREATE INDEX "TripChatMessage_tripId_createdAt_idx" ON "TripChatMessage"("tripId", "createdAt");
CREATE INDEX "TripChatMessage_userId_createdAt_idx" ON "TripChatMessage"("userId", "createdAt");
CREATE INDEX "TripItineraryDay_tripId_dayNumber_idx" ON "TripItineraryDay"("tripId", "dayNumber");
CREATE UNIQUE INDEX "TripItineraryDay_tripId_dayNumber_key" ON "TripItineraryDay"("tripId", "dayNumber");
CREATE INDEX "TripItineraryTag_dayId_idx" ON "TripItineraryTag"("dayId");
CREATE INDEX "TripItineraryActivity_dayId_createdAt_idx" ON "TripItineraryActivity"("dayId", "createdAt");
CREATE INDEX "TripBudgetItem_tripId_createdAt_idx" ON "TripBudgetItem"("tripId", "createdAt");

PRAGMA foreign_keys = ON;

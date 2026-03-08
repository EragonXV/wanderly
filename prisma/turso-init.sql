-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" DATETIME,
    "image" TEXT,
    "password" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
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

-- CreateTable
CREATE TABLE "TripMember" (
    "tripId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("tripId", "userId"),
    CONSTRAINT "TripMember_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TripMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
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

-- CreateTable
CREATE TABLE "TripItineraryTag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dayId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    CONSTRAINT "TripItineraryTag_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "TripItineraryDay" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TripItineraryActivity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dayId" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'ACTIVITY',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TripItineraryActivity_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "TripItineraryDay" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TripBudgetItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tripId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "pricingMode" TEXT NOT NULL DEFAULT 'GROUP_TOTAL',
    "peopleCount" INTEGER NOT NULL DEFAULT 1,
    "estimatedCostCents" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TripBudgetItem_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "TripMember_userId_idx" ON "TripMember"("userId");

-- CreateIndex
CREATE INDEX "TripItineraryDay_tripId_dayNumber_idx" ON "TripItineraryDay"("tripId", "dayNumber");

-- CreateIndex
CREATE UNIQUE INDEX "TripItineraryDay_tripId_dayNumber_key" ON "TripItineraryDay"("tripId", "dayNumber");

-- CreateIndex
CREATE INDEX "TripItineraryTag_dayId_idx" ON "TripItineraryTag"("dayId");

-- CreateIndex
CREATE INDEX "TripItineraryActivity_dayId_createdAt_idx" ON "TripItineraryActivity"("dayId", "createdAt");

-- CreateIndex
CREATE INDEX "TripBudgetItem_tripId_createdAt_idx" ON "TripBudgetItem"("tripId", "createdAt");

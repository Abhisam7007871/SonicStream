-- CreateTable
CREATE TABLE "UserSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "deviceId" TEXT NOT NULL,
    "userId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "platform" TEXT NOT NULL DEFAULT 'web',
    "sessionStart" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActive" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pagesViewed" INTEGER NOT NULL DEFAULT 1,
    "songsPlayed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "UniqueUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "deviceId" TEXT NOT NULL,
    "userId" TEXT,
    "ipAddress" TEXT,
    "platform" TEXT NOT NULL DEFAULT 'web',
    "firstSeen" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeen" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalSessions" INTEGER NOT NULL DEFAULT 1,
    "totalSongsPlayed" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "SongPlay" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "deviceId" TEXT NOT NULL,
    "userId" TEXT,
    "songId" TEXT NOT NULL,
    "songTitle" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "playedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "UserSession_deviceId_idx" ON "UserSession"("deviceId");

-- CreateIndex
CREATE INDEX "UserSession_userId_idx" ON "UserSession"("userId");

-- CreateIndex
CREATE INDEX "UserSession_sessionStart_idx" ON "UserSession"("sessionStart");

-- CreateIndex
CREATE UNIQUE INDEX "UniqueUser_deviceId_key" ON "UniqueUser"("deviceId");

-- CreateIndex
CREATE INDEX "UniqueUser_deviceId_idx" ON "UniqueUser"("deviceId");

-- CreateIndex
CREATE INDEX "UniqueUser_userId_idx" ON "UniqueUser"("userId");

-- CreateIndex
CREATE INDEX "SongPlay_deviceId_idx" ON "SongPlay"("deviceId");

-- CreateIndex
CREATE INDEX "SongPlay_playedAt_idx" ON "SongPlay"("playedAt");

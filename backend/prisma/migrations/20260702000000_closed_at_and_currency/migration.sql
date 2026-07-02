-- Doplňuje sloupce přidané do schema.prisma po init migraci
-- (uzavírání zakázek + měna typu práce). Bez této migrace selže
-- "prisma migrate deploy" na čerstvé databázi.

-- AlterTable
ALTER TABLE "Project" ADD COLUMN "closedAt" DATETIME;

-- AlterTable
ALTER TABLE "WorkType" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'Kč';

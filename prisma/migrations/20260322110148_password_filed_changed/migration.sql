/*
  Warnings:

  - You are about to drop the column `passwordHash` on the `accounts` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "accounts" DROP COLUMN "passwordHash",
ADD COLUMN     "password" TEXT;

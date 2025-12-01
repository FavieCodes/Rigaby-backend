/*
  Warnings:

  - You are about to drop the column `referredBy` on the `users` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "ReferralBonusType" AS ENUM ('SUBSCRIPTION', 'TASK_REWARD');

-- CreateEnum
CREATE TYPE "ReferralBonusStatus" AS ENUM ('PENDING', 'PAID', 'FAILED');

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_referredBy_fkey";

-- AlterTable
ALTER TABLE "contents" ADD COLUMN     "metadata" JSONB;

-- AlterTable
ALTER TABLE "questions" ADD COLUMN     "metadata" JSONB;

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "metadata" JSONB;

-- AlterTable
ALTER TABLE "tournament_entries" ADD COLUMN     "metadata" JSONB;

-- AlterTable
ALTER TABLE "tournament_questions" ADD COLUMN     "metadata" JSONB;

-- AlterTable
ALTER TABLE "tournaments" ADD COLUMN     "metadata" JSONB;

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "metadata" JSONB;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "referredBy",
ADD COLUMN     "referredById" TEXT;

-- CreateTable
CREATE TABLE "referral_bonuses" (
    "id" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "referredUserId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "bonusPercentage" DECIMAL(65,30) NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "type" "ReferralBonusType" NOT NULL,
    "status" "ReferralBonusStatus" NOT NULL DEFAULT 'PENDING',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "referral_bonuses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "referral_bonuses_referrerId_referredUserId_type_key" ON "referral_bonuses"("referrerId", "referredUserId", "type");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_bonuses" ADD CONSTRAINT "referral_bonuses_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_bonuses" ADD CONSTRAINT "referral_bonuses_referredUserId_fkey" FOREIGN KEY ("referredUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

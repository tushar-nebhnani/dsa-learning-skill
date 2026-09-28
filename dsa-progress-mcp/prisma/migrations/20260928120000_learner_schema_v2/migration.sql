/*
  Warnings:

  - The primary key for the `solved_problems` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `created_at` on the `solved_problems` table. All the data in the column will be lost.
  - You are about to drop the column `id` on the `solved_problems` table. All the data in the column will be lost.
  - You are about to drop the column `platform` on the `solved_problems` table. All the data in the column will be lost.
  - You are about to drop the column `platform_ref` on the `solved_problems` table. All the data in the column will be lost.
  - You are about to drop the column `retry_problem` on the `solved_problems` table. All the data in the column will be lost.
  - You are about to drop the column `solved_at` on the `solved_problems` table. All the data in the column will be lost.
  - You are about to drop the column `space_complexity` on the `solved_problems` table. All the data in the column will be lost.
  - You are about to drop the column `time_complexity` on the `solved_problems` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `solved_problems` table. All the data in the column will be lost.
  - The primary key for the `users` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `learning_goal` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `onboarded_at` on the `users` table. All the data in the column will be lost.
  - The `dsa_comfort` column on the `users` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `language_comfort` column on the `users` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `user_id` on the `authorization_codes` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `user_id` on the `oauth_tokens` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `last_solved_at` to the `solved_problems` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `learner_id` on the `solved_problems` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Made the column `documentation_md` on table `solved_problems` required. This step will fail if there are existing NULL values in that column.
  - Changed the type of `id` on the `users` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "ComfortLevel" AS ENUM ('beginner', 'intermediate', 'advanced');

-- CreateEnum
CREATE TYPE "LearningMode" AS ENUM ('roadmap', 'topic');

-- DropForeignKey
ALTER TABLE "authorization_codes" DROP CONSTRAINT "authorization_codes_user_id_fkey";

-- DropForeignKey
ALTER TABLE "oauth_tokens" DROP CONSTRAINT "oauth_tokens_user_id_fkey";

-- DropIndex
DROP INDEX "solved_problems_learner_id_retry_problem_revisit_at_idx";

-- DropIndex
DROP INDEX "solved_problems_learner_id_slug_key";

-- DropIndex
DROP INDEX "solved_problems_learner_id_solved_at_idx";

-- AlterTable
ALTER TABLE "authorization_codes" DROP COLUMN "user_id",
ADD COLUMN     "user_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "oauth_tokens" DROP COLUMN "user_id",
ADD COLUMN     "user_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "solved_problems" DROP CONSTRAINT "solved_problems_pkey",
DROP COLUMN "created_at",
DROP COLUMN "id",
DROP COLUMN "platform",
DROP COLUMN "platform_ref",
DROP COLUMN "retry_problem",
DROP COLUMN "solved_at",
DROP COLUMN "space_complexity",
DROP COLUMN "time_complexity",
DROP COLUMN "updated_at",
ADD COLUMN     "first_solved_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "last_solved_at" TIMESTAMPTZ(6) NOT NULL,
DROP COLUMN "learner_id",
ADD COLUMN     "learner_id" UUID NOT NULL,
ALTER COLUMN "documentation_md" SET NOT NULL,
ADD CONSTRAINT "solved_problems_pkey" PRIMARY KEY ("learner_id", "slug");

-- AlterTable
ALTER TABLE "users" DROP CONSTRAINT "users_pkey",
DROP COLUMN "learning_goal",
DROP COLUMN "onboarded_at",
ADD COLUMN     "current_topic" TEXT,
ADD COLUMN     "learning_mode" "LearningMode",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "dsa_comfort",
ADD COLUMN     "dsa_comfort" "ComfortLevel",
DROP COLUMN "language_comfort",
ADD COLUMN     "language_comfort" "ComfortLevel",
ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE INDEX "oauth_tokens_user_id_idx" ON "oauth_tokens"("user_id");

-- CreateIndex
CREATE INDEX "solved_problems_learner_id_topic_idx" ON "solved_problems"("learner_id", "topic");

-- CreateIndex
CREATE INDEX "solved_problems_learner_id_revisit_at_idx" ON "solved_problems"("learner_id", "revisit_at");

-- AddForeignKey
ALTER TABLE "solved_problems" ADD CONSTRAINT "solved_problems_learner_id_fkey" FOREIGN KEY ("learner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pending_authorizations" ADD CONSTRAINT "pending_authorizations_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "oauth_clients"("client_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "authorization_codes" ADD CONSTRAINT "authorization_codes_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "oauth_clients"("client_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "authorization_codes" ADD CONSTRAINT "authorization_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oauth_tokens" ADD CONSTRAINT "oauth_tokens_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "oauth_clients"("client_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oauth_tokens" ADD CONSTRAINT "oauth_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

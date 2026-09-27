-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('easy', 'medium', 'hard');

-- CreateEnum
CREATE TYPE "Result" AS ENUM ('accepted', 'partial');

-- CreateTable
CREATE TABLE "solved_problems" (
    "id" UUID NOT NULL,
    "learner_id" TEXT NOT NULL DEFAULT 'default',
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "difficulty" "Difficulty" NOT NULL,
    "language" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "platform_ref" TEXT,
    "result" "Result" NOT NULL,
    "time_complexity" TEXT NOT NULL,
    "space_complexity" TEXT NOT NULL,
    "documentation_md" TEXT,
    "solved_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "solved_problems_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "solved_problems_learner_id_topic_idx" ON "solved_problems"("learner_id", "topic");

-- CreateIndex
CREATE INDEX "solved_problems_learner_id_solved_at_idx" ON "solved_problems"("learner_id", "solved_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "solved_problems_learner_id_slug_key" ON "solved_problems"("learner_id", "slug");


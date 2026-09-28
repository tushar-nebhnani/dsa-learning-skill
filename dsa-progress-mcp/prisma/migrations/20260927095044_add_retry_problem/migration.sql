-- AlterTable
ALTER TABLE "solved_problems" ADD COLUMN     "retry_problem" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "revisit_at" TIMESTAMPTZ(6);

-- CreateIndex
CREATE INDEX "solved_problems_learner_id_retry_problem_revisit_at_idx" ON "solved_problems"("learner_id", "retry_problem", "revisit_at");

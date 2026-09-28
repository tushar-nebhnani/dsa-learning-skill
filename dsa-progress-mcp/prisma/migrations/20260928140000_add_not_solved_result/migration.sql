-- AlterEnum
ALTER TYPE "Result" ADD VALUE 'not_solved';

-- DropIndex
DROP INDEX "solved_problems_learner_id_revisit_at_idx";

-- CreateIndex
CREATE INDEX "solved_problems_learner_id_revisit_revisit_at_idx" ON "solved_problems"("learner_id", "revisit", "revisit_at");

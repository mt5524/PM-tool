-- AlterTable
ALTER TABLE "Milestone" ADD COLUMN     "isAiDraft" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "isAiDraft" BOOLEAN NOT NULL DEFAULT false;

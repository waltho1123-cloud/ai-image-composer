-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "outputFormat" TEXT NOT NULL DEFAULT 'png',
ADD COLUMN     "outputQuality" TEXT NOT NULL DEFAULT 'auto',
ADD COLUMN     "outputSize" TEXT NOT NULL DEFAULT 'auto';

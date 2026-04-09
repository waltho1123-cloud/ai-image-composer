/*
  Warnings:

  - You are about to drop the column `inputBase64` on the `Job` table. All the data in the column will be lost.
  - You are about to drop the column `inputMime` on the `Job` table. All the data in the column will be lost.
  - Added the required column `bottomImageBase64` to the `Job` table without a default value. This is not possible if the table is not empty.
  - Added the required column `bottomImageMime` to the `Job` table without a default value. This is not possible if the table is not empty.
  - Added the required column `modelImageBase64` to the `Job` table without a default value. This is not possible if the table is not empty.
  - Added the required column `modelImageMime` to the `Job` table without a default value. This is not possible if the table is not empty.
  - Added the required column `topImageBase64` to the `Job` table without a default value. This is not possible if the table is not empty.
  - Added the required column `topImageMime` to the `Job` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Job" DROP COLUMN "inputBase64",
DROP COLUMN "inputMime",
ADD COLUMN     "bottomImageBase64" TEXT NOT NULL,
ADD COLUMN     "bottomImageMime" TEXT NOT NULL,
ADD COLUMN     "modelImageBase64" TEXT NOT NULL,
ADD COLUMN     "modelImageMime" TEXT NOT NULL,
ADD COLUMN     "topImageBase64" TEXT NOT NULL,
ADD COLUMN     "topImageMime" TEXT NOT NULL;

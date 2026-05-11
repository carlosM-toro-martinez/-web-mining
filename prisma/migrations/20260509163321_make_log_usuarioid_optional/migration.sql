-- DropForeignKey
ALTER TABLE "Log" DROP CONSTRAINT "Log_usuarioId_fkey";

-- AlterTable
ALTER TABLE "Log" ALTER COLUMN "usuarioId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Log" ADD CONSTRAINT "Log_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

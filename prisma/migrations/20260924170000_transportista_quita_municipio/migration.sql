-- El municipio no aporta nada a un Transportista (empresa de transporte o
-- unipersonal): es un resabio del viejo modelo "Remitente". El municipio de
-- origen del mineral ya vive correctamente en LoteDespacho.municipioOrigenId.
ALTER TABLE "Transportista" DROP CONSTRAINT "Transportista_municipioId_fkey";
DROP INDEX "Transportista_municipioId_idx";
ALTER TABLE "Transportista" DROP COLUMN "municipioId";

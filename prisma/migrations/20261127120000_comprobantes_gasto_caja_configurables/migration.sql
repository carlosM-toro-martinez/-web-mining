-- Los comprobantes de un gasto pasan a ser configurables en Parámetros.
CREATE TABLE "ComprobanteGastoCaja" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "ayuda" TEXT,
    "tratamiento" "TipoDocumentoGasto" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ComprobanteGastoCaja_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ComprobanteGastoCaja_nombre_key" ON "ComprobanteGastoCaja"("nombre");

ALTER TABLE "GastoCaja" ADD COLUMN "comprobanteId" INTEGER;

ALTER TABLE "GastoCaja" ADD CONSTRAINT "GastoCaja_comprobanteId_fkey" FOREIGN KEY ("comprobanteId") REFERENCES "ComprobanteGastoCaja"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "ComprobanteGastoCaja" ("nombre", "ayuda", "tratamiento", "orden") VALUES
  ('Factura', 'Anota el número de la factura.', 'FACTURA', 1),
  ('Recibo (sin crédito fiscal)', 'Recibo de una empresa o de una persona. Anota su número.', 'RECIBO', 2),
  ('Sin factura, con retención', 'Quien cobra no da factura: se le descuenta el impuesto. El sistema calcula cuánto.', 'CONTRATO_RETENCION', 3),
  ('Sin comprobante', 'No hay ningún papel (por ejemplo, un viático).', 'RECIBO_DIRECTO', 4),
  ('Por planilla', 'Pago de sueldos o jornales según planilla. No lleva impuestos.', 'PLANILLA', 5);

-- Los gastos ya registrados quedan con el comprobante de su tipo de documento.
UPDATE "GastoCaja" g SET "comprobanteId" = c."id"
FROM "ComprobanteGastoCaja" c
WHERE c."tratamiento" = g."tipoDocumento";

INSERT INTO "ComprobanteGastoCaja" ("nombre", "ayuda", "tratamiento", "orden") VALUES
  ('Comprobante por rendir', 'Dinero entregado que falta respaldar. No lleva impuestos.', 'PLANILLA', 6);

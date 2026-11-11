-- "Otros gastos": la remesa que existe sola cada mes, para los gastos que no estaban presupuestados
-- (gasolina extra, hotel, urgencias del campamento). Antes había que crearla a mano todos los meses.
-- No recibe dinero del banco: en Saldos no se ofrece como remesa de un ingreso.

-- AlterTable
ALTER TABLE "PresupuestoCaja" ADD COLUMN     "esPorDefecto" BOOLEAN NOT NULL DEFAULT false;

-- Las remesas "otros gastos" que ya se habían creado a mano pasan a ser la de su mes.
UPDATE "PresupuestoCaja"
SET "esPorDefecto" = true
WHERE lower(btrim("nombre")) = 'otros gastos'
  AND "id" IN (
    SELECT min("id") FROM "PresupuestoCaja"
    WHERE lower(btrim("nombre")) = 'otros gastos'
    GROUP BY "cajaId", "anio", "mes"
  );

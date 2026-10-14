-- Niveles escritos a mano ("MOSA", "mosa", "0") -> los 4 valores válidos.
-- Sin esto el Cuadro Mensual no los suma en ninguna columna de nivel.
UPDATE "LoteDespacho" SET "nivel" = 'La Moza'
WHERE upper(trim("nivel")) IN ('MOSA', 'MOZA', 'LA MOSA', 'LA MOZA') AND "nivel" <> 'La Moza';

UPDATE "LoteDespacho" SET "nivel" = 'Nivel ' || substring(trim("nivel") from '(\d+)$')
WHERE trim("nivel") ~* '^(nivel\s*)?(0|40|80)$' AND "nivel" NOT IN ('Nivel 0', 'Nivel 40', 'Nivel 80');

UPDATE "LoteDespacho" SET "nivel" = NULL WHERE trim("nivel") = '';

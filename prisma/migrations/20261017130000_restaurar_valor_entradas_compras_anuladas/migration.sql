-- Restaura P. UNIT y Entrada Bs de las entradas de compras ANULADAS (periodos desde 2026-01).
--
-- El backfill de CPP reaplicaba el factor de IVA (x0.87 / x0.909) sobre el valor que esas entradas
-- ya tenían sin IVA, reduciéndolo en cada ejecución. Solo afecta a las columnas precioUnit y entradaBs
-- de esas filas (se ve en el Bin Card Valorado); stock, saldoBs, SaldoMensual y reportes no cambian.
--
-- El valor correcto es el de la compra: precio del ítem x factor de IVA, igual que usa el backfill
-- (sin IVA = 1; gas especial = 0.909; resto = 0.87; si la compra no tiene bandera, gasolina desde
-- 2025-11 y diésel en 2026-02/03 se tratan como gas especial).
--
-- Solo se tocan filas cuyo valor actual es MENOR al correcto, de compras anuladas con un único ítem del
-- producto, desde 2026-01. Octubre a diciembre de 2025 no se modifican.

UPDATE "Movimiento" mv
SET "precioUnit" = ROUND(x.pu_ok, 6),
    "entradaBs"  = ROUND(x.pu_ok * mv."cantidad", 2)
FROM (
  SELECT
    m."id",
    ci."precioUnit" * (
      CASE
        WHEN NOT c."tieneIva" THEN 1
        WHEN COALESCE(
               c."esGasEspecial",
               (p."codigo" = '01-01-0002' AND per.mes >= DATE '2025-11-01')
               OR (p."codigo" = '01-01-0001' AND per.mes IN (DATE '2026-02-01', DATE '2026-03-01'))
             ) THEN 0.909
        ELSE 0.87
      END
    ) AS pu_ok
  FROM "Movimiento" m
  JOIN "Compra" c ON c."id" = m."referenciaId"
  JOIN "Producto" p ON p."id" = m."productoId"
  JOIN "CompraItem" ci ON ci."compraId" = c."id" AND ci."productoId" = m."productoId"
  CROSS JOIN LATERAL (
    SELECT CASE
      WHEN m."esRetroactivo" THEN make_date(m."periodoAnio", m."periodoMes", 1)
      ELSE date_trunc('month', m."createdAt")::date
    END AS mes
  ) per
  WHERE m."tipo" = 'ENTRADA'
    AND m."referencia" = 'COMPRA'
    AND c."estado" = 'ANULADA'
    AND per.mes >= DATE '2026-01-01'
    AND (
      SELECT COUNT(*) FROM "CompraItem" x
      WHERE x."compraId" = c."id" AND x."productoId" = m."productoId"
    ) = 1
) x
WHERE mv."id" = x."id"
  AND mv."precioUnit" < ROUND(x.pu_ok, 6) - 0.000002;

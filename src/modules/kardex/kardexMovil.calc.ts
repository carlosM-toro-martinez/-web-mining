import { Prisma } from "@prisma/client";

type D = Prisma.Decimal;
const Dec = Prisma.Decimal;
const CERO = new Dec(0);

export const redondearBs = (v: D): D => v.toDecimalPlaces(2, Dec.ROUND_HALF_UP);
export const redondearPrecio = (v: D): D => v.toDecimalPlaces(6, Dec.ROUND_HALF_UP);

export type EstadoKardex = { cantidad: D; valorBs: D; ultimoCpp: D };

// ENTRADA_VALOR: compra, saldo inicial, entrada manual o devolución de vale (valor conocido).
// SALIDA_CPP: vale o entrega sin vale, al CPP vigente.
// SALIDA_VALOR: reverso de una compra, al valor con que entró.
export type ReglaValor =
  | { tipo: "ENTRADA_VALOR"; valorBs: D }
  | { tipo: "SALIDA_CPP" }
  | { tipo: "SALIDA_VALOR"; valorBs: D };

export type ResultadoKardex = {
  stockAntes: D;
  stockDespues: D;
  valorAntes: D;
  valorDespues: D;
  entradaBs: D;
  salidaBs: D;
  precioUnit: D;
};

export function cppVigente(estado: EstadoKardex): D {
  return estado.cantidad.gt(0) ? redondearPrecio(estado.valorBs.div(estado.cantidad)) : estado.ultimoCpp;
}

export function aplicarMovimiento(
  estado: EstadoKardex,
  cantidad: D,
  regla: ReglaValor,
): { resultado: ResultadoKardex; estado: EstadoKardex } {
  if (cantidad.lte(0)) throw new Error("La cantidad del movimiento debe ser mayor a 0");

  const stockAntes = estado.cantidad;
  const valorAntes = estado.valorBs;
  let stockDespues: D;
  let entradaBs = CERO;
  let salidaBs = CERO;
  let precioUnit: D;

  if (regla.tipo === "ENTRADA_VALOR") {
    entradaBs = Dec.max(redondearBs(regla.valorBs), CERO);
    stockDespues = stockAntes.add(cantidad);
    precioUnit = redondearPrecio(entradaBs.div(cantidad));
  } else {
    stockDespues = stockAntes.sub(cantidad);
    const disponible = Dec.max(valorAntes, CERO);
    const cpp = cppVigente(estado);
    // Si la salida vacía el stock se lleva todo el valor restante: nunca quedan centavos sin unidades.
    const vaciaStock = stockDespues.lte(0);
    if (vaciaStock) {
      salidaBs = disponible;
    } else if (regla.tipo === "SALIDA_CPP") {
      salidaBs = Dec.min(redondearBs(cantidad.mul(cpp)), disponible);
    } else {
      salidaBs = Dec.min(Dec.max(redondearBs(regla.valorBs), CERO), disponible);
    }
    precioUnit = regla.tipo === "SALIDA_CPP" && !vaciaStock ? cpp : redondearPrecio(salidaBs.div(cantidad));
  }

  const valorDespues = valorAntes.add(entradaBs).sub(salidaBs);
  const ultimoCpp = stockDespues.gt(0)
    ? redondearPrecio(valorDespues.div(stockDespues))
    : regla.tipo === "ENTRADA_VALOR" ? precioUnit : cppVigente(estado);

  return {
    resultado: { stockAntes, stockDespues, valorAntes, valorDespues, entradaBs, salidaBs, precioUnit },
    estado: { cantidad: stockDespues, valorBs: valorDespues, ultimoCpp },
  };
}

// Mismo criterio que los reportes (sinIvaIngresoRaw): sin factura ×1, gasolina/diésel especial ×0.909, resto ×0.87.
export function factorSinIva(tieneIva: boolean, esGasEspecial: boolean): string {
  if (!tieneIva) return "1";
  return esGasEspecial ? "0.909" : "0.87";
}

export const CODIGO_GASOLINA = "01-01-0002";
export const CODIGO_DIESEL = "01-01-0001";

export function esGasEspecialCompra(
  esGasEspecial: boolean | null | undefined,
  productoCodigo: string,
  anio: number,
  mes: number,
): boolean {
  if (esGasEspecial !== null && esGasEspecial !== undefined) return esGasEspecial;
  const esEspecialMes = anio > 2025 || (anio === 2025 && mes >= 11);
  if (!esEspecialMes) return false;
  if (productoCodigo === CODIGO_GASOLINA) return true;
  return productoCodigo === CODIGO_DIESEL && anio === 2026 && (mes === 2 || mes === 3);
}

export function valorEntradaCompra(p: {
  cantidad: D;
  precioUnit: D;
  totalBs: D | null;
  cantidadPedida: D;
  tieneIva: boolean;
  esGasEspecial: boolean;
}): D {
  const base =
    p.totalBs !== null && p.cantidadPedida.gt(0)
      ? p.cantidad.eq(p.cantidadPedida)
        ? p.totalBs
        : p.totalBs.mul(p.cantidad).div(p.cantidadPedida)
      : p.cantidad.mul(p.precioUnit);
  return redondearBs(base.mul(factorSinIva(p.tieneIva, p.esGasEspecial)));
}

export function prorratearValor(totalBs: D, totalCantidad: D, cantidad: D): D {
  if (totalCantidad.lte(0)) return CERO;
  if (cantidad.gte(totalCantidad)) return totalBs;
  return redondearBs(totalBs.mul(cantidad).div(totalCantidad));
}

// Contadores de SaldoMensual en neto: una anulación resta del concepto que revierte.
export type ContadorSaldo = "INGRESO" | "ANULA_INGRESO" | "SALIDA" | "ANULA_SALIDA";

export function contadorPorMovimiento(tipo: "ENTRADA" | "SALIDA", referencia: string | null): ContadorSaldo {
  if (tipo === "ENTRADA") return referencia === "ANULACION_VALE" ? "ANULA_SALIDA" : "INGRESO";
  return referencia === "ANULACION_COMPRA" ? "ANULA_INGRESO" : "SALIDA";
}

export type AcumuladoSaldo = { ingresoQty: D; ingresosBs: D; salidaQty: D };

export function acumularSaldo(
  acc: AcumuladoSaldo,
  contador: ContadorSaldo,
  cantidad: D,
  resultado: Pick<ResultadoKardex, "entradaBs" | "salidaBs">,
): AcumuladoSaldo {
  switch (contador) {
    case "INGRESO":
      return { ...acc, ingresoQty: acc.ingresoQty.add(cantidad), ingresosBs: acc.ingresosBs.add(resultado.entradaBs) };
    case "ANULA_INGRESO":
      return { ...acc, ingresoQty: acc.ingresoQty.sub(cantidad), ingresosBs: acc.ingresosBs.sub(resultado.salidaBs) };
    case "SALIDA":
      return { ...acc, salidaQty: acc.salidaQty.add(cantidad) };
    case "ANULA_SALIDA":
      return { ...acc, salidaQty: acc.salidaQty.sub(cantidad) };
  }
}

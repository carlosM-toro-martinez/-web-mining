// Pruebas del cálculo del kardex con CPP móvil. No usa base de datos.
// Ejecutar: npx tsx scripts/cpp-movil/probar-calculo.ts
import assert from "node:assert/strict";
import { Prisma } from "@prisma/client";
import {
  aplicarMovimiento,
  acumularSaldo,
  contadorPorMovimiento,
  esGasEspecialCompra,
  prorratearValor,
  valorEntradaCompra,
  type EstadoKardex,
  type ReglaValor,
} from "../../src/modules/kardex/kardexMovil.calc.js";

const D = (v: number | string) => new Prisma.Decimal(v);
const eq = (actual: Prisma.Decimal, esperado: number | string, msg: string) =>
  assert.ok(actual.eq(D(esperado)), `${msg}: esperado ${esperado}, obtenido ${actual.toString()}`);

let pruebas = 0;
function prueba(nombre: string, fn: () => void) {
  fn();
  pruebas++;
  console.log(`ok - ${nombre}`);
}

function correr(inicial: EstadoKardex, pasos: Array<[number, ReglaValor]>) {
  let estado = inicial;
  const filas = [];
  for (const [cantidad, regla] of pasos) {
    const r = aplicarMovimiento(estado, D(cantidad), regla);
    // Cada fila del bin-card debe cuadrar: saldo anterior + entrada − salida = saldo nuevo.
    assert.ok(r.resultado.valorAntes.add(r.resultado.entradaBs).sub(r.resultado.salidaBs).eq(r.resultado.valorDespues));
    filas.push(r.resultado);
    estado = r.estado;
  }
  return { estado, filas };
}

const salida: ReglaValor = { tipo: "SALIDA_CPP" };
const entrada = (v: number): ReglaValor => ({ tipo: "ENTRADA_VALOR", valorBs: D(v) });
const reverso = (v: number): ReglaValor => ({ tipo: "SALIDA_VALOR", valorBs: D(v) });

prueba("ejemplo ANFO: vale antes de la compra se valora al CPP de ese momento", () => {
  const { estado, filas } = correr({ cantidad: D(100), valorBs: D(1000), ultimoCpp: D(10) }, [
    [90, salida],
    [10, entrada(200)],
  ]);
  eq(filas[0]!.salidaBs, 900, "salida del vale");
  eq(filas[0]!.valorDespues, 100, "saldo tras el vale");
  eq(filas[1]!.valorDespues, 300, "saldo tras la compra");
  eq(estado.cantidad, 20, "stock final");
  eq(estado.ultimoCpp, 15, "CPP final");
});

prueba("la salida que vacía el stock se lleva el residuo y el saldo queda en 0", () => {
  const { estado, filas } = correr({ cantidad: D(3), valorBs: D(10), ultimoCpp: D(0) }, [
    [1, salida],
    [1, salida],
    [1, salida],
  ]);
  eq(filas[0]!.salidaBs, "3.33", "primera salida");
  eq(filas[1]!.salidaBs, "3.34", "segunda salida");
  eq(filas[2]!.salidaBs, "3.33", "tercera salida absorbe el residuo");
  eq(estado.valorBs, 0, "valor final");
  eq(filas.reduce((a, f) => a.add(f.salidaBs), D(0)), 10, "total de salidas = valor inicial");
});

prueba("anular un vale lo revierte exactamente", () => {
  const { estado } = correr({ cantidad: D(20), valorBs: D(300), ultimoCpp: D(15) }, [
    [5, salida],
    [5, entrada(75)],
  ]);
  eq(estado.cantidad, 20, "stock");
  eq(estado.valorBs, 300, "valor");
});

prueba("anular una compra sin consumo la revierte exactamente", () => {
  const { estado } = correr({ cantidad: D(10), valorBs: D(100), ultimoCpp: D(10) }, [
    [10, entrada(200)],
    [10, reverso(200)],
  ]);
  eq(estado.cantidad, 10, "stock");
  eq(estado.valorBs, 100, "valor");
  eq(estado.ultimoCpp, 10, "CPP");
});

prueba("anular una compra ya consumida en parte retira su valor de compra", () => {
  const { estado } = correr({ cantidad: D(10), valorBs: D(100), ultimoCpp: D(10) }, [
    [10, entrada(200)],
    [5, salida],
    [10, reverso(200)],
  ]);
  eq(estado.cantidad, 5, "stock");
  eq(estado.valorBs, 25, "valor");
});

prueba("anular una compra que deja el stock en 0 o negativo nunca deja valor negativo", () => {
  const { estado, filas } = correr({ cantidad: D(10), valorBs: D(100), ultimoCpp: D(10) }, [
    [10, entrada(200)],
    [15, salida],
    [10, reverso(200)],
  ]);
  eq(filas[2]!.salidaBs, 75, "el reverso retira solo el valor que queda");
  eq(estado.valorBs, 0, "valor");
  eq(estado.cantidad, -5, "stock negativo, igual que hoy");
});

prueba("valor de compra sin IVA según el tipo de factura", () => {
  const base = { cantidad: D(10), precioUnit: D(10), totalBs: null, cantidadPedida: D(10) };
  eq(valorEntradaCompra({ ...base, tieneIva: true, esGasEspecial: false }), 87, "factura normal ×0.87");
  eq(valorEntradaCompra({ ...base, tieneIva: true, esGasEspecial: true }), "90.9", "gasolina especial ×0.909");
  eq(valorEntradaCompra({ ...base, tieneIva: false, esGasEspecial: false }), 100, "sin factura ×1");
});

prueba("si la compra tiene total de factura se usa ese total", () => {
  const p = { cantidad: D(3), precioUnit: D("33.33"), totalBs: D(100), cantidadPedida: D(3), tieneIva: true, esGasEspecial: false };
  eq(valorEntradaCompra(p), 87, "total completo");
  eq(valorEntradaCompra({ ...p, cantidad: D(1) }), 29, "recepción parcial prorrateada");
});

prueba("regla de gasolina especial igual a los reportes", () => {
  assert.equal(esGasEspecialCompra(null, "01-01-0002", 2026, 10), true);
  assert.equal(esGasEspecialCompra(null, "01-01-0002", 2025, 10), false);
  assert.equal(esGasEspecialCompra(null, "01-01-0001", 2026, 2), true);
  assert.equal(esGasEspecialCompra(null, "01-01-0001", 2026, 10), false);
  assert.equal(esGasEspecialCompra(false, "01-01-0002", 2026, 10), false);
  assert.equal(esGasEspecialCompra(true, "03-01-0001", 2026, 10), true);
});

prueba("prorrateo de anulaciones", () => {
  eq(prorratearValor(D(300), D(20), D(20)), 300, "completo");
  eq(prorratearValor(D(100), D(3), D(1)), "33.33", "parcial");
  eq(prorratearValor(D(100), D(0), D(1)), 0, "sin base");
});

prueba("contadores netos de SaldoMensual", () => {
  assert.equal(contadorPorMovimiento("ENTRADA", "COMPRA"), "INGRESO");
  assert.equal(contadorPorMovimiento("ENTRADA", "ANULACION_VALE"), "ANULA_SALIDA");
  assert.equal(contadorPorMovimiento("SALIDA", "VALE"), "SALIDA");
  assert.equal(contadorPorMovimiento("SALIDA", "ANULACION_COMPRA"), "ANULA_INGRESO");
  let acc = { ingresoQty: D(0), ingresosBs: D(0), salidaQty: D(0) };
  acc = acumularSaldo(acc, "INGRESO", D(10), { entradaBs: D(200), salidaBs: D(0) });
  acc = acumularSaldo(acc, "SALIDA", D(4), { entradaBs: D(0), salidaBs: D(60) });
  acc = acumularSaldo(acc, "ANULA_SALIDA", D(4), { entradaBs: D(60), salidaBs: D(0) });
  acc = acumularSaldo(acc, "ANULA_INGRESO", D(10), { entradaBs: D(0), salidaBs: D(200) });
  eq(acc.ingresoQty, 0, "ingresoQty");
  eq(acc.ingresosBs, 0, "ingresosBs");
  eq(acc.salidaQty, 0, "salidaQty");
});

prueba("una secuencia larga mantiene valor = Σentradas − Σsalidas", () => {
  const pasos: Array<[number, ReglaValor]> = [];
  for (let i = 1; i <= 200; i++) {
    pasos.push(i % 3 === 0 ? [7, entrada(7 * (10 + (i % 11)) * 0.87)] : [2, salida]);
  }
  const inicial = { cantidad: D(500), valorBs: D("4321.77"), ultimoCpp: D(0) };
  const { estado, filas } = correr(inicial, pasos);
  const esperado = filas.reduce((a, f) => a.add(f.entradaBs).sub(f.salidaBs), inicial.valorBs);
  assert.ok(estado.valorBs.eq(esperado));
  assert.ok(estado.valorBs.gte(0));
});

console.log(`\n${pruebas} pruebas correctas`);

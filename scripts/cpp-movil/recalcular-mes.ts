// Recalcula el kardex con CPP móvil desde un mes (inclusive) hasta hoy, para todos los productos.
// Es idempotente: se puede ejecutar varias veces.
//
//   Simulación (no escribe nada):  npx tsx scripts/cpp-movil/recalcular-mes.ts --mes 2026-10
//   Aplicar:                       npx tsx scripts/cpp-movil/recalcular-mes.ts --mes 2026-10 --aplicar
//
// Opciones:
//   --producto CODIGO        solo un producto
//   --sincronizar-cantidad   si la cantidad del kardex no coincide con Stock.cantidad, ajusta Stock.cantidad
//   --csv RUTA               archivo de detalle (por defecto cpp-movil-AAAA-MM-<modo>.csv)
import "dotenv/config";
import { writeFileSync } from "node:fs";
import { Prisma } from "@prisma/client";
import { prisma } from "../../src/config/prisma.js";
import { inicioCppMovil } from "../../src/utils/cppMovil.js";
import { recalcularKardexProducto, type ResultadoRecalculo } from "../../src/modules/kardex/kardexMovil.service.js";

const args = process.argv.slice(2);
const valorArg = (nombre: string) => {
  const i = args.indexOf(nombre);
  return i >= 0 ? args[i + 1] : undefined;
};
const tieneFlag = (nombre: string) => args.includes(nombre);

function salir(mensaje: string): never {
  console.error(`\nERROR: ${mensaje}\n`);
  process.exit(1);
}

async function main() {
  const mesArg = valorArg("--mes");
  if (!mesArg || !/^\d{4}-\d{2}$/.test(mesArg)) salir("Indica el mes con --mes AAAA-MM (ej. --mes 2026-10)");
  const aplicar = tieneFlag("--aplicar");
  const sincronizarCantidad = tieneFlag("--sincronizar-cantidad");
  const codigoFiltro = valorArg("--producto");

  if (!process.env.CPP_MOVIL_DESDE) {
    process.env.CPP_MOVIL_DESDE = mesArg;
    console.warn(`Aviso: CPP_MOVIL_DESDE no está definido; para este script se usa ${mesArg}.`);
    if (aplicar) console.warn("Aviso: recuerda definir CPP_MOVIL_DESDE en el .env de la API y reiniciarla, o las operaciones nuevas seguirán con el cálculo anterior.");
  }
  const inicio = inicioCppMovil()!;
  const [anio, mes] = mesArg.split("-").map(Number) as [number, number];
  if (anio * 100 + mes < inicio.anio * 100 + inicio.mes) {
    salir(`${mesArg} es anterior a CPP_MOVIL_DESDE (${process.env.CPP_MOVIL_DESDE})`);
  }

  const prev = mes === 1 ? { anio: anio - 1, mes: 12 } : { anio, mes: mes - 1 };
  const [cierrePrev, cierreMes] = await Promise.all([
    prisma.cierreMes.findUnique({ where: { anio_mes: prev } }),
    prisma.cierreMes.findUnique({ where: { anio_mes: { anio, mes } } }),
  ]);
  if (cierreMes) salir(`${mes}/${anio} ya está cerrado; no se puede recalcular`);
  if (!cierrePrev) {
    const msg = `${prev.mes}/${prev.anio} no está cerrado: el saldo inicial de ${mes}/${anio} todavía puede cambiar`;
    if (aplicar) salir(msg);
    console.warn(`Aviso: ${msg}`);
  }

  const inicioMes = new Date(Date.UTC(anio, mes - 1, 1));
  const [stocks, saldos, movs] = await Promise.all([
    prisma.stock.findMany({ select: { productoId: true } }),
    prisma.saldoMensual.findMany({
      where: { anio, mes },
      select: { productoId: true, saldoInicial: true, totalBsInicial: true, producto: { select: { codigo: true } } },
    }),
    prisma.movimiento.findMany({
      where: { esRetroactivo: false, createdAt: { gte: inicioMes } },
      select: { productoId: true },
      distinct: ["productoId"],
    }),
  ]);

  const sinValorInicial = saldos.filter((s) => s.totalBsInicial === null && !new Prisma.Decimal(s.saldoInicial).isZero());
  if (sinValorInicial.length > 0) {
    console.warn(
      `Aviso: ${sinValorInicial.length} productos no tienen totalBsInicial en ${mes}/${anio}; se usará saldoInicial × precio. ` +
        `Ej.: ${sinValorInicial.slice(0, 10).map((s) => s.producto.codigo).join(", ")}`,
    );
  }

  let productoIds = [...new Set([...stocks, ...saldos, ...movs].map((x) => x.productoId))].sort((a, b) => a - b);
  if (codigoFiltro) {
    const p = await prisma.producto.findUnique({ where: { codigo: codigoFiltro }, select: { id: true } });
    if (!p) salir(`Producto ${codigoFiltro} no encontrado`);
    productoIds = productoIds.filter((id) => id === p.id);
  }

  console.log(`\n${aplicar ? "APLICANDO" : "SIMULANDO"} kardex CPP móvil desde ${mes}/${anio} para ${productoIds.length} productos...\n`);

  const resultados: ResultadoRecalculo[] = [];
  const errores: Array<{ productoId: number; error: string }> = [];
  for (const [i, productoId] of productoIds.entries()) {
    try {
      resultados.push(await recalcularKardexProducto(productoId, { anio, mes }, { aplicar, sincronizarCantidad }));
    } catch (err) {
      errores.push({ productoId, error: err instanceof Error ? err.message : String(err) });
    }
    if ((i + 1) % 100 === 0) console.log(`  ${i + 1}/${productoIds.length}`);
  }

  const D = (v: string) => new Prisma.Decimal(v);
  const suma = (campo: keyof ResultadoRecalculo) => resultados.reduce((a, r) => a.add(D(String(r[campo]))), new Prisma.Decimal(0));
  const noCoinciden = resultados.filter((r) => !r.cantidadCoincide);
  const conCambios = resultados.filter((r) => r.movimientosModificados > 0);
  const noAplicados = aplicar ? resultados.filter((r) => !r.aplicado) : [];

  console.log("─".repeat(72));
  console.log(`Productos procesados:                 ${resultados.length}`);
  console.log(`Productos con movimientos revalorados: ${conCambios.length} (${conCambios.reduce((a, r) => a + r.movimientosModificados, 0)} movimientos)`);
  console.log(`Valor del inventario (Stock.valorBs):  antes ${suma("valorBsAnterior").toFixed(2)}  →  kardex ${suma("valorFinal").toFixed(2)}`);
  console.log(`Salidas del período (Bs):              antes ${suma("salidasBsAntes").toFixed(2)}  →  kardex ${suma("salidasBsDespues").toFixed(2)}`);
  console.log(`Cantidad kardex ≠ Stock.cantidad:      ${noCoinciden.length}`);
  for (const r of noCoinciden.slice(0, 30)) {
    console.log(`   ${r.codigo.padEnd(14)} kardex ${r.cantidadCadena.padStart(12)}   stock ${r.cantidadStock.padStart(12)}   ${r.nombre}`);
  }
  if (noCoinciden.length > 30) console.log(`   ... y ${noCoinciden.length - 30} más (ver CSV)`);
  if (errores.length) {
    console.log(`Errores:                               ${errores.length}`);
    for (const e of errores.slice(0, 20)) console.log(`   producto ${e.productoId}: ${e.error}`);
  }
  if (aplicar) {
    console.log(`Aplicados:                             ${resultados.length - noAplicados.length}`);
    console.log(`No aplicados:                          ${noAplicados.length}`);
    for (const r of noAplicados.slice(0, 30)) console.log(`   ${r.codigo.padEnd(14)} ${r.motivo ?? ""}`);
    if (noAplicados.some((r) => !r.cantidadCoincide)) {
      console.log("\n   Revisa esas cantidades. Si el kardex es el correcto, vuelve a ejecutar con --sincronizar-cantidad.");
    }
  } else {
    console.log("\nSimulación: no se modificó nada. Agrega --aplicar para guardar.");
  }

  const csvRuta = valorArg("--csv") ?? `cpp-movil-${mesArg}-${aplicar ? "aplicado" : "simulacion"}.csv`;
  const columnas: Array<keyof ResultadoRecalculo> = [
    "codigo", "nombre", "movimientos", "movimientosModificados", "cantidadCadena", "cantidadStock", "cantidadCoincide",
    "valorInicial", "valorFinal", "valorBsAnterior", "salidasBsAntes", "salidasBsDespues", "aplicado", "motivo",
  ];
  const escapar = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const filas = [
    columnas.join(";"),
    ...resultados.map((r) => columnas.map((c) => escapar(r[c])).join(";")),
    ...errores.map((e) => [escapar(`producto ${e.productoId}`), escapar(e.error)].join(";")),
  ];
  writeFileSync(csvRuta, filas.join("\n"), "utf8");
  console.log(`\nDetalle por producto: ${csvRuta}\n`);

  await prisma.$disconnect();
  if (errores.length > 0 || noAplicados.length > 0) process.exit(1);
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});

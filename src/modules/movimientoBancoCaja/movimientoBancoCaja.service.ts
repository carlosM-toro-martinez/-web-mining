import { prisma } from "../../config/prisma.js";
import { logger } from "../../config/logger.js";
import { HttpError } from "../../errors/http.error.js";
import { obtenerSaldoActualCuentaBancaria } from "../cuentaBancariaCaja/cuentaBancariaCaja.service.js";
import { validarNoAnteriorAlCuadre } from "../cuadreSaldo/cuadreSaldo.service.js";
import type {
  AnularMovimientoBancoCajaDTO,
  CreateMovimientoBancoCajaDTO,
  RemesaRapidaDTO,
  VincularPresupuestoDTO,
} from "./movimientoBancoCaja.types.js";
import type { Prisma } from "@prisma/client";
import type { z } from "zod";
import type { movimientoBancoCajaQuerySchema } from "./movimientoBancoCaja.schema.js";

type MovimientoBancoCajaQuery = z.infer<typeof movimientoBancoCajaQuerySchema>;
type Tx = Prisma.TransactionClient;

const INCLUDE_DETALLE = {
  cuentaBancaria: true,
  caja: true,
  presupuesto: { select: { id: true, nombre: true, anio: true, mes: true, cajaId: true } },
  fondoCaja: { select: { id: true, cajaId: true } },
} as const;

const fechaTexto = (d: Date) => d.toLocaleDateString("es-BO", { timeZone: "UTC" });
const mesTexto = (anio: number, mes: number) => `${String(mes).padStart(2, "0")}/${anio}`;

// Lo que va en la columna de cheque/referencia del Excel de la caja.
function referenciaDeIngreso(m: { formaPago: string; numeroCheque: string | null }) {
  if (m.formaPago === "CHEQUE") return `CH- ${m.numeroCheque ?? ""}`.trim();
  if (m.formaPago === "TRANSFERENCIA") return "TRANSFERENCIA";
  return "DEPÓSITO";
}

// Lo anterior al último cuadre de la caja o dentro de una rendición cerrada
// ya quedó fijo: ahí no se agrega ni se quita dinero de la caja.
async function periodoCerradoDeCaja(tx: Tx, cajaId: number, fecha: Date) {
  const [cuadre, rendicion] = await Promise.all([
    tx.cuadreSaldoCaja.findFirst({ where: { cajaId, fechaCorte: { gt: fecha } }, orderBy: { fechaCorte: "desc" } }),
    tx.rendicionCaja.findFirst({
      where: { cajaId, estado: "CERRADO", periodoDesde: { lte: fecha }, periodoHasta: { gte: fecha } },
    }),
  ]);
  if (cuadre) return `el saldo de la caja se cuadró al ${fechaTexto(cuadre.fechaCorte)}`;
  if (rendicion) return `la rendición ${rendicion.numero} ya está cerrada`;
  return null;
}

// El ingreso vinculado a una remesa es dinero de la caja de esa remesa: se
// refleja como un fondo de la caja (lo que leen el Excel, la rendición y el
// saldo). Esta función deja ese fondo en el estado correcto después de
// cualquier cambio: lo crea, lo mueve de caja o lo quita.
async function sincronizarFondo(tx: Tx, movimientoId: string, userId: number) {
  const m = await tx.movimientoBancoCaja.findUniqueOrThrow({
    where: { id: movimientoId },
    include: { presupuesto: { include: { caja: true } }, fondoCaja: true },
  });

  const caja = m.presupuesto?.caja ?? null;
  const debeTenerFondo =
    m.tipo === "INGRESO" && !m.anulado && caja !== null && !(await periodoCerradoDeCaja(tx, caja.id, m.fecha));

  if (m.fondoCaja && (!debeTenerFondo || m.fondoCaja.cajaId !== caja?.id)) {
    const cerrado = await periodoCerradoDeCaja(tx, m.fondoCaja.cajaId, m.fondoCaja.fecha);
    if (cerrado) {
      throw new HttpError(
        `No se puede: este ingreso ya es dinero de la caja del ${fechaTexto(m.fondoCaja.fecha)} y ${cerrado}.`,
        409,
      );
    }
    await tx.movimientoFondoCaja.delete({ where: { id: m.fondoCaja.id } });
  } else if (m.fondoCaja) {
    return; // ya está bien
  }

  if (debeTenerFondo && caja) {
    await tx.movimientoFondoCaja.create({
      data: {
        cajaId: caja.id,
        tipo: "REMESA_PRESUPUESTO",
        monto: m.monto,
        moneda: m.moneda,
        fecha: m.fecha,
        referencia: referenciaDeIngreso(m),
        usuarioId: userId,
        movimientoBancoId: m.id,
      },
    });
  }
}

// Reglas para que un ingreso traiga una remesa: la remesa debe ser del mismo
// mes del ingreso y estar en la moneda de su caja. Una remesa puede llegar en
// varias partes (varios ingresos a la misma remesa se suman).
async function validarRemesa(
  tx: Tx,
  presupuestoId: number,
  ingreso: { fecha: Date; moneda: string },
) {
  const presupuesto = await tx.presupuestoCaja.findUnique({ where: { id: presupuestoId }, include: { caja: true } });
  if (!presupuesto) throw new HttpError("Remesa (presupuesto) no encontrada", 404);
  if (!presupuesto.activo) throw new HttpError(`La remesa "${presupuesto.nombre}" está desactivada.`, 409);
  if (presupuesto.esPorDefecto) {
    throw new HttpError(`"${presupuesto.nombre}" es para los gastos que no estaban presupuestados: no recibe dinero del banco.`, 409);
  }
  const anio = ingreso.fecha.getUTCFullYear();
  const mes = ingreso.fecha.getUTCMonth() + 1;
  if (presupuesto.anio !== anio || presupuesto.mes !== mes) {
    throw new HttpError(
      `La remesa "${presupuesto.nombre}" es de ${mesTexto(presupuesto.anio, presupuesto.mes)} y el ingreso es del ${fechaTexto(ingreso.fecha)}. Usa o crea una remesa de ${mesTexto(anio, mes)}.`,
      409,
    );
  }
  if (presupuesto.caja.monedaBase !== ingreso.moneda) {
    throw new HttpError(
      `La remesa "${presupuesto.nombre}" es de ${presupuesto.caja.nombre} (${presupuesto.caja.monedaBase}) y el ingreso está en ${ingreso.moneda}.`,
      409,
    );
  }
  return presupuesto;
}

// Remesa creada al vuelo desde un ingreso: se llama como la descripción del
// ingreso (en mayúsculas), es del mes del ingreso y trae una sola partida
// por el monto que llegó. Si ya hay una remesa con ese nombre en ese mes y
// esa caja, se usa esa (es otra parte de la misma remesa).
async function remesaParaIngreso(
  tx: Tx,
  ingreso: { fecha: Date; monto: Prisma.Decimal | number; descripcion: string },
  cajaIdPedida: number | undefined,
  userId: number,
) {
  let cajaId = cajaIdPedida;
  if (!cajaId) {
    const cajas = await tx.cajaChica.findMany({ where: { activo: true }, select: { id: true } });
    if (cajas.length !== 1) throw new HttpError("Elige la caja a la que pertenece la remesa.", 400);
    cajaId = cajas[0]!.id;
  }
  const caja = await tx.cajaChica.findUnique({ where: { id: cajaId } });
  if (!caja) throw new HttpError("Caja chica no encontrada", 404);

  const nombre = ingreso.descripcion.trim().toUpperCase();
  const anio = ingreso.fecha.getUTCFullYear();
  const mes = ingreso.fecha.getUTCMonth() + 1;

  const existente = await tx.presupuestoCaja.findFirst({
    where: { cajaId, anio, mes, activo: true, nombre: { equals: nombre, mode: "insensitive" } },
  });
  if (existente) return existente.id;

  const creada = await tx.presupuestoCaja.create({ data: { cajaId, anio, mes, nombre, activo: true } });
  await tx.partidaPresupuestoCaja.create({
    data: { presupuestoId: creada.id, descripcion: nombre, montoPresupuestado: ingreso.monto, activo: true },
  });
  await tx.log.create({
    data: { usuarioId: userId, accion: "CREATE_PRESUPUESTO_CAJA", data: { presupuestoId: creada.id, cajaId, anio, mes, nombre, desdeIngreso: true } },
  });
  return creada.id;
}

export const movimientoBancoCajaService = {
  async getAll(query: MovimientoBancoCajaQuery) {
    const where: any = {};
    if (query.cuentaBancariaId) where.cuentaBancariaId = query.cuentaBancariaId;
    if (query.cajaId) where.cajaId = query.cajaId;
    if (query.tipo) where.tipo = query.tipo;
    if (query.fechaInicio || query.fechaFin) {
      where.fecha = {};
      if (query.fechaInicio) where.fecha.gte = query.fechaInicio;
      if (query.fechaFin) where.fecha.lte = query.fechaFin;
    }

    return prisma.movimientoBancoCaja.findMany({
      where,
      include: INCLUDE_DETALLE,
      orderBy: [{ fecha: "desc" }, { createdAt: "desc" }],
    });
  },

  // INGRESO: dinero que llega a la cuenta bancaria; siempre trae una remesa
  // (la elegida o una nueva creada con su descripción). SALIDA_A_CAJA: dinero
  // que sale del banco hacia una caja chica (cheque o transferencia/depósito).
  async create(data: CreateMovimientoBancoCajaDTO, userId: number) {
    const [cuentaBancaria, caja] = await Promise.all([
      prisma.cuentaBancariaCaja.findUnique({ where: { id: data.cuentaBancariaId } }),
      data.cajaId ? prisma.cajaChica.findUnique({ where: { id: data.cajaId } }) : null,
    ]);
    if (!cuentaBancaria) throw new HttpError("Cuenta bancaria no encontrada", 404);
    if (data.cajaId && !caja) throw new HttpError("Caja chica no encontrada", 404);
    await validarNoAnteriorAlCuadre(
      { cuentaBancariaId: data.cuentaBancariaId, fecha: data.fecha },
      "registrar un movimiento del banco",
    );

    if (data.moneda !== cuentaBancaria.monedaBase) {
      throw new HttpError(
        `La cuenta "${cuentaBancaria.nombreCuenta}" es en ${cuentaBancaria.monedaBase}; registra el movimiento en esa moneda.`,
        409,
      );
    }

    if (data.tipo === "SALIDA_A_CAJA") {
      const { saldoActual } = await obtenerSaldoActualCuentaBancaria(data.cuentaBancariaId);
      if (data.monto > saldoActual) {
        throw new HttpError(
          `Fondos insuficientes: la cuenta "${cuentaBancaria.nombreCuenta}" tiene disponible ${saldoActual.toFixed(2)} ${cuentaBancaria.monedaBase} y estás intentando sacar ${data.monto.toFixed(2)}.`,
          409,
        );
      }
    }

    const movimiento = await prisma.$transaction(async (tx) => {
      let presupuestoId: number | null = null;
      if (data.tipo === "INGRESO") {
        presupuestoId = data.presupuestoId
          ?? (await remesaParaIngreso(tx, { fecha: data.fecha, monto: data.monto, descripcion: data.descripcion }, data.nuevaRemesaCajaId, userId));
        await validarRemesa(tx, presupuestoId, { fecha: data.fecha, moneda: data.moneda });
      }

      const creado = await tx.movimientoBancoCaja.create({
        data: {
          cuentaBancariaId: data.cuentaBancariaId,
          tipo: data.tipo,
          cajaId: data.tipo === "SALIDA_A_CAJA" ? (data.cajaId ?? null) : null,
          fecha: data.fecha,
          formaPago: data.formaPago,
          numeroCheque: data.numeroCheque ?? null,
          monto: data.monto,
          moneda: data.moneda,
          depositanteNombre: data.depositanteNombre ?? null,
          descripcion: data.descripcion,
          presupuestoId,
          usuarioId: userId,
        },
      });
      await sincronizarFondo(tx, creado.id, userId);
      return tx.movimientoBancoCaja.findUniqueOrThrow({ where: { id: creado.id }, include: INCLUDE_DETALLE });
    });

    await prisma.log.create({
      data: {
        usuarioId: userId,
        accion: "CREATE_MOVIMIENTO_BANCO_CAJA",
        data: { movimientoId: movimiento.id, cajaId: data.cajaId, monto: data.monto, presupuestoId: movimiento.presupuestoId },
      },
    });
    logger.info(
      { userId, movimientoId: movimiento.id, action: "CREATE_MOVIMIENTO_BANCO_CAJA" },
      "Movimiento de banco a caja registrado",
    );

    return movimiento;
  },

  // Indica (o cambia, o quita) qué remesa trajo un ingreso ya registrado.
  async vincularPresupuesto(id: string, data: VincularPresupuestoDTO, userId: number) {
    const movimiento = await prisma.$transaction(async (tx) => {
      const actual = await tx.movimientoBancoCaja.findUnique({ where: { id } });
      if (!actual) throw new HttpError("Movimiento no encontrado", 404);
      if (actual.tipo !== "INGRESO") {
        throw new HttpError("Solo un ingreso a la cuenta se puede vincular a una remesa", 409);
      }
      if (actual.anulado) throw new HttpError("Este ingreso está anulado", 409);
      if (actual.presupuestoId === data.presupuestoId) {
        return tx.movimientoBancoCaja.findUniqueOrThrow({ where: { id }, include: INCLUDE_DETALLE });
      }

      if (data.presupuestoId) await validarRemesa(tx, data.presupuestoId, actual);
      await tx.movimientoBancoCaja.update({ where: { id }, data: { presupuestoId: data.presupuestoId } });
      await sincronizarFondo(tx, id, userId);

      return tx.movimientoBancoCaja.findUniqueOrThrow({ where: { id }, include: INCLUDE_DETALLE });
    });

    await prisma.log.create({
      data: {
        usuarioId: userId,
        accion: "VINCULAR_PRESUPUESTO_MOVIMIENTO_BANCO",
        data: { movimientoId: id, presupuestoId: data.presupuestoId },
      },
    });
    logger.info(
      { userId, movimientoId: id, presupuestoId: data.presupuestoId, action: "VINCULAR_PRESUPUESTO_MOVIMIENTO_BANCO" },
      "Remesa vinculada a un ingreso del banco",
    );

    return movimiento;
  },

  // Crea (o reutiliza) la remesa del mes con la descripción del ingreso y lo
  // vincula a ella, en un solo paso.
  async crearRemesa(id: string, data: RemesaRapidaDTO, userId: number) {
    const movimiento = await prisma.$transaction(async (tx) => {
      const actual = await tx.movimientoBancoCaja.findUnique({ where: { id } });
      if (!actual) throw new HttpError("Movimiento no encontrado", 404);
      if (actual.tipo !== "INGRESO") throw new HttpError("Solo un ingreso a la cuenta trae una remesa", 409);
      if (actual.anulado) throw new HttpError("Este ingreso está anulado", 409);

      const presupuestoId = await remesaParaIngreso(tx, actual, data.cajaId, userId);
      await validarRemesa(tx, presupuestoId, actual);
      await tx.movimientoBancoCaja.update({ where: { id }, data: { presupuestoId } });
      await sincronizarFondo(tx, id, userId);
      return tx.movimientoBancoCaja.findUniqueOrThrow({ where: { id }, include: INCLUDE_DETALLE });
    });

    await prisma.log.create({
      data: {
        usuarioId: userId,
        accion: "VINCULAR_PRESUPUESTO_MOVIMIENTO_BANCO",
        data: { movimientoId: id, presupuestoId: movimiento.presupuestoId, remesaRapida: true },
      },
    });
    logger.info(
      { userId, movimientoId: id, presupuestoId: movimiento.presupuestoId, action: "VINCULAR_PRESUPUESTO_MOVIMIENTO_BANCO" },
      "Remesa creada desde un ingreso del banco",
    );

    return movimiento;
  },

  // Anula un ingreso o una salida registrados por error (p. ej. duplicados):
  // deja de contar en el saldo del banco y, si traía una remesa, sale de la caja.
  async anular(id: string, data: AnularMovimientoBancoCajaDTO, userId: number) {
    const movimiento = await prisma.$transaction(async (tx) => {
      const actual = await tx.movimientoBancoCaja.findUnique({ where: { id } });
      if (!actual) throw new HttpError("Movimiento no encontrado", 404);
      if (actual.anulado) throw new HttpError("Este movimiento ya está anulado", 409);
      if (actual.tipo === "AJUSTE_CUADRE") {
        throw new HttpError("Un ajuste por cuadre no se anula: haz un nuevo cuadre si el saldo cambió.", 409);
      }
      await validarNoAnteriorAlCuadre(
        { cuentaBancariaId: actual.cuentaBancariaId, fecha: actual.fecha },
        "anular un movimiento del banco",
      );

      await tx.movimientoBancoCaja.update({
        where: { id },
        data: { anulado: true, motivoAnulacion: data.motivo, anuladoEn: new Date(), anuladoPorId: userId, presupuestoId: null },
      });
      await sincronizarFondo(tx, id, userId);

      await tx.log.create({
        data: {
          usuarioId: userId,
          accion: "ANULAR_MOVIMIENTO_BANCO_CAJA",
          data: {
            movimientoId: id,
            tipo: actual.tipo,
            monto: Number(actual.monto),
            fecha: actual.fecha.toISOString().slice(0, 10),
            descripcion: actual.descripcion,
            presupuestoId: actual.presupuestoId,
            motivo: data.motivo,
          },
        },
      });
      return tx.movimientoBancoCaja.findUniqueOrThrow({ where: { id }, include: INCLUDE_DETALLE });
    });

    logger.info({ userId, movimientoId: id, action: "ANULAR_MOVIMIENTO_BANCO_CAJA" }, "Movimiento del banco anulado");
    return movimiento;
  },
};

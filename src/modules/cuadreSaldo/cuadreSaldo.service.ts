import { prisma } from "../../config/prisma.js";
import { logger } from "../../config/logger.js";
import { HttpError } from "../../errors/http.error.js";
import { reportesCajaChicaService } from "../reportesCajaChica/reportesCajaChica.service.js";
import type { CreateCuadreSaldoDTO, PrevisualizarCuadreDTO } from "./cuadreSaldo.schema.js";

const redondear = (n: number) => Math.round(n * 100) / 100;
const fechaTexto = (d: Date) => d.toLocaleDateString("es-BO", { timeZone: "UTC" });

type Destino = { cajaId?: number | null | undefined; cuentaBancariaId?: number | null | undefined };

async function ultimoCuadre({ cajaId, cuentaBancariaId }: Destino) {
  if (!cajaId && !cuentaBancariaId) return null;
  return prisma.cuadreSaldoCaja.findFirst({
    where: cajaId ? { cajaId } : { cuentaBancariaId: cuentaBancariaId! },
    orderBy: { fechaCorte: "desc" },
    include: { caja: true, cuentaBancaria: true },
  });
}

// Todo lo anterior al último cuadre quedó fijado: registrarlo, anularlo o
// cambiarle monto/fecha movería el saldo que ya se cuadró.
export async function validarNoAnteriorAlCuadre(destino: Destino & { fecha: Date }, accion: string) {
  const cuadre = await ultimoCuadre(destino);
  if (cuadre && destino.fecha < cuadre.fechaCorte) {
    const donde = cuadre.caja?.nombre ?? cuadre.cuentaBancaria?.nombreCuenta ?? "";
    throw new HttpError(
      `No se puede ${accion} con fecha ${fechaTexto(destino.fecha)}: el saldo de ${donde} se cuadró al ${fechaTexto(cuadre.fechaCorte)} y todo lo anterior quedó cerrado.`,
      409,
    );
  }
}

async function calcular(data: PrevisualizarCuadreDTO) {
  if (Boolean(data.cajaId) === Boolean(data.cuentaBancariaId)) {
    throw new HttpError("Elige una caja o una cuenta bancaria (solo una)", 400);
  }
  const hoy = new Date();
  if (data.fechaCorte.getTime() > Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())) {
    throw new HttpError("La fecha del cuadre no puede ser futura", 400);
  }

  const anterior = await ultimoCuadre(data);
  if (anterior && data.fechaCorte <= anterior.fechaCorte) {
    throw new HttpError(`Ya hay un cuadre al ${fechaTexto(anterior.fechaCorte)}; el nuevo debe ser de una fecha posterior.`, 409);
  }

  if (data.cajaId) {
    const rendicionQueLoCubre = await prisma.rendicionCaja.findFirst({
      where: { cajaId: data.cajaId, estado: "CERRADO", periodoHasta: { gte: data.fechaCorte } },
    });
    if (rendicionQueLoCubre) {
      throw new HttpError(
        `La rendición ${rendicionQueLoCubre.numero} (cerrada) ya cubre esa fecha. El cuadre debe ser posterior al ${fechaTexto(rendicionQueLoCubre.periodoHasta)}.`,
        409,
      );
    }
    const estado = await reportesCajaChicaService.getEstadoCuenta(data.cajaId, data.fechaCorte);
    return { saldoSistema: redondear(estado.saldoInicial), moneda: estado.caja.monedaBase, nombre: estado.caja.nombre };
  }

  const estado = await reportesCajaChicaService.getEstadoCuentaBancaria(data.cuentaBancariaId!, data.fechaCorte);
  return {
    saldoSistema: redondear(estado.saldoInicial),
    moneda: estado.cuenta.monedaBase,
    nombre: `${estado.cuenta.banco} · ${estado.cuenta.nombreCuenta}`,
  };
}

export const cuadreSaldoService = {
  async previsualizar(data: PrevisualizarCuadreDTO) {
    const calculo = await calcular(data);
    return { ...calculo, ...(data.saldoReal !== undefined ? { diferencia: redondear(data.saldoReal - calculo.saldoSistema) } : {}) };
  },

  async create(data: CreateCuadreSaldoDTO, userId: number) {
    const { saldoSistema, moneda, nombre } = await calcular(data);
    const diferencia = redondear(data.saldoReal - saldoSistema);
    const referencia = `Ajuste por cuadre de saldo al ${fechaTexto(data.fechaCorte)}: ${data.motivo}`;

    const cuadre = await prisma.$transaction(async (tx) => {
      let movimientoFondoId: string | null = null;
      let movimientoBancoId: string | null = null;
      if (diferencia !== 0 && data.cajaId) {
        const m = await tx.movimientoFondoCaja.create({
          data: { cajaId: data.cajaId, tipo: "AJUSTE_CUADRE", monto: diferencia, moneda, fecha: data.fechaCorte, referencia, usuarioId: userId },
        });
        movimientoFondoId = m.id;
      }
      if (diferencia !== 0 && data.cuentaBancariaId) {
        const m = await tx.movimientoBancoCaja.create({
          data: {
            cuentaBancariaId: data.cuentaBancariaId,
            tipo: "AJUSTE_CUADRE",
            formaPago: "DEPOSITO",
            monto: diferencia,
            moneda,
            fecha: data.fechaCorte,
            descripcion: referencia,
            usuarioId: userId,
          },
        });
        movimientoBancoId = m.id;
      }
      const creado = await tx.cuadreSaldoCaja.create({
        data: {
          cajaId: data.cajaId ?? null,
          cuentaBancariaId: data.cuentaBancariaId ?? null,
          fechaCorte: data.fechaCorte,
          saldoSistema,
          saldoReal: data.saldoReal,
          diferencia,
          motivo: data.motivo,
          movimientoFondoId,
          movimientoBancoId,
          usuarioId: userId,
        },
      });
      await tx.log.create({
        data: {
          usuarioId: userId,
          accion: "CREATE_CUADRE_SALDO",
          data: { cuadreId: creado.id, nombre, saldoSistema, saldoReal: data.saldoReal, diferencia },
        },
      });
      return creado;
    });

    logger.info({ userId, cuadreId: cuadre.id, diferencia, action: "CREATE_CUADRE_SALDO" }, "Cuadre de saldo registrado");
    return cuadre;
  },

  async getAll() {
    return prisma.cuadreSaldoCaja.findMany({
      include: {
        caja: { select: { id: true, nombre: true, monedaBase: true } },
        cuentaBancaria: { select: { id: true, banco: true, nombreCuenta: true, monedaBase: true } },
        usuario: { select: { id: true, nombre: true } },
      },
      orderBy: { fechaCorte: "desc" },
    });
  },
};

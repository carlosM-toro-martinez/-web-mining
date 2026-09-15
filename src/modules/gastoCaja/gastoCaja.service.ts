import { prisma } from "../../config/prisma.js";
import { logger } from "../../config/logger.js";
import { HttpError } from "../../errors/http.error.js";
import type { AnularGastoCajaDTO, CreateGastoCajaDTO } from "./gastoCaja.types.js";
import type { z } from "zod";
import type { gastoCajaQuerySchema } from "./gastoCaja.schema.js";

type GastoCajaQuery = z.infer<typeof gastoCajaQuerySchema>;

const INCLUDE_DETALLE = {
  caja: true,
  centroCostoCaja: true,
  funcionGastoCaja: true,
  cuentaContableCaja: true,
  partidaPresupuesto: true,
  anulacion: true,
} as const;

async function obtenerPorcentaje(codigo: "RC_IVA" | "IUE_COMPRAS" | "IT") {
  const concepto = await prisma.conceptoRetencionCaja.findUnique({ where: { codigo } });
  if (!concepto || !concepto.activo) {
    throw new HttpError(
      `No hay una tasa activa configurada para ${codigo}. Configúrala en Parámetros de Caja Chica.`,
      409,
    );
  }
  return Number(concepto.porcentaje) / 100;
}

// Motor tributario: siempre lee las tasas desde ConceptoRetencionCaja
// (nunca hardcodeadas), así que cambiar un porcentaje después no requiere
// tocar código — igual que TarifaLiquidacion en el módulo de Logística.
//
// FACTURA            -> separa el 13% (tasa RC_IVA) como Crédito Fiscal IVA.
// CONTRATO_RETENCION
//   + SERVICIO        -> retiene RC-IVA (cuenta "RC-IVA Retenciones Servicios") + IT.
//   + COMPRA          -> retiene IUE Compras + IT.
// RECIBO_DIRECTO      -> 100% a Gastos No Deducibles, sin créditos ni retenciones.
async function calcularImpuestos(data: CreateGastoCajaDTO) {
  let montoCreditoFiscalIva = 0;
  let montoRetencionRcIva = 0;
  let montoRetencionIueCompras = 0;
  let montoRetencionIt = 0;
  let esNoDeducible = false;

  if (data.tipoDocumento === "FACTURA") {
    const tasaIva = await obtenerPorcentaje("RC_IVA");
    montoCreditoFiscalIva = Math.round(data.montoTotal * tasaIva * 100) / 100;
  } else if (data.tipoDocumento === "CONTRATO_RETENCION") {
    const tasaIt = await obtenerPorcentaje("IT");
    montoRetencionIt = Math.round(data.montoTotal * tasaIt * 100) / 100;

    if (data.categoriaRetencion === "SERVICIO") {
      const tasaRcIva = await obtenerPorcentaje("RC_IVA");
      montoRetencionRcIva = Math.round(data.montoTotal * tasaRcIva * 100) / 100;
    } else {
      const tasaIueCompras = await obtenerPorcentaje("IUE_COMPRAS");
      montoRetencionIueCompras = Math.round(data.montoTotal * tasaIueCompras * 100) / 100;
    }
  } else {
    esNoDeducible = true;
  }

  return { montoCreditoFiscalIva, montoRetencionRcIva, montoRetencionIueCompras, montoRetencionIt, esNoDeducible };
}

async function resolverCuentaNoDeducible() {
  return prisma.cuentaContableCaja.findUnique({ where: { codigo: "118.001.000" } });
}

// Una cuenta contable no es una combinación libre de centro de costo +
// función de gasto (eso ya lo cubren esos dos campos por separado): es el
// mayor contable al que se imputa el gasto según su naturaleza, y se
// resuelve solo a partir de la categoría de rendición — el usuario ya no
// la elige a mano. RECIBO_DIRECTO siempre gana e imputa a No Deducibles,
// sin importar la categoría (ver resolverCuentaNoDeducible).
const CUENTA_CODIGO_POR_CATEGORIA: Record<CreateGastoCajaDTO["categoriaRendicion"], string> = {
  MATERIALES_SUMINISTROS: "100.001.000",
  TRANSPORTES: "100.001.000",
  MANTENIMIENTO_SERVICIOS: "100.001.000",
  MEDIO_AMBIENTE: "100.001.000",
  OTROS: "100.001.000",
  ACTIVOS_FIJOS: "37.002.000",
  OBLIGACIONES_SOCIALES: "85.001.000",
  OBRAS_CONSTRUCCION: "42.002.000",
  GASTOS_ADMINISTRATIVOS: "116.001.000",
  OTROS_GASTOS_ADMINISTRATIVOS: "116.001.000",
};

async function resolverCuentaPorCategoria(categoriaRendicion: CreateGastoCajaDTO["categoriaRendicion"]) {
  const codigo = CUENTA_CODIGO_POR_CATEGORIA[categoriaRendicion];
  return prisma.cuentaContableCaja.findUnique({ where: { codigo } });
}

export const gastoCajaService = {
  async getAll(query: GastoCajaQuery) {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 20);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.cajaId) where.cajaId = query.cajaId;
    if (query.estado) where.estado = query.estado;
    if (query.fechaInicio || query.fechaFin) {
      where.fecha = {};
      if (query.fechaInicio) where.fecha.gte = query.fechaInicio;
      if (query.fechaFin) where.fecha.lte = query.fechaFin;
    }

    const [gastos, total] = await Promise.all([
      prisma.gastoCaja.findMany({
        where,
        skip,
        take: limit,
        include: { caja: true, centroCostoCaja: true, funcionGastoCaja: true, cuentaContableCaja: true, partidaPresupuesto: true },
        orderBy: { fecha: "desc" },
      }),
      prisma.gastoCaja.count({ where }),
    ]);

    return { gastos, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  },

  async getById(id: string) {
    return prisma.gastoCaja.findUnique({ where: { id }, include: INCLUDE_DETALLE });
  },

  async create(data: CreateGastoCajaDTO, userId: number) {
    const [caja, centroCosto, funcionGasto, cuentaManual, partidaPresupuesto] = await Promise.all([
      prisma.cajaChica.findUnique({ where: { id: data.cajaId } }),
      prisma.centroCostoCaja.findUnique({ where: { id: data.centroCostoCajaId } }),
      prisma.funcionGastoCaja.findUnique({ where: { id: data.funcionGastoCajaId } }),
      data.cuentaContableCajaId
        ? prisma.cuentaContableCaja.findUnique({ where: { id: data.cuentaContableCajaId } })
        : null,
      data.partidaPresupuestoId
        ? prisma.partidaPresupuestoCaja.findUnique({ where: { id: data.partidaPresupuestoId } })
        : null,
    ]);

    if (!caja) throw new HttpError("Caja chica no encontrada", 404);
    if (!centroCosto) throw new HttpError("Centro de costo no encontrado", 404);
    if (!funcionGasto) throw new HttpError("Función de gasto no encontrada", 404);
    if (data.cuentaContableCajaId && !cuentaManual) throw new HttpError("Cuenta contable no encontrada", 404);
    if (data.partidaPresupuestoId && !partidaPresupuesto) {
      throw new HttpError("Partida de presupuesto no encontrada", 404);
    }

    const impuestos = await calcularImpuestos(data);

    // La cuenta contable elegida a mano siempre gana; si no se eligió
    // ninguna, se resuelve sola a partir de la categoría de rendición
    // (RECIBO_DIRECTO siempre a Gastos No Deducibles).
    let cuentaContableCajaId = data.cuentaContableCajaId ?? null;
    if (!cuentaContableCajaId) {
      const cuentaResuelta =
        data.tipoDocumento === "RECIBO_DIRECTO"
          ? await resolverCuentaNoDeducible()
          : await resolverCuentaPorCategoria(data.categoriaRendicion);
      cuentaContableCajaId = cuentaResuelta?.id ?? null;
    }

    const gasto = await prisma.$transaction(async (tx) => {
      const creado = await tx.gastoCaja.create({
        data: {
          cajaId: data.cajaId,
          fecha: data.fecha,
          tipoDocumento: data.tipoDocumento,
          categoriaRetencion: data.categoriaRetencion ?? null,
          categoriaRendicion: data.categoriaRendicion,
          proveedorNombre: data.proveedorNombre,
          proveedorNitCi: data.proveedorNitCi ?? null,
          glosa: data.glosa,
          numeroRespaldo: data.numeroRespaldo ?? null,
          montoTotal: data.montoTotal,
          moneda: data.moneda,
          centroCostoCajaId: data.centroCostoCajaId,
          funcionGastoCajaId: data.funcionGastoCajaId,
          cuentaContableCajaId,
          partidaPresupuestoId: data.partidaPresupuestoId ?? null,
          montoCreditoFiscalIva: impuestos.montoCreditoFiscalIva,
          montoRetencionRcIva: impuestos.montoRetencionRcIva,
          montoRetencionIueCompras: impuestos.montoRetencionIueCompras,
          montoRetencionIt: impuestos.montoRetencionIt,
          esNoDeducible: impuestos.esNoDeducible,
          usuarioId: userId,
        },
        include: INCLUDE_DETALLE,
      });

      await tx.log.create({
        data: {
          usuarioId: userId,
          accion: "CREATE_GASTO_CAJA",
          data: { gastoId: creado.id, cajaId: data.cajaId, montoTotal: data.montoTotal },
        },
      });

      return creado;
    });

    logger.info({ userId, gastoId: gasto.id, action: "CREATE_GASTO_CAJA" }, "Gasto de caja registrado");

    return gasto;
  },

  async anular(id: string, data: AnularGastoCajaDTO, userId: number) {
    return prisma.$transaction(async (tx) => {
      const gasto = await tx.gastoCaja.findUnique({ where: { id } });
      if (!gasto) throw new HttpError("Gasto no encontrado", 404);
      if (gasto.estado === "ANULADO") throw new HttpError("El gasto ya está anulado", 409);
      if (gasto.estado === "RENDIDO") {
        throw new HttpError("No se puede anular un gasto ya incluido en una rendición cerrada", 409);
      }

      const actualizado = await tx.gastoCaja.update({ where: { id }, data: { estado: "ANULADO" } });

      await tx.anulacionGastoCaja.create({
        data: { gastoId: id, usuarioId: userId, motivo: data.motivo },
      });

      await tx.log.create({
        data: { usuarioId: userId, accion: "ANULAR_GASTO_CAJA", data: { gastoId: id, motivo: data.motivo } },
      });

      return actualizado;
    });
  },
};

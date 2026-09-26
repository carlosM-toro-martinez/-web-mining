import { prisma } from "../../config/prisma.js";
import { logger } from "../../config/logger.js";
import { HttpError } from "../../errors/http.error.js";
import type {
  AnularFormulario101DTO,
  ReutilizarFormulario101DTO,
  VincularFormulario101DTO,
} from "./formulario101.types.js";
import type { z } from "zod";
import type { formulario101QuerySchema } from "./formulario101.schema.js";

type Formulario101Query = z.infer<typeof formulario101QuerySchema>;

const INCLUDE_DETALLE = {
  lote: { include: { transportista: true, vehiculo: true, conocimientoCarga: true } },
  anulacion: true,
} as const;

const VALIDEZ_HORAS = 48;

function mismaFechaCalendario(a: Date, b: Date) {
  return a.toISOString().slice(0, 10) === b.toISOString().slice(0, 10);
}

export const formulario101Service = {
  async getAll(query: Formulario101Query) {
    const where: any = {};
    if (query.estado) where.estado = query.estado;
    if (query.loteId) where.loteId = query.loteId;

    return prisma.formulario101.findMany({ where, include: INCLUDE_DETALLE, orderBy: { createdAt: "desc" } });
  },

  async getById(id: string) {
    return prisma.formulario101.findUnique({ where: { id }, include: INCLUDE_DETALLE });
  },

  // Emite y vincula un F101 nuevo a un lote que todavía no tiene uno. La
  // fecha DEBE coincidir con la fecha propia del Conocimiento del lote —
  // es la condición obligatoria que pidió el usuario para el flujo normal.
  async vincular(loteId: string, data: VincularFormulario101DTO, userId: number) {
    const lote = await prisma.loteDespacho.findUnique({
      where: { id: loteId },
      include: { conocimientoCarga: true, formulario101: true },
    });
    if (!lote) throw new HttpError("Lote no encontrado", 404);
    if (lote.estadoLote === "ANULADO") throw new HttpError("El lote está anulado", 409);
    if (lote.formulario101) throw new HttpError("Este lote ya tiene un Formulario 101 vinculado", 409);
    if (!lote.conocimientoCarga) throw new HttpError("El lote no tiene Conocimiento registrado", 409);

    if (!mismaFechaCalendario(data.fecha, lote.conocimientoCarga.fecha)) {
      throw new HttpError(
        `La fecha del Formulario 101 (${data.fecha.toISOString().slice(0, 10)}) debe coincidir con la fecha del Conocimiento (${lote.conocimientoCarga.fecha.toISOString().slice(0, 10)})`,
        409,
      );
    }

    const yaExiste = await prisma.formulario101.findUnique({ where: { codigo: data.codigo } });
    if (yaExiste) {
      throw new HttpError(
        "Ya existe un Formulario 101 con ese código — si es el mismo formulario reutilizado, usa la opción 'Reutilizar' en vez de vincular uno nuevo.",
        409,
      );
    }

    const formulario101 = await prisma.formulario101.create({
      data: { codigo: data.codigo, fecha: data.fecha, estado: "VINCULADO", loteId, usuarioId: userId },
      include: INCLUDE_DETALLE,
    });

    await prisma.log.create({
      data: { usuarioId: userId, accion: "VINCULAR_FORMULARIO_101", data: { formulario101Id: formulario101.id, loteId, codigo: data.codigo } },
    });
    logger.info({ userId, formulario101Id: formulario101.id, loteId, action: "VINCULAR_FORMULARIO_101" }, "Formulario 101 vinculado");

    return formulario101;
  },

  // Reutiliza un F101 DISPONIBLE (no se usó en su lote original, o se
  // liberó por un problema) hacia otro lote — no exige que la fecha del
  // F101 coincida con la del nuevo Conocimiento (esa regla es solo para
  // el vínculo original); sí exige que sigan dentro de su validez de 48h.
  async reutilizar(formulario101Id: string, data: ReutilizarFormulario101DTO, userId: number) {
    return prisma.$transaction(async (tx) => {
      const formulario101 = await tx.formulario101.findUnique({ where: { id: formulario101Id } });
      if (!formulario101) throw new HttpError("Formulario 101 no encontrado", 404);
      if (formulario101.estado !== "DISPONIBLE") {
        throw new HttpError("Este Formulario 101 no está disponible para reutilizar", 409);
      }

      const horasTranscurridas = (Date.now() - formulario101.fecha.getTime()) / (1000 * 60 * 60);
      if (horasTranscurridas > VALIDEZ_HORAS) {
        throw new HttpError(
          `Este Formulario 101 ya superó su validez de ${VALIDEZ_HORAS} horas (emitido el ${formulario101.fecha.toISOString().slice(0, 10)})`,
          409,
        );
      }

      const lote = await tx.loteDespacho.findUnique({ where: { id: data.loteId }, include: { formulario101: true } });
      if (!lote) throw new HttpError("Lote no encontrado", 404);
      if (lote.estadoLote === "ANULADO") throw new HttpError("El lote está anulado", 409);
      if (lote.formulario101) throw new HttpError("Ese lote ya tiene un Formulario 101 vinculado", 409);

      const actualizado = await tx.formulario101.update({
        where: { id: formulario101Id },
        data: { loteId: data.loteId, estado: "VINCULADO" },
        include: INCLUDE_DETALLE,
      });

      await tx.log.create({
        data: {
          usuarioId: userId,
          accion: "REUTILIZAR_FORMULARIO_101",
          data: { formulario101Id, loteNuevoId: data.loteId },
        },
      });
      logger.info({ userId, formulario101Id, loteNuevoId: data.loteId, action: "REUTILIZAR_FORMULARIO_101" }, "Formulario 101 reutilizado en otro lote");

      return actualizado;
    });
  },

  // Anular el F101 SÍ arrastra al lote (si tiene uno vinculado): sin un
  // F101 válido esa carga no puede circular. Requiere generar y entregar
  // al Municipio una Petición de Anulación del Conocimiento asociado
  // (marcarPeticionEnviada() registra cuándo se hizo).
  async anular(id: string, data: AnularFormulario101DTO, userId: number) {
    return prisma.$transaction(async (tx) => {
      const formulario101 = await tx.formulario101.findUnique({ where: { id }, include: { lote: true } });
      if (!formulario101) throw new HttpError("Formulario 101 no encontrado", 404);
      if (formulario101.estado === "ANULADO") throw new HttpError("El Formulario 101 ya está anulado", 409);
      if (formulario101.lote?.estadoLote === "LIQUIDADO") {
        throw new HttpError("No se puede anular: el lote vinculado ya fue liquidado", 409);
      }

      await tx.formulario101.update({ where: { id }, data: { estado: "ANULADO" } });
      await tx.anulacionFormulario101.create({
        data: { formulario101Id: id, usuarioId: userId, motivo: data.motivo },
      });

      if (formulario101.loteId && formulario101.lote && formulario101.lote.estadoLote !== "ANULADO") {
        await tx.loteDespacho.update({ where: { id: formulario101.loteId }, data: { estadoLote: "ANULADO" } });
        await tx.anulacionLote.create({
          data: {
            loteId: formulario101.loteId,
            usuarioId: userId,
            motivo: `Formulario 101 (${formulario101.codigo}) anulado: ${data.motivo}`,
          },
        });
      }

      await tx.log.create({
        data: {
          usuarioId: userId,
          accion: "ANULAR_FORMULARIO_101",
          data: { formulario101Id: id, motivo: data.motivo, loteId: formulario101.loteId },
        },
      });
      logger.info({ userId, formulario101Id: id, action: "ANULAR_FORMULARIO_101" }, "Formulario 101 anulado");

      return tx.formulario101.findUniqueOrThrow({ where: { id }, include: INCLUDE_DETALLE });
    });
  },

  async marcarPeticionEnviada(id: string, userId: number) {
    const formulario101 = await prisma.formulario101.findUnique({ where: { id }, include: { anulacion: true } });
    if (!formulario101) throw new HttpError("Formulario 101 no encontrado", 404);
    if (!formulario101.anulacion) throw new HttpError("Este Formulario 101 no tiene una anulación registrada", 409);

    const anulacion = await prisma.anulacionFormulario101.update({
      where: { formulario101Id: id },
      data: { peticionEnviada: true },
    });

    await prisma.log.create({
      data: { usuarioId: userId, accion: "PETICION_ANULACION_ENVIADA", data: { formulario101Id: id } },
    });

    return anulacion;
  },
};

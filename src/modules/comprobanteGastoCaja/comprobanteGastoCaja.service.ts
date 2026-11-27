import type { z } from "zod";
import { prisma } from "../../config/prisma.js";
import { HttpError } from "../../errors/http.error.js";
import type { comprobanteGastoCajaQuerySchema } from "./comprobanteGastoCaja.schema.js";
import type { CreateComprobanteGastoCajaDTO, UpdateComprobanteGastoCajaDTO } from "./comprobanteGastoCaja.types.js";

type ComprobanteGastoCajaQuery = z.infer<typeof comprobanteGastoCajaQuerySchema>;

async function validarNombreLibre(nombre: string, propioId?: number) {
  const otro = await prisma.comprobanteGastoCaja.findFirst({
    where: { nombre: { equals: nombre, mode: "insensitive" }, ...(propioId ? { id: { not: propioId } } : {}) },
  });
  if (otro) throw new HttpError("Ya existe un comprobante con ese nombre", 409);
}

async function registrar(usuarioId: number, accion: string, data: object) {
  await prisma.log.create({ data: { usuarioId, accion, data } });
}

export const comprobanteGastoCajaService = {
  async getAll(query: ComprobanteGastoCajaQuery) {
    return prisma.comprobanteGastoCaja.findMany({
      where: query.soloActivos ? { activo: true } : {},
      orderBy: [{ orden: "asc" }, { id: "asc" }],
    });
  },

  async getById(id: number) {
    return prisma.comprobanteGastoCaja.findUnique({ where: { id } });
  },

  async create(data: CreateComprobanteGastoCajaDTO, userId: number) {
    await validarNombreLibre(data.nombre);
    const ultimo = await prisma.comprobanteGastoCaja.aggregate({ _max: { orden: true } });
    const comprobante = await prisma.comprobanteGastoCaja.create({
      data: {
        nombre: data.nombre,
        ayuda: data.ayuda || null,
        tratamiento: data.tratamiento,
        activo: data.activo ?? true,
        orden: data.orden ?? (ultimo._max.orden ?? 0) + 1,
      },
    });
    await registrar(userId, "CREATE_COMPROBANTE_GASTO_CAJA", { comprobanteId: comprobante.id, ...data });
    return comprobante;
  },

  async update(id: number, data: UpdateComprobanteGastoCajaDTO, userId: number) {
    const existente = await prisma.comprobanteGastoCaja.findUnique({
      where: { id },
      include: { _count: { select: { gastos: true } } },
    });
    if (!existente) throw new HttpError("Comprobante no encontrado", 404);
    if (data.nombre) await validarNombreLibre(data.nombre, id);
    // Cambiar los impuestos de un comprobante ya usado dejaría gastos viejos
    // calculados de otra forma.
    if (data.tratamiento && data.tratamiento !== existente.tratamiento && existente._count.gastos > 0) {
      throw new HttpError(
        "Este comprobante ya tiene gastos registrados: no se pueden cambiar sus impuestos. Crea uno nuevo y desactiva este.",
        409,
      );
    }
    const cleanData = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)) as any;
    const comprobante = await prisma.comprobanteGastoCaja.update({ where: { id }, data: cleanData });
    await registrar(userId, "UPDATE_COMPROBANTE_GASTO_CAJA", { comprobanteId: id, ...cleanData });
    return comprobante;
  },

  async remove(id: number, userId: number) {
    const enUso = await prisma.gastoCaja.count({ where: { comprobanteId: id } });
    if (enUso > 0) {
      throw new HttpError(`No se puede eliminar: ${enUso} gasto(s) lo usan. Desactívalo para que no aparezca más.`, 409);
    }
    await prisma.comprobanteGastoCaja.delete({ where: { id } });
    await registrar(userId, "DELETE_COMPROBANTE_GASTO_CAJA", { comprobanteId: id });
  },
};

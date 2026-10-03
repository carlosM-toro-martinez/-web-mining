import { prisma } from "../../config/prisma.js";
import type {
  CambiarEstadoVehiculoDTO,
  CreateVehiculoDTO,
  UpdateVehiculoDTO,
} from "./vehiculo.types.js";
import type { z } from "zod";
import type { vehiculoQuerySchema } from "./vehiculo.schema.js";
import { logger } from "../../config/logger.js";
import { HttpError } from "../../errors/http.error.js";

type VehiculoQuery = z.infer<typeof vehiculoQuerySchema>;

export const vehiculoService = {
  // Devuelve la lista completa (con su estadoActual); el frontend agrupa
  // por columna del tablero — no hace falta un endpoint de agregación aparte.
  async getAll(query: VehiculoQuery) {
    const where: any = {};

    if (query.search) {
      where.OR = [
        { placa: { contains: String(query.search), mode: "insensitive" as const } },
        { tipo: { contains: String(query.search), mode: "insensitive" as const } },
      ];
    }

    if (query.estadoActual) where.estadoActual = query.estadoActual;
    if (query.soloActivos) where.activo = true;

    return prisma.vehiculo.findMany({
      where,
      include: { propietario: true },
      orderBy: { placa: "asc" },
    });
  },

  async getById(id: number) {
    return prisma.vehiculo.findUnique({
      where: { id },
      include: {
        propietario: true,
        historialEstados: { orderBy: { createdAt: "desc" }, take: 20 },
      },
    });
  },

  async getHistorialEstados(id: number) {
    return prisma.estadoFlotaHistorico.findMany({
      where: { vehiculoId: id },
      orderBy: { createdAt: "desc" },
    });
  },

  async create(data: CreateVehiculoDTO, userId: number) {
    if (data.propietarioId) {
      const transportista = await prisma.transportista.findUnique({ where: { id: data.propietarioId } });
      if (!transportista) throw new HttpError("Transportista propietario no encontrado", 404);
    }

    const vehiculo = await prisma.$transaction(async (tx) => {
      const creado = await tx.vehiculo.create({
        data: {
          placa: data.placa.toUpperCase(),
          tipo: data.tipo,
          capacidadTon: data.capacidadTon,
          propietarioId: data.propietarioId ?? null,
          activo: data.activo ?? true,
        },
      });

      await tx.estadoFlotaHistorico.create({
        data: {
          vehiculoId: creado.id,
          estado: "DISPONIBLE",
          motivo: "Alta de vehículo",
          origenCambio: "MANUAL",
          usuarioId: userId,
        },
      });

      return creado;
    });

    await prisma.log.create({
      data: { usuarioId: userId, accion: "CREATE_VEHICULO", data: { vehiculoId: vehiculo.id, ...data } },
    });

    logger.info({ userId, vehiculoId: vehiculo.id, action: "CREATE_VEHICULO" }, "Vehículo creado");

    return vehiculo;
  },

  async update(id: number, data: UpdateVehiculoDTO, userId: number) {
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== undefined),
    ) as any;

    if (cleanData.placa) {
      cleanData.placa = String(cleanData.placa).toUpperCase();
    }

    const vehiculo = await prisma.vehiculo.update({ where: { id }, data: cleanData });

    await prisma.log.create({
      data: { usuarioId: userId, accion: "UPDATE_VEHICULO", data: { vehiculoId: id, ...cleanData } },
    });

    logger.info({ userId, vehiculoId: id, action: "UPDATE_VEHICULO" }, "Vehículo actualizado");

    return vehiculo;
  },

  // Cambio de estado del tablero Kanban: siempre queda registrado en el
  // historial, sin restringir transiciones (el tablero es manual/operativo,
  // el humano decide y puede corregir moviendo la tarjeta a cualquier columna)
  // — EXCEPTO entrar a EN_TRANSITO/EN_BALANZA: esos dos estados solo los debe
  // asignar el flujo real de un lote (create()/avanzarEstado() en
  // loteDespacho.service.ts), nunca un arrastre manual sin lote detrás. Sin
  // este freno, arrastrar la tarjeta a esas columnas dejaba el vehículo
  // mostrando "En balanza"/"En tránsito" sin ningún lote real asociado, y ya
  // no había forma de encontrar el lote para completar/revisar nada — un
  // callejón sin salida que solo se podía corregir a mano en la base de
  // datos. Salir DE esos estados hacia cualquier otro sigue permitido (es
  // justo la forma de corregir un vehículo que ya quedó atascado así).
  async cambiarEstado(id: number, data: CambiarEstadoVehiculoDTO, userId: number) {
    if (data.estado === "EN_TRANSITO" || data.estado === "EN_BALANZA") {
      const nombreEstado = data.estado === "EN_TRANSITO" ? "En tránsito" : "En balanza";
      throw new HttpError(
        `No se puede mover un vehículo a "${nombreEstado}" directamente desde Flota — ese estado lo asigna automáticamente un lote de despacho real (créalo o avanza su estado desde Logística/Lotes).`,
        409,
      );
    }

    return prisma.$transaction(async (tx) => {
      const vehiculo = await tx.vehiculo.findUnique({ where: { id } });
      if (!vehiculo) throw new HttpError("Vehículo no encontrado", 404);

      const actualizado = await tx.vehiculo.update({
        where: { id },
        data: { estadoActual: data.estado },
      });

      await tx.estadoFlotaHistorico.create({
        data: {
          vehiculoId: id,
          estado: data.estado,
          motivo: data.motivo ?? null,
          origenCambio: "MANUAL",
          usuarioId: userId,
        },
      });

      await tx.log.create({
        data: {
          usuarioId: userId,
          accion: "CAMBIAR_ESTADO_VEHICULO",
          data: { vehiculoId: id, estadoAnterior: vehiculo.estadoActual, estadoNuevo: data.estado },
        },
      });

      return actualizado;
    });
  },
};

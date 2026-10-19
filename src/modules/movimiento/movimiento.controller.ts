import type { Response } from "express";
import { prisma } from "../../config/prisma.js";
import type { AuthRequest } from "../../middleware/auth.middleware.js";
import { HttpError } from "../../errors/http.error.js";
import { movimientoService } from "./movimiento.service.js";
import { reconstruirCadenaMes } from "../kardex/binCardCadena.js";

export const movimientoController = {
  async createSalida(req: AuthRequest, res: Response) {
    try {
      const data = await movimientoService.createSalida(req.body, req.user!.id);
      res.status(201).json({ success: true, data });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 400;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async createEntrada(req: AuthRequest, res: Response) {
    try {
      const data = await movimientoService.createEntrada(req.body, req.user!.id);
      res.status(201).json({ success: true, data });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 400;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async reconstruirCadena(req: AuthRequest, res: Response) {
    try {
      const { productoId, anio, mes, aplicar } = (req.body ?? {}) as { productoId?: unknown; anio?: unknown; mes?: unknown; aplicar?: unknown };
      const anioN = Number(anio);
      const mesN = Number(mes);
      if (!Number.isInteger(anioN) || anioN < 2000 || anioN > 2100 || !Number.isInteger(mesN) || mesN < 1 || mesN > 12) {
        res.status(400).json({ success: false, error: "anio y mes son requeridos y deben ser válidos." });
        return;
      }
      const pid = productoId === undefined || productoId === null || productoId === "" ? undefined : Number(productoId);
      if (pid !== undefined && (!Number.isInteger(pid) || pid <= 0)) {
        res.status(400).json({ success: false, error: "productoId no es válido." });
        return;
      }
      const data = await reconstruirCadenaMes({
        anio: anioN,
        mes: mesN,
        ...(pid !== undefined ? { productoId: pid } : {}),
        aplicar: aplicar === true,
      });
      if (data.aplicar) {
        await prisma.log.create({
          data: {
            usuarioId: req.user!.id,
            accion: "RECONSTRUIR_CADENA_BINCARD",
            data: { anio: anioN, mes: mesN, productoId: pid ?? null, productosAplicados: data.productosAplicados, filasModificadas: data.filasModificadas },
          },
        });
      }
      res.status(200).json({ success: true, data });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 400;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },
};

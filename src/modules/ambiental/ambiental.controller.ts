import type { Response } from "express";
import type { AuthRequest } from "../../middleware/auth.middleware.js";
import { ambientalService } from "./ambiental.service.js";
import { HttpError } from "../../errors/http.error.js";
import {
  puntosQuerySchema,
  crearPuntoSchema,
  actualizarPuntoSchema,
  registrosHidricosQuerySchema,
  crearRegistroHidricoSchema,
  registrosResiduoQuerySchema,
  crearRegistroResiduoSchema,
  registrosRuidoQuerySchema,
  crearRegistroRuidoSchema,
  registrosSueloQuerySchema,
  crearRegistroSueloSchema,
  pozosQuerySchema,
  crearPozoSchema,
  actualizarPozoSchema,
  manifiestoQuerySchema,
  crearManifiestoSchema,
  actualizarManifiestoSchema,
} from "./ambiental.schema.js";

function handleError(error: unknown, res: Response) {
  if (error instanceof HttpError) return res.status(error.statusCode).json({ success: false, error: error.message });
  console.error(error);
  return res.status(500).json({ success: false, error: "Error interno del servidor" });
}

export const ambientalController = {

  // ── Dashboard ─────────────────────────────────────────────────────────────
  async getDashboard(_req: AuthRequest, res: Response) {
    try {
      const data = await ambientalService.getDashboard();
      res.json({ success: true, data });
    } catch (error) { handleError(error, res); }
  },

  // ── Mapa ──────────────────────────────────────────────────────────────────
  async getMapaAmbiental(_req: AuthRequest, res: Response) {
    try {
      const data = await ambientalService.getMapaAmbiental();
      res.json({ success: true, data });
    } catch (error) { handleError(error, res); }
  },

  // ── Puntos de Monitoreo ───────────────────────────────────────────────────
  async getPuntos(req: AuthRequest, res: Response) {
    try {
      const query = puntosQuerySchema.parse(req.query);
      const data  = await ambientalService.getPuntos(query);
      res.json({ success: true, data });
    } catch (error) { handleError(error, res); }
  },

  async createPunto(req: AuthRequest, res: Response) {
    try {
      const body = crearPuntoSchema.parse(req.body);
      const data = await ambientalService.createPunto(body);
      res.status(201).json({ success: true, data });
    } catch (error) { handleError(error, res); }
  },

  async updatePunto(req: AuthRequest, res: Response) {
    try {
      const id   = Number(req.params["id"]);
      const body = actualizarPuntoSchema.parse(req.body);
      const data = await ambientalService.updatePunto(id, body);
      res.json({ success: true, data });
    } catch (error) { handleError(error, res); }
  },

  async deletePunto(req: AuthRequest, res: Response) {
    try {
      const id = Number(req.params["id"]);
      await ambientalService.deletePunto(id);
      res.json({ success: true, message: "Punto desactivado" });
    } catch (error) { handleError(error, res); }
  },

  // ── Registros Hídricos ────────────────────────────────────────────────────
  async getRegistrosHidricos(req: AuthRequest, res: Response) {
    try {
      const query = registrosHidricosQuerySchema.parse(req.query);
      const data  = await ambientalService.getRegistrosHidricos(query);
      res.json({ success: true, data });
    } catch (error) { handleError(error, res); }
  },

  async createRegistroHidrico(req: AuthRequest, res: Response) {
    try {
      const body      = crearRegistroHidricoSchema.parse(req.body);
      const usuarioId = req.user!.id;
      const data      = await ambientalService.createRegistroHidrico(body, usuarioId);
      res.status(201).json({ success: true, data });
    } catch (error) { handleError(error, res); }
  },

  async deleteRegistroHidrico(req: AuthRequest, res: Response) {
    try {
      const id = Number(req.params["id"]);
      await ambientalService.deleteRegistroHidrico(id);
      res.json({ success: true, message: "Registro eliminado" });
    } catch (error) { handleError(error, res); }
  },

  // ── Registros Residuos ────────────────────────────────────────────────────
  async getRegistrosResiduo(req: AuthRequest, res: Response) {
    try {
      const query = registrosResiduoQuerySchema.parse(req.query);
      const data  = await ambientalService.getRegistrosResiduo(query);
      res.json({ success: true, data });
    } catch (error) { handleError(error, res); }
  },

  async createRegistroResiduo(req: AuthRequest, res: Response) {
    try {
      const body      = crearRegistroResiduoSchema.parse(req.body);
      const usuarioId = req.user!.id;
      const data      = await ambientalService.createRegistroResiduo(body, usuarioId);
      res.status(201).json({ success: true, data });
    } catch (error) { handleError(error, res); }
  },

  async deleteRegistroResiduo(req: AuthRequest, res: Response) {
    try {
      const id = Number(req.params["id"]);
      await ambientalService.deleteRegistroResiduo(id);
      res.json({ success: true, message: "Registro eliminado" });
    } catch (error) { handleError(error, res); }
  },

  // ── Registros Ruido ───────────────────────────────────────────────────────
  async getRegistrosRuido(req: AuthRequest, res: Response) {
    try {
      const query = registrosRuidoQuerySchema.parse(req.query);
      const data  = await ambientalService.getRegistrosRuido(query);
      res.json({ success: true, data });
    } catch (error) { handleError(error, res); }
  },

  async createRegistroRuido(req: AuthRequest, res: Response) {
    try {
      const body      = crearRegistroRuidoSchema.parse(req.body);
      const usuarioId = req.user!.id;
      const data      = await ambientalService.createRegistroRuido(body, usuarioId);
      res.status(201).json({ success: true, data });
    } catch (error) { handleError(error, res); }
  },

  async deleteRegistroRuido(req: AuthRequest, res: Response) {
    try {
      const id = Number(req.params["id"]);
      await ambientalService.deleteRegistroRuido(id);
      res.json({ success: true, message: "Registro eliminado" });
    } catch (error) { handleError(error, res); }
  },

  // ── Registros Suelo ───────────────────────────────────────────────────────
  async getRegistrosSuelo(req: AuthRequest, res: Response) {
    try {
      const query = registrosSueloQuerySchema.parse(req.query);
      const data  = await ambientalService.getRegistrosSuelo(query);
      res.json({ success: true, data });
    } catch (error) { handleError(error, res); }
  },

  async createRegistroSuelo(req: AuthRequest, res: Response) {
    try {
      const body      = crearRegistroSueloSchema.parse(req.body);
      const usuarioId = req.user!.id;
      const data      = await ambientalService.createRegistroSuelo(body, usuarioId);
      res.status(201).json({ success: true, data });
    } catch (error) { handleError(error, res); }
  },

  async deleteRegistroSuelo(req: AuthRequest, res: Response) {
    try {
      const id = Number(req.params["id"]);
      await ambientalService.deleteRegistroSuelo(id);
      res.json({ success: true, message: "Registro eliminado" });
    } catch (error) { handleError(error, res); }
  },

  // ── Pozos Sépticos ────────────────────────────────────────────────────────
  async getPozos(req: AuthRequest, res: Response) {
    try {
      const query = pozosQuerySchema.parse(req.query);
      const data  = await ambientalService.getPozos(query);
      res.json({ success: true, data });
    } catch (error) { handleError(error, res); }
  },

  async createPozo(req: AuthRequest, res: Response) {
    try {
      const body = crearPozoSchema.parse(req.body);
      const data = await ambientalService.createPozo(body);
      res.status(201).json({ success: true, data });
    } catch (error) { handleError(error, res); }
  },

  async updatePozo(req: AuthRequest, res: Response) {
    try {
      const id   = Number(req.params["id"]);
      const body = actualizarPozoSchema.parse(req.body);
      const data = await ambientalService.updatePozo(id, body);
      res.json({ success: true, data });
    } catch (error) { handleError(error, res); }
  },

  async deletePozo(req: AuthRequest, res: Response) {
    try {
      const id = Number(req.params["id"]);
      await ambientalService.deletePozo(id);
      res.json({ success: true, message: "Pozo séptico desactivado" });
    } catch (error) { handleError(error, res); }
  },

  // ── Manifiestos Ambientales ───────────────────────────────────────────────
  async getManifiestos(req: AuthRequest, res: Response) {
    try {
      const query = manifiestoQuerySchema.parse(req.query);
      const data  = await ambientalService.getManifiestos(query);
      res.json({ success: true, data });
    } catch (error) { handleError(error, res); }
  },

  async createManifiesto(req: AuthRequest, res: Response) {
    try {
      const body      = crearManifiestoSchema.parse(req.body);
      const usuarioId = req.user!.id;
      const data      = await ambientalService.createManifiesto(body, usuarioId);
      res.status(201).json({ success: true, data });
    } catch (error) { handleError(error, res); }
  },

  async updateManifiesto(req: AuthRequest, res: Response) {
    try {
      const id   = Number(req.params["id"]);
      const body = actualizarManifiestoSchema.parse(req.body);
      const data = await ambientalService.updateManifiesto(id, body);
      res.json({ success: true, data });
    } catch (error) { handleError(error, res); }
  },

  async deleteManifiesto(req: AuthRequest, res: Response) {
    try {
      const id = Number(req.params["id"]);
      await ambientalService.deleteManifiesto(id);
      res.json({ success: true, message: "Manifiesto eliminado" });
    } catch (error) { handleError(error, res); }
  },
};

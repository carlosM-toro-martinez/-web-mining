import type { Request, Response } from "express";
import { eppService } from "./epp.service.js";
import {
  crearAsignacionSchema,
  actualizarAsignacionSchema,
  asignacionesQuerySchema,
  productosEppQuerySchema,
  trabajadoresQuerySchema,
} from "./epp.schema.js";
import { HttpError } from "../../errors/http.error.js";

export const eppController = {

  // GET /epp/productos
  async getProductosEpp(req: Request, res: Response) {
    try {
      const query = productosEppQuerySchema.parse(req.query);
      const result = await eppService.getProductosEpp(query);
      res.json({ success: true, data: result });
    } catch (error) {
      if (error instanceof HttpError) return res.status(error.statusCode).json({ success: false, error: error.message });
      res.status(500).json({ success: false, error: "Error interno del servidor" });
    }
  },

  // GET /epp/asignaciones
  async getAsignaciones(req: Request, res: Response) {
    try {
      const query = asignacionesQuerySchema.parse(req.query);
      const result = await eppService.getAsignaciones(query);
      res.json({ success: true, data: result });
    } catch (error) {
      if (error instanceof HttpError) return res.status(error.statusCode).json({ success: false, error: error.message });
      res.status(500).json({ success: false, error: "Error interno del servidor" });
    }
  },

  // GET /epp/productos/:productoId/historial
  async getHistorialProducto(req: Request, res: Response) {
    try {
      const productoId = Number(req.params["productoId"]);
      if (!productoId) return res.status(400).json({ success: false, error: "productoId inválido" });
      const result = await eppService.getHistorialProducto(productoId);
      res.json({ success: true, data: result });
    } catch (error) {
      if (error instanceof HttpError) return res.status(error.statusCode).json({ success: false, error: error.message });
      res.status(500).json({ success: false, error: "Error interno del servidor" });
    }
  },

  // GET /epp/trabajadores
  async getTrabajadoresConEpp(req: Request, res: Response) {
    try {
      const query = trabajadoresQuerySchema.parse(req.query);
      const result = await eppService.getTrabajadoresConEpp(query);
      res.json({ success: true, data: result });
    } catch (error) {
      if (error instanceof HttpError) return res.status(error.statusCode).json({ success: false, error: error.message });
      res.status(500).json({ success: false, error: "Error interno del servidor" });
    }
  },

  // GET /epp/trabajadores/:usuarioId/reporte
  async getReporteTrabajador(req: Request, res: Response) {
    try {
      const usuarioId = Number(req.params["usuarioId"]);
      if (!usuarioId) return res.status(400).json({ success: false, error: "usuarioId inválido" });
      const result = await eppService.getReporteTrabajador(usuarioId);
      res.json({ success: true, data: result });
    } catch (error) {
      if (error instanceof HttpError) return res.status(error.statusCode).json({ success: false, error: error.message });
      res.status(500).json({ success: false, error: "Error interno del servidor" });
    }
  },

  // POST /epp/asignaciones
  async createAsignacion(req: Request, res: Response) {
    try {
      const data = crearAsignacionSchema.parse(req.body);
      const result = await eppService.createAsignacion(data);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      if (error instanceof HttpError) return res.status(error.statusCode).json({ success: false, error: error.message });
      res.status(500).json({ success: false, error: "Error interno del servidor" });
    }
  },

  // PATCH /epp/asignaciones/:id
  async updateAsignacion(req: Request, res: Response) {
    try {
      const id   = req.params["id"] as string;
      const data = actualizarAsignacionSchema.parse(req.body);
      const result = await eppService.updateAsignacion(id, data);
      res.json({ success: true, data: result });
    } catch (error) {
      if (error instanceof HttpError) return res.status(error.statusCode).json({ success: false, error: error.message });
      res.status(500).json({ success: false, error: "Error interno del servidor" });
    }
  },

  // DELETE /epp/asignaciones/:id
  async deleteAsignacion(req: Request, res: Response) {
    try {
      const id = req.params["id"] as string;
      await eppService.deleteAsignacion(id);
      res.json({ success: true, message: "Asignación eliminada" });
    } catch (error) {
      if (error instanceof HttpError) return res.status(error.statusCode).json({ success: false, error: error.message });
      res.status(500).json({ success: false, error: "Error interno del servidor" });
    }
  },
};

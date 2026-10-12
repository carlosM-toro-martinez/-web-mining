import type { Response } from "express";
import { z } from "zod";
import type { AuthRequest } from "../../middleware/auth.middleware.js";
import { PERMISOS_CATALOGO } from "./permisos.catalogo.js";
import {
  listarRoles, opcionesRoles, obtenerRol, crearRol, actualizarRol,
  actualizarPermisosRol, eliminarRol, misPermisos,
} from "./roles.service.js";

const crearRolSchema = z.object({
  nombre:      z.string().trim().min(2).max(60),
  codigo:      z.string().trim().max(50).optional(),
  descripcion: z.string().max(300).nullable().optional(),
});

const actualizarRolSchema = z.object({
  nombre:      z.string().trim().min(2).max(60).optional(),
  descripcion: z.string().max(300).nullable().optional(),
  activo:      z.boolean().optional(),
});

const permisosSchema = z.object({
  permisos: z.array(z.object({
    recurso: z.string().min(1),
    accion:  z.string().min(1),
  })),
});

const idSchema = z.coerce.number().int().positive();

export const rolesController = {
  async catalogo(_req: AuthRequest, res: Response) {
    res.json({ success: true, data: PERMISOS_CATALOGO });
  },

  async misPermisos(req: AuthRequest, res: Response) {
    res.json({ success: true, data: await misPermisos(req.user!.id) });
  },

  async opciones(_req: AuthRequest, res: Response) {
    res.json({ success: true, data: await opcionesRoles() });
  },

  async listar(_req: AuthRequest, res: Response) {
    res.json({ success: true, data: await listarRoles() });
  },

  async obtener(req: AuthRequest, res: Response) {
    const id = idSchema.safeParse(req.params["id"]);
    if (!id.success) return res.status(400).json({ success: false, error: "ID inválido" });
    res.json({ success: true, data: await obtenerRol(id.data) });
  },

  async crear(req: AuthRequest, res: Response) {
    const parsed = crearRolSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.flatten() });
    res.status(201).json({ success: true, data: await crearRol(parsed.data) });
  },

  async actualizar(req: AuthRequest, res: Response) {
    const id = idSchema.safeParse(req.params["id"]);
    if (!id.success) return res.status(400).json({ success: false, error: "ID inválido" });
    const parsed = actualizarRolSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.flatten() });
    res.json({ success: true, data: await actualizarRol(id.data, parsed.data) });
  },

  async actualizarPermisos(req: AuthRequest, res: Response) {
    const id = idSchema.safeParse(req.params["id"]);
    if (!id.success) return res.status(400).json({ success: false, error: "ID inválido" });
    const parsed = permisosSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.flatten() });
    res.json({ success: true, data: await actualizarPermisosRol(id.data, parsed.data.permisos) });
  },

  async eliminar(req: AuthRequest, res: Response) {
    const id = idSchema.safeParse(req.params["id"]);
    if (!id.success) return res.status(400).json({ success: false, error: "ID inválido" });
    await eliminarRol(id.data);
    res.json({ success: true });
  },
};

import type { Response } from "express";
import type { AuthRequest } from "../../middleware/auth.middleware.js";
import { z } from "zod";
import type { AusenciaTipo } from "@prisma/client";
import {
  crearHorario, listarHorarios, obtenerHorario, actualizarHorario, eliminarHorario,
  asignarHorario, horarioActualEmpleado, historialHorariosEmpleado, eliminarAsignacion,
  crearAusencia, listarAusencias, actualizarAusencia, eliminarAusencia,
  generarReporte,
} from "./personal.service.js";

// ─── Schemas de validación ────────────────────────────────────────────────────

const horarioSchema = z.object({
  nombre:      z.string().min(1),
  descripcion: z.string().optional(),
  horaEntrada: z.string().regex(/^\d{2}:\d{2}$/, "Formato HH:MM"),
  horaSalida:  z.string().regex(/^\d{2}:\d{2}$/, "Formato HH:MM"),
  tolerancia:  z.coerce.number().int().min(0).max(120).optional(),
  lunes:    z.boolean().optional(), martes:   z.boolean().optional(),
  miercoles:z.boolean().optional(), jueves:   z.boolean().optional(),
  viernes:  z.boolean().optional(), sabado:   z.boolean().optional(),
  domingo:  z.boolean().optional(),
});

const asignacionSchema = z.object({
  employeeId: z.coerce.number().int().positive(),
  horarioId:  z.coerce.number().int().positive(),
  desde:      z.coerce.date(),
});

const AUSENCIA_TIPOS = ["VACACION","DESCANSO","PERMISO","ENFERMEDAD","FERIADO","OTRO"] as const;

const ausenciaSchema = z.object({
  employeeId: z.coerce.number().int().positive(),
  tipo:       z.enum(AUSENCIA_TIPOS),
  desde:      z.coerce.date(),
  hasta:      z.coerce.date(),
  motivo:     z.string().optional(),
  aprobado:   z.boolean().optional(),
  creadoPor:  z.string().optional(),
});

// ─── Controller ───────────────────────────────────────────────────────────────

export const personalController = {

  // ── Horarios ──────────────────────────────────────────────────────────────

  async listarHorarios(_req: AuthRequest, res: Response) {
    const data = await listarHorarios();
    res.json({ success: true, data });
  },

  async obtenerHorario(req: AuthRequest, res: Response) {
    const data = await obtenerHorario(Number(req.params["id"]));
    res.json({ success: true, data });
  },

  async crearHorario(req: AuthRequest, res: Response) {
    const parsed = horarioSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.flatten() });
    const data = await crearHorario(parsed.data);
    res.status(201).json({ success: true, data });
  },

  async actualizarHorario(req: AuthRequest, res: Response) {
    const parsed = horarioSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.flatten() });
    const data = await actualizarHorario(Number(req.params["id"]), parsed.data);
    res.json({ success: true, data });
  },

  async eliminarHorario(req: AuthRequest, res: Response) {
    await eliminarHorario(Number(req.params["id"]));
    res.json({ success: true });
  },

  // ── Asignaciones ──────────────────────────────────────────────────────────

  async asignarHorario(req: AuthRequest, res: Response) {
    const parsed = asignacionSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.flatten() });
    const data = await asignarHorario(parsed.data.employeeId, parsed.data.horarioId, parsed.data.desde);
    res.status(201).json({ success: true, data });
  },

  async horarioActualEmpleado(req: AuthRequest, res: Response) {
    const data = await horarioActualEmpleado(Number(req.params["id"]));
    res.json({ success: true, data: data ?? null });
  },

  async historialHorariosEmpleado(req: AuthRequest, res: Response) {
    const data = await historialHorariosEmpleado(Number(req.params["id"]));
    res.json({ success: true, data });
  },

  async eliminarAsignacion(req: AuthRequest, res: Response) {
    await eliminarAsignacion(Number(req.params["id"]));
    res.json({ success: true });
  },

  // ── Ausencias ─────────────────────────────────────────────────────────────

  async crearAusencia(req: AuthRequest, res: Response) {
    const parsed = ausenciaSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.flatten() });
    const data = await crearAusencia(parsed.data);
    res.status(201).json({ success: true, data });
  },

  async listarAusencias(req: AuthRequest, res: Response) {
    const q = req.query;
    const data = await listarAusencias({
      employeeId: q["empleadoId"] ? Number(q["empleadoId"]) : undefined,
      tipo:       q["tipo"] as AusenciaTipo | undefined,
      desde:      q["desde"] ? new Date(String(q["desde"])) : undefined,
      hasta:      q["hasta"] ? new Date(String(q["hasta"]))  : undefined,
      aprobado:   q["aprobado"] !== undefined ? q["aprobado"] === "true" : undefined,
      page:       q["page"]  ? Number(q["page"])  : undefined,
      limit:      q["limit"] ? Number(q["limit"]) : undefined,
    });
    res.json({ success: true, ...data });
  },

  async actualizarAusencia(req: AuthRequest, res: Response) {
    const parsed = ausenciaSchema.omit({ employeeId: true }).partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.flatten() });
    const data = await actualizarAusencia(Number(req.params["id"]), parsed.data);
    res.json({ success: true, data });
  },

  async eliminarAusencia(req: AuthRequest, res: Response) {
    await eliminarAusencia(Number(req.params["id"]));
    res.json({ success: true });
  },

  // ── Reporte ───────────────────────────────────────────────────────────────

  async reporte(req: AuthRequest, res: Response) {
    const schema = z.object({
      desde:      z.coerce.date(),
      hasta:      z.coerce.date(),
      empleadoId: z.coerce.number().int().positive().optional(),
    });
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.flatten() });
    const { desde, hasta, empleadoId } = parsed.data;
    if (desde > hasta) return res.status(400).json({ success: false, error: "'desde' debe ser anterior a 'hasta'" });

    const data = await generarReporte(desde, hasta, empleadoId);
    res.json({ success: true, data });
  },
};

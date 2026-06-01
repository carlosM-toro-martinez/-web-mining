import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth.middleware.js";
import { personalController } from "./personal.controller.js";

const router = Router();
router.use(authenticate);

const ROLES = ["ADMIN", "ADMINISTRADOR", "SUPERINTENDENTE"] as const;

// ── Horarios ──────────────────────────────────────────────────────────────────
// GET    /api/personal/horarios
router.get("/horarios", authorize(...ROLES), personalController.listarHorarios);
// GET    /api/personal/horarios/:id
router.get("/horarios/:id", authorize(...ROLES), personalController.obtenerHorario);
// POST   /api/personal/horarios
router.post("/horarios", authorize(...ROLES), personalController.crearHorario);
// PUT    /api/personal/horarios/:id
router.put("/horarios/:id", authorize(...ROLES), personalController.actualizarHorario);
// DELETE /api/personal/horarios/:id
router.delete("/horarios/:id", authorize(...ROLES), personalController.eliminarHorario);

// ── Asignaciones empleado → horario ──────────────────────────────────────────
// POST   /api/personal/asignaciones  (employeeId, horarioId, desde en body)
router.post("/asignaciones", authorize(...ROLES), personalController.asignarHorario);
// DELETE /api/personal/asignaciones/:id
router.delete("/asignaciones/:id", authorize(...ROLES), personalController.eliminarAsignacion);
// GET    /api/personal/empleados/:id/horario   → horario vigente
router.get("/empleados/:id/horario", authorize(...ROLES), personalController.horarioActualEmpleado);
// GET    /api/personal/empleados/:id/horarios  → historial completo
router.get("/empleados/:id/horarios", authorize(...ROLES), personalController.historialHorariosEmpleado);

// ── Ausencias / Vacaciones ────────────────────────────────────────────────────
// GET    /api/personal/ausencias
router.get("/ausencias", authorize(...ROLES), personalController.listarAusencias);
// POST   /api/personal/ausencias
router.post("/ausencias", authorize(...ROLES), personalController.crearAusencia);
// PUT    /api/personal/ausencias/:id
router.put("/ausencias/:id", authorize(...ROLES), personalController.actualizarAusencia);
// DELETE /api/personal/ausencias/:id
router.delete("/ausencias/:id", authorize(...ROLES), personalController.eliminarAusencia);

// ── Reporte de asistencia con horarios ───────────────────────────────────────
// GET    /api/personal/reporte?desde=&hasta=&empleadoId=
router.get("/reporte", authorize(...ROLES), personalController.reporte);

export default router;

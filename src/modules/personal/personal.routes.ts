import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requirePermiso } from "../../middleware/permiso.middleware.js";
import { personalController } from "./personal.controller.js";

const router = Router();
router.use(authenticate);

// Permisos dinámicos: ver src/modules/roles/permisos.catalogo.ts

// ── Horarios ──────────────────────────────────────────────────────────────────
// GET    /api/personal/horarios
router.get("/horarios", requirePermiso("personal.horarios", "ver"), personalController.listarHorarios);
// GET    /api/personal/horarios/:id
router.get("/horarios/:id", requirePermiso("personal.horarios", "ver"), personalController.obtenerHorario);
// POST   /api/personal/horarios
router.post("/horarios", requirePermiso("personal.horarios", "crear"), personalController.crearHorario);
// PUT    /api/personal/horarios/:id
router.put("/horarios/:id", requirePermiso("personal.horarios", "editar"), personalController.actualizarHorario);
// DELETE /api/personal/horarios/:id
router.delete("/horarios/:id", requirePermiso("personal.horarios", "eliminar"), personalController.eliminarHorario);

// ── Asignaciones empleado → horario ──────────────────────────────────────────
// GET    /api/personal/asignaciones/estado  → empleados activos con su horario vigente (o null)
router.get("/asignaciones/estado", requirePermiso("personal.asignaciones", "ver"), personalController.estadoAsignaciones);
// POST   /api/personal/asignaciones/bulk  (employeeIds[], horarioId, desde) → asignar el mismo horario a varios
router.post("/asignaciones/bulk", requirePermiso("personal.asignaciones", "crear"), personalController.asignarHorarioMasivo);
// POST   /api/personal/asignaciones  (employeeId, horarioId, desde en body)
router.post("/asignaciones", requirePermiso("personal.asignaciones", "crear"), personalController.asignarHorario);
// DELETE /api/personal/asignaciones/:id
router.delete("/asignaciones/:id", requirePermiso("personal.asignaciones", "eliminar"), personalController.eliminarAsignacion);
// GET    /api/personal/empleados/:id/horario   → horario vigente
router.get("/empleados/:id/horario", requirePermiso("personal.asignaciones", "ver"), personalController.horarioActualEmpleado);
// GET    /api/personal/empleados/:id/horarios  → historial completo
router.get("/empleados/:id/horarios", requirePermiso("personal.asignaciones", "ver"), personalController.historialHorariosEmpleado);

// ── Ausencias / Vacaciones ────────────────────────────────────────────────────
// GET    /api/personal/ausencias
router.get("/ausencias", requirePermiso("personal.ausencias", "ver"), personalController.listarAusencias);
// POST   /api/personal/ausencias
router.post("/ausencias", requirePermiso("personal.ausencias", "crear"), personalController.crearAusencia);
// POST   /api/personal/ausencias/bulk  (todo el personal, por tipoPersonal, o lista de IDs)
router.post("/ausencias/bulk", requirePermiso("personal.ausencias", "crear"), personalController.crearAusenciasMasivas);
// PUT    /api/personal/ausencias/:id
router.put("/ausencias/:id", requirePermiso("personal.ausencias", "editar"), personalController.actualizarAusencia);
// DELETE /api/personal/ausencias/:id
router.delete("/ausencias/:id", requirePermiso("personal.ausencias", "eliminar"), personalController.eliminarAusencia);

// ── Reporte de asistencia con horarios ───────────────────────────────────────
// GET    /api/personal/reporte?desde=&hasta=&empleadoId=
router.get("/reporte", requirePermiso("personal.asistencia", "ver"), personalController.reporte);

export default router;

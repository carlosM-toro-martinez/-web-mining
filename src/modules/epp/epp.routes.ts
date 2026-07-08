import { Router } from "express";
import { eppController } from "./epp.controller.js";
import { authenticate, authorize } from "../../middleware/auth.middleware.js";

const router = Router();

router.use(authenticate);

// ── Productos EPP ─────────────────────────────────────────────────────────
// Lista todos los productos marcados como EPP con stock y asignaciones activas
router.get("/productos", eppController.getProductosEpp);

// Historial completo de asignaciones de un EPP específico (rastreo de último dueño)
router.get("/productos/:productoId/historial", eppController.getHistorialProducto);

// ── Trabajadores ──────────────────────────────────────────────────────────
// Lista trabajadores que tienen o han tenido EPPs asignados
router.get("/trabajadores", authorize("ADMIN", "ALMACENERO"), eppController.getTrabajadoresConEpp);

// Reporte completo de un trabajador: asignaciones activas, devueltas e historial de vales
router.get("/trabajadores/:usuarioId/reporte", authorize("ADMIN", "ALMACENERO"), eppController.getReporteTrabajador);

// ── Asignaciones ──────────────────────────────────────────────────────────
// Lista asignaciones con filtros (productoId, usuarioId, condicion, activa=true/false)
router.get("/asignaciones", authorize("ADMIN", "ALMACENERO"), eppController.getAsignaciones);

// Crea una nueva asignación de EPP a un trabajador
router.post("/asignaciones", authorize("ADMIN", "ALMACENERO"), eppController.createAsignacion);

// Actualiza una asignación: registrar devolución, cambiar condición, agregar observación
router.patch("/asignaciones/:id", authorize("ADMIN", "ALMACENERO"), eppController.updateAsignacion);

// Elimina una asignación (solo si fue registrada por error)
router.delete("/asignaciones/:id", authorize("ADMIN"), eppController.deleteAsignacion);

export default router;

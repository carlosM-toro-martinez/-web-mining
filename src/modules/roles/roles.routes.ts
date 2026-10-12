import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requirePermiso } from "../../middleware/permiso.middleware.js";
import { rolesController } from "./roles.controller.js";

const router = Router();
router.use(authenticate);

// GET /api/roles/mis-permisos — permisos efectivos del usuario logueado
router.get("/mis-permisos", rolesController.misPermisos);
// GET /api/roles/opciones — {codigo, nombre} de roles activos (para selects)
router.get("/opciones", rolesController.opciones);
// GET /api/roles/catalogo — módulos/recursos/acciones asignables
router.get("/catalogo", requirePermiso("sistema.roles", "ver"), rolesController.catalogo);

router.get("/", requirePermiso("sistema.roles", "ver"), rolesController.listar);
router.get("/:id", requirePermiso("sistema.roles", "ver"), rolesController.obtener);
router.post("/", requirePermiso("sistema.roles", "crear"), rolesController.crear);
router.put("/:id", requirePermiso("sistema.roles", "editar"), rolesController.actualizar);
router.put("/:id/permisos", requirePermiso("sistema.roles", "editar"), rolesController.actualizarPermisos);
router.delete("/:id", requirePermiso("sistema.roles", "eliminar"), rolesController.eliminar);

export default router;

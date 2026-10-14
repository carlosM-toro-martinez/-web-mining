import { Router } from "express";
import { vehiculoController } from "./vehiculo.controller.js";
import { validate, validateQuery, validateParams } from "../../middleware/validate.middleware.js";
import {
  cambiarEstadoVehiculoSchema,
  createVehiculoSchema,
  updateVehiculoSchema,
  vehiculoQuerySchema,
} from "./vehiculo.schema.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requireModulo, requirePermiso } from "../../middleware/permiso.middleware.js";
import { z } from "zod";

const idSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const router = Router();

router.use(authenticate);
// Leer requiere algún permiso de logística; cada acción, su permiso propio
// (ver src/modules/roles/permisos.catalogo.ts).
router.use(requireModulo("logistica"));

router.get("/", validateQuery(vehiculoQuerySchema), vehiculoController.getAll);
router.get("/:id", validateParams(idSchema), vehiculoController.getById);
router.get("/:id/historial-estados", validateParams(idSchema), vehiculoController.getHistorialEstados);

router.post(
  "/",
  requirePermiso("logistica.flota", "crear"),
  validate(createVehiculoSchema),
  vehiculoController.create,
);

router.put(
  "/:id",
  requirePermiso("logistica.flota", "editar"),
  validateParams(idSchema),
  validate(updateVehiculoSchema),
  vehiculoController.update,
);

router.patch(
  "/:id/estado",
  requirePermiso("logistica.flota", "editar"),
  validateParams(idSchema),
  validate(cambiarEstadoVehiculoSchema),
  vehiculoController.cambiarEstado,
);

export default router;

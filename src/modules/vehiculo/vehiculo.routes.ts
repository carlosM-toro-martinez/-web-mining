import { Router } from "express";
import { vehiculoController } from "./vehiculo.controller.js";
import { validate, validateQuery, validateParams } from "../../middleware/validate.middleware.js";
import {
  cambiarEstadoVehiculoSchema,
  createVehiculoSchema,
  updateVehiculoSchema,
  vehiculoQuerySchema,
} from "./vehiculo.schema.js";
import { authenticate, authorize } from "../../middleware/auth.middleware.js";
import { z } from "zod";

const idSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const router = Router();

router.use(authenticate);

router.get("/", validateQuery(vehiculoQuerySchema), vehiculoController.getAll);
router.get("/:id", validateParams(idSchema), vehiculoController.getById);
router.get("/:id/historial-estados", validateParams(idSchema), vehiculoController.getHistorialEstados);

router.post(
  "/",
  authorize("ADMIN", "SUPERINTENDENTE", "ASISTENTE_ADMINISTRATIVO"),
  validate(createVehiculoSchema),
  vehiculoController.create,
);

router.put(
  "/:id",
  authorize("ADMIN", "SUPERINTENDENTE", "ASISTENTE_ADMINISTRATIVO"),
  validateParams(idSchema),
  validate(updateVehiculoSchema),
  vehiculoController.update,
);

// Tablero de flota: cualquier rol con acceso al módulo puede mover una
// tarjeta de estado (incluye ALMACENERO, que también opera despachos).
router.patch(
  "/:id/estado",
  authorize("ADMIN", "SUPERINTENDENTE", "ASISTENTE_ADMINISTRATIVO", "ALMACENERO"),
  validateParams(idSchema),
  validate(cambiarEstadoVehiculoSchema),
  vehiculoController.cambiarEstado,
);

export default router;

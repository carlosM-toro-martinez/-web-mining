import { Router } from "express";
import { alicuotaRegaliaController } from "./alicuotaRegalia.controller.js";
import { validate, validateQuery, validateParams } from "../../middleware/validate.middleware.js";
import { createAlicuotaRegaliaSchema, alicuotaRegaliaQuerySchema } from "./alicuotaRegalia.schema.js";
import { authenticate, authorize } from "../../middleware/auth.middleware.js";
import { z } from "zod";

const idSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const router = Router();

router.use(authenticate);

router.get("/", validateQuery(alicuotaRegaliaQuerySchema), alicuotaRegaliaController.getAll);
router.get("/:id", validateParams(idSchema), alicuotaRegaliaController.getById);

// Parámetro fiscal sensible: solo ADMIN/SUPERINTENDENTE pueden definir
// nuevas vigencias de alícuota (a diferencia de los catálogos simples,
// el asistente administrativo aquí solo consulta).
router.post(
  "/",
  authorize("ADMIN", "SUPERINTENDENTE"),
  validate(createAlicuotaRegaliaSchema),
  alicuotaRegaliaController.create,
);

export default router;

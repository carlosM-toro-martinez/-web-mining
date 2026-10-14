import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth.middleware.js";
import { validate, validateQuery } from "../../middleware/validate.middleware.js";
import { cuadreSaldoController } from "./cuadreSaldo.controller.js";
import { createCuadreSaldoSchema, previsualizarCuadreSchema } from "./cuadreSaldo.schema.js";

const router = Router();

router.use(authenticate);
router.use(authorize("ADMIN", "ADMINISTRADOR", "CONTADOR", "SUPERINTENDENTE"));

router.get("/", cuadreSaldoController.getAll);
router.get("/previsualizar", validateQuery(previsualizarCuadreSchema), cuadreSaldoController.previsualizar);
router.post("/", validate(createCuadreSaldoSchema), cuadreSaldoController.create);

export default router;

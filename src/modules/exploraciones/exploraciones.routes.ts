import { Router } from "express";
import { exploracionesController } from "./exploraciones.controller.js";
import { validate } from "../../middleware/validate.middleware.js";
import {
  createMuestraSchema,
  createElementoSchema,
  getMuestrasQuerySchema,
} from "./exploraciones.schema.js";
import { authenticate } from "../../middleware/auth.middleware.js";

const router = Router();

router.use(authenticate);

router.post("/muestras", validate(createMuestraSchema), exploracionesController.crearMuestra);
router.get("/muestras", validate(getMuestrasQuerySchema), exploracionesController.listarMuestras);
router.get("/muestras/:id", exploracionesController.obtenerMuestraPorId);
router.put(
  "/muestras/:id",
  validate(createMuestraSchema),
  exploracionesController.actualizarMuestra,
);

router.post("/elementos", validate(createElementoSchema), exploracionesController.crearElemento);
router.get("/elementos", exploracionesController.listarElementos);

router.get("/laboratorios", exploracionesController.listarLaboratorios);

router.get("/ubicaciones", exploracionesController.listarUbicaciones);
router.get("/muestras-todas", exploracionesController.listarTodasMuestras);
router.get("/resultados", exploracionesController.listarResultados);

export default router;

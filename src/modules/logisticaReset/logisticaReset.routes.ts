import { Router } from "express";
import { logisticaResetController } from "./logisticaReset.controller.js";
import { validate } from "../../middleware/validate.middleware.js";
import { confirmarResetLogisticaSchema } from "./logisticaReset.schema.js";
import { authenticate, authorize } from "../../middleware/auth.middleware.js";

const router = Router();

router.use(authenticate);

// Deliberadamente restrictivo: solo ADMIN, y solo con la frase de
// confirmación exacta en el body (segunda barrera además del rol).
router.delete("/", authorize("ADMIN"), validate(confirmarResetLogisticaSchema), logisticaResetController.resetTodo);

export default router;

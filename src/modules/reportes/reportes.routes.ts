import { Router } from "express";
import { reportesController } from "./reportes.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";

const router = Router();

router.get("/bin-card", authenticate, reportesController.getBinCard);
router.get("/bin-card-valorado", authenticate, reportesController.getBinCardValorado);

export default router;

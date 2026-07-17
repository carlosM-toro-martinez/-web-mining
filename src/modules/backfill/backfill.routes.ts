import { Router } from "express";
import { backfillController } from "./backfill.controller.js";
import { authenticate, authorize } from "../../middleware/auth.middleware.js";

const router = Router();
router.use(authenticate);

// POST /api/backfill/cpp  — recalcula CPP histórico para un mes específico (solo ADMIN)
router.post("/cpp", authorize("ADMIN"), backfillController.backfillCPP);

export default router;

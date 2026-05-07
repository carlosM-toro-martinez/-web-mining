import { Router } from "express";
import { BiometricController } from "./biometric.controller.js";

const router = Router();
const biometricController = new BiometricController();

router.get("/getrequest", biometricController.getRequest.bind(biometricController));
router.get("/cdata", biometricController.getCData.bind(biometricController));
router.post("/cdata", biometricController.postCData.bind(biometricController));
router.get("/logs", biometricController.getLogs.bind(biometricController));

export default router;

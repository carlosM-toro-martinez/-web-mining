import { Router } from "express";
import { iclockController } from "./iclock.controller.js";

const router = Router();

// ZKTeco ADMS protocol — device connects to these endpoints directly
// No JWT auth: device authenticates via its serial number (SN)
router.get("/cdata", iclockController.cdata);
router.post("/cdata", iclockController.cdataPost);
router.get("/getrequest", iclockController.getrequest);
router.post("/devicecmd", iclockController.devicecmd);

export default router;

import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { iclockController } from "./iclock.controller.js";
import { logBiometricRequest, logBiometricResponse } from "../../utils/biometricLogger.js";

const router = Router();

// Intercept every /iclock request and response and write to logs/biometric.log
router.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const method = req.method;
  const reqPath = req.originalUrl ?? req.url;

  logBiometricRequest({
    method,
    path: reqPath,
    query: req.query as Record<string, unknown>,
    headers: req.headers as Record<string, string | string[] | undefined>,
    body: req.body,
  });

  // Intercept res.send to capture the response body
  const originalSend = res.send.bind(res);
  res.send = function (body: unknown) {
    const bodyStr = typeof body === "string" ? body : JSON.stringify(body);
    logBiometricResponse({
      method,
      path: reqPath,
      status: res.statusCode,
      body: bodyStr,
      durationMs: Date.now() - start,
    });
    return originalSend(body);
  };

  next();
});

// ZKTeco ADMS protocol — device connects to these endpoints directly
// No JWT auth: device authenticates via its serial number (SN)
router.get("/cdata", iclockController.cdata);
router.post("/cdata", iclockController.cdataPost);
router.get("/getrequest", iclockController.getrequest);
router.post("/devicecmd", iclockController.devicecmd);

// Public utility endpoints — no auth, for frontend status indicator and manual sync
router.get("/status", iclockController.status);
router.post("/sync-users", iclockController.syncUsers);

export default router;

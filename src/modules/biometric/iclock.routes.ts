import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { iclockController } from "./iclock.controller.js";
import { logBiometricRequest, logBiometricResponse } from "../../utils/biometricLogger.js";

const router = Router();

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

// ── Protocolo ADMS ZKTeco ─────────────────────────────────────────────────────
// Sin JWT: el dispositivo se identifica por su número de serie (SN).

// Heartbeat y config del dispositivo (solo devuelve configuración, NUNCA comandos)
router.get("/cdata", iclockController.cdata);

// El dispositivo envía datos: ATTLOG, USERINFO, options
router.post("/cdata", iclockController.cdataPost);

// Asistencia en tiempo real (marca física inmediata) — responder GBK\nOK
router.post("/adata", iclockController.adata);

// ÚNICO punto de entrega de comandos → "OK" o "C:ID:COMANDO"
router.get("/getrequest", iclockController.getrequest);

// Confirmación de ejecución de comando por parte del dispositivo
router.post("/devicecmd", iclockController.devicecmd);

// ── Endpoints de utilidad (sin auth, red interna) ────────────────────────────

// Estado de conexión del dispositivo
router.get("/status", iclockController.status);

// Encola DATA QUERY USERINFO → entregado en próximo getrequest
router.post("/sync-users", iclockController.syncUsers);

// Encola DATA QUERY ATTLOG → entregado en próximo getrequest (~30s)
router.post("/force-attlog", iclockController.forceAttlog);

export default router;

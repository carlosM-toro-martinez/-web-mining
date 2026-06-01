import type { Request, Response } from "express";
import { logger } from "../../config/logger.js";
import { prisma } from "../../config/prisma.js";
import {
  updateDeviceHeartbeat,
  parseAttlogBody,
  processAttendance,
  processUserInfo,
  getNextCommand,
  ackCommand,
  getDeviceStatus,
  setRequestUserInfo,
  infoHasNewScan,
  queueAttlogQuery,
} from "./biometric.service.js";

function nowDateTimeStr(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    d.getFullYear().toString() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  );
}

function extractBody(req: Request): string {
  if (typeof req.body === "string") return req.body;
  if (req.body && typeof req.body === "object") {
    const b = req.body as Record<string, unknown>;
    if (typeof b["data"] === "string") return b["data"];
  }
  return "";
}

export const iclockController = {
  // GET /iclock/cdata — heartbeat y registro inicial
  // Solo devuelve configuración. NUNCA entrega comandos aquí.
  // Los comandos van exclusivamente en /iclock/getrequest.
  async cdata(req: Request, res: Response) {
    const sn = String(req.query["SN"] ?? "");
    const isRealDevice = sn && sn !== "TEST" && sn.length > 4;
    if (isRealDevice) await updateDeviceHeartbeat(sn);

    logger.info({ sn, query: req.query }, "ADMS cdata GET heartbeat");

    const body =
      `RegistryCode=1\n` +
      `Delay=10\n` +
      `ErrorDelay=60\n` +
      `Realtime=1\n` +
      `Encrypt=0\n` +
      `Options=ATTLOG\n`;

    res.setHeader("Content-Type", "text/plain");
    res.send(body);
  },

  // POST /iclock/cdata — el dispositivo envía datos (ATTLOG, USERINFO, options)
  // Para table=options: responder OK.
  // Para table=ATTLOG: procesar marcaciones y responder OK.
  async cdataPost(req: Request, res: Response) {
    const sn = String(req.query["SN"] ?? "");
    const table = String(req.query["table"] ?? "");
    const isRealDevice = sn && sn !== "TEST" && sn.length > 4;
    if (isRealDevice) await updateDeviceHeartbeat(sn);

    res.setHeader("Content-Type", "text/plain");

    if (table === "ATTLOG" || table === "TRANSACTION") {
      const body = extractBody(req);
      logger.info({ sn, table, rawBody: body.slice(0, 300) }, "ADMS ATTLOG recibido via cdata");
      const records = parseAttlogBody(body);
      const result = await processAttendance(records);
      logger.info({ sn, ...result }, "ADMS ATTLOG procesado");
      return res.send("OK");
    }

    if (table === "USERINFO") {
      const body = extractBody(req);
      const result = await processUserInfo(body);
      logger.info({ sn, ...result }, "ADMS USERINFO recibido");
      return res.send("OK");
    }

    // table=options (registro inicial del dispositivo) y cualquier otro
    logger.info({ sn, table }, "ADMS cdata POST — respondiendo OK");
    return res.send("OK");
  },

  // POST /iclock/adata — asistencia en tiempo real cuando alguien marca físicamente
  // El dispositivo espera exactamente "GBK\nOK" para confirmar sincronización.
  async adata(req: Request, res: Response) {
    const sn = String(req.query["SN"] ?? "");
    const table = String(req.query["table"] ?? "ATTLOG");
    const isRealDevice = sn && sn !== "TEST" && sn.length > 4;
    if (isRealDevice) await updateDeviceHeartbeat(sn);

    res.setHeader("Content-Type", "text/plain");

    if (table === "ATTLOG" || table === "TRANSACTION") {
      const body = extractBody(req);
      logger.info({ sn, rawBody: body.slice(0, 300) }, "ADMS ATTLOG en tiempo real via adata");
      const records = parseAttlogBody(body);
      const result = await processAttendance(records);
      logger.info({ sn, ...result }, "ADMS adata ATTLOG procesado");
    } else {
      logger.info({ sn, table, rawBody: String(req.body ?? "").slice(0, 200) }, "ADMS adata tabla desconocida");
    }

    // SenseFace 2A requiere GBK\nOK para confirmar que el registro fue aceptado
    return res.send("GBK\nOK");
  },

  // GET /iclock/getrequest — ÚNICO punto donde se entregan comandos al dispositivo
  // Sin comando pendiente → "OK"
  // Con comando pendiente → "C:ID:COMANDO"
  // Si el dispositivo envía INFO= con un conteo nuevo de marcas, encolamos ATTLOG query.
  async getrequest(req: Request, res: Response) {
    const sn = String(req.query["SN"] ?? "");
    const info = req.query["INFO"];
    const isReal = sn && sn !== "TEST" && sn.length > 4;
    if (isReal) await updateDeviceHeartbeat(sn);

    res.setHeader("Content-Type", "text/plain");

    // INFO= indica una nueva marca en tiempo real → encolar ATTLOG query
    if (info !== undefined && isReal && infoHasNewScan(sn, String(info))) {
      await queueAttlogQuery(sn);
      logger.info({ sn, info }, "ADMS getrequest: nueva marca detectada, ATTLOG query encolado");
    }

    const cmd = await getNextCommand();
    if (cmd) {
      await ackCommand(cmd.id, true);
      logger.info({ sn, cmdId: cmd.id, command: cmd.command }, "ADMS comando entregado via getrequest");
      return res.send(`C:${cmd.id}:${cmd.command}\n`);
    }

    return res.send("OK");
  },

  // POST /iclock/devicecmd — el dispositivo confirma ejecución de un comando
  async devicecmd(req: Request, res: Response) {
    const body = extractBody(req);
    const sn = String(req.query["SN"] ?? "");

    let id: number | null = null;
    let returnCode = "0";

    // El body puede llegar como query string o como texto plano
    const raw = body || String(req.body ?? "");
    for (const pair of raw.split("&")) {
      const eq = pair.indexOf("=");
      if (eq === -1) continue;
      const k = pair.substring(0, eq).trim();
      const v = pair.substring(eq + 1).trim();
      if (k === "ID") id = parseInt(v, 10);
      if (k === "Return") returnCode = v;
    }

    const success = returnCode === "0";

    if (id !== null && !isNaN(id)) {
      await ackCommand(id, success);
      logger.info({ sn, id, success }, "ADMS devicecmd ack");
    } else {
      logger.info({ sn, raw: raw.slice(0, 200) }, "ADMS devicecmd sin ID parseable");
    }

    res.setHeader("Content-Type", "text/plain");
    res.send("OK");
  },

  // GET /iclock/status — estado de conexión del dispositivo
  async status(_req: Request, res: Response) {
    const status = await getDeviceStatus();
    res.json({ success: true, data: status });
  },

  // POST /iclock/sync-users — encola DATA QUERY USERINFO para el próximo getrequest
  async syncUsers(_req: Request, res: Response) {
    await setRequestUserInfo();
    res.setHeader("Content-Type", "text/plain");
    res.send("OK");
  },

  // POST /iclock/force-attlog — encola DATA QUERY ATTLOG para el próximo getrequest
  // Sin auth, solo accesible desde la red interna (admin panel del relay)
  async forceAttlog(_req: Request, res: Response) {
    const device = await prisma.deviceState.findFirst({ orderBy: { lastSeen: "desc" } });
    if (!device) {
      return res.status(404).json({ success: false, error: "No hay dispositivo conectado" });
    }
    await queueAttlogQuery(device.sn);
    logger.info({ sn: device.sn }, "ATTLOG query encolado via force-attlog");
    res.setHeader("Content-Type", "text/plain");
    res.send("OK");
  },
};

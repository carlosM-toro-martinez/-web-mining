import type { Request, Response } from "express";
import { logger } from "../../config/logger.js";
import {
  updateDeviceHeartbeat,
  consumeRequestUserInfo,
  parseAttlogBody,
  processAttendance,
  processUserInfo,
  getNextCommand,
  ackCommand,
  getDeviceStatus,
  setRequestUserInfo,
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

// Parse urlencoded string manually in case express.text() consumed it first
function parseUrlEncoded(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const pair of raw.split("&")) {
    const eqIdx = pair.indexOf("=");
    if (eqIdx === -1) continue;
    const k = decodeURIComponent(pair.substring(0, eqIdx));
    const v = decodeURIComponent(pair.substring(eqIdx + 1).replace(/\+/g, " "));
    out[k] = v;
  }
  return out;
}

export const iclockController = {
  // GET /iclock/cdata — device heartbeat / initial check-in
  // Embeds any pending command directly in the response body.
  // The SenseFace 2A (pushver 2.4.1) never calls getrequest as a separate step,
  // so this is the only reliable delivery channel.
  async cdata(req: Request, res: Response) {
    const sn = String(req.query["SN"] ?? "");
    const isRealDevice = sn && sn !== "TEST" && sn.length > 4;
    if (isRealDevice) await updateDeviceHeartbeat(sn);

    const wantsUserInfo = consumeRequestUserInfo();
    const cmd = await getNextCommand();

    logger.info(
      { sn, query: req.query, pendingCmd: cmd?.id ?? null, sendingUserInfoRequest: wantsUserInfo },
      "ADMS device check-in",
    );

    let body =
      `GET DATETIME:${nowDateTimeStr()}\r\n` +
      `STAMP:0\r\n` +
      `ATTLOGSTAMP:0\r\n` +
      `OPCLOGSTAMP:9999999\r\n` +
      `TRANSACTIONSTAMP:9999999\r\n` +
      `ERRORLOGSTAMP:9999999\r\n` +
      `USERINFOSTAMP:${wantsUserInfo ? "0" : "9999999"}\r\n`;

    if (cmd) {
      body += `C:${cmd.id}:${cmd.command}\r\n`;
      // Device executes silently without calling devicecmd — mark SYNCED on delivery
      await ackCommand(cmd.id, true);
      logger.info({ sn, cmdId: cmd.id }, "ADMS command delivered via cdata, marked SYNCED");
    }

    res.setHeader("Content-Type", "text/plain");
    res.send(body);
  },

  // POST /iclock/cdata — device sends attendance / operation data
  async cdataPost(req: Request, res: Response) {
    const sn = String(req.query["SN"] ?? "");
    const table = String(req.query["table"] ?? "");
    const isRealDevice = sn && sn !== "TEST" && sn.length > 4;
    if (isRealDevice) await updateDeviceHeartbeat(sn);

    if (table === "ATTLOG") {
      const body = typeof req.body === "string" ? req.body : "";
      const records = parseAttlogBody(body);
      const result = await processAttendance(records);
      logger.info({ sn, ...result }, "ADMS ATTLOG received");
    } else if (table === "USERINFO") {
      const body = typeof req.body === "string" ? req.body : "";
      const result = await processUserInfo(body);
      logger.info({ sn, ...result }, "ADMS USERINFO received");
    } else {
      logger.info({ sn, table, bodyLen: String(req.body ?? "").length }, "ADMS data received (table ignored)");
    }

    res.setHeader("Content-Type", "text/plain");
    res.send("OK");
  },

  // GET /iclock/getrequest — fallback for devices that do call this endpoint
  async getrequest(req: Request, res: Response) {
    const sn = String(req.query["SN"] ?? "");
    if (sn && sn !== "TEST" && sn.length > 4) await updateDeviceHeartbeat(sn);

    const cmd = await getNextCommand();
    res.setHeader("Content-Type", "text/plain");

    if (cmd) {
      await ackCommand(cmd.id, true);
      logger.info({ sn, cmdId: cmd.id }, "ADMS command delivered via getrequest, marked SYNCED");
      res.send(`C:${cmd.id}:${cmd.command}`);
    } else {
      res.send("OK");
    }
  },

  // GET /iclock/status — device connection status, no auth required
  async status(_req: Request, res: Response) {
    const status = await getDeviceStatus();
    res.json({ success: true, data: status });
  },

  // POST /iclock/sync-users — trigger device to send its user list, no auth required
  async syncUsers(_req: Request, res: Response) {
    await setRequestUserInfo();
    res.json({ success: true, message: "El dispositivo enviará sus usuarios en el próximo heartbeat (~30s)" });
  },

  // POST /iclock/devicecmd — explicit ack from device (not all models send this)
  async devicecmd(req: Request, res: Response) {
    // Body may arrive as urlencoded object OR as raw string depending on middleware order
    let fields: Record<string, string> = {};
    if (typeof req.body === "string" && req.body.includes("=")) {
      fields = parseUrlEncoded(req.body);
    } else if (req.body && typeof req.body === "object") {
      fields = req.body as Record<string, string>;
    }

    const sn = String(fields["SN"] ?? req.query["SN"] ?? "");
    const id = parseInt(String(fields["ID"] ?? ""), 10);
    const success = String(fields["Return"] ?? "0") === "0";

    if (!isNaN(id)) {
      await ackCommand(id, success);
      logger.info({ sn, id, success }, "ADMS devicecmd ack received");
    } else {
      logger.info({ sn, rawBody: req.body }, "ADMS devicecmd received but could not parse ID");
    }

    res.setHeader("Content-Type", "text/plain");
    res.send("OK");
  },
};

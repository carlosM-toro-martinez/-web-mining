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
  triggerAttlogQuery,
  isNewScan,
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
  // GET /iclock/cdata — device initial registration / heartbeat
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

    const pushver = String(req.query["pushver"] ?? "");
    const isPushVer241 = pushver === "2.4.1";

    // ZKTeco ADMS requires \n (LF only), NOT \r\n (CRLF).
    // The cdata GET response starts with GET DATETIME + stamps, then key=value config.
    let body =
      `GET DATETIME:${nowDateTimeStr()}\n` +
      `STAMP:0\n` +
      `ATTLOGSTAMP:0\n` +
      `OPCLOGSTAMP:9999999\n` +
      `TRANSACTIONSTAMP:0\n` +
      `ERRORLOGSTAMP:9999999\n` +
      `USERINFOSTAMP:${wantsUserInfo ? "0" : "9999999"}\n` +
      `RegistryCode=1\n` +
      `Delay=30\n` +
      `ErrorDelay=60\n` +
      `TransTimes=00:00;23:59\n` +
      `TransInterval=1\n` +
      `TransFlag=True\n` +
      `Realtime=1\n` +
      `Encrypt=0\n` +
      (isPushVer241 ? `PUSHVER=2.4.1\nServerVer=2.4.1\nPushProtVer=2.4.1\n` : ``) +
      `Options=ATTLOG\n`;

    if (cmd) {
      body += `C:${cmd.id}:${cmd.command}\n`;
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

    // Some ZKTeco firmware sends ATTLOG as application/x-www-form-urlencoded with
    // attendance lines in a "data" field, others send raw text/plain.
    // Also handle the case where urlencoded middleware already parsed the body.
    function extractBody(): string {
      if (typeof req.body === "string") return req.body;
      if (req.body && typeof req.body === "object") {
        // urlencoded parsed — attendance may be in "data" key or the whole object
        const b = req.body as Record<string, unknown>;
        if (typeof b["data"] === "string") return b["data"];
        // fallback: try to reconstruct as tab-separated from object values
      }
      return "";
    }

    logger.info(
      { sn, table, contentType: req.headers["content-type"], bodyType: typeof req.body },
      "ADMS POST cdata received",
    );

    if (table === "ATTLOG" || table === "TRANSACTION") {
      const body = extractBody();
      logger.info({ sn, table, rawBody: body.slice(0, 300) }, "ADMS ATTLOG raw body");
      const records = parseAttlogBody(body);
      const result = await processAttendance(records);
      logger.info({ sn, table, ...result }, "ADMS ATTLOG processed");
    } else if (table === "USERINFO") {
      const body = extractBody();
      const result = await processUserInfo(body);
      logger.info({ sn, ...result }, "ADMS USERINFO received");
    } else if (table === "options" || String(req.query["c"] ?? "") === "registry") {
      // Some firmware sends POST cdata?table=options&c=registry for initial registration
      // Return the same config as GET cdata so push mode activates
      const pushver = String(req.query["pushver"] ?? "");
      const wantsUserInfo = consumeRequestUserInfo();
      const cmd = await getNextCommand();
      let body =
        `GET DATETIME:${nowDateTimeStr()}\n` +
        `STAMP:0\n` +
        `ATTLOGSTAMP:0\n` +
        `OPCLOGSTAMP:9999999\n` +
        `TRANSACTIONSTAMP:0\n` +
        `ERRORLOGSTAMP:9999999\n` +
        `USERINFOSTAMP:${wantsUserInfo ? "0" : "9999999"}\n` +
        `RegistryCode=1\n` +
        `Delay=30\n` +
        `ErrorDelay=60\n` +
        `TransTimes=00:00;23:59\n` +
        `TransInterval=1\n` +
        `TransFlag=True\n` +
        `Realtime=1\n` +
        `Encrypt=0\n` +
        (pushver === "2.4.1" ? `PUSHVER=2.4.1\nServerVer=2.4.1\nPushProtVer=2.4.1\n` : ``) +
        `Options=ATTLOG\n`;
      if (cmd) {
        body += `C:${cmd.id}:${cmd.command}\n`;
        await ackCommand(cmd.id, true);
      }
      logger.info({ sn, table }, "ADMS POST cdata options/registry — sending config");
      res.setHeader("Content-Type", "text/plain");
      return res.send(body);
    } else {
      logger.info(
        { sn, table, rawBody: String(req.body ?? "").slice(0, 300) },
        "ADMS POST cdata unknown table",
      );
    }

    res.setHeader("Content-Type", "text/plain");
    res.send("OK");
  },

  // GET /iclock/getrequest — heartbeat + initial registration for ZAM70 firmware.
  // ZAM70-NF24HA never calls /iclock/cdata for registration; it uses getrequest+INFO=.
  // On first connection we queue a DATA QUERY ATTLOG command via SyncQueue so the
  // device sends all its buffered records. The SyncQueue marks it SYNCED on delivery
  // so it's only sent once — no loop.
  async getrequest(req: Request, res: Response) {
    const sn = String(req.query["SN"] ?? "");
    const info = req.query["INFO"];
    const isReal = sn && sn !== "TEST" && sn.length > 4;
    if (isReal) await updateDeviceHeartbeat(sn);

    res.setHeader("Content-Type", "text/plain");

    if (info !== undefined) {
      // Only trigger DATA QUERY when the count in INFO increases — that means a real
      // new face scan happened. If count is the same, the device is just responding
      // to our previous DATA QUERY (loop) and we should not queue another command.
      if (isReal && isNewScan(sn, String(info))) await triggerAttlogQuery(sn);

      const wantsUserInfo = consumeRequestUserInfo();
      const cmd = await getNextCommand();
      const pushver = String(req.query["pushver"] ?? "");

      let body =
        `RegistryCode=1\n` +
        `Delay=30\n` +
        `ErrorDelay=60\n` +
        `TransTimes=00:00;23:59\n` +
        `TransInterval=1\n` +
        `TransFlag=True\n` +
        `Realtime=1\n` +
        `Encrypt=0\n` +
        (pushver === "2.4.1" ? `PUSHVER=2.4.1\nServerVer=2.4.1\nPushProtVer=2.4.1\n` : ``) +
        `USERINFOSTAMP:${wantsUserInfo ? "0" : "9999999"}\n` +
        `Options=ATTLOG\n`;

      if (cmd) {
        body += `C:${cmd.id}:${cmd.command}\n`;
        await ackCommand(cmd.id, true);
        logger.info({ sn, cmdId: cmd.id, command: cmd.command }, "ADMS command delivered via getrequest INFO");
      }

      logger.info({ sn, pushver, cmdSent: cmd?.id ?? null }, "ADMS getrequest INFO — registration config sent");
      return res.send(body);
    }

    // Plain heartbeat — serve any pending command or OK
    const cmd = await getNextCommand();
    if (cmd) {
      await ackCommand(cmd.id, true);
      logger.info({ sn, cmdId: cmd.id }, "ADMS command delivered via getrequest heartbeat");
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

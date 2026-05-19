import { prisma } from "../../config/prisma.js";
import { logger } from "../../config/logger.js";
import { getIO } from "../../config/socket.js";

// ─── Device heartbeat state (in-memory) ──────────────────────────────────────

interface DeviceState {
  sn: string;
  lastSeen: Date;
}

let deviceState: DeviceState | null = null;
let _requestUserInfo = false;

export function updateDeviceHeartbeat(sn: string): void {
  deviceState = { sn, lastSeen: new Date() };
}

export function getDeviceStatus(): { conectado: boolean; sn?: string; lastSeen?: Date } {
  if (!deviceState) return { conectado: false };
  const secAgo = (Date.now() - deviceState.lastSeen.getTime()) / 1000;
  return {
    conectado: secAgo < 120,
    sn: deviceState.sn,
    lastSeen: deviceState.lastSeen,
  };
}

export function setRequestUserInfo(): void {
  _requestUserInfo = true;
}

export function consumeRequestUserInfo(): boolean {
  const val = _requestUserInfo;
  _requestUserInfo = false;
  return val;
}

// ─── Attendance parsing ───────────────────────────────────────────────────────

const IN_OUT_MAP: Record<number, string> = {
  0: "ENTRADA",
  1: "SALIDA",
  2: "DESCANSO_SALIDA",
  3: "DESCANSO_ENTRADA",
  4: "ENTRADA_EXTRA",
  5: "SALIDA_EXTRA",
};

function mapTipo(status: number): string {
  return IN_OUT_MAP[status] ?? "OTRO";
}

export interface ParsedRecord {
  deviceUserId: string;
  fecha: Date;
  tipo: string;
}

export function parseAttlogBody(body: string): ParsedRecord[] {
  const records: ParsedRecord[] = [];
  for (const line of body.split("\n")) {
    const parts = line.trim().split("\t");
    if (parts.length < 3) continue;
    const deviceUserId = parts[0]?.trim();
    const dateStr = parts[1]?.trim();
    const statusStr = parts[2]?.trim();
    if (!deviceUserId || !dateStr) continue;
    const fecha = new Date(dateStr);
    if (isNaN(fecha.getTime())) continue;
    records.push({ deviceUserId, fecha, tipo: mapTipo(parseInt(statusStr ?? "0", 10)) });
  }
  return records;
}

// ─── Process attendance records ───────────────────────────────────────────────

export async function processAttendance(records: ParsedRecord[]): Promise<{
  nuevos: number;
  duplicados: number;
  sinEmpleado: number;
}> {
  const result = { nuevos: 0, duplicados: 0, sinEmpleado: 0 };
  if (!records.length) return result;

  const employees = await prisma.employee.findMany({
    select: { id: true, deviceUserId: true, nombre: true, cargo: true },
  });
  const empMap = new Map(employees.map((e) => [e.deviceUserId, e]));

  for (const record of records) {
    const employee = empMap.get(record.deviceUserId) ?? null;
    if (!employee) result.sinEmpleado++;

    try {
      const log = await prisma.asistenciaLog.create({
        data: {
          deviceUserId: record.deviceUserId,
          fecha: record.fecha,
          tipo: record.tipo,
          employeeId: employee?.id ?? null,
        },
      });
      result.nuevos++;

      const io = getIO();
      if (io) {
        io.emit("attendance:new", {
          id: log.id,
          fecha: log.fecha,
          tipo: log.tipo,
          deviceUserId: log.deviceUserId,
          empleado: employee
            ? {
                id: employee.id,
                nombre: employee.nombre,
                cargo: (employee as Record<string, unknown>)["cargo"] as string | null ?? null,
              }
            : null,
        });
      }
    } catch {
      result.duplicados++;
    }
  }

  logger.info(result, "ADMS attendance processed");
  return result;
}

// ─── Process USERINFO from device ────────────────────────────────────────────

export async function processUserInfo(body: string): Promise<{
  nuevos: number;
  actualizados: number;
  ignorados: number;
}> {
  const result = { nuevos: 0, actualizados: 0, ignorados: 0 };

  for (const line of body.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    let pin: string | null = null;
    let nombre: string | null = null;

    // Format A — KEY=VALUE: "PIN=1\tName=Juan\tPri=0\t..."
    if (trimmed.includes("PIN=")) {
      for (const part of trimmed.split("\t")) {
        const eqIdx = part.indexOf("=");
        if (eqIdx === -1) continue;
        const key = part.substring(0, eqIdx).trim();
        const val = part.substring(eqIdx + 1).trim();
        if (key === "PIN") pin = val;
        if (key === "Name") nombre = val;
      }
    } else {
      // Format B — positional: "1\tJuan\t0\t..."
      const parts = trimmed.split("\t");
      pin = parts[0]?.trim() ?? null;
      nombre = parts[1]?.trim() ?? null;
    }

    if (!pin || !nombre) {
      result.ignorados++;
      continue;
    }

    try {
      const existing = await prisma.employee.findUnique({
        where: { deviceUserId: pin },
        select: { id: true },
      });

      if (existing) {
        result.actualizados++;
      } else {
        await prisma.employee.create({
          data: {
            nombre,
            deviceUserId: pin,
            syncStatus: "SYNCED",
          },
        });
        result.nuevos++;
      }
    } catch {
      result.ignorados++;
    }
  }

  logger.info(result, "ADMS USERINFO processed");
  return result;
}

// ─── Command queue ────────────────────────────────────────────────────────────

export async function getNextCommand(): Promise<{ id: number; command: string } | null> {
  const item = await prisma.syncQueue.findFirst({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
  });
  if (!item) return null;

  const p = item.payload as Record<string, unknown>;
  let command: string;

  if (item.action === "CREATE" || item.action === "UPDATE") {
    command = `DATA UPDATE USERINFO PIN=${p["pin"]}\tName=${p["name"]}\tPri=0\tCard=\tPwd=`;
  } else if (item.action === "DELETE") {
    command = `DATA DELETE USERINFO PIN=${p["pin"]}`;
  } else {
    return null;
  }

  return { id: item.id, command };
}

export async function ackCommand(id: number, success: boolean): Promise<void> {
  const item = await prisma.syncQueue.findUnique({ where: { id } });
  if (!item) return;

  await prisma.syncQueue.update({
    where: { id },
    data: { status: success ? "SYNCED" : "ERROR" },
  });

  if ((item.action === "CREATE" || item.action === "UPDATE") && success) {
    const p = item.payload as Record<string, unknown>;
    const pin = p["pin"] as string;
    if (pin) {
      await prisma.employee.updateMany({
        where: { deviceUserId: pin },
        data: { syncStatus: "SYNCED" },
      });
    }
  }
}

// ─── Attendance query ─────────────────────────────────────────────────────────

export interface AttendanceQuery {
  empleadoId?: number | undefined;
  desde?: Date | undefined;
  hasta?: Date | undefined;
  tipo?: string | undefined;
  page?: number | undefined;
  limit?: number | undefined;
}

export async function getAttendanceLogs(query: AttendanceQuery) {
  const page = query.page ?? 1;
  const limit = query.limit ?? 50;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (query.empleadoId) where["employeeId"] = query.empleadoId;
  if (query.tipo) where["tipo"] = query.tipo;
  if (query.desde || query.hasta) {
    where["fecha"] = {
      ...(query.desde ? { gte: query.desde } : {}),
      ...(query.hasta ? { lte: query.hasta } : {}),
    };
  }

  const [logs, total] = await Promise.all([
    prisma.asistenciaLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { fecha: "desc" },
      include: {
        employee: { select: { id: true, nombre: true, cargo: true } },
      },
    }),
    prisma.asistenciaLog.count({ where }),
  ]);

  return {
    logs: logs.map((l) => ({
      id: l.id,
      fecha: l.fecha,
      tipo: l.tipo,
      deviceUserId: l.deviceUserId,
      empleado: l.employee
        ? {
            id: l.employee.id,
            nombre: l.employee.nombre,
            cargo: (l.employee as Record<string, unknown>)["cargo"] as string | null ?? null,
          }
        : null,
    })),
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}

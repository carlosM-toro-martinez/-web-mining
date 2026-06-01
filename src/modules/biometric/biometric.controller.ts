import type { Response } from "express";
import type { AuthRequest } from "../../middleware/auth.middleware.js";
import { z } from "zod";
import { getDeviceStatus, getAttendanceLogs, setRequestUserInfo, queueAttlogQuery } from "./biometric.service.js";
import { prisma } from "../../config/prisma.js";

const attendanceQuerySchema = z.object({
  empleadoId: z.coerce.number().int().positive().optional(),
  desde: z.coerce.date().optional(),
  hasta: z.coerce.date().optional(),
  tipo: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(500).default(50),
});

export const biometricController = {
  // GET /api/biometric/status
  async deviceStatus(_req: AuthRequest, res: Response) {
    const data = await getDeviceStatus();
    res.json({ success: true, data });
  },

  // GET /api/biometric/attendance
  async getAttendance(req: AuthRequest, res: Response) {
    try {
      const parsed = attendanceQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        return res
          .status(400)
          .json({ success: false, error: "Parámetros inválidos", details: parsed.error.flatten() });
      }
      const result = await getAttendanceLogs(parsed.data);
      res.json({ success: true, data: result.logs, meta: result.meta });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  },

  // GET /api/biometric/device-users — employees confirmed synced to device
  async deviceUsers(_req: AuthRequest, res: Response) {
    try {
      const employees = await prisma.employee.findMany({
        where: { syncStatus: "SYNCED", activo: true },
        select: { id: true, nombre: true, deviceUserId: true, cargo: true },
        orderBy: { nombre: "asc" },
      });
      res.json({
        success: true,
        data: employees.map((e) => ({
          employeeId: e.id,
          deviceUserId: e.deviceUserId,
          nombre: e.nombre,
          cargo: (e as Record<string, unknown>)["cargo"] as string | null ?? null,
        })),
      });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  },

  // POST /api/biometric/request-device-users — asks device to send its user list on next heartbeat
  async requestDeviceUsers(_req: AuthRequest, res: Response) {
    await setRequestUserInfo();
    res.json({
      success: true,
      data: {
        message: "El dispositivo enviará su lista de usuarios en el próximo heartbeat (~30s). Revisa GET /api/employees para ver los importados.",
      },
    });
  },

  // POST /api/biometric/sync-attendance — manual full sync from device
  // Queues DATA QUERY ATTLOG from 2000 so device sends ALL its stored records.
  // Records already in DB are silently dropped by the unique constraint.
  // The command is delivered on the device's next heartbeat (~5-30s).
  async syncAttendance(req: AuthRequest, res: Response) {
    try {
      const sn = String((req.query["sn"] as string) ?? "NYU7245000560");
      await queueAttlogQuery(sn, true); // full=true → startTime=2000-01-01
      res.json({
        success: true,
        data: { message: "Sync encolado. El dispositivo enviará todos sus registros en el próximo heartbeat (~30s)." },
      });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  },

  // GET /api/biometric/pending-commands — see queued ADMS commands
  async pendingCommands(_req: AuthRequest, res: Response) {
    try {
      const pending = await prisma.syncQueue.findMany({
        where: { status: "PENDING" },
        orderBy: { createdAt: "asc" },
      });
      res.json({ success: true, data: pending });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  },
};

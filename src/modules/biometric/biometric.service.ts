import { PrismaClient, SyncStatus } from "@prisma/client";

const prisma = new PrismaClient();

export class BiometricService {
  async getPendingCommands(): Promise<{ commands: string; ids: number[] }> {
    const pending = await prisma.syncQueue.findMany({
      where: { status: SyncStatus.PENDING },
    });

    const commands: string[] = [];
    const ids: number[] = [];

    for (const item of pending) {
      ids.push(item.id);

      if (item.action === "CREATE") {
        const payload = item.payload as any;
        commands.push(
          `C:1:DATA UPDATE USERINFO PIN=${payload.deviceUserId}\tName=${payload.nombre}\tPrivilege=0\tPassword=\tCard=\tGroup=1\tTimezone=1\tPIN2=${payload.deviceUserId}`,
        );
      }
      // Agregar lógica para UPDATE y DELETE si es necesario
    }

    return { commands: commands.join("\r\n"), ids };
  }

  async markCommandsAsSynced(ids: number[]): Promise<void> {
    if (ids.length === 0) return;

    await prisma.syncQueue.updateMany({
      where: { id: { in: ids } },
      data: { status: SyncStatus.SYNCED },
    });
  }

  async parseAttendance(body: string): Promise<void> {
    // Parsear el body que viene del dispositivo
    // Formato típico para OPERLOG: "OPLOG PIN\tDateTime\tStatus\t..."
    const lines = body.split("\n");
    for (const line of lines) {
      if (line.trim()) {
        const parts = line.split("\t");
        if (parts.length >= 2) {
          // Para OPERLOG, el formato es "OPLOG PIN" \t "DateTime" \t "Status" \t ...
          const deviceUserIdRaw = parts[0];
          const fechaStr = parts[1];
          const tipo = parts[2] || "1"; // Default status 1 (check-in)

          if (deviceUserIdRaw) {
            // Extraer PIN del "OPLOG PIN"
            const pinMatch = deviceUserIdRaw.match(/OPLOG (\d+)/);
            const deviceUserId = pinMatch ? pinMatch[1] : deviceUserIdRaw;

            if (deviceUserId && fechaStr) {
              // Parsear fecha en formato "YYYY-MM-DD HH:MM:SS"
              const fecha = new Date(fechaStr.replace(" ", "T"));

              // Buscar empleado por deviceUserId
              const employee = await prisma.employee.findFirst({
                where: { deviceUserId },
              });

              await prisma.asistenciaLog.create({
                data: {
                  deviceUserId,
                  fecha,
                  tipo,
                  employeeId: employee?.id || null,
                },
              });
            }
          }
        }
      }
    }
  }

  async getAllLogs(): Promise<any[]> {
    const logs = await prisma.asistenciaLog.findMany({
      include: {
        employee: true,
      },
      orderBy: {
        fecha: "desc",
      },
    });
    return logs;
  }
}

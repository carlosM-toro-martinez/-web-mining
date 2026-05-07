import type { Request, Response } from "express";
import { BiometricService } from "./biometric.service.js";

const biometricService = new BiometricService();

export class BiometricController {
  async getRequest(req: Request, res: Response) {
    try {
      // El dispositivo utiliza este endpoint para saber si hay datos que enviar
      res.set("Content-Type", "text/plain");
      res.send("OK");
    } catch (error) {
      res.status(500).send("Error");
    }
  }

  async getCData(req: Request, res: Response) {
    try {
      const { commands, ids } = await biometricService.getPendingCommands();
      if (commands.length > 0) {
        await biometricService.markCommandsAsSynced(ids);
      }

      res.set("Content-Type", "text/plain");
      res.send(commands);
    } catch (error) {
      res.status(500).send("Error");
    }
  }

  async postCData(req: Request, res: Response) {
    try {
      const body = req.body; // Asumiendo que es string
      await biometricService.parseAttendance(body);
      res.set("Content-Type", "text/plain");
      res.send("OK");
    } catch (error) {
      res.status(500).send("Error");
    }
  }

  async getLogs(req: Request, res: Response) {
    try {
      const logs = await biometricService.getAllLogs();
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "Error fetching logs" });
    }
  }
}

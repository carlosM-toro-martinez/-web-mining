import { Server } from "socket.io";
import type { Server as HttpServer } from "http";
import { logger } from "./logger.js";

let io: Server | null = null;

export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    logger.info({ socketId: socket.id }, "Socket.io client connected");
    socket.on("disconnect", () => {
      logger.info({ socketId: socket.id }, "Socket.io client disconnected");
    });
  });

  return io;
}

export function getIO(): Server | null {
  return io;
}

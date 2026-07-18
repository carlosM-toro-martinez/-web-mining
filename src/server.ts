import "dotenv/config";
import http from "http";
import app from "./app.js";
import { initSocket } from "./config/socket.js";

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);
initSocket(server);

// Backfill y cierre de mes pueden tardar varios minutos
server.headersTimeout = 600_000;
server.requestTimeout = 600_000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

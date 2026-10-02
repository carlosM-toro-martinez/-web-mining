import "dotenv/config";
import http from "http";
import app from "./app.js";
import { initSocket } from "./config/socket.js";
import { seedLogistica } from "./seedLogistica.js";

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);
initSocket(server);

// Backfill y cierre de mes pueden tardar varios minutos
server.headersTimeout = 600_000;
server.requestTimeout = 600_000;

// Semilla idempotente: se asegura de que la flota real, los catálogos base
// y las tarifas fijas existan en CUALQUIER ambiente donde arranque el
// servidor (local, prod, etc.), sin depender de correrla a mano ni de un
// paso aparte en el deploy. No inserta nada si ya existe.
await seedLogistica();

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

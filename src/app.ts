import express from "express";
import cors from "cors";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import swaggerUi from "swagger-ui-express";

import routes from "./routes/index.js";
import { logger } from "./config/logger.js";

const app = express();

app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(pinoHttp({ logger }));

const swaggerDocument = {
  openapi: "3.0.0",
  info: {
    title: "API Minera Marte",
    version: "1.0.0",
    description: "API para gestión de inventario en minería",
  },
  servers: [{ url: "http://localhost:3000/api" }],
  paths: {
    "/auth/login": {
      post: {
        summary: "Login de usuario",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { email: { type: "string" }, password: { type: "string" } },
              },
            },
          },
        },
        responses: { 200: { description: "Login exitoso" } },
      },
    },
    "/productos": {
      get: {
        summary: "Obtener productos",
        parameters: [
          { name: "page", in: "query", schema: { type: "integer" } },
          { name: "limit", in: "query", schema: { type: "integer" } },
          { name: "search", in: "query", schema: { type: "string" } },
        ],
        responses: { 200: { description: "Lista de productos" } },
      },
      post: {
        summary: "Crear producto",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  codigo: { type: "string" },
                  nombre: { type: "string" },
                  unidad: { type: "string" },
                  categoriaId: { type: "integer" },
                  esEpp: { type: "boolean" },
                },
              },
            },
          },
        },
        responses: { 201: { description: "Producto creado" } },
      },
    },
  },
};

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use("/api", routes);

// Global error handler
// eslint-disable-next-line no-unused-vars
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ err }, "Unhandled error");
  res.status(500).json({ success: false, error: "Internal server error" });
});

export default app;

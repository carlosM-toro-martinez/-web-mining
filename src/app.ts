import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import swaggerUi from "swagger-ui-express";

import { logger } from "./config/logger.js";
import routes from "./routes/index.js";
import iclockRoutes from "./modules/biometric/iclock.routes.js";

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(
  express.text({
    type: (req) => {
      const ct = req.headers["content-type"] ?? "";
      // Exclude multipart and urlencoded so express.urlencoded can parse those
      return !ct.startsWith("multipart/") && !ct.startsWith("application/x-www-form-urlencoded");
    },
  }),
);
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// ADMS protocol — mounted BEFORE helmet so ZKTeco device does not receive
// browser security headers (HSTS, CSP upgrade-insecure-requests) that can
// cause the device firmware to silently upgrade subsequent POSTs to HTTPS
// and fail to deliver attendance records.
app.use("/iclock", iclockRoutes);

// Helmet applies only to browser-facing routes (/api, /api-docs)
app.use(helmet());

// Log request info for development visibility
app.use((req, res, next) => {
  const start = Date.now();
  logger.info({ method: req.method, url: req.originalUrl }, "Incoming request");

  // Capture response body for logging
  const originalJson = res.json;
  const originalSend = res.send;
  let responseBody: any;

  res.json = function (body) {
    responseBody = body;
    return originalJson.call(this, body);
  };

  res.send = function (body) {
    if (typeof body === "object") {
      responseBody = body;
    } else {
      responseBody = body;
    }
    return originalSend.call(this, body);
  };

  // Log response when finished
  res.on("finish", () => {
    const duration = Date.now() - start;
    const logData: any = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
    };

    if (responseBody !== undefined) {
      if (typeof responseBody === "object" && responseBody !== null) {
        const summary: any = { success: responseBody.success };
        if (responseBody.error) summary.error = responseBody.error;
        if (responseBody.meta) summary.meta = responseBody.meta;
        if (Array.isArray(responseBody.data)) summary.dataCount = responseBody.data.length;
        logData.response = summary;
      } else {
        logData.response = String(responseBody).slice(0, 120);
      }
    }

    logger.info(logData, "Request completed");
  });

  next();
});

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
    "/auth/forgot-password": {
      post: {
        summary: "Solicitar recuperación de contraseña",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { email: { type: "string" } },
              },
            },
          },
        },
        responses: { 200: { description: "Correo enviado" } },
      },
    },
    "/auth/reset-password": {
      post: {
        summary: "Resetear contraseña",
        parameters: [{ name: "token", in: "query", schema: { type: "string" }, required: true }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { password: { type: "string" } },
              },
            },
          },
        },
        responses: { 200: { description: "Contraseña reseteada" } },
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
  const status = (err as any).statusCode || 500;
  const message = (err as any).message || "Internal server error";
  const details = (err as any).details;

  logger.error({ err, status }, "Unhandled error");

  res.status(status).json({ success: false, message, ...(details ? { details } : {}) });
});

export default app;

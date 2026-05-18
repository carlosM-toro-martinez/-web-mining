import { Router } from "express";
import { z } from "zod";
import { authenticate, authorize } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { pedidosController } from "./pedidos.controller.js";
import { createPedidoSchema } from "./pedidos.schema.js";

const idSchema = z.object({ id: z.string().min(1) });
const validateParams = (schema: any) => (req: any, res: any, next: any) => {
  const result = schema.safeParse(req.params);
  if (!result.success) return res.status(400).json({ success: false, error: "Params inválidos" });
  next();
};

const router = Router();
router.use(authenticate);

// Listar pedidos
router.get("/", pedidosController.getPedidos);

// Obtener pedido por ID
router.get("/:id", validateParams(idSchema), pedidosController.getPedidoById);

// Crear pedido (ADMIN, ALMACENERO)
router.post("/", authorize("ADMIN", "ALMACENERO"), validate(createPedidoSchema), pedidosController.createPedido);

// Cancelar/cerrar pedido (ADMIN)
router.patch("/:id/cancelar", authorize("ADMIN"), validateParams(idSchema), pedidosController.cancelarPedido);

export default router;

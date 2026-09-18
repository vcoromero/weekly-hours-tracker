import { Router } from "express";
import { z } from "zod";
import {
  authController,
  workersController,
  recordsController,
  weeksController,
  invoiceController,
  paymentController,
  requireAuth,
} from "./container.js";
import { validateBody, validateParams } from "./middleware/validate.middleware.js";

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const idParamSchema = z.object({
  id: z.string().uuid(),
});

const weekIdParamSchema = z.object({
  weekId: z.string().uuid(),
});

const workerWeekParamsSchema = z.object({
  workerId: z.string().uuid(),
  weekId: z.string().uuid(),
});

const createWorkerSchema = z.object({
  name: z.string().min(1),
  isRegular: z.boolean(),
});

const updateWorkerSchema = z.object({
  name: z.string().min(1).optional(),
  isRegular: z.boolean().optional(),
});

const createRecordSchema = z.object({
  weekId: z.string().uuid(),
  workerId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  hours: z.number().positive(),
  hourlyRate: z.number().positive(),
  description: z.string().optional(),
});

const recordInputSchema = z.object({
  workerId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  hours: z.number().positive(),
  hourlyRate: z.number().positive(),
  description: z.string().optional(),
});

const saveWeekSchema = z.object({
  weekId: z.string().uuid(),
  records: z.array(recordInputSchema).min(1, "Cannot save week without records"),
});

const previewWeekSchema = z.object({
  weekId: z.string().uuid(),
  records: z.array(recordInputSchema),
});

const updateWeekSchema = z.object({
  records: z.array(recordInputSchema).min(1, "Cannot save week without records"),
});

// Auth
router.post("/auth/login", validateBody(loginSchema), authController.login);

const invoiceSchema = z.object({
  weekIds: z.array(z.string().uuid()).min(1).max(2),
});

const payWorkerSchema = z.object({
  weekIds: z.array(z.string().uuid()).min(1).max(10),
});

// Workers (protected)
router.get("/workers", requireAuth, workersController.list);
router.post("/workers", requireAuth, validateBody(createWorkerSchema), workersController.create);
router.get("/workers/:id", requireAuth, validateParams(idParamSchema), workersController.getById);
router.put("/workers/:id", requireAuth, validateParams(idParamSchema), validateBody(updateWorkerSchema), workersController.update);
router.delete("/workers/:id", requireAuth, validateParams(idParamSchema), workersController.delete);
router.get("/workers/:id/history", requireAuth, validateParams(idParamSchema), workersController.history);
router.get("/workers/:id/stats", requireAuth, validateParams(idParamSchema), workersController.stats);
router.get("/workers/:id/dashboard", requireAuth, validateParams(idParamSchema), workersController.dashboard);

// Pay worker (protected)
router.post(
  "/workers/:id/pay",
  requireAuth,
  validateParams(idParamSchema),
  validateBody(payWorkerSchema),
  paymentController.pay,
);

// Invoice PDF (protected)
router.post(
  "/workers/:id/invoice/pdf",
  requireAuth,
  validateParams(idParamSchema),
  validateBody(invoiceSchema),
  invoiceController.generatePdf,
);

// Worker-week (protected)
router.get("/workers/:workerId/weeks/:weekId", requireAuth, validateParams(workerWeekParamsSchema), weeksController.getByWorkerAndWeek);

// Records (protected)
router.post("/records", requireAuth, validateBody(createRecordSchema), recordsController.create);
router.get("/records/week/:weekId", requireAuth, validateParams(weekIdParamSchema), recordsController.getByWeek);
router.delete("/records/:id", requireAuth, validateParams(idParamSchema), recordsController.delete);

// Worker-week records (protected)
router.delete(
  "/workers/:workerId/weeks/:weekId/records",
  requireAuth,
  validateParams(workerWeekParamsSchema),
  recordsController.deleteByWorkerAndWeek,
);

// Weeks (protected)
router.get("/weeks", requireAuth, weeksController.list);
router.get("/weeks/available", requireAuth, weeksController.available);
router.get("/weeks/current", requireAuth, weeksController.current);
router.get("/weeks/:id", requireAuth, validateParams(idParamSchema), weeksController.getById);
router.put("/weeks/:id", requireAuth, validateParams(idParamSchema), validateBody(updateWeekSchema), weeksController.update);
router.delete("/weeks/:id", requireAuth, validateParams(idParamSchema), weeksController.delete);
router.post("/weeks/preview", requireAuth, validateBody(previewWeekSchema), weeksController.preview);
router.post("/weeks/save", requireAuth, validateBody(saveWeekSchema), weeksController.save);
router.post("/weeks/:weekId/save-day", requireAuth, validateParams(weekIdParamSchema), weeksController.saveDay);

export default router;

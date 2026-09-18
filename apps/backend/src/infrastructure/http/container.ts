import { prisma } from "../persistence/prisma/prisma-client.js";
import { JwtBcryptAuthAdapter } from "../auth/jwt-bcrypt.adapter.js";

import { WorkerPrismaRepository } from "../persistence/prisma/worker.prisma-repository.js";
import { RecordPrismaRepository } from "../persistence/prisma/record.prisma-repository.js";
import { WeekPrismaRepository } from "../persistence/prisma/week.prisma-repository.js";
import { WorkerPaymentPrismaRepository } from "../persistence/prisma/worker-payment.prisma-repository.js";

import { WeekCalculator } from "../../domain/services/week-calculator.js";
import { TotalsCalculator } from "../../domain/services/totals-calculator.js";
import { InvoiceService } from "../../domain/services/invoice.service.js";

import {
  CreateWorkerUseCase,
  GetWorkerByIdUseCase,
  ListWorkersUseCase,
  UpdateWorkerUseCase,
  DeleteWorkerUseCase,
  GetWorkerHistoryUseCase,
  GetWorkerStatsUseCase,
  GetWorkerDashboardUseCase,
} from "../../application/use-cases/workers/index.js";

import {
  LoginUseCase,
  VerifyTokenUseCase,
} from "../../application/use-cases/auth/index.js";

import {
  CreateRecordUseCase,
  GetRecordsByWeekUseCase,
  DeleteRecordUseCase,
  DeleteWorkerWeekRecordsUseCase,
} from "../../application/use-cases/records/index.js";

import {
  GetOrCreateCurrentWeekUseCase,
  GetCurrentWeekUseCase,
  ListWeeksUseCase,
  ListAllWeeksUseCase,
  PreviewWeekUseCase,
  SaveWeekUseCase,
  GetWeekDetailUseCase,
  UpdateWeekUseCase,
  GetWeekDetailByWorkerUseCase,
  DeleteWeekUseCase,
  SaveDayUseCase,
} from "../../application/use-cases/weeks/index.js";

import { GenerateInvoicePdfUseCase } from "../../application/use-cases/invoices/generate-invoice-pdf.use-case.js";
import { PayWorkerUseCase } from "../../application/use-cases/payments/pay-worker.use-case.js";

import { createAuthController } from "./controllers/auth.controller.js";
import { createWorkersController } from "./controllers/workers.controller.js";
import { createRecordsController } from "./controllers/records.controller.js";
import { createWeeksController } from "./controllers/weeks.controller.js";
import { createInvoiceController } from "./controllers/invoice.controller.js";
import { createPaymentController } from "./controllers/payment.controller.js";
import { createAuthMiddleware } from "./middleware/auth.middleware.js";

const authAdapter = new JwtBcryptAuthAdapter();

const workerRepo = new WorkerPrismaRepository(prisma);
const recordRepo = new RecordPrismaRepository(prisma);
const weekRepo = new WeekPrismaRepository(prisma);
const paymentRepo = new WorkerPaymentPrismaRepository(prisma);

const weekCalc = new WeekCalculator();
const totalsCalc = new TotalsCalculator();
const invoiceService = new InvoiceService();

// Auth use cases
const loginUseCase = new LoginUseCase(authAdapter);
const verifyTokenUseCase = new VerifyTokenUseCase(authAdapter);

// Worker use cases
const createWorkerUseCase = new CreateWorkerUseCase(workerRepo);
const getWorkerByIdUseCase = new GetWorkerByIdUseCase(workerRepo);
const listWorkersUseCase = new ListWorkersUseCase(workerRepo);
const updateWorkerUseCase = new UpdateWorkerUseCase(workerRepo);
const deleteWorkerUseCase = new DeleteWorkerUseCase(workerRepo);
const getWorkerHistoryUseCase = new GetWorkerHistoryUseCase(recordRepo, weekCalc, totalsCalc, paymentRepo);
const getWorkerStatsUseCase = new GetWorkerStatsUseCase(recordRepo, totalsCalc);
const getWorkerDashboardUseCase = new GetWorkerDashboardUseCase(recordRepo, weekCalc, totalsCalc, getWorkerStatsUseCase, paymentRepo);

// Record use cases
const createRecordUseCase = new CreateRecordUseCase(recordRepo, weekRepo, weekCalc);
const getRecordsByWeekUseCase = new GetRecordsByWeekUseCase(recordRepo, weekCalc, totalsCalc);
const deleteRecordUseCase = new DeleteRecordUseCase(recordRepo, paymentRepo);
const deleteWorkerWeekRecordsUseCase = new DeleteWorkerWeekRecordsUseCase(recordRepo, workerRepo, weekRepo, paymentRepo);

// Week use cases
const getOrCreateCurrentWeekUseCase = new GetOrCreateCurrentWeekUseCase(weekRepo, weekCalc);
const getCurrentWeekUseCase = new GetCurrentWeekUseCase(getOrCreateCurrentWeekUseCase, recordRepo, weekCalc, totalsCalc);
const listWeeksUseCase = new ListWeeksUseCase(weekRepo, recordRepo, weekCalc, totalsCalc);
const listAllWeeksUseCase = new ListAllWeeksUseCase(weekRepo, weekCalc);
const previewWeekUseCase = new PreviewWeekUseCase(weekRepo, workerRepo, weekCalc, totalsCalc);
const saveWeekUseCase = new SaveWeekUseCase(weekRepo, recordRepo, paymentRepo);
const getWeekDetailUseCase = new GetWeekDetailUseCase(weekRepo, recordRepo, weekCalc, totalsCalc, paymentRepo);
const updateWeekUseCase = new UpdateWeekUseCase(weekRepo, recordRepo, paymentRepo);
const getWeekDetailByWorkerUseCase = new GetWeekDetailByWorkerUseCase(weekRepo, recordRepo, weekCalc, totalsCalc, paymentRepo);
const deleteWeekUseCase = new DeleteWeekUseCase(weekRepo, paymentRepo);
const saveDayUseCase = new SaveDayUseCase(weekRepo, recordRepo);

// Invoice use cases
const generateInvoicePdfUseCase = new GenerateInvoicePdfUseCase(
  workerRepo,
  weekRepo,
  recordRepo,
  paymentRepo,
);

// Payment use cases
const payWorkerUseCase = new PayWorkerUseCase(workerRepo, weekRepo, recordRepo, paymentRepo);

export const authController = createAuthController({ login: loginUseCase });
export const workersController = createWorkersController({
  createWorker: createWorkerUseCase,
  getWorkerById: getWorkerByIdUseCase,
  listWorkers: listWorkersUseCase,
  updateWorker: updateWorkerUseCase,
  deleteWorker: deleteWorkerUseCase,
  getWorkerHistory: getWorkerHistoryUseCase,
  getWorkerStats: getWorkerStatsUseCase,
  getWorkerDashboard: getWorkerDashboardUseCase,
});
export const recordsController = createRecordsController({
  createRecord: createRecordUseCase,
  getRecordsByWeek: getRecordsByWeekUseCase,
  deleteRecord: deleteRecordUseCase,
  deleteWorkerWeekRecords: deleteWorkerWeekRecordsUseCase,
});
export const weeksController = createWeeksController({
  getCurrentWeek: getCurrentWeekUseCase,
  listWeeks: listWeeksUseCase,
  listAllWeeks: listAllWeeksUseCase,
  previewWeek: previewWeekUseCase,
  saveWeek: saveWeekUseCase,
  getWeekDetail: getWeekDetailUseCase,
  updateWeek: updateWeekUseCase,
  getWeekDetailByWorker: getWeekDetailByWorkerUseCase,
  deleteWeek: deleteWeekUseCase,
  saveDay: saveDayUseCase,
});
export const invoiceController = createInvoiceController({
  generateInvoicePdf: generateInvoicePdfUseCase,
  invoiceService,
});
export const paymentController = createPaymentController({ payWorker: payWorkerUseCase });

export const requireAuth = createAuthMiddleware(verifyTokenUseCase);

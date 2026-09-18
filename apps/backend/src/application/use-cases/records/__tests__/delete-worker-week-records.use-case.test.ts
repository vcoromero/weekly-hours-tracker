import { describe, it, expect, beforeEach, vi } from "vitest";
import { DeleteWorkerWeekRecordsUseCase } from "../delete-worker-week-records.use-case";
import type { RecordRepository } from "../../../../domain/ports/record.repository";
import type { WorkerRepository } from "../../../../domain/ports/worker.repository";
import type { WeekRepository } from "../../../../domain/ports/week.repository";
import type { WorkerPaymentRepository } from "../../../../domain/ports/worker-payment.repository";
import type { Worker } from "../../../../domain/entities/worker.entity";
import type { Week } from "../../../../domain/entities/week.entity";
import { NotFoundError } from "../../../../domain/errors/not-found.error";
import { ConflictError } from "../../../../domain/errors/conflict.error";

describe("DeleteWorkerWeekRecordsUseCase", () => {
  let recordRepo: RecordRepository;
  let workerRepo: WorkerRepository;
  let weekRepo: WeekRepository;
  let paymentRepo: WorkerPaymentRepository;
  let useCase: DeleteWorkerWeekRecordsUseCase;

  const worker: Worker = {
    id: "worker-1",
    name: "Alice",
    isRegular: true,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
  };

  const week: Week = {
    id: "week-1",
    label: "W23",
    startDate: new Date("2026-06-01"),
    endDate: new Date("2026-06-07"),
    status: "draft",
    createdAt: new Date("2026-06-01"),
  };

  beforeEach(() => {
    recordRepo = {
      create: async () => ({} as any),
      findByWeek: async () => [],
      findByWorker: async () => [],
      findById: async () => null,
      findDuplicate: async () => null,
      delete: async () => {},
      deleteByWeek: async () => {},
      deleteByWorkerAndWeek: vi.fn(async () => 3),
      createMany: async () => {},
      findByWeekSimple: async () => [],
      markDaySaved: async () => 0,
      unmarkDaySaved: async () => 0,
    };

    workerRepo = {
      findAll: async () => [],
      findAllWithFilters: async () => ({ workers: [], total: 0 }),
      findById: vi.fn(async () => worker),
      create: async () => worker,
      update: async () => worker,
      delete: async () => {},
      countRecords: async () => 0,
    };

    weekRepo = {
      findById: vi.fn(async () => week),
      findByDateRange: async () => null,
      create: async () => week,
      updateStatus: async () => week,
      findAllSaved: async () => [],
      findAllSavedPaginated: async () => ({ weeks: [], total: 0 }),
      findAll: async () => [],
      delete: async () => {},
    };

    paymentRepo = {
      findByWorkerAndWeeks: vi.fn(async () => []),
      create: async () => ({} as any),
      findByWeekId: async () => [],
    } as unknown as WorkerPaymentRepository;

    useCase = new DeleteWorkerWeekRecordsUseCase(recordRepo, workerRepo, weekRepo, paymentRepo);
  });

  it("deletes all records for a worker-week successfully", async () => {
    const result = await useCase.execute({ workerId: "worker-1", weekId: "week-1" });

    expect(result).toEqual({ deletedCount: 3 });
  });

  it("throws NotFoundError when worker is not found", async () => {
    (workerRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      useCase.execute({ workerId: "nonexistent", weekId: "week-1" }),
    ).rejects.toThrow("Trabajador no encontrado");

    // week should not be looked up (early throw)
    expect(weekRepo.findById).not.toHaveBeenCalled();
    expect(recordRepo.deleteByWorkerAndWeek).not.toHaveBeenCalled();
  });

  it("throws NotFoundError when week is not found", async () => {
    (weekRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      useCase.execute({ workerId: "worker-1", weekId: "nonexistent" }),
    ).rejects.toThrow("Semana no encontrada");

    expect(recordRepo.deleteByWorkerAndWeek).not.toHaveBeenCalled();
  });

  it("throws ConflictError when worker has already been paid for the week", async () => {
    (paymentRepo.findByWorkerAndWeeks as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "payment-1", workerId: "worker-1", weekId: "week-1", totalAmount: 100, paidAt: new Date() },
    ]);

    await expect(
      useCase.execute({ workerId: "worker-1", weekId: "week-1" }),
    ).rejects.toThrow("No se puede eliminar: el trabajador ya fue pagado en esta semana");

    expect(recordRepo.deleteByWorkerAndWeek).not.toHaveBeenCalled();
  });

  it("returns deletedCount: 0 when there are no records to delete", async () => {
    (recordRepo.deleteByWorkerAndWeek as ReturnType<typeof vi.fn>).mockResolvedValue(0);

    const result = await useCase.execute({ workerId: "worker-1", weekId: "week-1" });

    expect(result).toEqual({ deletedCount: 0 });
  });
});

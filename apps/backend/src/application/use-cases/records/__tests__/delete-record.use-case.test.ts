import { describe, it, expect, beforeEach } from "vitest";
import { DeleteRecordUseCase } from "../delete-record.use-case";
import type { RecordRepository } from "../../../../domain/ports/record.repository";
import type { WorkerPaymentRepository } from "../../../../domain/ports/worker-payment.repository";
import type { WorkRecord } from "../../../../domain/entities/work-record.entity";
import type { RecordWithWorker } from "../../../../domain/ports/record.repository";
import { RecordError } from "../../../../domain/errors/record.error";
import { PaymentError } from "../../../../domain/errors/payment.error";

function makeRecordWithWorker(overrides?: Partial<RecordWithWorker>): RecordWithWorker {
  return {
    id: "record-1",
    workerId: "worker-1",
    date: new Date("2026-06-02"),
    hours: 8,
    hourlyRate: 25,
    description: "Cleaning",
    weekId: "week-1",
    daySavedAt: null,
    createdAt: new Date("2026-06-02"),
    worker: { id: "worker-1", name: "Alice" },
    week: { id: "week-1", label: "W23", startDate: new Date("2026-05-30"), endDate: new Date("2026-06-05"), status: "draft" },
    ...overrides,
  } as RecordWithWorker;
}

describe("DeleteRecordUseCase", () => {
  let recordRepo: RecordRepository;
  let paymentRepo: WorkerPaymentRepository;
  let useCase: DeleteRecordUseCase;

  beforeEach(() => {
    recordRepo = {
      create: async () => ({}) as WorkRecord,
      findByWeek: async () => [],
      findByWorker: async () => [],
      findById: async () => null,
      findDuplicate: async () => null,
      delete: async () => {},
      deleteByWeek: async () => {},
      createMany: async () => {},
      findByWeekSimple: async () => [],
      markDaySaved: async () => 0,
      unmarkDaySaved: async () => 0,
      updateMany: async () => {},
    };

    paymentRepo = {
      findByWorkerAndWeeks: async () => [],
      findByWeekId: async () => [],
    } as unknown as WorkerPaymentRepository;

    useCase = new DeleteRecordUseCase(recordRepo, paymentRepo);
  });

  it("deletes a record successfully", async () => {
    recordRepo.findById = async () => makeRecordWithWorker();

    await expect(useCase.execute("record-1")).resolves.toBeUndefined();
  });

  it("deletes a saved record successfully (no lock guard)", async () => {
    recordRepo.findById = async () =>
      makeRecordWithWorker({ daySavedAt: new Date("2026-06-02T10:00:00Z") });

    await expect(useCase.execute("record-1")).resolves.toBeUndefined();
  });

  it("throws RecordError when record not found", async () => {
    recordRepo.findById = async () => null;

    await expect(useCase.execute("nonexistent")).rejects.toThrow(RecordError);
  });

  it("throws PaymentError when record has associated payments", async () => {
    recordRepo.findById = async () => makeRecordWithWorker();
    paymentRepo.findByWorkerAndWeeks = async () => [
      { id: "payment-1", workerId: "worker-1", weekIds: ["week-1"], amount: 100, paidAt: new Date() },
    ] as any;

    await expect(useCase.execute("record-1")).rejects.toThrow(PaymentError);
  });
});

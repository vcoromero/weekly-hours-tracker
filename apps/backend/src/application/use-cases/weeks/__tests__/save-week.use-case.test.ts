import { describe, it, expect, beforeEach, vi } from "vitest";
import { SaveWeekUseCase } from "../save-week.use-case";
import type { WeekRepository } from "../../../../domain/ports/week.repository";
import type { RecordRepository } from "../../../../domain/ports/record.repository";
import type { WorkerPaymentRepository } from "../../../../domain/ports/worker-payment.repository";
import type { Week } from "../../../../domain/entities/week.entity";
import type { WorkRecord } from "../../../../domain/entities/work-record.entity";
import type { WorkerPayment } from "../../../../domain/entities/worker-payment.entity";
import { WeekError } from "../../../../domain/errors/week.error";
import { PaymentError } from "../../../../domain/errors/payment.error";

function makeWeek(overrides?: Partial<Week>): Week {
  return {
    id: "week-1",
    label: "Semana 23",
    startDate: new Date("2026-05-30"),
    endDate: new Date("2026-06-05"),
    status: "draft",
    createdAt: new Date("2026-05-29"),
    ...overrides,
  };
}

function makeRecord(overrides?: Partial<WorkRecord>): WorkRecord {
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
    ...overrides,
  };
}

describe("SaveWeekUseCase", () => {
  let weekRepo: WeekRepository;
  let recordRepo: RecordRepository;
  let paymentRepo: WorkerPaymentRepository;
  let useCase: SaveWeekUseCase;

  beforeEach(() => {
    weekRepo = {
      findById: async () => null,
      findByDateRange: async () => null,
      create: async () => makeWeek(),
      updateStatus: async (id) => makeWeek({ id }),
      findAllSaved: async () => [],
      findAllSavedPaginated: async () => ({ weeks: [], total: 0 }),
      findAll: async () => [],
      delete: async () => {},
    };

    recordRepo = {
      create: async () => makeRecord(),
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
      create: async () => ({} as WorkerPayment),
      findByWeekId: async () => [],
    };

    useCase = new SaveWeekUseCase(weekRepo, recordRepo, paymentRepo);
  });

  it("sets daySavedAt on all records when saving a week", async () => {
    weekRepo.findById = async () => makeWeek();
    paymentRepo.findByWeekId = async () => [];
    recordRepo.findByWeekSimple = async () => [
      makeRecord({ daySavedAt: new Date() }),
      makeRecord({ id: "record-2", daySavedAt: new Date() }),
    ];

    const createManySpy = vi.spyOn(recordRepo, "createMany");

    await useCase.execute("week-1", [
      { workerId: "worker-1", date: "2026-06-02", hours: 8, hourlyRate: 25 },
      { workerId: "worker-2", date: "2026-06-03", hours: 6, hourlyRate: 30 },
    ]);

    expect(createManySpy).toHaveBeenCalledOnce();
    const callArg = createManySpy.mock.calls[0]![0];
    expect(callArg).toHaveLength(2);

    for (const record of callArg) {
      expect(record.daySavedAt).toBeInstanceOf(Date);
      expect(record.daySavedAt).not.toBeNull();
    }

    // All records share the same savedAt timestamp
    expect(callArg[0]!.daySavedAt).toBe(callArg[1]!.daySavedAt);
  });

  it("throws WeekError when week not found", async () => {
    weekRepo.findById = async () => null;

    await expect(useCase.execute("nonexistent", [])).rejects.toThrow(WeekError);
  });

  it("throws WeekError when week is already saved", async () => {
    weekRepo.findById = async () => makeWeek({ status: "saved" });

    await expect(useCase.execute("week-1", [])).rejects.toThrow(WeekError);
  });

  it("throws PaymentError when week has payments", async () => {
    weekRepo.findById = async () => makeWeek();
    paymentRepo.findByWeekId = async () => [
      { id: "pay-1", workerId: "worker-1", weekId: "week-1", totalAmount: 100, paidAt: new Date() } as WorkerPayment,
    ];

    await expect(useCase.execute("week-1", [])).rejects.toThrow(PaymentError);
  });

  it("deletes existing records before creating new ones", async () => {
    weekRepo.findById = async () => makeWeek();
    paymentRepo.findByWeekId = async () => [];
    recordRepo.findByWeekSimple = async () => [];

    const deleteByWeekSpy = vi.spyOn(recordRepo, "deleteByWeek");
    const createManySpy = vi.spyOn(recordRepo, "createMany");

    await useCase.execute("week-1", [
      { workerId: "worker-1", date: "2026-06-02", hours: 8, hourlyRate: 25 },
    ]);

    expect(deleteByWeekSpy).toHaveBeenCalledWith("week-1");
    expect(createManySpy).toHaveBeenCalledOnce();
  });

  it("passes weekId and description through to createMany", async () => {
    weekRepo.findById = async () => makeWeek();
    paymentRepo.findByWeekId = async () => [];
    recordRepo.findByWeekSimple = async () => [
      makeRecord({ daySavedAt: new Date() }),
    ];

    const createManySpy = vi.spyOn(recordRepo, "createMany");

    await useCase.execute("week-1", [
      { workerId: "worker-1", date: "2026-06-02", hours: 8, hourlyRate: 25, description: "Plumbing" },
    ]);

    const callArg = createManySpy.mock.calls[0]![0];
    expect(callArg[0]!.weekId).toBe("week-1");
    expect(callArg[0]!.description).toBe("Plumbing");
  });
});

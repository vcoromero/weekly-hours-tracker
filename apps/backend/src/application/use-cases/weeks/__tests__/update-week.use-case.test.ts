import { describe, it, expect, beforeEach, vi } from "vitest";
import { UpdateWeekUseCase } from "../update-week.use-case";
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
    status: "saved",
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

describe("UpdateWeekUseCase", () => {
  let weekRepo: WeekRepository;
  let recordRepo: RecordRepository;
  let paymentRepo: WorkerPaymentRepository;
  let useCase: UpdateWeekUseCase;

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

    useCase = new UpdateWeekUseCase(weekRepo, recordRepo, paymentRepo);
  });

  it("sets daySavedAt on all new records when updating", async () => {
    weekRepo.findById = async () => makeWeek();
    paymentRepo.findByWeekId = async () => [];
    recordRepo.findByWeekSimple = async () => [
      makeRecord({ daySavedAt: new Date() }),
    ];

    const createManySpy = vi.spyOn(recordRepo, "createMany");

    await useCase.execute("week-1", [
      { workerId: "worker-1", date: "2026-06-02", hours: 8, hourlyRate: 25 },
    ]);

    expect(createManySpy).toHaveBeenCalledOnce();
    const callArg = createManySpy.mock.calls[0]![0];
    expect(callArg).toHaveLength(1);

    for (const record of callArg) {
      expect(record.daySavedAt).toBeInstanceOf(Date);
      expect(record.daySavedAt).not.toBeNull();
    }
  });

  it("sets daySavedAt on both new and preserved paid-worker records", async () => {
    weekRepo.findById = async () => makeWeek();
    paymentRepo.findByWeekId = async () => [
      { id: "pay-1", workerId: "worker-paid", weekId: "week-1", totalAmount: 200, paidAt: new Date() } as WorkerPayment,
    ];
    recordRepo.findByWeek = async () => [
      makeRecord({ id: "preserved-1", workerId: "worker-paid", hours: 10, hourlyRate: 20, daySavedAt: null }),
    ];
    recordRepo.findByWeekSimple = async () => [
      makeRecord({ daySavedAt: new Date() }),
      makeRecord({ id: "preserved-1", workerId: "worker-paid", hours: 10, hourlyRate: 20, daySavedAt: new Date() }),
    ];

    const createManySpy = vi.spyOn(recordRepo, "createMany");

    await useCase.execute("week-1", [
      { workerId: "worker-new", date: "2026-06-03", hours: 6, hourlyRate: 30 },
    ]);

    expect(createManySpy).toHaveBeenCalledOnce();
    const callArg = createManySpy.mock.calls[0]![0];
    expect(callArg).toHaveLength(2);

    // All records (new + preserved) should have the same daySavedAt
    for (const record of callArg) {
      expect(record.daySavedAt).toBeInstanceOf(Date);
      expect(record.daySavedAt).not.toBeNull();
    }
    expect(callArg[0]!.daySavedAt).toBe(callArg[1]!.daySavedAt);
  });

  it("throws WeekError when week not found", async () => {
    weekRepo.findById = async () => null;

    await expect(useCase.execute("nonexistent", [])).rejects.toThrow(WeekError);
  });

  it("throws PaymentError when trying to update records for a paid worker", async () => {
    weekRepo.findById = async () => makeWeek();
    paymentRepo.findByWeekId = async () => [
      { id: "pay-1", workerId: "worker-1", weekId: "week-1", totalAmount: 200, paidAt: new Date() } as WorkerPayment,
    ];

    await expect(
      useCase.execute("week-1", [
        { workerId: "worker-1", date: "2026-06-02", hours: 8, hourlyRate: 25 },
      ]),
    ).rejects.toThrow(PaymentError);
  });

  it("deletes existing records before creating updated ones", async () => {
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
      { workerId: "worker-1", date: "2026-06-02", hours: 8, hourlyRate: 25, description: "Electrical work" },
    ]);

    const callArg = createManySpy.mock.calls[0]![0];
    expect(callArg[0]!.weekId).toBe("week-1");
    expect(callArg[0]!.description).toBe("Electrical work");
  });
});

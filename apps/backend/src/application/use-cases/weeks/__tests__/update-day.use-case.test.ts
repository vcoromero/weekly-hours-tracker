import { describe, it, expect, beforeEach, vi } from "vitest";
import { UpdateDayUseCase } from "../update-day.use-case";
import type { WeekRepository } from "../../../../domain/ports/week.repository";
import type { RecordRepository } from "../../../../domain/ports/record.repository";
import type { WorkerPaymentRepository } from "../../../../domain/ports/worker-payment.repository";
import type { Week } from "../../../../domain/entities/week.entity";
import type { WorkRecord } from "../../../../domain/entities/work-record.entity";
import type { WorkerPayment } from "../../../../domain/entities/worker-payment.entity";
import { WeekError } from "../../../../domain/errors/week.error";
import { RecordError } from "../../../../domain/errors/record.error";
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
    daySavedAt: new Date("2026-06-02T10:00:00Z"),
    createdAt: new Date("2026-06-02"),
    ...overrides,
  };
}

describe("UpdateDayUseCase", () => {
  let weekRepo: WeekRepository;
  let recordRepo: RecordRepository;
  let paymentRepo: WorkerPaymentRepository;
  let useCase: UpdateDayUseCase;

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
      deleteByWorkerAndWeek: async () => 0,
      createMany: async () => {},
      findByWeekSimple: async () => [],
      markDaySaved: async () => 0,
      unmarkDaySaved: async () => 0,
      updateMany: async () => {},
    };

    paymentRepo = {
      findByWorkerAndWeeks: async () => [],
      create: async () => ({}) as WorkerPayment,
      findByWeekId: async () => [],
    };

    useCase = new UpdateDayUseCase(recordRepo, weekRepo, paymentRepo);
  });

  it("updates records with new values and returns the updated day", async () => {
    weekRepo.findById = async () => makeWeek();
    recordRepo.findByWeekSimple = async () => [
      makeRecord({ id: "r1", daySavedAt: new Date("2026-06-02T10:00:00Z") }),
      makeRecord({
        id: "r2",
        workerId: "worker-2",
        daySavedAt: new Date("2026-06-02T10:00:00Z"),
      }),
    ];
    paymentRepo.findByWeekId = async () => [];

    const updateManySpy = vi.spyOn(recordRepo, "updateMany");

    const result = await useCase.execute("week-1", "2026-06-02", [
      { recordId: "r1", hours: 6, hourlyRate: 30, description: "Painting" },
      { recordId: "r2", hours: 4, hourlyRate: 25 },
    ]);

    expect(result.weekId).toBe("week-1");
    expect(result.date).toBe("2026-06-02");
    expect(result.updatedRecords).toHaveLength(2);

    expect(updateManySpy).toHaveBeenCalledOnce();
    const updates = updateManySpy.mock.calls[0]![0];
    expect(updates).toHaveLength(2);
    expect(updates[0]).toEqual({
      id: "r1",
      data: {
        hours: 6,
        hourlyRate: 30,
        description: "Painting",
        daySavedAt: null,
      },
    });
    expect(updates[1]).toEqual({
      id: "r2",
      data: { hours: 4, hourlyRate: 25, description: null, daySavedAt: null },
    });
  });

  it("un-captures the whole day via unmarkDaySaved", async () => {
    weekRepo.findById = async () => makeWeek();
    recordRepo.findByWeekSimple = async () => [
      makeRecord({ id: "r1", daySavedAt: new Date("2026-06-02T10:00:00Z") }),
    ];
    paymentRepo.findByWeekId = async () => [];

    const unmarkSpy = vi.spyOn(recordRepo, "unmarkDaySaved");

    await useCase.execute("week-1", "2026-06-02", [
      { recordId: "r1", hours: 8, hourlyRate: 25 },
    ]);

    expect(unmarkSpy).toHaveBeenCalledWith(
      "week-1",
      new Date("2026-06-02"),
      [],
    );
  });

  it("does not change the week status", async () => {
    const updateStatusSpy = vi.spyOn(weekRepo, "updateStatus");
    weekRepo.findById = async () => makeWeek({ status: "saved" });
    recordRepo.findByWeekSimple = async () => [
      makeRecord({ id: "r1", daySavedAt: new Date("2026-06-02T10:00:00Z") }),
    ];
    paymentRepo.findByWeekId = async () => [];

    await useCase.execute("week-1", "2026-06-02", [
      { recordId: "r1", hours: 8, hourlyRate: 25 },
    ]);

    expect(updateStatusSpy).not.toHaveBeenCalled();
  });

  it("throws WeekError when week not found", async () => {
    weekRepo.findById = async () => null;

    await expect(
      useCase.execute("nonexistent", "2026-06-02", [
        { recordId: "r1", hours: 8, hourlyRate: 25 },
      ]),
    ).rejects.toThrow(WeekError);
  });

  it("throws RecordError when no records are provided", async () => {
    weekRepo.findById = async () => makeWeek();

    await expect(useCase.execute("week-1", "2026-06-02", [])).rejects.toThrow(
      RecordError,
    );
  });

  it("throws RecordError when record does not belong to the week", async () => {
    weekRepo.findById = async () => makeWeek();
    recordRepo.findByWeekSimple = async () => [makeRecord({ id: "r1" })];

    await expect(
      useCase.execute("week-1", "2026-06-02", [
        { recordId: "unknown", hours: 8, hourlyRate: 25 },
      ]),
    ).rejects.toThrow(RecordError);
  });

  it("throws RecordError when record belongs to a different date", async () => {
    weekRepo.findById = async () => makeWeek();
    recordRepo.findByWeekSimple = async () => [
      makeRecord({ id: "r1", date: new Date("2026-06-03") }),
    ];

    await expect(
      useCase.execute("week-1", "2026-06-02", [
        { recordId: "r1", hours: 8, hourlyRate: 25 },
      ]),
    ).rejects.toThrow(RecordError);
  });

  it("throws RecordError when hours are not positive", async () => {
    weekRepo.findById = async () => makeWeek();
    recordRepo.findByWeekSimple = async () => [makeRecord({ id: "r1" })];

    await expect(
      useCase.execute("week-1", "2026-06-02", [
        { recordId: "r1", hours: 0, hourlyRate: 25 },
      ]),
    ).rejects.toThrow(RecordError);
  });

  it("throws RecordError when hourlyRate is not positive", async () => {
    weekRepo.findById = async () => makeWeek();
    recordRepo.findByWeekSimple = async () => [makeRecord({ id: "r1" })];

    await expect(
      useCase.execute("week-1", "2026-06-02", [
        { recordId: "r1", hours: 8, hourlyRate: -5 },
      ]),
    ).rejects.toThrow(RecordError);
  });

  it("throws PaymentError when record belongs to a paid worker", async () => {
    weekRepo.findById = async () => makeWeek();
    recordRepo.findByWeekSimple = async () => [
      makeRecord({ id: "r1", workerId: "worker-paid" }),
    ];
    paymentRepo.findByWeekId = async () => [
      {
        id: "pay-1",
        workerId: "worker-paid",
        weekId: "week-1",
        totalAmount: 200,
        paidAt: new Date(),
      } as WorkerPayment,
    ];

    await expect(
      useCase.execute("week-1", "2026-06-02", [
        { recordId: "r1", hours: 8, hourlyRate: 25 },
      ]),
    ).rejects.toThrow(PaymentError);
  });

  it("clears description when omitted", async () => {
    weekRepo.findById = async () => makeWeek();
    recordRepo.findByWeekSimple = async () => [
      makeRecord({
        id: "r1",
        description: "Old description",
        daySavedAt: new Date("2026-06-02T10:00:00Z"),
      }),
    ];
    paymentRepo.findByWeekId = async () => [];

    const updateManySpy = vi.spyOn(recordRepo, "updateMany");

    await useCase.execute("week-1", "2026-06-02", [
      { recordId: "r1", hours: 8, hourlyRate: 25 },
    ]);

    const updates = updateManySpy.mock.calls[0]![0];
    expect(updates[0]!.data.description).toBeNull();
  });
});

import { describe, it, expect, beforeEach } from "vitest";
import { CreateRecordUseCase } from "../create-record.use-case";
import type { RecordRepository } from "../../../../domain/ports/record.repository";
import type { WeekRepository } from "../../../../domain/ports/week.repository";
import type { WeekCalculator } from "../../../../domain/services/week-calculator";
import type { WorkRecord } from "../../../../domain/entities/work-record.entity";
import type { Week } from "../../../../domain/entities/week.entity";
import { RecordError } from "../../../../domain/errors/record.error";

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

describe("CreateRecordUseCase", () => {
  let recordRepo: RecordRepository;
  let weekRepo: WeekRepository;
  let weekCalc: WeekCalculator;
  let useCase: CreateRecordUseCase;

  beforeEach(() => {
    recordRepo = {
      create: async (data) => makeRecord({ ...data, date: new Date(data.date) }),
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

    weekCalc = {
      getWeekForDate: (_date: string) => ({
        start: new Date("2026-05-30"),
        end: new Date("2026-06-05"),
        label: "Semana 23",
      }),
      formatDate: (d: Date) => d.toISOString().slice(0, 10),
    } as unknown as WeekCalculator;

    useCase = new CreateRecordUseCase(recordRepo, weekRepo, weekCalc);
  });

  it("creates a record successfully when no existing unlocked records", async () => {
    const result = await useCase.execute({
      weekId: "week-1",
      workerId: "worker-1",
      date: "2026-06-02",
      hours: 8,
      hourlyRate: 25,
    });

    expect(result.workerId).toBe("worker-1");
    expect(result.hours).toBe(8);
  });

  it("creates a record when existing unlocked records have the same date", async () => {
    recordRepo.findByWeekSimple = async () => [
      makeRecord({ id: "existing", date: new Date("2026-06-02"), daySavedAt: null }),
    ];

    const result = await useCase.execute({
      weekId: "week-1",
      workerId: "worker-2",
      date: "2026-06-02",
      hours: 6,
      hourlyRate: 30,
    });

    expect(result.workerId).toBe("worker-2");
  });

  it("throws when adding a record with a different date than existing unlocked records", async () => {
    recordRepo.findByWeekSimple = async () => [
      makeRecord({ id: "existing", date: new Date("2026-06-01"), daySavedAt: null }),
    ];

    await expect(
      useCase.execute({
        weekId: "week-1",
        workerId: "worker-2",
        date: "2026-06-02",
        hours: 8,
        hourlyRate: 25,
      }),
    ).rejects.toThrow(RecordError);
  });

  it("allows adding a record with a different date when existing records are saved", async () => {
    recordRepo.findByWeekSimple = async () => [
      makeRecord({ id: "existing", date: new Date("2026-06-01"), daySavedAt: new Date("2026-06-01T10:00:00Z") }),
    ];

    const result = await useCase.execute({
      weekId: "week-1",
      workerId: "worker-2",
      date: "2026-06-02",
      hours: 8,
      hourlyRate: 25,
    });

    expect(result.workerId).toBe("worker-2");
  });

  it("throws RecordError for duplicate records", async () => {
    recordRepo.findDuplicate = async () => makeRecord();

    await expect(
      useCase.execute({
        weekId: "week-1",
        workerId: "worker-1",
        date: "2026-06-02",
        hours: 8,
        hourlyRate: 25,
      }),
    ).rejects.toThrow(RecordError);
  });
});

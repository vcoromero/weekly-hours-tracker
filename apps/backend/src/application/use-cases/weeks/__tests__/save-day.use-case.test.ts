import { describe, it, expect, beforeEach } from "vitest";
import { SaveDayUseCase } from "../save-day.use-case";
import type { WeekRepository } from "../../../../domain/ports/week.repository";
import type { RecordRepository } from "../../../../domain/ports/record.repository";
import type { Week } from "../../../../domain/entities/week.entity";
import type { WorkRecord } from "../../../../domain/entities/work-record.entity";
import { WeekError } from "../../../../domain/errors/week.error";
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

describe("SaveDayUseCase", () => {
  let weekRepo: WeekRepository;
  let recordRepo: RecordRepository;
  let useCase: SaveDayUseCase;

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

    useCase = new SaveDayUseCase(weekRepo, recordRepo);
  });

  it("saves all unsaved records on the same date", async () => {
    weekRepo.findById = async () => makeWeek();
    recordRepo.findByWeekSimple = async () => [
      makeRecord({ id: "r1", daySavedAt: null }),
      makeRecord({ id: "r2", daySavedAt: null }),
      makeRecord({ id: "r3", daySavedAt: null }),
    ];
    recordRepo.markDaySaved = async () => 3;

    const result = await useCase.execute("week-1");

    expect(result.savedDate).toBe("2026-06-02");
    expect(result.recordsCount).toBe(3);
  });

  it("throws WeekError when week not found", async () => {
    weekRepo.findById = async () => null;

    await expect(useCase.execute("nonexistent")).rejects.toThrow(WeekError);
  });

  it("throws WeekError when week is not in draft status", async () => {
    weekRepo.findById = async () => makeWeek({ status: "saved" });

    await expect(useCase.execute("week-1")).rejects.toThrow(WeekError);
  });

  it("throws RecordError when no unsaved records exist", async () => {
    weekRepo.findById = async () => makeWeek();
    recordRepo.findByWeekSimple = async () => [
      makeRecord({ daySavedAt: new Date("2026-06-02T10:00:00Z") }),
    ];

    await expect(useCase.execute("week-1")).rejects.toThrow(RecordError);
  });

  it("throws RecordError when unsaved records span multiple dates", async () => {
    weekRepo.findById = async () => makeWeek();
    recordRepo.findByWeekSimple = async () => [
      makeRecord({ id: "r1", date: new Date("2026-06-01"), daySavedAt: null }),
      makeRecord({ id: "r2", date: new Date("2026-06-02"), daySavedAt: null }),
    ];

    await expect(useCase.execute("week-1")).rejects.toThrow(RecordError);
  });

  it("ignores already saved records when checking dates", async () => {
    weekRepo.findById = async () => makeWeek();
    recordRepo.findByWeekSimple = async () => [
      makeRecord({ id: "r1", date: new Date("2026-06-01"), daySavedAt: new Date("2026-06-01T10:00:00Z") }),
      makeRecord({ id: "r2", date: new Date("2026-06-02"), daySavedAt: null }),
      makeRecord({ id: "r3", date: new Date("2026-06-02"), daySavedAt: null }),
    ];
    recordRepo.markDaySaved = async () => 2;

    const result = await useCase.execute("week-1");

    expect(result.savedDate).toBe("2026-06-02");
    expect(result.recordsCount).toBe(2);
  });
});

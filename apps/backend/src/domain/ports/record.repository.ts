import type {
  WorkRecord,
  CreateRecordInput,
} from "../entities/work-record.entity.js";

export interface RecordWithWorker extends WorkRecord {
  worker: { id: string; name: string };
  week: {
    id: string;
    label: string;
    startDate: Date;
    endDate: Date;
    status: string;
  };
}

export interface RecordRepository {
  create(data: CreateRecordInput & { weekId: string }): Promise<WorkRecord>;
  findByWeek(weekId: string): Promise<RecordWithWorker[]>;
  findByWorker(workerId: string): Promise<RecordWithWorker[]>;
  findById(id: string): Promise<RecordWithWorker | null>;
  findDuplicate(data: {
    workerId: string;
    date: string;
    hours: number;
    hourlyRate: number;
    weekId: string;
  }): Promise<WorkRecord | null>;
  delete(id: string): Promise<void>;
  deleteByWeek(weekId: string): Promise<void>;
  /**
   * Deletes all records belonging to the given worker in the given week.
   * Returns the number of records deleted (0 if none existed).
   */
  deleteByWorkerAndWeek(workerId: string, weekId: string): Promise<number>;
  createMany(
    data: Array<CreateRecordInput & { weekId: string; daySavedAt?: Date }>,
  ): Promise<void>;
  findByWeekSimple(weekId: string): Promise<WorkRecord[]>;
  markDaySaved(weekId: string, date: Date, savedAt: Date): Promise<number>;
  /**
   * Sets daySavedAt = null on all records of the given week+date,
   * excluding records that belong to any worker in `excludeWorkerIds`
   * (e.g. paid workers, whose records must remain immutable).
   * Returns the number of records updated.
   */
  unmarkDaySaved(
    weekId: string,
    date: Date,
    excludeWorkerIds: string[],
  ): Promise<number>;
  updateMany(
    updates: Array<{ id: string; data: Partial<WorkRecord> }>,
  ): Promise<void>;
}

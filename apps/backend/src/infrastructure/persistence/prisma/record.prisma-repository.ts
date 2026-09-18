import type { PrismaClient } from "@prisma/client";
import type {
  RecordRepository,
  RecordWithWorker,
} from "../../../domain/ports/record.repository.js";
import type { WorkRecord, CreateRecordInput } from "../../../domain/entities/work-record.entity.js";
import { RecordMapper } from "../mappers/record.mapper.js";

export class RecordPrismaRepository implements RecordRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(
    data: CreateRecordInput & { weekId: string }
  ): Promise<WorkRecord> {
    const record = await this.prisma.workRecord.create({
      data: {
        workerId: data.workerId,
        date: new Date(data.date),
        hours: data.hours,
        hourlyRate: data.hourlyRate,
        description: data.description || null,
        weekId: data.weekId,
      },
    });
    return RecordMapper.toDomain(record);
  }

  async findByWeek(weekId: string): Promise<RecordWithWorker[]> {
    const records = await this.prisma.workRecord.findMany({
      where: { weekId },
      include: { worker: true, week: true },
      orderBy: [{ worker: { name: "asc" } }, { date: "asc" }],
    });
    return records.map(RecordMapper.toDomainWithWorker);
  }

  async findByWorker(workerId: string): Promise<RecordWithWorker[]> {
    const records = await this.prisma.workRecord.findMany({
      where: { workerId },
      include: { worker: true, week: true },
      orderBy: { date: "desc" },
    });
    return records.map(RecordMapper.toDomainWithWorker);
  }

  async findById(id: string): Promise<RecordWithWorker | null> {
    const record = await this.prisma.workRecord.findUnique({
      where: { id },
      include: { worker: true, week: true },
    });
    return record ? RecordMapper.toDomainWithWorker(record) : null;
  }

  async findDuplicate(data: {
    workerId: string;
    date: string;
    hours: number;
    hourlyRate: number;
    weekId: string;
  }): Promise<WorkRecord | null> {
    const record = await this.prisma.workRecord.findFirst({
      where: {
        workerId: data.workerId,
        date: new Date(data.date),
        hours: data.hours,
        hourlyRate: data.hourlyRate,
        weekId: data.weekId,
      },
    });
    return record ? RecordMapper.toDomain(record) : null;
  }

  async delete(id: string): Promise<void> {
    await this.prisma.workRecord.delete({ where: { id } });
  }

  async deleteByWeek(weekId: string): Promise<void> {
    await this.prisma.workRecord.deleteMany({ where: { weekId } });
  }

  async deleteByWorkerAndWeek(workerId: string, weekId: string): Promise<number> {
    const { count } = await this.prisma.workRecord.deleteMany({
      where: { workerId, weekId },
    });
    return count;
  }

  async createMany(
    data: Array<CreateRecordInput & { weekId: string; daySavedAt?: Date }>
  ): Promise<void> {
    await this.prisma.workRecord.createMany({
      data: data.map((r) => ({
        workerId: r.workerId,
        date: new Date(r.date),
        hours: r.hours,
        hourlyRate: r.hourlyRate,
        description: r.description || null,
        weekId: r.weekId,
        daySavedAt: r.daySavedAt ?? null,
      })),
    });
  }

  async findByWeekSimple(weekId: string): Promise<WorkRecord[]> {
    const records = await this.prisma.workRecord.findMany({
      where: { weekId },
    });
    return records.map(RecordMapper.toDomain);
  }

  async markDaySaved(weekId: string, date: Date, savedAt: Date): Promise<number> {
    const result = await this.prisma.workRecord.updateMany({
      where: { weekId, date, daySavedAt: null },
      data: { daySavedAt: savedAt },
    });
    return result.count;
  }

  async unmarkDaySaved(weekId: string, date: Date): Promise<number> {
    const result = await this.prisma.workRecord.updateMany({
      where: { weekId, date },
      data: { daySavedAt: null },
    });
    return result.count;
  }
}

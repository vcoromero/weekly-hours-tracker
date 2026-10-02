import type { WeekRepository } from "../../../domain/ports/week.repository.js";
import type { RecordRepository } from "../../../domain/ports/record.repository.js";
import type { WorkerPaymentRepository } from "../../../domain/ports/worker-payment.repository.js";
import { WeekError } from "../../../domain/errors/week.error.js";
import { RecordError } from "../../../domain/errors/record.error.js";
import { PaymentError } from "../../../domain/errors/payment.error.js";

export interface UpdateDayInput {
  recordId: string;
  hours: number;
  hourlyRate: number;
  description?: string;
}

export interface UpdateDayResultRecord {
  id: string;
  workerId: string;
  date: Date;
  hours: number;
  hourlyRate: number;
  description: string | null;
  daySavedAt: Date | null;
}

export interface UpdateDayUseCaseResult {
  weekId: string;
  date: string; // YYYY-MM-DD
  updatedRecords: UpdateDayResultRecord[];
}

export class UpdateDayUseCase {
  constructor(
    private readonly recordRepo: RecordRepository,
    private readonly weekRepo: WeekRepository,
    private readonly paymentRepo: WorkerPaymentRepository,
  ) {}

  async execute(
    weekId: string,
    date: string,
    records: UpdateDayInput[],
  ): Promise<UpdateDayUseCaseResult> {
    // 1. Validate that the week exists
    const week = await this.weekRepo.findById(weekId);
    if (!week) {
      throw new WeekError("Semana no encontrada");
    }

    if (records.length === 0) {
      throw new RecordError("Debe haber al menos un registro para actualizar");
    }

    // 2. Validate that all recordIds belong to that week and date
    const weekRecords = await this.recordRepo.findByWeekSimple(weekId);
    const recordsById = new Map(weekRecords.map((r) => [r.id, r]));

    for (const input of records) {
      const record = recordsById.get(input.recordId);
      if (!record) {
        throw new RecordError("El registro no pertenece a la semana");
      }
      if (record.date.toISOString().slice(0, 10) !== date) {
        throw new RecordError("El registro no pertenece a la fecha indicada");
      }
      if (input.hours <= 0) {
        throw new RecordError("Las horas deben ser mayores que 0");
      }
      if (input.hourlyRate <= 0) {
        throw new RecordError("El costo por hora debe ser mayor que 0");
      }
    }

    // 3. Validate that no record belongs to a worker already paid in that week
    const payments = await this.paymentRepo.findByWeekId(weekId);
    const paidWorkerIds = new Set(payments.map((p) => p.workerId));

    for (const input of records) {
      const record = recordsById.get(input.recordId)!;
      if (paidWorkerIds.has(record.workerId)) {
        throw new PaymentError(
          "No se puede editar: el trabajador ya fue pagado en esta semana",
        );
      }
    }

    // 4. Update the records with the new values (and un-capture them)
    await this.recordRepo.updateMany(
      records.map((input) => ({
        id: input.recordId,
        data: {
          hours: input.hours,
          hourlyRate: input.hourlyRate,
          description: input.description || null,
          daySavedAt: null,
        },
      })),
    );

    // Un-capture the whole day (except paid workers, whose records stay immutable):
    // daySavedAt = null on ALL unpaid records of that date in that week
    await this.recordRepo.unmarkDaySaved(weekId, new Date(date), [
      ...paidWorkerIds,
    ]);

    // 5. Return the updated day state (all records of that date after the edit)
    const updatedRecords: UpdateDayResultRecord[] = (
      await this.recordRepo.findByWeekSimple(weekId)
    )
      .filter((r) => r.date.toISOString().slice(0, 10) === date)
      .map((r) => ({
        id: r.id,
        workerId: r.workerId,
        date: r.date,
        hours: r.hours,
        hourlyRate: r.hourlyRate,
        description: r.description,
        daySavedAt: r.daySavedAt,
      }));

    return {
      weekId,
      date,
      updatedRecords,
    };
  }
}
